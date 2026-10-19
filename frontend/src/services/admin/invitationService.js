import api from "../../api/axios";

export const invitationService = {
  /**
   * Validate an invitation token before showing the activation form
   * @param {string} token
   */
  async verifyInvitation(token) {
    const response = await api.get("/admin/invitations/verify", {
      params: { token }
    });
    return response.data;
  },

  /**
   * Accept an invitation and set password
   * @param {{ token: string, password: string, confirmPassword: string }} data
   */
  async acceptInvitation(data) {
    const response = await api.post("/admin/invitations/accept", data);
    return response.data;
  }
};

export default invitationService;
