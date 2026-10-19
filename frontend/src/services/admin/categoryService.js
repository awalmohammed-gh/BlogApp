import api from "../../api/axios";

export const categoryService = {
  /**
   * Fetch paginated, filtered, searchable categories list with stats
   * @param {{ search?: string, status?: string, page?: number, limit?: number, sortBy?: string, sortOrder?: string }} params
   */
  async getCategories(params = {}) {
    const response = await api.get("/admin/categories", { params });
    return response.data;
  },

  /**
   * Fetch active categories for drafting and selectors
   */
  async getActiveCategories() {
    const response = await api.get("/admin/categories/active");
    return response.data;
  },

  /**
   * Retrieve a single category by ID
   * @param {string} id
   */
  async getCategoryById(id) {
    const response = await api.get(`/admin/categories/${id}`);
    return response.data;
  },

  /**
   * Create a new category
   * @param {{ name: string, slug?: string, description?: string, color?: string, status?: string, displayOrder?: number }} data
   */
  async createCategory(data) {
    const response = await api.post("/admin/categories", data);
    return response.data;
  },

  /**
   * Update category details
   * @param {string} id
   * @param {{ name?: string, slug?: string, description?: string, color?: string, status?: string, displayOrder?: number }} data
   */
  async updateCategory(id, data) {
    const response = await api.patch(`/admin/categories/${id}`, data);
    return response.data;
  },

  /**
   * Soft-delete (archive) a category
   * @param {string} id
   */
  async archiveCategory(id) {
    const response = await api.delete(`/admin/categories/${id}`);
    return response.data;
  },

  /**
   * Restore an archived category to active
   * @param {string} id
   */
  async restoreCategory(id) {
    const response = await api.post(`/admin/categories/${id}/restore`);
    return response.data;
  },

  /**
   * Update category status (active | inactive | archived)
   * @param {string} id
   * @param {'active' | 'inactive' | 'archived'} status
   */
  async updateCategoryStatus(id, status) {
    const response = await api.patch(`/admin/categories/${id}/status`, { status });
    return response.data;
  }
};

export default categoryService;
