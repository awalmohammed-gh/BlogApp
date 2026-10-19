import api from "../../api/axios";

export const editorialService = {
  /**
   * Fetch paginated editorial queue with filters and search
   * @param {{ page?: number, limit?: number, status?: string, search?: string, assignedTo?: string, category?: string, sortBy?: string, sortOrder?: string }} params
   */
  async getQueue(params = {}) {
    const response = await api.get("/admin/editorial/queue", { params });
    return response.data;
  },

  /**
   * Fetch editorial desk statistics
   */
  async getStats() {
    const response = await api.get("/admin/editorial/stats");
    return response.data;
  },

  /**
   * Retrieve single submission by ID with populated relations
   * @param {string} id
   */
  async getSubmission(id) {
    const response = await api.get(`/admin/editorial/${id}`);
    return response.data;
  },

  /**
   * Atomically claim review for currently authenticated editor
   * @param {string} id
   */
  async claimReview(id) {
    const response = await api.post(`/admin/editorial/${id}/claim`);
    return response.data;
  },

  /**
   * Release assigned review back to unassigned queue
   * @param {string} id
   */
  async releaseReview(id) {
    const response = await api.post(`/admin/editorial/${id}/release`);
    return response.data;
  },

  /**
   * Assign or reassign an editor to a review (Super Admin)
   * @param {string} id
   * @param {string} editorId
   */
  async assignReviewer(id, editorId) {
    const response = await api.patch(`/admin/editorial/${id}/assign`, { editorId });
    return response.data;
  },

  /**
   * Approve article submission for publication
   * @param {string} id
   * @param {{ reviewNote?: string, isOverride?: boolean, overrideReason?: string }} [data]
   */
  async approveSubmission(id, data = {}) {
    const response = await api.post(`/admin/editorial/${id}/approve`, data);
    return response.data;
  },

  /**
   * Request changes and corrections from the author
   * @param {string} id
   * @param {{ reviewNote: string }} data
   */
  async requestChanges(id, data) {
    const response = await api.post(`/admin/editorial/${id}/request-changes`, data);
    return response.data;
  },

  /**
   * Reject article submission with explanation
   * @param {string} id
   * @param {{ reviewNote: string }} data
   */
  async rejectSubmission(id, data) {
    const response = await api.post(`/admin/editorial/${id}/reject`, data);
    return response.data;
  },

  /**
   * Retrieve feedback comment thread for a submission
   * @param {string} id
   */
  async getComments(id) {
    const response = await api.get(`/admin/editorial/${id}/comments`);
    return response.data;
  },

  /**
   * Post feedback or reply comment in review thread
   * @param {string} id
   * @param {{ message: string, type?: string, parentCommentId?: string, anchor?: any }} data
   */
  async addComment(id, data) {
    const response = await api.post(`/admin/editorial/${id}/comments`, data);
    return response.data;
  },

  /**
   * Retrieve editorial audit history for a submission
   * @param {string} id
   */
  async getHistory(id) {
    const response = await api.get(`/admin/editorial/${id}/history`);
    return response.data;
  },

  /**
   * Retrieve immutable revision snapshots of an article
   * @param {string} articleId
   */
  async getArticleRevisions(articleId) {
    const response = await api.get(`/admin/articles/${articleId}/revisions`);
    return response.data;
  },

  /**
   * Retrieve details of a specific article revision snapshot
   * @param {string} articleId
   * @param {string} revisionId
   */
  async getArticleRevision(articleId, revisionId) {
    const response = await api.get(`/admin/articles/${articleId}/revisions/${revisionId}`);
    return response.data;
  },

  /**
   * Safely restore an earlier historical revision into the working draft
   * @param {string} articleId
   * @param {string} revisionId
   */
  async restoreRevision(articleId, revisionId) {
    const response = await api.post(`/admin/articles/${articleId}/revisions/${revisionId}/restore`);
    return response.data;
  },

  /**
   * Submit an article for editorial review
   * @param {string} articleId
   * @param {{ submissionNote?: string, changeSummary?: string }} [data]
   */
  async submitArticleForReview(articleId, data = {}) {
    const response = await api.post(`/admin/articles/${articleId}/submit`, data);
    return response.data;
  }
};

export default editorialService;
