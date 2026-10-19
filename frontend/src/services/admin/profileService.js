import api from "../../api/axios";

export const profileService = {
  /**
   * Fetch authenticated administrator profile
   */
  async getProfile() {
    const response = await api.get("/admin/profile");
    return response.data;
  },

  /**
   * Update personal information; null avatarMedia removes the profile photo.
   * @param {{ name?: string, bio?: string, phone?: string, avatarMedia?: string | null }} data
   */
  async updateProfile(data) {
    const response = await api.patch("/admin/profile", data);
    return response.data;
  },

  /**
   * Change administrator password
   * @param {{ currentPassword: string, newPassword: string, confirmPassword: string }} data
   */
  async changePassword(data) {
    const response = await api.patch("/admin/profile/password", data);
    return response.data;
  }
};

export default profileService;
