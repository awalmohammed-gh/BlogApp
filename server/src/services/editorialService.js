import mongoose from "mongoose";
import EditorialSubmission from "../models/EditorialSubmission.js";
import ArticleRevision from "../models/ArticleRevision.js";
import EditorialComment from "../models/EditorialComment.js";
import Article from "../models/Article.js";
import Admin from "../models/Admin.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { createRevisionSnapshot } from "./revisionService.js";
import notificationService from "./notificationService.js";

/**
 * Submit an article for editorial review with an immutable snapshot
 */
export const submitArticleForReview = async ({
  articleId,
  adminUser,
  submissionNote = "",
  changeSummary = "Submitted for editorial review"
}) => {
  const article = await Article.findById(articleId);
  if (!article) {
    const error = new Error("Article not found");
    error.status = 404;
    throw error;
  }

  // Ownership verification for authors
  if (adminUser.role === "author" && article.author.toString() !== adminUser._id.toString()) {
    const error = new Error("Forbidden: You are not authorized to submit this article");
    error.status = 403;
    throw error;
  }

  // Validate editorial completeness
  const cleanContent = (article.content || "").replace(/<[^>]*>?/gm, "").trim();
  if (!article.title || article.title.trim().length < 3) {
    const error = new Error("Article title must be at least 3 characters before submitting for review.");
    error.status = 400;
    throw error;
  }
  if (!article.category) {
    const error = new Error("A news category is required before submitting for review.");
    error.status = 400;
    throw error;
  }
  if (!cleanContent) {
    const error = new Error("Article body content cannot be empty.");
    error.status = 400;
    throw error;
  }

  // Check for conflicting active submission
  const existingActive = await EditorialSubmission.findOne({
    articleId,
    status: { $in: ["pending", "in_review"] }
  });
  if (existingActive) {
    const error = new Error("An active review submission is already in progress for this article.");
    error.status = 409;
    throw error;
  }

  // 1. Create immutable revision snapshot
  const revision = await createRevisionSnapshot({
    article,
    adminId: adminUser._id,
    changeSummary: changeSummary || `Revision v Snapshot`,
    submissionId: null
  });

  // 2. Create the editorial review submission
  const submission = await EditorialSubmission.create({
    articleId: article._id,
    revisionId: revision._id,
    submittedBy: adminUser._id,
    status: "pending",
    submissionNote: submissionNote || "",
    submittedAt: new Date()
  });

  // 3. Link submission to revision
  revision.submissionId = submission._id;
  await revision.save();

  // 4. Update Article editorial status
  article.currentSubmission = submission._id;
  article.editorialStatus = "pending";
  if (article.status !== "published") {
    article.status = "pending_review";
  }
  article.updatedBy = adminUser._id;
  await article.save();

  // 5. Record audit log
  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "ARTICLE_SUBMITTED_FOR_REVIEW",
    metadata: {
      articleId: article._id,
      submissionId: submission._id,
      revisionId: revision._id,
      version: revision.version,
      title: article.title
    }
  });

  // Notify Editors & Super Admins (excluding submitting author)
  try {
    await notificationService.notifyRoles({
      roles: ["editor", "super_admin"],
      excludeAdminIds: [adminUser._id],
      actorId: adminUser._id,
      type: notificationService.NOTIFICATION_TYPES.ARTICLE_SUBMITTED,
      title: "New Article Submitted",
      message: `"${article.title}" has been submitted for editorial review.`,
      entityType: "editorial_submission",
      entityId: submission._id,
      actionUrl: "/admin/editorial",
      metadata: {
        articleId: article._id,
        submissionId: submission._id,
        title: article.title
      },
      eventKeyPrefix: `submission:${submission._id}:submitted`
    });
  } catch (notifErr) {
    console.error("[EditorialNotification] Failed to dispatch submission alert:", notifErr.message);
  }

  return {
    submission,
    revision,
    article
  };
};

/**
 * Retrieve paginated editorial queue with filters, sorting, and search
 */
