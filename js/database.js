/** @type {IDBDatabase | undefined} */
let db;
/** @const {string} */
const DB_NAME = "WeekPlannerDB";
/** @const {number} */
const DB_VERSION = 1;
/** @const {string} */
const TASK_STORE = "tasks";
/** @const {string} */
const SETTINGS_STORE = "settings";

/**
 * Initializes IndexedDB.
 * @returns {Promise<void>}
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("Database error:", event.target.error);
      reject("Database error");
    };

    request.onupgradeneeded = (event) => {
      /** @type {IDBDatabase} */
      db = event.target.result;
      // Task store
      if (!db.objectStoreNames.contains(TASK_STORE)) {
        const taskStore = db.createObjectStore(TASK_STORE, {
          keyPath: "id",
          autoIncrement: true,
        });
        taskStore.createIndex("dueDate", "due_date", { unique: false });
        taskStore.createIndex("completed", "completed", { unique: false });
      }
      // Settings store
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log("Database initialized successfully.");
      resolve();
    };
  });
}

/**
 * Gets a transaction for the specified stores.
 * @param {string | string[]} storeNames - Names of the stores.
 * @param {IDBTransactionMode} mode - 'readonly' or 'readwrite'.
 * @returns {IDBTransaction}
 */
function getTransaction(storeNames, mode) {
  if (!Array.isArray(storeNames)) {
    storeNames = [storeNames];
  }
  return db.transaction(storeNames, mode);
}

// --- API Replacement Functions ---

/**
 * @typedef {object} Task
 * @property {number} id - Unique task identifier.
 * @property {string} title - Task title.
 * @property {string} [description] - Task description.
 * @property {string} [color] - Task color.
 * @property {string | null} [due_date] - Due date in "YYYY-MM-DD" format or null for inbox.
 * @property {number} completed - Completion status (0 or 1).
 * @property {number} [order] - Sort order within the container.
 * @property {string} [recurrence_rule] - Recurrence rule ('daily', 'weekly', 'monthly', 'yearly').
 * @property {number} [recurrence_interval] - Repetition interval.
 * @property {number | null} [previous_task_id] - ID of the previous task in the chain.
 * @property {number | null} [next_task_id] - ID of the next task in the chain.
 */

/**
 * Fetches tasks for a specific date range.
 * @param {string} startDate - Start date in "YYYY-MM-DD" format.
 * @param {string} endDate - End date in "YYYY-MM-DD" format.
 * @returns {Promise<Task[]>}
 */
export function fetchTasksForWeek(startDate, endDate) {
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(TASK_STORE, "readonly");
    const store = transaction.objectStore(TASK_STORE);
    const index = store.index("dueDate");
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);

    request.onsuccess = () => resolve(request.result.sort((a,b) => a.order - b.order));
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Fetches tasks from the inbox (without a due date).
 * @returns {Promise<Task[]>}
 */
export function fetchInboxTasks() {
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(TASK_STORE, "readonly");
    const store = transaction.objectStore(TASK_STORE);
    /** @type {Task[]} */
    const inboxTasks = [];

    const request = store.openCursor();
    request.onerror = (event) => reject(event.target.error);
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.due_date === null) {
          inboxTasks.push(cursor.value);
        }
        cursor.continue();
      } else {
        resolve(inboxTasks.sort((a, b) => a.order - b.order));
      }
    };
  });
}

/**
 * Fetches the inbox title from settings.
 * @returns {Promise<string>}
 */
export async function fetchInboxTitle() {
    let setting = await getSetting("inbox_title");
    if (!setting) {
        /** @const {string} */
        const defaultTitle = "📦 Inbox";
        await updateSetting("inbox_title", defaultTitle);
        return defaultTitle;
    }
    return setting.value;
}

/**
 * Saves the new inbox title.
 * @param {string} newTitle
 * @returns {Promise<boolean>}
 */
export function saveInboxTitle(newTitle) {
    return updateSetting("inbox_title", newTitle);
}

/**
 * Creates a new task in the database.
 * @param {Omit<Task, 'id'>} taskData - Data for the new task.
 * @returns {Promise<Task>} - The created task, including the assigned ID.
 */
