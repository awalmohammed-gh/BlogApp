import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createTagSchema = z
  .object({
    name: z
      .string({ required_error: "Tag name is required" })
      .trim()
      .min(2, "Tag name must be at least 2 characters")
      .max(80, "Tag name cannot exceed 80 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens (e.g. artificial-intelligence)")
      .max(100, "Slug cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional()
      .default(""),
    status: z
      .enum(["active", "inactive", "archived"], {
        errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'archived'" })
      })
      .optional()
      .default("active")
  })
  .strict();

export const updateTagSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Tag name must be at least 2 characters")
      .max(80, "Tag name cannot exceed 80 characters")
      .optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens")
      .max(100, "Slug cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional(),
    status: z
      .enum(["active", "inactive", "archived"], {
        errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'archived'" })
      })
      .optional()
  })
  .strict();

export const changeTagStatusSchema = z
  .object({
    status: z.enum(["active", "inactive", "archived"], {
      errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'archived'" })
    })
  })
  .strict();

export const tagQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(""),
  status: z.enum(["all", "active", "inactive", "archived"]).default("all"),
  sortBy: z.enum(["name", "createdAt", "updatedAt", "status"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

export default {
  createTagSchema,
  updateTagSchema,
  changeTagStatusSchema,
  tagQuerySchema
};
