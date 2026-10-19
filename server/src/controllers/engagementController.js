import Article from "../models/Article.js";
import ArticleComment from "../models/ArticleComment.js";
import ContactSubmission from "../models/ContactSubmission.js";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import notificationService from "../services/notificationService.js";
import { getSettings, updateSettings } from "../services/settingsService.js";
import { emailConfigured, sendEmail, newToken, hashToken, frontendLink } from "../services/emailService.js";
import { articleLookup, fail, paginate, escapeRegex } from "../utils/http.js";
import * as schemas from "../validations/engagementValidation.js";
import { pageQuery, idParams } from "../utils/http.js";

const publishedArticle = async (slug) => {
  const article = await Article.findOne({ ...articleLookup(slug), status: "published", publishedAt: { $lte: new Date() }, deletedAt: null });
  if (!article) throw fail(404, "Published article not found.");
  return article;
};
const notify = async (data) => {
  try { await notificationService.notifyRoles({ roles: ["editor", "super_admin"], ...data }); }
  catch { console.error("[Engagement] Staff notification could not be created."); }
};
export const listPublicComments = async (req, res) => {
  const { slug } = schemas.slugParams.parse(req.params);
  const query = pageQuery.parse(req.query);
  const article = await publishedArticle(slug);
  const result = await paginate(ArticleComment, { articleId: article._id, status: "approved" }, query, null, "_id articleId parentCommentId commenterName content createdAt");
  res.json({ ...result, commentsEnabled: (await getSettings()).values.publishing.enableComments && article.commentsEnabled !== false });
};
export const submitComment = async (req, res) => {
  const { slug } = schemas.slugParams.parse(req.params);
  const body = schemas.commentBody.parse(req.body);
  const article = await publishedArticle(slug);
  if (!(await getSettings()).values.publishing.enableComments || article.commentsEnabled === false) throw fail(403, "Comments are currently disabled.");
  if (body.parentCommentId && !await ArticleComment.exists({ _id: body.parentCommentId, articleId: article._id, status: "approved" })) throw fail(400, "Reply must refer to an approved comment on this article.");
  const comment = await ArticleComment.create({ articleId: article._id, commenterName: body.name, commenterEmail: body.email, content: body.content, parentCommentId: body.parentCommentId || null, status: "pending" });
  await notify({ type: "comment_pending", title: "Comment awaiting moderation", message: `A reader commented on ${article.title}`.slice(0, 500), entityType: "comment", entityId: comment._id, actionUrl: "/admin/comments", eventKeyPrefix: `comment:${comment._id}:pending` });
  res.status(201).json({ success: true, message: "Your comment has been submitted for moderation." });
};
export const listAdminComments = async (req, res) => {
  const query = schemas.commentQuery.parse(req.query);
  const filter = query.status === "all" ? {} : { status: query.status };
  if (query.articleId) filter.articleId = query.articleId;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i");
    const articles = await Article.find({ title: regex }).select("_id").limit(200).lean();
    filter.$or = [{ commenterName: regex }, { content: regex }, { articleId: { $in: articles.map((a) => a._id) } }];
  }
  const result = await paginate(ArticleComment, filter, query, [
    { path: "articleId", select: "title slug status" },
    { path: "moderatedBy", select: "name" },
    { path: "parentCommentId", select: "commenterName content" }
  ]);
  const counts = await ArticleComment.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  res.json({ ...result, counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
};
export const moderateComment = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = schemas.moderationBody.parse(req.body);
  const comment = await ArticleComment.findByIdAndUpdate(id, { $set: { status: body.status, moderationReason: body.reason, moderatedBy: req.admin._id, moderatedAt: new Date() } }, { new: true, runValidators: true });
  if (!comment) throw fail(404, "Comment not found.");
  await AdminAuditLog.record({ actorId: req.admin._id, action: "COMMENT_MODERATED", metadata: { commentId: id, status: body.status } });
  res.json({ success: true, data: comment });
};
export const submitContact = async (req, res) => {
  const { website: _website, ...body } = schemas.contactBody.parse(req.body);
  const submission = await ContactSubmission.create(body);
  await notify({ type: "contact_received", title: "New contact enquiry", message: body.subject || "A visitor submitted an enquiry.", entityType: "contact_submission", entityId: submission._id, actionUrl: "/admin/enquiries", eventKeyPrefix: `contact:${submission._id}` });
  res.status(201).json({ success: true, message: "Your message has been received successfully." });
};
export const listContacts = async (req, res) => {
  const query = schemas.contactQuery.parse(req.query);
  const filter = query.status === "all" ? {} : { status: query.status };
  if (query.search) filter.$or = ["name", "email", "subject", "message"].map((key) => ({ [key]: new RegExp(escapeRegex(query.search), "i") }));
  const [result, counts] = await Promise.all([
    paginate(ContactSubmission, filter, query, { path: "reviewedBy", select: "name" }),
    ContactSubmission.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
  ]);
  res.json({ ...result, counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
};
export const getContact = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const data = await ContactSubmission.findById(id).populate("reviewedBy", "name").lean();
  if (!data) throw fail(404, "Enquiry not found.");
  res.json({ success: true, data });
};
export const updateContact = async (req, res) => {
  const { id } = idParams.parse(req.params);
  const { status } = schemas.contactStatus.parse(req.body);
  const data = await ContactSubmission.findByIdAndUpdate(id, { $set: { status, reviewedBy: req.admin._id, reviewedAt: new Date() } }, { new: true, runValidators: true }).populate("reviewedBy", "name");
  if (!data) throw fail(404, "Enquiry not found.");
  await AdminAuditLog.record({ actorId: req.admin._id, action: "CONTACT_STATUS_UPDATED", metadata: { submissionId: id, status } });
  res.json({ success: true, data });
};
export const subscribe = async (req, res) => {
  const body = schemas.subscribeBody.parse(req.body);
  try {
    await NewsletterSubscriber.updateOne({ email: body.email }, { $setOnInsert: { email: body.email, consentRecordedAt: new Date(), source: body.source } }, { upsert: true, runValidators: true });
  } catch (error) { if (error.code !== 11000) throw error; }
  const verification = newToken(), unsubscribe = newToken();
  const subscriber = await NewsletterSubscriber.findOneAndUpdate({ email: body.email, status: "pending_verification", $or: [{ emailAttemptedAt: null }, { emailAttemptedAt: { $lt: new Date(Date.now() - 60000) } }] }, { $set: { verificationHash: hashToken(verification), verificationExpiresAt: new Date(Date.now() + 24 * 3600000), unsubscribeHash: hashToken(unsubscribe), emailAttemptedAt: new Date() } }, { new: true });
  if (subscriber) {
    const result = await sendEmail({ to: subscriber.email, subject: "Confirm your Nsemra News subscription", text: `Confirm your subscription within 24 hours: ${frontendLink("/newsletter/confirm", verification)}\n\nCancel this request or unsubscribe: ${frontendLink("/newsletter/unsubscribe", unsubscribe)}\nIf you did not request this, ignore this email.` });
    await subscriber.updateOne({ $set: { emailStatus: result.status, emailMessageId: result.messageId || "", emailError: result.error || "" } });
  }
  res.json({ success: true, message: emailConfigured() ? "Your request has been recorded. If verification is needed, check your inbox. You will only be subscribed after confirming." : "Your request has been saved. Email verification is currently unavailable; subscriptions remain pending until verified." });
};
export const confirmSubscriber = async (req, res) => {
  const { token } = schemas.tokenBody.parse(req.body);
  const data = await NewsletterSubscriber.findOneAndUpdate({ verificationHash: hashToken(token), verificationExpiresAt: { $gt: new Date() }, status: "pending_verification" }, { $set: { status: "active", confirmedAt: new Date() }, $unset: { verificationHash: 1, verificationExpiresAt: 1 } }, { new: true });
  if (!data) throw fail(400, "This verification link is invalid, expired, or already used.");
  res.json({ success: true, message: "Your email is verified and your subscription is active." });
};
export const unsubscribe = async (req, res) => {
  const { token } = schemas.tokenBody.parse(req.body);
  const data = await NewsletterSubscriber.findOneAndUpdate({ unsubscribeHash: hashToken(token), status: { $ne: "unsubscribed" } }, { $set: { status: "unsubscribed", unsubscribedAt: new Date() }, $unset: { verificationHash: 1, verificationExpiresAt: 1 } });
  if (!data && !await NewsletterSubscriber.exists({ unsubscribeHash: hashToken(token), status: "unsubscribed" })) throw fail(400, "Invalid unsubscribe link.");
  res.json({ success: true, message: "You have been unsubscribed." });
};
export const listSubscribers = async (req, res) => {
  const query = schemas.subscriberQuery.parse(req.query);
  const filter = query.status === "all" ? {} : { status: query.status };
  if (query.search) filter.email = new RegExp(escapeRegex(query.search), "i");
  const result = await paginate(NewsletterSubscriber, filter, query, null, "email status source subscribedAt confirmedAt unsubscribedAt consentRecordedAt emailStatus createdAt");
  const counts = await NewsletterSubscriber.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
  res.json({ ...result, counts: Object.fromEntries(counts.map((c) => [c._id, c.count])) });
};
export const readSettings = async (req, res) => {
  res.set("Cache-Control", "no-store");
  const doc = await getSettings();
  res.json({ success: true, data: { values: doc.values, version: doc.version } });
};
export const saveSettings = async (req, res) => {
  const data = await updateSettings(schemas.settingsBody.parse(req.body), req.admin._id);
  res.json({ success: true, data: { values: data.values, version: data.version } });
};
