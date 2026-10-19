import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import validate from "../middleware/validate.js";
import { PERMISSIONS } from "../config/permissions.js";
import {
  getCategories,
  getActiveCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  changeCategoryStatus
} from "../controllers/categoryController.js";
import {
  createCategorySchema,
  updateCategorySchema,
  changeCategoryStatusSchema
} from "../validations/categoryValidation.js";

const router = express.Router();

// All category routes require authenticated administrator
router.use(adminAuth);

// Active categories endpoint for article authoring (Super Admin, Editor, Author)
router.get(
  "/active",
  requirePermission(PERMISSIONS.CATEGORIES_READ),
  getActiveCategories
);

// Taxonomy Management Endpoints (Super Admin & Editor only)
router.get(
  "/",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  getCategories
);

router.get(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  getCategoryById
);

router.post(
  "/",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(createCategorySchema),
  createCategory
);

router.patch(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(updateCategorySchema),
  updateCategory
);

router.delete(
  "/:id",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  archiveCategory
);

router.post(
  "/:id/restore",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  restoreCategory
);

router.patch(
  "/:id/status",
  requirePermission(PERMISSIONS.CATEGORIES_MANAGE),
  validate(changeCategoryStatusSchema),
  changeCategoryStatus
);

export default router;
