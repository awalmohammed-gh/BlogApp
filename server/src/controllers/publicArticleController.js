import mongoose from "mongoose";
import Article from "../models/Article.js";
import Category from "../models/Category.js";
import Tag from "../models/Tag.js";
import { searchPublishedArticles } from "../services/publicSearchService.js";
import { publicArticleQuerySchema } from "../validations/articleValidation.js";

const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/**
 * Safely resolves an article for public display by decoupling the live published
 * version from any in-progress working drafts. If publishedRevision exists,
 * the published revision's approved title, excerpt, content, featured image, and seo are served.
 * Private editorial metadata is strictly stripped.
 */
export const resolvePublicArticle = (art) => {
  if (!art) return null;
  const doc = typeof art.toObject === "function" ? art.toObject() : { ...art };
  if (doc.publishedRevision) {
    const rev = doc.publishedRevision;
    if (rev.title) doc.title = rev.title;
    if (rev.slug) doc.slug = rev.slug;
    if (rev.category) doc.category = rev.category;
    if (rev.tags) doc.tags = rev.tags;
    if (rev.subTitle !== undefined) doc.subTitle = rev.subTitle;
    if (rev.excerpt !== undefined) doc.excerpt = rev.excerpt;
    if (rev.content !== undefined) doc.content = rev.content;
    if (rev.featuredImage) {
      doc.featuredImage = rev.featuredImage;
    }
    if (rev.seo) doc.seo = rev.seo;
  }
  delete doc.publishedRevision;
  delete doc.currentSubmission;
  delete doc.editorialStatus;
  delete doc.contentMedia;
  // Worker leases, retry state and schedule identifiers are private operational data.
  for (const key of Object.keys(doc)) if (key.startsWith("schedule")) delete doc[key];
  return doc;
};

/**
 * GET /api/articles
 * Retrieve public published articles with search, category/tag filter, and pagination
 */
