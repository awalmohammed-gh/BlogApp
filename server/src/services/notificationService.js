import mongoose from "mongoose";
import Notification, { NOTIFICATION_TYPES } from "../models/Notification.js";
import Admin from "../models/Admin.js";

/**
 * Create a single notification for an administrator with deduplication handling
 */
export const createNotification = async ({
  recipientId,
  actorId = null,
  type,
  title,
  message,
  entityType = "article",
  entityId = null,
  actionUrl,
  metadata = {},
  eventKey = null
}) => {
  if (!recipientId) return null;

  try {
    const notification = await Notification.create({
      recipientId,
      actorId,
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      metadata,
      eventKey
    });
    return notification;
  } catch (error) {
    // Duplicate event key: safe idempotency (E11000 duplicate key error)
    if (error.code === 11000) {
      return null;
    }
    console.error("[NotificationService] Error creating notification:", error.message);
    return null;
  }
};

/**
 * Notify multiple distinct recipients
 */
export const notifyRecipients = async ({
  recipientIds = [],
  actorId = null,
  type,
  title,
  message,
  entityType = "article",
  entityId = null,
  actionUrl,
  metadata = {},
  eventKeyPrefix = null
}) => {
  if (!Array.isArray(recipientIds) || recipientIds.length === 0) return [];

  // Deduplicate and filter recipient IDs
  const uniqueIds = Array.from(
    new Set(recipientIds.map((id) => id?.toString()).filter(Boolean))
  );

  const promises = uniqueIds.map((recipientId) => {
    const eventKey = eventKeyPrefix ? `${eventKeyPrefix}:${recipientId}` : null;
    return createNotification({
      recipientId,
      actorId,
      type,
      title,
      message,
      entityType,
      entityId,
      actionUrl,
      metadata,
      eventKey
    });
  });

  const results = await Promise.all(promises);
  return results.filter(Boolean);
};

/**
 * Notify active staff members holding specific roles
 */
export const notifyRoles = async ({
  roles = [],
  excludeAdminIds = [],
  actorId = null,
  type,
  title,
  message,
  entityType = "article",
  entityId = null,
  actionUrl,
  metadata = {},
  eventKeyPrefix = null
}) => {
  if (!Array.isArray(roles) || roles.length === 0) return [];

  const excludeSet = new Set(
    (excludeAdminIds || []).map((id) => id?.toString()).filter(Boolean)
  );

  const activeAdmins = await Admin.find({
    role: { $in: roles },
    status: "active"
  }).select("_id");

  const recipientIds = activeAdmins
    .map((admin) => admin._id.toString())
    .filter((id) => !excludeSet.has(id));

  return await notifyRecipients({
    recipientIds,
    actorId,
    type,
    title,
    message,
    entityType,
    entityId,
    actionUrl,
    metadata,
    eventKeyPrefix
  });
};

/**
 * Retrieve paginated notifications for an authenticated recipient
 */
export const getNotificationsForRecipient = async (recipientId, query = {}) => {
  const {
    page = 1,
    limit = 20,
    type,
    isRead,
    status = "active",
    sortBy = "createdAt",
    sortOrder = "desc"
  } = query;

  const filter = {
    recipientId,
    status
  };

  if (type) {
    filter.type = type;
  }

  if (typeof isRead === "boolean") {
    filter.isRead = isRead;
  }

  const skip = (page - 1) * limit;
  const sortDirection = sortOrder === "asc" ? 1 : -1;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("actorId", "name email role avatar")
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      recipientId,
      status: "active",
      isRead: false
    })
  ]);

  return {
    items,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

/**
 * Get accurate unread count for an administrator
 */
export const getUnreadCount = async (recipientId) => {
  const unreadCount = await Notification.countDocuments({
    recipientId,
    status: "active",
    isRead: false
  });
  return unreadCount;
};

/**
 * Mark a single notification as read (strictly scoped to recipientId)
 */
export const markAsRead = async (notificationId, recipientId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true }
  ).populate("actorId", "name email role avatar");

  if (!notification) {
    const error = new Error("Notification not found or access denied");
    error.status = 404;
    throw error;
  }

  return notification;
};

