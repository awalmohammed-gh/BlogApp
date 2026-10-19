import express from "express";
import {
  verifyInvitation,
  acceptInvitation
} from "../controllers/adminInvitationController.js";
import { validate } from "../middleware/validate.js";
import { acceptInvitationSchema } from "../validations/adminStaffValidation.js";
import rateLimit from "express-rate-limit";

const router = express.Router();

// Sensitive invitation endpoints are rate-limited to prevent brute-force attacks
const invitationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again after 15 minutes."
  }
});

router.use(invitationLimiter);

router.get("/verify", verifyInvitation);
router.post("/accept", validate(acceptInvitationSchema), acceptInvitation);

export default router;
