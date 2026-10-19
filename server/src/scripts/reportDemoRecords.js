import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import connectDatabase, { disconnectDatabase } from "../config/database.js";

/**
 * Identifies demonstration / test records that earlier seed and API-test
 * scripts (since removed) wrote into the configured MongoDB database.
 *
 *   npm run db:demo-report            report only (default, writes nothing)
 *   npm run db:demo-report -- --apply delete ONLY the exact-provenance matches
 *                                     listed under "removable", after writing a
 *                                     JSON backup next to this project
 *
 * Matching is by exact seeded titles/names or the unique test patterns those
 * scripts generated. Anything that cannot be attributed with certainty (seeded
 * categories/tags still referenced by content, articles written by staff) is
 * reported as "review" and is never deleted by this script.
 */
const apply = process.argv.includes("--apply");

const SEEDED_ARTICLE_TITLES = [
  "Team A Clinches National Championship",
  "Fintech Innovations Accelerate Across West African Markets",
  "New Civic Infrastructure Projects Commissioned in Greater Accra",
  "Global Commodities Rally as Gold and Cocoa Reach Five-Year Highs",
  "Artificial Intelligence Adoption Expands in African Agriculture",
  "Elections & Democratic Governance: Parliamentary Session Highlights",
  "Green Energy Transition: Solar Microgrids Power Rural Communities",
  "Upcoming Trade Corridors: AfCFTA Harmonization Guidelines Draft"
];
const TEST_ARTICLE_PATTERNS = [
  /^Notification Test Article \d+$/,
  /^Master Test Real Article \d+( - Updated)?$/,
  /^Phase 9 Analytics Test Article$/,
  /^Private Unpublished Draft Article$/
];
const SEEDED_TAXONOMY = {
  categories: ["Sports", "Technology", "Local News", "Foreign News", "Business", "E-commerce", "Trading", "Lifestyle", "Politics", "World"],
  tags: ["AfCFTA", "Fintech", "Championship", "Elections & Governance", "AI & Innovation", "Commodities & Oil", "Green Energy", "Urban Infrastructure", "Breaking News", "Culture & Heritage"]
};
const DEMO_CAMPAIGNS = ["Enterprise Brand Partnerships 2026", "Pan-African Fintech Summit 2026", "Future Tech Expo", "Past Holiday Sale", "Date Inversion Campaign", "Malicious Campaign", "Missing Media Campaign"];

const ids = (docs) => docs.map((d) => d._id);
const label = (docs, field) => docs.map((d) => `${d._id}  ${d[field] ?? ""}`);

