import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      minlength: [2, "Category name must be at least 2 characters"],
      maxlength: [80, "Category name cannot exceed 80 characters"]
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
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
    color: {
      type: String,
      default: "#2563EB",
      trim: true
    },
    status: {
      type: String,
      enum: {
        values: ["active", "inactive", "archived"],
        message: "Invalid category status: {VALUE}"
      },
      default: "active",
      index: true
    },
    displayOrder: {
      type: Number,
      default: 0,
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
categorySchema.index(
  { name: 1 },
  {
    unique: true,
    collation: { locale: "en", strength: 2 }
  }
);

// Compound index for querying active taxonomies by displayOrder and slug lookup
categorySchema.index({ status: 1, displayOrder: 1 });
categorySchema.index({ slug: 1, status: 1 });
categorySchema.index({ status: 1, deletedAt: 1, displayOrder: 1 });

export const Category = mongoose.model("Category", categorySchema);

export default Category;
