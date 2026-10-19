import mongoose from "mongoose";
import connectDatabase, { disconnectDatabase } from "../config/database.js";
import env from "../config/env.js";
import { settingsDefaults } from "../config/settingsDefaults.js";
import SiteSettings from "../models/SiteSettings.js";
import SitePage from "../models/SitePage.js";
import SitePageRevision from "../models/SitePageRevision.js";
import Admin from "../models/Admin.js";
import AdminAuditLog from "../models/AdminAuditLog.js";

// Explicitly invoked brand migration for MongoDB-stored settings and Website CMS pages.
//   node src/scripts/rebrandSite.js            preview (default, writes nothing)
//   node src/scripts/rebrandSite.js --apply    write new revisions
const BRAND = "Nsemra News";
// Legacy display names only. The lookarounds leave e-mail addresses, domains,
// URLs and identifiers (tips@newsfront.com, newsfront_db) untouched.
const LEGACY_BRAND = /(?<![@./\w-])(?:NewsFront|News Front|NEWSFRONT|NSEMRA NEWS)(?![\w-]|\.\w)/g;
const brandText = (value) => {
  if (value instanceof Date || value?._bsontype) return value;
  if (typeof value === "string") {
    if (/^(https?:\/\/|\/|[^\s@]+@)/i.test(value)) return value;
    return value.replace(LEGACY_BRAND, BRAND);
  }
  if (Array.isArray(value)) return value.map(brandText);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, brandText(child)]));
  return value;
};
const sectionsFor = (sections, pageKey) => (sections || []).map((section) => {
  const next = brandText(section);
  if (pageKey === "home" && next.type === "hero" && ["Ghana and Beyond", "Ghana & Beyond"].includes(next.data?.title)) next.data.title = "Stories That Matter.";
  return next;
});
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

try {
  await connectDatabase();
  const settings = await SiteSettings.findOne({ key: "global" }).lean();
  const pages = await SitePage.find({}).lean();
  const revisions = await SitePageRevision.find({ _id: { $in: pages.flatMap((p) => [p.publishedRevision, p.workingRevision]).filter(Boolean) } }).lean();
  const revisionMap = new Map(revisions.map((r) => [String(r._id), r]));
  const changedPages = pages.filter((page) => {
    const live = revisionMap.get(String(page.publishedRevision));
    const draft = revisionMap.get(String(page.workingRevision));
    return page.title !== brandText(page.title) || [page.sections, live?.sections, draft?.sections].filter(Boolean).some((sections) => !same(sections, sectionsFor(sections, page.pageKey)));
  });
  const settingsNeedUpdate = !settings || settings.values?.general?.siteName !== BRAND
    || [settings.values?.general?.description, settings.values?.seo?.defaultMetaTitle, settings.values?.seo?.defaultMetaDescription].some((v) => typeof v === "string" && v !== brandText(v));
  console.log(JSON.stringify({ mode: process.argv.includes("--apply") ? "apply" : "preview", siteName: BRAND, settingsExist: Boolean(settings), settingsNeedUpdate, websitePagesRequiringBrandUpdate: changedPages.map((page) => page.pageKey) }));
  if (process.argv.includes("--apply")) {
    const apply = async (session = null) => {
        const actor = await Admin.findOne({ email: env.ADMIN_EMAIL.toLowerCase(), role: "super_admin" }).select("_id").session(session);
        const actorId = actor?._id || null;
        const doc = await SiteSettings.findOne({ key: "global" }).session(session);
        const values = doc ? structuredClone(doc.values) : structuredClone(settingsDefaults);
        // Only legacy brand text changes; tagline, contact details and other admin edits are preserved.
        values.general = { ...settingsDefaults.general, ...values.general, siteName: BRAND };
        if (values.general.description) values.general.description = brandText(values.general.description);
        if (values.seo?.defaultMetaTitle) values.seo.defaultMetaTitle = brandText(values.seo.defaultMetaTitle);
        if (values.seo?.defaultMetaDescription) values.seo.defaultMetaDescription = brandText(values.seo.defaultMetaDescription);
        if (!doc) await SiteSettings.create([{ key: "global", values, version: 0, updatedBy: actorId }], { session });
        else if (!same(doc.values, values)) {
          const result = await SiteSettings.updateOne({ _id: doc._id, version: doc.version }, { $set: { values, updatedBy: actorId }, $inc: { version: 1 } }, { session });
          if (result.modifiedCount !== 1) throw new Error("Settings changed during the branding update.");
        }
        for (const candidate of changedPages) {
          const page = await SitePage.findById(candidate._id).session(session);
          if (page.updatedAt.getTime() !== candidate.updatedAt.getTime()) throw new Error("Website content changed during the branding update.");
          const latest = await SitePageRevision.findOne({ pageId: page._id }).sort({ version: -1 }).session(session);
          let nextVersion = (latest?.version || 0) + 1;
          const pointers = new Map();
          for (const key of ["publishedRevision", "workingRevision"]) {
            const originalId = page[key];
            if (!originalId) continue;
            if (pointers.has(String(originalId))) { page[key] = pointers.get(String(originalId)); continue; }
            const original = await SitePageRevision.findById(originalId).session(session).lean();
            if (!original) continue;
            const sections = sectionsFor(original.sections, page.pageKey);
            if (!same(original.sections, sections)) {
              const [revision] = await SitePageRevision.create([{ pageId: page._id, pageKey: page.pageKey, version: nextVersion++, sections, changeSummary: `Brand updated to ${BRAND}.`, createdBy: actorId }], { session });
              page[key] = revision._id;
              pointers.set(String(originalId), revision._id);
            }
          }
          page.title = brandText(page.title);
          page.sections = sectionsFor(page.sections.toObject(), page.pageKey);
          page.updatedBy = actorId;
          const result = await SitePage.updateOne({ _id: page._id, updatedAt: candidate.updatedAt, publishedRevision: candidate.publishedRevision || null, workingRevision: candidate.workingRevision || null }, { $set: { title: page.title, sections: page.sections.toObject(), publishedRevision: page.publishedRevision, workingRevision: page.workingRevision, updatedBy: actorId } }, { session });
          if (result.modifiedCount !== 1) throw new Error("Website content changed during the branding update.");
        }
        await AdminAuditLog.create([{ actorId, action: "SITE_BRANDING_UPDATED", metadata: { siteName: BRAND, websitePages: changedPages.map((page) => page.pageKey) } }], { session });
    };
    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    if (topology.setName || topology.msg === "isdbgrid") {
      const session = await mongoose.startSession();
      try { await session.withTransaction(() => apply(session)); }
      finally { await session.endSession(); }
    } else {
      // A simple rebrand also works on standalone MongoDB. Each settings/page
      // write checks its version; prior revisions stay available for recovery.
      await apply();
    }
    console.log("Branding saved. Existing article URLs, website publication states and historical revisions are preserved.");
  }
} catch (error) {
  console.error("Branding update failed:", error.name || "Error");
  process.exitCode = 1;
} finally { await disconnectDatabase(); }
