import { z } from "zod";
import mongoose from "mongoose";
import { NOTIFICATION_TYPES } from "../models/Notification.js";

const objectIdSchema = z
  .string()
  .refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid MongoDB ObjectId"
  });

export const getNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  type: z.enum(Object.values(NOTIFICATION_TYPES)).optional(),
  isRead: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  status: z.enum(["active", "archived"]).default("active"),
  sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export const notificationIdParamSchema = z.object({
  id: objectIdSchema
});

export const bulkDeleteNotificationsSchema = z.object({
  notificationIds: z
    .array(objectIdSchema)
    .min(1, "At least one notification ID must be selected")
    .max(100, "Cannot delete more than 100 notifications in a single batch")
});

export default {
  getNotificationsQuerySchema,
  notificationIdParamSchema,
  bulkDeleteNotificationsSchema
};
