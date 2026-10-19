import api from "../../api/axios";

export const sitePageService = {
  /**
   * Fetch all editable website pages with status
   */
  async getPages() {
    const response = await api.get("/admin/pages");
    return response.data;
  },

  /**
   * Get single page content and drafts by pageKey
   */
  async getPageByKey(pageKey) {
    const response = await api.get(`/admin/pages/${pageKey}`);
    return response.data;
  },

  /**
   * Save working draft content without publishing
   */
  async saveDraft(pageKey, data) {
    const response = await api.patch(`/admin/pages/${pageKey}/draft`, data);
    return response.data;
  },

  /**
   * Preview draft content (authenticated)
   */
  async previewDraft(pageKey) {
    const response = await api.get(`/admin/pages/${pageKey}/preview`);
    return response.data;
  },

  /**
   * Publish page content to public website
   */
  async publishPage(pageKey, data = {}) {
    const response = await api.post(`/admin/pages/${pageKey}/publish`, data);
    return response.data;
  },

  /**
   * Retrieve immutable revision history
   */
  async getRevisions(pageKey) {
    const response = await api.get(`/admin/pages/${pageKey}/revisions`);
    return response.data;
  },

  /**
   * Restore a historical revision as a new working draft
   */
  async restoreRevision(pageKey, version) {
    const response = await api.post(`/admin/pages/${pageKey}/restore`, { version });
    return response.data;
  }
};

export default sitePageService;
