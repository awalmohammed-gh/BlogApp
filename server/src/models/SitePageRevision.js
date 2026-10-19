import mongoose from "mongoose";

const sitePageRevisionSchema = new mongoose.Schema(
  {
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SitePage",
      required: true
    },
    pageKey: {
      type: String,
      required: true,
      trim: true
    },
    version: {
      type: Number,
      required: true,
      min: 1
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
    changeSummary: {
      type: String,
      trim: true,
      default: "Content revision",
      maxlength: 300
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    }
  },
  {
    timestamps: true
  }
);

sitePageRevisionSchema.index({ pageId: 1, version: -1 });
sitePageRevisionSchema.index({ pageKey: 1, version: -1 });

sitePageRevisionSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const SitePageRevision = mongoose.model("SitePageRevision", sitePageRevisionSchema);

export default SitePageRevision;
