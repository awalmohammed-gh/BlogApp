import mongoose from "mongoose";

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    targetAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
      index: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

/**
 * Safe helper to record security-sensitive actions without throwing or failing requests
 */
adminAuditLogSchema.statics.record = async function ({
  actorId,
  action,
  targetAdminId = null,
  metadata = {}
}) {
  try {
    // Sanitize metadata to never include password hashes or tokens
    const safeMetadata = { ...metadata };
    delete safeMetadata.password;
    delete safeMetadata.passwordHash;
    delete safeMetadata.token;
    delete safeMetadata.tokenHash;

    return await this.create({
      actorId,
      action,
      targetAdminId,
      metadata: safeMetadata
    });
  } catch (err) {
    console.error("[AuditLog] Failed to record audit log:", err.message);
    return null;
  }
};

export const AdminAuditLog = mongoose.model(
  "AdminAuditLog",
  adminAuditLogSchema
);

export default AdminAuditLog;