export const getEditorialQueue = async (query, adminUser) => {
  const { page, limit, status, search, assignedTo, category, sortBy, sortOrder } = query;
  const skip = (page - 1) * limit;

  const filter = {};

  // Status filtering
  if (status && status !== "all") {
    if (status === "completed") {
      filter.status = { $in: ["approved", "rejected"] };
    } else {
      filter.status = status;
    }
  }

  // Role scoping: Authors can only view their own submissions
  if (adminUser.role === "author") {
    filter.submittedBy = adminUser._id;
  } else if (assignedTo && assignedTo !== "all") {
    if (assignedTo === "unassigned") {
      filter.assignedTo = null;
    } else if (assignedTo === "me") {
      filter.assignedTo = adminUser._id;
    } else if (mongoose.Types.ObjectId.isValid(assignedTo)) {
      filter.assignedTo = assignedTo;
    }
  }

  // Build sorting
  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1
  };

  const [submissions, total] = await Promise.all([
    EditorialSubmission.find(filter)
      .populate({
        path: "articleId",
        select: "title slug category author status editorialStatus publishedRevision views",
        populate: [
          { path: "category", select: "name slug color" },
          { path: "author", select: "name email avatar role" }
        ]
      })
      .populate("revisionId")
      .populate("submittedBy", "name email role avatar")
      .populate("assignedTo", "name email role avatar")
      .populate("reviewedBy", "name email role avatar")
      .populate("approvedRevisionId", "version createdAt")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    EditorialSubmission.countDocuments(filter)
  ]);

  // If search query is provided, filter based on populated article title or author name
  let filteredSubmissions = submissions;
  if (search) {
    const lower = search.toLowerCase();
    filteredSubmissions = submissions.filter((sub) => {
      const titleMatch = sub.articleId?.title?.toLowerCase().includes(lower);
      const authorMatch = sub.submittedBy?.name?.toLowerCase().includes(lower);
      const categoryMatch = sub.articleId?.category?.name?.toLowerCase().includes(lower);
      return titleMatch || authorMatch || categoryMatch;
    });
  }

  return {
    submissions: filteredSubmissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

/**
 * Retrieve comprehensive editorial statistics from MongoDB
 */
export const getEditorialStats = async (adminUser) => {
  const authorScope = adminUser.role === "author" ? { submittedBy: adminUser._id } : {};

  const [
    pendingCount,
    inReviewCount,
    changesRequestedCount,
    approvedCount,
    rejectedCount,
    unassignedCount,
    myAssignedCount
  ] = await Promise.all([
    EditorialSubmission.countDocuments({ ...authorScope, status: "pending" }),
    EditorialSubmission.countDocuments({ ...authorScope, status: "in_review" }),
    EditorialSubmission.countDocuments({ ...authorScope, status: "changes_requested" }),
    EditorialSubmission.countDocuments({ ...authorScope, status: "approved" }),
    EditorialSubmission.countDocuments({ ...authorScope, status: "rejected" }),
    EditorialSubmission.countDocuments({ status: "pending", assignedTo: null }),
    adminUser.role !== "author"
      ? EditorialSubmission.countDocuments({ assignedTo: adminUser._id, status: { $in: ["pending", "in_review"] } })
      : 0
  ]);

  return {
    pendingReviews: pendingCount,
    inReview: inReviewCount,
    changesRequested: changesRequestedCount,
    approved: approvedCount,
    rejected: rejectedCount,
    completedReviews: approvedCount + rejectedCount,
    unassignedSubmissions: unassignedCount,
    myAssignedReviews: myAssignedCount
  };
};

/**
 * Retrieve a single submission with full relations
 */
export const getSubmissionById = async (submissionId, adminUser) => {
  const submission = await EditorialSubmission.findById(submissionId)
    .populate({
      path: "articleId",
      populate: [
        { path: "category", select: "name slug color" },
        { path: "tags", select: "name slug" },
        { path: "author", select: "name email avatar role" },
        { path: "publishedRevision", select: "version title createdAt isPublished" }
      ]
    })
    .populate("revisionId")
    .populate("submittedBy", "name email role avatar")
    .populate("assignedTo", "name email role avatar")
    .populate("reviewedBy", "name email role avatar")
    .populate("approvedRevisionId", "version createdAt");

  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  // Scoping check for authors
  if (adminUser.role === "author" && submission.submittedBy._id.toString() !== adminUser._id.toString()) {
    const error = new Error("Forbidden: You can only view your own article submissions");
    error.status = 403;
    throw error;
  }

  return submission;
};

/**
 * Atomically claim an unassigned submission for editorial review
 */
export const claimReview = async (submissionId, adminUser) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  // Self-review protection
  if (submission.submittedBy.toString() === adminUser._id.toString()) {
    const error = new Error("Self-review is not permitted: You cannot review an article you submitted.");
    error.status = 403;
    throw error;
  }

  // Atomic conditional claim to prevent race conditions
  const updatedSubmission = await EditorialSubmission.findOneAndUpdate(
    {
      _id: submissionId,
      status: "pending",
      assignedTo: null
    },
    {
      $set: {
        assignedTo: adminUser._id,
        status: "in_review",
        claimedAt: new Date()
      }
    },
    { new: true }
  )
    .populate("articleId")
    .populate("revisionId")
    .populate("submittedBy", "name email role avatar")
    .populate("assignedTo", "name email role avatar");

  if (!updatedSubmission) {
    const error = new Error(
      "This submission is no longer available to claim. It may have already been claimed or modified by another editor."
    );
    error.status = 409;
    throw error;
  }

  // Update Article editorial status
  await Article.findByIdAndUpdate(submission.articleId, {
    $set: { editorialStatus: "in_review" }
  });

  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "EDITORIAL_REVIEW_CLAIMED",
    metadata: {
      submissionId: updatedSubmission._id,
      articleId: updatedSubmission.articleId?._id,
      assignedTo: adminUser._id
    }
  });

  return updatedSubmission;
};

