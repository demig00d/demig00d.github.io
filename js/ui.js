import * as db from "./database.js";
import * as calendar from "./calendar.js";
import * as tasks from "./tasks.js";
import * as utils from "./utils.js";
import {
  translations,
  updateTranslations,
} from "./localization.js";
import { initialWrapTaskTitles } from "./config.js";
import { setDisplayedWeekStartDate, getDisplayedWeekStartDate } from "./state.js";

// --- DOM Element References ---
/** @const {HTMLElement | null} */
const settingsPopup = document.getElementById("settings-popup");
/** @const {HTMLElement | null} */
const taskDetailsPopupOverlay = document.getElementById(
  "task-details-popup-overlay",
);
/** @const {HTMLElement | null} */
const taskDetailsPopup = document.getElementById("task-details-popup");
/** @const {HTMLTextAreaElement | null} */
const taskDescriptionTextarea = document.getElementById(
  "task-description-textarea",
);
/** @const {HTMLElement | null} */
const taskDescriptionRendered = document.getElementById(
  "task-description-rendered",
);
/** @const {HTMLElement | null} */
const closeTaskDetailsPopupBtn = document.getElementById(
  "close-task-details-popup",
);
/** @const {HTMLElement | null} */
const deleteTaskDetailsBtn = document.getElementById("delete-task-details");
/** @const {HTMLElement | null} */
const toggleDescriptionModeBtn = document.getElementById(
  "toggle-description-mode-btn",
);
/** @const {HTMLElement | null} */
const descriptionModeIcon = document.getElementById("description-mode-icon");
/** @const {HTMLElement | null} */
const datePickerContainer = document.getElementById("date-picker-container");
/** @const {HTMLElement | null} */
const datePickerMonthYear = document.getElementById("date-picker-month-year");
/** @const {HTMLElement | null} */
const datePickerGrid = document.getElementById("date-picker-grid");

// Search References
/** @const {HTMLElement | null} */
const headerSearchWrapper = document.getElementById("header-search-wrapper");
/** @const {HTMLInputElement | null} */
const headerSearchInput = document.getElementById("header-search-input");
/** @const {HTMLElement | null} */
const searchResultsDropdown = document.getElementById("search-results-dropdown");

/** @const {HTMLElement | null} */
const taskDetailsDateInput = document.getElementById("task-details-date");
/** @const {HTMLElement | null} */
const markDoneTaskDetailsBtn = document.getElementById(
  "mark-done-task-details",
);
/** @const {HTMLElement | null} */
const copyTaskLinkBtn = document.getElementById("copy-task-link-btn");
/** @const {HTMLElement | null} */
const snackbar = document.getElementById("snackbar");
/** @const {HTMLSpanElement} */
const snackbarText = document.createElement("span");
/** @const {HTMLButtonElement} */
const snackbarUndoButton = document.createElement("button");
/** @const {HTMLElement | null} */
const recurringTaskDetailsBtn = document.getElementById(
  "recurring-task-details",
);
/** @const {HTMLElement | null} */
const recurrenceSettingsContainer = document.getElementById(
  "recurrence-settings-container",
);
/** @const {HTMLElement | null} */
const recurrenceControls = document.getElementById("recurrence-controls");
/** @const {HTMLSelectElement | null} */
const recurrencePeriodSelect = document.getElementById(
  "recurrence-period-select",
);
/** @const {HTMLInputElement | null} */
const recurrenceIntervalInput = document.getElementById(
  "recurrence-interval-input",
);
/** @const {HTMLElement | null} */
const recurrencePreview = document.getElementById("recurrence-preview");
/** @const {HTMLElement | null} */
const exportDbBtn = document.getElementById("export-db-btn");
/** @const {HTMLInputElement | null} */
const importDbInput = document.getElementById("import-db-input");
/** @const {HTMLElement | null} */
const viewRecurringChainBtn = document.getElementById(
  "view-recurring-chain-btn",
);
/** @const {HTMLElement | null} */
const recurringChainPopupOverlay = document.getElementById(
  "recurring-chain-popup-overlay",
);
/** @const {HTMLElement | null} */
const recurringChainPopup = document.getElementById("recurring-chain-popup");
/** @const {HTMLUListElement | null} */
const recurringChainList = document.getElementById("recurring-chain-list");
/** @const {HTMLElement | null} */
const closeRecurringChainPopupBtn = document.getElementById(
  "close-recurring-chain-popup",
);
/** @const {HTMLButtonElement | null} */
const recurringChainPrevPageBtn = document.getElementById(
  "recurring-chain-prev-page",
);
/** @const {HTMLButtonElement | null} */
const recurringChainNextPageBtn = document.getElementById(
  "recurring-chain-next-page",
);
/** @const {HTMLSpanElement | null} */
const recurringChainPageInfo = document.getElementById(
  "recurring-chain-page-info",
);

// --- State Variables ---
/** @type {db.Task[]} */
export let todayTasks = [];
/** @type {number | null} */
export let currentTaskBeingViewed = null;
/** @type {boolean} */
let isDescriptionRenderedMode = false;
/** @type {boolean} */
let isSettingsOpen = false;

// Search State
/** @type {boolean} */
let isSearchDropdownOpen = false;
/** @type {number | null} */
let searchTimeout = null;
/** @type {number} */
let currentPage = 1;
/** @const {number} */
const tasksPerPage = 10;
/** @type {string} */
let searchQuery = "";
/** @type {boolean} */
let loadingMoreResults = false;
/** @type {function(Event): void | null} */
let scrollEventListener = null;

/** @type {boolean} */
let datePickerVisible = false;
/** @type {Date} */
let datePickerCurrentDate = new Date();

// State for Undo Operations
/** 
 * @typedef {db.Task} LastDeletedTaskData 
 * @type {LastDeletedTaskData | null} 
 */
export let lastDeletedTaskData = null;
/** @type {number | null} */
let deleteTimeoutId = null;
/**
 * @typedef {object} LastClearedRecurrence
 * @property {string} rule
 * @property {number} interval
 * @property {number} taskId
 * @type {LastClearedRecurrence | null}
 */
let lastClearedRecurrence = null;
/** @type {number | null} */
let recurrenceTimeoutId = null;
/** @type {number | null} */
let snackbarTimeoutId = null;
/** @type {number | null} */
let snackbarProgressIntervalId = null;
/** @type {number} */
let snackbarStartTime = 0;
/** @type {number} */
let snackbarDuration = 0;
/** @type {boolean} */
let recurrenceOpenedForNonRecurring = false;

// State for Chain Popup
/** @type {number} */
let currentChainPage = 1;
/** @type {number} */
let currentChainTotalPages = 1;
/** @type {number | null} */
let currentChainTaskId = null;
/** @type {function(): void | null} */
let currentChainButtonHandler = null;

// Favicon Constants
/** @const {Object<string, Object<string, string>>} */
const faviconColors = {
  light: { empty: "#555555", singleDigit: "#3498DB", multiple: "#E74C3C" },
  dark: { empty: "#CCCCCC", singleDigit: "#5DADE2", multiple: "#EC7063" },
};
/** @const {string} */
const faviconBaseSvg = `<svg width='80' height='80' xmlns='http://www.w3.org/2000/svg'><defs><mask id='text-hole'><rect width='100%' height='100%' fill='white'/><text x='40' y='39' font-family='Arial' font-size='80' font-weight='bold' text-anchor='middle' dominant-baseline='central'>{SYMBOL}</text></mask></defs><circle cx='40' cy='40' r='40' fill='{FILL_COLOR}' mask='url(#text-hole)'/></svg>`;

// --- Today Tasks State ---
/**
 * Sets the global list of today's tasks.
 * @param {db.Task[]} newTasks
 * @returns {void}
 */
export function setTodayTasks(newTasks) {
  todayTasks = Array.isArray(newTasks) ? newTasks : [];
}

// --- Snackbar ---
/**
 * Gets or creates the snackbar progress bar element.
 * @returns {HTMLElement | null}
 */
function getSnackbarProgressBar() {
  /** @type {HTMLElement | null} */
  let progressBar = snackbar?.querySelector(".snackbar-progress");
  if (!progressBar && snackbar) {
    progressBar = document.createElement("div");
    progressBar.className = "snackbar-progress";
    snackbar.appendChild(progressBar);
  }
  return progressBar;
}

/**
 * Starts the progress bar animation for the snackbar.
 * @param {number} duration - Duration in ms.
 * @returns {void}
 */
function startSnackbarProgress(duration) {
  /** @const {HTMLElement | null} */
  const progressBar = getSnackbarProgressBar();
  if (!progressBar) return;
  snackbarStartTime = Date.now();
  snackbarDuration = duration;
  clearInterval(snackbarProgressIntervalId);
  /** @const {function(): void} */
  const updateProgress = () => {
    /** @const {number} */
    const elapsedTime = Date.now() - snackbarStartTime;
    /** @const {number} */
    const remainingTime = Math.max(0, snackbarDuration - elapsedTime);
    /** @const {number} */
    const progress = (remainingTime / snackbarDuration) * 100;
    /** @const {HTMLElement | null} */
    const currentProgressBar = snackbar?.querySelector(".snackbar-progress");
    if (currentProgressBar) currentProgressBar.style.width = `${progress}%`;
    if (remainingTime <= 0) clearInterval(snackbarProgressIntervalId);
  };
  snackbarProgressIntervalId = setInterval(updateProgress, 50);
  updateProgress();
}

/**
 * Stops the progress bar animation.
 * @returns {void}
 */
function stopSnackbarProgress() {
  clearInterval(snackbarProgressIntervalId);
  /** @const {HTMLElement | null} */
  const progressBar = getSnackbarProgressBar();
  if (progressBar) {
    progressBar.style.width = "0%";
    progressBar.style.display = "none";
  }
}

/**
 * Displays a non-undo snackbar message.
 * @param {string} messageKey - Key for the translation string.
 * @param {boolean} [isError=false]
 * @param {number} [duration=3000] - Duration in ms.
 * @returns {void}
 */
