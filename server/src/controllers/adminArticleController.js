import { publishApprovedRevision, schedulePublication } from "../services/publicationService.js";
import mongoose from "mongoose";
import Article from "../models/Article.js";
import Category from "../models/Category.js";
import Tag from "../models/Tag.js";
import Admin from "../models/Admin.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { slugify, generateUniqueSlug } from "../utils/slugify.js";
import Media from "../models/Media.js";
import { uploadImage, generateThumbnailUrl, deleteImage } from "../config/imagekit.js";
import { inspectImage } from "../utils/imageInspector.js";
import {
  articleQuerySchema,
  scheduleArticleSchema
} from "../validations/articleValidation.js";
import ArticleRevision from "../models/ArticleRevision.js";
import editorialService from "../services/editorialService.js";
import { createRevisionSnapshot } from "../services/revisionService.js";

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * GET /api/admin/articles
 * Retrieve paginated, filtered, searchable list of articles with taxonomy & author references
 */
export const getArticles = async (req, res, next) => {
  try {
    const queryValidation = articleQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryValidation.error.flatten().fieldErrors
      });
    }

    const {
      page,
      limit,
      search,
      status,
      category,
      tag,
      author,
      sortBy,
      sortOrder
    } = queryValidation.data;

    const skip = (page - 1) * limit;
    const filter = {};

    // 1. Ownership rule: Authors can only view their own articles in the admin list
    if (req.admin.role === "author") {
      filter.author = req.admin._id;
    } else if (author && author !== "all" && mongoose.Types.ObjectId.isValid(author)) {
      filter.author = author;
    }

    // 2. Status filter
    if (status === "all") {
      filter.status = { $ne: "archived" };
    } else {
      filter.status = status;
    }

    // 3. Category filter
    if (category && category !== "all") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const catDoc = await Category.findOne({
          $or: [{ slug: category.toLowerCase() }, { name: { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") } }]
        }).select("_id");
        if (catDoc) {
          filter.category = catDoc._id;
        }
      }
    }

    // 4. Tag filter
    if (tag && tag !== "all") {
      if (mongoose.Types.ObjectId.isValid(tag)) {
        filter.tags = tag;
      } else {
        const tagDoc = await Tag.findOne({
          $or: [{ slug: tag.toLowerCase() }, { name: { $regex: new RegExp(`^${escapeRegex(tag)}$`, "i") } }]
        }).select("_id");
        if (tagDoc) {
          filter.tags = tagDoc._id;
        }
      }
    }

    // 5. Search query
    if (search) {
      const escaped = escapeRegex(search);
      filter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { subTitle: { $regex: escaped, $options: "i" } },
        { excerpt: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } }
      ];
    }

    // 6. Safe sorting
    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1
    };

    // Base scope for counting statistics
    const statsScope = req.admin.role === "author" ? { author: req.admin._id } : {};

    const [articles, totalMatching, totalAll, publishedCount, draftCount, pendingCount, scheduledCount, archivedCount] =
      await Promise.all([
        Article.find(filter)
          .populate("category", "name slug color")
          .populate("tags", "name slug")
          .populate("author", "name email avatar role")
          .populate("createdBy", "name email")
          .populate("updatedBy", "name email")
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Article.countDocuments(filter),
        Article.countDocuments(statsScope),
        Article.countDocuments({ ...statsScope, status: "published" }),
        Article.countDocuments({ ...statsScope, status: "draft" }),
        Article.countDocuments({ ...statsScope, status: "pending_review" }),
        Article.countDocuments({ ...statsScope, status: "scheduled" }),
        Article.countDocuments({ ...statsScope, status: "archived" })
      ]);

    res.status(200).json({
      success: true,
      data: articles,
      pagination: {
        page,
        limit,
        total: totalMatching,
        totalPages: Math.ceil(totalMatching / limit) || 1
      },
      stats: {
        total: totalAll,
        published: publishedCount,
        draft: draftCount,
        pending: pendingCount,
        scheduled: scheduledCount,
        archived: archivedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/articles/stats
 * Dashboard article statistics
 */
export const getArticleStats = async (req, res, next) => {
  try {
    const statsScope = req.admin.role === "author" ? { author: req.admin._id } : {};

    const [total, published, draft, pending, scheduled, archived] = await Promise.all([
      Article.countDocuments(statsScope),
      Article.countDocuments({ ...statsScope, status: "published" }),
      Article.countDocuments({ ...statsScope, status: "draft" }),
      Article.countDocuments({ ...statsScope, status: "pending_review" }),
      Article.countDocuments({ ...statsScope, status: "scheduled" }),
      Article.countDocuments({ ...statsScope, status: "archived" })
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        published,
        draft,
        pending,
        scheduled,
        archived
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/articles/:id
 * Retrieve a single article with full editorial details
 */
export const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const article = await Article.findById(id)
      .populate("category", "name slug color")
      .populate("tags", "name slug")
      .populate("author", "name email avatar role bio")
      .populate("featuredImage.media")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email");

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    // Ownership check for authors
    if (req.admin.role === "author" && article.author._id.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view this author's article"
      });
    }

    res.status(200).json({
      success: true,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles
 * Create a new article (defaults to draft)
 */
export const createArticle = async (req, res, next) => {
  try {
    const {
      title,
      subTitle,
      slug,
      excerpt,
      content,
      featuredImage,
      category,
      tags = [],
      author,
      status = "draft",
      isFeatured = false,
      isBreakingNews = false,
      commentsEnabled = true,
      scheduledAt,
      seo = {}
    } = req.body;

    // 1. Author role security constraints
    let assignedAuthor = req.admin._id;
    let targetStatus = status;

    if (req.admin.role === "author") {
      assignedAuthor = req.admin._id; // Authors cannot assign other authors
      if (["published", "scheduled"].includes(targetStatus)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Authors cannot directly publish or schedule articles. Please submit for review."
        });
      }
    } else {
      // Super Admin or Editor can assign an author
      if (author && mongoose.Types.ObjectId.isValid(author)) {
        const authorExists = await Admin.findById(author).select("_id");
        if (!authorExists) {
          return res.status(400).json({
            success: false,
            message: "Assigned author does not exist",
            errors: { author: "Assigned author does not exist" }
          });
        }
        assignedAuthor = author;
      }
    }

    if (["published", "scheduled", "pending_review"].includes(targetStatus)) return res.status(400).json({ success: false, message: "Save a draft, obtain editorial approval, then use Publish or Schedule." });

    // 2. Verify Category if provided
    let categoryId = null;
    if (category) {
      const categoryDoc = await Category.findById(category).select("_id status");
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: "Selected category does not exist",
          errors: { category: "Selected category does not exist" }
        });
      }
      categoryId = categoryDoc._id;
    }

    // 3. Verify Tags if provided
    const validTagIds = [];
    if (Array.isArray(tags) && tags.length > 0) {
      const existingTags = await Tag.find({ _id: { $in: tags } }).select("_id");
      if (existingTags.length !== tags.length) {
        return res.status(400).json({
          success: false,
          message: "One or more selected tags do not exist",
          errors: { tags: "One or more selected tags do not exist" }
        });
      }
      existingTags.forEach((t) => validTagIds.push(t._id));
    }

    // 4. Generate or validate unique slug
    let finalSlug = slug ? slugify(slug) : slugify(title);
    if (!finalSlug) {
      finalSlug = "article";
    }

    const existingSlug = await Article.findOne({ slug: finalSlug });
    if (existingSlug) {
      if (slug) {
        return res.status(409).json({
          success: false,
          message: "The requested article slug is already in use",
          errors: { slug: "The requested article slug is already in use" }
        });
      }
      finalSlug = await generateUniqueSlug(Article, title);
    }

    // 5. Build article document
    const publishedAt = targetStatus === "published" ? new Date() : null;

    const article = await Article.create({
      title: title.trim(),
      subTitle: subTitle ? subTitle.trim() : "",
      slug: finalSlug,
      excerpt: excerpt ? excerpt.trim() : "",
      content: content || "<p></p>",
      featuredImage: featuredImage || { fileId: "", url: "", name: "", width: null, height: null, alt: "" },
      category: categoryId,
      tags: validTagIds,
      author: assignedAuthor,
      status: targetStatus,
      isFeatured: req.admin.role === "author" ? false : Boolean(isFeatured),
      isBreakingNews: req.admin.role === "author" ? false : Boolean(isBreakingNews),
      commentsEnabled: Boolean(commentsEnabled),
      publishedAt,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      seo: seo || {},
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    });

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_CREATED",
      targetAdminId: null,
      metadata: {
        articleId: article._id,
        title: article.title,
        status: article.status
      }
    });

    const populatedArticle = await Article.findById(article._id)
      .populate("category", "name slug color")
      .populate("tags", "name slug")
      .populate("author", "name email avatar role");

    res.status(201).json({
      success: true,
      message: "Article created successfully",
      data: populatedArticle
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An article with this URL slug already exists",
        errors: { slug: "Slug must be unique" }
      });
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/articles/:id
 * Update an existing article
 */
export const updateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    // Ownership check for authors
    if (req.admin.role === "author") {
      if (article.author.toString() !== req.admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to edit this author's article"
        });
      }
    }

    const {
      title,
      subTitle,
      slug,
      excerpt,
      content,
      featuredImage,
      category,
      tags,
      author,
      status,
      isFeatured,
      isBreakingNews,
      commentsEnabled,
      expectedUpdatedAt,
      scheduledAt,
      seo
    } = req.body;

    if (expectedUpdatedAt && article.updatedAt && new Date(expectedUpdatedAt).getTime() !== article.updatedAt.getTime()) {
      return res.status(409).json({
        success: false,
        message: "This article was changed by someone else after you opened it. Reload it to see the latest version before saving.",
        code: "ARTICLE_CONFLICT"
      });
    }

    // Security constraints on fields
    if (req.admin.role === "author") {
      if (author && author !== req.admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Authors cannot change article authorship"
        });
      }
      if (status && ["published", "scheduled"].includes(status) && status !== article.status) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Authors cannot directly publish or schedule articles"
        });
      }
    }

    if (commentsEnabled !== undefined) article.commentsEnabled = Boolean(commentsEnabled);
    if (title !== undefined) article.title = title.trim();
    if (subTitle !== undefined) article.subTitle = subTitle.trim();
    if (excerpt !== undefined) article.excerpt = excerpt.trim();
    if (content !== undefined) article.content = content;
    if (featuredImage !== undefined) article.featuredImage = featuredImage;

    if (article.status === "published" && slug && slug.trim().toLowerCase() !== article.slug) return res.status(409).json({ success: false, message: "Unpublish the article before changing its public URL." });

    // Slug update
    if (slug && slug.trim().toLowerCase() !== article.slug.toLowerCase()) {
      const formattedSlug = slugify(slug);
      const existingSlug = await Article.findOne({
        _id: { $ne: id },
        slug: formattedSlug
      });

      if (existingSlug) {
        return res.status(409).json({
          success: false,
          message: "The requested article slug is already in use",
          errors: { slug: "The requested article slug is already in use" }
        });
      }
      article.slug = formattedSlug;
    }

    // Category update
    if (category !== undefined) {
      if (category && mongoose.Types.ObjectId.isValid(category)) {
        const categoryDoc = await Category.findById(category).select("_id");
        if (!categoryDoc) {
          return res.status(400).json({
            success: false,
            message: "Selected category does not exist",
            errors: { category: "Selected category does not exist" }
          });
        }
        article.category = categoryDoc._id;
      } else {
        article.category = null;
      }
    }

    // Tags update
    if (tags !== undefined && Array.isArray(tags)) {
      const validTagIds = [];
      if (tags.length > 0) {
        const existingTags = await Tag.find({ _id: { $in: tags } }).select("_id");
        if (existingTags.length !== tags.length) {
          return res.status(400).json({
            success: false,
            message: "One or more selected tags do not exist",
            errors: { tags: "One or more selected tags do not exist" }
          });
        }
        existingTags.forEach((t) => validTagIds.push(t._id));
      }
      article.tags = validTagIds;
    }

    // Author update (Editor / Super Admin only)
    if (author !== undefined && req.admin.role !== "author") {
      if (mongoose.Types.ObjectId.isValid(author)) {
        const authorExists = await Admin.findById(author).select("_id");
        if (authorExists) {
          article.author = authorExists._id;
        }
      }
    }

    // Featured flags (Editor / Super Admin only)
    if (req.admin.role !== "author") {
      if (isFeatured !== undefined) article.isFeatured = Boolean(isFeatured);
      if (isBreakingNews !== undefined) article.isBreakingNews = Boolean(isBreakingNews);
    }

    if ((status === "published" && article.status !== "published") || (status === "scheduled" && article.status !== "scheduled") || (status === "pending_review" && article.status !== "pending_review")) return res.status(400).json({ success: false, message: "Use the dedicated Publish or Schedule action after editorial approval." });
    if (article.status === "scheduled" && scheduledAt !== undefined && new Date(scheduledAt).getTime() !== article.scheduledAt?.getTime()) return res.status(400).json({ success: false, message: "Use the Schedule action to change publication time." });

    // Status transition handling
    if (status !== undefined) {
      article.status = status;
      if (status === "published" && !article.publishedAt) {
        article.publishedAt = new Date();
      }
      if (status === "archived") {
        article.deletedAt = new Date();
      } else {
        article.deletedAt = null;
      }
    }

    if (scheduledAt !== undefined) {
      article.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
    }

    if (seo !== undefined) {
      article.seo = { ...article.seo, ...seo };
    }

    article.updatedBy = req.admin._id;
    await article.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_UPDATED",
      targetAdminId: null,
      metadata: {
        articleId: article._id,
        title: article.title,
        status: article.status
      }
    });

    const populatedArticle = await Article.findById(article._id)
      .populate("category", "name slug color")
      .populate("tags", "name slug")
      .populate("author", "name email avatar role");

    res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: populatedArticle
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An article with this URL slug already exists",
        errors: { slug: "Slug must be unique" }
      });
    }
    if (error.name === "VersionError") {
      return res.status(409).json({
        success: false,
        message: "This article was changed by someone else while you were saving. Reload it and try again.",
        code: "ARTICLE_CONFLICT"
      });
    }
    next(error);
  }
};

