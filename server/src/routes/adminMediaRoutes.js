import express from "express";
import multer from "multer";
import adminAuth from "../middleware/adminAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS } from "../config/permissions.js";
import { MEDIA_LIMITS } from "../config/media.js";
import {
  getMedia,
  getMediaStats,
  getMediaById,
  getMediaUsage,
  uploadSingleMedia,
  uploadMultipleMedia,
  updateMedia,
  archiveMedia,
  restoreMedia,
  deleteMedia
} from "../controllers/adminMediaController.js";

const router = express.Router();

// Configure Multer with strict in-memory limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MEDIA_LIMITS.maxFileSizeBytes,
    files: MEDIA_LIMITS.maxFilesPerBatch
  }
});

// All media endpoints require authenticated administrator session
router.use(adminAuth);

// 1. Static & collection routes (Must precede /:id)
router.get(
  "/",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  getMedia
);

router.get(
  "/stats",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  getMediaStats
);

router.post(
  "/upload",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  upload.single("file"),
  uploadSingleMedia
);

router.post(
  "/upload-multiple",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  upload.array("files", MEDIA_LIMITS.maxFilesPerBatch),
  uploadMultipleMedia
);

// 2. Parameterized routes
router.get(
  "/:id",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  getMediaById
);

router.get(
  "/:id/usage",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  getMediaUsage
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  updateMedia
);

router.post(
  "/:id/archive",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  archiveMedia
);

router.post(
  "/:id/restore",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  restoreMedia
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.MEDIA_MANAGE),
  deleteMedia
);

export default router;
