import SiteSettings from "../models/SiteSettings.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import Media from "../models/Media.js";
import { settingsDefaults } from "../config/settingsDefaults.js";
import { fail } from "../utils/http.js";

// Stored sections may predate newer keys; always answer with defaults filled in
const withDefaults = (doc) => ({ ...doc, values: Object.fromEntries(Object.entries(settingsDefaults).map(([key, defaults]) => [key, { ...defaults, ...doc.values?.[key] }])) });

export const getSettings = async () => {
  const existing = await SiteSettings.findOne({key:"global"}).lean();
  if (existing) return withDefaults(existing);
  let doc;
  try {
    doc = await SiteSettings.findOneAndUpdate({ key: "global" }, { $setOnInsert: { values: settingsDefaults, version: 0 } }, { upsert: true, new: true }).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
    doc = await SiteSettings.findOne({ key: "global" }).lean();
  }
  return withDefaults(doc);
};

/**
 * The logo and favicon must be active Media Library images, and the stored URL
 * must be that image's own delivery URL (no arbitrary external addresses).
 */
const verifyBrandAssets = async (values) => {
  for (const [label, urlKey, idKey] of [["Logo", "logoUrl", "logoMediaId"], ["Favicon", "faviconUrl", "faviconMediaId"]]) {
    const url = values[urlKey];
    const mediaId = values[idKey];
    if (!url && !mediaId) continue;
    if (!url || !mediaId) throw fail(400, `${label} must be chosen from the Media Library.`);
    const media = await Media.findOne({ _id: mediaId, status: "active" }).select("url").lean();
    if (!media) throw fail(400, `${label} image is no longer available in the Media Library.`);
    if (media.url !== url) throw fail(400, `${label} URL does not match the selected Media Library image.`);
  }
};

export const updateSettings = async ({ section, values, version }, adminId) => {
  await getSettings();
  if (section === "branding") await verifyBrandAssets(values);
  const doc = await SiteSettings.findOneAndUpdate({ key: "global", version }, { $set: { [`values.${section}`]: values, updatedBy: adminId }, $inc: { version: 1 } }, { new: true, runValidators: true }).lean();
  if (!doc) throw fail(409, "Settings changed since you opened this page. Reload the latest settings before saving.");
  await AdminAuditLog.record({ actorId: adminId, action: "SITE_SETTINGS_UPDATED", metadata: { section, version: doc.version } });
  return withDefaults(doc);
};
