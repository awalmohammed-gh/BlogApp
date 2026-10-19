import mongoose from "mongoose";

/**
 * Records ImageKit/MongoDB consistency problems that could not be resolved inline,
 * so they can be retried by `npm run media:reconcile`.
 *
 * kinds:
 *  - orphan_upload : file reached ImageKit but its Media record could not be saved,
 *                    and the compensating delete also failed.
 */
const mediaCleanupJobSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["orphan_upload"], required: true },
    fileId: { type: String, required: true },
    filePath: { type: String, default: "" },
    reason: { type: String, default: "" },
    attempts: { type: Number, default: 1 },
    lastError: { type: String, default: "" },
    status: { type: String, enum: ["pending", "resolved"], default: "pending" },
    resolvedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

mediaCleanupJobSchema.index({ status: 1, createdAt: 1 });

export const MediaCleanupJob = mongoose.model("MediaCleanupJob", mediaCleanupJobSchema);

export default MediaCleanupJob;
