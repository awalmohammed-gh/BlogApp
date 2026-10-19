import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  archiveNotification,
  deleteNotification,
  bulkDeleteNotifications
} from "../controllers/notificationController.js";
import { validateBody } from "../middleware/validate.js";
import { bulkDeleteNotificationsSchema } from "../validations/notificationValidation.js";

const router = express.Router();

// Require authenticated administrator session on all notification endpoints
router.use(adminAuth);

// Specific routes registered before dynamic :id routes
router.get("/unread-count", getUnreadCount);
router.patch("/read-all", markAllAsRead);

// Bulk deletion (support both DELETE /bulk and POST /bulk-delete for flexible HTTP client support)
router.delete("/bulk", validateBody(bulkDeleteNotificationsSchema), bulkDeleteNotifications);
router.post("/bulk-delete", validateBody(bulkDeleteNotificationsSchema), bulkDeleteNotifications);

// Notification list query
router.get("/", getNotifications);

// Dynamic :id routes
router.get("/:id", getNotificationById);
router.patch("/:id/read", markAsRead);
router.patch("/:id/unread", markAsUnread);
router.patch("/:id/archive", archiveNotification);
router.delete("/:id", deleteNotification);

export default router;
