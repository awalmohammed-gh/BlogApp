import env from "../config/env.js";
import { verifyAdminToken } from "../utils/jwt.js";
import Admin from "../models/Admin.js";

/**
 * Express middleware to authenticate administrators via HTTP-only JWT cookies
 */
export const adminAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in to access the newsroom."
      });
    }

    let payload;
    try {
      payload = verifyAdminToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Your administrator session has expired. Please log in again."
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid authentication credentials."
      });
    }

    if (!payload?.sub) {
      return res.status(401).json({
        success: false,
        message: "Malformed administrator token."
      });
    }

    const admin = await Admin.findById(payload.sub).select("+passwordHash");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Administrator account no longer exists."
      });
    }

    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Administrator account has been deactivated. Contact the system administrator."
      });
    }

    // Token version check for revocation
    if (typeof payload.tokenVersion === "number" && admin.tokenVersion !== payload.tokenVersion) {
      return res.status(401).json({
        success: false,
        message: "Session revoked. Please log in with your updated credentials."
      });
    }

    // Attach sanitized admin object and full document to request
    req.admin = admin.toSanitizedJSON();
    req.adminDoc = admin;

    next();
  } catch (error) {
    next(error);
  }
};

export const authenticateAdmin = adminAuth;
export default adminAuth;
