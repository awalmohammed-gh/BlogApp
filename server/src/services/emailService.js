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
  } catch {
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