export const getPublicArticles = async (req, res, next) => {
  try {
    const queryValidation = publicArticleQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: queryValidation.error.flatten().fieldErrors
      });
    }

    const { page, limit, search, category, categories, tag, sortBy, sortOrder } = queryValidation.data;
    const skip = (page - 1) * limit;

    // Strict public visibility filter: only published articles whose publish date has passed
    const filter = {
      status: "published",
      publishedAt: { $lte: new Date() }
    };

    // Category filter by slug, name, or ID
    if (category && category !== "all") {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = category;
      } else {
        const catDoc = await Category.findOne({
          $or: [{ slug: category.toLowerCase() }, { name: { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") } }]
        }).select("_id").lean();
        if (catDoc) {
          filter.category = catDoc._id;
        } else {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          });
        }
      }
    }

    // Tag filter
    if (tag && tag !== "all") {
      if (mongoose.Types.ObjectId.isValid(tag)) {
        filter.tags = tag;
      } else {
        const tagDoc = await Tag.findOne({
          $or: [{ slug: tag.toLowerCase() }, { name: { $regex: new RegExp(`^${escapeRegex(tag)}$`, "i") } }]
        }).select("_id").lean();
        if (tagDoc) {
          filter.tags = tagDoc._id;
        } else {
          return res.status(200).json({
            success: true,
            data: [],
            pagination: { page, limit, total: 0, totalPages: 0 }
          });
        }
      }
    }

    if (categories) {
      const slugs=categories.split(",").filter(Boolean).slice(0,20);
      const selected=await Category.find({slug:{$in:slugs},status:"active"}).select("_id").lean();
      filter.category={$in:selected.map((cat)=>cat._id)};
    }

    // _id breaks ties so stories sharing a publication time keep a stable order
    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
      _id: sortOrder === "asc" ? 1 : -1
    };

    const searchResult = search ? await searchPublishedArticles({filter,search,sort,skip,limit}) : null;
    const [articles, countedTotal] = await Promise.all([
      Article.find(searchResult ? {...filter,_id:{$in:searchResult.ids}} : filter)
        .select(
          "_id title subTitle slug excerpt featuredImage category tags author byline isFeatured isBreakingNews commentsEnabled status publishedAt views publishedRevision updatedAt publicReadingMinutes"
        )
        .populate("category", "name slug color")
        .populate("tags", "name slug")
        .populate("author", "name avatar bio title")
        .populate({ path: "publishedRevision", select: "title slug subTitle excerpt featuredImage category tags seo", populate: [{ path: "category", select: "name slug color description" }, { path: "tags", select: "name slug" }] })
        .sort(sort)
        .skip(searchResult ? 0 : skip)
        .limit(limit)
        .lean(),
      searchResult ? Promise.resolve(searchResult.total) : Article.countDocuments(filter)
    ]);

    const total = countedTotal;
    const resolvedArticles = articles.map(resolvePublicSummary);

    res.status(200).json({
      success: true,
      data: resolvedArticles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/articles/featured
 * Retrieve published featured articles for home hero & highlights
 */
export const getFeaturedArticles = async (req, res, next) => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit, 10) || 6));

    const articles = await Article.find({
      status: "published",
      isFeatured: true,
      publishedAt: { $lte: new Date() }
    })
      .select(
        "_id title subTitle slug excerpt featuredImage category tags author byline isFeatured isBreakingNews commentsEnabled status publishedAt views publishedRevision updatedAt publicReadingMinutes"
      )
      .populate("category", "name slug color")
      .populate("tags", "name slug")
      .populate("author", "name avatar bio title")
      .populate({ path: "publishedRevision", select: "title slug subTitle excerpt featuredImage category tags seo", populate: [{ path: "category", select: "name slug color description" }, { path: "tags", select: "name slug" }] })
      .sort({ publishedAt: -1, _id: -1 })
      .limit(limit)
      .lean();

    res.status(200).json({
      success: true,
      data: articles.map(resolvePublicSummary)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/articles/breaking
 * Retrieve active breaking news stories
 */
export const getBreakingNews = async (req, res, next) => {
  try {
    const articles = await Article.find({
      status: "published",
      isBreakingNews: true,
      publishedAt: { $lte: new Date() }
    })
      .select("_id title slug category publishedAt publishedRevision updatedAt")
      .populate("category", "name slug color")
      .populate({ path: "publishedRevision", select: "title slug subTitle excerpt featuredImage category tags seo", populate: [{ path: "category", select: "name slug color description" }, { path: "tags", select: "name slug" }] })
      .sort({ publishedAt: -1, _id: -1 })
      .limit(5)
      .lean();

    res.status(200).json({
      success: true,
      data: articles.map(resolvePublicSummary)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/articles/categories/:slug
 * Retrieve published articles under a specific category slug
 */
export const getArticlesByCategorySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const skip = (page - 1) * limit;

    const category = await Category.findOne({
      $or: [{ slug: slug.toLowerCase() }, { name: { $regex: new RegExp(`^${escapeRegex(slug)}$`, "i") } }],
      status: "active"
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    const filter = {
      category: category._id,
      status: "published",
      publishedAt: { $lte: new Date() }
    };

    const [articles, total] = await Promise.all([
      Article.find(filter)
        .select(
          "_id title subTitle slug excerpt featuredImage category tags author byline isFeatured isBreakingNews commentsEnabled status publishedAt views publishedRevision updatedAt publicReadingMinutes"
        )
        .populate("category", "name slug color")
        .populate("tags", "name slug")
        .populate("author", "name avatar bio title")
        .populate({ path: "publishedRevision", select: "title slug subTitle excerpt featuredImage category tags seo", populate: [{ path: "category", select: "name slug color description" }, { path: "tags", select: "name slug" }] })
        .sort({ publishedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Article.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: {
        category,
        articles: articles.map(resolvePublicSummary),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/articles/:slug
 * Retrieve full article details by slug (or fallback by ID)
 */
export const getPublicArticleBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const query = {
      $or: [{ slug: slug.toLowerCase() }],
      status: "published",
      publishedAt: { $lte: new Date() }
    };

    // If param happens to be a valid MongoDB ObjectId, also check _id
    if (mongoose.Types.ObjectId.isValid(slug)) {
      query.$or.push({ _id: slug });
    }

    const articleDoc = await Article.findOne(query)
      .select("title subTitle slug excerpt content featuredImage category tags author byline isFeatured isBreakingNews commentsEnabled status publishedAt views publishedRevision updatedAt seo publicReadingMinutes")
      .populate("category", "name slug color description")
      .populate("tags", "name slug")
      .populate("author", "name avatar bio title")
      .populate({ path: "publishedRevision", select: "title slug subTitle excerpt content featuredImage category tags seo", populate: [{ path: "category", select: "name slug color description" }, { path: "tags", select: "name slug" }] }).lean();

    if (!articleDoc) {
      return res.status(404).json({
        success: false,
        message: "Article not found or not currently published"
      });
    }

    const article = resolvePublicArticle(articleDoc);

    // Note: View counts are recorded strictly via dedicated public telemetry endpoint (/api/analytics/track)
    // to prevent artificial inflation from API requests, administrative previews, and search engine crawlers.

    const relatedStories = req.query.related === "false" ? [] : await findRelated(article);

    res.status(200).json({
      success: true,
      data: {
        article,
        relatedStories
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  resolvePublicArticle,
  getPublicArticles,
  getFeaturedArticles,
  getBreakingNews,
  getArticlesByCategorySlug,
  getPublicArticleBySlug
};

export const resolvePublicSummary = (doc) => {
  const article=resolvePublicArticle(doc);
  article.readingMinutes=article.publicReadingMinutes;
  delete article.content; delete article.seo; delete article.publicReadingMinutes;
  return article;
};
const findRelated = async (article) => (await Article.find({_id:{$ne:article._id},category:article.category?._id,status:"published",deletedAt:null,publishedAt:{$lte:new Date()}})
  .select("title subTitle slug excerpt featuredImage category author byline publishedAt updatedAt publicReadingMinutes publishedRevision")
  .populate("category","name slug color").populate("author","name avatar")
  .populate({path:"publishedRevision",select:"title slug subTitle excerpt featuredImage category tags",populate:[{path:"category",select:"name slug color"}]})
  .sort({publishedAt:-1,_id:-1}).limit(4).lean()).map(resolvePublicSummary);
export const getRelatedArticles = async (req,res,next) => { try {
 const article=await Article.findOne({$or:[{slug:req.params.slug},...(mongoose.Types.ObjectId.isValid(req.params.slug)?[{_id:req.params.slug}]:[])],status:"published",deletedAt:null,publishedAt:{$lte:new Date()}}).select("_id category").lean();
 if(!article)return res.status(404).json({success:false,message:"Article not found"});
 res.json({success:true,data:await findRelated(article)});
} catch(error){next(error);} };
export const getPublicDesks = async(req,res,next)=>{try{
 const data=await Article.aggregate([{$match:{status:"published",deletedAt:null,publishedAt:{$lte:new Date()}}},{$group:{_id:"$category",count:{$sum:1}}},{$lookup:{from:"categories",localField:"_id",foreignField:"_id",as:"category"}},{$unwind:"$category"},{$match:{"category.status":"active"}},{$project:{_id:0,name:"$category.name",slug:"$category.slug",count:1}},{$sort:{count:-1,name:1}}]).option({maxTimeMS:5000});
 res.json({success:true,data});
}catch(error){next(error);}};
