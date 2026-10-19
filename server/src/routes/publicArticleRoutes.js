import express from "express";
import {
  getPublicArticles,
  getFeaturedArticles,
  getBreakingNews,
  getArticlesByCategorySlug,
  getPublicArticleBySlug,
  getPublicDesks,
  getRelatedArticles
} from "../controllers/publicArticleController.js";

const router = express.Router();
import { publicReadCache } from "../middleware/publicReadCache.js";
router.use(publicReadCache);

// Named routes first to avoid slug parameter collision
router.get("/featured", getFeaturedArticles);
router.get("/breaking", getBreakingNews);
router.get("/desks", getPublicDesks);
router.get("/categories/:slug", getArticlesByCategorySlug);

// Root public list
router.get("/", getPublicArticles);

// Dynamic article slug or ID
router.get("/:slug/related", getRelatedArticles);
router.get("/:slug", getPublicArticleBySlug);

export default router;
