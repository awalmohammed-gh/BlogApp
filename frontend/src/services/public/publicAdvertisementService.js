import api from "../../api/axios";

export const publicAdvertisementService = {
  /**
   * Fetch active, scheduled advertisement for a public placement
   * @param {string} placement - e.g. 'homepage_banner', 'all_stories_banner', 'article_inline'
   */
  async getActiveAdvertisement(placement) {
    try {
      const response = await api.get("/advertisements", {
        params: { placement }
      });
      return response.data;
    } catch (err) {
      console.warn(`[PublicAdService] Failed to load ad for placement '${placement}':`, err.message);
      return { success: false, data: null };
    }
  }
};

export default publicAdvertisementService;
