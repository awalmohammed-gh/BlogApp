import express from "express";
import { getPublicPage } from "../controllers/publicSitePageController.js";

const router = express.Router();

// Public endpoint for querying published CMS page content
router.get("/:pageKey", getPublicPage);

export default router;
