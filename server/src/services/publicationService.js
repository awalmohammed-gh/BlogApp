import mongoose from "mongoose";
import crypto from "node:crypto";
import Article from "../models/Article.js";
import ArticleRevision from "../models/ArticleRevision.js";
import Notification from "../models/Notification.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { getSettings } from "./settingsService.js";
import { fail } from "../utils/http.js";
import { invalidatePublicReads } from "../middleware/publicReadCache.js";
import { readingMinutes } from "../utils/readingMinutes.js";

export const schedulePublication = async (articleId, revisionId, date, adminId) => {
  if (!(await getSettings()).values.publishing.allowScheduledArticles) throw fail(403, "Scheduled publishing is disabled in settings.");
  if (!date || !Number.isFinite(date.getTime()) || date <= new Date()) throw fail(400, "Choose a future publication time.");
  const revision = await ArticleRevision.findOne({ _id: revisionId, articleId, isApproved: true });
  if (!revision) throw fail(409, "An approved revision is required before scheduling.");
  const article = await Article.findOneAndUpdate({ _id: articleId, status: { $ne: "archived" }, deletedAt: null }, { $set: {
    status: "scheduled", scheduledAt: date, scheduledRevision: revision._id, scheduleToken: crypto.randomUUID(),
    scheduleLease: null, scheduleLeaseUntil: null, scheduleRetryAt: null, scheduleAttempts: 0, scheduleFailure: "", scheduleFailedAt: null, updatedBy: adminId
  }, $inc: { __v: 1 } }, { new: true });
  if (!article) throw fail(409, "Archived articles cannot be scheduled.");
  return article;
};

// Manual publication and scheduled publication commit the article, immutable
// revision pointer, audit event and author notification in the same transaction.
export const publishApprovedRevision = async ({ articleId, revisionId, adminId = null, now = new Date(), lease = null }) => {
  const session = await mongoose.startSession();
  let result;
  try {
    await session.withTransaction(async () => {
      const article = await Article.findById(articleId).session(session);
      if (!article || article.status === "archived" || article.deletedAt) throw fail(409, "Article is not eligible for publication.");
      if (lease && (article.status !== "scheduled" || article.scheduleLease !== lease || article.scheduleLeaseUntil <= now || !article.scheduledAt || article.scheduledAt > now)) throw fail(409, "Schedule was cancelled, changed or claimed by another worker.");
      const target = lease ? (article.scheduledRevision || article.publishedRevision) : revisionId;
      const revision = await ArticleRevision.findOne({ _id: target, articleId, isApproved: true }).session(session);
      if (!revision) throw fail(422, "The scheduled revision is missing or its approval was revoked.");
      if (!revision.title?.trim() || !revision.category || !revision.content?.replace(/<[^>]*>/g, "").trim()) throw fail(422, "The approved revision is incomplete.");
      if (article.status === "published" && String(article.publishedRevision) === String(revision._id)) { result = article; return; }
      await ArticleRevision.updateMany({ articleId, isPublished: true }, { $set: { isPublished: false } }, { session });
      revision.isPublished = true;
      await revision.save({ session });
      const publishedAt = lease ? new Date(article.scheduledAt) : (article.publishedAt || now);
      article.status = "published";
      article.publishedRevision = revision._id;
      article.editorialStatus = "approved";
      article.publishedAt = publishedAt;
      article.slug = revision.slug;
      article.category = revision.category;
      article.tags = revision.tags;
      article.publicReadingMinutes = readingMinutes(revision.content);
      article.scheduledAt = null;
      article.scheduledRevision = null;
      article.scheduleLease = null;
      article.scheduleLeaseUntil = null;
      article.scheduleRetryAt = null;
      article.scheduleFailure = "";
      if (adminId) article.updatedBy = adminId;
      await article.save({ session });
      const eventKey = `article:${article._id}:revision:${revision._id}:published`;
      await Notification.updateOne({ recipientId: article.author, eventKey }, { $setOnInsert: {
        recipientId: article.author, actorId: adminId, eventKey, type: "article_published", title: lease ? "Scheduled Article Published" : "Article Published",
        message: `Your article "${revision.title}" is now live on Nsemra News.`.slice(0, 500), entityType: "article", entityId: article._id,
        actionUrl: "/admin/articles", metadata: { revisionId: revision._id }
      } }, { upsert: true, session });
      await AdminAuditLog.create([{ actorId: adminId, action: "ARTICLE_PUBLISHED", metadata: { articleId: article._id, revisionId: revision._id, scheduled: Boolean(lease), publishedAt } }], { session });
      result = article;
    });
    invalidatePublicReads();
    return result;
  } finally { await session.endSession(); }
};
