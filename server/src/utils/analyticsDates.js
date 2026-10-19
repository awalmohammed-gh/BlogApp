/**
 * Analytics date range and timeline utilities
 */

/**
 * Returns UTC boundaries for a given timeframe or custom dates
 * @param {string} timeframe - 'today' | '7d' | '30d' | '90d' | 'custom'
 * @param {string} [customStart] - ISO string or YYYY-MM-DD
 * @param {string} [customEnd] - ISO string or YYYY-MM-DD
 * @returns {{ startDate: Date, endDate: Date, days: number }}
 */
export const resolveDateRange = (timeframe = "30d", customStart = null, customEnd = null) => {
  const now = new Date();
  let endDate = new Date(now);
  endDate.setUTCHours(23, 59, 59, 999);

  let startDate = new Date(now);
  startDate.setUTCHours(0, 0, 0, 0);

  let days = 30;

  switch (timeframe) {
    case "today":
      days = 1;
      break;

    case "7d":
      startDate.setUTCDate(startDate.getUTCDate() - 6);
      days = 7;
      break;

    case "30d":
      startDate.setUTCDate(startDate.getUTCDate() - 29);
      days = 30;
      break;

    case "90d":
      startDate.setUTCDate(startDate.getUTCDate() - 89);
      days = 90;
      break;

    case "custom":
      if (customStart) {
        startDate = new Date(customStart);
        startDate.setUTCHours(0, 0, 0, 0);
      } else {
        startDate.setUTCDate(startDate.getUTCDate() - 29);
      }
      if (customEnd) {
        endDate = new Date(customEnd);
        endDate.setUTCHours(23, 59, 59, 999);
      }
      days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      break;

    default:
      startDate.setUTCDate(startDate.getUTCDate() - 29);
      days = 30;
  }

  return { startDate, endDate, days };
};

/**
 * Formats a Date object to YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
export const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Generates an array of all continuous YYYY-MM-DD dates between start and end
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string[]}
 */
export const generateDateKeys = (startDate, endDate) => {
  const keys = [];
  const curr = new Date(startDate);
  curr.setUTCHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  while (curr <= end) {
    keys.push(formatDateKey(curr));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }

  return keys;
};

/**
 * Human-friendly date formatting for timeline labels
 * @param {string} dateKey - 'YYYY-MM-DD'
 * @returns {string} - e.g. 'Oct 17'
 */
export const formatDateLabel = (dateKey) => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC"
  });
};

export default {
  resolveDateRange,
  formatDateKey,
  generateDateKeys,
  formatDateLabel
};