export function createTask(taskData) {
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(TASK_STORE, "readwrite");
    const store = transaction.objectStore(TASK_STORE);
    const request = store.add(taskData);

    request.onsuccess = () => {
        /** @type {Task} */
        const createdTask = { ...taskData, id: request.result };
        resolve(createdTask);
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Fetches a single task by ID.
 * @param {number | string} taskId - Task ID.
 * @returns {Promise<Task | undefined>}
 */
export function fetchTaskDetails(taskId) {
  /** @const {number} */
  const id = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(TASK_STORE, "readonly");
    const store = transaction.objectStore(TASK_STORE);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Updates fields of an existing task.
 * @param {number | string} taskId - Task ID.
 * @param {Partial<Task>} updates - Fields to update.
 * @returns {Promise<boolean>} - True if the update was successful.
 */
export async function updateTask(taskId, updates) {
  /** @const {number} */
  const id = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
  
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(TASK_STORE, "readwrite");
    const store = transaction.objectStore(TASK_STORE);
    const getRequest = store.get(id);

    getRequest.onerror = (event) => reject(event.target.error);
    getRequest.onsuccess = () => {
        /** @type {Task | undefined} */
        const task = getRequest.result;
        if (!task) {
            return reject(`Task with id ${id} not found`);
        }
        /** @type {Task} */
        const updatedTask = { ...task, ...updates };
        const putRequest = store.put(updatedTask);
        putRequest.onsuccess = () => resolve(true);
        putRequest.onerror = (event) => reject(event.target.error);
    };
  });
}

/**
 * Wraps an IDBRequest in a Promise.
 * @param {IDBRequest} request 
 * @returns {Promise<any>}
 */
function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Deletes a task and updates previous/next links for neighbors.
 * @param {number | string} taskId - Task ID.
 * @returns {Promise<boolean>}
 */
export async function deleteTask(taskId) {
    /** @const {number} */
    const id = typeof taskId === 'string' ? parseInt(taskId, 10) : taskId;
    const transaction = getTransaction(TASK_STORE, "readwrite");
    const store = transaction.objectStore(TASK_STORE);

    try {
        /** @type {Task | undefined} */
        const taskToDelete = await promisifyRequest(store.get(id));

        if (!taskToDelete) {
            console.warn(`Task ${id} not found for deletion.`);
            return true;
        }

        if (taskToDelete.previous_task_id) {
            /** @type {Task | undefined} */
            const prevTask = await promisifyRequest(store.get(taskToDelete.previous_task_id));
            if (prevTask) {
                prevTask.next_task_id = taskToDelete.next_task_id;
                await promisifyRequest(store.put(prevTask));
            }
        }

        if (taskToDelete.next_task_id) {
            /** @type {Task | undefined} */
            const nextTask = await promisifyRequest(store.get(taskToDelete.next_task_id));
            if (nextTask) {
                nextTask.previous_task_id = taskToDelete.previous_task_id;
                await promisifyRequest(store.put(nextTask));
            }
        }

        await promisifyRequest(store.delete(id));
        return true;
    } catch (error) {
        console.error("Error during deleteTask transaction:", error);
        throw error;
    }
}

/**
 * Updates the 'order' field for multiple tasks.
 * @typedef {object} TaskOrderUpdate
 * @property {number} id
 * @property {number} order
 * 
 * @param {TaskOrderUpdate[]} updates
 * @returns {Promise<boolean>}
 */
export function updateTaskOrder(updates) {
    return new Promise((resolve, reject) => {
        const transaction = getTransaction(TASK_STORE, "readwrite");
        const store = transaction.objectStore(TASK_STORE);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = (event) => reject(event.target.error);

        if (updates.length === 0) {
            resolve(true);
            return;
        }

        updates.forEach(update => {
            const getRequest = store.get(update.id);
            getRequest.onsuccess = (event) => {
                /** @type {Task} */
                const task = event.target.result;
                if(task) {
                    task.order = update.order;
                    store.put(task);
                }
            };
        });
    });
}

/**
 * Fetches all tasks from the database.
 * @returns {Promise<Task[]>}
 */
export function fetchAllTasks() {
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(TASK_STORE, "readonly");
    const store = transaction.objectStore(TASK_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}


/**
 * Searches tasks using fuzzysort.
 * @param {string} query - Search query.
 * @param {number} pageSize - Page size.
 * @param {number} page - Page number (starting from 1).
 * @returns {Promise<Task[]>}
 */
export async function searchTasks(query, pageSize, page) {
    if (!query) return [];
    const allTasks = await fetchAllTasks();
    const results = fuzzysort.go(query, allTasks, { key: 'title' });
    /** @type {Task[]} */
    const formattedResults = results.map(r => r.obj);
    
    /** @const {number} */
    const start = (page - 1) * pageSize;
    /** @const {number} */
    const end = start + pageSize;
    
    return formattedResults.slice(start, end);
}

/**
 * Finds all overdue last tasks in chains and starts the catch-up process for them.
 * @returns {Promise<boolean>} Returns true if new tasks were created and the UI needs refresh.
 */
export async function checkRecurringTasks() {
    /** @const {Date} */
    const today = new Date();
    today.setHours(0, 0, 0, 0); // UTC midnight for comparison
    /** @const {string} */
    const todayStr = today.toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
        const transaction = getTransaction(TASK_STORE, "readwrite");
        transaction.onerror = event => reject(event.target.error);
        
        const store = transaction.objectStore(TASK_STORE);
        /** @type {Task[]} */
        const tasksToCatchUp = [];
        const request = store.openCursor();

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                /** @type {Task} */
                const task = cursor.value;
                if (task.recurrence_rule && !task.completed && task.due_date && task.due_date < todayStr && !task.next_task_id) {
                   tasksToCatchUp.push(task);
                }
                cursor.continue();
            } else {
                // All tasks reviewed, now create catch-up instances
                (async () => {
                    let needsUiRefresh = false;
                    for (const task of tasksToCatchUp) {
                        const created = await createNextOccurrenceCatchUp(task, today);
                        if (created) needsUiRefresh = true;
                    }
                    resolve(needsUiRefresh); // Return flag if UI refresh is needed
                })();
            }
        };
    });
}

