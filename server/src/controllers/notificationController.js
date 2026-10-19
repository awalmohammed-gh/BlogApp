import notificationService from "../services/notificationService.js";
import Notification from "../models/Notification.js";
import {
  getNotificationsQuerySchema,
  notificationIdParamSchema
} from "../validations/notificationValidation.js";

/**
 * GET /api/admin/notifications
 * Retrieve paginated notifications for the authenticated administrator
 */
export const getNotifications = async (req, res, next) => {
  try {
    const validation = getNotificationsQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const result = await notificationService.getNotificationsForRecipient(
      req.admin._id,
      validation.data
    );

    res.status(200).json({
      success: true,
      data: result.items,
      unreadCount: result.unreadCount,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/notifications/unread-count
 * Retrieve accurate unread notifications count
 */
export const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.admin._id);
    res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/notifications/:id
 * Retrieve single notification details
 */
export const getNotificationById = async (req, res, next) => {
  try {
    const validation = notificationIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID parameter"
      });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipientId: req.admin._id
    }).populate("actorId", "name email role avatar");

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found or access denied"
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark notification as read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const validation = notificationIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID parameter"
      });
    }

    const notification = await notificationService.markAsRead(
      req.params.id,
      req.admin._id
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/notifications/:id/unread
 * Mark notification as unread
 */
export const markAsUnread = async (req, res, next) => {
  try {
    const validation = notificationIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID parameter"
      });
    }

    const notification = await notificationService.markAsUnread(
      req.params.id,
      req.admin._id
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as unread",
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/notifications/read-all
 * Mark all active unread notifications as read
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.admin._id);
    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/notifications/:id/archive
 * Soft archive notification
 */
export const archiveNotification = async (req, res, next) => {
  try {
    const validation = notificationIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID parameter"
      });
    }

    const notification = await notificationService.archiveNotification(
      req.params.id,
      req.admin._id
    );

    res.status(200).json({
      success: true,
      message: "Notification archived",
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/notifications/:id
 * Permanently delete a single notification belonging to the recipient
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const validation = notificationIdParamSchema.safeParse(req.params);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID parameter"
      });
    }

    const result = await notificationService.deleteNotification(
      req.params.id,
      req.admin._id
    );

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      deletedId: result.deletedId,
      wasUnread: result.wasUnread,
      unreadCount: result.unreadCount,
      total: result.total
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/notifications/bulk
 * POST /api/admin/notifications/bulk-delete
 * Bulk delete selected notifications belonging to the recipient
 */
export const bulkDeleteNotifications = async (req, res, next) => {
  try {
    // Body already validated by bulkDeleteNotificationsSchema (ObjectIds, deduplicated, 1-100)
    const { notificationIds } = req.body;

    const result = await notificationService.deleteBulkNotifications(
      notificationIds,
      req.admin._id
    );

    const unavailable = result.unavailableIds.length;
    res.status(200).json({
      success: true,
      message: unavailable
        ? `Deleted ${result.deletedCount} of ${result.requestedCount} notifications; ${unavailable} ${unavailable === 1 ? "was" : "were"} no longer available.`
        : `Deleted ${result.deletedCount} ${result.deletedCount === 1 ? "notification" : "notifications"}.`,
      requestedCount: result.requestedCount,
      deletedCount: result.deletedCount,
      deletedIds: result.deletedIds,
      unavailableIds: result.unavailableIds,
      unreadCount: result.unreadCount,
      total: result.total
    });
  } catch (error) {
    next(error);
  }
};
