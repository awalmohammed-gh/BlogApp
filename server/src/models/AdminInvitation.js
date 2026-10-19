import mongoose from "mongoose";
import crypto from "crypto";

const adminInvitationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    consumedAt: {
      type: Date,
      default: null
    },
    emailStatus: { type: String, enum: ["pending", "not_configured", "email_sent", "email_failed"], default: "pending" },
    emailAttemptedAt: Date,
    emailAttempts: { type: Number, default: 0 },
    emailMessageId: { type: String, default: "" },
    emailError: { type: String, default: "" },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Hash helper for tokens
adminInvitationSchema.statics.hashToken = function (rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

// Generate and save a new secure one-time invitation
adminInvitationSchema.statics.generateForAdmin = async function ({
  adminId,
  createdBy,
  expiresInHours = 24
}) {
  // Invalidate any existing unconsumed invitations for this staff member
  await this.updateMany(
    { adminId, consumedAt: null },
    { $set: { consumedAt: new Date() } }
  );

  // Generate 32 bytes (64 hex characters) of cryptographically random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = this.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

  const invitation = await this.create({
    adminId,
    tokenHash,
    expiresAt,
    createdBy
  });

  return { invitation, rawToken };
};

export const AdminInvitation = mongoose.model(
  "AdminInvitation",
  adminInvitationSchema
);

export default AdminInvitation;
