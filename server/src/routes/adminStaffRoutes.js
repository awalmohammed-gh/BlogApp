import express from "express";
import {
  getAllStaff,
  getStaffById,
  inviteStaff,
  updateStaff,
  changeStaffRole,
  changeStaffStatus,
  reinviteStaff
} from "../controllers/adminStaffController.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  inviteStaffSchema,
  updateStaffSchema,
  changeStaffRoleSchema,
  changeStaffStatusSchema
} from "../validations/adminStaffValidation.js";

const router = express.Router();

// All staff management routes strictly require authentication and Super Admin privileges
router.use(adminAuth);
router.use(requireRole("super_admin"));

router.get("/", getAllStaff);
router.get("/:id", getStaffById);
router.post("/invite", validate(inviteStaffSchema), inviteStaff);
router.patch("/:id", validate(updateStaffSchema), updateStaff);
router.patch("/:id/role", validate(changeStaffRoleSchema), changeStaffRole);
router.patch("/:id/status", validate(changeStaffStatusSchema), changeStaffStatus);
router.post("/:id/reinvite", reinviteStaff);

export default router;
