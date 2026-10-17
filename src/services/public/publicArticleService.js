import api from "../../api/axios";

export const publicArticleService = {
  /**
   * Fetch published articles with search, category/tag filtering, and pagination
   * @param {{ search?: string, category?: string, tag?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string }} params
   */
  async getArticles(params = {}) {
    const response = await api.get("/articles", { params });
    return response.data;
  },

  /**
   * Fetch featured published articles
   * @param {number} [limit=6]
   */
  async getFeaturedArticles(limit = 6) {
    const response = await api.get("/articles/featured", { params: { limit } });
    return response.data;
  },

  /**
   * Fetch breaking news ticker articles
   */
  async getBreakingNews() {
    const response = await api.get("/articles/breaking");
    return response.data;
  },

  /**
   * Fetch published articles under a specific category slug
   * @param {string} slug
   * @param {{ page?: number, limit?: number }} params
   */
  async getArticlesByCategory(slug, params = {}) {
    const response = await api.get(`/articles/categories/${slug}`, { params });
    return response.data;
  },

  /**
   * Fetch a single published article by slug or ID
   * @param {string} slugOrId
   */
  async getArticleBySlug(slugOrId) {
    const response = await api.get(`/articles/${slugOrId}`);
    return response.data;
  }
};

export default publicArticleService;
