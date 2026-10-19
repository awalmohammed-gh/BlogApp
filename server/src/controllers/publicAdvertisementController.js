import advertisementService from "../services/advertisementService.js";
import { ADVERTISEMENT_PLACEMENTS } from "../models/Advertisement.js";

/**
 * GET /api/advertisements
 * Public read-only endpoint returning eligible active advertisement for a given placement.
 */
export const getPublicAdvertisement = async (req, res, next) => {
  try {
    const placement = req.query.placement;

    if (!placement || !ADVERTISEMENT_PLACEMENTS.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: `Valid 'placement' query parameter is required. Supported: ${ADVERTISEMENT_PLACEMENTS.join(", ")}`
      });
    }

    const advertisement = await advertisementService.getPublicAdvertisement(placement);

    // Set cache headers: allow brief browser caching (e.g. 60 seconds) with revalidation
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=120");

    res.status(200).json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getPublicAdvertisement
};
