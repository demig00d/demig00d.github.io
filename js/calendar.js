import * as db from "./database.js";
import * as tasks from "./tasks.js";
import * as ui from "./ui.js";
import * as utils from "./utils.js";
import { translations } from "./localization.js";
import { dayIds } from "./config.js";

/** @const {HTMLElement} */
const monthNameElement = document.querySelector(".month-name");
/** @const {Object<string, HTMLElement>} */
const dayElements = dayIds.reduce((acc, id) => {
  acc[id] = document.getElementById(id);
  return acc;
}, {});
/** @const {HTMLElement} */
const inboxDiv = document.getElementById("inbox");
/** @type {HTMLElement | null} */
let inboxHeaderElement = null;
/** @type {boolean} */
let isEditingInboxTitle = false;

/**
 * Handles the drop event on a calendar day or the inbox.
 * @param {DragEvent} event
 * @param {Task[]} todayTasks - Current list of today's tasks (UI state).
 * @param {function(Task[]): Promise<void>} updateTodayTasks - Callback to update the global todayTasks state and UI.
 * @returns {Promise<void>}
 */
async function handleDayDrop(event, todayTasks, updateTodayTasks) {
  await tasks.handleDrop(event, todayTasks, updateTodayTasks);
}

/**
 * Builds the content of a single day column: header, task list and inline
 * new-task form.
 * @param {HTMLElement} dayDiv - The static day column element.
 * @param {Date} date - The date of this day column.
 * @param {Task[]} dailyTasks - Tasks due on this day, sorted by order.
 * @param {boolean} isCurrentWeek - Whether the displayed week is the current week.
 * @param {Date} today - Today's date (for the today highlight).
 * @param {string} lang - Current language code.
 * @returns {Promise<void>}
 */
async function buildDayColumn(
  dayDiv,
  date,
  dailyTasks,
  isCurrentWeek,
  today,
  lang,
) {
  /** @const {string} */
  const dayDateString = date.toLocaleDateString("en-CA");
  dayDiv.dataset.date = dayDateString;

  // Attach drag/click listeners only once: the day div is a static node that
  // survives re-renders (innerHTML="" clears only its children), so listeners
  // added unconditionally would accumulate. The click handler resolves the
  // new-task form at event time because the form is recreated on each render.
  if (!dayDiv.dataset.listenersAttached) {
    dayDiv.dataset.listenersAttached = "true";
    dayDiv.addEventListener("dragover", tasks.allowDrop);
    // Pass todayTasks and the update function to the handler
    dayDiv.addEventListener("drop", (event) =>
      handleDayDrop(event, ui.todayTasks, async (newTasks) => {
        await ui.refreshTodayTasks(); // Use the existing function
        ui.updateTabTitle();
      }),
    );
    dayDiv.addEventListener("dragleave", tasks.handleDragLeave);
    dayDiv.addEventListener("click", (event) => {
      if (
        event.target === dayDiv ||
        (!event.target.closest(".event") &&
          !event.target.closest(".day-header"))
      ) {
        dayDiv.querySelector(".new-task-form input")?.focus();
      }
    });
  }

  /** @const {boolean} */
  const displayFullWeekdays = localStorage.getItem("fullWeekdays") === "true";

  /** @const {HTMLElement} */
  const dayHeaderDiv = document.createElement("div");
  dayHeaderDiv.classList.add("day-header");
  if (isCurrentWeek && date.toDateString() === today.toDateString()) {
    dayHeaderDiv.classList.add("today-highlight");
  }
  /** @const {string} */
  const weekdayName = displayFullWeekdays
    ? translations[lang].dayNamesFull[(date.getDay() + 6) % 7]
    : translations[lang].dayNamesShort[(date.getDay() + 6) % 7];
  dayHeaderDiv.innerHTML = `<span class="day-number">${date.getDate()}</span><span class="day-weekday">${weekdayName}</span>`;
  dayDiv.appendChild(dayHeaderDiv);

  /** @const {HTMLElement} */
  const taskContainer = document.createElement("div");
  taskContainer.classList.add("task-container");
  taskContainer.style.visibility = "hidden";
  dayDiv.appendChild(taskContainer);

  await tasks.renderTasks(dailyTasks, taskContainer);
  taskContainer.style.visibility = "visible";

  /** @const {HTMLFormElement} */
  const newTaskForm = document.createElement("form");
  newTaskForm.classList.add("new-task-form");
  newTaskForm.innerHTML = `<input type="text" placeholder="${translations[lang].newTask}">`;
  dayDiv.appendChild(newTaskForm);

  /** @const {HTMLInputElement} */
  const newTaskInput = newTaskForm.querySelector('input[type="text"]');

  /**
   * Handles creation of a new task for the day.
   * @param {Event} event
   * @returns {Promise<void>}
   */
  const addTaskHandler = async (event) => {
    if (
      event.type === "submit" ||
      (event.type === "keydown" && event.key === "Enter") ||
      event.type === "blur"
    ) {
      event.preventDefault();
      if (newTaskInput.value.trim()) {
        /** @type {Omit<Task, 'id'>} */
        const taskData = {
          title: newTaskInput.value.trim(),
          due_date: dayDateString,
          order: taskContainer.children.length,
          color: "",
          description: "",
          completed: 0,
          recurrence_rule: "",
          recurrence_interval: 1,
          previous_task_id: null,
          next_task_id: null,
        };
        try {
          /** @type {Task} */
          const newTask = await db.createTask(taskData);
          // Correct todayTasks update
          if (newTask.due_date === new Date().toLocaleDateString("en-CA")) {
            ui.todayTasks.push(newTask);
          }
          /** @const {HTMLElement | null} */
          const newEvent = await tasks.createTaskElement(newTask);
          if (newEvent) {
            tasks.attachTaskEventListeners(newEvent, newTask.id);
            taskContainer.appendChild(newEvent);
          }
          newTaskInput.value = "";
          ui.updateTabTitle();
        } catch (error) {
          console.error("Error adding task:", error);
        }
      }
    }
  };

  newTaskForm.addEventListener("submit", addTaskHandler);
  newTaskInput.addEventListener("keydown", addTaskHandler);
  newTaskInput.addEventListener("blur", addTaskHandler);
}

