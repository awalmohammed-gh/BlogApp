import mongoose from "mongoose";
import Tag from "../models/Tag.js";
import Article from "../models/Article.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { slugify, generateUniqueSlug } from "../utils/slugify.js";
import { tagQuerySchema } from "../validations/tagValidation.js";

/**
 * Escape special regex characters in search strings
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * GET /api/admin/tags
 * Paginated, searchable, filtered, and sorted tags list with statistics
 */
export const getTags = async (req, res, next) => {
  try {
    const queryValidation = tagQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryValidation.error.flatten().fieldErrors
      });
    }

    const { page, limit, search, status, sortBy, sortOrder } = queryValidation.data;
    const skip = (page - 1) * limit;

    const filter = {};

    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } }
      ];
    }

    if (status === "all") {
      filter.status = { $ne: "archived" };
    } else {
      filter.status = status;
    }

    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1
    };

    const [tags, totalMatching, totalActive, totalInactive, totalArchived, totalCount] =
      await Promise.all([
        Tag.find(filter)
          .populate("createdBy", "name email")
          .populate("updatedBy", "name email")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Tag.countDocuments(filter),
        Tag.countDocuments({ status: "active" }),
        Tag.countDocuments({ status: "inactive" }),
        Tag.countDocuments({ status: "archived" }),
        Tag.countDocuments({})
      ]);

    // Aggregate real article usage counts
    const tagIds = tags.map((t) => t._id);
    const tagCounts = await Article.aggregate([
      { $match: { status: { $ne: "archived" } } },
      { $unwind: "$tags" },
      { $match: { tags: { $in: tagIds } } },
      { $group: { _id: "$tags", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    tagCounts.forEach((tc) => {
      countMap[tc._id.toString()] = tc.count;
    });

    const tagsWithCounts = tags.map((t) => ({
      ...t,
      articleCount: countMap[t._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      data: tagsWithCounts,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1
      },
      stats: {
        total: totalCount,
        active: totalActive,
        inactive: totalInactive,
        archived: totalArchived
      }
    });
  } catch (error) {
    next(error);
  }
};

let activeTagsCache = null;
let activeTagsExpires = 0;
export const invalidateTagCache = () => {
  activeTagsCache = null;
  activeTagsExpires = 0;
};

/**
 * GET /api/admin/tags/active
 * Fast list of active tags for article tagging (accessible by Super Admin, Editor, Author)
 */
export const getActiveTags = async (req, res, next) => {
  try {
    if (activeTagsCache && activeTagsExpires > Date.now()) {
      return res.status(200).json({
        success: true,
        data: activeTagsCache
      });
    }

    const activeTags = await Tag.find({ status: "active" })
      .select("_id name slug description")
      .sort({ name: 1 })
      .lean();

    activeTagsCache = activeTags;
    activeTagsExpires = Date.now() + 60000;

    res.status(200).json({
      success: true,
      data: activeTags
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/tags/:id
 * Retrieve a single tag by ID
 */
export const getTagById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tag ID format"
      });
    }

    const tag = await Tag.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    res.status(200).json({
      success: true,
      data: tag
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tags
 * Create a new tag
 */
export const createTag = async (req, res, next) => {
  try {
    const { name, slug, description, status } = req.body;
    const trimmedName = name.trim();

    // Check case-insensitive duplicate name
    const existingName = await Tag.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") }
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "A tag with this name already exists",
        errors: { name: "A tag with this name already exists" }
      });
    }

    // Resolve or generate unique slug
    let finalSlug = slug ? slugify(slug) : slugify(trimmedName);
    if (!finalSlug) {
      finalSlug = "tag";
    }

    const existingSlug = await Tag.findOne({ slug: finalSlug });
    if (existingSlug) {
      if (slug) {
        return res.status(409).json({
          success: false,
          message: "The requested tag slug is already in use",
          errors: { slug: "The requested tag slug is already in use" }
        });
      }
      finalSlug = await generateUniqueSlug(Tag, trimmedName);
    }

    const tag = await Tag.create({
      name: trimmedName,
      slug: finalSlug,
      description: description ? description.trim() : "",
      status: status || "active",
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    });

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "TAG_CREATED",
      targetAdminId: null,
      metadata: {
        tagId: tag._id,
        name: tag.name,
        slug: tag.slug
      }
    });

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      data: tag
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "name";
      return res.status(409).json({
        success: false,
        message: `A tag with this ${field} already exists`,
        errors: { [field]: `This ${field} is already in use` }
      });
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/tags/:id
 * Update an existing tag
 */
export const updateTag = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tag ID format"
      });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    const { name, slug, description, status } = req.body;

    if (name && name.trim().toLowerCase() !== tag.name.toLowerCase()) {
      const trimmedName = name.trim();
      const existingName = await Tag.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") }
      });

      if (existingName) {
        return res.status(409).json({
          success: false,
          message: "A tag with this name already exists",
          errors: { name: "A tag with this name already exists" }
        });
      }
      tag.name = trimmedName;
    }

    if (slug && slug.trim().toLowerCase() !== tag.slug.toLowerCase()) {
      const formattedSlug = slugify(slug);
      const existingSlug = await Tag.findOne({
        _id: { $ne: id },
        slug: formattedSlug
      });

      if (existingSlug) {
        return res.status(409).json({
          success: false,
          message: "The requested tag slug is already in use",
          errors: { slug: "The requested tag slug is already in use" }
        });
      }
      tag.slug = formattedSlug;
    }

    if (description !== undefined) tag.description = description.trim();

    if (status !== undefined) {
      tag.status = status;
      if (status === "archived") {
        tag.deletedAt = new Date();
      } else {
        tag.deletedAt = null;
      }
    }

    tag.updatedBy = req.admin._id;
    await tag.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "TAG_UPDATED",
      targetAdminId: null,
      metadata: {
        tagId: tag._id,
        name: tag.name,
        slug: tag.slug,
        status: tag.status
      }
    });

    res.status(200).json({
      success: true,
      message: "Tag updated successfully",
      data: tag
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(409).json({
        success: false,
        message: `A tag with this ${field} already exists`,
        errors: { [field]: `This ${field} is already in use` }
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/admin/tags/:id
 * Soft delete (archive) a tag
 */
export const archiveTag = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tag ID format"
      });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    if (tag.status === "archived") {
      return res.status(400).json({
        success: false,
        message: "Tag is already archived"
      });
    }

    tag.status = "archived";
    tag.deletedAt = new Date();
    tag.updatedBy = req.admin._id;
    await tag.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "TAG_ARCHIVED",
      targetAdminId: null,
      metadata: {
        tagId: tag._id,
        name: tag.name,
        slug: tag.slug
      }
    });

    res.status(200).json({
      success: true,
      message: `Tag "${tag.name}" has been archived successfully`,
      data: tag
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/tags/:id/restore
 * Restore an archived tag back to active status
 */
export const restoreTag = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tag ID format"
      });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    if (tag.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Tag is not currently archived"
      });
    }

    tag.status = "active";
    tag.deletedAt = null;
    tag.updatedBy = req.admin._id;
    await tag.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "TAG_RESTORED",
      targetAdminId: null,
      metadata: {
        tagId: tag._id,
        name: tag.name,
        slug: tag.slug
      }
    });

    res.status(200).json({
      success: true,
      message: `Tag "${tag.name}" has been restored to active status`,
      data: tag
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/tags/:id/status
 * Update status of a tag
 */
export const changeTagStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid tag ID format"
      });
    }

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({
        success: false,
        message: "Tag not found"
      });
    }

    tag.status = status;
    if (status === "archived") {
      tag.deletedAt = new Date();
    } else {
      tag.deletedAt = null;
    }

    tag.updatedBy = req.admin._id;
    await tag.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "TAG_STATUS_CHANGED",
      targetAdminId: null,
      metadata: {
        tagId: tag._id,
        name: tag.name,
        newStatus: status
      }
    });

    res.status(200).json({
      success: true,
      message: `Tag status updated to ${status}`,
      data: tag
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getTags,
  getActiveTags,
  getTagById,
  createTag,
  updateTag,
  archiveTag,
  restoreTag,
  changeTagStatus
};
