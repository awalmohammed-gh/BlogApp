import mongoose from "mongoose";

export const ADVERTISEMENT_PLACEMENTS = [
  "homepage_banner",
  "homepage_inline",
  "all_stories_banner",
  "article_inline",
  "article_sidebar"
];

export const ADVERTISEMENT_STATUSES = [
  "draft",
  "active",
  "paused",
  "completed",
  "archived"
];

const advertisementSchema = new mongoose.Schema(
  {
    campaignName: {
      type: String,
      required: [true, "Campaign name is required"],
      trim: true,
      maxlength: [150, "Campaign name cannot exceed 150 characters"]
    },
    advertiserName: {
      type: String,
      trim: true,
      default: "",
      maxlength: [150, "Advertiser name cannot exceed 150 characters"]
    },
    headline: {
      type: String,
      required: [true, "Headline is required"],
      trim: true,
      maxlength: [200, "Headline cannot exceed 200 characters"]
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    media: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      required: [true, "Advertisement media asset is required"]
    },
    buttonText: {
      type: String,
      trim: true,
      default: "Learn More",
      maxlength: [50, "Button text cannot exceed 50 characters"]
    },
    destinationUrl: {
      type: String,
      required: [true, "Destination URL is required"],
      trim: true,
      maxlength: [2000, "Destination URL cannot exceed 2000 characters"]
    },
    placement: {
      type: String,
      required: [true, "Placement location is required"],
      enum: {
        values: ADVERTISEMENT_PLACEMENTS,
        message: "Invalid advertisement placement: {VALUE}"
      },
      default: "homepage_banner"
    },
    status: {
      type: String,
      enum: {
        values: ADVERTISEMENT_STATUSES,
        message: "Invalid advertisement status: {VALUE}"
      },
      default: "draft"
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast public serving and admin filtering
advertisementSchema.index({ placement: 1, status: 1, priority: -1, createdAt: -1 });
advertisementSchema.index({ status: 1, startDate: 1, endDate: 1 });
advertisementSchema.index({ media: 1 });
advertisementSchema.index({ createdBy: 1, createdAt: -1 });
advertisementSchema.index(
  { campaignName: "text", advertiserName: "text", headline: "text" },
  { name: "ad_text_search" }
);

advertisementSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

export const Advertisement = mongoose.model("Advertisement", advertisementSchema);

export default Advertisement;
