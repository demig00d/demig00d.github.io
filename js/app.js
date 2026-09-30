import * as db from "./database.js";
import * as calendar from "./calendar.js";
import * as mobile from "./mobile.js";
import * as tasks from "./tasks.js";
import * as ui from "./ui.js";
import * as utils from "./utils.js";
import { loadLanguage, translations } from "./localization.js";
import { dayIds, TASK_COLORS, initialWrapTaskTitles } from "./config.js";
import {
  getDisplayedWeekStartDate,
  setDisplayedWeekStartDate,
  getMobileSelectedDate,
  setMobileSelectedDate,
  setMobileView,
  isMobileLayout,
} from "./state.js";

// DOM element references
/** @const {HTMLElement | null} */
const monthNameElement = document.querySelector(".month-name");
/** @const {HTMLElement | null} */
const prevWeekButton = document.getElementById("prev-week");
/** @const {HTMLElement | null} */
const nextWeekButton = document.getElementById("next-week");
/** @const {HTMLElement | null} */
const settingsBtn = document.getElementById("settings-btn");
/** @const {HTMLInputElement | null} */
const headerSearchInput = document.getElementById("header-search-input");

// State variables
/** @type {string} */
let currentTheme = localStorage.getItem("theme") || "auto";
/** @type {boolean} */
let displayFullWeekdays = localStorage.getItem("fullWeekdays") === "true";
/** @type {boolean} */
let wrapTaskTitles = localStorage.getItem("wrapTaskTitles") !== "false";
/** @type {string} */
let lastKnownDate = new Date().toLocaleDateString("en-CA");
/** @type {boolean} */
let initialTaskLinkHandled = false;
/** @type {boolean} */
let mobileNavLock = false;

if (localStorage.getItem("wrapTaskTitles") === null) {
  wrapTaskTitles = initialWrapTaskTitles;
}

/**
 * Checks for date change and runs recurring task catch-up if necessary.
 * @returns {Promise<void>}
 */
async function checkAndRefreshTasks() {
  /** @const {string} */
  const currentDate = new Date().toLocaleDateString("en-CA");
  if (currentDate !== lastKnownDate) {
    lastKnownDate = currentDate;
    // CHANGE: Call local function to check recurring tasks
    if (!(await db.checkRecurringTasks())) {
      console.error("Could not check/create recurring tasks:");
    }
    // Refresh the week view as the check might have created new tasks for today
    setDisplayedWeekStartDate(utils.getStartOfWeek(new Date()));
    await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
    await ui.refreshTodayTasks(); // This now uses ui.setTodayTasks
    ui.updateTabTitle(); // Update title/favicon
  }
}

/**
 * Picks the mobile day selection for a week-navigation step: today when the
 * target week is the current week, otherwise the same weekday ±7 days.
 * @param {Date} newWeekStart - The week being navigated to.
 * @param {number} delta - The navigation direction (-7 or +7 days).
 * @returns {string} The selected date as "YYYY-MM-DD".
 */
function getMobileTargetDate(newWeekStart, delta) {
  if (utils.isDateCurrentWeek(newWeekStart)) {
    return new Date().toLocaleDateString("en-CA");
  }
  return utils
    .addDays(utils.parseDateUTC(getMobileSelectedDate()), delta)
    .toLocaleDateString("en-CA");
}

/**
 * Moves the mobile day view to the previous (-1) or next (+1) day. Crossing
 * the week boundary re-renders the week; within a week only the selection
 * classes change (no database access).
 * @param {number} delta
 * @returns {Promise<void>}
 */
async function navigateMobileDay(delta) {
  if (mobileNavLock) return;
  /** @const {Date} */
  const nextDate = utils.addDays(
    utils.parseDateUTC(getMobileSelectedDate()),
    delta,
  );
  setMobileSelectedDate(nextDate.toLocaleDateString("en-CA"));
  /** @const {Date} */
  const newWeekStart = utils.getStartOfWeek(nextDate);
  if (newWeekStart.toDateString() !== getDisplayedWeekStartDate().toDateString()) {
    // Guard against overlapping renders on fast consecutive swipes
    mobileNavLock = true;
    try {
      setDisplayedWeekStartDate(newWeekStart);
      await calendar.renderWeekCalendar(newWeekStart);
    } finally {
      mobileNavLock = false;
    }
  } else {
    mobile.applyMobileDaySelection();
  }
}

/**
 * Initializes the application, database, and UI.
 * @returns {Promise<void>}
 */
