import * as utils from "./utils.js";
import { translations } from "./localization.js";
import { dayIds } from "./config.js";
import {
  getMobileSelectedDate,
  setMobileSelectedDate,
  getMobileView,
  setMobileView,
} from "./state.js";

// --- DOM Element References ---
/** @const {HTMLElement | null} */
const dayStripElement = document.getElementById("mobile-day-strip");
/** @const {HTMLElement | null} */
const toggleWeekButton = document.getElementById("toggle-week-btn");
/** @const {HTMLElement | null} */
const toggleInboxButton = document.getElementById("toggle-inbox-btn");
/** @const {HTMLElement | null} */
const calendarElement = document.querySelector(".calendar");

/**
 * Handler that moves the day view by -1/+1 days. Lives in app.js (it needs
 * the calendar renderer and week state) and is registered during setup to
 * avoid a circular import.
 * @type {((delta: number) => Promise<void>) | null}
 */
let dayNavigationHandler = null;

/** @type {boolean} */
let touchListenersAttached = false;

// Horizontal day-swipe gesture state
/** @type {number} */
let touchStartX = 0;
/** @type {number} */
let touchStartY = 0;
/** @type {boolean} */
let isSwipeCandidate = false;
/** @type {boolean} */
let isSwipeActive = false;

/**
 * Registers the previous (-1) / next (+1) day navigation handler.
 * @param {(delta: number) => Promise<void>} handler
 * @returns {void}
 */
export const setDayNavigationHandler = (handler) => {
  dayNavigationHandler = handler;
};

/**
 * Clamps the mobile selection to the currently rendered week and applies the
 * mobile day view: shows only the selected day column (or the inbox),
 * rebuilds the day strip and syncs the bottom toggle. Idempotent — safe to
 * call after every re-render.
 * @returns {void}
 */
export function applyMobileDaySelection() {
  /** @type {HTMLElement[]} */
  const dayDivs = dayIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  /** @const {string[]} */
  const renderedDates = dayDivs
    .map((dayDiv) => dayDiv.dataset.date)
    .filter(Boolean);
  if (renderedDates.length === 0) return;

  // Clamp the selection into the rendered week: today if it is displayed,
  // otherwise Monday. This also covers stale selections after re-renders.
  let selected = getMobileSelectedDate();
  if (!renderedDates.includes(selected)) {
    const todayString = new Date().toLocaleDateString("en-CA");
    selected = renderedDates.includes(todayString)
      ? todayString
      : renderedDates[0];
    setMobileSelectedDate(selected);
  }

  dayDivs.forEach((dayDiv) => {
    dayDiv.classList.toggle(
      "mobile-selected",
      dayDiv.dataset.date === selected,
    );
  });

  renderDayStrip(renderedDates, selected);

  const isInboxView = getMobileView() === "inbox";
  document.body.classList.toggle("mobile-inbox-view", isInboxView);
  toggleWeekButton?.setAttribute("aria-pressed", String(!isInboxView));
  toggleInboxButton?.setAttribute("aria-pressed", String(isInboxView));
}

/**
 * Builds the day strip chips for the rendered week.
 * @param {string[]} renderedDates - The 7 rendered dates ("YYYY-MM-DD", Mon-Sun).
 * @param {string} selectedDate - The selected date ("YYYY-MM-DD").
 * @returns {void}
 */
function renderDayStrip(renderedDates, selectedDate) {
  if (!dayStripElement) return;
  /** @const {string} */
  const lang = localStorage.getItem("language") || "ru";
  /** @const {string} */
  const todayString = new Date().toLocaleDateString("en-CA");
  dayStripElement.innerHTML = "";

  renderedDates.forEach((dateString) => {
    /** @const {Date} */
    const date = utils.parseDateUTC(dateString);
    /** @const {HTMLButtonElement} */
    const chip = document.createElement("button");
    chip.type = "button";
    chip.classList.add("day-strip-chip");
    chip.dataset.date = dateString;
    if (dateString === todayString) {
      chip.classList.add("today");
    }
    if (dateString === selectedDate) {
      chip.classList.add("selected");
      chip.setAttribute("aria-current", "date");
    }

    /** @const {HTMLElement} */
    const weekdaySpan = document.createElement("span");
    weekdaySpan.classList.add("chip-weekday");
    weekdaySpan.textContent =
      translations[lang].dayNamesShort[(date.getUTCDay() + 6) % 7];

    /** @const {HTMLElement} */
    const dateSpan = document.createElement("span");
    dateSpan.classList.add("chip-date");
    dateSpan.textContent = String(date.getUTCDate());

    chip.appendChild(weekdaySpan);
    chip.appendChild(dateSpan);
    dayStripElement.appendChild(chip);
  });
}

/**
 * Points the mobile view at a task's date (or at the inbox). Pure state
 * change: the layout is applied by the re-render that callers run right
 * after (every render ends in applyMobileDaySelection), so the selection
 * must not be clamped against the previous week here.
 * @param {string | null} dateString - The date to select ("YYYY-MM-DD"), or null for the inbox.
 * @returns {void}
 */
