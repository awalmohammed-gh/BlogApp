import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Generate a signed JWT for an administrator session
 * @param {Object} admin Admin document or sanitized object
 * @returns {string} Signed JWT
 */
export const signAdminToken = (admin) => {
  const payload = {
    sub: admin._id ? admin._id.toString() : admin.id,
    tokenVersion: typeof admin.tokenVersion === "number" ? admin.tokenVersion : 0,
    role: admin.role
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.JWT_EXPIRES_IN,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
};

/**
 * Verify an administrator JWT
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export const verifyAdminToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE
  });
};

export default { signAdminToken, verifyAdminToken };
