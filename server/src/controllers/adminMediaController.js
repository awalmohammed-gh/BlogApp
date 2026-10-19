import mongoose from "mongoose";
import crypto from "crypto";
import Media from "../models/Media.js";
import MediaCleanupJob from "../models/MediaCleanupJob.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { uploadImage, deleteImage, generateThumbnailUrl, getImageDetails } from "../config/imagekit.js";
import { getFolderByKey, MEDIA_LIMITS } from "../config/media.js";
import { inspectImage } from "../utils/imageInspector.js";
import mediaUsageService from "../services/mediaUsageService.js";
import { mediaQuerySchema, updateMediaSchema, uploadMediaBodySchema } from "../validations/mediaValidation.js";

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Helper to upload a single buffer & create Media document with compensating rollback on failure
 */
const processSingleUpload = async ({ buffer, originalname, folderKey, altText, caption, customName, adminId }) => {
  // 1. Inspect file signatures and dimensions
  const imageInfo = inspectImage(buffer, { maxDimension: MEDIA_LIMITS.maxDimension });

  // 2. Validate folder
  const folderConfig = getFolderByKey(folderKey);
  const targetFolder = folderConfig ? folderConfig.path : "/newsfront/general";

  // 3. Build safe unique file name
  const safeBase = originalname
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 80);
  const fileName = `${safeBase}-${Date.now()}.${imageInfo.extension}`;
  const displayName = customName?.trim() || originalname.replace(/\.[^/.]+$/, "").slice(0, 150) || "Image";

  // 4. Calculate checksum to detect exact duplicate uploads if needed
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  // 5. Upload to ImageKit
  const ikResult = await uploadImage({
    buffer,
    fileName,
    folderPath: targetFolder,
    tags: ["newsfront", folderKey]
  });

  // 6. Persistence to MongoDB with compensating cleanup
  try {
    const mediaDoc = await Media.create({
      fileId: ikResult.fileId,
      url: ikResult.url,
      thumbnailUrl: ikResult.thumbnailUrl || generateThumbnailUrl(ikResult.url),
      filePath: ikResult.filePath,
      originalName: originalname.slice(0, 255),
      name: displayName,
      mimeType: imageInfo.mimeType,
      extension: imageInfo.extension,
      size: ikResult.size || buffer.length,
      width: ikResult.width || imageInfo.width,
      height: ikResult.height || imageInfo.height,
      altText: altText?.trim() || displayName,
      caption: caption?.trim() || "",
      folder: folderKey,
      checksum,
      uploadedBy: adminId,
      status: "active"
    });

    await AdminAuditLog.record({
      actorId: adminId,
      action: "MEDIA_UPLOADED",
      metadata: {
        mediaId: mediaDoc._id,
        fileId: mediaDoc.fileId,
        name: mediaDoc.name,
        size: mediaDoc.size,
        folder: mediaDoc.folder
      }
    });

    return { success: true, data: mediaDoc };
  } catch (dbError) {
    console.error("[Media Controller] MongoDB record creation failed after ImageKit upload:", dbError.message);

    // Compensating deletion to prevent orphan ImageKit file
    try {
      await deleteImage(ikResult.fileId);
      console.log(`[Media Controller] Successfully cleaned up orphaned ImageKit file: ${ikResult.fileId}`);
    } catch (cleanupErr) {
      console.error(`[Media Controller] Failed compensating delete for orphan ${ikResult.fileId}:`, cleanupErr.message);
      // Persist to MediaCleanupJob for asynchronous recovery
      await MediaCleanupJob.create({
        kind: "orphan_upload",
        fileId: ikResult.fileId,
        filePath: ikResult.filePath,
        reason: `MongoDB insert failed: ${dbError.message}`,
        lastError: cleanupErr.message
      }).catch((e) => console.error("Failed to save cleanup job:", e.message));
    }

    throw dbError;
  }
};

/**
 * GET /api/admin/media
 * Retrieve paginated, filtered, searchable media library with batch usage counts
 */
