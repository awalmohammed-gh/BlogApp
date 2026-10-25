import api from "../../api/axios";

export const adminAuthService = {
  /**
   * Check if a verified administrator exists in the system
   * @returns {Promise<{ success: boolean, initialized: boolean, unverifiedEmail?: string | null }>}
   */
  async getStatus() {
    const response = await api.get("/admin/auth/status");
    return response.data;
  },

  /**
   * Step 1: Register initial unverified administrator and dispatch 6-digit OTP
   * @param {{ name: string, email: string, password: string }} data
   */
  async setupAdmin(data) {
    const response = await api.post("/admin/auth/setup", data);
    return response.data;
  },

  /**
   * Step 2: Verify 6-digit OTP to permanently lock registration and authenticate
   * @param {{ email: string, otp: string }} data
   */
  async verifyOtp(data) {
    const response = await api.post("/admin/auth/verify-otp", data);
    return response.data;
  },

  /**
   * Request a fresh 6-digit OTP during pending verification
   * @param {{ email: string }} data
   */
  async resendOtp(data) {
    const response = await api.post("/admin/auth/resend-otp", data);
    return response.data;
  },

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