export function showSnackbar(messageKey, isError = false, duration = 3000) {
  if (!snackbar) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string[]} */
  const simpleInfoMessages = [
    "taskLinkCopied",
    "taskRestored",
    "recurrenceRestored",
    "importingDatabase",
    "importSuccess",
  ];
  /** @const {boolean} */
  const hideProgressBar = isError || simpleInfoMessages.includes(messageKey);
  if (hideProgressBar) duration = 2500;

  /** @const {string} */
  const message = translations[lang]?.[messageKey] || messageKey;
  clearTimeout(snackbarTimeoutId);
  stopSnackbarProgress();
  
  clearTimeout(deleteTimeoutId);
  clearTimeout(recurrenceTimeoutId);

  snackbarText.textContent = message;
  snackbarUndoButton.style.display = "none";

  /** @type {HTMLElement | null} */
  let contentWrapper = snackbar.querySelector(".snackbar-content");
  if (!contentWrapper) {
    snackbar.innerHTML = "";
    contentWrapper = document.createElement("div");
    contentWrapper.className = "snackbar-content";
    snackbar.appendChild(contentWrapper);
    getSnackbarProgressBar();
  }
  contentWrapper.innerHTML = "";
  contentWrapper.appendChild(snackbarText);

  /** @const {HTMLElement | null} */
  const progressBar = getSnackbarProgressBar();
  if (progressBar) {
    progressBar.style.display = hideProgressBar ? "none" : "block";
    if (!hideProgressBar) {
      progressBar.style.width = "100%";
      startSnackbarProgress(duration);
    } else stopSnackbarProgress();
  }

  snackbar.className = "snackbar show";
  snackbar.style.backgroundColor = isError ? "#d32f2f" : "#333";
  snackbarTimeoutId = setTimeout(() => {
    if (snackbar) snackbar.className = snackbar.className.replace("show", "");
    stopSnackbarProgress();
  }, duration);
}

/**
 * Displays an undo-enabled snackbar message.
 * @param {string} messageKey - Key for the translation string.
 * @param {function(): Promise<void> | void} undoCallback - Function to execute when Undo is clicked.
 * @param {function(): Promise<void> | void} timeoutAction - Function to execute when the timer expires.
 * @param {number} [duration=7000] - Duration in ms.
 * @returns {void}
 */
function showUndoSnackbar(
  messageKey,
  undoCallback,
  timeoutAction,
  duration = 7000,
) {
  if (!snackbar) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string} */
  const message = translations[lang]?.[messageKey] || messageKey;
  /** @const {string} */
  const undoText = translations[lang]?.undo || "Undo";

  clearTimeout(snackbarTimeoutId);
  stopSnackbarProgress();
  clearTimeout(deleteTimeoutId);
  clearTimeout(recurrenceTimeoutId);

  snackbarText.textContent = message;
  snackbarUndoButton.textContent = undoText;
  snackbarUndoButton.style.display = "inline-block";
  snackbarUndoButton.className = "snackbar-button";
  snackbarUndoButton.onclick = () => {
    clearTimeout(snackbarTimeoutId);
    stopSnackbarProgress();
    clearTimeout(deleteTimeoutId);
    clearTimeout(recurrenceTimeoutId);
    snackbar.className = snackbar.className.replace("show", "");
    if (undoCallback) undoCallback();
    if (messageKey === "taskDeleted") lastDeletedTaskData = null;
    else if (messageKey === "recurrenceRemoved") lastClearedRecurrence = null;
  };

  /** @type {HTMLElement | null} */
  let contentWrapper = snackbar.querySelector(".snackbar-content");
  if (!contentWrapper) {
    snackbar.innerHTML = "";
    contentWrapper = document.createElement("div");
    contentWrapper.className = "snackbar-content";
    snackbar.appendChild(contentWrapper);
    getSnackbarProgressBar();
  }
  contentWrapper.innerHTML = "";
  contentWrapper.appendChild(snackbarText);
  contentWrapper.appendChild(snackbarUndoButton);

  /** @const {HTMLElement | null} */
  const progressBar = getSnackbarProgressBar();
  if (progressBar) {
    progressBar.style.display = "block";
    progressBar.style.width = "100%";
    startSnackbarProgress(duration);
  }

  snackbar.className = "snackbar show";
  snackbar.style.backgroundColor = "#333";
  /** @const {function(): void} */
  const timeoutActionWrapper = () => {
    if (timeoutAction) timeoutAction();
    if (snackbar) snackbar.className = snackbar.className.replace("show", "");
    stopSnackbarProgress();
    if (messageKey === "taskDeleted") lastDeletedTaskData = null;
    else if (messageKey === "recurrenceRemoved") lastClearedRecurrence = null;
  };
  /** @const {number} */
  const timeoutId = setTimeout(timeoutActionWrapper, duration);
  if (messageKey === "taskDeleted") deleteTimeoutId = timeoutId;
  else if (messageKey === "recurrenceRemoved") recurrenceTimeoutId = timeoutId;
  snackbarTimeoutId = timeoutId;
}

// --- Popup Management ---
/**
 * Toggles the visibility of the settings popup.
 * @returns {void}
 */
export function toggleSettingsPopup() {
  isSettingsOpen = !isSettingsOpen;
  if (settingsPopup)
    settingsPopup.style.display = isSettingsOpen ? "block" : "none";
  if (isSettingsOpen) {
    /** @const {HTMLInputElement | null} */
    const fullWeekdaysCheckbox = document.getElementById(
      "full-weekdays-checkbox",
    );
    if (fullWeekdaysCheckbox) {
      fullWeekdaysCheckbox.checked =
        localStorage.getItem("fullWeekdays") === "true";
      handleCheckboxChange(fullWeekdaysCheckbox);
    }
    /** @const {HTMLInputElement | null} */
    const wrapTitlesCheckbox = document.getElementById(
      "wrap-task-titles-checkbox",
    );
    if (wrapTitlesCheckbox) {
      /** @type {boolean} */
      let wrapTitles = localStorage.getItem("wrapTaskTitles") !== "false";
      if (localStorage.getItem("wrapTaskTitles") === null)
        wrapTitles = initialWrapTaskTitles;
      wrapTitlesCheckbox.checked = wrapTitles;
      handleCheckboxChange(wrapTitlesCheckbox);
    }
  }
}

/**
 * Closes all open popups/overlays in a layered manner.
 * @returns {void}
 */
export function closeAllPopups() {
  if (recurringChainPopupOverlay?.style.display === "flex") {
    closeRecurringChainPopup();
    return;
  }
  if (taskDetailsPopupOverlay?.style.display === "flex") {
    closeTaskDetailsPopup();
    return;
  }
  if (isSettingsOpen) {
    isSettingsOpen = false;
    if (settingsPopup) settingsPopup.style.display = "none";
    return;
  }
  if (
    datePickerVisible &&
    datePickerContainer &&
    taskDetailsPopupOverlay?.style.display !== "flex"
  ) {
    datePickerContainer.style.display = "none";
    datePickerVisible = false;
    return;
  }
  if (isSearchDropdownOpen) {
    closeSearchDropdown();
    return;
  }
}

/**
 * Closes the search dropdown.
 * @returns {void}
 */
function closeSearchDropdown() {
  isSearchDropdownOpen = false;
  if (searchResultsDropdown) searchResultsDropdown.style.display = "none";
  removeScrollListener();
  if (searchResultsDropdown)
    searchResultsDropdown.classList.remove("scrollable");
}

/**
 * Handles clicks outside of popups to close them.
 * @param {MouseEvent} event
 * @returns {void}
 */
export function handleGlobalClick(event) {
  if (event.target === recurringChainPopupOverlay) {
    closeRecurringChainPopup();
    return;
  }
  if (
    isSettingsOpen &&
    settingsPopup &&
    !settingsPopup.contains(event.target) &&
    !event.target.closest("#settings-btn")
  )
    toggleSettingsPopup();

  // Close search dropdown if clicked outside header search wrapper
  if (
    isSearchDropdownOpen &&
    headerSearchWrapper &&
    !headerSearchWrapper.contains(event.target)
  )
    closeSearchDropdown();

  if (
    datePickerVisible &&
    datePickerContainer &&
    !datePickerContainer.contains(event.target) &&
    !event.target.closest("#task-details-date") &&
    taskDetailsPopupOverlay?.style.display !== "flex"
  ) {
    datePickerContainer.style.display = "none";
    datePickerVisible = false;
  }

  // Close task details if clicked on overlay and no text is selected
  if (
    event.target === taskDetailsPopupOverlay &&
    window.getSelection().toString().length === 0
  )
    closeTaskDetailsPopup();
}

// --- Theme Management ---
/**
 * Sets the application theme and updates affected UI elements.
 * @param {string} theme - 'light', 'dark', or 'auto'.
 * @returns {void}
 */
export function setTheme(theme) {
  /** @const {HTMLBodyElement} */
  const body = document.body;
  body.classList.remove("dark-theme", "light-theme");
  /** @type {string} */
  let resolvedTheme = theme;

  if (theme === "dark") {
    body.classList.add("dark-theme");
    resolvedTheme = "dark";
  } else if (theme === "light") {
    body.classList.add("light-theme");
    resolvedTheme = "light";
  } else {
    /** @const {boolean} */
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)",
    ).matches;
    if (prefersDark) {
      body.classList.add("dark-theme");
      resolvedTheme = "dark";
    } else {
      body.classList.add("light-theme");
      resolvedTheme = "light";
    }
  }

  document.querySelectorAll(".event").forEach((event) => {
    /** @const {string} */
    const color = event.dataset.taskColor;
    event.style.backgroundColor = getTaskBackgroundColor(color);
  });
  /** @const {HTMLElement | null} */
  const inboxDiv = document.getElementById("inbox");
  if (inboxDiv) {
    inboxDiv.style.backgroundColor =
      resolvedTheme === "dark"
        ? "var(--inbox-bg-dark)"
        : "var(--inbox-bg-light)";
  }
  requestAnimationFrame(updateSelectArrowsColor);
  updateTabTitle();
  /** @const {HTMLSelectElement | null} */
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) themeSelect.value = theme;
}

/**
 * Gets the background color for a task based on its color and the current theme.
 * @param {string | undefined} color - The task color key.
 * @returns {string} - The CSS color variable or 'transparent'.
 */
export function getTaskBackgroundColor(color) {
  /** @const {string} */
  const currentThemeSetting = localStorage.getItem("theme") || "auto";
  if (!color || color === "no-color") return "transparent";
  /** @const {string} */
  const theme =
    currentThemeSetting === "auto"
      ? window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : currentThemeSetting;
  /** @const {string} */
  const colorVar = `var(--task-color-${color}-${theme})`;
  /** @const {CSSStyleDeclaration} */
  const style = getComputedStyle(document.documentElement);
  return style.getPropertyValue(`--task-color-${color}-${theme}`)
    ? colorVar
    : "transparent";
}

// --- Localization & Settings ---
/**
 * Updates all static UI text based on the current language setting.
 * @returns {Promise<void>}
 */
