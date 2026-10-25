import { Router } from "express";
import adminAuthController from "../controllers/adminAuthController.js";
import adminAuth from "../middleware/adminAuth.js";
import validate from "../middleware/validate.js";
import {
  adminLoginSchema,
  adminSetupSchema,
  verifyOtpSchema,
  resendOtpSchema
} from "../validations/adminAuthValidation.js";
import { adminLoginLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Check Single-Admin Setup Status
router.get("/status", adminAuthController.getStatus);

// Step 1: Initial Admin Account Creation & Send OTP (Strict 1-Admin Lock)
router.post(
  "/setup",
  adminLoginLimiter,
  validate(adminSetupSchema),
  adminAuthController.setup
);

// Step 2: Verify 6-Digit OTP & Permanently Lock Registration
router.post(
  "/verify-otp",
  adminLoginLimiter,
  validate(verifyOtpSchema),
  adminAuthController.verifyOtp
);

// Resend OTP code via Brevo SMTP
router.post(
  "/resend-otp",
  adminLoginLimiter,
  validate(resendOtpSchema),
  adminAuthController.resendOtp
);

// Public login route for verified Single-Admin
router.post(
  "/login",
  adminLoginLimiter,
  validate(adminLoginSchema),
  adminAuthController.login
);

// Protected session check route
router.get("/me", adminAuth, adminAuthController.getMe);

// Logout route (clears HTTP-only cookie)
router.post("/logout", adminAuthController.logout);

export default router;
