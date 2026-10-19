import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { Category } from "../models/Category.js";
import { Admin } from "../models/Admin.js";
import { EditorialSubmission } from "../models/EditorialSubmission.js";
import { ArticleComment } from "../models/ArticleComment.js";
import { PageViewEvent } from "../models/PageViewEvent.js";
import { AnalyticsDaily } from "../models/AnalyticsDaily.js";
import {
  resolveDateRange,
  formatDateKey,
  generateDateKeys,
  formatDateLabel
} from "../utils/analyticsDates.js";

/**
 * Centralized Nsemra News Analytics Service
 * Provides database-backed reporting, time-series aggregation, and RBAC-scoped content insights
 */

/**
 * Overview statistics across the newsroom
 */
export const getAnalyticsOverview = async (role, adminId) => {
  const isAuthor = role === "author";
  const articleFilter = { deletedAt: null };
  if (isAuthor) {
    articleFilter.author = new mongoose.Types.ObjectId(adminId);
  }

  // 1. Article status counts and views
  const [articleStats] = await Article.aggregate([
    { $match: articleFilter },
    {
      $group: {
        _id: null,
        totalArticles: { $sum: 1 },
        publishedArticles: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] }
        },
        draftArticles: {
          $sum: { $cond: [{ $eq: ["$status", "draft"] }, 1, 0] }
        },
        scheduledArticles: {
          $sum: { $cond: [{ $eq: ["$status", "scheduled"] }, 1, 0] }
        },
        archivedArticles: {
          $sum: { $cond: [{ $eq: ["$status", "archived"] }, 1, 0] }
        },
        totalArticleViews: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, "$views", 0] }
        }
      }
    }
  ]);

  const totalArticles = articleStats?.totalArticles || 0;
  const publishedArticles = articleStats?.publishedArticles || 0;
  const draftArticles = articleStats?.draftArticles || 0;
  const scheduledArticles = articleStats?.scheduledArticles || 0;
  const archivedArticles = articleStats?.archivedArticles || 0;
  const totalArticleViews = articleStats?.totalArticleViews || 0;

  // 2. Editorial queue counts
  const submissionFilter = isAuthor
    ? { author: new mongoose.Types.ObjectId(adminId) }
    : {};
  const [editorialStats] = await EditorialSubmission.aggregate([
    { $match: submissionFilter },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        pendingReviews: {
          $sum: { $cond: [{ $in: ["$status", ["pending", "in_review"]] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
        },
        changesRequested: {
          $sum: { $cond: [{ $eq: ["$status", "changes_requested"] }, 1, 0] }
        }
      }
    }
  ]);

  const pendingReviews = editorialStats?.pendingReviews || 0;

  // 3. Comments counts (scoped to author's articles if author)
  let commentMatch = {};
  if (isAuthor) {
    const authorArticles = await Article.find({ author: adminId, deletedAt: null }).select("_id");
    const articleIds = authorArticles.map((a) => a._id);
    commentMatch = { articleId: { $in: articleIds } };
  }

  const [commentStats] = await ArticleComment.aggregate([
    { $match: commentMatch },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        approvedComments: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] }
        },
        pendingComments: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] }
        },
        rejectedComments: {
          $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] }
        },
        spamComments: {
          $sum: { $cond: [{ $eq: ["$status", "spam"] }, 1, 0] }
        }
      }
    }
  ]);

  const totalComments = commentStats?.totalComments || 0;
  const approvedComments = commentStats?.approvedComments || 0;
  const pendingComments = commentStats?.pendingComments || 0;

  // 4. Traffic & Visitor Estimates (Website-wide from PageViewEvent)
  const [visitorStats] = await PageViewEvent.aggregate([
    {
      $group: {
        _id: null,
        totalPageViews: { $sum: 1 },
        visitors: { $addToSet: "$visitorKey" },
        sessions: { $addToSet: "$sessionKey" }
      }
    },
    {
      $project: {
        totalPageViews: 1,
        estimatedVisitors: { $size: "$visitors" },
        totalSessions: { $size: "$sessions" }
      }
    }
  ]);

  const totalPageViews = visitorStats?.totalPageViews || totalArticleViews;
  const estimatedVisitors = visitorStats?.estimatedVisitors || 0;
  const totalSessions = visitorStats?.totalSessions || 0;

  const avgViewsPerStory =
    publishedArticles > 0 ? Math.round(totalArticleViews / publishedArticles) : 0;
  const engagementRatio =
    publishedArticles > 0
      ? ((approvedComments / publishedArticles) * 100).toFixed(1)
      : "0.0";

  return {
    totalArticles,
    publishedArticles,
    draftArticles,
    scheduledArticles,
    archivedArticles,
    pendingReviews,
    totalArticleViews,
    totalPageViews,
    estimatedVisitors,
    totalSessions,
    totalComments,
    approvedComments,
    pendingComments,
    avgViewsPerStory,
    engagementRatio: parseFloat(engagementRatio)
  };
};

