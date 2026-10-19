import express from "express";
import {
  getProfile,
  updateProfile,
  changePassword
} from "../controllers/adminProfileController.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { validate } from "../middleware/validate.js";
import {
  updateProfileSchema,
  changePasswordSchema
} from "../validations/adminProfileValidation.js";

const router = express.Router();

// Require admin authentication for all profile endpoints
router.use(adminAuth);

router.get("/", getProfile);
router.patch("/", validate(updateProfileSchema), updateProfile);
router.patch("/password", validate(changePasswordSchema), changePassword);

export default router;