export async function updateSettingsText() {
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  await updateTranslations(lang);
  updateSettingsLanguageSelector(lang);
}

/**
 * Sets the selected value in the language dropdown.
 * @param {string} currentLang
 * @returns {void}
 */
export function updateSettingsLanguageSelector(currentLang) {
  /** @const {HTMLSelectElement | null} */
  const languageSelectPopup = document.getElementById("language-select-popup");
  if (languageSelectPopup) languageSelectPopup.value = currentLang;
}

// --- Task Details Popup ---
/**
 * Opens the task details popup and populates fields for a given task ID.
 * @param {number} taskId
 * @returns {Promise<void>}
 */
export async function openTaskDetails(taskId) {
  // Clear pending undos for *other* tasks immediately
  clearTimeout(deleteTimeoutId);
  if (lastDeletedTaskData?.id && lastDeletedTaskData.id !== taskId) {
    await db.deleteTask(lastDeletedTaskData.id);
    /** @const {HTMLElement | null} */
    const otherTaskElement = document.querySelector(
      `.event[data-task-id="${lastDeletedTaskData.id}"]`,
    );
    if (otherTaskElement) otherTaskElement.remove();
    lastDeletedTaskData = null;
  }
  clearTimeout(recurrenceTimeoutId);
  if (
    recurrenceTimeoutId &&
    lastClearedRecurrence?.taskId &&
    lastClearedRecurrence.taskId !== taskId
  ) {
    if (lastClearedRecurrence?.taskId) {
      await db.updateTask(lastClearedRecurrence.taskId, {
        recurrence_rule: "",
        recurrence_interval: 1,
      });
    }
    lastClearedRecurrence = null;
  }
  deleteTimeoutId = null;
  recurrenceTimeoutId = null;
  recurrenceOpenedForNonRecurring = false;

  currentTaskBeingViewed = taskId;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";

  try {
    /** @const {db.Task | undefined} */
    const task = await db.fetchTaskDetails(taskId);
    if (!task) {
      showSnackbar("errorTaskNotFound", true);
      currentTaskBeingViewed = null;
      return;
    }
    /** @const {number} */
    const taskIdForListener = taskId;
    /** @const {boolean} */
    const isCompleted = task.completed === 1;

    // Title Input
    /** @const {HTMLInputElement | null} */
    const oldTitleInput = document.getElementById("task-details-title");
    if (oldTitleInput) {
      /** @const {HTMLInputElement} */
      const newTitleInput = oldTitleInput.cloneNode(true);
      newTitleInput.value = task.title;
      oldTitleInput.parentNode.replaceChild(newTitleInput, oldTitleInput);
      newTitleInput.addEventListener("blur", async () => {
        if (currentTaskBeingViewed !== taskIdForListener) return;
        /** @const {string} */
        const newTitle = newTitleInput.value.trim();
        if (newTitle !== task.title && newTitle !== "") {
          try {
            await db.updateTask(taskIdForListener, { title: newTitle });
            tasks.reRenderTaskElement(taskIdForListener);
            updateFavicon(todayTasks.filter((t) => t.completed === 0).length);
          } catch (error) {
            showSnackbar("failedToSaveTitle", true);
            newTitleInput.value = task.title;
          }
        } else if (newTitle === "") newTitleInput.value = task.title;
      });
      newTitleInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") newTitleInput.blur();
      });
    }

    // Date Picker Input
    if (taskDetailsDateInput) {
      if (task.due_date) {
        /** @const {Date} */
        const dueDateUTC = utils.parseDateUTC(task.due_date);
        datePickerCurrentDate = dueDateUTC;
        taskDetailsDateInput.dataset.selectedDate = task.due_date;
        taskDetailsDateInput.textContent = dueDateUTC.toLocaleDateString(
          lang,
          utils.datePickerFormatOptions,
        );
      } else {
        datePickerCurrentDate = new Date();
        taskDetailsDateInput.dataset.selectedDate = "";
        taskDetailsDateInput.textContent =
          translations[lang]?.pickADate || "Pick a date";
      }
    }
    /** @const {HTMLElement | null} */
    const datePickerResetButton = document.getElementById(
      "date-picker-reset-date",
    );
    if (datePickerResetButton)
      datePickerResetButton.style.display = task.due_date
        ? "inline-block"
        : "none";

    // Recurrence Section
    /** @const {string} */
    const currentRule = task.recurrence_rule || "";
    if (recurrencePeriodSelect)
      recurrencePeriodSelect.value = currentRule || "daily";
    if (recurrenceIntervalInput)
      recurrenceIntervalInput.value =
        task.recurrence_interval > 0 ? String(task.recurrence_interval) : 1;
    if (recurringTaskDetailsBtn)
      recurringTaskDetailsBtn.style.display = task.due_date
        ? "inline-block"
        : "none";
    if (recurrenceSettingsContainer)
      recurrenceSettingsContainer.style.display = "none";
    updateRecurrenceUI(currentRule && !!task.due_date ? currentRule : "");

    // Chain View Button
    if (viewRecurringChainBtn) {
      if (currentChainButtonHandler) {
        viewRecurringChainBtn.removeEventListener(
          "click",
          currentChainButtonHandler,
        );
        currentChainButtonHandler = null;
      }
      /** @const {boolean} */
      const shouldShowChainButton =
        task.recurrence_rule &&
        (task.previous_task_id != null || task.next_task_id != null);
      if (shouldShowChainButton) {
        viewRecurringChainBtn.style.display = "inline-block";
        currentChainButtonHandler = () =>
          openRecurringChainPopup(taskIdForListener);
        viewRecurringChainBtn.addEventListener(
          "click",
          currentChainButtonHandler,
        );
      } else {
        viewRecurringChainBtn.style.display = "none";
      }
    }

    // Description Section
    /** @const {string} */
    const descriptionText = task.description || "";
    if (taskDescriptionTextarea)
      taskDescriptionTextarea.value = descriptionText;
    if (taskDescriptionRendered) {
      try {
        taskDescriptionRendered.innerHTML = marked.parse(descriptionText);
      } catch (e) {}
    }
    isDescriptionRenderedMode = descriptionText.trim() !== "";
    if (taskDescriptionRendered)
      taskDescriptionRendered.style.display = isDescriptionRenderedMode
        ? "block"
        : "none";
    if (taskDescriptionTextarea)
      taskDescriptionTextarea.style.display = isDescriptionRenderedMode
        ? "none"
        : "block";
    if (toggleDescriptionModeBtn)
      toggleDescriptionModeBtn.classList.toggle(
        "rendered-mode",
        isDescriptionRenderedMode,
      );
    if (descriptionModeIcon)
      descriptionModeIcon.className = isDescriptionRenderedMode
        ? "fas fa-pen"
        : "fas fa-book-open";

    // Color Swatches
    document.querySelectorAll(".color-swatch").forEach((swatch) => {
      swatch.classList.remove("selected-color");
      // Clone to remove old listeners
      /** @const {HTMLElement} */
      const clonedSwatch = swatch.cloneNode(true);
      swatch.parentNode.replaceChild(clonedSwatch, swatch);
      clonedSwatch.addEventListener("click", handleColorSwatchClick);
    });
    /** @const {string} */
    const initialColor = task.color || "no-color";
    /** @const {HTMLElement | null} */
    const swatchToSelect = document.querySelector(
      `.color-swatch[data-color="${initialColor}"]`,
    );
    if (swatchToSelect) swatchToSelect.classList.add("selected-color");

    // Action Buttons State
    updateMarkAsDoneButton(isCompleted);
    if (copyTaskLinkBtn) copyTaskLinkBtn.onclick = handleCopyTaskLinkClick;

    // Show Popup & Adjust UI
    if (taskDetailsPopupOverlay) taskDetailsPopupOverlay.style.display = "flex";
    requestAnimationFrame(adjustTextareaHeight);
    /** @const {HTMLElement | null} */
    const titleInputForFocus = document.getElementById("task-details-title");
    if (titleInputForFocus) titleInputForFocus.focus();
    updateRecurrencePreview();
  } catch (error) {
    // Clean up chain button on error
    if (viewRecurringChainBtn) {
      viewRecurringChainBtn.style.display = "none";
      if (currentChainButtonHandler) {
        viewRecurringChainBtn.removeEventListener(
          "click",
          currentChainButtonHandler,
        );
        currentChainButtonHandler = null;
      }
    }
    console.error(`Error opening task details:`, error);
    showSnackbar("errorLoadingTaskDetails", true);
    currentTaskBeingViewed = null;
  }
}

/**
 * Handles color swatch click events, updates task color in DB and UI.
 * @param {MouseEvent} event
 * @returns {Promise<void>}
 */
async function handleColorSwatchClick(event) {
  /** @const {HTMLElement | null} */
  const swatch = event.target.closest(".color-swatch");
  if (!currentTaskBeingViewed || !swatch || !swatch.matches(".color-swatch"))
    return;
  /** @const {string} */
  const selectedColor = swatch.dataset.color;
  /** @const {HTMLElement | null} */
  const currentColorSwatch = document.querySelector(
    ".color-swatch.selected-color",
  );
  if (swatch === currentColorSwatch) return;

  if (currentColorSwatch) currentColorSwatch.classList.remove("selected-color");
  swatch.classList.add("selected-color");
  /** @const {string} */
  const colorToSave = selectedColor === "no-color" ? "" : selectedColor;
  /** @const {HTMLElement | null} */
  const taskElement = document.querySelector(
    `.event[data-task-id="${currentTaskBeingViewed}"]`,
  );

  // Optimistic UI update
  if (taskElement) {
    taskElement.dataset.taskColor = colorToSave;
    taskElement.style.backgroundColor = getTaskBackgroundColor(
      colorToSave || null,
    );
  }
  /** @const {db.Task[]} */
  const updatedTodayTasks = todayTasks.map((t) =>
    t.id === currentTaskBeingViewed ? { ...t, color: colorToSave } : t,
  );
  setTodayTasks(updatedTodayTasks);

  try {
    await db.updateTask(currentTaskBeingViewed, { color: colorToSave });
  } catch (error) {
    showSnackbar("failedToSaveColor", true);
    // Revert UI on error
    swatch.classList.remove("selected-color");
    /** @type {string} */
    let originalColor = "";
    if (currentColorSwatch) {
      currentColorSwatch.classList.add("selected-color");
      originalColor =
        currentColorSwatch.dataset.color === "no-color"
          ? ""
          : currentColorSwatch.dataset.color;
    }
    if (taskElement) {
      taskElement.dataset.taskColor = originalColor;
      taskElement.style.backgroundColor = getTaskBackgroundColor(
        originalColor || null,
      );
    }
    setTodayTasks(
      todayTasks.map((t) =>
        t.id === currentTaskBeingViewed ? { ...t, color: originalColor } : t,
      ),
    );
  }
}

