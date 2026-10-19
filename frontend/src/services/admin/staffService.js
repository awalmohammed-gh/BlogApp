import api from "../../api/axios";

export const staffService = {
  /**
   * Fetch paginated, filtered, and searchable staff records with stats
   * @param {{ search?: string, role?: string, status?: string, page?: number, limit?: number }} params
   */
  async getStaff(params = {}) {
    const response = await api.get("/admin/staff", { params });
    return response.data;
  },

  /**
   * Fetch details of a specific staff member
   * @param {string} id
   */
  async getStaffById(id) {
    const response = await api.get(`/admin/staff/${id}`);
    return response.data;
  },

  /**
   * Invite a new staff member (Super Admin only)
   * @param {{ name: string, email: string, role: 'editor' | 'author' }} data
   */
  async inviteStaff(data) {
    const response = await api.post("/admin/staff/invite", data);
    return response.data;
  },

  /**
   * Update staff member details
   * @param {string} id
   * @param {{ name?: string, bio?: string, phone?: string }} data
   */
  async updateStaff(id, data) {
    const response = await api.patch(`/admin/staff/${id}`, data);
    return response.data;
  },

  /**
   * Change staff role (editor <-> author)
   * @param {string} id
   * @param {'editor' | 'author'} role
   */
  async changeStaffRole(id, role) {
    const response = await api.patch(`/admin/staff/${id}/role`, { role });
    return response.data;
  },

  /**
   * Activate or disable a staff account
   * @param {string} id
   * @param {'active' | 'disabled'} status
   */
  async changeStaffStatus(id, status) {
    const response = await api.patch(`/admin/staff/${id}/status`, { status });
    return response.data;
  },

  /**
   * Re-issue an invitation link for a pending invited staff member
   * @param {string} id
   */
  async reinviteStaff(id) {
    const response = await api.post(`/admin/staff/${id}/reinvite`);
    return response.data;
  }
};

export default staffService;
