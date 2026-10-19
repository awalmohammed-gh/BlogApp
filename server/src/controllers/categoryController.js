import mongoose from "mongoose";
import Category from "../models/Category.js";
import Article from "../models/Article.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { slugify, generateUniqueSlug } from "../utils/slugify.js";
import { categoryQuerySchema } from "../validations/categoryValidation.js";

/**
 * Escape special regex characters in search strings
 * @param {string} str
 * @returns {string}
 */
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * GET /api/admin/categories
 * Paginated, searchable, filtered, and sorted categories list with taxonomy statistics
 */
export const getCategories = async (req, res, next) => {
  try {
    const queryValidation = categoryQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryValidation.error.flatten().fieldErrors
      });
    }

    const { page, limit, search, status, sortBy, sortOrder } = queryValidation.data;
    const skip = (page - 1) * limit;

    // Build filter query
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
      // Exclude archived by default in standard view
      filter.status = { $ne: "archived" };
    } else {
      filter.status = status;
    }

    // Build safe sort object
    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1
    };

    const [categories, totalMatching, totalActive, totalInactive, totalArchived, totalCount] =
      await Promise.all([
        Category.find(filter)
          .populate("createdBy", "name email")
          .populate("updatedBy", "name email")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Category.countDocuments(filter),
        Category.countDocuments({ status: "active" }),
        Category.countDocuments({ status: "inactive" }),
        Category.countDocuments({ status: "archived" }),
        Category.countDocuments({})
      ]);

    // Aggregate real article usage counts
    const categoryIds = categories.map((c) => c._id);
    const articleCounts = await Article.aggregate([
      { $match: { category: { $in: categoryIds }, status: { $ne: "archived" } } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    const countMap = {};
    articleCounts.forEach((ac) => {
      countMap[ac._id.toString()] = ac.count;
    });

    const categoriesWithCounts = categories.map((c) => ({
      ...c,
      articleCount: countMap[c._id.toString()] || 0
    }));

    res.status(200).json({
      success: true,
      data: categoriesWithCounts,
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

/**
 * GET /api/admin/categories/active
 * Fast list of active categories for article drafting (accessible by Super Admin, Editor, Author)
 */
export const getActiveCategories = async (req, res, next) => {
  try {
    const activeCategories = await Category.find({ status: "active" })
      .select("_id name slug description color displayOrder")
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    res.status(200).json({
      success: true,
      data: activeCategories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/categories/:id
 * Retrieve a single category by ID
 */
export const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    res.status(200).json({
      success: true,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/categories
 * Create a new category
 */
export const createCategory = async (req, res, next) => {
  try {
    const { name, slug, description, color, status, displayOrder } = req.body;

    const trimmedName = name.trim();

    // Check case-insensitive duplicate name
    const existingName = await Category.findOne({
      name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") }
    });

    if (existingName) {
      return res.status(409).json({
        success: false,
        message: "A category with this name already exists",
        errors: { name: "A category with this name already exists" }
      });
    }

    // Resolve or generate unique slug
    let finalSlug = slug ? slugify(slug) : slugify(trimmedName);
    if (!finalSlug) {
      finalSlug = "category";
    }

    const existingSlug = await Category.findOne({ slug: finalSlug });
    if (existingSlug) {
      if (slug) {
        // User explicitly provided a duplicate slug
        return res.status(409).json({
          success: false,
          message: "The requested category slug is already in use",
          errors: { slug: "The requested category slug is already in use" }
        });
      }
      // Auto-resolve slug collision
      finalSlug = await generateUniqueSlug(Category, trimmedName);
    }

    const category = await Category.create({
      name: trimmedName,
      slug: finalSlug,
      description: description ? description.trim() : "",
      color: color || "#2563EB",
      status: status || "active",
      displayOrder: displayOrder !== undefined ? displayOrder : 0,
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    });

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "CATEGORY_CREATED",
      targetAdminId: null,
      metadata: {
        categoryId: category._id,
        name: category.name,
        slug: category.slug
      }
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "name";
      return res.status(409).json({
        success: false,
        message: `A category with this ${field} already exists`,
        errors: { [field]: `This ${field} is already in use` }
      });
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/categories/:id
 * Update an existing category
 */
export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const { name, slug, description, color, status, displayOrder } = req.body;

    // Check duplicate name if name is changing
    if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
      const trimmedName = name.trim();
      const existingName = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escapeRegex(trimmedName)}$`, "i") }
      });

      if (existingName) {
        return res.status(409).json({
          success: false,
          message: "A category with this name already exists",
          errors: { name: "A category with this name already exists" }
        });
      }
      category.name = trimmedName;
    }

    // Check duplicate slug if slug is explicitly provided and changing
    if (slug && slug.trim().toLowerCase() !== category.slug.toLowerCase()) {
      const formattedSlug = slugify(slug);
      const existingSlug = await Category.findOne({
        _id: { $ne: id },
        slug: formattedSlug
      });

      if (existingSlug) {
        return res.status(409).json({
          success: false,
          message: "The requested category slug is already in use",
          errors: { slug: "The requested category slug is already in use" }
        });
      }
      category.slug = formattedSlug;
    }

    if (description !== undefined) category.description = description.trim();
    if (color !== undefined) category.color = color;
    if (displayOrder !== undefined) category.displayOrder = displayOrder;

    if (status !== undefined) {
      category.status = status;
      if (status === "archived") {
        category.deletedAt = new Date();
      } else {
        category.deletedAt = null;
      }
    }

    category.updatedBy = req.admin._id;
    await category.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "CATEGORY_UPDATED",
      targetAdminId: null,
      metadata: {
        categoryId: category._id,
        name: category.name,
        slug: category.slug,
        status: category.status
      }
    });

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return res.status(409).json({
        success: false,
        message: `A category with this ${field} already exists`,
        errors: { [field]: `This ${field} is already in use` }
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/admin/categories/:id
 * Soft delete (archive) a category
 */
export const archiveCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    if (category.status === "archived") {
      return res.status(400).json({
        success: false,
        message: "Category is already archived"
      });
    }

    category.status = "archived";
    category.deletedAt = new Date();
    category.updatedBy = req.admin._id;
    await category.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "CATEGORY_ARCHIVED",
      targetAdminId: null,
      metadata: {
        categoryId: category._id,
        name: category.name,
        slug: category.slug
      }
    });

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" has been archived successfully`,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/categories/:id/restore
 * Restore an archived category back to active status
 */
export const restoreCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    if (category.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Category is not currently archived"
      });
    }

    category.status = "active";
    category.deletedAt = null;
    category.updatedBy = req.admin._id;
    await category.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "CATEGORY_RESTORED",
      targetAdminId: null,
      metadata: {
        categoryId: category._id,
        name: category.name,
        slug: category.slug
      }
    });

    res.status(200).json({
      success: true,
      message: `Category "${category.name}" has been restored to active status`,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/categories/:id/status
 * Update status (active | inactive | archived) of a category
 */
export const changeCategoryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID format"
      });
    }

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    category.status = status;
    if (status === "archived") {
      category.deletedAt = new Date();
    } else {
      category.deletedAt = null;
    }

    category.updatedBy = req.admin._id;
    await category.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "CATEGORY_STATUS_CHANGED",
      targetAdminId: null,
      metadata: {
        categoryId: category._id,
        name: category.name,
        newStatus: status
      }
    });

    res.status(200).json({
      success: true,
      message: `Category status updated to ${status}`,
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getCategories,
  getActiveCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategory,
  changeCategoryStatus
};
