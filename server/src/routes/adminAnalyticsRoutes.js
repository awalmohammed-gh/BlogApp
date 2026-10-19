import express from "express";
import { authenticateAdmin } from "../middleware/adminAuth.js";
import {
  getOverview,
  getTraffic,
  getArticles,
  getArticleById,
  getCategories,
  getAuthors,
  getEditorial,
  getComments,
  getSources
} from "../controllers/adminAnalyticsController.js";
import { validateQuery, validateParams } from "../middleware/validate.js";
import {
  analyticsQuerySchema,
  articleAnalyticsParamsSchema
} from "../validations/analyticsValidation.js";

const router = express.Router();

// Require admin authentication for all analytics endpoints
router.use(authenticateAdmin);

// High-level overview metrics
router.get("/overview", getOverview);

// Website traffic time series
router.get("/traffic", validateQuery(analyticsQuerySchema), getTraffic);

// Article performance listing
router.get("/articles", validateQuery(analyticsQuerySchema), getArticles);

// Individual article detailed analytics
router.get("/articles/:id", validateParams(articleAnalyticsParamsSchema), getArticleById);

// News category performance
router.get("/categories", getCategories);

// Author publishing and readership performance
router.get("/authors", getAuthors);

// Editorial workflow turnaround and review queue metrics
router.get("/editorial", validateQuery(analyticsQuerySchema), getEditorial);

// Reader feedback & comment moderation metrics
router.get("/comments", validateQuery(analyticsQuerySchema), getComments);

// Traffic source attribution breakdown
router.get("/sources", validateQuery(analyticsQuerySchema), getSources);

export default router;
