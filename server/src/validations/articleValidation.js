import { z } from "zod";
import mongoose from "mongoose";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const objectIdSchema = z
  .string()
  .regex(objectIdRegex, "Invalid ObjectId format")
  .or(z.null());

const imageObjectSchema = z.object({
  media: z.string().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
    message: "media must be a valid MongoDB ID"
  }).optional().nullable(),
  fileId: z.string().optional().default(""),
  url: z.string().optional().default(""),
  name: z.string().optional().default(""),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  alt: z.string().optional().default("")
});

export const createArticleSchema = z
  .object({
    title: z
      .string({ required_error: "Article headline is required" })
      .trim()
      .min(3, "Article headline must be at least 3 characters")
      .max(200, "Article headline cannot exceed 200 characters"),
    subTitle: z
      .string()
      .trim()
      .max(300, "Subtitle cannot exceed 300 characters")
      .optional()
      .default(""),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens")
      .max(250, "Slug cannot exceed 250 characters")
      .optional()
      .or(z.literal("")),
    excerpt: z
      .string()
      .trim()
      .max(600, "Excerpt cannot exceed 600 characters")
      .optional()
      .default(""),
    content: z
      .string()
      .optional()
      .default("<p></p>"),
    featuredImage: imageObjectSchema
      .or(
        z.string().transform((url) => ({
          fileId: "",
          url: url || "",
          name: "",
          width: null,
          height: null,
          alt: ""
        }))
      )
      .optional()
      .default({ fileId: "", url: "", name: "", width: null, height: null, alt: "" }),
    category: z.string().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Category must be a valid MongoDB ID"
    }).optional().nullable(),
    tags: z
      .array(
        z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Tag ID must be a valid MongoDB ID"
        })
      )
      .optional()
      .default([]),
    author: z.string().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Author must be a valid MongoDB ID"
    }).optional().nullable(),
    status: z
      .enum(["draft", "pending_review", "scheduled", "published", "archived"], {
        errorMap: () => ({ message: "Invalid article status" })
      })
      .optional()
      .default("draft"),
    isFeatured: z.boolean().optional().default(false),
    isBreakingNews: z.boolean().optional().default(false),
    commentsEnabled: z.boolean().optional().default(true),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional().nullable(),
    seo: z
      .object({
        metaTitle: z.string().max(100).optional().default(""),
        metaDescription: z.string().max(300).optional().default(""),
        keywords: z.string().max(200).optional().default(""),
        canonicalUrl: z.string().url().optional().or(z.literal("")),
        ogTitle: z.string().max(100).optional().default(""),
        ogDescription: z.string().max(300).optional().default(""),
        ogImage: z.string().url().optional().or(z.literal(""))
      })
      .optional()
      .default({})
  })
  .strict();

export const updateArticleSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Article headline must be at least 3 characters")
      .max(200, "Article headline cannot exceed 200 characters")
      .optional(),
    subTitle: z
      .string()
      .trim()
      .max(300, "Subtitle cannot exceed 300 characters")
      .optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens")
      .max(250, "Slug cannot exceed 250 characters")
      .optional()
      .or(z.literal("")),
    excerpt: z
      .string()
      .trim()
      .max(600, "Excerpt cannot exceed 600 characters")
      .optional(),
    content: z.string().optional(),
    featuredImage: imageObjectSchema
      .or(
        z.string().transform((url) => ({
          fileId: "",
          url: url || "",
          name: "",
          width: null,
          height: null,
          alt: ""
        }))
      )
      .optional(),
    category: z.string().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Category must be a valid MongoDB ID"
    }).optional().nullable(),
    tags: z
      .array(
        z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
          message: "Tag ID must be a valid MongoDB ID"
        })
      )
      .optional(),
    author: z.string().refine((val) => !val || mongoose.Types.ObjectId.isValid(val), {
      message: "Author must be a valid MongoDB ID"
    }).optional().nullable(),
    status: z
      .enum(["draft", "pending_review", "scheduled", "published", "archived"], {
        errorMap: () => ({ message: "Invalid article status" })
      })
      .optional(),
    isFeatured: z.boolean().optional(),
    isBreakingNews: z.boolean().optional(),
    commentsEnabled: z.boolean().optional(),
    // Last updatedAt the editor loaded; a mismatch means someone else saved first
    expectedUpdatedAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional(),
    scheduledAt: z.string().datetime({ offset: true }).or(z.string().datetime()).optional().nullable(),
    seo: z
      .object({
        metaTitle: z.string().max(100).optional(),
        metaDescription: z.string().max(300).optional(),
        keywords: z.string().max(200).optional(),
        canonicalUrl: z.string().url().optional().or(z.literal("")),
        ogTitle: z.string().max(100).optional(),
        ogDescription: z.string().max(300).optional(),
        ogImage: z.string().url().optional().or(z.literal(""))
      })
      .optional()
  })
  .strict();

export const scheduleArticleSchema = z.object({
  scheduledAt: z.string({ required_error: "Scheduled publication time is required" }).refine(
    (dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime()) && date.getTime() > Date.now();
    },
    { message: "Scheduled time must be a valid future date and time" }
  )
});

export const articleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(""),
  status: z.enum(["all", "draft", "pending_review", "scheduled", "published", "archived"]).default("all"),
  category: z.string().trim().default("all"),
  tag: z.string().trim().default("all"),
  author: z.string().trim().default("all"),
  sortBy: z.enum(["createdAt", "publishedAt", "views", "title", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const publicArticleQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(160).default(""),
  categories: z.string().max(500).optional(),
  category: z.string().trim().default("all"),
  tag: z.string().trim().default("all"),
  sortBy: z.enum(["publishedAt", "views", "title", "publicReadingMinutes"]).default("publishedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export default {
  createArticleSchema,
  updateArticleSchema,
  scheduleArticleSchema,
  articleQuerySchema,
  publicArticleQuerySchema
};
