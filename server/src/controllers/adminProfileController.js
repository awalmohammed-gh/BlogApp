import Admin from "../models/Admin.js";
import Media from "../models/Media.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { clearAuthCookie } from "../utils/authCookies.js";

/**
 * GET /api/admin/profile
 * Retrieve authenticated administrator profile
 */
export const getProfile = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Administrator profile not found."
      });
    }

    res.status(200).json({
      success: true,
      admin: admin.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/profile
 * Update personal information and an owned profile-photo media reference.
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, bio, phone, avatarMedia } = req.body;

    const admin = await Admin.findById(req.admin._id);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Administrator profile not found."
      });
    }

    // Apply allowed updates only
    if (name !== undefined) admin.name = name.trim();
    if (bio !== undefined) admin.bio = bio.trim();
    if (phone !== undefined) admin.phone = phone.trim();
    if (avatarMedia !== undefined) {
      if (avatarMedia === null) {
        admin.avatar = "";
        admin.avatarMedia = null;
      } else {
        const media = await Media.findOne({ _id: avatarMedia, uploadedBy: req.admin._id, status: "active", mimeType: { $in: ["image/jpeg", "image/png", "image/webp"] } }).select("_id url");
        if (!media) return res.status(400).json({ success: false, message: "Choose an active image that you uploaded for your profile.", errors: { avatarMedia: "This image is unavailable or does not belong to you." } });
        admin.avatar = media.url;
        admin.avatarMedia = media._id;
      }
    }

    await admin.save();

    await AdminAuditLog.record({
      actorId: admin._id,
      action: "PROFILE_UPDATED",
      targetAdminId: admin._id,
      metadata: { fieldsUpdated: Object.keys(req.body) }
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      admin: admin.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/profile/password
 * Securely change administrator password and invalidate existing sessions
 */
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Load admin with passwordHash for comparison
    const admin = await Admin.findById(req.admin._id).select("+passwordHash");
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Administrator account not found."
      });
    }

    // Verify current password
    const isCurrentValid = await admin.comparePassword(currentPassword);
    if (!isCurrentValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect."
      });
    }

    // Hash and update to new password
    admin.passwordHash = await Admin.hashPassword(newPassword);
    admin.passwordChangedAt = new Date();
    // Increment tokenVersion to invalidate existing tokens
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;

    await admin.save();

    // Clear auth cookie to require re-login
    clearAuthCookie(res);

    await AdminAuditLog.record({
      actorId: admin._id,
      action: "PASSWORD_CHANGED",
      targetAdminId: admin._id
    });

    res.status(200).json({
      success: true,
      message: "Password updated successfully. Please log in with your new credentials."
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getProfile,
  updateProfile,
  changePassword
};
