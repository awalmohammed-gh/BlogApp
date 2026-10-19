import Admin from "../models/Admin.js";
import { signAdminToken } from "../utils/jwt.js";
import { setAuthCookie, clearAuthCookie } from "../utils/authCookies.js";

/**
 * Handle Admin Login
 * POST /api/admin/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Query admin explicitly selecting passwordHash
    const admin = await Admin.findOne({ email: normalizedEmail }).select("+passwordHash");

    // Generic response message to prevent email enumeration
    const invalidCredentialsMsg = "Invalid email or password.";

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg
      });
    }

    // Verify account status
    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your administrator account has been disabled. Please contact the senior bureau administrator."
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg
      });
    }

    // Update lastLoginAt
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT
    const token = signAdminToken(admin);

    // Set secure HTTP-only cookie
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      admin: admin.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current Authenticated Administrator Session
 * GET /api/admin/auth/me
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin
  });
};

/**
 * Handle Admin Logout
 * POST /api/admin/auth/logout
 */
export const logout = async (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
};

export default { login, getMe, logout };
