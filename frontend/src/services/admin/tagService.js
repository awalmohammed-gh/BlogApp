import api from "../../api/axios";

export const tagService = {
  /**
   * Fetch paginated, filtered, searchable tags list with stats
   * @param {{ search?: string, status?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string }} params
   */
  async getTags(params = {}) {
    const response = await api.get("/admin/tags", { params });
    return response.data;
  },

  /**
   * Fetch active tags for tagging and selectors
   */
  async getActiveTags() {
    const response = await api.get("/admin/tags/active");
    return response.data;
  },

  /**
   * Retrieve a single tag by ID
   * @param {string} id
   */
  async getTagById(id) {
    const response = await api.get(`/admin/tags/${id}`);
    return response.data;
  },

  /**
   * Create a new tag
   * @param {{ name: string, slug?: string, description?: string, status?: string }} data
   */
  async createTag(data) {
    const response = await api.post("/admin/tags", data);
    return response.data;
  },

  /**
   * Update tag details
   * @param {string} id
   * @param {{ name?: string, slug?: string, description?: string, status?: string }} data
   */
  async updateTag(id, data) {
    const response = await api.patch(`/admin/tags/${id}`, data);
    return response.data;
  },

  /**
   * Soft-delete (archive) a tag
   * @param {string} id
   */
  async archiveTag(id) {
    const response = await api.delete(`/admin/tags/${id}`);
    return response.data;
  },

  /**
   * Restore an archived tag to active
   * @param {string} id
   */
  async restoreTag(id) {
    const response = await api.post(`/admin/tags/${id}/restore`);
    return response.data;
  },

  /**
   * Update tag status (active | inactive | archived)
   * @param {string} id
   * @param {'active' | 'inactive' | 'archived'} status
   */
  async updateTagStatus(id, status) {
    const response = await api.patch(`/admin/tags/${id}/status`, { status });
    return response.data;
  }
};

export default tagService;