/**
 * Traffic time series across a requested date range
 */
export const getTrafficAnalytics = async ({
  timeframe = "30d",
  startDate: customStart = null,
  endDate: customEnd = null
}) => {
  const { startDate, endDate, days } = resolveDateRange(timeframe, customStart, customEnd);
  const continuousKeys = generateDateKeys(startDate, endDate);

  // 1. Query PageViewEvents within the timeframe
  const eventsByDay = await PageViewEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$occurredAt", timezone: "UTC" }
        },
        pageViews: { $sum: 1 },
        articleViews: {
          $sum: { $cond: [{ $eq: ["$eventType", "article_view"] }, 1, 0] }
        },
        visitors: { $addToSet: "$visitorKey" },
        sessions: { $addToSet: "$sessionKey" }
      }
    }
  ]);

  const eventMap = new Map();
  for (const day of eventsByDay) {
    eventMap.set(day._id, {
      pageViews: day.pageViews || 0,
      articleViews: day.articleViews || 0,
      estimatedVisitors: day.visitors ? day.visitors.length : 0,
      sessions: day.sessions ? day.sessions.length : 0
    });
  }

  // 2. Query articles published within the timeframe
  const publishedByDay = await Article.aggregate([
    {
      $match: {
        status: "published",
        publishedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$publishedAt", timezone: "UTC" }
        },
        publishedCount: { $sum: 1 }
      }
    }
  ]);

  const publishedMap = new Map();
  for (const p of publishedByDay) {
    publishedMap.set(p._id, p.publishedCount || 0);
  }

  // 3. Assemble timeline with zero gaps
  let totalPageViews = 0;
  let totalArticleViews = 0;
  let totalPublished = 0;

  const timeline = continuousKeys.map((dateKey) => {
    const ev = eventMap.get(dateKey) || {
      pageViews: 0,
      articleViews: 0,
      estimatedVisitors: 0,
      sessions: 0
    };
    const published = publishedMap.get(dateKey) || 0;

    totalPageViews += ev.pageViews;
    totalArticleViews += ev.articleViews;
    totalPublished += published;

    return {
      date: dateKey,
      label: formatDateLabel(dateKey),
      pageViews: ev.pageViews,
      articleViews: ev.articleViews,
      views: ev.articleViews || ev.pageViews,
      published,
      estimatedVisitors: ev.estimatedVisitors,
      sessions: ev.sessions
    };
  });

  // 4. Page Type Breakdown
  const pageTypeBreakdown = await PageViewEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$pageKey",
        views: { $sum: 1 }
      }
    },
    { $sort: { views: -1 } }
  ]);

  // Overall unique visitors over the entire period (not simply summing daily uniques)
  const [distinctSummary] = await PageViewEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        visitors: { $addToSet: "$visitorKey" },
        sessions: { $addToSet: "$sessionKey" }
      }
    },
    {
      $project: {
        totalVisitors: { $size: "$visitors" },
        totalSessions: { $size: "$sessions" }
      }
    }
  ]);

  return {
    timeframe,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    days,
    summary: {
      totalPageViews,
      totalArticleViews,
      totalPublished,
      estimatedVisitors: distinctSummary?.totalVisitors || 0,
      totalSessions: distinctSummary?.totalSessions || 0
    },
    timeline,
    pageTypeBreakdown: pageTypeBreakdown.map((pt) => ({
      pageKey: pt._id || "general",
      views: pt.views
    }))
  };
};

/**
 * Article performance table and top/bottom rankings
 */
