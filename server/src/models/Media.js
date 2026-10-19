import mongoose from "mongoose";
import { MEDIA_FOLDER_KEYS } from "../config/media.js";

/**
 * Centralised digital asset record.
 *
 * The ImageKit `fileId` is the stable external identifier used for every storage operation.
 * The MongoDB `_id` is the stable internal identifier that articles reference.
 */
const mediaSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: [true, "ImageKit file ID is required"],
      trim: true
    },
    url: {
      type: String,
      required: [true, "Delivery URL is required"],
      trim: true
    },
    thumbnailUrl: { type: String, default: "", trim: true },
    filePath: {
      type: String,
      required: [true, "ImageKit file path is required"],
      trim: true
    },
    originalName: { type: String, default: "", trim: true, maxlength: 255 },
    name: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
      maxlength: [150, "Display name cannot exceed 150 characters"]
    },
    mimeType: {
      type: String,
      required: true,
      enum: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]
    },
    extension: { type: String, required: true, lowercase: true, trim: true },
    size: { type: Number, default: 0, min: 0 },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    altText: { type: String, default: "", trim: true, maxlength: 300 },
    caption: { type: String, default: "", trim: true, maxlength: 500 },
    folder: {
      type: String,
      enum: { values: MEDIA_FOLDER_KEYS, message: "Invalid media folder: {VALUE}" },
      default: "general"
    },
    checksum: { type: String, default: "", select: false },
    source: {
      type: String,
      enum: ["upload", "migration"],
      default: "upload"
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    /**
     * active   – selectable for new usage
     * archived – hidden from new selection, file and references preserved
     * deleting – locked while a permanent deletion is in progress (internal)
     */
    status: {
      type: String,
      enum: ["active", "archived", "deleting"],
      default: "active"
    },
    statusBeforeDeletion: { type: String, enum: ["active", "archived", null], default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    deletedAt: { type: Date, default: null },
    lastDeletionError: { type: String, default: "" }
  },
  {
    timestamps: true
  }
);

mediaSchema.index({ fileId: 1 }, { unique: true });
mediaSchema.index({ status: 1, createdAt: -1 });
mediaSchema.index({ folder: 1, status: 1, createdAt: -1 });
mediaSchema.index({ uploadedBy: 1, createdAt: -1 });
mediaSchema.index({ url: 1 });
mediaSchema.index({ checksum: 1 });
mediaSchema.index(
  { name: "text", originalName: "text", altText: "text", caption: "text" },
  { name: "media_text_search", weights: { name: 5, originalName: 3, altText: 2, caption: 1 } }
);

mediaSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    delete ret.checksum;
    return ret;
  }
});

export const Media = mongoose.model("Media", mediaSchema);

export default Media;