/**
 * Release an assigned submission back to the general queue
 */
export const releaseReview = async (submissionId, adminUser) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  if (submission.status !== "in_review") {
    const error = new Error("Only submissions currently in review can be released back to the queue.");
    error.status = 400;
    throw error;
  }

  // Permission check: Assigned editor or Super Admin
  if (adminUser.role !== "super_admin" && submission.assignedTo?.toString() !== adminUser._id.toString()) {
    const error = new Error("Forbidden: You cannot release a review assigned to another editor.");
    error.status = 403;
    throw error;
  }

  submission.assignedTo = null;
  submission.status = "pending";
  submission.claimedAt = null;
  await submission.save();

  await Article.findByIdAndUpdate(submission.articleId, {
    $set: { editorialStatus: "pending" }
  });

  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "EDITORIAL_REVIEW_RELEASED",
    metadata: {
      submissionId: submission._id,
      articleId: submission.articleId
    }
  });

  return submission;
};

/**
 * Manually assign or reassign a submission to an editor (Super Admin only or authorized editor)
 */
export const assignReviewer = async ({ submissionId, editorId, adminUser }) => {
  const [submission, targetEditor] = await Promise.all([
    EditorialSubmission.findById(submissionId),
    Admin.findById(editorId)
  ]);

  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  if (!targetEditor || targetEditor.status !== "active") {
    const error = new Error("Target editor not found or account is not active.");
    error.status = 400;
    throw error;
  }

  if (!["editor", "super_admin"].includes(targetEditor.role)) {
    const error = new Error("Assigned reviewer must have an Editor or Super Admin role.");
    error.status = 400;
    throw error;
  }

  // Prevent assigning the author to review their own article
  if (submission.submittedBy.toString() === targetEditor._id.toString()) {
    const error = new Error("Self-review prohibited: Cannot assign the submitting author as reviewer.");
    error.status = 400;
    throw error;
  }

  submission.assignedTo = targetEditor._id;
  submission.status = "in_review";
  submission.claimedAt = new Date();
  await submission.save();

  await Article.findByIdAndUpdate(submission.articleId, {
    $set: { editorialStatus: "in_review" }
  });

  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "EDITORIAL_REVIEWER_ASSIGNED",
    targetAdminId: targetEditor._id,
    metadata: {
      submissionId: submission._id,
      articleId: submission.articleId,
      assignedBy: adminUser._id,
      assignedTo: targetEditor._id
    }
  });

  // Notify assigned editor
  try {
    if (targetEditor._id.toString() !== adminUser._id.toString()) {
      await notificationService.createNotification({
        recipientId: targetEditor._id,
        actorId: adminUser._id,
        type: notificationService.NOTIFICATION_TYPES.ARTICLE_ASSIGNED,
        title: "Review Assigned",
        message: "You have been assigned to review an article submission.",
        entityType: "editorial_submission",
        entityId: submission._id,
        actionUrl: "/admin/editorial",
        metadata: {
          submissionId: submission._id,
          articleId: submission.articleId
        },
        eventKey: `submission:${submission._id}:assigned:${targetEditor._id}`
      });
    }
  } catch (notifErr) {
    console.error("[EditorialNotification] Failed to dispatch assignment alert:", notifErr.message);
  }

  return submission;
};

