import mongoose from "mongoose";
import { readingMinutes } from "../utils/readingMinutes.js";

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Article title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [200, "Title cannot exceed 200 characters"]
    },
    subTitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: [300, "Subtitle cannot exceed 300 characters"]
    },
    slug: {
      type: String,
      required: [true, "Article slug is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    excerpt: {
      type: String,
      default: "",
      trim: true,
      maxlength: [600, "Excerpt cannot exceed 600 characters"]
    },
    content: {
      type: String,
      default: "<p></p>"
    },
    featuredImage: {
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        default: null,
        index: true
      },
      fileId: { type: String, default: "" },
      url: { type: String, default: "" },
      name: { type: String, default: "" },
      width: { type: Number, default: null },
      height: { type: Number, default: null },
      alt: { type: String, default: "" }
    },
    contentMedia: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media"
      }
    ],
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag"
      }
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Article author is required"],
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ["draft", "pending_review", "scheduled", "published", "archived"],
        message: "Invalid article status: {VALUE}"
      },
      default: "draft",
      index: true
    },
    editorialStatus: {
      type: String,
      enum: {
        values: ["none", "pending", "in_review", "changes_requested", "approved", "rejected"],
        message: "Invalid editorial status: {VALUE}"
      },
      default: "none",
      index: true
    },
    publishedRevision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ArticleRevision",
      default: null,
      index: true
    },
    currentSubmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorialSubmission",
      default: null,
      index: true
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true
    },
    isBreakingNews: {
      type: Boolean,
      default: false,
      index: true
    },
    // Public byline when the writer has no staff account (e.g. imported stories).
    // The article is still owned by the staff account in `author`.
    byline: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120
    },
    // Per-article reader comments switch; the global Settings policy still applies
    commentsEnabled: {
      type: Boolean,
      default: true
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true
    },
    scheduledAt: {
      type: Date,
      default: null,
      index: true
    },
    scheduledRevision: { type: mongoose.Schema.Types.ObjectId, ref: "ArticleRevision", default: null },
    scheduleToken: { type: String, default: null },
    scheduleLease: { type: String, default: null },
    scheduleLeaseUntil: { type: Date, default: null },
    scheduleAttempts: { type: Number, default: 0 },
    scheduleRetryAt: { type: Date, default: null },
    scheduleFailure: { type: String, default: "" },
    scheduleFailedAt: { type: Date, default: null },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      keywords: { type: String, default: "" },
      canonicalUrl: { type: String, default: "" },
      ogTitle: { type: String, default: "" },
      ogDescription: { type: String, default: "" },
      ogImage: { type: String, default: "" }
    },
    views: {
      type: Number,
      default: 0
    },
    publicReadingMinutes: { type:Number, default:null, min:1 },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true
  }
);

// High-performance compound & single-field indexes for Nsemfoa News queries
articleSchema.index({ status: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ status: 1, deletedAt: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ status: 1, scheduledAt: 1, scheduleRetryAt: 1, scheduleLeaseUntil: 1 });
articleSchema.index({ category: 1, status: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ category: 1, status: 1, deletedAt: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ isFeatured: 1, status: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ isFeatured: 1, status: 1, deletedAt: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ isBreakingNews: 1, status: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ isBreakingNews: 1, status: 1, deletedAt: 1, publishedAt: -1, _id: -1 });
articleSchema.index({ author: 1, status: 1, createdAt: -1 });
articleSchema.index({ author: 1, status: 1, deletedAt: 1, createdAt: -1 });
articleSchema.index({ slug: 1, status: 1, deletedAt: 1 });
articleSchema.index({ createdAt: -1 });
articleSchema.index({ title:"text", subTitle:"text", excerpt:"text" }, { name:"article_public_legacy_text" });
articleSchema.pre("validate", function () { if(!this.publishedRevision && (this.isModified("content") || this.publicReadingMinutes == null))this.publicReadingMinutes = readingMinutes(this.content); });

export const Article = mongoose.model("Article", articleSchema);

export default Article;
