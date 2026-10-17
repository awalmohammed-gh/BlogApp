import api from "../../api/axios";

export const adminAuthService = {
  /**
   * Log in an administrator with email and password
   * @param {{ email: string, password: string }} credentials
   */
  async login(credentials) {
    const response = await api.post("/admin/auth/login", credentials);
    return response.data;
  },

  /**
   * Retrieve the currently authenticated administrator session
   */
  async getMe() {
    const response = await api.get("/admin/auth/me");
    return response.data;
  },

  /**
   * Log out the administrator and clear the session cookie
   */
  async logout() {
    const response = await api.post("/admin/auth/logout");
    return response.data;
  },
};

export default adminAuthService;
