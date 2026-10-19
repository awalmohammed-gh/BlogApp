import api from "../../api/axios";

export const publicSiteContentService = {
  /**
   * Fetch published page sections and metadata by pageKey
   * @param {string} pageKey - 'home' | 'all-stories' | 'about' | 'contact' | 'editorial-standards'
   */
  async getPublishedPage(pageKey) {
    try {
      const response = await api.get(`/site/pages/${pageKey}`);
      return response.data;
    } catch (err) {
      console.warn(`[PublicSiteContent] Failed to load published page '${pageKey}':`, err.message);
      return { success: false, data: null };
    }
  }
};

export default publicSiteContentService;