/**
 * Handles copying the task link to the clipboard.
 * @returns {Promise<void>}
 */
async function handleCopyTaskLinkClick() {
  if (!currentTaskBeingViewed) return;
  /** @const {string} */
  const taskLink = `${window.location.origin}/#task/${currentTaskBeingViewed}`;
  /** @type {boolean} */
  let success = false;

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    window.isSecureContext
  ) {
    try {
      await navigator.clipboard.writeText(taskLink);
      success = true;
    } catch (err) {}
  } else {
    // Fallback
    /** @const {HTMLTextAreaElement} */
    const textArea = document.createElement("textarea");
    textArea.value = taskLink;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "-9999px";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, textArea.value.length);
    try {
      success = document.execCommand("copy");
    } catch (err) {}
    document.body.removeChild(textArea);
    if (window.getSelection) window.getSelection().removeAllRanges();
    else if (document.selection) document.selection.empty();
  }

  if (success) {
    showSnackbar("taskLinkCopied");
    if (copyTaskLinkBtn) {
      copyTaskLinkBtn.classList.add("spinning");
      setTimeout(() => {
        if (copyTaskLinkBtn) copyTaskLinkBtn.classList.remove("spinning");
      }, 1000);
    }
  } else showSnackbar("taskLinkCopyFailed", true);
}

/**
 * Closes the task details popup.
 * @returns {void}
 */
export function closeTaskDetailsPopup() {
  if (recurrenceOpenedForNonRecurring && currentTaskBeingViewed) {
    /** @const {string | undefined} */
    const ruleInUI = recurrencePeriodSelect?.value;
    /** @const {boolean} */
    const controlsVisible = recurrenceControls?.style.display === "flex";
    if (controlsVisible && ruleInUI) saveRecurrenceSettings();
  }
  recurrenceOpenedForNonRecurring = false;

  if (taskDetailsPopupOverlay) taskDetailsPopupOverlay.style.display = "none";
  if (datePickerContainer) datePickerContainer.style.display = "none";
  datePickerVisible = false;
  currentTaskBeingViewed = null;
  closeRecurringChainPopup();

  // Clean up chain button listener
  if (viewRecurringChainBtn && currentChainButtonHandler) {
    viewRecurringChainBtn.removeEventListener(
      "click",
      currentChainButtonHandler,
    );
    currentChainButtonHandler = null;
  }
  if (viewRecurringChainBtn) {
    viewRecurringChainBtn.style.display = "none";
  }

  /** @const {HTMLInputElement | null} */
  const titleInput = document.getElementById("task-details-title");
  if (titleInput) titleInput.value = "";
  if (taskDescriptionTextarea) taskDescriptionTextarea.value = "";
  if (taskDescriptionRendered) taskDescriptionRendered.innerHTML = "";
  clearRecurrenceInPopup(false);
  if (recurrenceSettingsContainer)
    recurrenceSettingsContainer.style.display = "none";
}

/**
 * Adjusts the height of the description textarea or rendered markdown viewer
 * based on available space within the popup.
 * @returns {void}
 */
export function adjustTextareaHeight() {
  if (taskDetailsPopupOverlay?.style.display !== "flex") return;
  /** @const {HTMLElement | null} */
  const popupContent = taskDetailsPopup?.querySelector(
    ".task-details-popup-content",
  );
  /** @const {HTMLElement | null} */
  const titleInputEl = document.getElementById("task-details-title");
  if (!popupContent || !taskDetailsPopup || !titleInputEl) return;

  /** @const {number} */
  const popupHeight = taskDetailsPopup.offsetHeight;
  /** @const {number} */
  const topBarHeight =
    taskDetailsPopup.querySelector(".task-popup-top-bar")?.offsetHeight || 0;
  /** @const {number} */
  const titleHeight = titleInputEl.offsetHeight || 0;
  /** @const {number} */
  const titleMarginBottom =
    parseInt(getComputedStyle(titleInputEl).marginBottom) || 0;
  /** @const {number} */
  const recurrenceHeight =
    recurrenceSettingsContainer?.style.display === "none"
      ? 0
      : recurrenceSettingsContainer?.offsetHeight || 0;
  /** @const {number} */
  const descLabelHeight =
    popupContent.querySelector('label[for="task-description-textarea"]')
      ?.offsetHeight || 0;
  /** @const {number} */
  const paddingAndMargins = 40;

  /** @const {number} */
  const availableHeight = Math.max(
    0,
    popupHeight -
      topBarHeight -
      titleHeight -
      titleMarginBottom -
      recurrenceHeight -
      descLabelHeight -
      paddingAndMargins,
  );
  /** @const {HTMLElement | null} */
  const elementToAdjust = isDescriptionRenderedMode
    ? taskDescriptionRendered
    : taskDescriptionTextarea;
  /** @const {HTMLElement | null} */
  const otherElement = isDescriptionRenderedMode
    ? taskDescriptionTextarea
    : taskDescriptionRendered;
  if (!elementToAdjust || !otherElement) return;

  otherElement.style.display = "none";
  elementToAdjust.style.display = "block";
  elementToAdjust.style.height = "auto";
  /** @const {number} */
  const scrollHeight = elementToAdjust.scrollHeight;
  /** @const {number} */
  const minHeight = 50;

  /** @type {number} */
  let targetHeight = Math.max(
    minHeight,
    Math.min(scrollHeight, availableHeight),
  );
  elementToAdjust.style.height = `${targetHeight}px`;
  popupContent.style.overflowY =
    scrollHeight > availableHeight ? "auto" : "hidden";
}

/**
 * Updates the 'Mark as Done/Undone' button text and icon.
 * @param {boolean} isCompleted
 * @returns {void}
 */
export function updateMarkAsDoneButton(isCompleted) {
  if (!markDoneTaskDetailsBtn) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  markDoneTaskDetailsBtn.dataset.completed = isCompleted ? "1" : "0";
  markDoneTaskDetailsBtn.innerHTML = isCompleted
    ? '<i class="fas fa-check-circle"></i>'
    : '<i class="far fa-check-circle"></i>';
  markDoneTaskDetailsBtn.title = isCompleted
    ? translations[lang]?.markAsUndone || "Mark as undone"
    : translations[lang]?.markAsDone || "Mark as done";
}

/**
 * Updates the UI elements of a task element to reflect completion status.
 * @param {HTMLElement} taskElement
 * @param {number} completed - 1 or 0.
 * @returns {void}
 */
export function handleTaskCompletionUI(taskElement, completed) {
  /** @const {HTMLElement | null} */
  const doneButton = taskElement.querySelector(".done-button");
  /** @const {HTMLElement | null} */
  const undoneButton = taskElement.querySelector(".undone-button");
  /** @const {HTMLElement | null} */
  const taskTextElement = taskElement.querySelector(".task-text");
  if (taskTextElement)
    taskTextElement.classList.toggle("completed", completed === 1);
  if (doneButton)
    doneButton.style.display = completed === 1 ? "none" : "inline-block";
  if (undoneButton)
    undoneButton.style.display = completed === 0 ? "none" : "inline-block";
  if (currentTaskBeingViewed === parseInt(taskElement.dataset.taskId, 10))
    updateMarkAsDoneButton(completed === 1);
  if (navigator.vibrate && completed === 1) {
    navigator.vibrate(50);
  }
}

