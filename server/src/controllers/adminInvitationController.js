import mongoose from "mongoose";
import { tokenBody } from "../validations/engagementValidation.js";
import Admin from "../models/Admin.js";
import AdminInvitation from "../models/AdminInvitation.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

/**
 * GET /api/admin/invitations/verify
 * Validate an invitation token before rendering the activation form
 */
export const verifyInvitation = async (req, res, next) => {
  try {
    const { token } = tokenBody.parse(req.query);

    if (!token || typeof token !== "string" || token.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation token."
      });
    }

    const tokenHash = AdminInvitation.hashToken(token);
    const invitation = await AdminInvitation.findOne({
      tokenHash,
      consumedAt: null,
      expiresAt: { $gt: new Date() }
    }).populate("adminId", "name email role status");

    if (!invitation || !invitation.adminId) {
      return res.status(400).json({
        success: false,
        message: "This invitation link is invalid, expired, or has already been used."
      });
    }

    if (invitation.adminId.status !== "invited") {
      return res.status(400).json({
        success: false,
        message: "This staff account has already completed setup."
      });
    }

    res.status(200).json({
      success: true,
      valid: true,
      admin: {
        name: invitation.adminId.name,
        email: invitation.adminId.email,
        role: invitation.adminId.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/invitations/accept
 * Accept an invitation, set password, and activate the staff account
 */
export const acceptInvitation = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    tokenBody.parse({ token });
    const passwordHash = await Admin.hashPassword(password);
    const session = await mongoose.startSession();
    let admin;
    try {
      await session.withTransaction(async () => {
        const invitation = await AdminInvitation.findOneAndUpdate({ tokenHash: AdminInvitation.hashToken(token), consumedAt: null, expiresAt: { $gt: new Date() } }, { $set: { consumedAt: new Date() } }, { new: true, session });
        if (!invitation) throw Object.assign(new Error("This invitation is invalid, expired, or already used."), { statusCode: 400 });
        admin = await Admin.findOneAndUpdate({ _id: invitation.adminId, status: "invited", role: { $in: ["editor", "author"] } }, { $set: { passwordHash, status: "active", passwordChangedAt: new Date() }, $inc: { tokenVersion: 1 } }, { new: true, session });
        if (!admin) throw Object.assign(new Error("This staff invitation is no longer available."), { statusCode: 409 });
      });
    } finally { await session.endSession(); }

    await AdminAuditLog.record({
      actorId: admin._id,
      action: "INVITATION_ACCEPTED",
      targetAdminId: admin._id,
      metadata: { role: admin.role, email: admin.email }
    });

    res.status(200).json({
      success: true,
      message:
        "Account activated successfully! You can now sign in to the Nsemra News newsroom.",
      admin: admin.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

export default {
  verifyInvitation,
  acceptInvitation
};
