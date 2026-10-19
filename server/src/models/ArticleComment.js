import mongoose from "mongoose";

const articleCommentSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: [true, "Article reference is required"],
      index: true
    },
    commenterName: {
      type: String,
      required: [true, "Commenter name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    commenterEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: ""
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"]
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected", "spam", "archived"],
        message: "Invalid comment status: {VALUE}"
      },
      default: "pending",
      index: true
    },
    moderatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
    moderatedAt: { type: Date, default: null },
    moderationReason: { type: String, default: "", maxlength: 500 },
    parentCommentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleComment",
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for public comment retrieval and admin moderation analytics
articleCommentSchema.index({ articleId: 1, status: 1, createdAt: -1 });
articleCommentSchema.index({ status: 1, createdAt: -1 });
articleCommentSchema.index({ createdAt: -1 });

export const ArticleComment = mongoose.model("ArticleComment", articleCommentSchema);
export default ArticleComment;
