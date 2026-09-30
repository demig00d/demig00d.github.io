import * as db from "./database.js";
import * as ui from "./ui.js";
import * as calendar from "./calendar.js";
import { getDisplayedWeekStartDate } from "./state.js";
import { loadLanguage } from "./localization.js";

/** @type {HTMLElement | null} */
export let draggedTask = null;

/**
 * Creates the DOM element representing a task.
 * @param {db.Task} task - The task object from the database.
 * @returns {Promise<HTMLElement | null>}
 */
export async function createTaskElement(task) {
  /** @type {boolean} */
  let wrapTaskTitles = localStorage.getItem("wrapTaskTitles") !== "false";
  if (localStorage.getItem("wrapTaskTitles") === null) {
    wrapTaskTitles = true;
  }

  return new Promise((resolve) => {
    /** @const {HTMLElement} */
    const eventDiv = document.createElement("div");
    if (!eventDiv) {
      resolve(null);
      return;
    }

    eventDiv.classList.add("event");
    eventDiv.dataset.taskId = String(task.id);
    if (task.color) eventDiv.dataset.taskColor = task.color;
    if (task.due_date) eventDiv.dataset.dueDate = task.due_date;
    eventDiv.draggable = true;
    eventDiv.style.backgroundColor = ui.getTaskBackgroundColor(task.color);

    /** @const {HTMLElement} */
    const eventContent = document.createElement("div");
    eventContent.classList.add("event-content");

    /** @const {HTMLElement} */
    const taskTextElement = document.createElement("span");
    taskTextElement.classList.add("task-text");
    taskTextElement.style.flexGrow = "1";
    taskTextElement.textContent = task.title;
    taskTextElement.classList.toggle("completed", task.completed === 1);
    taskTextElement.classList.toggle("wrap", wrapTaskTitles);
    taskTextElement.classList.toggle("no-wrap", !wrapTaskTitles);
    eventContent.appendChild(taskTextElement);

    // Description/Progress Icon Logic
    if (task.description) {
      /** @const {RegExp} */
      const checkboxRegex = /^- \[([x ])\]/gm;
      /** @const {RegExpMatchArray | null} */
      const matches = task.description.match(checkboxRegex);
      // Show progress only if there are 1-9 checkboxes
      if (matches && matches.length >= 1 && matches.length <= 9) {
        /** @const {number} */
        const total = matches.length;
        /** @const {number} */
        const checked = (task.description.match(/^- \[x\]/gm) || []).length;
        /** @const {HTMLElement} */
        const progressElement = document.createElement("span");
        progressElement.classList.add("task-progress");
        progressElement.textContent = `${checked}/${total}`;
        eventContent.appendChild(progressElement);
      } else if (task.description.trim().length > 0) {
        /** @const {HTMLElement} */
        const descriptionIcon = document.createElement("i");
        descriptionIcon.classList.add(
          "fas",
          "fa-sticky-note",
          "description-icon",
        );
        descriptionIcon.title = "This task has a description";
        eventContent.appendChild(descriptionIcon);
      }
    }

    /** @const {HTMLElement} */
    const rightActionButtons = document.createElement("div");
    rightActionButtons.classList.add("action-buttons", "right");

    // Done Button
    /** @const {HTMLButtonElement} */
    const doneButton = document.createElement("button");
    doneButton.classList.add("done-button");
    doneButton.innerHTML = '<i class="far fa-check-circle"></i>';
    doneButton.style.display = task.completed === 1 ? "none" : "inline-block";
    doneButton.addEventListener("click", (event) => {
      event.stopPropagation();
      handleTaskCompletion(task.id, 1, ui.todayTasks, (updatedTasks) => {
        ui.setTodayTasks(updatedTasks);
        ui.updateTabTitle();
      });
    });
    rightActionButtons.appendChild(doneButton);

    // Undone Button
    /** @const {HTMLButtonElement} */
    const undoneButton = document.createElement("button");
    undoneButton.classList.add("undone-button");
    undoneButton.innerHTML = '<i class="fas fa-check-circle"></i>';
    undoneButton.style.display = task.completed === 0 ? "none" : "inline-block";
    undoneButton.addEventListener("click", (event) => {
      event.stopPropagation();
      handleTaskCompletion(task.id, 0, ui.todayTasks, (updatedTasks) => {
        ui.setTodayTasks(updatedTasks);
        ui.updateTabTitle();
      });
    });
    rightActionButtons.appendChild(undoneButton);

    eventContent.appendChild(rightActionButtons);
    eventDiv.appendChild(eventContent);
    resolve(eventDiv);
  });
}