/**
 * Approve an editorial submission and mark its specific revision as approved
 */
export const approveSubmission = async ({
  submissionId,
  reviewNote = "",
  isOverride = false,
  overrideReason = "",
  adminUser
}) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  if (!["pending", "in_review"].includes(submission.status)) {
    const error = new Error(`Submission cannot be approved from its current status: ${submission.status}`);
    error.status = 409;
    throw error;
  }

  // Self-approval protection
  const isAuthor = submission.submittedBy.toString() === adminUser._id.toString();
  if (isAuthor) {
    if (adminUser.role === "super_admin" && isOverride) {
      if (!overrideReason || overrideReason.trim().length < 5) {
        const error = new Error("Super Admin emergency self-approval override requires a clear justification note.");
        error.status = 400;
        throw error;
      }
      await AdminAuditLog.record({
        actorId: adminUser._id,
        action: "EDITORIAL_SUPERADMIN_OVERRIDE_APPROVAL",
        metadata: {
          submissionId: submission._id,
          reason: overrideReason
        }
      });
    } else {
      const error = new Error("Independent review required: You cannot approve an article you submitted.");
      error.status = 403;
      throw error;
    }
  }

  // Update submission record
  submission.status = "approved";
  submission.decision = "approved";
  submission.reviewNote = reviewNote || "Approved for publication";
  submission.reviewedBy = adminUser._id;
  submission.reviewedAt = new Date();
  submission.completedAt = new Date();
  submission.approvedRevisionId = submission.revisionId;
  await submission.save();

  // Mark revision as approved
  await ArticleRevision.findByIdAndUpdate(submission.revisionId, {
    $set: { isApproved: true }
  });

  // Update Article editorial state
  await Article.findByIdAndUpdate(submission.articleId, {
    $set: { editorialStatus: "approved" }
  });

  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "EDITORIAL_ARTICLE_APPROVED",
    metadata: {
      submissionId: submission._id,
      articleId: submission.articleId,
      revisionId: submission.revisionId,
      decision: "approved"
    }
  });

  // Notify submitting author
  try {
    if (submission.submittedBy) {
      await notificationService.createNotification({
        recipientId: submission.submittedBy,
        actorId: adminUser._id,
        type: notificationService.NOTIFICATION_TYPES.ARTICLE_APPROVED,
        title: "Article Approved",
        message: "Your article submission has been approved for publication.",
        entityType: "editorial_submission",
        entityId: submission._id,
        actionUrl: "/admin/editorial",
        metadata: {
          submissionId: submission._id,
          articleId: submission.articleId,
          revisionId: submission.revisionId
        },
        eventKey: `submission:${submission._id}:approved`
      });
    }
  } catch (notifErr) {
    console.error("[EditorialNotification] Failed to dispatch approval alert:", notifErr.message);
  }

  return submission;
};

/**
 * Request corrections from the author
 */
export const requestChanges = async ({ submissionId, reviewNote, adminUser }) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  if (!["pending", "in_review"].includes(submission.status)) {
    const error = new Error(`Cannot request changes on a submission in "${submission.status}" status.`);
    error.status = 409;
    throw error;
  }

  submission.status = "changes_requested";
  submission.decision = "changes_requested";
  submission.reviewNote = reviewNote;
  submission.reviewedBy = adminUser._id;
  submission.reviewedAt = new Date();
  submission.completedAt = new Date();
  await submission.save();

  // Update Article editorial status and reset to draft for the author to make changes
  const article = await Article.findById(submission.articleId);
  if (article) {
    article.editorialStatus = "changes_requested";
    if (article.status !== "published") {
      article.status = "draft";
    }
    await article.save();
  }

  // Automatically record this feedback comment in the thread
  await EditorialComment.create({
    articleId: submission.articleId,
    submissionId: submission._id,
    revisionId: submission.revisionId,
    authorId: adminUser._id,
    message: reviewNote,
    type: "correction_request"
  });

  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "EDITORIAL_CHANGES_REQUESTED",
    metadata: {
      submissionId: submission._id,
      articleId: submission.articleId,
      revisionId: submission.revisionId
    }
  });

  // Notify submitting author
  try {
    if (submission.submittedBy) {
      await notificationService.createNotification({
        recipientId: submission.submittedBy,
        actorId: adminUser._id,
        type: notificationService.NOTIFICATION_TYPES.CHANGES_REQUESTED,
        title: "Changes Requested",
        message: "Editorial review requested corrections on your article submission.",
        entityType: "editorial_submission",
        entityId: submission._id,
        actionUrl: "/admin/editorial",
        metadata: {
          submissionId: submission._id,
          articleId: submission.articleId,
          revisionId: submission.revisionId
        },
        eventKey: `submission:${submission._id}:changes_requested`
      });
    }
  } catch (notifErr) {
    console.error("[EditorialNotification] Failed to dispatch changes requested alert:", notifErr.message);
  }

  return submission;
};

