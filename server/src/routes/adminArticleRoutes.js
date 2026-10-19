import express from "express";
import multer from "multer";
import adminAuth from "../middleware/adminAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import validate from "../middleware/validate.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getArticles,
  getArticleStats,
  getArticleById,
  createArticle,
  updateArticle,
  archiveArticle,
  restoreArticle,
  submitArticle,
  publishArticle,
  unpublishArticle,
  scheduleArticle,
  duplicateArticle,
  uploadArticleImage
} from "../controllers/adminArticleController.js";
import {
  createArticleSchema,
  updateArticleSchema
} from "../validations/articleValidation.js";
import {
  getArticleRevisions,
  getArticleRevision,
  restoreRevision
} from "../controllers/editorialController.js";

const router = express.Router();

// Configure Multer for in-memory temporary storage before ImageKit upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB maximum file size
  }
});

// All administrative article endpoints require authenticated session
router.use(adminAuth);

// Article image upload to ImageKit
router.post(
  "/images",
  upload.single("image"),
  uploadArticleImage
);

// Article list and statistics
router.get(
  "/",
  requirePermission(PERMISSIONS.ARTICLES_READ),
  getArticles
);

router.get(
  "/stats",
  requirePermission(PERMISSIONS.ARTICLES_READ),
  getArticleStats
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.ARTICLES_READ),
  getArticleById
);

// Create article
router.post(
  "/",
  requirePermission(PERMISSIONS.ARTICLES_CREATE),
  validate(createArticleSchema),
  createArticle
);

// Update article
router.patch(
  "/:id",
  validate(updateArticleSchema),
  updateArticle
);

// Soft-delete / Archive article
router.delete(
  "/:id",
  archiveArticle
);

// Restore archived article
router.post(
  "/:id/restore",
  restoreArticle
);

// Editorial state transitions
router.post(
  "/:id/submit",
  submitArticle
);

router.post(
  "/:id/publish",
  publishArticle
);

router.post(
  "/:id/unpublish",
  unpublishArticle
);

router.post(
  "/:id/schedule",
  scheduleArticle
);

router.post(
  "/:id/duplicate",
  duplicateArticle
);

// Article revision history and safe restoration
router.get(
  "/:id/revisions",
  requirePermission(PERMISSIONS.ARTICLES_READ),
  getArticleRevisions
);

router.get(
  "/:id/revisions/:revisionId",
  requirePermission(PERMISSIONS.ARTICLES_READ),
  getArticleRevision
);

router.post(
  "/:id/revisions/:revisionId/restore",
  restoreRevision
);

export default router;