/**
 * DELETE /api/admin/articles/:id
 * Soft delete (archive) an article
 */
export const archiveArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    // Ownership check for authors
    if (req.admin.role === "author") {
      if (article.author.toString() !== req.admin._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: You are not authorized to archive this article"
        });
      }
      if (article.status === "published") {
        return res.status(403).json({
          success: false,
          message: "Forbidden: Authors cannot archive published articles. Please request an editor."
        });
      }
    }

    if (article.status === "archived") {
      return res.status(400).json({
        success: false,
        message: "Article is already archived"
      });
    }

    article.status = "archived";
    article.deletedAt = new Date();
    article.updatedBy = req.admin._id;
    await article.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_ARCHIVED",
      targetAdminId: null,
      metadata: {
        articleId: article._id,
        title: article.title
      }
    });

    res.status(200).json({
      success: true,
      message: `Article "${article.title}" has been archived successfully`,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/restore
 * Restore an archived article to draft
 */
export const restoreArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    if (article.status !== "archived") {
      return res.status(400).json({
        success: false,
        message: "Article is not currently archived"
      });
    }

    article.status = "draft";
    article.deletedAt = null;
    article.updatedBy = req.admin._id;
    await article.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_RESTORED",
      targetAdminId: null,
      metadata: {
        articleId: article._id,
        title: article.title
      }
    });

    res.status(200).json({
      success: true,
      message: `Article "${article.title}" restored to Draft status`,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/submit
 * Submit an article for editorial review
 */
export const submitArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const { submissionNote, changeSummary } = req.body || {};

    const result = await editorialService.submitArticleForReview({
      articleId: id,
      adminUser: req.admin,
      submissionNote,
      changeSummary
    });

    res.status(200).json({
      success: true,
      message: "Article submitted for editorial review",
      data: result.article,
      submission: result.submission,
      revision: result.revision
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/publish
 * Publish an article (Editor / Super Admin only)
 * Enforces Phase 6 Editorial Workflow: only approved revisions can be published
 */
export const publishArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Authors cannot publish directly
    if (req.admin.role === "author") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Author role cannot publish articles directly. Please submit for review."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    // Validate publishing requirements
    const errors = {};
    if (!article.title || article.title.trim().length < 5) {
      errors.title = "Article headline must be at least 5 characters to publish.";
    }
    if (!article.category) {
      errors.category = "A primary news category is required before publication.";
    }
    const cleanContent = (article.content || "").replace(/<[^>]*>?/gm, "").trim();
    if (!cleanContent) {
      errors.content = "Article body content cannot be empty.";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        success: false,
        message: "Article cannot be published due to missing editorial requirements",
        errors
      });
    }

    // Phase 6 Editorial Enforcement: Check for approved revision
    let approvedRevision = await ArticleRevision.findOne({
      articleId: article._id,
      isApproved: true
    }).sort({ version: -1 });

    const isOverride = req.admin.role === "super_admin" && req.body?.isOverride === true;

    if (!approvedRevision) {
      if (!isOverride) {
        return res.status(400).json({
          success: false,
          message: "Article cannot be published because no approved revision exists. Please obtain editorial review approval first."
        });
      } else {
        const overrideReason = req.body?.overrideReason || "Super Admin emergency direct publication bypass";
        approvedRevision = await createRevisionSnapshot({
          article,
          adminId: req.admin._id,
          changeSummary: `Emergency Direct Publication: ${overrideReason}`
        });
        approvedRevision.isApproved = true;
        await approvedRevision.save();

        await AdminAuditLog.record({
          actorId: req.admin._id,
          action: "EDITORIAL_SUPERADMIN_OVERRIDE_PUBLICATION",
          metadata: {
            articleId: article._id,
            revisionId: approvedRevision._id,
            reason: overrideReason
          }
        });
      }
    }

    await publishApprovedRevision({ articleId: article._id, revisionId: approvedRevision._id, adminId: req.admin._id });

    const populatedArticle = await Article.findById(article._id)
      .populate("category", "name slug color")
      .populate("tags", "name slug")
      .populate("author", "name email avatar role")
      .populate("publishedRevision");

    res.status(200).json({
      success: true,
      message: `Article "${article.title}" is now published and live on the public website`,
      data: populatedArticle
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/unpublish
 * Unpublish an article back to Draft (Editor / Super Admin only)
 */
export const unpublishArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.admin.role === "author") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Authors cannot unpublish articles."
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    article.status = "draft";
    article.updatedBy = req.admin._id;
    await article.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_UNPUBLISHED",
      targetAdminId: null,
      metadata: {
        articleId: article._id,
        title: article.title
      }
    });

    res.status(200).json({
      success: true,
      message: `Article "${article.title}" unpublished and returned to Draft status`,
      data: article
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/schedule
 * Schedule an article for future publication (Editor / Super Admin only)
 */
export const scheduleArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.admin.role === "author") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Authors cannot schedule publication directly."
      });
    }

    const validation = scheduleArticleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid schedule request",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found"
      });
    }

    // Phase 6: Check for approved revision
    let approvedRevision = await ArticleRevision.findOne({
      articleId: article._id,
      isApproved: true
    }).sort({ version: -1 });

    if (!approvedRevision) {
      return res.status(400).json({
        success: false,
        message: "Article cannot be scheduled because no approved revision exists. Please obtain editorial approval before scheduling."
      });
    }

    const scheduledDate = new Date(validation.data.scheduledAt);
    const scheduledArticle = await schedulePublication(article._id, approvedRevision?._id, scheduledDate, req.admin._id);

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_SCHEDULED",
      targetAdminId: null,
      metadata: {
        articleId: article._id,
        title: article.title,
        scheduledAt: scheduledArticle.scheduledAt
      }
    });

    res.status(200).json({
      success: true,
      message: `Article "${article.title}" scheduled for publication on ${scheduledDate.toUTCString()}`,
      data: scheduledArticle
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/duplicate
 * Duplicate an existing article as a draft copy
 */
export const duplicateArticle = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const original = await Article.findById(id);
    if (!original) {
      return res.status(404).json({
        success: false,
        message: "Original article not found"
      });
    }

    const clonedTitle = `${original.title} (Draft Copy)`;
    const clonedSlug = await generateUniqueSlug(Article, `${original.slug}-copy`);

    const cloned = await Article.create({
      title: clonedTitle,
      subTitle: original.subTitle,
      slug: clonedSlug,
      excerpt: original.excerpt,
      content: original.content,
      featuredImage: original.featuredImage,
      category: original.category,
      tags: original.tags,
      author: req.admin._id, // Assign to cloner
      status: "draft",
      isFeatured: false,
      isBreakingNews: false,
      publishedAt: null,
      scheduledAt: null,
      seo: original.seo,
      views: 0,
      createdBy: req.admin._id,
      updatedBy: req.admin._id
    });

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "ARTICLE_DUPLICATED",
      targetAdminId: null,
      metadata: {
        originalId: original._id,
        newArticleId: cloned._id,
        title: cloned.title
      }
    });

    const populatedCloned = await Article.findById(cloned._id)
      .populate("category", "name slug color")
      .populate("tags", "name slug")
      .populate("author", "name email avatar role");

    res.status(201).json({
      success: true,
      message: "Article duplicated successfully as draft",
      data: populatedCloned
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/images
 * Upload an article image buffer to ImageKit
 */
export const uploadArticleImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image file provided"
      });
    }

    // Validate and inspect image
    const imageInfo = inspectImage(req.file.buffer, { maxDimension: 12000 });

    const cleanBase = req.file.originalname
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 80);
    const fileName = `${cleanBase}-${Date.now()}.${imageInfo.extension}`;
    const displayName = req.file.originalname.replace(/\.[^/.]+$/, "").slice(0, 150) || "Article Image";

    const uploadedImage = await uploadImage({
      buffer: req.file.buffer,
      fileName,
      folderPath: "/newsfront/articles",
      tags: ["newsfront", "articles"]
    });

    // Create central Media record
    let mediaDoc = null;
    try {
      mediaDoc = await Media.create({
        fileId: uploadedImage.fileId,
        url: uploadedImage.url,
        thumbnailUrl: uploadedImage.thumbnailUrl || generateThumbnailUrl(uploadedImage.url),
        filePath: uploadedImage.filePath,
        originalName: req.file.originalname.slice(0, 255),
        name: displayName,
        mimeType: imageInfo.mimeType,
        extension: imageInfo.extension,
        size: uploadedImage.size || req.file.size,
        width: uploadedImage.width || imageInfo.width,
        height: uploadedImage.height || imageInfo.height,
        altText: req.body.alt || displayName,
        folder: "articles",
        uploadedBy: req.admin._id,
        status: "active"
      });
    } catch (dbErr) {
      console.warn("[uploadArticleImage] Failed to record in Media collection:", dbErr.message);
    }

    res.status(201).json({
      success: true,
      message: "Image uploaded to ImageKit successfully",
      data: {
        mediaId: mediaDoc ? mediaDoc._id : null,
        media: mediaDoc ? mediaDoc._id : null,
        fileId: uploadedImage.fileId,
        url: uploadedImage.url,
        name: uploadedImage.name,
        width: uploadedImage.width || imageInfo.width,
        height: uploadedImage.height || imageInfo.height,
        thumbnailUrl: uploadedImage.thumbnailUrl || generateThumbnailUrl(uploadedImage.url),
        alt: req.body.alt || ""
      }
    });
  } catch (error) {
    if (error.name === "ImageValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("[ImageKit Upload Error]:", error);
    res.status(502).json({
      success: false,
      message: error.message || "Failed to upload image to ImageKit. Please verify storage service."
    });
  }
};

export default {
  getArticles,
  getArticleStats,
  getArticleById,
  createArticle,
  updateArticle,
  archiveArticle,
  restoreArticle,
  submitArticle,
  publishArticle,
  unpublishArticle,
  scheduleArticle,
  duplicateArticle,
  uploadArticleImage
};
