import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getPages,
  getPageByKey,
  saveDraft,
  previewDraft,
  publishPage,
  getRevisions,
  restoreRevision
} from "../controllers/adminSitePageController.js";

const router = express.Router();

// All site pages management routes require admin authentication
router.use(adminAuth);

// List pages & single page details
router.get(
  "/",
  requirePermission(PERMISSIONS.PAGES_VIEW),
  getPages
);

router.get(
  "/:pageKey",
  requirePermission(PERMISSIONS.PAGES_VIEW),
  getPageByKey
);

// Save working draft
router.patch(
  "/:pageKey/draft",
  requirePermission(PERMISSIONS.PAGES_UPDATE),
  saveDraft
);

// Preview working draft
router.get(
  "/:pageKey/preview",
  requirePermission(PERMISSIONS.PAGES_PREVIEW),
  previewDraft
);

// Publish page to live website (Super Admin only)
router.post(
  "/:pageKey/publish",
  requirePermission(PERMISSIONS.PAGES_PUBLISH),
  publishPage
);

// View revision history
router.get(
  "/:pageKey/revisions",
  requirePermission(PERMISSIONS.PAGES_VIEW),
  getRevisions
);

// Restore earlier revision to working draft (Super Admin only)
router.post(
  "/:pageKey/restore",
  requirePermission(PERMISSIONS.PAGES_RESTORE),
  restoreRevision
);

export default router;