/**
 * Cyclically creates repeating tasks until the next date is today or in the future.
 * Skipped tasks are created with `completed: 1`.
 * @param {Task} lastTask - The last known task in the chain.
 * @param {Date} today - Today's date (UTC midnight).
 * @returns {Promise<boolean>} - True if at least one task was created.
 */
async function createNextOccurrenceCatchUp(lastTask, today) {
    const { calculateNextRecurrence, parseDateUTC } = await import('./utils.js');
    /** @type {Task} */
    let currentTask = lastTask;
    let created = false;
    /** @const {number} */
    const maxIterations = 100; // Protection against infinite loop
    let i = 0;

    while (i < maxIterations) {
        /** @type {Date | null} */
        let nextDueDate = calculateNextRecurrence(
            parseDateUTC(currentTask.due_date),
            currentTask.recurrence_rule,
            currentTask.recurrence_interval
        );

        if (!nextDueDate) break; // Rule is invalid or ended

        // If the next date is still in the past, create an "invisible" completed task and continue the cycle
        if (nextDueDate < today) {
            console.log(`Catching up: creating and skipping past task for date ${nextDueDate.toISOString().split('T')[0]}`);
            /** @type {Omit<Task, 'id'>} */
            const newTask = {
                title: currentTask.title,
                description: currentTask.description,
                color: currentTask.color,
                recurrence_rule: currentTask.recurrence_rule,
                recurrence_interval: currentTask.recurrence_interval,
                due_date: nextDueDate.toISOString().split('T')[0],
                completed: 1, // Mark immediately as completed (skipped)
                order: 0,
                previous_task_id: currentTask.id,
                next_task_id: null,
            };
            /** @type {Task} */
            const createdTask = await createTask(newTask);
            await updateTask(currentTask.id, { next_task_id: createdTask.id });
            currentTask = createdTask; // Next iteration starts with this new task
            created = true;
        } else {
            // Next date is today or in the future. Create a regular task and exit the loop.
            await createNextOccurrence(currentTask.id);
            created = true;
            break;
        }
        i++;
    }
    if (i >= maxIterations) {
        console.error("Max iterations reached for task catch-up:", lastTask.id);
    }
    return created;
}

/**
 * Creates one next task in the chain. Used both upon completion and by catch-up logic.
 * @param {number} taskId - ID of the task after which to create the next one.
 * @returns {Promise<Task | null>}
 */
export async function createNextOccurrence(taskId) {
    /** @type {Task | undefined} */
    const currentTask = await fetchTaskDetails(taskId);
    // Check for next_task_id to prevent duplicates
    if (!currentTask || !currentTask.recurrence_rule || !currentTask.due_date || currentTask.next_task_id) {
        return null;
    }

    const { calculateNextRecurrence, parseDateUTC } = await import('./utils.js');
    /** @type {Date | null} */
    const nextDueDate = calculateNextRecurrence(
        parseDateUTC(currentTask.due_date),
        currentTask.recurrence_rule,
        currentTask.recurrence_interval
    );

    if (!nextDueDate) return null;

    /** @type {Omit<Task, 'id'>} */
    const newTask = {
      title: currentTask.title,
      description: currentTask.description,
      color: currentTask.color,
      recurrence_rule: currentTask.recurrence_rule,
      recurrence_interval: currentTask.recurrence_interval,
      due_date: nextDueDate.toISOString().split('T')[0],
      completed: 0,
      order: 0,
      previous_task_id: currentTask.id,
      next_task_id: null,
    };
    
    /** @type {Task} */
    const createdTask = await createTask(newTask);
    await updateTask(currentTask.id, { next_task_id: createdTask.id });
    
    return createdTask;
}

/**
 * Fetches tasks scheduled for today.
 * @returns {Promise<Task[]>}
 */