export const getArticlePerformance = async ({
  timeframe = "30d",
  startDate: customStart = null,
  endDate: customEnd = null,
  sortBy = "views-desc",
  page = 1,
  limit = 20,
  category = null,
  search = null,
  role = "super_admin",
  adminId = null
}) => {
  const isAuthor = role === "author";
  const filter = { deletedAt: null };

  if (isAuthor) {
    filter.author = new mongoose.Types.ObjectId(adminId);
  }

  if (category) {
    if (mongoose.Types.ObjectId.isValid(category)) {
      filter.category = new mongoose.Types.ObjectId(category);
    } else {
      const catDoc = await Category.findOne({ slug: category.toLowerCase().trim() });
      if (catDoc) filter.category = catDoc._id;
    }
  }

  if (search) {
    filter.title = { $regex: search.trim(), $options: "i" };
  }

  // Sorting
  let sort = { views: -1 };
  if (sortBy === "views-asc") sort = { views: 1 };
  else if (sortBy === "recent") sort = { publishedAt: -1, createdAt: -1 };
  else if (sortBy === "oldest") sort = { publishedAt: 1, createdAt: 1 };
  else if (sortBy === "title") sort = { title: 1 };

  const skip = (page - 1) * limit;

  const [articles, total] = await Promise.all([
    Article.find(filter)
      .populate("category", "name slug color")
      .populate("author", "name avatar role")
      .select("title slug category author status editorialStatus views publishedAt createdAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Article.countDocuments(filter)
  ]);

  // Attach approved comments count per article
  const articleIds = articles.map((a) => a._id);
  const commentCounts = await ArticleComment.aggregate([
    {
      $match: {
        articleId: { $in: articleIds },
        status: "approved"
      }
    },
    {
      $group: {
        _id: "$articleId",
        count: { $sum: 1 }
      }
    }
  ]);

  const commentMap = new Map();
  for (const c of commentCounts) {
    commentMap.set(c._id.toString(), c.count);
  }

  const formattedArticles = articles.map((art) => ({
    _id: art._id,
    title: art.title,
    slug: art.slug,
    category: art.category ? { name: art.category.name, slug: art.category.slug, color: art.category.color } : null,
    author: art.author ? { name: art.author.name, avatar: art.author.avatar, role: art.author.role } : null,
    status: art.status,
    editorialStatus: art.editorialStatus,
    views: art.views || 0,
    publishedAt: art.publishedAt,
    createdAt: art.createdAt,
    approvedCommentsCount: commentMap.get(art._id.toString()) || 0
  }));

  // Retrieve top 5 articles
  const topArticles = await Article.find({ ...filter, status: "published" })
    .populate("category", "name slug color")
    .populate("author", "name avatar")
    .select("title slug category author views publishedAt")
    .sort({ views: -1 })
    .limit(5)
    .lean();

  return {
    articles: formattedArticles,
    topArticles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

/**
 * Individual article detailed performance
 */
export const getSingleArticleAnalytics = async (articleId, timeframe = "30d", role, adminId) => {
  const article = await Article.findById(articleId)
    .populate("category", "name slug color")
    .populate("author", "name avatar role")
    .lean();

  if (!article) {
    return { error: "not_found", message: "Article not found." };
  }

  if (role === "author" && article.author?._id.toString() !== adminId.toString()) {
    return { error: "forbidden", message: "Forbidden: You may only view analytics for your own articles." };
  }

  const { startDate, endDate } = resolveDateRange(timeframe);
  const continuousKeys = generateDateKeys(startDate, endDate);

  // Daily views timeline for this article
  const eventsByDay = await PageViewEvent.aggregate([
    {
      $match: {
        articleId: new mongoose.Types.ObjectId(articleId),
        occurredAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$occurredAt", timezone: "UTC" }
        },
        views: { $sum: 1 }
      }
    }
  ]);

  const eventMap = new Map();
  for (const ev of eventsByDay) {
    eventMap.set(ev._id, ev.views);
  }

  const timeline = continuousKeys.map((dateKey) => ({
    date: dateKey,
    label: formatDateLabel(dateKey),
    views: eventMap.get(dateKey) || 0
  }));

  // Traffic sources for this article
  const sources = await PageViewEvent.aggregate([
    {
      $match: {
        articleId: new mongoose.Types.ObjectId(articleId),
        occurredAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$source",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } }
  ]);

  // Approved comments count
  const approvedCommentsCount = await ArticleComment.countDocuments({
    articleId,
    status: "approved"
  });

  return {
    article: {
      _id: article._id,
      title: article.title,
      slug: article.slug,
      status: article.status,
      views: article.views || 0,
      publishedAt: article.publishedAt,
      category: article.category,
      author: article.author
    },
    timeframe,
    periodViews: timeline.reduce((sum, item) => sum + item.views, 0),
    approvedCommentsCount,
    timeline,
    sources: sources.map((s) => ({ source: s._id || "direct", count: s.count }))
  };
};

/**
 * Category Performance Aggregation
 */
export const getCategoryPerformance = async () => {
  const categories = await Category.find({ status: "active" }).select("name slug color").lean();

  const categoryMetrics = await Article.aggregate([
    { $match: { deletedAt: null } },
    {
      $group: {
        _id: "$category",
        totalArticles: { $sum: 1 },
        publishedArticles: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] }
        },
        totalViews: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, "$views", 0] }
        }
      }
    }
  ]);

  const metricMap = new Map();
  for (const m of categoryMetrics) {
    if (m._id) {
      metricMap.set(m._id.toString(), m);
    }
  }

  const result = categories.map((cat) => {
    const metrics = metricMap.get(cat._id.toString()) || {
      totalArticles: 0,
      publishedArticles: 0,
      totalViews: 0
    };
    const avgViews =
      metrics.publishedArticles > 0
        ? Math.round(metrics.totalViews / metrics.publishedArticles)
        : 0;

    return {
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      color: cat.color || "#2563EB",
      totalArticles: metrics.totalArticles,
      publishedArticles: metrics.publishedArticles,
      totalViews: metrics.totalViews,
      avgViews
    };
  });

  // Sort by publishedArticles descending
  result.sort((a, b) => b.publishedArticles - a.publishedArticles);

  return result;
};

