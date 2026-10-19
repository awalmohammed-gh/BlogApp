import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getAdvertisements,
  getAdvertisementStats,
  getAdvertisementById,
  createAdvertisement,
  updateAdvertisement,
  activateAdvertisement,
  pauseAdvertisement,
  archiveAdvertisement,
  restoreAdvertisement
} from "../controllers/adminAdvertisementController.js";

const router = express.Router();

// All advertisement management routes require admin authentication
router.use(adminAuth);

// Read campaigns and stats
router.get(
  "/stats",
  requirePermission(PERMISSIONS.ADS_VIEW),
  getAdvertisementStats
);

router.get(
  "/",
  requirePermission(PERMISSIONS.ADS_VIEW),
  getAdvertisements
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.ADS_VIEW),
  getAdvertisementById
);

// Create campaign
router.post(
  "/",
  requirePermission(PERMISSIONS.ADS_CREATE),
  createAdvertisement
);

// Update campaign
router.patch(
  "/:id",
  requirePermission(PERMISSIONS.ADS_UPDATE),
  updateAdvertisement
);

// Lifecycle actions (Super Admin management)
router.post(
  "/:id/activate",
  requirePermission(PERMISSIONS.ADS_MANAGE),
  activateAdvertisement
);

router.post(
  "/:id/pause",
  requirePermission(PERMISSIONS.ADS_MANAGE),
  pauseAdvertisement
);

router.post(
  "/:id/archive",
  requirePermission(PERMISSIONS.ADS_MANAGE),
  archiveAdvertisement
);

router.post(
  "/:id/restore",
  requirePermission(PERMISSIONS.ADS_MANAGE),
  restoreAdvertisement
);

export default router;
