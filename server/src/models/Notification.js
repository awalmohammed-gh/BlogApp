import mongoose from "mongoose";

export const NOTIFICATION_TYPES = {
  ARTICLE_SUBMITTED: "article_submitted",
  ARTICLE_ASSIGNED: "article_assigned",
  CHANGES_REQUESTED: "changes_requested",
  ARTICLE_APPROVED: "article_approved",
  ARTICLE_REJECTED: "article_rejected",
  ARTICLE_PUBLISHED: "article_published",
  COMMENT_PENDING: "comment_pending",
  CONTACT_RECEIVED: "contact_received",
  STAFF_ROLE_CHANGED: "staff_role_changed",
  CMS_PAGE_PUBLISHED: "cms_page_published",
  ADVERTISEMENT_UPDATED: "advertisement_updated"
};

const notificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Notification recipient is required"],
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: {
        values: Object.values(NOTIFICATION_TYPES),
        message: "Invalid notification type: {VALUE}"
      },
      index: true
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [120, "Title cannot exceed 120 characters"]
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"]
    },
    entityType: {
      type: String,
      enum: [
        "article",
        "editorial_submission",
        "comment",
        "admin",
        "advertisement",
        "site_page",
        "contact_submission"
      ],
      default: "article"
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    actionUrl: {
      type: String,
      required: [true, "Action URL is required"],
      trim: true
    },
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true
    },
    eventKey: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimal queries and unread counting
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, status: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, status: 1, type: 1, createdAt: -1 });

// Deduplication compound unique index (only for string eventKeys)
notificationSchema.index(
  { recipientId: 1, eventKey: 1 },
  { unique: true, partialFilterExpression: { eventKey: { $type: "string" } } }
);

export const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
