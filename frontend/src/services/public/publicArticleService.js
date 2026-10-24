import api from "../../api/axios";
import { publicGet } from "../../api/publicCache";

export const publicArticleService = {
  /**
   * Fetch published articles with search, category/tag filtering, and pagination
   * @param {{ search?: string, category?: string, tag?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string }} params
   */
  async getArticles(params = {}, options = {}) {
    return publicGet("/articles", { ...options, params });
  },

  /**
   * Fetch featured published articles
   * @param {number} [limit=6]
   */
  async getFeaturedArticles(limit = 6, options = {}) {
    return publicGet("/articles/featured", { ...options, params: { limit } });
  },

  /**
   * Fetch breaking news ticker articles
   */
  async getBreakingNews(options = {}) {
    return publicGet("/articles/breaking", options);
  },

  /**
   * Fetch published articles under a specific category slug
   * @param {string} slug
   * @param {{ page?: number, limit?: number }} params
   */
  async getArticlesByCategory(slug, params = {}, options = {}) {
    return publicGet(`/articles/categories/${encodeURIComponent(slug)}`, { ...options, params });
  },

  /**
   * Fetch a single published article by slug or ID
   * @param {string} slugOrId
   */
  async getArticleBySlug(slugOrId, options = {}) {
    return publicGet(`/articles/${encodeURIComponent(slugOrId)}`, { ...options, params: { related: false } });
  }
};

export default publicArticleService;
