import mongoose from "mongoose";
import { z } from "zod";

export const fail = (status, message) => Object.assign(new Error(message), { statusCode: status });
export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid record ID");
export const idParams = z.object({ id: objectId });
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).default(""),
  status: z.string().max(30).default("all")
});
export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const articleLookup = (slug) => mongoose.isValidObjectId(slug) ? { $or: [{ slug }, { _id: slug }] } : { slug };
export const paginate = async (model, filter, query, populate = null, select = null) => {
  const { page, limit } = query;
  let request = model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit);
  if (populate) request = request.populate(populate);
  if (select) request = request.select(select);
  const [data, total] = await Promise.all([request.lean(), model.countDocuments(filter)]);
  return { success: true, data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};
