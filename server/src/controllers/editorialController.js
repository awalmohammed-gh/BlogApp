import mongoose from "mongoose";
import editorialService from "../services/editorialService.js";
import revisionService from "../services/revisionService.js";
import {
  submitArticleSchema,
  assignReviewerSchema,
  approveSubmissionSchema,
  requestChangesSchema,
  rejectSubmissionSchema,
  addEditorialCommentSchema,
  editorialQueueQuerySchema
} from "../validations/editorialValidation.js";

/**
 * GET /api/admin/editorial/queue
 * Retrieve paginated editorial queue
 */
export const getQueue = async (req, res, next) => {
  try {
    const validation = editorialQueueQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const result = await editorialService.getEditorialQueue(validation.data, req.admin);

    res.status(200).json({
      success: true,
      data: result.submissions,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/editorial/stats
 * Retrieve real-time newsroom editorial statistics
 */
export const getStats = async (req, res, next) => {
  try {
    const stats = await editorialService.getEditorialStats(req.admin);

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/editorial/:id
 * Retrieve a single submission details with populated references
 */
export const getSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const submission = await editorialService.getSubmissionById(id, req.admin);

    res.status(200).json({
      success: true,
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/admin/editorial/:id/claim
 * Atomically claim review for currently authenticated editor
 */
export const claimReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const submission = await editorialService.claimReview(id, req.admin);

    res.status(200).json({
      success: true,
      message: "Editorial review claimed successfully",
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/admin/editorial/:id/release
 * Release an assigned review back into the general unassigned queue
 */
export const releaseReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const submission = await editorialService.releaseReview(id, req.admin);

    res.status(200).json({
      success: true,
      message: "Editorial review released back to the queue",
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * PATCH /api/admin/editorial/:id/assign
 * Manually assign/reassign an editor to a review (Super Admin only or authorized desk editor)
 */
export const assignReviewer = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const validation = assignReviewerSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid assignment parameters",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const submission = await editorialService.assignReviewer({
      submissionId: id,
      editorId: validation.data.editorId,
      adminUser: req.admin
    });

    res.status(200).json({
      success: true,
      message: "Reviewer assigned successfully",
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/admin/editorial/:id/approve
 * Approve article submission
 */
export const approveSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const validation = approveSubmissionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval payload",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const submission = await editorialService.approveSubmission({
      submissionId: id,
      reviewNote: validation.data.reviewNote,
      isOverride: validation.data.isOverride,
      overrideReason: validation.data.overrideReason,
      adminUser: req.admin
    });

    res.status(200).json({
      success: true,
      message: "Story approved for publication",
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/admin/editorial/:id/request-changes
 * Request corrections/revisions from the author
 */
export const requestChanges = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const validation = requestChangesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Please provide a clear correction request note",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const submission = await editorialService.requestChanges({
      submissionId: id,
      reviewNote: validation.data.reviewNote,
      adminUser: req.admin
    });

    res.status(200).json({
      success: true,
      message: "Revisions requested from author",
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * POST /api/admin/editorial/:id/reject
 * Reject story submission
 */
export const rejectSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const validation = rejectSubmissionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Rejection requires an explanatory rationale",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const submission = await editorialService.rejectSubmission({
      submissionId: id,
      reviewNote: validation.data.reviewNote,
      adminUser: req.admin
    });

    res.status(200).json({
      success: true,
      message: "Story submission rejected",
      data: submission
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * GET /api/admin/editorial/:id/comments
 * Retrieve comments and review discussion thread for a submission
 */
export const getComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const comments = await editorialService.getCommentsBySubmission(id);

    res.status(200).json({
      success: true,
      data: comments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/editorial/:id/comments
 * Add comment or feedback to an editorial submission thread
 */
export const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const validation = addEditorialCommentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid comment content",
        errors: validation.error.flatten().fieldErrors
      });
    }

    const comment = await editorialService.addComment({
      submissionId: id,
      authorId: req.admin._id,
      message: validation.data.message,
      type: validation.data.type,
      parentCommentId: validation.data.parentCommentId,
      anchor: validation.data.anchor
    });

    res.status(201).json({
      success: true,
      message: "Editorial comment posted",
      data: comment
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * GET /api/admin/editorial/:id/history
 * Retrieve full audit event history for a submission
 */
export const getHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid submission ID format"
      });
    }

    const history = await editorialService.getEditorialHistory(id);

    res.status(200).json({
      success: true,
      data: history
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * GET /api/admin/articles/:id/revisions
 * Retrieve revision history for an article
 */
export const getArticleRevisions = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article ID format"
      });
    }

    const revisions = await revisionService.getArticleRevisions(id);

    res.status(200).json({
      success: true,
      data: revisions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/articles/:id/revisions/:revisionId
 * Retrieve a specific revision details
 */
export const getArticleRevision = async (req, res, next) => {
  try {
    const { revisionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid revision ID format"
      });
    }

    const revision = await revisionService.getRevisionById(revisionId);
    if (!revision) {
      return res.status(404).json({
        success: false,
        message: "Article revision not found"
      });
    }

    res.status(200).json({
      success: true,
      data: revision
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/articles/:id/revisions/:revisionId/restore
 * Safely restore an earlier historical revision into the working draft
 */
export const restoreRevision = async (req, res, next) => {
  try {
    const { id, revisionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(revisionId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid article or revision ID format"
      });
    }

    const result = await revisionService.restoreRevision({
      articleId: id,
      revisionId,
      adminId: req.admin._id
    });

    res.status(200).json({
      success: true,
      message: `Version ${result.restoredVersion} restored into working draft successfully.`,
      data: result.article
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

export default {
  getQueue,
  getStats,
  getSubmission,
  claimReview,
  releaseReview,
  assignReviewer,
  approveSubmission,
  requestChanges,
  rejectSubmission,
  getComments,
  addComment,
  getHistory,
  getArticleRevisions,
  getArticleRevision,
  restoreRevision
};
