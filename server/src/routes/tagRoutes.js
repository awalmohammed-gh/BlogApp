import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import validate from "../middleware/validate.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getTags,
  getActiveTags,
  getTagById,
  createTag,
  updateTag,
  archiveTag,
  restoreTag,
  changeTagStatus
} from "../controllers/tagController.js";
import {
  createTagSchema,
  updateTagSchema,
  changeTagStatusSchema
} from "../validations/tagValidation.js";

const router = express.Router();

// All tag routes require authenticated administrator
router.use(adminAuth);

// Active tags endpoint for article authoring (Super Admin, Editor, Author)
router.get(
  "/active",
  requirePermission(PERMISSIONS.TAGS_READ),
  getActiveTags
);

// Tag Management Endpoints (Super Admin & Editor only)
router.get(
  "/",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  getTags
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  getTagById
);

router.post(
  "/",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  validate(createTagSchema),
  createTag
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  validate(updateTagSchema),
  updateTag
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  archiveTag
);

router.post(
  "/:id/restore",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  restoreTag
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.TAGS_MANAGE),
  validate(changeTagStatusSchema),
  changeTagStatus
);

export default router;
