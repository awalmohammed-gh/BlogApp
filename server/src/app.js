import express from "express";
import schedulerRoutes from "./routes/schedulerRoutes.js";
import { publicCommentRouter, publicEngagementRouter, adminEngagementRouter } from "./routes/engagementRoutes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { invalidatePublicReads } from "./middleware/publicReadCache.js";

import env from "./config/env.js";
import adminAuthRoutes from "./routes/adminAuthRoutes.js";
import adminProfileRoutes from "./routes/adminProfileRoutes.js";
import adminStaffRoutes from "./routes/adminStaffRoutes.js";
import adminInvitationRoutes from "./routes/adminInvitationRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import tagRoutes from "./routes/tagRoutes.js";
import adminArticleRoutes from "./routes/adminArticleRoutes.js";
import adminMediaRoutes from "./routes/adminMediaRoutes.js";
import adminEditorialRoutes from "./routes/editorialRoutes.js";
import publicArticleRoutes from "./routes/publicArticleRoutes.js";
import adminAdvertisementRoutes from "./routes/adminAdvertisementRoutes.js";
import adminSitePageRoutes from "./routes/adminSitePageRoutes.js";
import publicAdvertisementRoutes from "./routes/publicAdvertisementRoutes.js";
import publicSitePageRoutes from "./routes/publicSitePageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import publicAnalyticsRoutes from "./routes/publicAnalyticsRoutes.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoutes.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { getPublicSiteStats } from "./controllers/publicStatsController.js";
import { mountPublicFrontend } from "./middleware/publicFrontend.js";


const app = express();
app.disable("x-powered-by");
app.set("trust proxy", process.env.TRUST_PROXY === "1" ? 1 : false);
app.use(compression({ threshold:1024, filter:(req,res)=>!req.path.startsWith("/api/admin") && compression.filter(req,res) }));
app.use("/api/admin", (req,res,next)=>{
  res.set("Cache-Control","no-store");
  if(!["GET","HEAD","OPTIONS"].includes(req.method))res.on("finish",()=>{if(res.statusCode<400)invalidatePublicReads();});
  next();
});

// Configure CORS
const allowedOrigins = [
  env.FRONTEND_URL,
  ...(!env.isProduction ? ["http://localhost:5173", "http://127.0.0.1:5173"] : [])
].filter(Boolean);

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  // Allow all Vercel deployment and preview URLs (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9_\-.]+\.vercel\.app$/.test(origin)) return true;
  if (process.env.VERCEL_URL && (origin === `https://${process.env.VERCEL_URL}` || origin === `http://${process.env.VERCEL_URL}`)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    maxAge: 600
  })
);

// Body parsing with safe size limit
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Cookie parser for HTTP-only JWTs
app.use(cookieParser());

// Basic Origin Verification middleware for CSRF mitigation on state-changing requests
app.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const origin = req.headers.origin;
    if (origin && !isAllowedOrigin(origin)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Request origin is not permitted."
      });
    }
  }
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "Nsemra News Backend"
  });
});

// Mount Admin APIs
app.use("/api/internal", schedulerRoutes);
app.use("/api/admin", adminEngagementRouter);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/profile", adminProfileRoutes);
app.use("/api/admin/staff", adminStaffRoutes);
app.use("/api/admin/invitations", adminInvitationRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/tags", tagRoutes);
app.use("/api/admin/articles", adminArticleRoutes);
app.use("/api/admin/media", adminMediaRoutes);
app.use("/api/admin/editorial", adminEditorialRoutes);
app.use("/api/admin/advertisements", adminAdvertisementRoutes);
app.use("/api/admin/pages", adminSitePageRoutes);
app.use("/api/admin/notifications", notificationRoutes);
app.use("/api/admin/analytics", adminAnalyticsRoutes);

// Mount Public News, CMS & Telemetry APIs
app.use("/api/articles/:slug/comments", publicCommentRouter);
app.use("/api", publicEngagementRouter);
app.use("/api/articles", publicArticleRoutes);
app.use("/api/advertisements", publicAdvertisementRoutes);
app.use("/api/site/pages", publicSitePageRoutes);
app.get("/api/site/stats", getPublicSiteStats);
app.use("/api/analytics", publicAnalyticsRoutes);

// 404 handler
mountPublicFrontend(app);
app.use(notFoundHandler);


// Centralized error handler
app.use(errorHandler);

export default app;
