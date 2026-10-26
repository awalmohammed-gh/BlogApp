import nodemailer from "nodemailer";
import crypto from "node:crypto";
import env from "../config/env.js";
import { resolveSmtpConfig } from "../config/smtp.js";

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
export const newToken = () => crypto.randomBytes(32).toString("hex");
export const emailConfigured = () => resolveSmtpConfig().configured;
export const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const frontendLink = (path, token) => {
  const url = new URL(path, env.FRONTEND_URL);
  url.searchParams.set("token", token);
  return url.toString();
};

export const createEmailTransport = (config = resolveSmtpConfig()) => nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    requireTLS: env.isProduction || config.brevo,
    ...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false
  });

// No message bodies, recipient addresses, provider errors or tokens are logged.
export const sendEmail = async ({ to, subject, text, html }) => {
  const config = resolveSmtpConfig();
  if (!config.configured) return { status: "not_configured", error: "Email delivery is not configured." };
  const transport = createEmailTransport(config);
  try {
    const result = await transport.sendMail({ from: config.from, to, subject, text, html });
    if (!result.accepted?.some((address) => String(address).toLowerCase() === to.toLowerCase())) {
      return { status: "email_failed", error: "The email provider did not accept this message." };
    }
    return { status: "email_sent", messageId: result.messageId };
  } catch (err) {
    console.error(`[Email Error] Nodemailer / Brevo SMTP failed: ${err?.message || err}`);
    return { status: "email_failed", error: "Email submission failed. Check the server email configuration and retry." };
  } finally { transport.close(); }
};

export const sendInvitationEmail = async (staff, invitation, token) => {
  const link = frontendLink("/admin/accept-invite", token);
  const result = await sendEmail({
    to: staff.email, subject: "You're Invited to Join Nsemra News",
    text: `Hello ${staff.name},\n\nYou've been invited to join Nsemra News as an ${staff.role}.\nAccept your invitation and set a password: ${link}\n\nThis invitation expires in 24 hours. If unexpected, ignore this email.\nNsemra News Administration`,
    html: `<h1>Join the Nsemra News newsroom</h1><p>Hello ${escapeHtml(staff.name)},</p><p>You've been invited as an <strong>${escapeHtml(staff.role)}</strong>.</p><p><a href="${escapeHtml(link)}">Accept invitation and set up your account</a></p><p>This link expires in 24 hours. If you were not expecting this invitation, ignore this email.</p><p>Nsemra News Administration</p>`
  });
  await invitation.updateOne({ $set: { emailStatus: result.status, emailAttemptedAt: new Date(), emailMessageId: result.messageId || "", emailError: result.error || "" }, $inc: { emailAttempts: 1 } });
  return { ...result, inviteUrl: link };
};

export const sendAdminOtpEmail = async ({ to, name, otp }) => {
  const subject = "Your 6-Digit Admin Verification Code";
  const text = `Hello ${name || "Administrator"},\n\nYour 6-digit verification code to initialize and lock the Admin Dashboard account is:\n\n${otp}\n\nThis verification code expires in 10 minutes.\nIf you did not initiate this setup, please disregard this email.\n\nNsemfoa News Administration`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Admin Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #07132B; margin: 0; padding: 32px 16px; color: #ffffff;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; margin: 0 auto; background: #0B1B3A; border-radius: 16px; border: 1px solid rgba(59, 130, 246, 0.25); overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
    <tr>
      <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid rgba(59, 130, 246, 0.15);">
        <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">Nsemfoa News CMS</h1>
        <p style="margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #93c5fd; font-weight: 600;">Single-Admin Security Verification</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #e2e8f0;">
          Hello <strong style="color: #ffffff;">${escapeHtml(name || "Administrator")}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #cbd5e1;">
          Use the following 6-digit verification code to complete your Single-Admin setup. Once verified, registration is permanently locked:
        </p>
        <div style="text-align: center; margin: 28px 0; padding: 20px; background: rgba(15, 23, 42, 0.85); border-radius: 12px; border: 1px solid rgba(96, 165, 250, 0.4);">
          <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #60a5fa; display: inline-block;">
            ${escapeHtml(otp)}
          </span>
        </div>
        <p style="margin: 24px 0 0 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
          ⏳ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 32px 28px 32px; background: #07132B; border-top: 1px solid rgba(59, 130, 246, 0.1); text-align: center;">
        <p style="margin: 0; font-size: 11px; color: #64748b; line-height: 1.4;">
          If you did not request this verification code, please ignore this email. No administrative changes will take effect without this code.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // Print OTP to server logs for convenience
  console.log(`[Admin OTP] 🔐 6-digit verification code for ${to}: ${otp} (valid 10 mins)`);

  const result = await sendEmail({ to, subject, text, html });
  return result;
};