// --- Event Listeners Setup ---
function setupActionListeners() {
  if (taskDescriptionTextarea) {
    taskDescriptionTextarea.addEventListener("blur", async (event) => {
      /** @const {number | null} */
      const taskIdForUpdate = currentTaskBeingViewed;
      if (!taskIdForUpdate) return;
      try {
        /** @const {db.Task | undefined} */
        const task = await db.fetchTaskDetails(taskIdForUpdate);
        if (!task) return;
        /** @const {string} */
        const oldDescription = task.description || "";
        /** @const {string} */
        const newDescription = event.target.value;
        if (
          newDescription !== oldDescription &&
          currentTaskBeingViewed === taskIdForUpdate
        ) {
          await db.updateTask(taskIdForUpdate, {
            description: newDescription,
          });
          tasks.reRenderTaskElement(taskIdForUpdate);
          if (isDescriptionRenderedMode && taskDescriptionRendered) {
            try {
              taskDescriptionRendered.innerHTML = marked.parse(newDescription);
            } catch (e) {}
          }
        }
        if (currentTaskBeingViewed === taskIdForUpdate) adjustTextareaHeight();
      } catch (error) {
        showSnackbar("Failed to save description.", true);
      }
    });
  }

  if (closeTaskDetailsPopupBtn)
    closeTaskDetailsPopupBtn.addEventListener("click", closeTaskDetailsPopup);

  // Delete Task Button with Undo
  if (deleteTaskDetailsBtn) {
    deleteTaskDetailsBtn.addEventListener("click", async () => {
      /** @const {number | null} */
      const taskIdToDelete = currentTaskBeingViewed;
      if (!taskIdToDelete) return;
      /** @const {HTMLElement | null} */
      const taskElement = document.querySelector(
        `.event[data-task-id="${taskIdToDelete}"]`,
      );
      try {
        lastDeletedTaskData = await db.fetchTaskDetails(taskIdToDelete);
        if (!lastDeletedTaskData) throw new Error("Failed fetch for undo.");
        
        if (taskElement) taskElement.style.display = "none";
        
        // Update todayTasks state immediately for favicon
        /** @const {number} */
        const taskIndex = todayTasks.findIndex((t) => t.id === taskIdToDelete);
        if (taskIndex > -1)
          setTodayTasks([
            ...todayTasks.slice(0, taskIndex),
            ...todayTasks.slice(taskIndex + 1),
          ]);
        updateTabTitle();
        if (currentTaskBeingViewed === taskIdToDelete) closeTaskDetailsPopup();

        showUndoSnackbar(
          "taskDeleted",
          // Undo Callback (Restore)
          async () => {
            lastDeletedTaskData = null;
            deleteTimeoutId = null;
            if (taskElement) taskElement.style.display = "";
            await refreshTodayTasks();
            updateTabTitle();
            showSnackbar("taskRestored");
          },
          // Timeout Action (Permanent Delete)
          async () => {
            /** @const {number | null | undefined} */
            const idToDelete = lastDeletedTaskData?.id;
            lastDeletedTaskData = null;
            deleteTimeoutId = null;
            if (idToDelete) {
              /** @const {boolean} */
              const deleted = await db.deleteTask(idToDelete);
              if (!deleted) {
                 showSnackbar("failedToDeleteTask", true);
                 await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
                 await calendar.renderInbox();
              }
            }
          },
        );
      } catch (error) {
        showSnackbar("failedToDeleteTask", true);
        lastDeletedTaskData = null;
        deleteTimeoutId = null;
        if (taskElement) taskElement.style.display = "";
        updateTabTitle();
      }
    });
  }

  // Description Mode Toggle
  if (toggleDescriptionModeBtn) {
    toggleDescriptionModeBtn.addEventListener("click", () => {
      isDescriptionRenderedMode = !isDescriptionRenderedMode;
      /** @const {string} */
      const displayRendered = isDescriptionRenderedMode ? "block" : "none";
      /** @const {string} */
      const displayTextArea = isDescriptionRenderedMode ? "none" : "block";
      if (taskDescriptionRendered)
        taskDescriptionRendered.style.display = displayRendered;
      if (taskDescriptionTextarea)
        taskDescriptionTextarea.style.display = displayTextArea;
      if (toggleDescriptionModeBtn)
        toggleDescriptionModeBtn.classList.toggle(
          "rendered-mode",
          isDescriptionRenderedMode,
        );
      if (descriptionModeIcon)
        descriptionModeIcon.className = isDescriptionRenderedMode
          ? "fas fa-pen"
          : "fas fa-book-open";
      if (!isDescriptionRenderedMode && taskDescriptionTextarea)
        taskDescriptionTextarea.focus();
      else if (taskDescriptionRendered && taskDescriptionTextarea) {
        try {
          taskDescriptionRendered.innerHTML = marked.parse(
            taskDescriptionTextarea.value,
          );
        } catch (e) {}
      }
      adjustTextareaHeight();
    });
  }

  // Date Picker Setup
  if (taskDetailsDateInput) {
    taskDetailsDateInput.addEventListener("click", (event) => {
      event.stopPropagation();
      datePickerVisible = !datePickerVisible;
      if (datePickerContainer)
        datePickerContainer.style.display = datePickerVisible
          ? "block"
          : "none";
      /** @const {string | undefined} */
      const currentSelectedDate = taskDetailsDateInput?.dataset.selectedDate;
      /** @const {HTMLElement | null} */
      const datePickerResetButton = document.getElementById(
        "date-picker-reset-date",
      );
      if (datePickerResetButton)
        datePickerResetButton.style.display = currentSelectedDate
          ? "inline-block"
          : "none";
      if (datePickerVisible) {
        renderDatePicker();
        positionDatePicker();
      }
    });
  }
  if (datePickerContainer)
    datePickerContainer.addEventListener("click", (e) => e.stopPropagation());
  document
    .getElementById("date-picker-prev-month")
    ?.addEventListener("click", () => {
      datePickerCurrentDate.setUTCMonth(
        datePickerCurrentDate.getUTCMonth() - 1,
      );
      renderDatePicker();
    });
  document
    .getElementById("date-picker-next-month")
    ?.addEventListener("click", () => {
      datePickerCurrentDate.setUTCMonth(
        datePickerCurrentDate.getUTCMonth() + 1,
      );
      renderDatePicker();
    });
  document
    .getElementById("date-picker-reset-date")
    ?.addEventListener("click", async () => {
      if (taskDetailsDateInput) {
        taskDetailsDateInput.dataset.selectedDate = "";
        /** @const {string} */
        const lang = localStorage.getItem("language") || "ru";
        taskDetailsDateInput.textContent =
          translations[lang]?.pickADate || "Pick a date";
      }
      /** @const {HTMLElement | null} */
      const resetButton = document.getElementById("date-picker-reset-date");
      if (resetButton) resetButton.style.display = "none";
      if (datePickerContainer) datePickerContainer.style.display = "none";
      datePickerVisible = false;
      recurrenceOpenedForNonRecurring = false;
      await updateTaskDueDate(null);
    });

  // Recurrence Listeners
  if (
    recurringTaskDetailsBtn &&
    recurrenceSettingsContainer &&
    recurrenceControls &&
    recurrencePeriodSelect &&
    taskDetailsDateInput
  ) {
    recurringTaskDetailsBtn.addEventListener("click", async () => {
      /** @const {boolean} */
      const hasDate = !!taskDetailsDateInput.dataset.selectedDate;
      if (!hasDate) {
        clearRecurrenceInPopup(false);
        if (recurrenceSettingsContainer)
          recurrenceSettingsContainer.style.display = "none";
        if (recurringTaskDetailsBtn)
          recurringTaskDetailsBtn.classList.remove("active");
        adjustTextareaHeight();
        return;
      }
      /** @const {boolean} */
      const isCurrentlyActive =
        recurringTaskDetailsBtn.classList.contains("active");
      /** @const {boolean} */
      const isContainerVisible =
        recurrenceSettingsContainer.style.display !== "none";

      if (isCurrentlyActive && isContainerVisible) {
        // Trying to Disable Recurrence
        if (
          recurrenceTimeoutId &&
          lastClearedRecurrence?.taskId === currentTaskBeingViewed
        ) {
          clearTimeout(recurrenceTimeoutId);
          if (snackbar)
            snackbar.className = snackbar.className.replace("show", "");
          restoreRecurrenceUI();
          showSnackbar("recurrenceRestored");
          return;
        }
        /** @const {number | null} */
        const taskIdForRecurrence = currentTaskBeingViewed;
        recurrenceOpenedForNonRecurring = false;
        try {
          /** @const {db.Task | undefined} */
          const taskData = await db.fetchTaskDetails(currentTaskBeingViewed);
          if (!taskData) return;
          lastClearedRecurrence = {
            rule: taskData.recurrence_rule || "",
            interval: taskData.recurrence_interval || 1,
            taskId: taskIdForRecurrence,
          };
          if (!lastClearedRecurrence.rule) {
            recurrenceSettingsContainer.style.display = "none";
            recurringTaskDetailsBtn.classList.remove("active");
            adjustTextareaHeight();
            lastClearedRecurrence = null;
            return;
          }
          clearRecurrenceInPopup(false);
          recurrenceSettingsContainer.style.display = "none";
          adjustTextareaHeight();
          showUndoSnackbar(
            "recurrenceRemoved",
            restoreRecurrenceUI,
            async () => {
              // Timeout Action (Permanent Clear)
              /** @const {number | null | undefined} */
              const idToClear = lastClearedRecurrence?.taskId;
              lastClearedRecurrence = null;
              recurrenceTimeoutId = null;
              if (idToClear) {
                try {
                  await db.updateTask(idToClear, {
                    recurrence_rule: "",
                    recurrence_interval: 1,
                  });
                } catch (error) {
                  showSnackbar("failedToRemoveRecurrence", true);
                  adjustTextareaHeight();
                }
              }
            },
          );
        } catch (error) {
          showSnackbar("failedToRemoveRecurrence", true);
          lastClearedRecurrence = null;
          recurrenceTimeoutId = null;
        }
      } else {
        // Trying to Enable/Show Recurrence Settings
        recurrenceSettingsContainer.style.display = !isContainerVisible
          ? "block"
          : "none";
        if (!isContainerVisible) {
          /** @const {db.Task | undefined} */
          const task = await db.fetchTaskDetails(currentTaskBeingViewed);
          if (!task?.recurrence_rule) {
            recurrenceOpenedForNonRecurring = true;
            if (recurrencePeriodSelect) recurrencePeriodSelect.value = "daily";
            if (recurrenceIntervalInput) recurrenceIntervalInput.value = 1;
          } else recurrenceOpenedForNonRecurring = false;
          updateRecurrenceUI(recurrencePeriodSelect?.value || "");
          updateRecurrencePreview();
        } else {
          if (recurringTaskDetailsBtn)
            recurringTaskDetailsBtn.classList.remove("active");
          recurrenceOpenedForNonRecurring = false;
        }
        adjustTextareaHeight();
      }
    });
  }
  if (recurrencePeriodSelect)
    recurrencePeriodSelect.addEventListener("change", saveRecurrenceSettings);
  if (recurrenceIntervalInput) {
    recurrenceIntervalInput.addEventListener("input", updateRecurrencePreview);
    recurrenceIntervalInput.addEventListener("change", () => {
      /** @type {number} */
      let interval = parseInt(recurrenceIntervalInput.value, 10);
      if (isNaN(interval) || interval < 1) recurrenceIntervalInput.value = 1;
      if (recurrencePeriodSelect && !recurrencePeriodSelect.value)
        recurrencePeriodSelect.value = "daily";
      recurrenceOpenedForNonRecurring = false;
      saveRecurrenceSettings();
    });
  }

  // Data Import/Export
  if (exportDbBtn) exportDbBtn.addEventListener("click", handleExportDb);
  if (importDbInput) importDbInput.addEventListener("change", handleImportDb);
}
setupActionListeners();

// --- Search ---

/**
 * Handles input change in the search field (debounced).
 * @returns {void}
 */
export function handleSearchInput() {
  clearTimeout(searchTimeout);
  /** @const {string} */
  const query = headerSearchInput ? headerSearchInput.value.trim() : "";
  
  if (query !== searchQuery) {
    searchQuery = query;
    currentPage = 1;
    if (searchResultsDropdown) {
        searchResultsDropdown.scrollTop = 0;
        searchResultsDropdown.innerHTML = "";
    }
    removeScrollListener();
    searchTimeout = setTimeout(performSearch, 300);
  } else if (query === "" && isSearchDropdownOpen) {
      // If cleared, hide results
      closeSearchDropdown();
  } else if (query !== "" && !isSearchDropdownOpen) {
      // If focused back on with text, reopen
      performSearch();
  }
}

/**
 * Performs the fuzzy search query.
 * @returns {Promise<void>}
 */
async function performSearch() {
  if (searchResultsDropdown) {
    searchResultsDropdown.innerHTML = "";
    searchResultsDropdown.classList.remove("scrollable");
  }
  
  if (searchQuery.length === 0) {
    closeSearchDropdown();
    return;
  }
  
  // Show dropdown immediately
  isSearchDropdownOpen = true;
  if(searchResultsDropdown) searchResultsDropdown.style.display = "block";

  loadingMoreResults = false;
  await displayFuzzySearchResults(searchQuery, currentPage, tasksPerPage);
}

/**
 * Displays results in the search popup, handling pagination.
 * @param {string} query
 * @param {number} page
 * @param {number} pageSize
 * @returns {Promise<void>}
 */
