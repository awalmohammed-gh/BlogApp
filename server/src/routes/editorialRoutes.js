import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import requireRole from "../middleware/requireRole.js";
import {
  getQueue,
  getStats,
  getSubmission,
  claimReview,
  releaseReview,
  assignReviewer,
  approveSubmission,
  requestChanges,
  rejectSubmission,
  getComments,
  addComment,
  getHistory
} from "../controllers/editorialController.js";

const router = express.Router();

// Require administrative authentication across all editorial endpoints
router.use(adminAuth);

// Statistics and queue overview
router.get("/stats", getStats);
router.get("/queue", getQueue);

// Single submission details
router.get("/:id", getSubmission);

// Claim and release assignment
router.post("/:id/claim", requireRole("editor", "super_admin"), claimReview);
router.post("/:id/release", requireRole("editor", "super_admin"), releaseReview);

// Manual reviewer assignment (Super Admin)
router.patch("/:id/assign", requireRole("super_admin"), assignReviewer);

// Editorial review decisions
router.post("/:id/approve", requireRole("editor", "super_admin"), approveSubmission);
router.post("/:id/request-changes", requireRole("editor", "super_admin"), requestChanges);
router.post("/:id/reject", requireRole("editor", "super_admin"), rejectSubmission);

// Editorial feedback comments thread
router.get("/:id/comments", getComments);
router.post("/:id/comments", addComment);

// Audit history
router.get("/:id/history", requireRole("editor", "super_admin"), getHistory);

export default router;
