import { Router } from "express";
import adminAuthController from "../controllers/adminAuthController.js";
import adminAuth from "../middleware/adminAuth.js";
import validate from "../middleware/validate.js";
import { adminLoginSchema } from "../validations/adminAuthValidation.js";
import { adminLoginLimiter } from "../middleware/rateLimiter.js";

const router = Router();

// Public login route with rate limiting & Zod input validation
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
