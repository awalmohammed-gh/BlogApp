import express from "express";
import crypto from "node:crypto";
import { runScheduledArticles } from "../services/articleScheduler.js";
import { asyncRoute, fail } from "../utils/http.js";
const router = express.Router();
router.post("/publish-scheduled", asyncRoute(async (req, res) => {
  const expected = process.env.SCHEDULER_SECRET;
  const actual = Buffer.from(req.get("Authorization") || "");
  const wanted = Buffer.from(`Bearer ${expected || ""}`);
  if (!expected || actual.length !== wanted.length || !crypto.timingSafeEqual(actual, wanted)) throw fail(401, "Scheduler authorization required.");
  res.json({ success: true, data: await runScheduledArticles() });
}));
export default router;