/**
 * Re-renders a single task element in place.
 * @param {number} taskId
 * @returns {Promise<void>}
 */
export async function reRenderTaskElement(taskId) {
  /** @const {db.Task | undefined} */
  const taskDetails = await db.fetchTaskDetails(taskId);
  if (!taskDetails) {
    console.error("Task details not found for id:", taskId);
    return;
  }
  /** @const {HTMLElement | null} */
  const oldTaskElement = document.querySelector(
    `.event[data-task-id="${taskId}"]`,
  );
  if (!oldTaskElement) return;
  /** @const {Node | null} */
  const parentContainer = oldTaskElement.parentNode;
  if (!parentContainer) {
    console.error("Parent container not found for task id:", taskId);
    return;
  }
  /** @const {HTMLElement | null} */
  const newTaskElement = await createTaskElement(taskDetails);
  if (!newTaskElement) {
    console.error("Failed to create new task element for id:", taskId);
    return;
  }
  attachTaskEventListeners(newTaskElement, taskId);
  parentContainer.replaceChild(newTaskElement, oldTaskElement);
}

/**
 * Attaches event listeners (drag, click, swipe) to a task element.
 * @param {HTMLElement} eventElement
 * @param {number} taskId
 * @returns {void}
 */
export function attachTaskEventListeners(eventElement, taskId) {
  eventElement.addEventListener("dragstart", handleDragStart);
  eventElement.addEventListener("dragend", handleDragEnd);
  eventElement.addEventListener("click", (event) => {
    if (!event.target.closest("button")) {
      ui.openTaskDetails(taskId);
    }
  });

  // Swipe handlers
  /** @type {number} */
  let startX = 0;
  /** @type {number} */
  let deltaX = 0;
  /** @type {boolean} */
  let isSwiping = false;

  eventElement.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isSwiping = true;
    eventElement.classList.add('swiping');
  }, { passive: true });

  eventElement.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    deltaX = e.touches[0].clientX - startX;
    // Allow swipe only to the right for completion
    if (deltaX > 0) {
      eventElement.style.transform = `translateX(${deltaX}px)`;
    }
  }, { passive: true });

  eventElement.addEventListener('touchend', (e) => {
    if (!isSwiping) return;
    isSwiping = false;
    eventElement.classList.remove('swiping');

    // Threshold for swipe action (e.g., 100px)
    if (deltaX > 100) {
      eventElement.classList.add('completed-swipe');
      // Add slight delay for animation
      setTimeout(() => {
        handleTaskCompletion(taskId, 1, ui.todayTasks, (updatedTasks) => {
            ui.setTodayTasks(updatedTasks);
            ui.updateTabTitle();
        });
      }, 300);
    } else {
      // Return card to original position
      eventElement.style.transform = 'translateX(0px)';
    }
    deltaX = 0;
  });
}

/**
 * Renders a list of tasks into a container element.
 * @param {db.Task[]} tasks - The list of tasks to render.
 * @param {HTMLElement} container - The DOM container element.
 * @returns {Promise<void>}
 */
export async function renderTasks(tasks, container) {
  if (!tasks || !container) return;
  container.innerHTML = "";

  // If a task is pending deletion (undo period), filter it out
  /** @const {db.Task[]} */
  const filteredTasks = tasks.filter(
    (task) => task.id !== ui.lastDeletedTaskData?.id,
  );

  for (const task of filteredTasks) {
    /** @const {HTMLElement | null} */
    const eventDiv = await createTaskElement(task);
    if (eventDiv) {
      attachTaskEventListeners(eventDiv, task.id);
      container.appendChild(eventDiv);
    }
  }
}

// --- Drag and Drop Handlers ---

/**
 * Handles the start of a drag operation.
 * @param {DragEvent} event
 * @returns {void}
 */
export function handleDragStart(event) {
  if (event.target.classList.contains("event")) {
    /** @type {HTMLElement} */
    draggedTask = event.target;
    event.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      event.target.classList.add("dragging");
    }, 0);
  } else {
    event.preventDefault();
  }
}

/**
 * Handles the end of a drag operation.
 * @param {DragEvent} event
 * @returns {void}
 */
export function handleDragEnd(event) {
  if (draggedTask) {
    draggedTask.classList.remove("dragging");
    draggedTask = null;
  }
  document
    .querySelectorAll(".drop-indicator")
    .forEach((indicator) => indicator.remove());
}

/**
 * Allows drop by preventing default and manages the drop indicator.
 * @param {DragEvent} event
 * @returns {void}
 */
