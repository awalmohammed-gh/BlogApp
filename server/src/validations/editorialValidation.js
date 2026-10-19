import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid MongoDB ObjectId"
});

export const submitArticleSchema = z.object({
  submissionNote: z
    .string()
    .trim()
    .max(1000, "Submission note cannot exceed 1000 characters")
    .optional()
    .default(""),
  changeSummary: z
    .string()
    .trim()
    .max(300, "Change summary cannot exceed 300 characters")
    .optional()
    .default("Submitted for editorial review")
});

export const assignReviewerSchema = z.object({
  editorId: objectIdSchema
});

export const approveSubmissionSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .max(2000, "Review note cannot exceed 2000 characters")
    .optional()
    .default(""),
  isOverride: z.boolean().optional().default(false),
  overrideReason: z.string().trim().max(500).optional()
});

export const requestChangesSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(5, "A clear explanation of required changes is required (at least 5 characters)")
    .max(2000, "Review note cannot exceed 2000 characters")
});

export const rejectSubmissionSchema = z.object({
  reviewNote: z
    .string()
    .trim()
    .min(5, "A rejection rationale is required (at least 5 characters)")
    .max(2000, "Review note cannot exceed 2000 characters")
});

export const addEditorialCommentSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Comment message cannot be empty")
    .max(3000, "Comment cannot exceed 3000 characters"),
  type: z.enum(["feedback", "correction_request", "note"]).optional().default("feedback"),
  parentCommentId: objectIdSchema.optional().nullable(),
  anchor: z.any().optional()
});

export const editorialQueueQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
  status: z
    .enum(["all", "pending", "in_review", "changes_requested", "approved", "rejected", "completed"])
    .default("all"),
  search: z.string().trim().default(""),
  assignedTo: z.string().trim().default("all"),
  category: z.string().trim().default("all"),
  sortBy: z.enum(["submittedAt", "updatedAt", "status", "createdAt"]).default("submittedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export default {
  submitArticleSchema,
  assignReviewerSchema,
  approveSubmissionSchema,
  requestChangesSchema,
  rejectSubmissionSchema,
  addEditorialCommentSchema,
  editorialQueueQuerySchema
};
