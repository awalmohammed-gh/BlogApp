import { PageViewEvent } from "../models/PageViewEvent.js";
import { AnalyticsDaily } from "../models/AnalyticsDaily.js";
import { Article } from "../models/Article.js";
import { formatDateKey } from "../utils/analyticsDates.js";
import { extractReferrerDomain, classifyTrafficSource } from "../utils/visitorTracking.js";

/**
 * Service handling public telemetry ingestion, deduplication, atomic view increments, and daily aggregates
 */

/**
 * Tracks a public telemetry event (article_view or page_view)
 * @param {Object} params
 * @param {string} params.eventType - 'article_view' | 'page_view'
 * @param {string} [params.pageKey] - e.g. 'home', 'blog', 'about', 'contact', 'article'
 * @param {string} [params.articleSlug]
 * @param {string} [params.articleId]
 * @param {string} [params.referrer]
 * @param {string} [params.utmSource]
 * @param {string} [params.utmMedium]
 * @param {string} [params.utmCampaign]
 * @param {string} params.visitorKey
 * @param {string} params.sessionKey
 * @param {boolean} [params.isNewSession]
 * @returns {Promise<{ recorded: boolean, deduplicated: boolean, reason?: string, views?: number }>}
 */
export const recordTelemetryEvent = async ({
  eventType,
  pageKey = "general",
  articleSlug = null,
  articleId = null,
  referrer = "",
  utmSource = "",
  utmMedium = "",
  utmCampaign = "",
  visitorKey,
  sessionKey,
  isNewSession = false
}) => {
  const occurredAt = new Date();
  const dateKey = formatDateKey(occurredAt);
  const referrerDomain = extractReferrerDomain(referrer);
  const source = classifyTrafficSource(referrerDomain, utmCampaign, utmSource);

  // 30-minute discrete time slot for duplicate suppression
  const timeSlot = Math.floor(occurredAt.getTime() / (30 * 60 * 1000));

  if (eventType === "article_view") {
    // 1. Locate the article and confirm it is published
    let article = null;
    if (articleId) {
      article = await Article.findById(articleId).select("_id title slug status category author views");
    } else if (articleSlug) {
      article = await Article.findOne({ slug: articleSlug.toLowerCase().trim() }).select(
        "_id title slug status category author views"
      );
    }

    if (!article) {
      return { recorded: false, deduplicated: false, reason: "article_not_found" };
    }

    if (article.status !== "published") {
      // Drafts, pending reviews, or archived articles must never record public readership
      return { recorded: false, deduplicated: false, reason: "article_not_published" };
    }

    // 2. Formulate unique eventKey: one view per article per session per 30m window
    const eventKey = `article_view:${article._id}:${sessionKey}:${timeSlot}`;

    try {
      await PageViewEvent.create({
        eventType: "article_view",
        pageKey: "article",
        articleId: article._id,
        visitorKey,
        sessionKey,
        eventKey,
        referrerDomain,
        source,
        campaign: utmCampaign || utmSource || "",
        occurredAt
      });
    } catch (err) {
      if (err.code === 11000) {
        // Deduplicated: this session already registered an eligible view in this window
        return { recorded: false, deduplicated: true, views: article.views };
      }
      throw err;
    }

    // 3. Atomically increment the Article view counter
    const updatedArticle = await Article.findByIdAndUpdate(
      article._id,
      { $inc: { views: 1 } },
      { new: true, select: "views" }
    );

    // 4. Update Daily Aggregates asynchronously
    const incWebsite = { articleViews: 1, pageViews: 1 };
    if (isNewSession) incWebsite.sessions = 1;

    // Website aggregate
    AnalyticsDaily.findOneAndUpdate(
      { date: dateKey, scope: "website", entityId: null },
      { $inc: incWebsite },
      { upsert: true, new: true }
    ).exec();

    // Article aggregate
    AnalyticsDaily.findOneAndUpdate(
      { date: dateKey, scope: "article", entityId: article._id },
      { $inc: { articleViews: 1, pageViews: 1 } },
      { upsert: true, new: true }
    ).exec();

    // Category aggregate
    if (article.category) {
      AnalyticsDaily.findOneAndUpdate(
        { date: dateKey, scope: "category", entityId: article.category },
        { $inc: { articleViews: 1, pageViews: 1 } },
        { upsert: true, new: true }
      ).exec();
    }

    // Author aggregate
    if (article.author) {
      AnalyticsDaily.findOneAndUpdate(
        { date: dateKey, scope: "author", entityId: article.author },
        { $inc: { articleViews: 1, pageViews: 1 } },
        { upsert: true, new: true }
      ).exec();
    }

    return {
      recorded: true,
      deduplicated: false,
      views: updatedArticle ? updatedArticle.views : article.views + 1
    };
  }

  // Generic page_view event (e.g. Home, Blog, Category, About, Contact)
  const safePageKey = (pageKey || "general").toLowerCase().trim();
  const eventKey = `page_view:${safePageKey}:${sessionKey}:${timeSlot}`;

  try {
    await PageViewEvent.create({
      eventType: "page_view",
      pageKey: safePageKey,
      articleId: null,
      visitorKey,
      sessionKey,
      eventKey,
      referrerDomain,
      source,
      campaign: utmCampaign || utmSource || "",
      occurredAt
    });
  } catch (err) {
    if (err.code === 11000) {
      return { recorded: false, deduplicated: true };
    }
    throw err;
  }

  const incWebsite = { pageViews: 1 };
  if (isNewSession) incWebsite.sessions = 1;

  AnalyticsDaily.findOneAndUpdate(
    { date: dateKey, scope: "website", entityId: null },
    { $inc: incWebsite },
    { upsert: true, new: true }
  ).exec();

  return { recorded: true, deduplicated: false };
};

export default {
  recordTelemetryEvent
};
