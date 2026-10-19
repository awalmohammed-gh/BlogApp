import mongoose from "mongoose";

const editorialSubmissionSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true
    },
    revisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleRevision",
      required: true,
      index: true
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "in_review", "changes_requested", "approved", "rejected", "cancelled"],
        message: "Invalid editorial submission status: {VALUE}"
      },
      default: "pending",
      index: true
    },
    submissionNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Submission note cannot exceed 1000 characters"]
    },
    reviewNote: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Review note cannot exceed 2000 characters"]
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    approvedRevisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleRevision",
      default: null
    },
    decision: {
      type: String,
      enum: ["approved", "changes_requested", "rejected", null],
      default: null
    },
    claimedAt: {
      type: Date,
      default: null
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    completedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

editorialSubmissionSchema.index({ articleId: 1, status: 1 });
editorialSubmissionSchema.index({ status: 1, submittedAt: -1 });
editorialSubmissionSchema.index({ assignedTo: 1, status: 1 });

export const EditorialSubmission = mongoose.model(
  "EditorialSubmission",
  editorialSubmissionSchema
);

export default EditorialSubmission;
