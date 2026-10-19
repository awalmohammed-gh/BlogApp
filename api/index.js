import app from "../server/src/app.js";
import connectDatabase from "../server/src/config/database.js";

/**
 * Vercel Serverless Function entry point
 * Bridges Vercel serverless requests with Express & Mongoose
 */
export default async function handler(req, res) {
  try {
    // 1. Ensure MongoDB connection is ready (uses connection caching)
    await connectDatabase();

    // 2. Normalize req.url so Express routes match reliably
    if (
      req.url &&
      !req.url.startsWith("/api") &&
      !req.url.startsWith("/sitemap.xml") &&
      !req.url.startsWith("/robots.txt")
    ) {
      req.url = `/api${req.url}`;
    }

    // 3. Delegate execution to Express app
    return app(req, res);
  } catch (error) {
    console.error("[Vercel Serverless Function Error]:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to connect to database or internal server error.",
        error: process.env.NODE_ENV === "production" ? undefined : error.message,
      });
    }
  }
}