async function initialize() {
  await db.initDB(); // CHANGE: Initialize IndexedDB first
  await loadLanguage();
  ui.updateSettingsLanguageSelector(localStorage.getItem("language") || "ru");
  ui.setTheme(currentTheme);
  requestAnimationFrame(ui.updateSelectArrowsColor);
  await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
  await calendar.renderInbox();
  ui.updateSettingsText(); // Apply translations
  setupEventListeners();

  // Set initial checkbox states and visual representation
  /** @const {HTMLInputElement | null} */
  const fullWeekdaysCheckbox = document.getElementById(
    "full-weekdays-checkbox",
  );
  /** @const {HTMLInputElement | null} */
  const wrapTitlesCheckbox = document.getElementById(
    "wrap-task-titles-checkbox",
  );
  if (fullWeekdaysCheckbox) {
    fullWeekdaysCheckbox.checked = displayFullWeekdays;
    ui.handleCheckboxChange(fullWeekdaysCheckbox);
  }
  if (wrapTitlesCheckbox) {
    wrapTitlesCheckbox.checked = wrapTaskTitles;
    ui.handleCheckboxChange(wrapTitlesCheckbox);
  }

  ui.updateTabTitle();
  await checkAndRefreshTasks(); // Initial check on load

  if (!initialTaskLinkHandled) {
    initialTaskLinkHandled = true;
    handleInitialTaskLink(); // Handle potential deep link
  }

  // Add listener for system theme changes if theme is 'auto'
  if (currentTheme === "auto") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", handleSystemThemeChange);
  }
}

/**
 * Sets up global and UI-specific event listeners.
 * @returns {void}
 */
function setupEventListeners() {
  mobile.setupMobileLayout();
  mobile.setDayNavigationHandler(navigateMobileDay);

  if (prevWeekButton) {
    prevWeekButton.addEventListener("click", async () => {
      /** @const {Date} */
      const newWeekStart = utils.addDays(getDisplayedWeekStartDate(), -7);
      if (isMobileLayout()) {
        setMobileSelectedDate(getMobileTargetDate(newWeekStart, -7));
      }
      setDisplayedWeekStartDate(newWeekStart);
      await calendar.renderWeekCalendar(newWeekStart);
      await checkAndRefreshTasks();
    });
  }
  if (nextWeekButton) {
    nextWeekButton.addEventListener("click", async () => {
      /** @const {Date} */
      const newWeekStart = utils.addDays(getDisplayedWeekStartDate(), 7);
      if (isMobileLayout()) {
        setMobileSelectedDate(getMobileTargetDate(newWeekStart, 7));
      }
      setDisplayedWeekStartDate(newWeekStart);
      await calendar.renderWeekCalendar(newWeekStart);
      await checkAndRefreshTasks();
    });
  }
  if (settingsBtn)
    settingsBtn.addEventListener("click", ui.toggleSettingsPopup);
    
  if (headerSearchInput) {
    headerSearchInput.addEventListener("input", ui.handleSearchInput);
    headerSearchInput.addEventListener("focus", ui.handleSearchInput); // Re-open dropdown on focus
  }
    
  if (monthNameElement)
    monthNameElement.addEventListener("click", handleMonthNameClick);

  document.addEventListener("keydown", handleGlobalKeydown);
  window.addEventListener("click", ui.handleGlobalClick);
  window.addEventListener("hashchange", handleHashChange);

  /** @const {HTMLSelectElement | null} */
  const themeSelect = document.getElementById("theme-select");
  if (themeSelect) {
    themeSelect.addEventListener("change", (event) => {
      /** @const {string} */
      const selectedTheme = event.target.value;
      localStorage.setItem("theme", selectedTheme);
      ui.setTheme(selectedTheme);
      
      /** @const {MediaQueryList} */
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
      if (selectedTheme === "auto") {
        mediaQuery.addEventListener("change", handleSystemThemeChange);
      }
    });
  }

  /** @const {HTMLSelectElement | null} */
  const langSelect = document.getElementById("language-select-popup");
  if (langSelect)
    langSelect.addEventListener("change", (event) =>
      ui.setLanguage(event.target.value),
    );

  /** @const {HTMLInputElement | null} */
  const fullWeekdaysCheckbox = document.getElementById(
    "full-weekdays-checkbox",
  );
  /** @const {HTMLInputElement | null} */
  const wrapTitlesCheckbox = document.getElementById(
    "wrap-task-titles-checkbox",
  );
  if (fullWeekdaysCheckbox) {
    fullWeekdaysCheckbox.addEventListener("change", handleFullWeekdaysChange);
    ui.handleCheckboxChange(fullWeekdaysCheckbox);
  }
  if (wrapTitlesCheckbox) {
    wrapTitlesCheckbox.addEventListener("change", handleWrapTaskTitlesChange);
    ui.handleCheckboxChange(wrapTitlesCheckbox);
  }

  // Task completion in task details popup
  /** @const {HTMLElement | null} */
  const markDoneBtn = document.getElementById("mark-done-task-details");
  if (markDoneBtn) {
    markDoneBtn.addEventListener("click", async () => {
      console.log(
        "Mark done button clicked. Current task ID:",
        ui.currentTaskBeingViewed,
      );
      /** @const {HTMLElement | null} */
      const button = document.getElementById("mark-done-task-details");
      /** @const {number | null} */
      const currentTaskId = ui.currentTaskBeingViewed;

      if (!currentTaskId || !button) {
        console.error("Cannot mark done: Task ID or button not available.");
        return;
      }

      /** @const {boolean} */
      const isCompleted = button.dataset.completed === "1";
      /** @const {number} */
      const newCompletedStatus = isCompleted ? 0 : 1;

      try {
        await tasks.handleTaskCompletion(
          currentTaskId,
          newCompletedStatus,
          ui.todayTasks,
          (updatedTasks) => {
            ui.setTodayTasks(updatedTasks);
            ui.updateTabTitle();
          },
        );
      } catch (error) {
        console.error("Error handling task completion from popup:", error);
        ui.showSnackbar("failedToUpdateTaskStatus", true);
      }
    });
  } else {
    console.error("Mark done button not found during setup.");
  }

  // Refresh tasks on visibility change (tab switch)
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "visible") {
      await checkAndRefreshTasks();
    }
  });
}

