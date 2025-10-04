/**
 * Gets the start of the week (Monday) for a given date.
 * @param {Date} date - The input date.
 * @returns {Date} - The Date object set to the start of the Monday of that week (00:00:00 UTC).
 */
export function getStartOfWeek(date) {
  /** @const {Date} */
  const newDate = new Date(date);
  /** @const {number} */
  const day = newDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // Calculate the difference to get to the previous Monday.
  // We use day === 0 ? -6 : 1 to handle Sunday (0) which should map to 6 days back.
  /** @const {number} */
  const diff = newDate.getDate() - day + (day === 0 ? -6 : 1);
  newDate.setHours(0, 0, 0, 0); // Reset time to the beginning of the day (local time, this is generally fine for calendar calculations that rely on local dates)
  newDate.setDate(diff);
  return newDate;
}

/**
 * Adds a specified number of days to a date.
 * @param {Date} date - The input date.
 * @param {number} days - The number of days to add (can be negative).
 * @returns {Date} - A new Date object with the days added.
 */
export function addDays(date, days) {
  /** @const {Date} */
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Checks if a given date falls within the current week (Monday to Sunday).
 * @param {Date} date - The date to check.
 * @returns {boolean} - True if the date is in the current week, false otherwise.
 */
export function isDateCurrentWeek(date) {
  /** @const {Date} */
  const now = new Date();
  /** @const {Date} */
  const firstDayOfQueryWeek = getStartOfWeek(new Date(date));
  /** @const {Date} */
  const firstDayOfCurrentWeek = getStartOfWeek(now);

  // Compare year, month, and date of the start of the weeks
  return (
    firstDayOfQueryWeek.getFullYear() === firstDayOfCurrentWeek.getFullYear() &&
    firstDayOfQueryWeek.getMonth() === firstDayOfCurrentWeek.getMonth() &&
    firstDayOfQueryWeek.getDate() === firstDayOfCurrentWeek.getDate()
  );
}

/**
 * Gets an array of Date objects representing the 7 days of the week (Mon-Sun) containing the given date.
 * @param {Date} date - A date within the desired week.
 * @returns {Date[]} - An array of 7 Date objects, starting from Monday.
 */
export function getWeekDates(date) {
  /** @const {Date} */
  const monday = getStartOfWeek(new Date(date));
  /** @type {Date[]} */
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(addDays(monday, i));
  }
  return dates;
}

/**
 * Parses a "YYYY-MM-DD" string into a Date object set to UTC midnight.
 * IMPORTANT: This avoids timezone issues by explicitly using UTC.
 * @param {string | null | undefined} dateString - The date string in "YYYY-MM-DD" format.
 * @returns {Date} - The Date object representing midnight UTC on that day, or Invalid Date if format is wrong.
 */
export function parseDateUTC(dateString) {
  if (
    !dateString ||
    typeof dateString !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(dateString)
  ) {
    console.warn(
      "Invalid date string format passed to parseDateUTC:",
      dateString,
    );
    return new Date(NaN);
  }
  /** @const {string[]} */
  const parts = dateString.split("-");
  // Month is 0-indexed in Date constructor, so subtract 1
  return new Date(
    Date.UTC(
      parseInt(parts[0], 10),
      parseInt(parts[1], 10) - 1,
      parseInt(parts[2], 10),
    ),
  );
}

/**
 * Formatting options for displaying dates in the UI (e.g., date picker input).
 * Uses UTC to ensure consistency regardless of user's local timezone.
 * @const {Intl.DateTimeFormatOptions}
 */
export const datePickerFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
};

/**
 * Calculates the next occurrence date based on a start date, period, and interval.
 * All calculations are done in UTC.
 * @param {Date} startDateUTC - The starting date (must be a valid Date object, preferably UTC midnight).
 * @param {string | null | undefined} period - 'daily', 'weekly', 'monthly', 'yearly'.
 * @param {number} interval - The repetition interval (e.g., every 2 weeks, must be >= 1).
 * @returns {Date|null} - The next occurrence date in UTC, or null if input is invalid.
 */
export function calculateNextRecurrence(startDateUTC, period, interval) {
  if (
    !startDateUTC ||
    isNaN(startDateUTC.getTime()) ||
    !interval ||
    interval < 1 ||
    !period
  ) {
    if (period === "") { // Treat empty string rule as null
        return null;
    }
    console.warn("Invalid input to calculateNextRecurrence:", {
      startDateUTC,
      period,
      interval,
    });
    return null;
  }

  /** @type {Date} */
  let nextDate = new Date(startDateUTC);

  switch (period) {
    case "daily":
      nextDate.setUTCDate(nextDate.getUTCDate() + interval);
      break;
    case "weekly":
      nextDate.setUTCDate(nextDate.getUTCDate() + 7 * interval);
      break;
    case "monthly":
      /** @const {number} */
      const originalDay = nextDate.getUTCDate();
      nextDate.setUTCMonth(nextDate.getUTCMonth() + interval);
      // If the day rolled over, roll it back to the last day of the target month
      if (nextDate.getUTCDate() < originalDay) {
        nextDate.setUTCDate(0);
      }
      break;
    case "yearly":
      /** @const {number} */
      const originalMonth = nextDate.getUTCMonth();
      /** @const {number} */
      const originalYearDay = nextDate.getUTCDate();
      nextDate.setUTCFullYear(nextDate.getUTCFullYear() + interval);
      // Handle leap year case for Feb 29 explicitly
      if (
        originalMonth === 1 &&
        originalYearDay === 29 &&
        nextDate.getUTCMonth() !== 1
      ) {
        nextDate.setUTCMonth(1);
        nextDate.setUTCDate(28);
      }
      break;
    default:
      console.warn("Invalid recurrence period:", period);
      return null;
  }

  // Ensure the time part remains at midnight UTC
  nextDate.setUTCHours(0, 0, 0, 0);
  return nextDate;
}
