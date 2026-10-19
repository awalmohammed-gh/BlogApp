import mongoose from "mongoose";

const pageViewEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      enum: {
        values: ["page_view", "article_view"],
        message: "Invalid event type: {VALUE}"
      },
      required: [true, "Event type is required"],
      index: true
    },
    pageKey: {
      type: String,
      trim: true,
      default: "general"
    },
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      default: null,
      index: true
    },
    visitorKey: {
      type: String,
      trim: true,
      index: true
    },
    sessionKey: {
      type: String,
      trim: true,
      index: true
    },
    eventKey: {
      type: String,
      trim: true,
      default: null
    },
    referrerDomain: {
      type: String,
      trim: true,
      default: ""
    },
    source: {
      type: String,
      enum: ["direct", "search", "social", "referral", "campaign"],
      default: "direct",
      index: true
    },
    campaign: {
      type: String,
      trim: true,
      default: ""
    },
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false }
  }
);

// Targeted indexes for high-speed reporting and deduplication
pageViewEventSchema.index({ eventKey: 1 }, { unique: true, sparse: true });
pageViewEventSchema.index({ occurredAt: -1, eventType: 1 });
pageViewEventSchema.index({ articleId: 1, occurredAt: -1 });
pageViewEventSchema.index({ visitorKey: 1, occurredAt: -1 });
pageViewEventSchema.index({ sessionKey: 1, occurredAt: -1 });
pageViewEventSchema.index({ source: 1, occurredAt: -1 });

export const PageViewEvent = mongoose.model("PageViewEvent", pageViewEventSchema);
export default PageViewEvent;