/**
 * Handles incoming URL hash links pointing to a specific task.
 * @returns {Promise<void>}
 */
async function handleInitialTaskLink() {
  /** @const {string} */
  const hash = window.location.hash;
  if (hash.startsWith("#task/")) {
    /** @const {string} */
    const taskId = hash.substring(6);
    try {
      // CHANGE: Use local database
      /** @const {db.Task | undefined} */
      const taskDetails = await db.fetchTaskDetails(taskId);
      if (taskDetails) {
        ui.closeAllPopups();
        if (taskDetails.due_date) {
          /** @const {Date} */
          const taskDateObj = new Date(
            Date.UTC(
              parseInt(taskDetails.due_date.split("-")[0]),
              parseInt(taskDetails.due_date.split("-")[1]) - 1,
              parseInt(taskDetails.due_date.split("-")[2]),
            ),
          );
          /** @const {Date} */
          const startOfWeek = utils.getStartOfWeek(taskDateObj);
          // On mobile, select the day containing the linked task
          mobile.setMobileFocus(taskDetails.due_date);
          setDisplayedWeekStartDate(startOfWeek);
          await calendar.renderWeekCalendar(startOfWeek);
        } else {
          // On mobile, open the inbox view for the linked task
          mobile.setMobileFocus(null);
          await calendar.renderInbox();
          document
            .getElementById("inbox")
            ?.scrollIntoView({ behavior: "smooth" });
        }
        ui.highlightTask(parseInt(taskId));
        history.pushState(
          "",
          document.title,
          window.location.pathname + window.location.search,
        );
      } else {
        console.warn(`Task with ID ${taskId} not found from hash link.`);
        history.pushState(
          "",
          document.title,
          window.location.pathname + window.location.search,
        );
      }
    } catch (error) {
      console.error("Error fetching task details from link:", error);
      history.pushState(
        "",
        document.title,
        window.location.pathname + window.location.search,
      );
    }
  }
}

/**
 * Re-evaluates the URL hash when it changes.
 * @returns {void}
 */
function handleHashChange() {
  handleInitialTaskLink();
}

/**
 * Resets the calendar view to the current week.
 * @returns {Promise<void>}
 */
async function handleMonthNameClick() {
  setMobileSelectedDate(new Date().toLocaleDateString("en-CA"));
  setMobileView("week");
  setDisplayedWeekStartDate(utils.getStartOfWeek(new Date()));
  await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
}

/**
 * Handles global keydown events (e.g., Escape to close popups).
 * @param {KeyboardEvent} event
 * @returns {void}
 */
function handleGlobalKeydown(event) {
  if (event.key === "Escape") {
    ui.closeAllPopups();
  }
}

/**
 * Handles changes in the system's preferred color scheme if the theme is set to 'auto'.
 * @param {MediaQueryListEvent} event
 * @returns {void}
 */
function handleSystemThemeChange(event) {
  if (localStorage.getItem("theme") === "auto") {
    ui.setTheme("auto");
  }
}

/**
 * Toggles displaying full weekday names and re-renders the calendar.
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function handleFullWeekdaysChange(event) {
  /** @const {HTMLInputElement} */
  const target = /** @type {HTMLInputElement} */ (event.target);
  ui.handleCheckboxChange(target);
  displayFullWeekdays = target.checked;
  localStorage.setItem("fullWeekdays", String(displayFullWeekdays));
  await calendar.renderWeekCalendar(getDisplayedWeekStartDate());
  ui.updateSettingsText();
}

/**
 * Toggles wrapping task titles and re-renders all tasks.
 * @param {Event} event
 * @returns {Promise<void>}
 */
async function handleWrapTaskTitlesChange(event) {
  /** @const {HTMLInputElement} */
  const target = /** @type {HTMLInputElement} */ (event.target);
  ui.handleCheckboxChange(target);
  wrapTaskTitles = target.checked;
  localStorage.setItem("wrapTaskTitles", String(wrapTaskTitles));
  await tasks.renderAllTasks();
}

// Start the application
document.addEventListener("DOMContentLoaded", initialize);
