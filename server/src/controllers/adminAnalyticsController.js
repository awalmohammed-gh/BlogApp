import {
  getAnalyticsOverview,
  getTrafficAnalytics,
  getArticlePerformance,
  getSingleArticleAnalytics,
  getCategoryPerformance,
  getAuthorPerformance,
  getEditorialAnalytics,
  getCommentAnalytics,
  getTrafficSources
} from "../services/analyticsService.js";

/**
 * Admin Analytics Controller
 * Handles administrative reporting, telemetry trends, and RBAC-scoped newsroom performance
 */

/**
 * GET /api/admin/analytics/overview
 */
export const getOverview = async (req, res, next) => {
  try {
    const data = await getAnalyticsOverview(req.admin.role, req.admin._id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/traffic
 */
export const getTraffic = async (req, res, next) => {
  try {
    if (req.admin.role === "author") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Authors are not permitted to view global website traffic telemetry."
      });
    }

    const { timeframe, startDate, endDate } = req.query;
    const data = await getTrafficAnalytics({ timeframe, startDate, endDate });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/articles
 */
export const getArticles = async (req, res, next) => {
  try {
    const { timeframe, startDate, endDate, sortBy, page, limit, category, search } = req.query;

    const data = await getArticlePerformance({
      timeframe,
      startDate,
      endDate,
      sortBy,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category,
      search,
      role: req.admin.role,
      adminId: req.admin._id
    });

    res.status(200).json({
      success: true,
      data: data.articles,
      topArticles: data.topArticles,
      pagination: data.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/articles/:id
 */
export const getArticleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { timeframe } = req.query;

    const result = await getSingleArticleAnalytics(
      id,
      timeframe,
      req.admin.role,
      req.admin._id
    );

    if (result.error === "not_found") {
      return res.status(404).json({
        success: false,
        message: result.message
      });
    }

    if (result.error === "forbidden") {
      return res.status(403).json({
        success: false,
        message: result.message
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/categories
 */
export const getCategories = async (req, res, next) => {
  try {
    const data = await getCategoryPerformance();
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/authors
 */
export const getAuthors = async (req, res, next) => {
  try {
    const data = await getAuthorPerformance(req.admin.role, req.admin._id);
    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/editorial
 */
export const getEditorial = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    const data = await getEditorialAnalytics(timeframe, req.admin.role, req.admin._id);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/comments
 */
export const getComments = async (req, res, next) => {
  try {
    const { timeframe } = req.query;
    const data = await getCommentAnalytics(timeframe, req.admin.role, req.admin._id);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/analytics/sources
 */
export const getSources = async (req, res, next) => {
  try {
    if (req.admin.role === "author") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Authors are not permitted to view global traffic sources."
      });
    }

    const { timeframe } = req.query;
    const data = await getTrafficSources(timeframe);

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getOverview,
  getTraffic,
  getArticles,
  getArticleById,
  getCategories,
  getAuthors,
  getEditorial,
  getComments,
  getSources
};
