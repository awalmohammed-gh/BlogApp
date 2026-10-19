import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createCategorySchema = z
  .object({
    name: z
      .string({ required_error: "Category name is required" })
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(80, "Category name cannot exceed 80 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(slugRegex, "Slug must be lowercase alphanumeric with hyphens (e.g. world-news)")
      .max(100, "Slug cannot exceed 100 characters")
      .optional()
      .or(z.literal("")),
    description: z
      .string()
      .trim()
      .max(500, "Description cannot exceed 500 characters")
      .optional()
      .default(""),
    color: z
      .string()
      .trim()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code (e.g. #2563EB)")
      .optional()
      .default("#2563EB"),
    status: z
      .enum(["active", "inactive", "archived"], {
        errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'archived'" })
      })
      .optional()
      .default("active"),
    displayOrder: z
      .coerce
      .number()
      .int("Display order must be an integer")
      .min(0, "Display order must be 0 or greater")
      .optional()
      .default(0)
  })
  .strict(); // Disallow unexpected/protected properties

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must be at least 2 characters")
      .max(80, "Category name cannot exceed 80 characters")
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
    color: z
      .string()
      .trim()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Color must be a valid hex code")
      .optional(),
    status: z
      .enum(["active", "inactive", "archived"], {
        errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'archived'" })
      })
      .optional(),
    displayOrder: z
      .coerce
      .number()
      .int("Display order must be an integer")
      .min(0, "Display order must be 0 or greater")
      .optional()
  })
  .strict();

export const changeCategoryStatusSchema = z
  .object({
    status: z.enum(["active", "inactive", "archived"], {
      errorMap: () => ({ message: "Status must be 'active', 'inactive', or 'archived'" })
    })
  })
  .strict();

export const categoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().default(""),
  status: z.enum(["all", "active", "inactive", "archived"]).default("all"),
  sortBy: z.enum(["name", "displayOrder", "createdAt", "updatedAt", "status"]).default("displayOrder"),
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});

export default {
  createCategorySchema,
  updateCategorySchema,
  changeCategoryStatusSchema,
  categoryQuerySchema
};
