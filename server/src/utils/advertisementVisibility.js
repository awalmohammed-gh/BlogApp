/**
 * Centralized Advertisement Visibility and Eligibility Engine
 * Server-side date verification ensures public endpoints only expose campaigns
 * that are currently active, within their scheduled timeline, and have valid placements.
 */

/**
 * Check if a single advertisement document is currently eligible for public display
 * @param {object} ad - Advertisement document or plain object
 * @param {Date} [now=new Date()] - Reference timestamp
 * @returns {boolean}
 */
export const isAdvertisementVisible = (ad, now = new Date()) => {
  if (!ad || typeof ad !== "object") return false;
  if (ad.status !== "active") return false;

  const currentMs = now instanceof Date ? now.getTime() : new Date(now).getTime();

  if (ad.startDate) {
    const startMs = new Date(ad.startDate).getTime();
    if (startMs > currentMs) return false;
  }

  if (ad.endDate) {
    const endMs = new Date(ad.endDate).getTime();
    if (endMs < currentMs) return false;
  }

  return true;
};

/**
 * Construct an exact MongoDB query filter for active public advertisements
 * @param {string} placement - One of ADVERTISEMENT_PLACEMENTS
 * @param {Date} [now=new Date()] - Current server time
 * @returns {object} MongoDB query filter object
 */
export const getActiveAdMongoFilter = (placement, now = new Date()) => {
  const filter = {
    placement,
    status: "active",
    $and: [
      {
        $or: [
          { startDate: null },
          { startDate: { $lte: now } }
        ]
      },
      {
        $or: [
          { endDate: null },
          { endDate: { $gte: now } }
        ]
      }
    ]
  };

  return filter;
};

export default {
  isAdvertisementVisible,
  getActiveAdMongoFilter
};