async function displayFuzzySearchResults(query, page, pageSize) {
  if (!searchResultsDropdown || (loadingMoreResults && page > 1)) return;
  loadingMoreResults = true;
  try {
    /** @const {db.Task[]} */
    const tasksResult = await db.searchTasks(query, pageSize, page);
    /** @const {db.Task[]} */
    const tasks = Array.isArray(tasksResult) ? tasksResult : [];
    loadingMoreResults = false;

    if (tasks.length === 0 && page === 1) {
      /** @const {HTMLElement} */
      const li = document.createElement("li");
      /** @const {string} */
      const lang = localStorage.getItem("language") || "ru";
      li.textContent =
        translations[lang]?.noResults || "No matching tasks found.";
      li.style.cursor = "default";
      searchResultsDropdown.appendChild(li);
      removeScrollListener();
    } else if (tasks.length > 0) {
      /** @const {string} */
      const lang = localStorage.getItem("language") || "ru";
      tasks.forEach((task) => {
        /** @const {HTMLElement} */
        const listItem = document.createElement("li");
        listItem.dataset.taskId = String(task.id);
        if (task.completed === 1) listItem.classList.add("completed-task");
        /** @type {string} */
        let taskDateStr = translations[lang]?.newTaskSomeday || "Inbox Task";
        if (task.due_date) {
          try {
            taskDateStr = utils
              .parseDateUTC(task.due_date)
              .toLocaleDateString(lang, {
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              });
          } catch (e) {
            taskDateStr = task.due_date;
          }
        } else taskDateStr = "Inbox";
        listItem.innerHTML = `<div class="fuzzy-search-task-title">${task.title || "Untitled Task"}</div><div class="fuzzy-search-task-date">${taskDateStr}</div>`;
        /** @const {HTMLElement | null} */
        const titleEl = listItem.querySelector(".fuzzy-search-task-title");
        if (titleEl && task.color && task.color !== "no-color")
          titleEl.classList.add(`${task.color}-title-highlight`);

        listItem.addEventListener("click", async () => {
          closeSearchDropdown();
          try {
            /** @const {db.Task | undefined} */
            const freshTask = await db.fetchTaskDetails(task.id);
            if (!freshTask) {
              showSnackbar("errorTaskNotFound", true);
              return;
            }
            if (freshTask.due_date) {
              /** @const {Date} */
              const startOfWeek = utils.getStartOfWeek(
                utils.parseDateUTC(freshTask.due_date),
              );
              setDisplayedWeekStartDate(startOfWeek);
              await calendar.renderWeekCalendar(startOfWeek);
              highlightTask(task.id);
            } else {
              await calendar.renderInbox();
              document
                .getElementById("inbox")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              highlightTask(task.id);
            }
          } catch (error) {
            showSnackbar("errorLoadingTaskDetails", true);
          }
        });
        searchResultsDropdown.appendChild(listItem);
      });
      if (tasks.length < pageSize) removeScrollListener();
      else setupScrollListener();
      requestAnimationFrame(() => {
        if (searchResultsDropdown)
            searchResultsDropdown.classList.toggle(
            "scrollable",
            searchResultsDropdown.scrollHeight >
                searchResultsDropdown.clientHeight,
          );
      });
    } else removeScrollListener();
  } catch (error) {
    console.error("Error fetching/displaying search results:", error);
    loadingMoreResults = false;
  }
}

/**
 * Sets up the infinite scroll listener for search results.
 * @returns {void}
 */
function setupScrollListener() {
  if (!scrollEventListener && searchResultsDropdown) {
    scrollEventListener = async () => {
      if (
        isSearchDropdownOpen &&
        !loadingMoreResults &&
        searchResultsDropdown &&
        searchResultsDropdown.scrollTop +
        searchResultsDropdown.clientHeight >=
        searchResultsDropdown.scrollHeight - 50
      ) {
        currentPage++;
        await displayFuzzySearchResults(searchQuery, currentPage, tasksPerPage);
      }
    };
    searchResultsDropdown.addEventListener("scroll", scrollEventListener);
  }
}

/**
 * Removes the infinite scroll listener.
 * @returns {void}
 */
function removeScrollListener() {
  if (scrollEventListener && searchResultsDropdown) {
    searchResultsDropdown.removeEventListener("scroll", scrollEventListener);
    scrollEventListener = null;
  }
}

// --- Highlighting ---
/**
 * Highlights a task element briefly after navigation.
 * @param {number} taskId
 * @returns {void}
 */
export function highlightTask(taskId) {
  setTimeout(() => {
    /** @const {HTMLElement | null} */
    const taskElement = document.querySelector(
      `.event[data-task-id="${taskId}"]`,
    );
    if (taskElement) {
      document
        .querySelectorAll(".highlighted-task")
        .forEach((el) => el.classList.remove("highlighted-task"));
      taskElement.classList.add("highlighted-task");
      taskElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
        inline: "nearest",
      });
      setTimeout(() => {
        if (taskElement) taskElement.classList.remove("highlighted-task");
      }, 3000);
    }
  }, 100);
}

// --- Date Picker ---
/**
 * Renders the calendar grid inside the date picker container.
 * @returns {void}
 */
function renderDatePicker() {
  if (!datePickerGrid || !datePickerMonthYear) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string[]} */
  const monthNames =
    translations[lang]?.monthNames || translations.en.monthNames;
  /** @const {string[]} */
  const dayNamesShort =
    translations[lang]?.dayNamesShort || translations.en.dayNamesShort;
  /** @const {number} */
  const year = datePickerCurrentDate.getUTCFullYear();
  /** @const {number} */
  const month = datePickerCurrentDate.getUTCMonth();
  /** @const {Date} */
  const firstDayOfMonth = new Date(Date.UTC(year, month, 1));
  /** @const {number} */
  const startDayOfWeek = (firstDayOfMonth.getUTCDay() + 6) % 7; // 0=Mon
  /** @const {number} */
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  datePickerMonthYear.textContent = `${monthNames[month]} ${year}`;
  datePickerGrid.innerHTML = "";

  dayNamesShort.forEach((name) => {
    /** @const {HTMLElement} */
    const el = document.createElement("div");
    el.classList.add("date-picker-day-name");
    el.textContent = name;
    datePickerGrid.appendChild(el);
  });
  for (let i = 0; i < startDayOfWeek; i++) {
    /** @const {HTMLElement} */
    const emptyCell = document.createElement("div");
    emptyCell.classList.add("date-picker-day", "inactive");
    datePickerGrid.appendChild(emptyCell);
  }

  /** @const {Date} */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  /** @const {string | undefined} */
  const selectedDateStr = taskDetailsDateInput?.dataset.selectedDate;

  for (let day = 1; day <= daysInMonth; day++) {
    /** @const {HTMLElement} */
    const dayElement = document.createElement("div");
    dayElement.classList.add("date-picker-day");
    dayElement.textContent = String(day);
    /** @const {Date} */
    const dayDateUTC = new Date(Date.UTC(year, month, day));
    /** @const {string} */
    const dayDateStr = dayDateUTC.toISOString().split("T")[0];
    /** @const {Date} */
    const dayDateLocal = new Date(year, month, day);
    if (selectedDateStr === dayDateStr) dayElement.classList.add("selected");
    if (dayDateLocal.toDateString() === today.toDateString())
      dayElement.classList.add("current-day");
    dayElement.addEventListener("click", () => handleDateSelection(dayDateStr));
    datePickerGrid.appendChild(dayElement);
  }
  /** @const {number} */
  const totalCells = startDayOfWeek + daysInMonth;
  /** @const {number} */
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 0; i < remainingCells; i++) {
    /** @const {HTMLElement} */
    const emptyCell = document.createElement("div");
    emptyCell.classList.add("date-picker-day", "inactive");
    datePickerGrid.appendChild(emptyCell);
  }
}

/**
 * Positions the date picker relative to the date input field.
 * @returns {void}
 */
function positionDatePicker() {
  if (!datePickerVisible || !datePickerContainer || !taskDetailsDateInput)
    return;
  /** @const {DOMRect} */
  const inputRect = taskDetailsDateInput.getBoundingClientRect();
  datePickerContainer.style.position = "fixed";
  datePickerContainer.style.top = `${inputRect.bottom + 2}px`;
  /** @type {number} */
  let leftPos = inputRect.left;
  /** @const {number} */
  const pickerWidth = datePickerContainer.offsetWidth;
  if (leftPos + pickerWidth > window.innerWidth - 10)
    leftPos = window.innerWidth - pickerWidth - 10;
  datePickerContainer.style.left = `${Math.max(10, leftPos)}px`;
}

/**
 * Handles selection of a date in the picker, updates UI and calls the backend update.
 * @param {string} dateString - Date in "YYYY-MM-DD" format.
 * @returns {Promise<void>}
 */
async function handleDateSelection(dateString) {
  if (!taskDetailsDateInput || !datePickerContainer) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {Date} */
  const selectedDateUTC = utils.parseDateUTC(dateString);
  taskDetailsDateInput.dataset.selectedDate = dateString;
  taskDetailsDateInput.textContent = selectedDateUTC.toLocaleDateString(
    lang,
    utils.datePickerFormatOptions,
  );
  datePickerContainer.style.display = "none";
  /** @const {HTMLElement | null} */
  const datePickerResetButton = document.getElementById(
    "date-picker-reset-date",
  );
  if (datePickerResetButton)
    datePickerResetButton.style.display = "inline-block";
  datePickerVisible = false;
  await updateTaskDueDate(dateString);
}

/**
 * Updates the due date of the currently viewed task in the DB and refreshes the calendar.
 * @param {string | null} newDate - New date in "YYYY-MM-DD" or null.
 * @returns {Promise<void>}
 */
