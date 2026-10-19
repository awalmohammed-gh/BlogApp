import { z } from "zod";
import mongoose from "mongoose";
import { MEDIA_FOLDER_KEYS, UPLOADABLE_FOLDER_KEYS } from "../config/media.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const mediaQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().default(""),
  folder: z.string().trim().refine((val) => !val || val === "all" || MEDIA_FOLDER_KEYS.includes(val), {
    message: "Invalid media folder"
  }).default("all"),
  mimeType: z.string().trim().default("all"),
  status: z.enum(["all", "active", "archived"]).default("active"),
  uploadedBy: z.string().trim().refine((val) => !val || val === "all" || objectIdRegex.test(val), {
    message: "Invalid uploadedBy user ID"
  }).default("all"),
  sortBy: z.enum(["createdAt", "name", "size", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const updateMediaSchema = z.object({
  name: z.string().trim().min(1, "Display name cannot be empty").max(150, "Display name cannot exceed 150 characters").optional(),
  altText: z.string().trim().max(300, "Alt text cannot exceed 300 characters").optional(),
  caption: z.string().trim().max(500, "Caption cannot exceed 500 characters").optional(),
  folder: z.enum(MEDIA_FOLDER_KEYS, {
    errorMap: () => ({ message: "Invalid media folder" })
  }).optional()
}).strict();

export const uploadMediaBodySchema = z.object({
  folder: z.enum(UPLOADABLE_FOLDER_KEYS, {
    errorMap: () => ({ message: "Invalid or non-uploadable media folder" })
  }).default("general"),
  altText: z.string().trim().max(300).optional().default(""),
  caption: z.string().trim().max(500).optional().default(""),
  name: z.string().trim().max(150).optional()
});

export default {
  mediaQuerySchema,
  updateMediaSchema,
  uploadMediaBodySchema
};
