import api from "../../api/axios";

// In-memory set of tracked article keys to prevent multiple dispatches within the same SPA view
const trackedArticleSessions = new Set();

export const analyticsTrackingService = {
  /**
   * Tracks an eligible telemetry event
   * @param {Object} payload
   */
  async trackEvent(payload) {
    try {
      const response = await api.post("/analytics/track", payload);
      return response.data;
    } catch {
      // Telemetry failures must remain silent and non-blocking for public readers
      return { success: false };
    }
  },

  /**
   * Tracks an eligible public article readership event
   * @param {string} articleId
   * @param {string} articleSlug
   */
  async trackArticleView(articleId, articleSlug) {
    if (!articleId && !articleSlug) return;

    // Deduplicate in memory for current page visit
    const cacheKey = articleId || articleSlug;
    if (trackedArticleSessions.has(cacheKey)) {
      return;
    }
    trackedArticleSessions.add(cacheKey);

    // Extract UTM parameters from window.location if present
    let utmSource = "";
    let utmMedium = "";
    let utmCampaign = "";

    try {
      const urlParams = new URLSearchParams(window.location.search);
      utmSource = urlParams.get("utm_source") || "";
      utmMedium = urlParams.get("utm_medium") || "";
      utmCampaign = urlParams.get("utm_campaign") || "";
    } catch {
      // fallback
    }

    return this.trackEvent({
      eventType: "article_view",
      articleId,
      articleSlug,
      pageKey: "article",
      referrer: document.referrer || "",
      utmSource,
      utmMedium,
      utmCampaign
    });
  },

  /**
   * Tracks a general page view (e.g. Home, Blog, Category, About, Contact)
   * @param {string} pageKey
   */
  async trackPageView(pageKey = "general") {
    return this.trackEvent({
      eventType: "page_view",
      pageKey,
      referrer: document.referrer || ""
    });
  }
};

export default analyticsTrackingService;
