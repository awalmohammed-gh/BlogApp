import { z } from "zod";
import { ADVERTISEMENT_PLACEMENTS, ADVERTISEMENT_STATUSES } from "../models/Advertisement.js";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const safeUrlRegex = /^https?:\/\/[^\s$.?#].[^\s]*$/i;

export const createAdvertisementSchema = z
  .object({
    campaignName: z
      .string({ required_error: "Campaign name is required" })
      .trim()
      .min(2, "Campaign name must be at least 2 characters")
      .max(150, "Campaign name cannot exceed 150 characters"),
    advertiserName: z
      .string()
      .trim()
      .max(150, "Advertiser name cannot exceed 150 characters")
      .optional()
      .default(""),
    headline: z
      .string({ required_error: "Headline is required" })
      .trim()
      .min(2, "Headline must be at least 2 characters")
      .max(200, "Headline cannot exceed 200 characters"),
    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional()
      .default(""),
    media: z
      .string({ required_error: "Media asset is required" })
      .trim()
      .regex(objectIdRegex, "Invalid media ID format"),
    buttonText: z
      .string()
      .trim()
      .max(50, "Button text cannot exceed 50 characters")
      .optional()
      .default("Learn More"),
    destinationUrl: z
      .string({ required_error: "Destination URL is required" })
      .trim()
      .refine(
        (val) => {
          if (!val) return false;
          if (/^javascript:/i.test(val) || /^data:/i.test(val) || /^vbscript:/i.test(val)) {
            return false;
          }
          return safeUrlRegex.test(val);
        },
        { message: "Destination URL must be a valid, secure web address (http:// or https://)" }
      ),
    placement: z.enum(ADVERTISEMENT_PLACEMENTS, {
      errorMap: () => ({ message: "Invalid advertisement placement location" })
    }),
    status: z
      .enum(ADVERTISEMENT_STATUSES, {
        errorMap: () => ({ message: "Invalid advertisement status" })
      })
      .optional()
      .default("draft"),
    startDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid start date format"
      }),
    endDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid end date format"
      }),
    priority: z.coerce.number().min(0).max(100).optional().default(0)
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be strictly later than start date",
      path: ["endDate"]
    }
  );

export const updateAdvertisementSchema = z
  .object({
    campaignName: z
      .string()
      .trim()
      .min(2, "Campaign name must be at least 2 characters")
      .max(150, "Campaign name cannot exceed 150 characters")
      .optional(),
    advertiserName: z
      .string()
      .trim()
      .max(150, "Advertiser name cannot exceed 150 characters")
      .optional(),
    headline: z
      .string()
      .trim()
      .min(2, "Headline must be at least 2 characters")
      .max(200, "Headline cannot exceed 200 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, "Description cannot exceed 1000 characters")
      .optional(),
    media: z
      .string()
      .trim()
      .regex(objectIdRegex, "Invalid media ID format")
      .optional(),
    buttonText: z
      .string()
      .trim()
      .max(50, "Button text cannot exceed 50 characters")
      .optional(),
    destinationUrl: z
      .string()
      .trim()
      .refine(
        (val) => {
          if (!val) return true;
          if (/^javascript:/i.test(val) || /^data:/i.test(val) || /^vbscript:/i.test(val)) {
            return false;
          }
          return safeUrlRegex.test(val);
        },
        { message: "Destination URL must be a valid, secure web address (http:// or https://)" }
      )
      .optional(),
    placement: z.enum(ADVERTISEMENT_PLACEMENTS).optional(),
    status: z.enum(ADVERTISEMENT_STATUSES).optional(),
    startDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid start date format"
      }),
    endDate: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || !isNaN(Date.parse(val)), {
        message: "Invalid end date format"
      }),
    priority: z.coerce.number().min(0).max(100).optional()
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) > new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be strictly later than start date",
      path: ["endDate"]
    }
  );

export const advertisementQuerySchema = z.object({
  search: z.string().trim().optional(),
  placement: z.string().trim().optional(),
  status: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z
    .enum(["createdAt", "startDate", "endDate", "priority", "campaignName"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});
