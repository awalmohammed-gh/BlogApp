import { hasPermission } from "../config/permissions.js";

/**
 * Middleware to enforce granular role-based permissions
 * @param {string} requiredPermission
 */
export const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access this resource."
      });
    }

    if (!hasPermission(req.admin.role, requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to perform this action."
      });
    }

    next();
  };
};

export default requirePermission;
