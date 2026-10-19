import env from "../config/env.js";

/**
 * Standard cookie configuration options
 */
export const getCookieOptions = () => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? "none" : "lax",
  path: "/",
  maxAge: 8 * 60 * 60 * 1000 // 8 hours in milliseconds
});

/**
 * Attach the HTTP-only JWT authentication cookie to Express response
 * @param {import("express").Response} res
 * @param {string} token
 */
export const setAuthCookie = (res, token) => {
  res.cookie(env.COOKIE_NAME, token, getCookieOptions());
};

/**
 * Clear the HTTP-only JWT authentication cookie
 * @param {import("express").Response} res
 */
export const clearAuthCookie = (res) => {
  const options = getCookieOptions();
  delete options.maxAge;
  res.clearCookie(env.COOKIE_NAME, options);
};

export default { getCookieOptions, setAuthCookie, clearAuthCookie };
