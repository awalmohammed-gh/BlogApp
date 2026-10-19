import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid MongoDB ObjectId"
});

export const trackEventSchema = z.object({
  eventType: z.enum(["page_view", "article_view"], {
    errorMap: () => ({ message: "eventType must be 'page_view' or 'article_view'" })
  }),
  pageKey: z.string().max(50).optional().default("general"),
  articleSlug: z.string().max(250).optional(),
  articleId: objectIdSchema.optional(),
  referrer: z.string().max(500).optional().default(""),
  utmSource: z.string().max(100).optional().default(""),
  utmMedium: z.string().max(100).optional().default(""),
  utmCampaign: z.string().max(100).optional().default("")
});

export const analyticsQuerySchema = z.object({
  timeframe: z.enum(["today", "7d", "30d", "90d", "custom"]).default("30d"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(["views-desc", "views-asc", "recent", "oldest", "title"]).default("views-desc"),
  category: z.string().optional(),
  search: z.string().max(100).optional()
});

export const articleAnalyticsParamsSchema = z.object({
  id: objectIdSchema
});

export default {
  trackEventSchema,
  analyticsQuerySchema,
  articleAnalyticsParamsSchema
};