/**
 * Author Performance Aggregation
 */
export const getAuthorPerformance = async (role, adminId) => {
  const isAuthor = role === "author";
  const authorFilter = { status: "active" };

  if (isAuthor) {
    authorFilter._id = new mongoose.Types.ObjectId(adminId);
  } else {
    authorFilter.role = { $in: ["super_admin", "editor", "author"] };
  }

  const authors = await Admin.find(authorFilter).select("name avatar role email").lean();

  const authorIds = authors.map((a) => a._id);

  // Aggregate articles by author
  const articleAgg = await Article.aggregate([
    {
      $match: {
        author: { $in: authorIds },
        deletedAt: null
      }
    },
    {
      $group: {
        _id: "$author",
        totalArticles: { $sum: 1 },
        publishedArticles: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] }
        },
        totalViews: {
          $sum: { $cond: [{ $eq: ["$status", "published"] }, "$views", 0] }
        }
      }
    }
  ]);

  const articleMap = new Map();
  for (const a of articleAgg) {
    articleMap.set(a._id.toString(), a);
  }

  // Aggregate pending submissions by author
  const submissionAgg = await EditorialSubmission.aggregate([
    {
      $match: {
        author: { $in: authorIds },
        status: { $in: ["pending", "in_review"] }
      }
    },
    {
      $group: {
        _id: "$author",
        pendingSubmissions: { $sum: 1 }
      }
    }
  ]);

  const submissionMap = new Map();
  for (const s of submissionAgg) {
    submissionMap.set(s._id.toString(), s.pendingSubmissions);
  }

  return authors.map((author) => {
    const art = articleMap.get(author._id.toString()) || {
      totalArticles: 0,
      publishedArticles: 0,
      totalViews: 0
    };
    const avgViews =
      art.publishedArticles > 0 ? Math.round(art.totalViews / art.publishedArticles) : 0;
    const pendingSubmissions = submissionMap.get(author._id.toString()) || 0;

    return {
      _id: author._id,
      name: author.name,
      avatar: author.avatar,
      role: author.role,
      totalArticles: art.totalArticles,
      publishedArticles: art.publishedArticles,
      totalViews: art.totalViews,
      avgViews,
      pendingSubmissions
    };
  });
};

/**
 * Editorial Workflow Performance Analytics
 */
