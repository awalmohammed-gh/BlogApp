import Admin from "../models/Admin.js";
import { sendInvitationEmail } from "../services/emailService.js";
import AdminInvitation from "../models/AdminInvitation.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import notificationService from "../services/notificationService.js";

/**
 * GET /api/admin/staff
 * Retrieve paginated, searchable, and filtered list of staff accounts with summary stats
 */
export const getAllStaff = async (req, res, next) => {
  try {
    const {
      search = "",
      role = "all",
      status = "all",
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const query = {};

    if (search.trim()) {
      const q = search.trim();
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } }
      ];
    }

    if (role && role !== "all") {
      query.role = role;
    }

    if (status && status !== "all") {
      query.status = status;
    }

    // Sort order
    const sort = {
      [sortBy]: sortOrder === "asc" ? 1 : -1
    };

    const [staffDocs, totalMatching, totalAll, superAdmins, editors, authors, activeAccounts, pendingInvitations, disabledAccounts] =
      await Promise.all([
        Admin.find(query).sort(sort).skip(skip).limit(limitNum),
        Admin.countDocuments(query),
        Admin.countDocuments({}),
        Admin.countDocuments({ role: "super_admin" }),
        Admin.countDocuments({ role: "editor" }),
        Admin.countDocuments({ role: "author" }),
        Admin.countDocuments({ status: "active" }),
        Admin.countDocuments({ status: "invited" }),
        Admin.countDocuments({ status: "disabled" })
      ]);

    const staff = await Promise.all(staffDocs.map(async (doc) => {
      const safe = doc.toSanitizedJSON();
      if (doc.status === "invited") {
        const invitation = await AdminInvitation.findOne({ adminId: doc._id }).sort({ createdAt: -1 }).select("emailStatus emailAttempts emailAttemptedAt expiresAt consumedAt").lean();
        safe.invitation = invitation ? { emailStatus: invitation.emailStatus, emailAttempts: invitation.emailAttempts, emailAttemptedAt: invitation.emailAttemptedAt, expiresAt: invitation.expiresAt, expired: invitation.expiresAt <= new Date() } : null;
      }
      return safe;
    }));

    res.status(200).json({
      success: true,
      data: {
        staff,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalMatching,
          totalPages: Math.ceil(totalMatching / limitNum) || 1
        },
        stats: {
          totalStaff: totalAll,
          superAdmins,
          editors,
          authors,
          activeAccounts,
          pendingInvitations,
          disabledAccounts
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/staff/:id
 * Retrieve details of a specific staff member
 */
export const getStaffById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staff = await Admin.findById(id).populate("invitedBy", "name email");
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    res.status(200).json({
      success: true,
      data: staff.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/staff/invite
 * Invite a new staff member (Super Admin only)
 */
export const inviteStaff = async (req, res, next) => {
  try {
    const { name, email, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if account with this email exists
    const existing = await Admin.findOne({ email: normalizedEmail });
    if (existing) {
      if (existing.status === "active") {
        return res.status(400).json({
          success: false,
          message: "An active staff account with this email address already exists."
        });
      }
      if (existing.status === "invited") {
        return res.status(400).json({
          success: false,
          message:
            "An invitation for this email address is already pending. Use the Re-invite action to issue a new link."
        });
      }
      if (existing.status === "disabled") {
        return res.status(400).json({
          success: false,
          message: "An account with this email address is currently deactivated."
        });
      }
    }

    // Create staff record in invited status
    const newStaff = await Admin.create({
      name: name.trim(),
      email: normalizedEmail,
      role,
      status: "invited",
      invitedBy: req.admin._id
    });

    // Generate cryptographic invitation token
    const { invitation, rawToken } = await AdminInvitation.generateForAdmin({
      adminId: newStaff._id,
      createdBy: req.admin._id,
      expiresInHours: 24
    });

    const delivery = await sendInvitationEmail(newStaff, invitation, rawToken);
    await Admin.updateOne({ _id: newStaff._id }, { $set: { invitationRetryAfter: new Date(Date.now() + 60000) } });

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "STAFF_INVITED",
      targetAdminId: newStaff._id,
      metadata: { role, email: normalizedEmail }
    });

    res.status(201).json({
      success: true,
      message: "Staff member invited successfully.",
      data: {
        staff: newStaff.toSanitizedJSON(),
        inviteUrl: delivery.inviteUrl,
        emailStatus: delivery.status,
        expiresIn: "24 hours",
        notice: delivery.status === "email_sent" ? "The email provider accepted the invitation message. Inbox delivery is not yet verified." : `Invitation created. ${delivery.error} You may securely share the link manually or retry sending.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/staff/:id
 * Update staff details (name, bio, phone)
 */
export const updateStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, bio, phone } = req.body;

    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    if (name !== undefined) staff.name = name.trim();
    if (bio !== undefined) staff.bio = bio.trim();
    if (phone !== undefined) staff.phone = phone.trim();

    await staff.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "STAFF_UPDATED",
      targetAdminId: staff._id,
      metadata: { fieldsUpdated: Object.keys(req.body) }
    });

    res.status(200).json({
      success: true,
      message: "Staff member updated successfully.",
      data: staff.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/staff/:id/role
 * Change staff role between Editor and Author
 */
export const changeStaffRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    // Safeguard: Last active Super Admin protection
    if (staff.role === "super_admin" && role !== "super_admin") {
      const activeSuperAdmins = await Admin.countDocuments({
        role: "super_admin",
        status: "active"
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot change the role of the platform's last active Super Admin."
        });
      }
    }

    const previousRole = staff.role;
    staff.role = role;
    // Invalidate existing sessions so the new role is immediately enforced
    staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    await staff.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "STAFF_ROLE_CHANGED",
      targetAdminId: staff._id,
      metadata: { previousRole, newRole: role }
    });

    // Notify affected staff member about their updated role
    try {
      await notificationService.createNotification({
        recipientId: staff._id,
        actorId: req.admin._id,
        type: notificationService.NOTIFICATION_TYPES.STAFF_ROLE_CHANGED,
        title: "Account Role Updated",
        message: `Your newsroom account role has been updated from ${previousRole} to ${role}.`,
        entityType: "admin",
        entityId: staff._id,
        actionUrl: "/admin/profile",
        metadata: { previousRole, newRole: role },
        eventKey: `staff:${staff._id}:role:${role}:${staff.tokenVersion}`
      });
    } catch (notifErr) {
      console.error("[StaffNotification] Failed to dispatch role change alert:", notifErr.message);
    }

    res.status(200).json({
      success: true,
      message: `Staff role changed from ${previousRole} to ${role}.`,
      data: staff.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/admin/staff/:id/status
 * Activate or deactivate a staff member
 */
export const changeStaffStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    // Safeguard 1: Cannot disable own account
    if (req.admin._id.toString() === id && status === "disabled") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own administrative account."
      });
    }

    // Safeguard 2: Last active Super Admin protection
    if (staff.role === "super_admin" && status === "disabled") {
      const activeSuperAdmins = await Admin.countDocuments({
        role: "super_admin",
        status: "active"
      });
      if (activeSuperAdmins <= 1) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate the platform's last active Super Admin."
        });
      }
    }

    // Safeguard 3: Cannot directly activate an uncompleted invited account without password setup
    if (staff.status === "invited" && status === "active") {
      return res.status(400).json({
        success: false,
        message:
          "Invited accounts cannot be activated manually. The user must complete password setup via their invitation link."
      });
    }

    const previousStatus = staff.status;
    staff.status = status;

    // When disabling, invalidate all active sessions immediately
    if (status === "disabled") {
      staff.tokenVersion = (staff.tokenVersion || 0) + 1;
    }

    await staff.save();

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "STAFF_STATUS_CHANGED",
      targetAdminId: staff._id,
      metadata: { previousStatus, newStatus: status }
    });

    res.status(200).json({
      success: true,
      message: `Staff account status updated to ${status}.`,
      data: staff.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/admin/staff/:id/reinvite
 * Re-issue a new one-time invitation link for pending staff
 */
export const reinviteStaff = async (req, res, next) => {
  try {
    const { id } = req.params;

    const staff = await Admin.findById(id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found."
      });
    }

    if (staff.status !== "invited") {
      return res.status(400).json({
        success: false,
        message: "Re-invitation is only valid for pending invited accounts."
      });
    }

    const claimed = await Admin.findOneAndUpdate({ _id: staff._id, status: "invited", $or: [{ invitationRetryAfter: null }, { invitationRetryAfter: { $lte: new Date() } }] }, { $set: { invitationRetryAfter: new Date(Date.now() + 60000) } });
    if (!claimed) return res.status(429).json({ success: false, message: "Please wait one minute before resending this invitation." });
    // Replacement tokens invalidate previous invitation links.
    const { invitation, rawToken } = await AdminInvitation.generateForAdmin({
      adminId: staff._id,
      createdBy: req.admin._id,
      expiresInHours: 24
    });

    const delivery = await sendInvitationEmail(staff, invitation, rawToken);

    await AdminAuditLog.record({
      actorId: req.admin._id,
      action: "INVITATION_REISSUED",
      targetAdminId: staff._id,
      metadata: { email: staff.email }
    });

    res.status(200).json({
      success: true,
      message: "New invitation link generated successfully.",
      data: {
        staff: staff.toSanitizedJSON(),
        inviteUrl: delivery.inviteUrl,
        emailStatus: delivery.status,
        expiresIn: "24 hours",
        notice: delivery.status === "email_sent" ? "The email provider accepted the invitation message. Inbox delivery is not yet verified." : `Invitation renewed. ${delivery.error} You may securely share the link manually or retry sending.`
      }
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAllStaff,
  getStaffById,
  inviteStaff,
  updateStaff,
  changeStaffRole,
  changeStaffStatus,
  reinviteStaff
};