async function updateTaskDueDate(newDate) {
  if (!currentTaskBeingViewed) return;
  /** @const {HTMLElement | null} */
  const taskElement = document.querySelector(
    `.event[data-task-id="${currentTaskBeingViewed}"]`,
  );
  /** @const {string | undefined} */
  const oldDueDate = taskElement?.dataset.dueDate;
  /** @const {string} */
  const todayStr = new Date().toLocaleDateString("en-CA");
  /** @const {boolean} */
  const wasTodayTask = oldDueDate === todayStr;
  /** @const {boolean} */
  const isNowTodayTask = newDate === todayStr;
  /** @type {Partial<db.Task>} */
  const updates = { due_date: newDate };
  /** @type {boolean} */
  let recurrenceCleared = false;

  if (newDate && recurringTaskDetailsBtn)
    recurringTaskDetailsBtn.style.display = "inline-block";
  if (newDate === null) {
    updates.recurrence_rule = "";
    updates.recurrence_interval = 1;
    recurrenceCleared = true;
    if (recurringTaskDetailsBtn) recurringTaskDetailsBtn.style.display = "none";
    if (recurrenceSettingsContainer)
      recurrenceSettingsContainer.style.display = "none";
    if (viewRecurringChainBtn) viewRecurringChainBtn.style.display = "none";
    recurrenceOpenedForNonRecurring = false;
  }

  try {
    await db.updateTask(currentTaskBeingViewed, updates);

    // Update todayTasks state
    /** @const {number} */
    const taskIndex = todayTasks.findIndex(
      (t) => t.id === currentTaskBeingViewed,
    );
    if (wasTodayTask && !isNowTodayTask && taskIndex > -1) {
      setTodayTasks([
        ...todayTasks.slice(0, taskIndex),
        ...todayTasks.slice(taskIndex + 1),
      ]);
    } else if (
      (!wasTodayTask && isNowTodayTask && taskIndex === -1) ||
      taskIndex > -1
    ) {
      /** @const {db.Task | undefined} */
      const taskDetails = await db.fetchTaskDetails(currentTaskBeingViewed);
      if (taskDetails) {
        /** @const {db.Task[]} */
        const newTasks = [...todayTasks];
        if (taskIndex > -1) newTasks[taskIndex] = taskDetails;
        else newTasks.push(taskDetails);
        setTodayTasks(newTasks);
      }
    }
    updateTabTitle();

    // Refresh calendar view
    /** @type {Date} */
    let weekToRender = newDate
      ? utils.getStartOfWeek(utils.parseDateUTC(newDate))
      : getDisplayedWeekStartDate();
    /** @const {string} */
    const currentWeekStartStr = getDisplayedWeekStartDate()
      .toISOString()
      .slice(0, 10);
    /** @const {string} */
    const targetWeekStartStr = weekToRender.toISOString().slice(0, 10);
    if (currentWeekStartStr !== targetWeekStartStr)
      setDisplayedWeekStartDate(weekToRender);
    await calendar.renderWeekCalendar(weekToRender);
    if (newDate === null || taskElement?.closest("#inbox"))
      await calendar.renderInbox();

    // Update recurrence UI in popup
    if (recurrenceCleared) clearRecurrenceInPopup();
    else {
      /** @const {db.Task | undefined} */
      const taskData = await db.fetchTaskDetails(currentTaskBeingViewed);
      updateRecurrenceUI(taskData?.recurrence_rule || "");
    }
    updateRecurrencePreview();
    requestAnimationFrame(() => highlightTask(currentTaskBeingViewed));
  } catch (error) {
    console.error("Error updating task due date:", error);
    showSnackbar("failedToUpdateDate", true);
  }
}

// --- Checkbox Helper ---
/**
 * Toggles the visual 'checked' state class on the custom checkbox container.
 * @param {HTMLInputElement} checkbox
 * @returns {void}
 */
export function handleCheckboxChange(checkbox) {
  if (!checkbox) return;
  /** @const {HTMLElement | null} */
  const label = checkbox.closest("label.styled-checkbox");
  if (label) label.classList.toggle("checked", checkbox.checked);
}

// --- Language Setting ---
/**
 * Sets the language preference and refreshes UI components.
 * @param {string} lang
 * @returns {void}
 */
export function setLanguage(lang) {
  localStorage.setItem("language", lang);
  updateTranslations(lang);
  calendar.renderWeekCalendar(getDisplayedWeekStartDate());
  calendar.renderInbox();
  if (datePickerVisible) renderDatePicker();
  if (currentTaskBeingViewed) {
    updateRecurrencePreview();
    /** @const {string | undefined} */
    const currentSelectedDate = taskDetailsDateInput?.dataset.selectedDate;
    if (taskDetailsDateInput) {
      if (currentSelectedDate)
        taskDetailsDateInput.textContent = utils
          .parseDateUTC(currentSelectedDate)
          .toLocaleDateString(lang, utils.datePickerFormatOptions);
      else
        taskDetailsDateInput.textContent =
          translations[lang]?.pickADate || "Pick a date";
    }
  }
}

// --- Today Tasks & Title/Favicon ---
/**
 * Fetches the latest list of tasks due today and updates the global state.
 * @returns {Promise<void>}
 */
export async function refreshTodayTasks() {
  try {
    setTodayTasks(await db.fetchTodayTasks());
  } catch (error) {
    setTodayTasks([]);
  }
}

/**
 * Updates the browser tab title and favicon based on today's uncompleted task count.
 * @returns {Promise<void>}
 */
export async function updateTabTitle() {
  await refreshTodayTasks();
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  document.title = translations[lang]?.baseTitleName || "Week Planner";
  updateFavicon(todayTasks.filter((task) => task.completed === 0).length);
}

/**
 * Converts an SVG string to a data URL.
 * @param {string} svgString
 * @returns {string}
 */
