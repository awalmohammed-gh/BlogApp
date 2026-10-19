import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100 },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  subject: { type: String, default: "", maxlength: 200 },
  department: { type: String, required: true },
  message: { type: String, required: true, maxlength: 5000 },
  status: { type: String, enum: ["new", "in_progress", "resolved", "archived"], default: "new", index: true },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  reviewedAt: { type: Date, default: null }
}, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
export default mongoose.model("ContactSubmission", schema);
