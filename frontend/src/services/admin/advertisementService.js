import api from "../../api/axios";

export const advertisementService = {
  /**
   * Fetch paginated and filtered advertisements list
   */
  async getAdvertisements(params = {}) {
    const response = await api.get("/admin/advertisements", { params });
    return response.data;
  },

  /**
   * Fetch real advertisement campaign statistics
   */
  async getAdvertisementStats() {
    const response = await api.get("/admin/advertisements/stats");
    return response.data;
  },

  /**
   * Retrieve single advertisement by ID
   */
  async getAdvertisementById(id) {
    const response = await api.get(`/admin/advertisements/${id}`);
    return response.data;
  },

  /**
   * Create a new advertisement campaign
   */
  async createAdvertisement(data) {
    const response = await api.post("/admin/advertisements", data);
    return response.data;
  },

  /**
   * Update existing advertisement campaign
   */
  async updateAdvertisement(id, data) {
    const response = await api.patch(`/admin/advertisements/${id}`, data);
    return response.data;
  },

  /**
   * Activate campaign
   */
  async activateAdvertisement(id) {
    const response = await api.post(`/admin/advertisements/${id}/activate`);
    return response.data;
  },

  /**
   * Pause campaign
   */
  async pauseAdvertisement(id) {
    const response = await api.post(`/admin/advertisements/${id}/pause`);
    return response.data;
  },

  /**
   * Archive / soft-delete campaign
   */
  async archiveAdvertisement(id) {
    const response = await api.post(`/admin/advertisements/${id}/archive`);
    return response.data;
  },

  /**
   * Restore campaign to draft
   */
  async restoreAdvertisement(id) {
    const response = await api.post(`/admin/advertisements/${id}/restore`);
    return response.data;
  }
};

export default advertisementService;
