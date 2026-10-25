import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import env from "../config/env.js";

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"]
    },
    email: {
      type: String,
      required: [true, "Admin email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    passwordHash: {
      type: String,
      required: function () {
        // Password hash is required for active/disabled accounts, but optional during invitation
        return this.status !== "invited";
      },
      select: false // Excluded by default in queries
    },
    role: {
      type: String,
      enum: {
        values: ["super_admin", "editor", "author"],
        message: "Invalid admin role: {VALUE}"
      },
      default: "author",
      index: true
    },
    status: {
      type: String,
      enum: {
        values: ["invited", "active", "disabled"],
        message: "Invalid account status: {VALUE}"
      },
      default: "active",
      index: true
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    otpCodeHash: {
      type: String,
      default: null,
      select: false
    },
    otpExpiresAt: {
      type: Date,
      default: null
    },
    avatar: {
      type: String,
      default: ""
    },
    avatarMedia: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Media",
      default: null
    },
    bio: {
      type: String,
      default: "",
      maxlength: [500, "Biography cannot exceed 500 characters"]
    },
    phone: {
      type: String,
      default: "",
      maxlength: [30, "Phone number cannot exceed 30 characters"]
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null
    },
    tokenVersion: {
      type: Number,
      default: 0
    },
    passwordChangedAt: {
      type: Date,
      default: null
    },
    invitationRetryAfter: { type: Date, default: null },
    lastLoginAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.otpCodeHash;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compare candidate password with stored hash
adminSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error("Password hash not loaded for comparison.");
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Compare candidate 6-digit OTP code with stored hash
adminSchema.methods.compareOtp = async function (candidateOtp) {
  if (!this.otpCodeHash) {
    return false;
  }
  return bcrypt.compare(String(candidateOtp).trim(), this.otpCodeHash);
};

// Static helper to hash passwords consistently
adminSchema.statics.hashPassword = async function (plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS || 12);
};

// Static helper to hash 6-digit OTP codes
adminSchema.statics.hashOtp = async function (otpCode) {
  return bcrypt.hash(String(otpCode).trim(), 10);
};

// Sanitize helper to return safe representation
adminSchema.methods.toSanitizedJSON = function () {
  return {
    _id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    status: this.status,
    isVerified: Boolean(this.isVerified),
    avatar: this.avatar,
    avatarMedia: this.avatarMedia ? this.avatarMedia.toString() : null,
    bio: this.bio || "",
    phone: this.phone || "",
    invitedBy: this.invitedBy ? this.invitedBy.toString() : null,
    lastLoginAt: this.lastLoginAt,
    passwordChangedAt: this.passwordChangedAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