/**
 * Renders the weekly calendar view centered around the given date.
 * @param {Date | string} date - The date to center the week on.
 * @returns {Promise<void>}
 */
export async function renderWeekCalendar(date) {
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {Date[]} */
  const dates = utils.getWeekDates(new Date(date));
  /** @const {Date} */
  const displayedWeekStartDate = dates[0];

  /** @const {Date} */
  const firstDayOfMonth = dates[0];
  /** @const {Date} */
  const lastDayOfMonth = dates[6];

  /** @const {HTMLElement} */
  const monthSpan = monthNameElement.querySelector(".month");
  /** @const {HTMLElement} */
  const yearSpan = monthNameElement.querySelector(".year");

  let monthPart, yearPart;
  if (firstDayOfMonth.getMonth() === lastDayOfMonth.getMonth()) {
    monthPart = translations[lang].monthNames[firstDayOfMonth.getMonth()];
    yearPart = firstDayOfMonth.getFullYear().toString();
  } else {
    /** @const {string} */
    const firstMonthName =
      translations[lang].monthNames[firstDayOfMonth.getMonth()];
    /** @const {string} */
    const lastMonthName =
      translations[lang].monthNames[lastDayOfMonth.getMonth()];
    /** @const {number} */
    const firstYear = firstDayOfMonth.getFullYear();
    /** @const {number} */
    const lastYear = lastDayOfMonth.getFullYear();

    monthPart = `${firstMonthName} - ${lastMonthName}`;
    yearPart =
      firstYear === lastYear
        ? firstYear.toString()
        : `${firstYear} - ${lastYear}`;
  }

  monthSpan.textContent = monthPart;
  yearSpan.textContent = yearPart;

  /** @const {boolean} */
  const isThisCurrentWeek = utils.isDateCurrentWeek(displayedWeekStartDate);
  monthNameElement.classList.toggle("inactive-highlight", !isThisCurrentWeek);

  /** @const {string} */
  const startDate = dates[0].toLocaleDateString("en-CA");
  /** @const {string} */
  const endDate = dates[6].toLocaleDateString("en-CA");
  /** @const {Task[]} */
  const weekTasks = await db.fetchTasksForWeek(startDate, endDate);

  Object.values(dayElements).forEach((dayElement) => {
    dayElement.innerHTML = "";
  });

  /** @const {Date} */
  const today = new Date();

  for (let index = 0; index < dates.length; index++) {
    /** @const {Date} */
    const date = dates[index];
    /** @const {string} */
    const dayDateString = date.toLocaleDateString("en-CA");
    /** @const {Task[]} */
    const dailyTasks = weekTasks.filter((task) => {
      if (!task.due_date) return false;
      return task.due_date === dayDateString;
    });

    dailyTasks.sort((a, b) => a.order - b.order);
    await buildDayColumn(
      dayElements[dayIds[index]],
      date,
      dailyTasks,
      isThisCurrentWeek,
      today,
      lang,
    );
  }
  ui.updateTabTitle();
}

