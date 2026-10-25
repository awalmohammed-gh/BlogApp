import Admin from "../models/Admin.js";
import { signAdminToken } from "../utils/jwt.js";
import { setAuthCookie, clearAuthCookie } from "../utils/authCookies.js";
import { sendAdminOtpEmail } from "../services/emailService.js";

/**
 * Check Admin Setup Status (Strict 1-Admin Lock)
 * GET /api/auth/status or GET /api/admin/auth/status
 */
export const getStatus = async (req, res, next) => {
  try {
    const verifiedAdmin = await Admin.findOne({ isVerified: true }).select("_id email name");

    if (verifiedAdmin) {
      return res.status(200).json({
        success: true,
        initialized: true
      });
    }

    // Check if an unverified admin is pending verification
    const unverifiedAdmin = await Admin.findOne({ isVerified: false }).select("email name");

    return res.status(200).json({
      success: true,
      initialized: false,
      unverifiedEmail: unverifiedAdmin?.email || null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 1: Create Single Unverified Admin & Send 6-Digit OTP via Brevo SMTP
 * POST /api/auth/setup or POST /api/admin/auth/setup
 */
export const setup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // CRITICAL: Strict 1-Admin Lock
    // If a verified admin already exists, permanently forbid new setups forever
    const verifiedExists = await Admin.exists({ isVerified: true });
    if (verifiedExists) {
      return res.status(403).json({
        success: false,
        message: "Admin account already exists. Registration is permanently locked."
      });
    }

    // Generate secure 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash password and OTP code with bcrypt
    const passwordHash = await Admin.hashPassword(password);
    const otpCodeHash = await Admin.hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Upsert the single unverified Admin record
    let admin = await Admin.findOne({ isVerified: false });
    if (admin) {
      admin.name = name.trim();
      admin.email = normalizedEmail;
      admin.passwordHash = passwordHash;
      admin.otpCodeHash = otpCodeHash;
      admin.otpExpiresAt = otpExpiresAt;
      admin.role = "super_admin";
      admin.status = "active";
      await admin.save();
    } else {
      admin = await Admin.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        otpCodeHash,
        otpExpiresAt,
        isVerified: false,
        role: "super_admin",
        status: "active"
      });
    }

    // Send OTP email via Nodemailer + Brevo SMTP
    const emailResult = await sendAdminOtpEmail({
      to: normalizedEmail,
      name: admin.name,
      otp
    });

    return res.status(201).json({
      success: true,
      message: "Verification OTP sent to your email. Valid for 10 minutes.",
      email: normalizedEmail,
      emailStatus: emailResult.status,
      ...(process.env.NODE_ENV === "test" ? { testOtp: otp } : {})
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Step 2: Verify 6-Digit OTP & Permanently Lock Registration
 * POST /api/auth/verify-otp or POST /api/admin/auth/verify-otp
 */
export const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();
    const cleanOtp = String(otp || "").trim();

    // If verified admin already exists, registration is locked
    const verifiedExists = await Admin.exists({ isVerified: true });
    if (verifiedExists) {
      return res.status(403).json({
        success: false,
        message: "Admin account already exists. Registration is permanently locked."
      });
    }

    // Find the pending unverified Admin with passwordHash & otpCodeHash
    const admin = await Admin.findOne({
      email: normalizedEmail,
      isVerified: false
    }).select("+otpCodeHash +passwordHash");

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "No pending registration found for this email address."
      });
    }

    // Check expiration
    if (!admin.otpExpiresAt || admin.otpExpiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Verification code has expired. Please request a fresh code."
      });
    }

    // Verify OTP hash
    const isOtpValid = await admin.compareOtp(cleanOtp);
    if (!isOtpValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification code. Please check your email and try again."
      });
    }

    // Permanently verify and lock registration
    admin.isVerified = true;
    admin.status = "active";
    admin.role = "super_admin";
    admin.otpCodeHash = null;
    admin.otpExpiresAt = null;
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT token & set HTTP-only cookie
    const token = signAdminToken(admin);
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Admin account verified successfully! Registration is now permanently locked.",
      admin: admin.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend 6-Digit OTP via Brevo SMTP
 * POST /api/auth/resend-otp or POST /api/admin/auth/resend-otp
 */
export const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();

    // Check if registration is already locked
    const verifiedExists = await Admin.exists({ isVerified: true });
    if (verifiedExists) {
      return res.status(403).json({
        success: false,
        message: "Admin account already exists. Registration is permanently locked."
      });
    }

    // Find pending unverified admin
    const admin = await Admin.findOne({
      email: normalizedEmail,
      isVerified: false
    });

    if (!admin) {
      return res.status(400).json({
        success: false,
        message: "No pending registration found for this email address."
      });
    }

    // Generate fresh 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.otpCodeHash = await Admin.hashOtp(otp);
    admin.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await admin.save();

    // Send fresh OTP email
    const emailResult = await sendAdminOtpEmail({
      to: admin.email,
      name: admin.name,
      otp
    });

    return res.status(200).json({
      success: true,
      message: "A fresh 6-digit verification code has been sent to your email.",
      email: admin.email,
      emailStatus: emailResult.status,
      ...(process.env.NODE_ENV === "test" ? { testOtp: otp } : {})
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle Admin Login (Strictly Verified Single-Admin)
 * POST /api/auth/login or POST /api/admin/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || "").toLowerCase().trim();

    // Check if initial setup is completed
    const verifiedAdminCount = await Admin.countDocuments({ isVerified: true });
    if (verifiedAdminCount === 0) {
      return res.status(400).json({
        success: false,
        message: "Admin account has not been set up yet. Please complete initial setup first."
      });
    }

    // Query single verified admin explicitly selecting passwordHash
    const admin = await Admin.findOne({
      email: normalizedEmail,
      isVerified: true
    }).select("+passwordHash");

    const invalidCredentialsMsg = "Invalid email or password.";

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg
      });
    }

    // Verify account status
    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your administrator account has been disabled."
      });
    }

    // Verify password using bcrypt
    const isPasswordValid = await admin.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: invalidCredentialsMsg
      });
    }

    // Update lastLoginAt
    admin.lastLoginAt = new Date();
    await admin.save();

    // Generate JWT
    const token = signAdminToken(admin);

    // Set secure HTTP-only cookie
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      admin: admin.toSanitizedJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Current Authenticated Administrator Session
 * GET /api/admin/auth/me or GET /api/auth/me
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    admin: req.admin
  });
};

/**
 * Handle Admin Logout
 * POST /api/admin/auth/logout or POST /api/auth/logout
 */
export const logout = async (req, res) => {
  clearAuthCookie(res);
  return res.status(200).json({
    success: true,
    message: "Logged out successfully"
  });
};

export default {
  getStatus,
  setup,
  verifyOtp,
  resendOtp,
  login,
  getMe,
  logout
};
