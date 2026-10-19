import rateLimit from "express-rate-limit";

/**
 * Rate limiter specifically protecting admin authentication endpoints against brute force
 */
export const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 10 : 100, // 100 in dev/test, 10 in production
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: "Too many login attempts from this network. Please wait 15 minutes before trying again."
  }
});

export default { adminLoginLimiter };
