import { z } from "zod";
import { ALLOWED_PAGE_KEYS } from "../models/SitePage.js";

const safeUrlOrPathRegex = /^(https?:\/\/[^\s$.?#].[^\s]*|\/[a-zA-Z0-9_\-\/#]*)$/;

const sectionSchema = z.object({
  id: z.string({ required_error: "Section id is required" }).trim().min(1),
  type: z.enum([
    "hero",
    "promotional",
    "newsletter",
    "text_content",
    "call_to_action",
    "contact_info",
    "milestones",
    "core_values",
    "faqs",
    "custom_editorial"
  ]),
  order: z.coerce.number().int().default(0),
  enabled: z.boolean().default(true),
  data: z.record(z.any()).refine(
    (data) => {
      // Validate that buttonUrl / link fields do not contain javascript: or unsafe schemes
      const jsonStr = JSON.stringify(data);
      if (/javascript:/i.test(jsonStr) || /data:text\/html/i.test(jsonStr)) {
        return false;
      }
      return true;
    },
    { message: "Section data contains insecure script or URL protocols" }
  )
});

export const updatePageDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Page title must be at least 2 characters")
    .max(150, "Page title cannot exceed 150 characters")
    .optional(),
  sections: z.array(sectionSchema).min(1, "At least one content section is required"),
  changeSummary: z
    .string()
    .trim()
    .max(300, "Change summary cannot exceed 300 characters")
    .optional()
    .default("Updated page draft content"),
  expectedVersion: z.number().int().positive().optional() // for optimistic concurrency checks
});

export const publishPageSchema = z.object({
  changeSummary: z
    .string()
    .trim()
    .max(300, "Publication summary cannot exceed 300 characters")
    .optional()
    .default("Published page content"),
  sections: z.array(sectionSchema).optional() // optional direct publish
});

export const restoreRevisionSchema = z.object({
  version: z.coerce.number().int().positive({ message: "Valid revision version number is required" })
});
