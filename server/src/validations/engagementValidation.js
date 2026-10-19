import { z } from "zod";
import { objectId, pageQuery } from "../utils/http.js";
const text = (max) => z.string().trim().min(1).max(max);
const email = z.string().trim().toLowerCase().email().max(254);
// A hidden honeypot accompanies public forms. Genuine readers leave it empty.
const website = z.string().max(0, "Unable to accept this submission").optional();
export const slugParams = z.object({ slug: z.string().trim().min(1).max(200).regex(/^[a-zA-Z0-9-]+$/) });
export const commentBody = z.object({ name: text(100), email, content: text(2000), parentCommentId: objectId.nullable().optional(), website }).strict();
export const commentQuery = pageQuery.extend({ status: z.enum(["all", "pending", "approved", "rejected", "spam", "archived"]).default("all"), articleId: objectId.optional() });
export const moderationBody = z.object({ status: z.enum(["pending", "approved", "rejected", "spam", "archived"]), reason: z.string().trim().max(500).default("") }).strict();
export const contactBody = z.object({ name: text(100), email, subject: z.string().trim().max(200).default(""), department: z.enum(["newsroom", "advertising", "correction", "press", "general"]), message: text(5000), website }).strict();
export const contactQuery = pageQuery.extend({ status: z.enum(["all", "new", "in_progress", "resolved", "archived"]).default("all") });
export const contactStatus = z.object({ status: z.enum(["new", "in_progress", "resolved", "archived"]) }).strict();
export const subscribeBody = z.object({ email, consent: z.literal(true), source: z.enum(["homepage", "footer", "article"]).default("homepage"), website }).strict();
export const subscriberQuery = pageQuery.extend({ status: z.enum(["all", "pending_verification", "active", "unsubscribed"]).default("all") });
export const tokenBody = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
const url = z.string().trim().max(2000).url().refine((v) => /^https?:\/\//i.test(v)).or(z.literal(""));
export const settingsSections = {
  general: z.object({ siteName: text(100), tagline: z.string().trim().max(200), description: z.string().trim().max(1000), contactEmail: email.or(z.literal("")), contactPhone: z.string().trim().max(40), address: z.string().trim().max(300), timezone: z.string().max(80).refine((v) => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Use an IANA timezone, e.g. Africa/Accra"), dateFormat: z.enum(["MMMM D, YYYY", "YYYY-MM-DD", "DD/MM/YYYY"]) }).strict(),
  branding: z.object({
    primaryColor: z.string().regex(/^#[a-f\d]{6}$/i),
    brandBlue: z.string().regex(/^#[a-f\d]{6}$/i),
    // Logo and favicon are Media Library images (checked against the Media record on save)
    logoUrl: url.default(""),
    logoMediaId: objectId.or(z.literal("")).default(""),
    logoIncludesName: z.boolean().default(false),
    faviconUrl: url.default(""),
    faviconMediaId: objectId.or(z.literal("")).default("")
  }).strict(),
  publishing: z.object({ requireEditorialApproval: z.literal(true), moderateCommentsByDefault: z.literal(true), allowScheduledArticles: z.boolean(), enableComments: z.boolean(), articlesPerPage: z.number().int().min(1).max(50) }).strict(),
  seo: z.object({ defaultMetaTitle: text(150), defaultMetaDescription: z.string().trim().max(300), twitterHandle: z.string().trim().max(100) }).strict(),
  social: z.object({ twitter: url, facebook: url, linkedin: url, youtube: url, instagram: url }).strict()
};
export const settingsBody = z.discriminatedUnion("section", Object.entries(settingsSections).map(([section, values]) => z.object({ section: z.literal(section), values, version: z.number().int().min(0) }).strict()));