function svgToDataUrl(svgString) {
  /** @const {string} */
  const encoded = encodeURIComponent(svgString)
    .replace(/'/g, "%27")
    .replace(/"/g, "%22");
  return `data:image/svg+xml,${encoded}`;
}

/**
 * Updates the browser favicon based on the number of incomplete tasks today.
 * @param {number} taskCount
 * @returns {void}
 */
function updateFavicon(taskCount) {
  /** @const {string} */
  const themeSetting = localStorage.getItem("theme") || "auto";
  /** @const {boolean} */
  const isDark =
    themeSetting === "dark" ||
    (themeSetting === "auto" &&
      window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  /** @const {Object<string, string>} */
  const colors = isDark ? faviconColors.dark : faviconColors.light;
  /** @type {string} */
  let symbol = "✓";
  /** @type {string} */
  let fillColor = colors.empty;
  
  if (taskCount > 0 && taskCount < 10) {
    symbol = taskCount.toString();
    fillColor = colors.singleDigit;
  } else if (taskCount >= 10) {
    symbol = "∞";
    fillColor = colors.multiple;
  }
  /** @const {string} */
  const svg = faviconBaseSvg
    .replace("{SYMBOL}", symbol)
    .replace("{FILL_COLOR}", fillColor);
  /** @type {HTMLLinkElement | null} */
  let link = document.querySelector("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = svgToDataUrl(svg);
}

// --- Misc UI Updates ---
/**
 * Updates the color of custom select arrows to match the theme.
 * @returns {void}
 */
export function updateSelectArrowsColor() {
  try {
    /** @const {CSSStyleDeclaration} */
    const bodyStyle = getComputedStyle(document.body);
    /** @const {string} */
    const dimTextColor = bodyStyle.getPropertyValue("--dim-text-color").trim();
    if (!dimTextColor) return;
    /** @const {string} */
    const encodedColor = encodeURIComponent(dimTextColor);
    /** @const {string} */
    const arrowSvg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='${encodedColor}'%3E%3Cpath d='M8 11L3 6h10z'/%3E%3C/svg%3E")`;
    document
      .querySelectorAll(".themed-select, .language-select")
      .forEach((select) => {
        select.style.backgroundImage = arrowSvg;
      });
  } catch (error) {
    console.error("Error updating select arrow color:", error);
  }
}

// --- Data Import/Export Handlers ---
/**
 * Triggers the database export process.
 * @returns {void}
 */
function handleExportDb() {
  db.exportData().catch(err => {
      console.error("Export failed", err);
      showSnackbar("Export failed.", true);
  });
}

/**
 * Handles the database import process from a file input.
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function handleImportDb(event) {
  /** @const {File | undefined} */
  const file = event.target.files?.[0];
  if (!file) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";

  if (!file.name.toLowerCase().endsWith(".json")) {
    showSnackbar("errorImportFile", true);
    if (importDbInput) importDbInput.value = "";
    return;
  }
  
  showSnackbar("importingDatabase");

  /** @const {FileReader} */
  const reader = new FileReader();
  reader.onload = async (e) => {
      try {
          /** @const {string} */
          const jsonData = String(e.target.result);
          await db.importData(jsonData);
          showSnackbar("importSuccess");
          setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
          console.error("Import failed:", error);
          /** @const {string} */
          const errorMessage = translations[lang]?.importError || "Import failed";
          showSnackbar(`${errorMessage}: ${error.message}`, true);
      } finally {
          if (importDbInput) importDbInput.value = "";
      }
  };
  reader.onerror = () => {
      showSnackbar("Error reading file.", true);
      if (importDbInput) importDbInput.value = "";
  };
  reader.readAsText(file);
}

// --- Recurrence UI Functions ---
/**
 * Restores the recurrence settings UI state after an undo action.
 * @returns {void}
 */
function restoreRecurrenceUI() {
  if (
    lastClearedRecurrence?.rule &&
    currentTaskBeingViewed === lastClearedRecurrence.taskId
  ) {
    if (recurrencePeriodSelect)
      recurrencePeriodSelect.value = lastClearedRecurrence.rule;
    if (recurrenceIntervalInput)
      recurrenceIntervalInput.value = String(lastClearedRecurrence.interval);
    if (
      recurrenceSettingsContainer &&
      taskDetailsDateInput?.dataset.selectedDate
    ) {
      recurrenceSettingsContainer.style.display = "block";
    }
    updateRecurrenceUI(lastClearedRecurrence.rule);
    updateRecurrencePreview();
    adjustTextareaHeight();
  }
  lastClearedRecurrence = null;
}

/**
 * Updates the visibility of recurrence controls and the active state of the button.
 * @param {string} currentRule - The current recurrence rule.
 * @returns {void}
 */
function updateRecurrenceUI(currentRule) {
  /** @const {boolean} */
  const hasRule = !!currentRule;
  /** @const {boolean} */
  const hasDate = !!taskDetailsDateInput?.dataset.selectedDate;
  if (recurrenceControls)
    recurrenceControls.style.display = hasRule && hasDate ? "flex" : "none";
  if (recurringTaskDetailsBtn)
    recurringTaskDetailsBtn.classList.toggle("active", hasRule && hasDate);
  if (recurrenceSettingsContainer) {
    /** @const {boolean} */
    const isManuallyOpened =
      recurrenceSettingsContainer.style.display === "block";
    recurrenceSettingsContainer.style.display =
      hasDate && (hasRule || isManuallyOpened) ? "block" : "none";
  }
  requestAnimationFrame(adjustTextareaHeight);
}

/**
 * Calculates and updates the text showing the next recurrence date.
 * @returns {void}
 */
function updateRecurrencePreview() {
  if (
    !currentTaskBeingViewed ||
    !recurrencePreview ||
    !recurrencePeriodSelect ||
    !recurrenceIntervalInput
  ) {
    if (recurrencePreview) recurrencePreview.textContent = "";
    return;
  }
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string} */
  const period = recurrencePeriodSelect.value;
  /** @const {number} */
  const interval = parseInt(recurrenceIntervalInput.value, 10);
  /** @const {string | undefined} */
  const currentDueDateStr = taskDetailsDateInput?.dataset.selectedDate;

  if (
    recurrenceSettingsContainer?.style.display === "none" ||
    !period ||
    isNaN(interval) ||
    interval < 1 ||
    !currentDueDateStr
  ) {
    recurrencePreview.textContent = "";
    return;
  }
  try {
    /** @const {Date} */
    const currentDueDateUTC = utils.parseDateUTC(currentDueDateStr);
    if (isNaN(currentDueDateUTC.getTime())) {
      recurrencePreview.textContent = "";
      return;
    }
    /** @const {Date | null} */
    let nextDate = utils.calculateNextRecurrence(
      currentDueDateUTC,
      period,
      interval,
    );
    if (!nextDate) {
      recurrencePreview.textContent = "";
      return;
    }
    recurrencePreview.textContent = `${translations[lang]?.recurrenceNext || "Next:"} ${nextDate.toLocaleDateString(lang, utils.datePickerFormatOptions)}`;
  } catch (e) {
    console.error("Error calculating next recurrence:", e);
    recurrencePreview.textContent = "";
  }
}

/**
 * Saves the recurrence settings (rule and interval) to the database.
 * @returns {Promise<void>}
 */
async function saveRecurrenceSettings() {
  if (
    !currentTaskBeingViewed ||
    !recurrencePeriodSelect ||
    !recurrenceIntervalInput
  )
    return;
  /** @const {string} */
  const selectedRule = recurrencePeriodSelect.value;
  /** @type {number} */
  let selectedInterval = parseInt(recurrenceIntervalInput.value, 10);
  if (isNaN(selectedInterval) || selectedInterval < 1) {
    selectedInterval = 1;
    recurrenceIntervalInput.value = String(1);
  }
  /** @const {string} */
  const ruleToSend = selectedRule || "";
  /** @const {number} */
  const intervalToSend = ruleToSend ? selectedInterval : 1;

  try {
    await db.updateTask(currentTaskBeingViewed, {
      recurrence_rule: ruleToSend,
      recurrence_interval: intervalToSend,
    });
    if (recurringTaskDetailsBtn && taskDetailsDateInput?.dataset.selectedDate)
      recurringTaskDetailsBtn.style.display = "inline-block";
    /** @const {db.Task | undefined} */
    const task = await db.fetchTaskDetails(currentTaskBeingViewed);
    if (viewRecurringChainBtn && task) {
      viewRecurringChainBtn.style.display =
        task.recurrence_rule &&
        (task.previous_task_id != null || task.next_task_id != null)
          ? "inline-block"
          : "none";
    }
    updateRecurrenceUI(ruleToSend);
    updateRecurrencePreview();
  } catch (error) {
    showSnackbar("failedToSaveRecurrence", true);
  }
}

/**
 * Clears recurrence settings fields in the popup UI.
 * @param {boolean} [shouldAdjustHeight=true]
 * @returns {void}
 */
export function clearRecurrenceInPopup(shouldAdjustHeight = true) {
  if (recurrencePeriodSelect) recurrencePeriodSelect.value = "";
  if (recurrenceIntervalInput) recurrenceIntervalInput.value = String(1);
  if (recurrenceControls) recurrenceControls.style.display = "none";
  if (recurringTaskDetailsBtn)
    recurringTaskDetailsBtn.classList.remove("active");
  if (recurrencePreview) recurrencePreview.textContent = "";
  if (viewRecurringChainBtn) viewRecurringChainBtn.style.display = "none";
  if (shouldAdjustHeight) requestAnimationFrame(adjustTextareaHeight);
}

// --- Recurring Chain Popup Functions ---
/**
 * Opens the popup displaying the full recurring task chain.
 * @param {number} taskId
 * @returns {Promise<void>}
 */
async function openRecurringChainPopup(taskId) {
  if (!recurringChainPopupOverlay || !taskId) return;
  currentChainTaskId = taskId;
  currentChainPage = 1;
  await fetchAndRenderChainPage();
  recurringChainPopupOverlay.style.display = "flex";
}

/**
 * Closes the recurring task chain popup.
 * @returns {void}
 */
function closeRecurringChainPopup() {
  if (recurringChainPopupOverlay)
    recurringChainPopupOverlay.style.display = "none";
  if (recurringChainList) recurringChainList.innerHTML = "";
  currentChainTaskId = null;
  if (recurringChainPageInfo) recurringChainPageInfo.textContent = "";
  if (recurringChainPrevPageBtn) recurringChainPrevPageBtn.disabled = true;
  if (recurringChainNextPageBtn) recurringChainNextPageBtn.disabled = true;
}

/**
 * Fetches and renders the current page of the recurring chain.
 * @returns {Promise<void>}
 */
async function fetchAndRenderChainPage() {
  if (!currentChainTaskId || !recurringChainList) return;
  /** @const {db.RecurringChainResult | null} */
  const result = await db.fetchRecurringChain(
    currentChainTaskId,
    currentChainPage,
  );
  if (!result || !result.tasks || !result.pagination) {
    showSnackbar("failedToLoadChain", true);
    /** @const {string} */
    const failMessage = translations[localStorage.getItem("language") || "ru"]?.failedToLoadChain || "Failed to load.";
    recurringChainList.innerHTML = `<li>${failMessage}</li>`;
    if (recurringChainPrevPageBtn) recurringChainPrevPageBtn.disabled = true;
    if (recurringChainNextPageBtn) recurringChainNextPageBtn.disabled = true;
    if (recurringChainPageInfo) recurringChainPageInfo.textContent = "";
    return;
  }
  renderRecurringChainList(result.tasks);
  updateRecurringChainPagination(result.pagination);
}

/**
 * Renders the list items for the recurring chain page.
 * @param {db.Task[]} chainTasks
 * @returns {void}
 */
function renderRecurringChainList(chainTasks) {
  if (!recurringChainList) return;
  recurringChainList.innerHTML = "";
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  if (chainTasks.length === 0) {
    /** @const {string} */
    const noResults = translations[lang]?.noResults || "No tasks found.";
    recurringChainList.innerHTML = `<li>${noResults}</li>`;
    return;
  }

  chainTasks.forEach((task) => {
    /** @const {HTMLElement} */
    const li = document.createElement("li");
    li.dataset.taskId = String(task.id);
    if (task.completed === 1) li.classList.add("completed");

    /** @const {HTMLSpanElement} */
    const titleSpan = document.createElement("span");
    titleSpan.classList.add("chain-item-title", "fuzzy-search-task-title");
    titleSpan.textContent = task.title || "Untitled";
    if (task.color && task.color !== "no-color") {
      titleSpan.classList.add(`${task.color}-title-highlight`);
    }
    if (task.completed === 1) {
      titleSpan.classList.add("completed-task");
    }

    /** @const {HTMLSpanElement} */
    const dateSpan = document.createElement("span");
    dateSpan.classList.add("chain-item-date", "fuzzy-search-task-date");
    if (task.due_date) {
      try {
        dateSpan.textContent = utils
          .parseDateUTC(task.due_date)
          .toLocaleDateString(lang, {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
      } catch (e) {
        dateSpan.textContent = task.due_date;
      }
    } else dateSpan.textContent = "Inbox";

    li.appendChild(titleSpan);
    li.appendChild(dateSpan);
    if (task.id === currentTaskBeingViewed)
      li.classList.add("current-chain-item");
    if (task.completed === 1) li.classList.add("completed");
    li.addEventListener("click", () => {
      closeRecurringChainPopup();
      closeTaskDetailsPopup();
      (async () => {
        try {
          /** @const {db.Task | undefined} */
          const freshTask = await db.fetchTaskDetails(task.id);
          if (!freshTask) {
            showSnackbar("errorTaskNotFound", true);
            return;
          }
          if (freshTask.due_date) {
            /** @const {Date} */
            const startOfWeek = utils.getStartOfWeek(
              utils.parseDateUTC(freshTask.due_date),
            );
            setDisplayedWeekStartDate(startOfWeek);
            await calendar.renderWeekCalendar(startOfWeek);
            highlightTask(task.id);
          } else {
            await calendar.renderInbox();
            document
              .getElementById("inbox")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
            highlightTask(task.id);
          }
        } catch (error) {
          showSnackbar("errorLoadingTaskDetails", true);
        }
      })();
    });
    recurringChainList.appendChild(li);
  });
}

/**
 * Updates the pagination controls and info text for the recurring chain popup.
 * @param {db.RecurringChainResult['pagination']} pagination
 * @returns {void}
 */
function updateRecurringChainPagination(pagination) {
  if (
    !recurringChainPrevPageBtn ||
    !recurringChainNextPageBtn ||
    !recurringChainPageInfo
  )
    return;
  currentChainPage = pagination.currentPage;
  currentChainTotalPages = pagination.totalPages;

  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string} */
  const template =
    translations[lang]?.chainPageInfo || "Page {currentPage} of {totalPages}";
  recurringChainPageInfo.textContent = template
    .replace("{currentPage}", String(currentChainPage))
    .replace("{totalPages}", String(currentChainTotalPages));

  recurringChainPrevPageBtn.disabled = currentChainPage <= 1;
  recurringChainNextPageBtn.disabled =
    currentChainPage >= currentChainTotalPages;
}

/**
 * Sets up listeners for chain popup navigation.
 * @returns {void}
 */
function setupChainPopupListeners() {
  if (closeRecurringChainPopupBtn)
    closeRecurringChainPopupBtn.addEventListener(
      "click",
      closeRecurringChainPopup,
    );
  if (recurringChainPrevPageBtn) {
    recurringChainPrevPageBtn.addEventListener("click", () => {
      if (currentChainPage > 1) {
        currentChainPage--;
        fetchAndRenderChainPage();
      }
    });
  }
  if (recurringChainNextPageBtn) {
    recurringChainNextPageBtn.addEventListener("click", () => {
      if (currentChainPage < currentChainTotalPages) {
        currentChainPage++;
        fetchAndRenderChainPage();
      }
    });
  }
}
setupChainPopupListeners();