export function allowDrop(event) {
  event.preventDefault();
  if (!draggedTask) return;
  /** @type {HTMLElement} */
  let dropTarget = event.target;
  /** @type {HTMLElement | null} */
  let targetContainerElement = null;
  /** @const {HTMLElement | null} */
  const dayElement = dropTarget.closest(".day");
  /** @const {HTMLElement | null} */
  const inboxElement = dropTarget.closest(".inbox");

  if (dayElement) {
    targetContainerElement = dayElement.querySelector(".task-container");
  } else if (inboxElement) {
    // Find the task container DIV within the inbox
    targetContainerElement = Array.from(inboxElement.children).find(
      (c) =>
        c.tagName === "DIV" &&
        !c.classList.contains("inbox-header") &&
        !c.classList.contains("new-task-form"),
    );
  }
  if (!targetContainerElement) return;

  /** @type {HTMLElement | null} */
  let indicator = targetContainerElement.querySelector(".drop-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.className = "drop-indicator";
    targetContainerElement.appendChild(indicator);
  } else if (indicator.parentNode !== targetContainerElement) {
    targetContainerElement.appendChild(indicator);
  }
  
  /** @const {DOMRect} */
  const rect = targetContainerElement.getBoundingClientRect();
  /** @const {number} */
  const offsetY = event.clientY - rect.top;
  /** @const {HTMLElement[]} */
  const tasks = Array.from(targetContainerElement.children).filter((c) =>
    c.classList.contains("event"),
  );
  /** @type {number} */
  let indicatorPosition = 0;
  if (tasks.length > 0) {
    let found = false;
    for (const task of tasks) {
      if (task === draggedTask) continue;
      /** @const {DOMRect} */
      const taskRect = task.getBoundingClientRect();
      /** @const {number} */
      const midY = taskRect.top - rect.top + taskRect.height / 2;
      if (offsetY < midY) {
        indicatorPosition = task.offsetTop;
        found = true;
        break;
      }
    }
    if (!found) {
      /** @const {HTMLElement} */
      const last = tasks[tasks.length - 1];
      indicatorPosition = last.offsetTop + last.offsetHeight;
    }
  }
  indicator.style.top = `${indicatorPosition}px`;
}

/**
 * Handles the drop action, updates task date/inbox status, and reorders.
 * @param {DragEvent} event
 * @param {db.Task[]} todayTasks - Current list of today's tasks (UI state).
 * @param {function(db.Task[]): Promise<void>} updateTodayTasks - Callback to update the global todayTasks state and UI.
 * @returns {Promise<void>}
 */