export const getEditorialAnalytics = async (timeframe = "30d", role, adminId) => {
  const isAuthor = role === "author";
  const filter = {};
  if (isAuthor) {
    filter.author = new mongoose.Types.ObjectId(adminId);
  }

  const { startDate, endDate } = resolveDateRange(timeframe);

  // Status breakdown
  const [breakdown] = await EditorialSubmission.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        inReview: { $sum: { $cond: [{ $eq: ["$status", "in_review"] }, 1, 0] } },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        changesRequested: {
          $sum: { $cond: [{ $eq: ["$status", "changes_requested"] }, 1, 0] }
        }
      }
    }
  ]);

  // Turnaround calculation for completed submissions
  const completedSubmissions = await EditorialSubmission.find({
    ...filter,
    status: { $in: ["approved", "rejected"] }
  })
    .select("createdAt updatedAt")
    .lean();

  let totalTurnaroundHours = 0;
  for (const sub of completedSubmissions) {
    const durationMs = new Date(sub.updatedAt).getTime() - new Date(sub.createdAt).getTime();
    totalTurnaroundHours += Math.max(0, durationMs / (1000 * 60 * 60));
  }

  const avgTurnaroundHours =
    completedSubmissions.length > 0
      ? (totalTurnaroundHours / completedSubmissions.length).toFixed(1)
      : "0.0";

  return {
    timeframe,
    totalSubmissions: breakdown?.totalSubmissions || 0,
    pending: breakdown?.pending || 0,
    inReview: breakdown?.inReview || 0,
    approved: breakdown?.approved || 0,
    rejected: breakdown?.rejected || 0,
    changesRequested: breakdown?.changesRequested || 0,
    completedReviews: (breakdown?.approved || 0) + (breakdown?.rejected || 0),
    avgTurnaroundHours: parseFloat(avgTurnaroundHours)
  };
};

/**
 * Comments Moderation & Feedback Analytics
 */
export const getCommentAnalytics = async (timeframe = "30d", role, adminId) => {
  const isAuthor = role === "author";
  let filter = {};

  if (isAuthor) {
    const authorArticles = await Article.find({ author: adminId, deletedAt: null }).select("_id");
    const articleIds = authorArticles.map((a) => a._id);
    filter.articleId = { $in: articleIds };
  }

  const [counts] = await ArticleComment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        spam: { $sum: { $cond: [{ $eq: ["$status", "spam"] }, 1, 0] } }
      }
    }
  ]);

  // Top discussed articles
  const topDiscussed = await ArticleComment.aggregate([
    { $match: { ...filter, status: "approved" } },
    {
      $group: {
        _id: "$articleId",
        approvedCount: { $sum: 1 }
      }
    },
    { $sort: { approvedCount: -1 } },
    { $limit: 5 }
  ]);

  const articleIds = topDiscussed.map((t) => t._id);
  const articles = await Article.find({ _id: { $in: articleIds } })
    .select("title slug views")
    .lean();

  const articleMap = new Map();
  for (const a of articles) {
    articleMap.set(a._id.toString(), a);
  }

  const topDiscussedArticles = topDiscussed.map((t) => {
    const art = articleMap.get(t._id.toString());
    return {
      _id: t._id,
      title: art?.title || "Story",
      slug: art?.slug || "",
      views: art?.views || 0,
      approvedComments: t.approvedCount
    };
  });

  return {
    totalComments: counts?.totalComments || 0,
    approved: counts?.approved || 0,
    pending: counts?.pending || 0,
    rejected: counts?.rejected || 0,
    spam: counts?.spam || 0,
    topDiscussedArticles
  };
};

/**
 * Traffic Sources Breakdown
 */
export const getTrafficSources = async (timeframe = "30d") => {
  const { startDate, endDate } = resolveDateRange(timeframe);

  const sources = await PageViewEvent.aggregate([
    {
      $match: {
        occurredAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: "$source",
        views: { $sum: 1 }
      }
    },
    { $sort: { views: -1 } }
  ]);

  const total = sources.reduce((sum, item) => sum + item.views, 0);

  const sourceLabels = {
    direct: "Direct / Internal",
    search: "Search Engines (Google, Bing, etc.)",
    social: "Social Media (X, Facebook, Reddit)",
    referral: "External Referrals",
    campaign: "Marketing Campaigns (UTM)"
  };

  const results = sources.map((s) => ({
    source: s._id,
    label: sourceLabels[s._id] || s._id,
    views: s.views,
    percentage: total > 0 ? parseFloat(((s.views / total) * 100).toFixed(1)) : 0
  }));

  return {
    timeframe,
    totalViews: total,
    sources: results
  };
};

export default {
  getAnalyticsOverview,
  getTrafficAnalytics,
  getArticlePerformance,
  getSingleArticleAnalytics,
  getCategoryPerformance,
  getAuthorPerformance,
  getEditorialAnalytics,
  getCommentAnalytics,
  getTrafficSources
};
