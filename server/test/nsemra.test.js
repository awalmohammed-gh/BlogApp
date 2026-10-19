import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// Always an isolated, disposable replica set. Never the project's configured database.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY = crypto.randomBytes(48).toString("hex");
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.FRONTEND_URL = "http://localhost:5173";
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(".cache/mongodb");
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
process.env.SMTP_FROM = "";
// Importer resolves the owning Super Admin from ADMIN_EMAIL; use the test account.
process.env.ADMIN_EMAIL = "owner@example.test";

const run = promisify(execFile);

test("Nsemra News: env Super Admin login, real article persistence and notification deletion", { timeout: 600000 }, async (t) => {
  const repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: "7.0.14" } });
  process.env.MONGODB_URI = repl.getUri("nsemra_test");
  const { default: app } = await import("../src/app.js");
  const { default: Admin } = await import("../src/models/Admin.js");
  const { default: Article } = await import("../src/models/Article.js");
  const { default: Category } = await import("../src/models/Category.js");
  const { default: Tag } = await import("../src/models/Tag.js");
  const { default: Notification } = await import("../src/models/Notification.js");
  const { default: AuditLog } = await import("../src/models/AdminAuditLog.js");
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => { await new Promise((r) => server.close(r)); await mongoose.disconnect(); await repl.stop(); });

  const request = async (url, { method = "GET", body, cookie, expected = 200 } = {}) => {
    const response = await fetch(`${base}${url}`, {
      method,
      headers: { "Content-Type": "application/json", Origin: process.env.FRONTEND_URL, ...(cookie ? { Cookie: cookie } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {})
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    assert.equal(response.status, expected, `${method} ${url}: ${text}`);
    return { data, text, setCookie: response.headers.getSetCookie(), cookie: response.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
  };

  // Credentials only exist inside this test process; they mirror ADMIN_EMAIL / ADMIN_PASSWORD.
  const envAdmin = { email: "owner@example.test", password: `Env-Only-${crypto.randomBytes(6).toString("hex")}!` };
  const syncScript = (extraArgs = [], overrides = {}) =>
    run(process.execPath, ["src/scripts/syncSuperAdmin.js", ...extraArgs], {
      cwd: path.resolve("."),
      env: { ...process.env, MONGODB_URI: process.env.MONGODB_URI, ADMIN_EMAIL: envAdmin.email, ADMIN_PASSWORD: envAdmin.password, ...overrides }
    });

  let superCookie;
  await t.test("env credentials: explicit sync creates a hashed Super Admin; login works and wrong credentials fail", async () => {
    const dry = await syncScript(["--dry-run"]);
    assert.match(dry.stdout, /Create Super Admin/);
    assert.equal(await Admin.countDocuments(), 0, "dry run must not write");

    await syncScript();
    const stored = await Admin.findOne({ email: envAdmin.email }).select("+passwordHash").lean();
    assert.equal(stored.role, "super_admin");
    assert.notEqual(stored.passwordHash, envAdmin.password);
    assert.match(stored.passwordHash, /^\$2[aby]\$/);

    const again = await syncScript();
    assert.match(again.stdout, /Nothing to change/);

    const login = await request("/admin/auth/login", { method: "POST", body: { email: envAdmin.email.toUpperCase(), password: envAdmin.password } });
    assert.equal(login.data.admin.role, "super_admin");
    assert.ok(!("token" in login.data), "JWT must not be in the response body");
    assert.ok(!login.text.includes(envAdmin.password));
    assert.ok(login.setCookie.some((c) => /HttpOnly/i.test(c)), "session cookie must be HttpOnly");
    superCookie = login.cookie;
    assert.equal((await request("/admin/auth/me", { cookie: superCookie })).data.admin.email, envAdmin.email);

    await request("/admin/auth/login", { method: "POST", expected: 401, body: { email: envAdmin.email, password: "wrong-password-123" } });
    await request("/admin/auth/login", { method: "POST", expected: 401, body: { email: "nobody@example.test", password: envAdmin.password } });
    await request("/admin/auth/login", { method: "POST", expected: 400, body: { email: "not-an-email", password: "" } });
    await request("/admin/auth/me", { expected: 401 });
    await request("/admin/articles", { expected: 401 });

    const logout = await request("/admin/auth/logout", { method: "POST", cookie: superCookie });
    assert.ok(logout.setCookie.some((c) => /Expires=Thu, 01 Jan 1970/i.test(c)), "logout clears the cookie");
    superCookie = (await request("/admin/auth/login", { method: "POST", body: envAdmin })).cookie;
  });

  await t.test("credential sync never converts staff accounts and re-hashing revokes old sessions", async () => {
    await Admin.create({ name: "Existing Editor", email: "editor-owned@example.test", role: "editor", status: "active", passwordHash: await Admin.hashPassword("Editor-Password-1") });
    await assert.rejects(syncScript([], { ADMIN_EMAIL: "editor-owned@example.test" }), (err) => /never converted/.test(err.stdout + err.stderr));
    assert.equal((await Admin.findOne({ email: "editor-owned@example.test" })).role, "editor");

    const oldCookie = superCookie;
    envAdmin.password = `Rotated-${crypto.randomBytes(6).toString("hex")}!`;
    await syncScript();
    await request("/admin/auth/me", { cookie: oldCookie, expected: 401 });
    superCookie = (await request("/admin/auth/login", { method: "POST", body: envAdmin })).cookie;
  });

  // Staff accounts for the editorial journeys (disposable database only)
  const staffPassword = "Controlled-Staff-Password-1!";
  const editor = await Admin.create({ name: "Test Editor", email: "editor@example.test", role: "editor", status: "active", passwordHash: await Admin.hashPassword(staffPassword) });
  const author = await Admin.create({ name: "Test Author", email: "author@example.test", role: "author", status: "active", passwordHash: await Admin.hashPassword(staffPassword) });
  const editorCookie = (await request("/admin/auth/login", { method: "POST", body: { email: editor.email, password: staffPassword } })).cookie;
  const authorCookie = (await request("/admin/auth/login", { method: "POST", body: { email: author.email, password: staffPassword } })).cookie;

  let category;
  let tag;
  await t.test("empty database: no articles, categories, tags or notifications are invented", async () => {
    assert.equal((await request("/admin/articles", { cookie: superCookie })).data.data.length, 0);
    assert.equal((await request("/articles")).data.data.length, 0);
    assert.equal((await request("/admin/notifications", { cookie: superCookie })).data.data.length, 0);
    assert.equal(await Category.countDocuments(), 0);
    assert.equal(await Tag.countDocuments(), 0);
    category = await Category.create({ name: "Politics", slug: "politics", status: "active", createdBy: editor._id });
    tag = await Tag.create({ name: "Elections", slug: "elections", status: "active", createdBy: editor._id });
  });

  let draft;
  await t.test("save draft persists, later saves update the same record, stale editors get 409", async () => {
    const created = await request("/admin/articles", {
      method: "POST", cookie: authorCookie, expected: 201,
      body: {
        title: "Parliament passes the budget", excerpt: "Summary", content: "<h2>Heading</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>One</li></ul>",
        category: String(category._id), tags: [String(tag._id)], status: "draft", commentsEnabled: false,
        featuredImage: { url: "https://ik.imagekit.io/demo/budget.jpg", fileId: "file_1", alt: "Members of parliament voting" },
        seo: { metaTitle: "Budget passed", canonicalUrl: "", ogTitle: "Budget passed", ogDescription: "", ogImage: "" }
      }
    });
    draft = created.data.data;
    assert.equal(draft.status, "draft");
    assert.equal(String(draft.author._id || draft.author), String(author._id), "author identity comes from the session");

    const reloaded = (await request(`/admin/articles/${draft._id}`, { cookie: authorCookie })).data.data;
    assert.equal(reloaded.content, created.data.data.content, "rich text survives a fresh read");
    assert.equal(reloaded.featuredImage.alt, "Members of parliament voting");
    assert.equal(reloaded.commentsEnabled, false);

    const updated = await request(`/admin/articles/${draft._id}`, { method: "PATCH", cookie: authorCookie, body: { title: "Parliament passes the 2027 budget", expectedUpdatedAt: reloaded.updatedAt } });
    assert.equal(updated.data.data._id, draft._id);
    assert.equal(await Article.countDocuments(), 1, "saving again must not create a duplicate");

    await request(`/admin/articles/${draft._id}`, { method: "PATCH", cookie: editorCookie, expected: 409, body: { title: "Stale overwrite", expectedUpdatedAt: reloaded.updatedAt } });
    assert.equal((await Article.findById(draft._id)).title, "Parliament passes the 2027 budget");

    await request("/admin/articles", { method: "POST", cookie: authorCookie, expected: 400, body: { title: "Bad taxonomy", content: "<p>x</p>", category: String(new mongoose.Types.ObjectId()), status: "draft" } });
    await request("/admin/articles", { method: "POST", cookie: authorCookie, expected: 400, body: { title: "Bad tag", content: "<p>x</p>", category: String(category._id), tags: [String(new mongoose.Types.ObjectId())], status: "draft" } });
    await request(`/articles/${draft.slug}`, { expected: 404 });
  });

  await t.test("editorial workflow: authors cannot publish; approved article becomes public and honours comments toggle", async () => {
    await request(`/admin/articles/${draft._id}/publish`, { method: "POST", cookie: authorCookie, expected: 403, body: {} });
    await request(`/admin/articles/${draft._id}/submit`, { method: "POST", cookie: authorCookie, body: {} });
    const submissionId = (await Article.findById(draft._id)).currentSubmission;
    await request(`/admin/editorial/${submissionId}/approve`, { method: "POST", cookie: editorCookie, body: { reviewNote: "Checked." } });
    await request(`/admin/articles/${draft._id}/publish`, { method: "POST", cookie: editorCookie, body: {} });

    const publicArticle = (await request(`/articles/${draft.slug}`)).data.data.article;
    assert.equal(publicArticle.title, "Parliament passes the 2027 budget");
    assert.equal((await request("/articles")).data.data.length, 1);
    assert.equal((await request(`/articles/${draft.slug}/comments`)).data.commentsEnabled, false);
    await request(`/articles/${draft.slug}/comments`, { method: "POST", expected: 403, body: { name: "Reader", email: "r@example.test", content: "Hello", website: "" } });
  });

  await t.test("notifications come from real events; deletion is recipient-scoped and counts stay exact", async () => {
    // Ten real submission events: each notifies the editor and the Super Admin
    await Notification.deleteMany({});
    for (let i = 0; i < 10; i++) {
      const a = (await request("/admin/articles", { method: "POST", cookie: authorCookie, expected: 201, body: { title: `Event source ${i}`, content: "<p>Body</p>", category: String(category._id), status: "draft" } })).data.data;
      await request(`/admin/articles/${a._id}/submit`, { method: "POST", cookie: authorCookie, body: {} });
    }
    const list = (await request("/admin/notifications?limit=20", { cookie: superCookie })).data;
    assert.equal(list.pagination.total, 10);
    assert.ok(list.data.every((n) => n.type === "article_submitted"));
    const ids = list.data.map((n) => n._id);
    for (const id of ids.slice(0, 4)) await request(`/admin/notifications/${id}/read`, { method: "PATCH", cookie: superCookie });
    assert.equal((await request("/admin/notifications/unread-count", { cookie: superCookie })).data.unreadCount, 6);

    // Delete three, two of them unread: Total 10 -> 7, Unread 6 -> 4
    const read = ids[0];
    const unread = ids.slice(4, 6);
    const single = (await request(`/admin/notifications/${read}`, { method: "DELETE", cookie: superCookie })).data;
    assert.equal(single.wasUnread, false);
    assert.equal(single.total, 9);
    assert.equal(single.unreadCount, 6);
    const bulk = (await request("/admin/notifications/bulk", { method: "DELETE", cookie: superCookie, body: { notificationIds: [...unread, unread[0]] } })).data;
    assert.equal(bulk.requestedCount, 2, "duplicate IDs are counted once");
    assert.equal(bulk.deletedCount, 2);
    assert.deepEqual([...bulk.deletedIds].sort(), [...unread].sort());
    assert.equal(bulk.total, 7);
    assert.equal(bulk.unreadCount, 4);
    assert.equal(await Notification.countDocuments({ _id: { $in: [read, ...unread] } }), 0, "removed from MongoDB");
    const after = (await request("/admin/notifications?limit=20", { cookie: superCookie })).data;
    assert.equal(after.pagination.total, 7);
    assert.ok(after.data.every((n) => ![read, ...unread].includes(n._id)), "deleted rows do not come back on refresh");

    // Isolation: the Super Admin cannot delete the editor's notifications
    const editorIds = (await request("/admin/notifications?limit=20", { cookie: editorCookie })).data.data.map((n) => n._id);
    await request(`/admin/notifications/${editorIds[0]}`, { method: "DELETE", cookie: superCookie, expected: 404 });
    const mixed = (await request("/admin/notifications/bulk-delete", { method: "POST", cookie: superCookie, body: { notificationIds: [editorIds[1], after.data[0]._id, String(new mongoose.Types.ObjectId())] } })).data;
    assert.equal(mixed.deletedCount, 1, "partial result reports the real count");
    assert.equal(mixed.unavailableIds.length, 2);
    assert.equal(await Notification.countDocuments({ _id: { $in: editorIds.slice(0, 2) } }), 2, "editor's notifications untouched");

    // Validation
    await request("/admin/notifications/bulk", { method: "DELETE", cookie: superCookie, expected: 400, body: { notificationIds: [] } });
    await request("/admin/notifications/bulk", { method: "DELETE", cookie: superCookie, expected: 400, body: { notificationIds: ["not-an-id"] } });
    await request("/admin/notifications/bulk", { method: "DELETE", cookie: superCookie, expected: 400, body: { notificationIds: Array.from({ length: 101 }, () => String(new mongoose.Types.ObjectId())) } });
    await request("/admin/notifications/not-an-id", { method: "DELETE", cookie: superCookie, expected: 400 });
    await request(`/admin/notifications/${editorIds[2]}`, { method: "DELETE", expected: 401 });

    // Deleting notifications never cascades into articles or audit history
    assert.equal(await Article.countDocuments(), 11);
    assert.ok((await AuditLog.countDocuments()) > 0);
  });

  await t.test("branding: logo and favicon must be Media Library images and are protected while in use", async () => {
    const { default: Media } = await import("../src/models/Media.js");
    const make = (name) => Media.create({ fileId: `fake_${name}`, url: `https://ik.example.test/branding/${name}.png`, filePath: `/branding/${name}.png`, name, mimeType: "image/png", extension: "png", folder: "branding", status: "active" });
    const logo = await make("logo");
    const favicon = await make("favicon");
    const settings = (await request("/admin/settings/general", { cookie: superCookie })).data.data;
    const save = (branding, expected = 200) =>
      request("/admin/settings/general", { method: "PATCH", cookie: superCookie, expected, body: { section: "branding", version: settings.version, values: { ...settings.values.branding, ...branding } } });

    // Rejected: URL not matching the media item, unknown media, or a URL without media
    await save({ logoUrl: "https://evil.example.test/x.png", logoMediaId: String(logo._id) }, 400);
    await save({ logoUrl: logo.url, logoMediaId: String(new mongoose.Types.ObjectId()) }, 400);
    await save({ faviconUrl: favicon.url, faviconMediaId: "" }, 400);

    const saved = (await save({ logoUrl: logo.url, logoMediaId: String(logo._id), logoIncludesName: true, faviconUrl: favicon.url, faviconMediaId: String(favicon._id) })).data.data;
    const pub = (await request("/site/settings")).data.data.values.branding;
    assert.equal(pub.logoUrl, logo.url);
    assert.equal(pub.faviconUrl, favicon.url);
    assert.equal(pub.logoIncludesName, true);

    // In use: cannot be deleted from the Media Library, and the listing counts it
    const blocked = (await request(`/admin/media/${logo._id}`, { method: "DELETE", cookie: superCookie, expected: 409 })).data;
    assert.match(blocked.message, /site logo/i);
    await request(`/admin/media/${favicon._id}`, { method: "DELETE", cookie: superCookie, expected: 409 });
    const usage = (await request(`/admin/media/${logo._id}/usage`, { cookie: superCookie })).data;
    assert.equal(JSON.stringify(usage).includes("site_logo"), true);

    // Removing the logo frees it again
    await request("/admin/settings/general", { method: "PATCH", cookie: superCookie, body: { section: "branding", version: saved.version, values: { ...saved.values.branding, logoUrl: "", logoMediaId: "" } } });
    assert.equal((await request("/site/settings")).data.data.values.branding.logoUrl, "");
    const freed = (await request(`/admin/media/${logo._id}/usage`, { cookie: superCookie })).data;
    assert.equal(JSON.stringify(freed).includes("site_logo"), false);
  });

  await t.test("asset importer publishes exactly the stories in frontend/src/assets/blogs.js", async () => {
    const os = await import("node:os");
    const fsp = await import("node:fs/promises");
    const { __setStorageAdapterForTests } = await import("../src/config/imagekit.js");
    const { importAssetArticles, readArticleData } = await import("../src/scripts/importAssetArticles.js");
    const { default: Media } = await import("../src/models/Media.js");
    const { default: Revision } = await import("../src/models/ArticleRevision.js");
    const { items } = readArticleData();
    for (const name of [...new Set(items.map((i) => i.category))]) {
      if (!(await Category.exists({ name }))) await Category.create({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"), status: "active", createdBy: editor._id });
    }
    const junkCategory = await Category.create({ name: "Notification Cat 123456", slug: "notification-cat-123456", status: "active", createdBy: editor._id });
    const junk = await Article.create({ title: "Not in the data", slug: "not-in-the-data", content: "<p>x</p>", author: author._id, category: junkCategory._id, status: "published", publishedAt: new Date() });
    await Notification.create({ recipientId: editor._id, type: "article_published", title: "Junk", message: "Junk", entityType: "article", entityId: junk._id, actionUrl: "/admin/articles" });

    let uploads = 0;
    __setStorageAdapterForTests({ upload: async ({ fileName, folderPath }) => ({ fileId: `fake_${++uploads}`, url: `https://ik.example.test${folderPath}/${fileName}`, filePath: `${folderPath}/${fileName}`, width: 800, height: 500, size: 1000 }) });
    const backupDir = await fsp.mkdtemp(path.join(os.tmpdir(), "nsemra-import-"));
    try {
      const silent = () => {};
      const { result } = await importAssetArticles({ apply: true, backupDir, log: silent });
      assert.equal(result.imported, items.length);
      const uniqueImages = new Set(items.map((i) => i.imageFile)).size;
      assert.equal(uploads, uniqueImages, "a shared image file is uploaded once");
      assert.equal(await Media.countDocuments({ source: "migration" }), uniqueImages);

      assert.equal(await Article.countDocuments(), items.length, "only stories from the file remain");
      assert.equal(await Article.exists({ _id: junk._id }), null);
      assert.equal(await Notification.countDocuments({ entityId: junk._id }), 0);
      assert.equal(await Category.exists({ _id: junkCategory._id }), null, "test category removed");
      assert.equal(await Revision.countDocuments({ isApproved: true, isPublished: true }), items.length);

      const list = (await request(`/articles?limit=50`)).data;
      assert.equal(list.pagination.total, items.length);
      assert.equal(list.data[0].title, items[0].title, "first story in the file leads");
      const second = items[1];
      const detail = (await request(`/articles/${list.data[1].slug}`)).data.data.article;
      assert.equal(detail.title, second.title);
      assert.equal(detail.byline, second.author);
      assert.equal(detail.content, second.content);
      assert.equal(detail.views, 0, "no invented view counts");
      assert.ok(detail.featuredImage.url.startsWith("https://ik.example.test/"));

      const again = await importAssetArticles({ apply: true, backupDir, log: silent });
      assert.equal(again.result.imported, 0);
      assert.equal(again.result.alreadyImported, items.length);
      assert.equal(uploads, uniqueImages, "re-running uploads nothing");
      assert.equal(await Article.countDocuments(), items.length);
    } finally {
      __setStorageAdapterForTests(null);
      await fsp.rm(backupDir, { recursive: true, force: true });
    }
  });
});