/**
 * Reject an article submission with mandatory feedback reason
 */
export const rejectSubmission = async ({ submissionId, reviewNote, adminUser }) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  if (!["pending", "in_review"].includes(submission.status)) {
    const error = new Error(`Cannot reject submission in "${submission.status}" status.`);
    error.status = 409;
    throw error;
  }

  submission.status = "rejected";
  submission.decision = "rejected";
  submission.reviewNote = reviewNote;
  submission.reviewedBy = adminUser._id;
  submission.reviewedAt = new Date();
  submission.completedAt = new Date();
  await submission.save();

  // Update Article editorial status
  const article = await Article.findById(submission.articleId);
  if (article) {
    article.editorialStatus = "rejected";
    if (article.status !== "published") {
      article.status = "draft";
    }
    await article.save();
  }

  // Add rejection note to editorial thread
  await EditorialComment.create({
    articleId: submission.articleId,
    submissionId: submission._id,
    revisionId: submission.revisionId,
    authorId: adminUser._id,
    message: reviewNote,
    type: "note"
  });

  await AdminAuditLog.record({
    actorId: adminUser._id,
    action: "EDITORIAL_ARTICLE_REJECTED",
    metadata: {
      submissionId: submission._id,
      articleId: submission.articleId,
      revisionId: submission.revisionId
    }
  });

  // Notify submitting author
  try {
    if (submission.submittedBy) {
      await notificationService.createNotification({
        recipientId: submission.submittedBy,
        actorId: adminUser._id,
        type: notificationService.NOTIFICATION_TYPES.ARTICLE_REJECTED,
        title: "Article Rejected",
        message: "Your article submission was not approved by editorial review.",
        entityType: "editorial_submission",
        entityId: submission._id,
        actionUrl: "/admin/editorial",
        metadata: {
          submissionId: submission._id,
          articleId: submission.articleId,
          revisionId: submission.revisionId
        },
        eventKey: `submission:${submission._id}:rejected`
      });
    }
  } catch (notifErr) {
    console.error("[EditorialNotification] Failed to dispatch rejection alert:", notifErr.message);
  }

  return submission;
};

/**
 * Retrieve comments and review feedback thread for a submission
 */
export const getCommentsBySubmission = async (submissionId) => {
  return await EditorialComment.find({ submissionId })
    .populate("authorId", "name email role avatar")
    .sort({ createdAt: 1 })
    .lean();
};

/**
 * Add a comment or author reply to an editorial submission thread
 */
export const addComment = async ({
  submissionId,
  authorId,
  message,
  type = "feedback",
  parentCommentId = null,
  anchor = null
}) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  const comment = await EditorialComment.create({
    articleId: submission.articleId,
    submissionId: submission._id,
    revisionId: submission.revisionId,
    authorId,
    message,
    type,
    parentCommentId: parentCommentId || null,
    anchor: anchor || null
  });

  return await EditorialComment.findById(comment._id)
    .populate("authorId", "name email role avatar")
    .lean();
};

/**
 * Retrieve editorial audit history for an article or submission
 */
export const getEditorialHistory = async (submissionId) => {
  const submission = await EditorialSubmission.findById(submissionId);
  if (!submission) {
    const error = new Error("Editorial submission not found");
    error.status = 404;
    throw error;
  }

  return await AdminAuditLog.find({
    $or: [
      { "metadata.submissionId": submission._id },
      { "metadata.articleId": submission.articleId }
    ]
  })
    .populate("actorId", "name email role avatar")
    .sort({ createdAt: -1 })
    .lean();
};

export default {
  submitArticleForReview,
  getEditorialQueue,
  getEditorialStats,
  getSubmissionById,
  claimReview,
  releaseReview,
  assignReviewer,
  approveSubmission,
  requestChanges,
  rejectSubmission,
  getCommentsBySubmission,
  addComment,
  getEditorialHistory
};
