import mongoose from "mongoose";

const editorialCommentSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorialSubmission",
      required: true,
      index: true
    },
    revisionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleRevision",
      default: null,
      index: true
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true
    },
    message: {
      type: String,
      required: [true, "Comment message is required"],
      trim: true,
      maxlength: [3000, "Comment cannot exceed 3000 characters"]
    },
    type: {
      type: String,
      enum: {
        values: ["feedback", "correction_request", "note"],
        message: "Invalid comment type: {VALUE}"
      },
      default: "feedback",
      index: true
    },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorialComment",
      default: null
    },
    anchor: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    }
  },
  {
    timestamps: true
  }
);

editorialCommentSchema.index({ submissionId: 1, createdAt: 1 });
editorialCommentSchema.index({ articleId: 1, createdAt: 1 });

export const EditorialComment = mongoose.model(
  "EditorialComment",
  editorialCommentSchema
);

export default EditorialComment;
