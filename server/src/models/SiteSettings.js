import mongoose from "mongoose";
import { settingsDefaults } from "../config/settingsDefaults.js";

const schema = new mongoose.Schema({
  key: { type: String, default: "global", unique: true, enum: ["global"] },
  values: { type: mongoose.Schema.Types.Mixed, default: () => structuredClone(settingsDefaults) },
  version: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null }
}, { timestamps: true });
export default mongoose.model("SiteSettings", schema);