export function setMobileFocus(dateString) {
  if (dateString) {
    setMobileSelectedDate(dateString);
    setMobileView("week");
  } else {
    setMobileView("inbox");
  }
}

/**
 * Wires up the mobile layout: rebuilds the day view when the breakpoint is
 * crossed, handles day-strip taps, the bottom view toggle and horizontal
 * day swipes.
 * @returns {void}
 */
export function setupMobileLayout() {
  /** @const {MediaQueryList} */
  const mobileQuery = window.matchMedia("(max-width: 768px)");
  mobileQuery.addEventListener("change", handleMobileLayoutChange);
  handleMobileLayoutChange(mobileQuery);

  // Day strip: one delegated handler for all chips
  dayStripElement?.addEventListener("click", (event) => {
    /** @const {HTMLElement | null} */
    const chip = /** @type {HTMLElement | null} */ (
      event.target.closest(".day-strip-chip")
    );
    if (chip?.dataset.date) {
      setMobileSelectedDate(chip.dataset.date);
      setMobileView("week");
      applyMobileDaySelection();
    }
  });

  toggleWeekButton?.addEventListener("click", () => {
    setMobileView("week");
    applyMobileDaySelection();
    window.scrollTo({ top: 0 });
  });

  toggleInboxButton?.addEventListener("click", () => {
    setMobileView("inbox");
    applyMobileDaySelection();
    window.scrollTo({ top: 0 });
  });
}

/**
 * Attaches or detaches the day-swipe listeners when the breakpoint is
 * crossed. Classes left behind on exit are inert: all mobile CSS is scoped
 * to the media query.
 * @param {MediaQueryList | MediaQueryListEvent} query
 * @returns {void}
 */
function handleMobileLayoutChange(query) {
  if (query.matches) {
    attachSwipeListeners();
    applyMobileDaySelection();
  } else {
    detachSwipeListeners();
  }
}

/**
 * Attaches the horizontal day-swipe listeners on the calendar container.
 * @returns {void}
 */
function attachSwipeListeners() {
  if (touchListenersAttached || !calendarElement) return;
  touchListenersAttached = true;
  calendarElement.addEventListener("touchstart", handleDaySwipeStart, {
    passive: true,
  });
  calendarElement.addEventListener("touchmove", handleDaySwipeMove, {
    passive: false,
  });
  calendarElement.addEventListener("touchend", handleDaySwipeEnd);
  calendarElement.addEventListener("touchcancel", resetDaySwipe);
}

/**
 * Detaches the day-swipe listeners (called when leaving the mobile layout).
 * @returns {void}
 */
function detachSwipeListeners() {
  if (!touchListenersAttached || !calendarElement) return;
  touchListenersAttached = false;
  calendarElement.removeEventListener("touchstart", handleDaySwipeStart);
  calendarElement.removeEventListener("touchmove", handleDaySwipeMove);
  calendarElement.removeEventListener("touchend", handleDaySwipeEnd);
  calendarElement.removeEventListener("touchcancel", resetDaySwipe);
  resetDaySwipe();
}

/**
 * Resets the day-swipe gesture state.
 * @returns {void}
 */
function resetDaySwipe() {
  isSwipeCandidate = false;
  isSwipeActive = false;
}

/**
 * Starts a potential day swipe. Card swipes (task swipe-to-complete),
 * inputs and buttons are left to their own handlers.
 * @param {TouchEvent} event
 * @returns {void}
 */
function handleDaySwipeStart(event) {
  resetDaySwipe();
  if (getMobileView() !== "week") return;
  if (event.touches.length > 1) return;
  if (!(event.target instanceof Element)) return;
  if (event.target.closest(".event, input, textarea, button, select, a")) {
    return;
  }
  isSwipeCandidate = true;
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}

/**
 * Locks the gesture to the horizontal axis before claiming it, so vertical
 * scrolling stays native.
 * @param {TouchEvent} event
 * @returns {void}
 */
function handleDaySwipeMove(event) {
  if (!isSwipeCandidate) return;
  const deltaX = event.touches[0].clientX - touchStartX;
  const deltaY = event.touches[0].clientY - touchStartY;
  if (
    !isSwipeActive &&
    Math.abs(deltaX) > 12 &&
    Math.abs(deltaX) > 1.5 * Math.abs(deltaY)
  ) {
    isSwipeActive = true;
  }
  if (isSwipeActive) {
    // Prevent scrolling and the synthesized click (which would focus the
    // day's new-task input) for the rest of the gesture
    event.preventDefault();
  }
}

/**
 * Finishes a day swipe: a horizontal fling past the threshold navigates to
 * the previous/next day.
 * @param {TouchEvent} event
 * @returns {void}
 */
function handleDaySwipeEnd(event) {
  if (!isSwipeCandidate) return;
  if (isSwipeActive) {
    /** @const {number} */
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    if (Math.abs(deltaX) >= 50) {
      dayNavigationHandler?.(deltaX < 0 ? 1 : -1);
    }
  }
  resetDaySwipe();
}
