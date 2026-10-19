import rateLimit from "express-rate-limit";

/**
 * Public Analytics Tracking Rate Limiter
 * Allows normal browsing activity while stopping automated inflation scripts
 */
export const analyticsTrackingLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 telemetry events per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Tracking rate limit exceeded. Please throttle telemetry requests."
  }
});

export default { analyticsTrackingLimiter };
