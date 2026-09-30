import * as utils from "./utils.js";

// State variables
/** @type {Date} */
let _displayedWeekStartDate = utils.getStartOfWeek(new Date());
/** @type {string} "YYYY-MM-DD" */
let _mobileSelectedDate = new Date().toLocaleDateString("en-CA");
/** @type {"week" | "inbox"} */
let _mobileView = "week";

// Getter/Setter for displayedWeekStartDate
/** @returns {Date} */
export const getDisplayedWeekStartDate = () => _displayedWeekStartDate;
/** @param {Date} newDate */
export const setDisplayedWeekStartDate = (newDate) => {
  _displayedWeekStartDate = newDate;
};

// Mobile day view state
/** @returns {string} The selected date as "YYYY-MM-DD". */
export const getMobileSelectedDate = () => _mobileSelectedDate;
/** @param {string} dateStr - The date to select as "YYYY-MM-DD". */
export const setMobileSelectedDate = (dateStr) => {
  _mobileSelectedDate = dateStr;
};
/** @returns {"week" | "inbox"} */
export const getMobileView = () => _mobileView;
/** @param {"week" | "inbox"} view */
export const setMobileView = (view) => {
  _mobileView = view === "inbox" ? "inbox" : "week";
};
/** @returns {boolean} Whether the mobile (<=768px) layout is active. */
export const isMobileLayout = () =>
  window.matchMedia("(max-width: 768px)").matches;
