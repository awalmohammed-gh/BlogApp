import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import env from "../config/env.js";
import Admin from "../models/Admin.js";
import Article from "../models/Article.js";
import ArticleRevision from "../models/ArticleRevision.js";
import Category from "../models/Category.js";
import Media from "../models/Media.js";
import AdminAuditLog from "../models/AdminAuditLog.js";
import { uploadImage, generateThumbnailUrl } from "../config/imagekit.js";
import { getFolderByKey } from "../config/media.js";
import { inspectImage } from "../utils/imageInspector.js";
import { generateUniqueSlug } from "../utils/slugify.js";

/**
 * Makes the published articles in MongoDB match the owner's article data in
 * frontend/src/assets/blogs.js:
 *   - every story in the file is published (images go to ImageKit as Media Library records)
 *   - every article that is NOT in the file is removed, together with its revisions,
 *     submissions, editorial comments, reader comments, page-view events and the
 *     notifications that point at it (a JSON backup is written first)
 *   - the leftover test category "Notification Cat <digits>" is removed
 *
 *   npm run articles:import             preview, writes nothing
 *   npm run articles:import -- --apply  apply
 *
 * Re-running is safe: stories already imported from the file are left as they are.
 */
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_DATA_FILE = path.resolve(SCRIPT_DIR, "../../../frontend/src/assets/blogs.js");
export const IMPORT_MARK = "Imported from frontend/src/assets/blogs.js";
const TEST_CATEGORY = /^Notification Cat \d+$/;

/** Evaluate the data module with each image import replaced by its file name. */
export const readArticleData = (dataFile = DEFAULT_DATA_FILE) => {
  const source = fs
    .readFileSync(dataFile, "utf8")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/import\s+(\w+)\s+from\s+["']\.\/([^"']+)["'];?/g, (m, name, file) => `const ${name} = ${JSON.stringify(file)};`)
    .replace(/export\s+const/g, "const");
  const { articles } = new Function(`${source}\nreturn { articles };`)();
  const assetsDir = path.dirname(dataFile);
  const errors = [];
  const items = articles.map((a, index) => {
    const date = new Date(a.date);
    const item = {
      sourceId: String(a._id),
      title: String(a.title || "").trim(),
      subTitle: String(a.subTitle || "").trim(),
      category: String(a.category || "").trim(),
      content: String(a.description || ""),
      author: String(a.author || "").trim(),
      imageFile: a.image ? path.join(assetsDir, a.image) : null,
      publishedAt: Number.isFinite(date.getTime()) ? new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) : null,
      isPublished: a.isPublished !== false,
      index
    };
    if (!item.title) errors.push(`#${index + 1}: missing title`);
    if (!item.category) errors.push(`${item.title}: missing category`);
    if (!item.content.replace(/<[^>]*>/g, "").trim()) errors.push(`${item.title}: empty body`);
    if (!item.publishedAt) errors.push(`${item.title}: unreadable date "${a.date}"`);
    if (!item.imageFile || !fs.existsSync(item.imageFile)) errors.push(`${item.title}: image file not found (${a.image})`);
    return item;
  });
  const dupes = items.map((i) => i.sourceId).filter((id, i, all) => all.indexOf(id) !== i);
  if (dupes.length) errors.push(`duplicate ids: ${dupes.join(", ")}`);
  return { items, errors };
};

