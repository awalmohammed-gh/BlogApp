import PageViewEvent from "../models/PageViewEvent.js";
import Category from "../models/Category.js";
import Article from "../models/Article.js";

// SITE_STATS_CACHE_MS lets tests observe changes immediately; production default is 30 s
const cacheMs = () => Number(process.env.SITE_STATS_CACHE_MS ?? 30000);
const WINDOW_DAYS = 30;
let cache = { at: 0, data: null };

/**
 * GET /api/site/stats
 * Public, aggregate-only newsroom figures (no visitor data is exposed):
 *   monthlyReaders   distinct anonymous readers with a tracked view in the last 30 days
 *   desks            active news desks (categories)
 *   publishedStories stories currently published
 * Cached briefly so frequent polling stays cheap.
 */
export const getPublicSiteStats = async (req, res, next) => {
  try {
    if (!cache.data || Date.now() - cache.at >= cacheMs()) {
      const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
      const [readers, desks, publishedStories] = await Promise.all([
        PageViewEvent.aggregate([
          { $match: { occurredAt: { $gte: since }, visitorKey: { $type: "string", $ne: "" } } },
          { $group: { _id: "$visitorKey" } },
          { $count: "total" }
        ]),
        Category.countDocuments({ status: "active", deletedAt: null }),
        Article.countDocuments({ status: "published", publishedAt: { $lte: new Date() }, deletedAt: null })
      ]);
      cache = {
        at: Date.now(),
        data: { monthlyReaders: readers[0]?.total || 0, desks, publishedStories, windowDays: WINDOW_DAYS, generatedAt: new Date().toISOString() }
      };
    }
    // The server-side cache is enough; browsers must not reuse stale figures
    res.set("Cache-Control", "no-cache");
    res.json({ success: true, data: cache.data });
  } catch (error) {
    next(error);
  }
};

export default { getPublicSiteStats };
