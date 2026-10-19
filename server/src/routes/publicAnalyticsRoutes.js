import express from "express";
import { trackEvent } from "../controllers/publicAnalyticsController.js";
import { analyticsTrackingLimiter } from "../middleware/analyticsRateLimiter.js";
import { validateBody } from "../middleware/validate.js";
import { trackEventSchema } from "../validations/analyticsValidation.js";

const router = express.Router();

// Public telemetry tracking route with rate limiting and payload validation
router.post("/track", analyticsTrackingLimiter, validateBody(trackEventSchema), trackEvent);

export default router;