export const getMedia = async (req, res, next) => {
  try {
    const queryValidation = mediaQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryValidation.error.flatten().fieldErrors
      });
    }

    const { page, limit, search, folder, mimeType, status, uploadedBy, sortBy, sortOrder } = queryValidation.data;

    const skip = (page - 1) * limit;
    const filter = {};

    // Authors can view all active media to reuse in articles, but can filter by own if requested
    if (uploadedBy && uploadedBy !== "all") {
      filter.uploadedBy = uploadedBy;
    }

    // Status filter
    if (status === "all") {
      filter.status = { $in: ["active", "archived"] };
    } else {
      filter.status = status;
    }

    // Folder filter
    if (folder && folder !== "all") {
      filter.folder = folder;
    }

    // MIME Type filter
    if (mimeType && mimeType !== "all") {
      filter.mimeType = mimeType;
    }

    // Search query
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { originalName: { $regex: escaped, $options: "i" } },
        { altText: { $regex: escaped, $options: "i" } },
        { caption: { $regex: escaped, $options: "i" } }
      ];
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [items, totalMatching] = await Promise.all([
      Media.find(filter)
        .populate("uploadedBy", "name email role avatar")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Media.countDocuments(filter)
    ]);

    // Compute batch usage counts in a single pass
    const usageMap = await mediaUsageService.getBatchUsageCounts(items);

    const dataWithUsage = items.map((item) => ({
      ...item,
      usageCount: usageMap[item._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      data: dataWithUsage,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/media/stats
 * Real statistical metrics computed from MongoDB
 */
export const getMediaStats = async (req, res, next) => {
  try {
    const [totalFiles, activeFiles, archivedFiles, storageAgg] = await Promise.all([
      Media.countDocuments({ status: { $ne: "deleting" } }),
      Media.countDocuments({ status: "active" }),
      Media.countDocuments({ status: "archived" }),
      Media.aggregate([
        { $match: { status: { $ne: "deleting" } } },
        { $group: { _id: null, totalBytes: { $sum: "$size" } } }
      ])
    ]);

    const totalStorageBytes = storageAgg[0]?.totalBytes || 0;

    // Distinct count of referenced media
    const allActiveMedia = await Media.find({ status: { $ne: "deleting" } }).select("_id url fileId").lean();
    const batchUsages = await mediaUsageService.getBatchUsageCounts(allActiveMedia);
    let inUseCount = 0;
    let unusedCount = 0;

    Object.values(batchUsages).forEach((count) => {
      if (count > 0) inUseCount++;
      else unusedCount++;
    });

    res.status(200).json({
      success: true,
      data: {
        totalFiles,
        activeFiles,
        archivedFiles,
        totalStorageBytes,
        inUseCount,
        unusedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/media/:id
 * Retrieve single media item with detailed metadata and usage info
 */
export const getMediaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID format" });
    }

    const mediaDoc = await Media.findById(id).populate("uploadedBy", "name email role avatar");
    if (!mediaDoc || mediaDoc.status === "deleting") {
      return res.status(404).json({ success: false, message: "Media asset not found" });
    }

    const usageInfo = await mediaUsageService.getMediaUsage(mediaDoc);

    res.status(200).json({
      success: true,
      data: {
        ...mediaDoc.toJSON(),
        usageCount: usageInfo.usageCount,
        usage: usageInfo.articles
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/media/:id/usage
 * Specific endpoint to query referenced articles
 */
export const getMediaUsage = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID format" });
    }

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc) {
      return res.status(404).json({ success: false, message: "Media asset not found" });
    }

    const usageInfo = await mediaUsageService.getMediaUsage(mediaDoc);

    res.status(200).json({
      success: true,
      data: usageInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/media/upload
 * Single image upload
 */
export const uploadSingleMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    const bodyValidation = uploadMediaBodySchema.safeParse(req.body);
    if (!bodyValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid upload parameters",
        errors: bodyValidation.error.flatten().fieldErrors
      });
    }

    const { folder, altText, caption, name } = bodyValidation.data;

    const result = await processSingleUpload({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      folderKey: folder,
      altText,
      caption,
      customName: name,
      adminId: req.admin._id
    });

    const populated = await Media.findById(result.data._id).populate("uploadedBy", "name email role avatar");

    res.status(201).json({
      success: true,
      message: "Media uploaded successfully",
      data: populated
    });
  } catch (error) {
    if (error.name === "ImageValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error);
  }
};

/**
 * POST /api/admin/media/upload-multiple
 * Multiple images batch upload with concurrency control & partial success handling
 */
export const uploadMultipleMedia = async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files provided for batch upload"
      });
    }

    if (files.length > MEDIA_LIMITS.maxFilesPerBatch) {
      return res.status(400).json({
        success: false,
        message: `Batch exceeds the maximum allowed limit of ${MEDIA_LIMITS.maxFilesPerBatch} files per upload`
      });
    }

    const folderKey = req.body.folder || "general";
    const folderConfig = getFolderByKey(folderKey);
    if (!folderConfig || !folderConfig.uploadable) {
      return res.status(400).json({
        success: false,
        message: "Invalid or non-uploadable target folder"
      });
    }

    const results = [];
    // Concurrency pool
    const concurrency = MEDIA_LIMITS.uploadConcurrency;
    let index = 0;

    const worker = async () => {
      while (index < files.length) {
        const currentIndex = index++;
        const file = files[currentIndex];
        try {
          const processed = await processSingleUpload({
            buffer: file.buffer,
            originalname: file.originalname,
            folderKey,
            adminId: req.admin._id
          });
          results[currentIndex] = {
            filename: file.originalname,
            success: true,
            data: processed.data
          };
        } catch (err) {
          results[currentIndex] = {
            filename: file.originalname,
            success: false,
            error: err.message || "Upload failed"
          };
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => worker());
    await Promise.all(workers);

    const successfulUploads = results.filter((r) => r.success).map((r) => r.data);
    const failedUploads = results.filter((r) => !r.success);

    const isAllSuccess = failedUploads.length === 0;
    const isPartial = successfulUploads.length > 0 && failedUploads.length > 0;

    res.status(isAllSuccess ? 201 : 207).json({
      success: isAllSuccess || isPartial,
      message: isAllSuccess
        ? `Successfully uploaded all ${successfulUploads.length} files.`
        : isPartial
        ? `Uploaded ${successfulUploads.length} files successfully; ${failedUploads.length} failed.`
        : "All file uploads in the batch failed.",
      data: successfulUploads,
      failures: failedUploads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/media/:id
 * Update media metadata (name, altText, caption, folder)
 */
export const updateMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID format" });
    }

    const validation = updateMediaSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid update payload",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc || mediaDoc.status === "deleting") {
      return res.status(404).json({ success: false, message: "Media asset not found" });
    }

    // Role check: Authors can only edit metadata of images they uploaded
    if (req.admin.role === "author") {
      if (!mediaDoc.uploadedBy || mediaDoc.uploadedBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Authors can only modify metadata for their own uploaded media"
        });
      }
    }

    const { name, altText, caption, folder } = validation.data;

    if (name !== undefined) mediaDoc.name = name;
    if (altText !== undefined) mediaDoc.altText = altText;
    if (caption !== undefined) mediaDoc.caption = caption;
    if (folder !== undefined) mediaDoc.folder = folder;

    await mediaDoc.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "MEDIA_METADATA_UPDATED",
      metadata: { mediaId: mediaDoc._id, name: mediaDoc.name, folder: mediaDoc.folder }
    });

    const populated = await Media.findById(id).populate("uploadedBy", "name email role avatar");

    res.status(200).json({
      success: true,
      message: "Media details updated successfully",
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/media/:id/archive
 * Archive media item (soft hide from selection, preserves file & references)
 */
export const archiveMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID format" });
    }

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc) {
      return res.status(404).json({ success: false, message: "Media asset not found" });
    }

    // Authors cannot archive shared newsroom assets unless they uploaded them
    if (req.admin.role === "author") {
      if (!mediaDoc.uploadedBy || mediaDoc.uploadedBy.toString() !== req.admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to archive this asset"
        });
      }
    }

    mediaDoc.status = "archived";
    mediaDoc.archivedBy = req.admin._id;
    mediaDoc.deletedAt = new Date();
    await mediaDoc.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "MEDIA_ARCHIVED",
      metadata: { mediaId: mediaDoc._id, name: mediaDoc.name }
    });

    res.status(200).json({
      success: true,
      message: "Media asset has been archived successfully",
      data: mediaDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/media/:id/restore
 * Restore archived media back to active status
 */
export const restoreMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID format" });
    }

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc) {
      return res.status(404).json({ success: false, message: "Media asset not found" });
    }

    if (mediaDoc.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Only archived media assets can be restored"
      });
    }

    // Verify ImageKit asset still exists where applicable
    try {
      await getImageDetails(mediaDoc.fileId);
    } catch (err) {
      if (err.notFound) {
        return res.status(409).json({
          success: false,
          message: "Cannot restore asset: Underlying file no longer exists in ImageKit."
        });
      }
    }

    mediaDoc.status = "active";
    mediaDoc.archivedBy = null;
    mediaDoc.deletedAt = null;
    await mediaDoc.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "MEDIA_RESTORED",
      metadata: { mediaId: mediaDoc._id, name: mediaDoc.name }
    });

    res.status(200).json({
      success: true,
      message: "Media asset restored to active library",
      data: mediaDoc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/media/:id
 * Permanent deletion: STRICTLY BLOCKED IF REFERENCED BY ANY ARTICLE!
 * Allowed for Super Admin (and Editor if permitted, restricted for Author).
 */
export const deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid media ID format" });
    }

    // Authors can NEVER permanently delete newsroom media
    if (req.admin.role === "author") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Author accounts cannot permanently delete assets. You can archive your uploaded files."
      });
    }

    const mediaDoc = await Media.findById(id);
    if (!mediaDoc || mediaDoc.status === "deleting") {
      return res.status(404).json({ success: false, message: "Media asset not found" });
    }

    // 1. SAFETY CHECK: Check references across articles
    const usageInfo = await mediaUsageService.getMediaUsage(mediaDoc);
    if (usageInfo.usageCount > 0) {
      return res.status(409).json({
        success: false,
        message: usageInfo.profiles?.length
          ? "This image is used as a profile photo. Remove or replace that profile photo before deleting the image."
          : usageInfo.settings?.length
          ? `This image is the ${usageInfo.settings.map((s) => s.title.toLowerCase()).join(" and ")}. Choose another in Settings -> Branding before deleting it.`
          : `This image is currently used in ${usageInfo.usageCount} place${usageInfo.usageCount === 1 ? "" : "s"} and cannot be permanently deleted.`,
        usageCount: usageInfo.usageCount,
        articles: usageInfo.articles,
        settings: usageInfo.settings,
        profiles: usageInfo.profiles
      });
    }

    // 2. Mark state as deleting to prevent race condition reuse
    const previousStatus = mediaDoc.status;
    mediaDoc.status = "deleting";
    mediaDoc.statusBeforeDeletion = previousStatus;
    await mediaDoc.save();

    // 3. Delete file in ImageKit
    try {
      await deleteImage(mediaDoc.fileId);
    } catch (ikError) {
      // Revert status so record isn't lost if external delete failed
      mediaDoc.status = previousStatus;
      mediaDoc.lastDeletionError = ikError.message;
      await mediaDoc.save();

      return res.status(502).json({
        success: false,
        message: "Failed to delete file from ImageKit storage. Media record has been preserved."
      });
    }

    // 4. Remove document from MongoDB
    await Media.findByIdAndDelete(id);

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "MEDIA_PERMANENTLY_DELETED",
      metadata: {
        mediaId: id,
        fileId: mediaDoc.fileId,
        name: mediaDoc.name,
        filePath: mediaDoc.filePath
      }
    });

    res.status(200).json({
      success: true,
      message: "Media asset permanently deleted from ImageKit and database."
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getMedia,
  getMediaStats,
  getMediaById,
  getMediaUsage,
  uploadSingleMedia,
  uploadMultipleMedia,
  updateMedia,
  archiveMedia,
  restoreMedia,
  deleteMedia
};
