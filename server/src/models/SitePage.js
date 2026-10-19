import mongoose from "mongoose";

export const ALLOWED_PAGE_KEYS = [
  "home",
  "all-stories",
  "about",
  "contact",
  "editorial-standards"
];

const sitePageSchema = new mongoose.Schema(
  {
    pageKey: {
      type: String,
      required: [true, "Page key identifier is required"],
      unique: true,
      trim: true,
      enum: {
        values: ALLOWED_PAGE_KEYS,
        message: "Invalid page key: {VALUE}"
      }
    },
    title: {
      type: String,
      required: [true, "Page title is required"],
      trim: true,
      maxlength: [150, "Page title cannot exceed 150 characters"]
    },
    slug: {
      type: String,
      required: [true, "Page route URL is required"],
      trim: true
    },
    sections: {
      type: [
        {
          id: { type: String, required: true },
          type: { type: String, required: true },
          order: { type: Number, default: 0 },
          enabled: { type: Boolean, default: true },
          data: { type: mongoose.Schema.Types.Mixed, default: {} }
        }
      ],
      default: []
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "published"
    },
    publishedRevision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SitePageRevision",
      default: null
    },
    workingRevision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SitePageRevision",
      default: null
    },
    publishedAt: {
      type: Date,
      default: null
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    }
  },
  {
    timestamps: true
  }
);

sitePageSchema.index({ slug: 1 });
sitePageSchema.index({ status: 1 });

sitePageSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const SitePage = mongoose.model("SitePage", sitePageSchema);

export default SitePage;