/**
 * Renders the Inbox section.
 * @returns {Promise<void>}
 */
export async function renderInbox() {
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string} */
  const inboxTitle = await db.fetchInboxTitle();
  inboxDiv.innerHTML = "";
  inboxDiv.style.backgroundColor = document.body.classList.contains(
    "dark-theme",
  )
    ? "var(--inbox-bg-dark)"
    : "var(--inbox-bg-light)";

  /** @const {HTMLElement} */
  const headerDiv = document.createElement("div");
  headerDiv.classList.add("inbox-header");
  headerDiv.style.textAlign = "left";
  headerDiv.textContent = inboxTitle;
  inboxDiv.appendChild(headerDiv);

  inboxHeaderElement = headerDiv;

  inboxHeaderElement.addEventListener("click", () => {
    if (!isEditingInboxTitle) {
      makeInboxTitleEditable();
    }
  });

  // Attach drag/click listeners only once: #inbox is a static node that
  // survives re-renders (innerHTML="" clears only its children). The click
  // handler resolves the new-task form at event time because the form is
  // recreated on each render.
  if (!inboxDiv.dataset.listenersAttached) {
    inboxDiv.dataset.listenersAttached = "true";
    inboxDiv.addEventListener("dragover", tasks.allowDrop);
    // Pass todayTasks and the update function to the handler
    inboxDiv.addEventListener("drop", (event) =>
      handleDayDrop(event, ui.todayTasks, async (newTasks) => {
        await ui.refreshTodayTasks();
        ui.updateTabTitle();
      }),
    );
    inboxDiv.addEventListener("dragleave", tasks.handleDragLeave);
    inboxDiv.addEventListener("click", (event) => {
      if (
        event.target === inboxDiv ||
        (!event.target.closest(".event") &&
          !event.target.closest(".inbox-header"))
      ) {
        inboxDiv.querySelector(".new-task-form input")?.focus();
      }
    });
  }

  /** @const {Task[]} */
  const inboxTasks = await db.fetchInboxTasks();
  inboxTasks.sort((a, b) => a.order - b.order); // Ensure inbox tasks are sorted
  /** @const {HTMLElement} */
  const taskContainer = document.createElement("div");
  taskContainer.style.visibility = "hidden";
  inboxDiv.appendChild(taskContainer);
  await tasks.renderTasks(inboxTasks, taskContainer);

  /** @const {HTMLFormElement} */
  const inboxForm = document.createElement("form");
  inboxForm.classList.add("new-task-form");
  inboxForm.innerHTML = `<input type="text" placeholder="${translations[lang].newTaskSomeday}">`;
  inboxDiv.appendChild(inboxForm);
  taskContainer.style.visibility = "visible";
  /** @const {HTMLInputElement} */
  const inboxInputElement = inboxForm.querySelector('input[type="text"]');

  /**
   * Handles creation of a new inbox task.
   * @param {Event} event 
   * @returns {Promise<void>}
   */
  const handleInboxTaskEvent = async (event) => {
    if (
      event.type === "submit" ||
      (event.type === "keydown" && event.key === "Enter") ||
      event.type === "blur"
    ) {
      event.preventDefault();
      if (inboxInputElement.value.trim()) {
        /** @type {Omit<Task, 'id'>} */
        const taskData = {
          title: inboxInputElement.value.trim(),
          due_date: null, // No due date for inbox tasks
          order: taskContainer.children.length, // Append at the end
          color: "",
          description: "",
          completed: 0,
          recurrence_rule: "",
          recurrence_interval: 1,
          previous_task_id: null,
          next_task_id: null,
        };

        try {
          /** @const {Task} */
          const newTask = await db.createTask(taskData);
          /** @const {HTMLElement | null} */
          const newEvent = await tasks.createTaskElement(newTask);
          if (newEvent) {
            tasks.attachTaskEventListeners(newEvent, newTask.id);
            taskContainer.appendChild(newEvent);
          }
          inboxInputElement.value = "";
          ui.updateTabTitle();
        } catch (error) {
          console.error("Error adding task:", error);
        }
      }
    }
  };

  inboxForm.addEventListener("submit", handleInboxTaskEvent);
  inboxInputElement.addEventListener("keydown", handleInboxTaskEvent);
  inboxInputElement.addEventListener("blur", handleInboxTaskEvent);
}

