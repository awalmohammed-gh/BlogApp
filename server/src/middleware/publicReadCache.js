import Article from "../models/Article.js";
import { invalidateCategoryCache } from "../controllers/categoryController.js";
import { invalidateTagCache } from "../controllers/tagController.js";

const entries = new Map();
let generation = 0;
export const invalidatePublicReads = () => {
  generation++;
  entries.clear();
  try { invalidateCategoryCache(); } catch {}
  try { invalidateTagCache(); } catch {}
};
const ttl = () => Number(process.env.PUBLIC_CACHE_TTL_MS ?? (process.env.NODE_ENV === "test" ? 0 : 60000));
const articleRows = (body) => {
  const data = body.data;
  const rows = Array.isArray(data) ? data : [data?.article, ...(data?.articles || []), ...(data?.relatedStories || [])];
  return rows.filter((row)=>row?._id && row.publishedAt).map((row)=>({ id:String(row._id), updatedAt:row.updatedAt ? new Date(row.updatedAt).getTime() : null }));
};

// This middleware is mounted on public read endpoints. It provides in-memory caching,
// HTTP Cache-Control with stale-while-revalidate, and visibility checks.
export async function publicReadCache(req,res,next) {
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  if (req.method !== "GET" || ttl() <= 0) return next();
  const key = req.originalUrl;
  const cached = entries.get(key);
  if (cached && cached.expires > Date.now()) {
    try {
      const visible = cached.rows.length ? await Article.find({ _id:{$in:cached.rows.map((row)=>row.id)}, status:"published", publishedAt:{$lte:new Date()}, deletedAt:null }).select("_id updatedAt").lean().maxTimeMS(5000) : [];
      if (visible.length === cached.rows.length && cached.rows.every((row)=>visible.some((current)=>String(current._id)===row.id && (!row.updatedAt || new Date(current.updatedAt).getTime()===row.updatedAt)))) {
        res.set("X-Public-Cache", "HIT"); return res.type("json").send(cached.json);
      }
    } catch (error) { return next(error); }
  }
  entries.delete(key);
  res.set("X-Public-Cache", "MISS");
  const version = generation;
  const json = res.json.bind(res);
  res.json = (body) => {
    if(res.statusCode===200 && body?.success && version===generation && !res.getHeader("Set-Cookie")) {
      if(entries.size>=100)entries.delete(entries.keys().next().value);
      entries.set(key,{ json:JSON.stringify(body),rows:articleRows(body),expires:Date.now()+ttl() });
    }
    return json(body);
  };
  next();
}