export async function handleDrop(event, todayTasks, updateTodayTasks) {
  event.preventDefault();
  /** @const {HTMLElement | null} */
  const currentlyDraggedTask = draggedTask;
  document
    .querySelectorAll(".drop-indicator")
    .forEach((indicator) => indicator.remove());
  if (!currentlyDraggedTask) {
    console.warn("handleDrop: No task was being dragged.");
    return;
  }

  /** @type {HTMLElement} */
  let dropTarget = event.target;
  /** @const {number} */
  const taskId = parseInt(currentlyDraggedTask.dataset.taskId, 10);
  /** @type {string | null} */
  let newDueDate = null;
  /** @type {HTMLElement | null} */
  let targetContainerElement = null;
  /** @const {HTMLElement | null} */
  const dayElement = dropTarget.closest(".day");
  /** @const {HTMLElement | null} */
  const inboxElement = dropTarget.closest(".inbox");

  if (dayElement) {
    newDueDate = dayElement.dataset.date;
    targetContainerElement = dayElement.querySelector(".task-container");
  } else if (inboxElement) {
    newDueDate = null;
    targetContainerElement = Array.from(inboxElement.children).find(
      (c) =>
        c.tagName === "DIV" &&
        !c.classList.contains("inbox-header") &&
        !c.classList.contains("new-task-form"),
    );
  }
  
  if (!taskId || !targetContainerElement) {
    console.warn("handleDrop: Invalid drop target or task ID.", {
      taskId,
      targetContainerElement,
    });
    return;
  }

  try {
    /** @const {string} */
    const todayString = new Date().toLocaleDateString("en-CA");
    /** @const {boolean} */
    const wasTodayTask = currentlyDraggedTask.dataset.dueDate === todayString;
    /** @const {boolean} */
    const isTodayTask = newDueDate === todayString;
    /** @type {Partial<db.Task>} */
    const updates = { due_date: newDueDate };
    /** @type {boolean} */
    let recurrenceCleared = false;
    
    if (newDueDate === null) {
      updates.recurrence_rule = "";
      updates.recurrence_interval = 1;
      recurrenceCleared = true;
      console.log(`Task ${taskId} moved to Inbox. Clearing recurrence.`);
    }

    await db.updateTask(taskId, updates);
    console.log(
      `Task ${taskId} updated. Due date: ${newDueDate}, Recurrence cleared: ${recurrenceCleared}`,
    );

    // --- Update Today Tasks State ---
    if (todayTasks && updateTodayTasks) {
      let newTodayTasks = [...todayTasks];
      /** @const {number} */
      const taskIndex = newTodayTasks.findIndex(
        (t) => t.id === taskId,
      );
      
      // Removed from today's tasks
      if (wasTodayTask && !isTodayTask && taskIndex > -1) {
        newTodayTasks.splice(taskIndex, 1);
      } 
      // Added to or updated in today's tasks
      else if (isTodayTask) {
        /** @const {db.Task | undefined} */
        const taskDetails = await db.fetchTaskDetails(taskId);
        if (taskDetails) {
          if (taskIndex > -1) newTodayTasks[taskIndex] = taskDetails;
          else newTodayTasks.push(taskDetails);
        }
      }
      updateTodayTasks(newTodayTasks);
    }
    // --- End Update Today Tasks State ---


    // --- DOM Reordering ---
    /** @const {DOMRect} */
    const rect = targetContainerElement.getBoundingClientRect();
    /** @const {number} */
    const offsetY = event.clientY - rect.top;
    /** @const {HTMLElement[]} */
    const tasksInContainer = Array.from(targetContainerElement.children).filter(
      (el) => el.classList.contains("event") && el !== currentlyDraggedTask,
    );
    /** @type {HTMLElement | null} */
    let insertBeforeTask = null;
    
    for (const task of tasksInContainer) {
      /** @const {DOMRect} */
      const taskRect = task.getBoundingClientRect();
      /** @const {number} */
      const midY = taskRect.top - rect.top + taskRect.height / 2;
      if (offsetY < midY) {
        insertBeforeTask = task;
        break;
      }
    }
    
    if (insertBeforeTask)
      targetContainerElement.insertBefore(
        currentlyDraggedTask,
        insertBeforeTask,
      );
    else targetContainerElement.appendChild(currentlyDraggedTask);
    
    if (newDueDate) currentlyDraggedTask.dataset.dueDate = newDueDate;
    else delete currentlyDraggedTask.dataset.dueDate;

    await updateTaskOrder(targetContainerElement); // Update order after placement

    if (recurrenceCleared && ui.currentTaskBeingViewed === taskId) {
      ui.clearRecurrenceInPopup();
      console.log(`Recurrence UI cleared in popup for task ${taskId}.`);
    }
    ui.updateTabTitle(); // Update favicon
  } catch (error) {
    console.error("Error handling drop:", error);
    ui.showSnackbar("Error moving task.", true);
    // Re-render to revert state on error
    await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
    await calendar.renderInbox();
  }
}

/**
 * Handles toggling task completion status.
 * @param {number} taskId
 * @param {number} completed - 1 for done, 0 for undone.
 * @param {db.Task[]} todayTasks - Current list of today's tasks (UI state).
 * @param {function(db.Task[]): void} updateTodayTasks - Callback to update the global todayTasks state.
 * @returns {Promise<void>}
 */
export async function handleTaskCompletion(
  taskId,
  completed,
  todayTasks,
  updateTodayTasks,
) {
  /** @type {db.Task | undefined | null} */
  let originalTaskDetails = null;
  try {
    originalTaskDetails = await db.fetchTaskDetails(taskId);

    await db.updateTask(taskId, { completed: completed });

    if (todayTasks && updateTodayTasks) {
      /** @type {db.Task[]} */
      let updatedTodayTasks = todayTasks
        .map((task) => {
          if (task.id === taskId)
            return { ...task, completed: completed };
          return task;
        })
        .filter(Boolean);
      updateTodayTasks(updatedTodayTasks);
    }

    /** @const {HTMLElement | null} */
    const taskElement = document.querySelector(
      `.event[data-task-id="${taskId}"]`,
    );
    if (taskElement) ui.handleTaskCompletionUI(taskElement, completed);
    if (ui.currentTaskBeingViewed === taskId)
      ui.updateMarkAsDoneButton(completed === 1);
      
    // Logic for creating the next recurring task instance
    if (completed === 1 && originalTaskDetails?.recurrence_rule && !originalTaskDetails.next_task_id) {
        console.log("Last recurring task completed, creating next instance.");
        await db.createNextOccurrence(taskId);
        // Refresh the calendar to show the new task
        console.log("Refreshing calendar view after recurrence.");
        await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
        await calendar.renderInbox();
    }
  } catch (error) {
    console.error("Error updating task completion:", error);
    ui.showSnackbar("Failed to update task status.", true);
  }
}

