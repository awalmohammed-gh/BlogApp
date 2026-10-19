/**
 * Role-based authorization middleware
 * @param  {...string} allowedRoles
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required."
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Action requires one of [${allowedRoles.join(", ")}] roles.`
      });
    }

    next();
  };
};

export default requireRole;
