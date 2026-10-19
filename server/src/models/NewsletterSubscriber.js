import mongoose from "mongoose";
const schema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  status: { type: String, enum: ["pending_verification", "active", "unsubscribed"], default: "pending_verification", index: true },
  subscribedAt: { type: Date, default: Date.now },
  confirmedAt: { type: Date, default: null },
  unsubscribedAt: { type: Date, default: null },
  consentRecordedAt: { type: Date, required: true },
  source: { type: String, enum: ["homepage", "footer", "article"], default: "homepage" },
  verificationHash: { type: String, select: false },
  verificationExpiresAt: Date,
  unsubscribeHash: { type: String, select: false },
  emailStatus: { type: String, enum: ["pending", "not_configured", "email_sent", "email_failed"], default: "pending" },
  emailAttemptedAt: Date,
  emailMessageId: String,
  emailError: String
}, { timestamps: true });
schema.index({ verificationHash: 1 }, { sparse: true });
schema.index({ unsubscribeHash: 1 }, { sparse: true });
export default mongoose.model("NewsletterSubscriber", schema);