export async function fetchTodayTasks() {
  /** @const {string} */
  const todayString = new Date().toLocaleDateString("en-CA");
  return fetchTasksForWeek(todayString, todayString);
}


/**
 * @typedef {object} RecurringChainResult
 * @property {Task[]} tasks - Tasks on the current page.
 * @property {object} pagination - Pagination information.
 * @property {number} pagination.currentPage
 * @property {number} pagination.pageSize
 * @property {number} pagination.totalItems
 * @property {number} pagination.totalPages
 * 
 * Fetches the entire recurring task chain, starting from the specified one, with pagination.
 * @param {number | string} startTaskId - ID of the task to start the chain from.
 * @param {number} [page=1] - Page number.
 * @param {number} [pageSize=15] - Page size.
 * @returns {Promise<RecurringChainResult | null>}
 */
export async function fetchRecurringChain(startTaskId, page = 1, pageSize = 15) {
    /** @type {Task[]} */
    let chain = [];
    /** @type {Task | undefined} */
    let currentTask = await fetchTaskDetails(startTaskId);

    if (!currentTask) return null;

    // Go back to the first task in the chain
    while (currentTask?.previous_task_id) {
        currentTask = await fetchTaskDetails(currentTask.previous_task_id);
        if (!currentTask) break;
    }

    // Traverse forward to build the chain
    while (currentTask) {
        chain.push(currentTask);
        if (currentTask.next_task_id) {
            currentTask = await fetchTaskDetails(currentTask.next_task_id);
        } else {
            break;
        }
    }

    /** @const {number} */
    const totalItems = chain.length;
    /** @const {number} */
    const totalPages = Math.ceil(totalItems / pageSize);
    /** @const {number} */
    const start = (page - 1) * pageSize;
    /** @const {number} */
    const end = start + pageSize;
    /** @type {Task[]} */
    const paginatedTasks = chain.slice(start, end);

    return {
        tasks: paginatedTasks,
        pagination: {
            currentPage: page,
            pageSize,
            totalItems,
            totalPages,
        }
    };
}


// --- Settings Utilities ---

/**
 * @typedef {object} Setting
 * @property {string} key
 * @property {*} value
 *
 * Gets a setting by key.
 * @param {string} key
 * @returns {Promise<Setting | undefined>}
 */
function getSetting(key) {
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(SETTINGS_STORE, 'readonly');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Updates or creates a setting.
 * @param {string} key
 * @param {*} value
 * @returns {Promise<boolean>}
 */
function updateSetting(key, value) {
  return new Promise((resolve, reject) => {
    const transaction = getTransaction(SETTINGS_STORE, 'readwrite');
    const store = transaction.objectStore(SETTINGS_STORE);
    const request = store.put({ key, value });
    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}


// --- Import/Export ---

/**
 * Exports all data (tasks and settings) to JSON and downloads the file.
 * @returns {Promise<void>}
 */
export async function exportData() {
    const tasks = await fetchAllTasks();
    const inboxTitleSetting = await getSetting("inbox_title");
    
    /** @type {{tasks: Task[], settings: Setting[]}} */
    const data = {
        tasks: tasks,
        settings: [inboxTitleSetting].filter(Boolean)
    };

    /** @const {Blob} */
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    /** @const {string} */
    const url = URL.createObjectURL(blob);
    /** @const {HTMLAnchorElement} */
    const a = document.createElement('a');
    a.href = url;
    a.download = 'week-planner-backup.json';
    a.click();
    URL.revokeObjectURL(url);
}

/**
 * Imports data from a JSON string, overwriting current stores.
 * @param {string} jsonData - JSON string containing data.
 * @returns {Promise<void>}
 * @throws {Error} If the file format is incorrect.
 */
export async function importData(jsonData) {
    /** @type {{tasks: Task[], settings: Setting[]}} */
    const data = JSON.parse(jsonData);
    if (!data.tasks && !data.settings) {
        throw new Error("Invalid import file format. Missing 'tasks' or 'settings' key.");
    }

    return new Promise((resolve, reject) => {
        const transaction = getTransaction([TASK_STORE, SETTINGS_STORE], 'readwrite');
        const taskStore = transaction.objectStore(TASK_STORE);
        const settingsStore = transaction.objectStore(SETTINGS_STORE);

        transaction.oncomplete = () => resolve();
        transaction.onerror = (event) => reject(event.target.error);

        taskStore.clear();
        settingsStore.clear();

        if (data.tasks && Array.isArray(data.tasks)) {
            data.tasks.forEach(task => {
                taskStore.add(task);
            });
        }

        if (data.settings && Array.isArray(data.settings)) {
            data.settings.forEach(setting => {
                settingsStore.add(setting);
            });
        }
    });
}