await connectDatabase();
try {
  const db = mongoose.connection.db;
  const col = (name) => db.collection(name);

  const articles = await col("articles").find({}, { projection: { title: 1, status: 1, category: 1, tags: 1, author: 1 } }).toArray();
  const demoArticles = articles.filter((a) => SEEDED_ARTICLE_TITLES.includes(a.title) || TEST_ARTICLE_PATTERNS.some((p) => p.test(a.title)));
  const demoArticleIds = ids(demoArticles);
  const keptArticles = articles.filter((a) => !demoArticleIds.some((id) => id.equals(a._id)));

  const testAdmins = await col("admins").find({ email: /^(author|editor)\.test\.\d+@newsfront\.com$/ }, { projection: { email: 1, role: 1 } }).toArray();
  const testCategories = await col("categories").find({ name: /^Notification Cat \d+$/ }, { projection: { name: 1 } }).toArray();
  const ads = await col("advertisements").find({ campaignName: { $in: DEMO_CAMPAIGNS } }, { projection: { campaignName: 1, status: 1, media: 1 } }).toArray();
  const media = await col("media").find({ fileId: /^seed_/ }, { projection: { fileId: 1, url: 1, name: 1 } }).toArray();
  const linked = {
    articlerevisions: await col("articlerevisions").find({ articleId: { $in: demoArticleIds } }, { projection: { _id: 1 } }).toArray(),
    editorialsubmissions: await col("editorialsubmissions").find({ articleId: { $in: demoArticleIds } }, { projection: { _id: 1 } }).toArray(),
    editorialcomments: await col("editorialcomments").find({ articleId: { $in: demoArticleIds } }, { projection: { _id: 1 } }).toArray(),
    articlecomments: await col("articlecomments").find({ articleId: { $in: demoArticleIds } }, { projection: { _id: 1 } }).toArray(),
    pageviewevents: await col("pageviewevents").find({ articleId: { $in: demoArticleIds } }, { projection: { _id: 1 } }).toArray()
  };
  const notifications = await col("notifications").find({
    $or: [
      { title: /^Master Test Notification \d+$/ },
      { entityId: { $in: [...demoArticleIds, ...ids(linked.editorialsubmissions)] } }
    ]
  }, { projection: { title: 1, type: 1 } }).toArray();

  // Seeded taxonomy is "review" only: it may now be deliberately in use.
  const usedCategoryIds = new Set(keptArticles.map((a) => String(a.category)));
  const usedTagIds = new Set(keptArticles.flatMap((a) => (a.tags || []).map(String)));
  const seededCategories = await col("categories").find({ name: { $in: SEEDED_TAXONOMY.categories } }, { projection: { name: 1 } }).toArray();
  const seededTags = await col("tags").find({ name: { $in: SEEDED_TAXONOMY.tags } }, { projection: { name: 1 } }).toArray();

  const report = {
    mode: apply ? "apply" : "report",
    removable: {
      articles: demoArticles.map((a) => `${a._id}  [${a.status}] ${a.title}`),
      admins: label(testAdmins, "email"),
      categories: label(testCategories, "name"),
      advertisements: ads.map((a) => `${a._id}  [${a.status}] ${a.campaignName}`),
      media: media.map((m) => `${m._id}  ${m.fileId} ${m.url}`),
      notifications: label(notifications, "title"),
      linkedRecordCounts: Object.fromEntries(Object.entries(linked).map(([k, v]) => [k, v.length]))
    },
    review: {
      seededCategories: seededCategories.map((c) => `${c.name}${usedCategoryIds.has(String(c._id)) ? " (used by kept content)" : ""}`),
      seededTags: seededTags.map((t) => `${t.name}${usedTagIds.has(String(t._id)) ? " (used by kept content)" : ""}`),
      articlesKept: keptArticles.map((a) => `${a._id}  [${a.status}] ${a.title}`),
      note: "analyticsdailies aggregates may include traffic generated by the removed test scripts; they are left untouched."
    }
  };
  console.log(JSON.stringify(report, null, 2));

  if (apply) {
    const backup = {
      articles: await col("articles").find({ _id: { $in: demoArticleIds } }).toArray(),
      admins: await col("admins").find({ _id: { $in: ids(testAdmins) } }).toArray(),
      categories: await col("categories").find({ _id: { $in: ids(testCategories) } }).toArray(),
      advertisements: await col("advertisements").find({ _id: { $in: ids(ads) } }).toArray(),
      media: await col("media").find({ _id: { $in: ids(media) } }).toArray(),
      notifications: await col("notifications").find({ _id: { $in: ids(notifications) } }).toArray()
    };
    for (const [name, docs] of Object.entries(linked)) backup[name] = await col(name).find({ _id: { $in: ids(docs) } }).toArray();
    const file = path.resolve(`demo-records-backup-${Date.now()}.json`);
    fs.writeFileSync(file, JSON.stringify(backup));
    console.log(`Backup written: ${file}`);

    // Notifications addressed to test admins go with them.
    const removed = {};
    for (const [name, docs] of Object.entries(linked)) removed[name] = (await col(name).deleteMany({ _id: { $in: ids(docs) } })).deletedCount;
    removed.notifications = (await col("notifications").deleteMany({ $or: [{ _id: { $in: ids(notifications) } }, { recipientId: { $in: ids(testAdmins) } }] })).deletedCount;
    removed.articles = (await col("articles").deleteMany({ _id: { $in: demoArticleIds } })).deletedCount;
    removed.advertisements = (await col("advertisements").deleteMany({ _id: { $in: ids(ads) } })).deletedCount;
    removed.media = (await col("media").deleteMany({ _id: { $in: ids(media) } })).deletedCount;
    removed.categories = (await col("categories").deleteMany({ _id: { $in: ids(testCategories) } })).deletedCount;
    removed.admins = (await col("admins").deleteMany({ _id: { $in: ids(testAdmins) }, role: { $ne: "super_admin" } })).deletedCount;
    console.log(JSON.stringify({ removed }, null, 2));
  }
} finally {
  await disconnectDatabase();
}
