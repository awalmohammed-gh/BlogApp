import mongoose from "mongoose";

const analyticsDailySchema = new mongoose.Schema(
  {
    date: {
      type: String, // Format: YYYY-MM-DD
      required: [true, "Date is required (YYYY-MM-DD)"],
      index: true
    },
    scope: {
      type: String,
      enum: {
        values: ["website", "article", "category", "author"],
        message: "Invalid scope: {VALUE}"
      },
      required: [true, "Scope is required"],
      index: true
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true
    },
    pageViews: {
      type: Number,
      default: 0
    },
    articleViews: {
      type: Number,
      default: 0
    },
    sessions: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring idempotent atomic updates per date, scope, and entity
analyticsDailySchema.index({ date: 1, scope: 1, entityId: 1 }, { unique: true });
analyticsDailySchema.index({ scope: 1, date: -1 });
analyticsDailySchema.index({ scope: 1, entityId: 1, date: -1 });

export const AnalyticsDaily = mongoose.model("AnalyticsDaily", analyticsDailySchema);
export default AnalyticsDaily;
