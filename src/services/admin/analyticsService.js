import api from "../../api/axios";

export const analyticsService = {
  /**
   * Retrieve high-level overview metrics across the newsroom
   */
  async getOverview() {
    const response = await api.get("/admin/analytics/overview");
    return response.data;
  },

  /**
   * Retrieve traffic timeline and summary metrics for requested timeframe
   * @param {{ timeframe?: string, startDate?: string, endDate?: string }} params
   */
  async getTraffic(params = {}) {
    const response = await api.get("/admin/analytics/traffic", { params });
    return response.data;
  },

  /**
   * Retrieve article performance table with sorting, search, category filter, and pagination
   * @param {{ timeframe?: string, sortBy?: string, page?: number, limit?: number, category?: string, search?: string }} params
   */
  async getArticles(params = {}) {
    const response = await api.get("/admin/analytics/articles", { params });
    return response.data;
  },

  /**
   * Retrieve single article detailed performance and traffic source distribution
   * @param {string} id
   * @param {{ timeframe?: string }} params
   */
  async getArticleById(id, params = {}) {
    const response = await api.get(`/admin/analytics/articles/${id}`, { params });
    return response.data;
  },

  /**
   * Retrieve category readership and output performance
   */
  async getCategories() {
    const response = await api.get("/admin/analytics/categories");
    return response.data;
  },

  /**
   * Retrieve staff author output and audience reach
   */
  async getAuthors() {
    const response = await api.get("/admin/analytics/authors");
    return response.data;
  },

  /**
   * Retrieve editorial queue turnaround and review statistics
   * @param {{ timeframe?: string }} params
   */
  async getEditorial(params = {}) {
    const response = await api.get("/admin/analytics/editorial", { params });
    return response.data;
  },

  /**
   * Retrieve reader comment moderation distribution and top discussed stories
   * @param {{ timeframe?: string }} params
   */
  async getComments(params = {}) {
    const response = await api.get("/admin/analytics/comments", { params });
    return response.data;
  },

  /**
   * Retrieve traffic source attribution breakdown
   * @param {{ timeframe?: string }} params
   */
  async getSources(params = {}) {
    const response = await api.get("/admin/analytics/sources", { params });
    return response.data;
  }
};

export default analyticsService;