/**
 * Makes the inbox title editable via an input field.
 * @returns {void}
 */
function makeInboxTitleEditable() {
  if (isEditingInboxTitle || !inboxHeaderElement) return;
  isEditingInboxTitle = true;

  /** @const {string} */
  const currentTitle = inboxHeaderElement.textContent;
  /** @const {HTMLInputElement} */
  const inputElement = document.createElement("input");
  inputElement.type = "text";
  inputElement.value = currentTitle;
  inputElement.classList.add("inbox-title-input");
  inputElement.style.textAlign = "left";

  // Keep focus in the input when clicking inside the header frame
  const handleHeaderMouseDown = (event) => {
    if (event.target !== inputElement) event.preventDefault();
  };
  inboxHeaderElement.addEventListener("mousedown", handleHeaderMouseDown);

  inboxHeaderElement.classList.add("editing");
  inboxHeaderElement.innerHTML = "";
  inboxHeaderElement.appendChild(inputElement);
  inputElement.focus();

  /**
   * Saves the new inbox title.
   * @returns {Promise<void>}
   */
  const handleSave = async () => {
    /** @const {string} */
    const newTitle = inputElement.value.trim();
    inboxHeaderElement.classList.remove("editing");
    inboxHeaderElement.removeEventListener("mousedown", handleHeaderMouseDown);
    inboxHeaderElement.innerHTML = "";
    inboxHeaderElement.style.textAlign = "left";

    if (newTitle !== currentTitle) {
      try {
        await db.saveInboxTitle(newTitle);
        inboxHeaderElement.textContent = newTitle;
      } catch (error) {
        console.error("Error saving inbox title", error);
        inboxHeaderElement.textContent = currentTitle;
      }
    } else {
      inboxHeaderElement.textContent = currentTitle;
    }
    isEditingInboxTitle = false;
  };

  /**
   * Cancels editing and reverts the title.
   * @returns {void}
   */
  const handleCancel = () => {
    inboxHeaderElement.classList.remove("editing");
    inboxHeaderElement.removeEventListener("mousedown", handleHeaderMouseDown);
    inboxHeaderElement.innerHTML = "";
    inboxHeaderElement.textContent = currentTitle;
    inboxHeaderElement.style.textAlign = "left";
    isEditingInboxTitle = false;
  };

  inputElement.addEventListener("blur", handleSave);

  inputElement.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await handleSave();
    } else if (event.key === "Escape") {
      event.preventDefault();
      handleCancel();
    }
  });
}
