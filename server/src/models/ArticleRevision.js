import mongoose from "mongoose";

const articleRevisionSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true
    },
    version: {
      type: Number,
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    subTitle: {
      type: String,
      default: "",
      trim: true
    },
    slug: {
      type: String,
      required: true,
      trim: true
    },
    excerpt: {
      type: String,
      default: "",
      trim: true
    },
    content: {
      type: String,
      default: ""
    },
    featuredImage: {
      media: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
        default: null
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
      default: null
    },
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag"
      }
    ],
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      keywords: { type: String, default: "" },
      canonicalUrl: { type: String, default: "" },
      ogTitle: { type: String, default: "" },
      ogDescription: { type: String, default: "" },
      ogImage: { type: String, default: "" }
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },
    changeSummary: {
      type: String,
      default: "Submitted for editorial review",
      trim: true
    },
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EditorialSubmission",
      default: null
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound unique index ensuring version numbers are unique per article
articleRevisionSchema.index({ articleId: 1, version: 1 }, { unique: true });
articleRevisionSchema.index({ articleId: 1, createdAt: -1 });
articleRevisionSchema.index({ title:"text", subTitle:"text", excerpt:"text" }, { name:"revision_public_text", weights:{title:5,subTitle:2,excerpt:1} });

export const ArticleRevision = mongoose.model("ArticleRevision", articleRevisionSchema);
export default ArticleRevision;
