import api from "../../api/axios";

export const articleService = {
  /**
   * Fetch paginated, filtered, and searchable articles with statistics
   * @param {{ search?: string, status?: string, category?: string, tag?: string, author?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string }} params
   */
  async getArticles(params = {}) {
    const response = await api.get("/admin/articles", { params });
    return response.data;
  },

  /**
   * Fetch dashboard article statistics (total, published, draft, pending, scheduled, archived)
   */
  async getArticleStats() {
    const response = await api.get("/admin/articles/stats");
    return response.data;
  },

  /**
   * Retrieve a single article with full editorial details by ID
   * @param {string} id
   */
  async getArticleById(id) {
    const response = await api.get(`/admin/articles/${id}`);
    return response.data;
  },

  /**
   * Create a new article
   * @param {Object} data
   */
  async createArticle(data) {
    const response = await api.post("/admin/articles", data);
    return response.data;
  },

  /**
   * Update article details
   * @param {string} id
   * @param {Object} data
   */
  async updateArticle(id, data) {
    const response = await api.patch(`/admin/articles/${id}`, data);
    return response.data;
  },

  /**
   * Soft-delete (archive) an article
   * @param {string} id
   */
  async deleteArticle(id) {
    const response = await api.delete(`/admin/articles/${id}`);
    return response.data;
  },

  /**
   * Restore an archived article back to Draft
   * @param {string} id
   */
  async restoreArticle(id) {
    const response = await api.post(`/admin/articles/${id}/restore`);
    return response.data;
  },

  /**
   * Submit an article for editorial review
   * @param {string} id
   * @param {{ submissionNote?: string, changeSummary?: string }} [data]
   */
  async submitArticle(id, data = {}) {
    const response = await api.post(`/admin/articles/${id}/submit`, data);
    return response.data;
  },

  /**
   * Publish an article directly (Editor / Super Admin only)
   * @param {string} id
   * @param {{ isOverride?: boolean, overrideReason?: string }} [data]
   */
  async publishArticle(id, data = {}) {
    const response = await api.post(`/admin/articles/${id}/publish`, data);
    return response.data;
  },

  /**
   * Retrieve immutable revision snapshots of an article
   * @param {string} id
   */
  async getRevisions(id) {
    const response = await api.get(`/admin/articles/${id}/revisions`);
    return response.data;
  },

  /**
   * Restore a historical revision into the working draft
   * @param {string} id
   * @param {string} revisionId
   */
  async restoreRevision(id, revisionId) {
    const response = await api.post(`/admin/articles/${id}/revisions/${revisionId}/restore`);
    return response.data;
  },

  /**
   * Unpublish an article back to Draft
   * @param {string} id
   */
  async unpublishArticle(id) {
    const response = await api.post(`/admin/articles/${id}/unpublish`);
    return response.data;
  },

  /**
   * Schedule an article for future publication
   * @param {string} id
   * @param {string} scheduledAt - ISO datetime string
   */
  async scheduleArticle(id, scheduledAt) {
    const response = await api.post(`/admin/articles/${id}/schedule`, { scheduledAt });
    return response.data;
  },

  /**
   * Duplicate an article as a draft copy
   * @param {string} id
   */
  async duplicateArticle(id) {
    const response = await api.post(`/admin/articles/${id}/duplicate`);
    return response.data;
  },

  /**
   * Upload an article image to ImageKit via backend
   * @param {File} file
   * @param {string} [alt]
   */
  async uploadArticleImage(file, alt = "") {
    const formData = new FormData();
    formData.append("image", file);
    if (alt) formData.append("alt", alt);

    const response = await api.post("/admin/articles/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return response.data;
  },

  /**
   * Client-side validation helper before submitting to server
   * @param {Object} data
   */
  validateArticle: (data) => {
    const errors = {};
    if (!data.title || !data.title.trim()) {
      errors.title = "Article headline is required.";
    } else if (data.title.trim().length < 5) {
      errors.title = "Headline should be at least 5 characters long.";
    }
    if (data.status === "Published" || data.status === "published") {
      if (!data.category) {
        errors.category = "Please select a primary news category.";
      }
      const cleanContent = (data.content || data.description || "").replace(/<[^>]*>?/gm, "").trim();
      if (!cleanContent) {
        errors.content = "Article body content cannot be empty.";
      }
    }
    if ((data.status === "Scheduled" || data.status === "scheduled") && !data.scheduledAt && !data.scheduledFor) {
      errors.scheduledFor = "Please specify a future scheduled publishing date and time.";
    }
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Calculate reading time estimate
   * @param {string} htmlContent
   */
  calculateReadingTime: (htmlContent) => {
    if (!htmlContent) return "1 min read";
    const text = htmlContent.replace(/<[^>]*>?/gm, " ");
    const words = text.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return `${minutes} min read`;
  }
};

export default articleService;
