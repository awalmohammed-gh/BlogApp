import { resolveVisitorSession } from "../utils/visitorTracking.js";
import { recordTelemetryEvent } from "../services/viewTrackingService.js";

/**
 * Public Analytics Controller
 * Handles privacy-conscious readership and page view ingestion
 */

/**
 * POST /api/analytics/track
 * Ingests an eligible readership or page-view telemetry event
 */
export const trackEvent = async (req, res, next) => {
  try {
    const { visitorKey, sessionKey, isNewSession } = resolveVisitorSession(req, res);

    const {
      eventType,
      pageKey,
      articleSlug,
      articleId,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign
    } = req.body;

    const result = await recordTelemetryEvent({
      eventType,
      pageKey,
      articleSlug,
      articleId,
      referrer: referrer || req.headers.referer || "",
      utmSource,
      utmMedium,
      utmCampaign,
      visitorKey,
      sessionKey,
      isNewSession
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export default {
  trackEvent
};