/**
 * Mark a single notification as unread (strictly scoped to recipientId)
 */
export const markAsUnread = async (notificationId, recipientId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { $set: { isRead: false, readAt: null } },
    { new: true }
  ).populate("actorId", "name email role avatar");

  if (!notification) {
    const error = new Error("Notification not found or access denied");
    error.status = 404;
    throw error;
  }

  return notification;
};

/**
 * Mark all active unread notifications as read for an administrator
 */
export const markAllAsRead = async (recipientId) => {
  const cutoffTime = new Date();
  const result = await Notification.updateMany(
    {
      recipientId,
      status: "active",
      isRead: false,
      createdAt: { $lte: cutoffTime }
    },
    {
      $set: {
        isRead: true,
        readAt: cutoffTime
      }
    }
  );

  return {
    modifiedCount: result.modifiedCount
  };
};

/**
 * Archive a notification (soft delete)
 */
export const archiveNotification = async (notificationId, recipientId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId },
    { $set: { status: "archived" } },
    { new: true }
  );

  if (!notification) {
    const error = new Error("Notification not found or access denied");
    error.status = 404;
    throw error;
  }

  return notification;
};

/**
 * Current active totals for a recipient, read from MongoDB after a change
 */
export const getRecipientCounts = async (recipientId) => {
  const [total, unreadCount] = await Promise.all([
    Notification.countDocuments({ recipientId, status: "active" }),
    Notification.countDocuments({ recipientId, status: "active", isRead: false })
  ]);
  return { total, unreadCount };
};

/**
 * Permanently delete a single notification belonging to the recipient.
 * Only the notification document is removed; the related article, comment
 * or audit record is never touched.
 */
export const deleteNotification = async (notificationId, recipientId) => {
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipientId
  });

  if (!notification) {
    const error = new Error("Notification not found or access denied");
    error.status = 404;
    throw error;
  }

  return {
    success: true,
    deletedId: notification._id,
    wasUnread: notification.status === "active" && !notification.isRead,
    ...(await getRecipientCounts(recipientId))
  };
};

/**
 * Permanently delete multiple notifications belonging to the recipient.
 * Reports exactly which requested IDs were removed so the client can
 * reconcile partial results (already deleted, or not owned by this admin).
 */
export const deleteBulkNotifications = async (notificationIds, recipientId) => {
  const requestedIds = [...new Set((notificationIds || []).map(String))].filter((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );

  if (requestedIds.length === 0) {
    return { success: true, requestedCount: 0, deletedCount: 0, deletedIds: [], unavailableIds: [], ...(await getRecipientCounts(recipientId)) };
  }

  const owned = await Notification.find({ _id: { $in: requestedIds }, recipientId }).select("_id").lean();
  const ownedIds = owned.map((n) => String(n._id));

  const result = ownedIds.length
    ? await Notification.deleteMany({ _id: { $in: ownedIds }, recipientId })
    : { deletedCount: 0 };

  // Another tab may delete some of these between the read and the delete;
  // anything still present was not removed by this request.
  const remaining = result.deletedCount === ownedIds.length
    ? new Set()
    : new Set((await Notification.find({ _id: { $in: ownedIds }, recipientId }).select("_id").lean()).map((n) => String(n._id)));
  const deletedIds = result.deletedCount === ownedIds.length ? ownedIds : ownedIds.filter((id) => !remaining.has(id));
  const deletedSet = new Set(deletedIds);

  return {
    success: true,
    requestedCount: requestedIds.length,
    deletedCount: result.deletedCount,
    deletedIds,
    unavailableIds: requestedIds.filter((id) => !deletedSet.has(id)),
    ...(await getRecipientCounts(recipientId))
  };
};

export default {
  NOTIFICATION_TYPES,
  createNotification,
  notifyRecipients,
  notifyRoles,
  getNotificationsForRecipient,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  archiveNotification,
  getRecipientCounts,
  deleteNotification,
  deleteBulkNotifications
};