const excerptOf = (html, max = 220) => {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, text.lastIndexOf(" ", max)).replace(/[,;:.\s]+$/, "")}…`;
};

const ids = (docs) => docs.map((d) => d._id);

export const importAssetArticles = async ({ apply = false, dataFile = DEFAULT_DATA_FILE, backupDir = path.resolve("backups"), log = console.log } = {}) => {
  const { items, errors } = readArticleData(dataFile);
  if (errors.length) throw new Error(`Article data has problems:\n - ${errors.join("\n - ")}`);
  const toPublish = items.filter((i) => i.isPublished);

  const owner = await Admin.findOne({ email: (env.ADMIN_EMAIL || "").trim().toLowerCase(), role: "super_admin", status: "active" });
  if (!owner) throw new Error("The Super Admin from ADMIN_EMAIL must exist (npm run admin:sync) before importing.");

  // Categories must already exist; nothing is invented.
  const categories = await Category.find({}).lean();
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
  const missingCategories = [...new Set(toPublish.map((i) => i.category))].filter((n) => !categoryByName.has(n.toLowerCase()));
  if (missingCategories.length) throw new Error(`Create these categories first: ${missingCategories.join(", ")}`);

  // Which existing articles came from this file already?
  const markRevisions = await ArticleRevision.find({ changeSummary: { $regex: `^${IMPORT_MARK.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}` } }).select("articleId changeSummary").lean();
  const importedBySource = new Map();
  for (const r of markRevisions) {
    const sourceId = r.changeSummary.match(/\(([^)]+)\)\s*$/)?.[1];
    if (sourceId) importedBySource.set(sourceId, String(r.articleId));
  }
  const allArticles = await Article.find({}).select("_id title status").lean();
  const existingIds = new Set(allArticles.map((a) => String(a._id)));
  const keepIds = new Set(toPublish.map((i) => importedBySource.get(i.sourceId)).filter((id) => id && existingIds.has(id)));
  const pending = toPublish.filter((i) => !keepIds.has(importedBySource.get(i.sourceId)));
  const toRemove = allArticles.filter((a) => !keepIds.has(String(a._id)));
  const testCategories = categories.filter((c) => TEST_CATEGORY.test(c.name));

  const plan = {
    mode: apply ? "apply" : "preview",
    storiesInFile: items.length,
    alreadyImported: keepIds.size,
    toImport: pending.map((i) => `${i.title}  [${i.category}${i.author ? ` · ${i.author}` : ""}]`),
    toRemove: toRemove.map((a) => `${a._id}  [${a.status}] ${a.title}`),
    testCategoriesToRemove: testCategories.map((c) => c.name)
  };
  log(JSON.stringify(plan, null, 2));
  if (!apply) return { plan };

  // 1. Images first: reuse an identical Media record (by checksum) or upload once. Nothing is deleted yet.
  const folder = getFolderByKey("articles-featured");
  const mediaByFile = new Map();
  let uploaded = 0;
  for (const item of pending) {
    if (mediaByFile.has(item.imageFile)) continue;
    const buffer = fs.readFileSync(item.imageFile);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    let media = await Media.findOne({ checksum, status: { $ne: "deleting" } }).select("+checksum");
    if (!media) {
      const info = inspectImage(buffer);
      const base = path.basename(item.imageFile).replace(/\.[^.]+$/, "");
      const result = await uploadImage({ buffer, fileName: `${base}.${info.extension}`, folderPath: folder.path, tags: ["newsfront", "articles-featured", "import"] });
      media = await Media.create({
        fileId: result.fileId,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl || generateThumbnailUrl(result.url),
        filePath: result.filePath,
        originalName: path.basename(item.imageFile),
        name: base,
        mimeType: info.mimeType,
        extension: info.extension,
        size: result.size || buffer.length,
        width: result.width || info.width,
        height: result.height || info.height,
        altText: item.title.slice(0, 300),
        folder: "articles-featured",
        checksum,
        source: "migration",
        uploadedBy: owner._id,
        status: "active"
      });
      uploaded += 1;
    }
    mediaByFile.set(item.imageFile, media);
  }

  // 2. Backup, then remove everything that is not in the file.
  const removeIds = ids(toRemove);
  const col = (name) => mongoose.connection.db.collection(name);
  const linked = {};
  for (const name of ["articlerevisions", "editorialsubmissions", "editorialcomments", "articlecomments", "pageviewevents"]) {
    linked[name] = await col(name).find({ articleId: { $in: removeIds } }).toArray();
  }
  const notificationFilter = { entityId: { $in: [...removeIds, ...ids(linked.editorialsubmissions)] } };
  const backup = {
    createdAt: new Date().toISOString(),
    articles: await col("articles").find({ _id: { $in: removeIds } }).toArray(),
    ...linked,
    notifications: await col("notifications").find(notificationFilter).toArray(),
    categories: await col("categories").find({ _id: { $in: ids(testCategories) } }).toArray()
  };
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `articles-before-import-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(backup));
  log(`Backup written: ${backupFile}`);

  const removed = {};
  for (const name of Object.keys(linked)) removed[name] = (await col(name).deleteMany({ _id: { $in: ids(linked[name]) } })).deletedCount;
  removed.notifications = (await col("notifications").deleteMany(notificationFilter)).deletedCount;
  removed.articles = (await col("articles").deleteMany({ _id: { $in: removeIds } })).deletedCount;
  removed.categories = 0;
  for (const c of testCategories) {
    if (!(await Article.exists({ category: c._id }))) removed.categories += (await Category.deleteOne({ _id: c._id })).deletedCount;
  }

  // 3. Import. Reverse order so the first story in the file gets the newest _id and
  //    therefore leads among stories that share a publication date.
  let imported = 0;
  for (const item of [...pending].reverse()) {
    const media = mediaByFile.get(item.imageFile);
    const category = categoryByName.get(item.category.toLowerCase());
    const slug = await generateUniqueSlug(Article, item.title);
    const excerpt = excerptOf(item.content);
    const featuredImage = { media: media._id, fileId: media.fileId, url: media.url, name: media.name, width: media.width, height: media.height, alt: item.title };
    const seo = { metaTitle: item.title.slice(0, 100), metaDescription: excerpt.slice(0, 300) };
    const article = await Article.create({
      title: item.title,
      subTitle: item.subTitle,
      slug,
      excerpt,
      content: item.content,
      featuredImage,
      category: category._id,
      tags: [],
      author: owner._id,
      // Writers without a staff account keep their name as the public byline
      byline: item.author && item.author.toLowerCase() !== owner.name.toLowerCase() ? item.author : "",
      status: "published",
      editorialStatus: "approved",
      publishedAt: item.publishedAt,
      seo,
      createdBy: owner._id,
      updatedBy: owner._id
    });
    const revision = await ArticleRevision.create({
      articleId: article._id,
      version: 1,
      title: item.title,
      subTitle: item.subTitle,
      slug,
      excerpt,
      content: item.content,
      featuredImage,
      category: category._id,
      tags: [],
      seo,
      createdBy: owner._id,
      changeSummary: `${IMPORT_MARK} (${item.sourceId})`,
      isApproved: true,
      isPublished: true
    });
    await Article.updateOne({ _id: article._id }, { $set: { publishedRevision: revision._id } });
    imported += 1;
  }

  await AdminAuditLog.record({
    actorId: owner._id,
    action: "ARTICLES_IMPORTED_FROM_ASSETS",
    metadata: { imported, alreadyImported: keepIds.size, imagesUploaded: uploaded, removed, backupFile: path.basename(backupFile) }
  });
  const result = { imported, alreadyImported: keepIds.size, imagesUploaded: uploaded, imagesReused: mediaByFile.size - uploaded, removed, backupFile };
  log(JSON.stringify(result, null, 2));
  return { plan, result };
};

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { default: connectDatabase, disconnectDatabase } = await import("../config/database.js");
  try {
    await connectDatabase();
    await importAssetArticles({ apply: process.argv.includes("--apply") });
  } catch (error) {
    console.error(`[Import failed] ${error.message}`);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