/**
 * Reads the order of tasks in a container and saves it to the database.
 * @param {HTMLElement} taskContainer - The container element holding the tasks.
 * @returns {Promise<void>}
 */
export async function updateTaskOrder(taskContainer) {
  if (!taskContainer) {
    console.warn("updateTaskOrder: Invalid task container provided.");
    return;
  }
  /** @const {HTMLElement[]} */
  const tasks = Array.from(taskContainer.children).filter((c) =>
    c.classList.contains("event"),
  );
  /** @type {import('..js/database.js').TaskOrderUpdate[]} */
  const updates = tasks.map((task, index) => ({
    id: parseInt(task.dataset.taskId, 10),
    order: index,
  }));
  if (updates.length > 0) {
    console.log("Updating task order:", updates);
    await db.updateTaskOrder(updates);
  }
}

/**
 * Re-renders all currently visible tasks across the calendar and inbox.
 * (Used primarily after state changes that affect visual presentation, like wrapTitles setting).
 * @returns {Promise<void>}
 */
export async function renderAllTasks() {
  /** @const {string[]} */
  const dayIds = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];
  /** @const {Object<string, HTMLElement | null>} */
  const dayElements = dayIds.reduce((acc, id) => {
    const el = document.getElementById(id);
    if (el) acc[id] = el;
    return acc;
  }, {});
  /** @const {HTMLElement | null} */
  const inboxDiv = document.getElementById("inbox");

  // Rerender Calendar Days
  for (const dayId of dayIds) {
    /** @const {HTMLElement | null} */
    const dayDiv = dayElements[dayId];
    if (!dayDiv) continue;
    /** @const {HTMLElement | null} */
    const taskContainer = dayDiv.querySelector(".task-container");
    if (!taskContainer) continue;
    /** @const {HTMLElement[]} */
    const taskElements = Array.from(taskContainer.querySelectorAll(".event"));
    /** @type {db.Task[]} */
    const tasksToRender = [];
    for (const taskElement of taskElements) {
      /** @const {number} */
      const taskId = parseInt(taskElement.dataset.taskId, 10);
      if (taskId) {
        /** @const {db.Task | undefined} */
        const taskDetails = await db.fetchTaskDetails(taskId);
        if (taskDetails) tasksToRender.push(taskDetails);
      }
    }
    tasksToRender.sort((a, b) => a.order - b.order);
    await renderTasks(tasksToRender, taskContainer);
  }
  
  // Rerender Inbox
  if (inboxDiv) {
    /** @const {HTMLElement | undefined} */
    const inboxTaskContainer = Array.from(inboxDiv.children).find(
      (c) =>
        c.tagName === "DIV" &&
        !c.classList.contains("inbox-header") &&
        !c.classList.contains("new-task-form"),
    );
    if (inboxTaskContainer) {
      /** @const {HTMLElement[]} */
      const inboxTaskElements = Array.from(
        inboxTaskContainer.querySelectorAll(".event"),
      );
      /** @type {db.Task[]} */
      const tasksToRender = [];
      for (const taskElement of inboxTaskElements) {
        /** @const {number} */
        const taskId = parseInt(taskElement.dataset.taskId, 10);
        if (taskId) {
          /** @const {db.Task | undefined} */
          const taskDetails = await db.fetchTaskDetails(taskId);
          if (taskDetails) tasksToRender.push(taskDetails);
        }
      }
      tasksToRender.sort((a, b) => a.order - b.order);
      await renderTasks(tasksToRender, inboxTaskContainer);
    }
  }
}

/**
 * Handles drag leave to remove the drop indicator when the cursor leaves the drop target.
 * @param {DragEvent} event
 * @returns {void}
 */
export function handleDragLeave(event) {
  /** @const {EventTarget | null} */
  let relatedTarget = event.relatedTarget;
  /** @const {HTMLElement} */
  let currentTarget = event.currentTarget;
  
  if (!currentTarget.contains(relatedTarget)) {
    /** @const {HTMLElement | null} */
    const indicator = currentTarget.querySelector(".drop-indicator");
    if (indicator) indicator.remove();
  }
}
