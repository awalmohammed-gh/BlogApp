import mongoose from "mongoose";

const tagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Tag name is required"],
      trim: true,
      minlength: [2, "Tag name must be at least 2 characters"],
      maxlength: [80, "Tag name cannot exceed 80 characters"]
    },
    slug: {
      type: String,
      required: [true, "Tag slug is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      default: "",
      maxlength: [500, "Description cannot exceed 500 characters"],
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "archived"],
        message: "Invalid tag status: {VALUE}"
      },
      default: "active",
      index: true
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
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Case-insensitive unique index for name
tagSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }
  }
);

export const Tag = mongoose.model("Tag", tagSchema);

export default Tag;
