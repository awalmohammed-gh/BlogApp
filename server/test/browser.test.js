import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { mkdir, readdir, readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import express from "express";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { SMTPServer } from "smtp-server";
import { chromium } from "playwright";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET_KEY = crypto.randomBytes(48).toString("hex");
process.env.BCRYPT_SALT_ROUNDS = "4";
process.env.FRONTEND_URL = "http://localhost:5188";
process.env.MONGOMS_DOWNLOAD_DIR = path.resolve(".cache/mongodb");
// Explicit empties prevent dotenv from loading real SMTP credentials into tests.
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASSWORD = "";
process.env.SMTP_FROM = "";
process.env.SITE_STATS_CACHE_MS = "0";

// Safety guard: the browser talks to whatever API the built frontend was compiled
// against. Refuse to run unless that is this suite's isolated API, otherwise the
// journeys would write to the developer's real backend and database.
const assertIsolatedFrontendBuild = async () => {
  const assetsDir = path.resolve("../frontend/dist/assets");
  const bundles = (await readdir(assetsDir).catch(() => [])).filter((f) => f.endsWith(".js"));
  const source = (await Promise.all(bundles.map((f) => readFile(path.join(assetsDir, f), "utf8")))).join("\n");
  const apiUrls = [...new Set(source.match(/https?:\/\/[^"'`\s]+\/api\b/g) || [])];
  if (!apiUrls.includes("http://localhost:5055/api") || apiUrls.some((u) => u !== "http://localhost:5055/api")) {
    throw new Error(`frontend/dist must be built with VITE_API_URL=http://localhost:5055/api before browser tests (found: ${apiUrls.join(", ") || "none"}). See INTEGRATION_SETUP.md.`);
  }
};

test("browser journeys use real API, MongoDB and SMTP", { timeout: 180000 }, async (t) => {
  await assertIsolatedFrontendBuild();
  const repl = await MongoMemoryReplSet.create({ replSet: { count: 1 }, instanceOpts: [{ args: ["--setParameter", "enableTestCommands=1"] }], binary: { version: "7.0.14" } });
  process.env.MONGODB_URI = repl.getUri("newsfront_browser");
  const { default: app } = await import("../src/app.js");
  const { default: Admin } = await import("../src/models/Admin.js");
  const { default: Article } = await import("../src/models/Article.js");
  const { default: Revision } = await import("../src/models/ArticleRevision.js");
  const { default: Category } = await import("../src/models/Category.js");
  const { default: Comment } = await import("../src/models/ArticleComment.js");
  const { default: Contact } = await import("../src/models/ContactSubmission.js");
  const { default: Subscriber } = await import("../src/models/NewsletterSubscriber.js");
  const { default: Invitation } = await import("../src/models/AdminInvitation.js");
  const { runScheduledArticles } = await import("../src/services/articleScheduler.js");
  const { schedulePublication } = await import("../src/services/publicationService.js");
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
  const password = "Controlled-Browser-2048!";
  const admin = await Admin.create({ name: "Browser Administrator", email: "browser-admin@example.test", passwordHash: await Admin.hashPassword(password), role: "super_admin" });
  const author = await Admin.create({ name: "Browser Author", email: "browser-author@example.test", passwordHash: await Admin.hashPassword(password), role: "author" });
  const category = await Category.create({ name: "Browser Desk", slug: "browser-desk", status: "active" });
  const article = await Article.create({ title: "Browser acceptance story", slug: "browser-acceptance-story", content: "<p>Controlled acceptance story body.</p>", author: author._id, category: category._id, status: "published", publishedAt: new Date(Date.now() - 1000) });
  const revision = await Revision.create({ articleId: article._id, version: 1, title: article.title, slug: article.slug, content: article.content, category: category._id, createdBy: author._id, isApproved: true, isPublished: true });
  article.publishedRevision = revision._id; await article.save();
  const api = app.listen(5055, "127.0.0.1");
  // Uploads go to a temp folder served by the test web server, never to the real ImageKit account
  const uploadsDir = await mkdtemp(path.join(os.tmpdir(), "nsemra-uploads-"));
  const { __setStorageAdapterForTests } = await import("../src/config/imagekit.js");
  let uploadCount = 0;
  __setStorageAdapterForTests({
    upload: async ({ buffer, fileName, folderPath }) => {
      const stored = `${++uploadCount}-${fileName}`;
      await writeFile(path.join(uploadsDir, stored), buffer);
      return { fileId: `test_${uploadCount}`, url: `http://localhost:5188/test-uploads/${stored}`, filePath: `${folderPath}/${stored}`, size: buffer.length };
    }
  });
  const web = express(); web.use("/test-uploads", express.static(uploadsDir)); web.use(express.static(path.resolve("../frontend/dist"))); web.get("*", (req, res) => res.sendFile(path.resolve("../frontend/dist/index.html")));
  const website = web.listen(5188);
  // Fail immediately if another service owns a test port; never run against it.
  await Promise.all([api, website].map((server) => new Promise((resolve, reject) => { if (server.listening) resolve(); else { server.once("listening", resolve); server.once("error", reject); } })));
  const messages = [];
  const smtp = new SMTPServer({ authOptional: true, disabledCommands: ["STARTTLS"], onData(stream, session, cb) { let text = ""; stream.on("data", (c) => text += c); stream.on("end", () => { messages.push(text.replace(/=\r?\n/g, "").replaceAll("=3D", "=")); cb(); }); } });
  await new Promise((resolve) => smtp.listen(0, "127.0.0.1", resolve));
  process.env.SMTP_HOST = "127.0.0.1"; process.env.SMTP_PORT = String(smtp.server.address().port); process.env.SMTP_FROM = "Nsemra News <news@example.test>";
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  t.after(async () => { __setStorageAdapterForTests(null); await rm(uploadsDir, { recursive: true, force: true }); await browser.close(); await Promise.all([new Promise((r) => api.close(r)), new Promise((r) => website.close(r)), new Promise((r) => smtp.close(r))]); await mongoose.disconnect(); await repl.stop(); });
  const reader = await browser.newContext();
  const staff = await browser.newContext();
  const page = await reader.newPage();
  const dashboard = await staff.newPage();
  const errors = [];
  for (const p of [page, dashboard]) p.on("pageerror", (e) => errors.push(e.message));
  await mkdir("test-results", { recursive: true });
  t.afterEach(async (subtest) => { console.log("Browser step finished: " + subtest.name); });
  page.setDefaultTimeout(10000); dashboard.setDefaultTimeout(10000);
  const visible = async (locator) => { await locator.waitFor({ state: "visible" }); assert.ok(await locator.isVisible()); };
  const waitText = (p, text) => p.getByText(text, { exact: false }).first().waitFor({ state: "visible" });
  console.log("Browser fixtures and services ready");
  await t.test("reader comment submits pending, admin approves, public refresh shows approved content", async () => {
    await page.goto(`http://localhost:5188/blog-details/${article.slug}`);
    const comments = page.locator('section[aria-labelledby="comments-heading"]');
    await comments.getByLabel("Name", { exact: true }).fill("Browser Reader");
    await comments.getByLabel("Email", { exact: true }).fill("browser-reader@example.test");
    await comments.getByLabel("Comment", { exact: true }).fill("Browser comment persisted and moderated.");
    await comments.getByRole("button", { name: "Submit for moderation" }).click();
    await waitText(page, "Your comment has been submitted for moderation.");
    assert.equal((await Comment.findOne({ commenterEmail: "browser-reader@example.test" })).status, "pending");
    await dashboard.goto("http://localhost:5188/admin/login");
    await dashboard.locator('input[type="email"]').fill(admin.email); await dashboard.locator('input[type="password"]').fill(password);
    await dashboard.getByRole("button", { name: /sign in|authenticate/i }).click();
    await dashboard.waitForURL("**/admin");
    await dashboard.goto("http://localhost:5188/admin/comments");
    // Opens on the pending queue
    await waitText(dashboard, "Browser comment persisted and moderated.");
    await dashboard.getByRole("button", { name: "Approve", exact: true }).click();
    await waitText(dashboard, "Comment approved.");
    assert.equal((await Comment.findOne({ commenterEmail: "browser-reader@example.test" })).status, "approved");
    await page.reload(); await waitText(page, "Browser comment persisted and moderated.");
    await visible(page.getByRole("heading", { name: "Comments & Discussion (1)" }));
    await page.screenshot({ path: "test-results/comments.png", fullPage: true });

    // Reject with an optional reason; it is stored and shown to moderators only
    await Comment.create({ articleId: article._id, commenterName: "Spam Bot", commenterEmail: "bot@example.test", content: "Buy followers now", status: "pending" });
    await dashboard.getByRole("button", { name: "Refresh" }).click();
    await waitText(dashboard, "Buy followers now");
    await dashboard.getByRole("button", { name: "Reject", exact: true }).click();
    await dashboard.getByLabel("Reason (optional)").fill("Promotional link");
    await dashboard.locator("form").getByRole("button", { name: "Reject", exact: true }).click();
    await waitText(dashboard, "Comment rejected.");
    const rejected = await Comment.findOne({ commenterEmail: "bot@example.test" });
    assert.equal(rejected.status, "rejected");
    assert.equal(rejected.moderationReason, "Promotional link");
    await dashboard.getByRole("tab", { name: /^Rejected/ }).click();
    await waitText(dashboard, "Reason: Promotional link");
    await visible(page.getByRole("heading", { name: "Comments & Discussion (1)" }));
    await dashboard.screenshot({ path: "test-results/admin-comments.png", fullPage: true });
  });
  await t.test("contact form stores enquiry, admin changes status and refresh preserves it", async () => {
    await page.goto("http://localhost:5188/contact");
    await page.locator('input[name="name"]').fill("Browser Contact"); await page.locator('input[name="email"]').fill("browser-contact@example.test");
    await page.locator('input[name="subject"]').fill("Browser enquiry"); await page.locator('textarea[name="message"]').fill("Persist this browser enquiry.");
    await page.getByRole("button", { name: /send message|submit/i }).click(); await waitText(page, "Your message has been received successfully.");
    assert.equal(await Contact.countDocuments({ email: "browser-contact@example.test" }), 1);
    await dashboard.goto("http://localhost:5188/admin/enquiries");
    // New tab lists it; opening shows the full message and a reply link to the sender
    await dashboard.getByRole("button", { name: /Browser enquiry/ }).click();
    await waitText(dashboard, "Persist this browser enquiry.");
    const replyHref = await dashboard.getByRole("link", { name: "Reply by email" }).getAttribute("href");
    assert.ok(replyHref.startsWith("mailto:browser-contact@example.test?subject=Re%3A%20Browser%20enquiry"), replyHref);
    await dashboard.getByRole("group", { name: "Set status" }).getByRole("button", { name: "Resolved" }).click();
    await waitText(dashboard, "Marked as resolved.");
    assert.equal((await Contact.findOne({ email: "browser-contact@example.test" })).status, "resolved");
    await dashboard.screenshot({ path: "test-results/admin-enquiries.png", fullPage: true });
    await dashboard.reload();
    await waitText(dashboard, "No new enquiries");
    await dashboard.getByRole("tab", { name: /^Resolved/ }).click();
    await waitText(dashboard, "Browser enquiry");
  });
  await t.test("newsletter saves request, SMTP link verifies and unsubscribe updates stored status", async () => {
    await page.goto("http://localhost:5188/");
    await page.locator('input[type="email"]').fill("browser-newsletter@example.test"); await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /subscribe|join|get briefing/i }).click(); await waitText(page, "Request recorded");
    assert.equal((await Subscriber.findOne({ email: "browser-newsletter@example.test" })).status, "pending_verification");
    const mail = messages.at(-1);
    const verify = mail.match(/http[^\s<>]*\/newsletter\/confirm\?token=[a-f\d]{64}/)[0];
    const unsubscribe = mail.match(/http[^\s<>]*\/newsletter\/unsubscribe\?token=[a-f\d]{64}/)[0];
    await page.goto(verify); await page.getByRole("button", { name: "Confirm subscription" }).click(); await waitText(page, "Your email is verified and your subscription is active.");
    await page.goto(unsubscribe); await page.getByRole("button", { name: "Unsubscribe", exact: true }).click(); await waitText(page, "You have been unsubscribed.");
    await dashboard.goto("http://localhost:5188/admin/subscribers"); await waitText(dashboard, "browser-newsletter@example.test");
  });
  await t.test("saved settings survive reload and update the public brand", async () => {
    const { default: SiteSettings } = await import("../src/models/SiteSettings.js");
    const stored = async () => (await SiteSettings.findOne({ key: "global" }).lean()).values;
    await dashboard.goto("http://localhost:5188/admin/settings");
    const saveBar = dashboard.getByRole("button", { name: "Save changes" });

    // Client-side validation blocks a bad email; Discard restores the saved value
    await dashboard.getByLabel("Email", { exact: true }).fill("not-an-email");
    await waitText(dashboard, "Enter a valid email address.");
    await saveBar.click(); await waitText(dashboard, "Please fix the highlighted fields.");
    assert.equal((await stored()).general?.contactEmail || "", "");
    await dashboard.getByRole("button", { name: "Discard" }).click();
    await saveBar.waitFor({ state: "hidden" });

    // An unsaved edit in General survives saving another section
    await dashboard.getByLabel("Site name", { exact: true }).fill("Browser Verified News");
    await dashboard.getByRole("button", { name: /^Publishing/ }).click();
    await dashboard.getByRole("switch", { name: "Accept reader comments" }).click();
    await waitText(dashboard, "1 other section");
    await saveBar.click(); await waitText(dashboard, "Publishing settings saved.");
    assert.equal((await stored()).publishing.enableComments, false);
    await dashboard.getByRole("button", { name: /^General/ }).click();
    assert.equal(await dashboard.getByLabel("Site name", { exact: true }).inputValue(), "Browser Verified News");
    await saveBar.click(); await waitText(dashboard, "General settings saved.");

    // X handle is stored with @ and reaches the public twitter:site tag
    await dashboard.getByRole("button", { name: /^SEO/ }).click();
    await dashboard.getByLabel("X (Twitter) handle").fill("nsemranews");
    await saveBar.click(); await waitText(dashboard, "SEO & Sharing settings saved.");
    assert.equal((await stored()).seo.twitterHandle, "@nsemranews");

    // Restore comments for any later journeys
    await dashboard.getByRole("button", { name: /^Publishing/ }).click();
    await dashboard.getByRole("switch", { name: "Accept reader comments" }).click();
    await saveBar.click(); await waitText(dashboard, "Publishing settings saved.");
    assert.equal((await stored()).publishing.enableComments, true);

    await dashboard.reload();
    assert.equal(await dashboard.getByLabel("Site name", { exact: true }).inputValue(), "Browser Verified News");
    await page.goto("http://localhost:5188/"); await waitText(page, "Browser Verified News");
    assert.equal(await page.locator('meta[name="twitter:site"]').getAttribute("content"), "@nsemranews");
    await dashboard.screenshot({ path: "test-results/settings.png", fullPage: true });
  });
  await t.test("staff invitation accepted from actual SMTP message; new editor can log in", async () => {
    await dashboard.goto("http://localhost:5188/admin/authors");
    await dashboard.getByRole("button", { name: /invite.*member|invite.*staff/i }).first().click();
    const modal = dashboard.getByRole("dialog");
    await modal.locator('input[type="text"]').first().fill("Browser Invited Editor"); await modal.locator('input[type="email"]').fill("browser-invited@example.test");
    await modal.locator("select").selectOption("editor"); await modal.locator('button[type="submit"]').click();
    await waitText(dashboard, "The email provider accepted the invitation message.");
    const invite = messages.at(-1).match(/http[^\s<>"']*\/admin\/accept-invite\?token=[a-f\d]{64}/)[0];
    const newStaff = await browser.newContext(); const activate = await newStaff.newPage();
    await activate.goto(invite); await activate.locator('input[type="password"]').nth(0).fill(password); await activate.locator('input[type="password"]').nth(1).fill(password);
    await activate.getByRole("button", { name: /activate|accept|complete/i }).click(); await waitText(activate, "Account activated");
    const invited = await Admin.findOne({ email: "browser-invited@example.test" }); assert.equal(invited.status, "active");
    assert.ok((await Invitation.findOne({ adminId: invited._id })).consumedAt);
    await activate.goto("http://localhost:5188/admin/login"); await activate.locator('input[type="email"]').fill(invited.email); await activate.locator('input[type="password"]').fill(password);
    await activate.getByRole("button", { name: /sign in|authenticate/i }).click(); await activate.waitForURL("**/admin"); await newStaff.close();
  });
  await t.test("scheduled revision appears publicly only after the worker publishes it", async () => {
    const scheduled = await Article.create({ title: "Browser scheduled story", slug: "browser-scheduled-story", content: "<p>Approved scheduled content.</p>", author: author._id, category: category._id });
    const approved = await Revision.create({ articleId: scheduled._id, version: 1, title: scheduled.title, slug: scheduled.slug, content: scheduled.content, category: category._id, createdBy: author._id, isApproved: true });
    const due = new Date(Date.now() + 1000);
    await schedulePublication(scheduled._id, approved._id, due, admin._id);
    await page.goto(`http://localhost:5188/blog-details/${scheduled.slug}`); await waitText(page, "Article Not Found");
    await runScheduledArticles({ now: new Date(due.getTime() + 10) });
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, due - Date.now())));
    await page.reload(); await visible(page.getByRole("heading", { name: scheduled.title, exact: true }));
    assert.equal((await runScheduledArticles()).published, 0);
  });
  await t.test("failed database submission preserves reader input and shows no success", async () => {
    await page.goto("http://localhost:5188/contact");
    await page.locator('input[name="name"]').fill("Retained Reader");
    await page.locator('input[name="email"]').fill("retained@example.test");
    await page.locator('textarea[name="message"]').fill("Preserve this message after failure.");
    await mongoose.connection.db.admin().command({ configureFailPoint: "failCommand", mode: { times: 1 }, data: { failCommands: ["insert"], errorCode: 12345 } });
    await page.getByRole("button", { name: /send message|submit/i }).click();
    await waitText(page, "Unable to complete this request. Please try again.");
    assert.equal(await page.locator('textarea[name="message"]').inputValue(), "Preserve this message after failure.");
    assert.equal(await Contact.countDocuments({ email: "retained@example.test" }), 0);
  });
  await t.test("notifications: select, deselect, select all and confirmed deletes persist in MongoDB", async () => {
    const { default: Notification } = await import("../src/models/Notification.js");
    await Notification.deleteMany({ recipientId: admin._id });
    // Real events: the author submits three drafts for review, which notifies the Super Admin
    const api = async (url, { method = "GET", body, cookie } = {}) => {
      const res = await fetch(`http://127.0.0.1:5055/api${url}`, { method, headers: { "Content-Type": "application/json", Origin: "http://localhost:5188", ...(cookie ? { Cookie: cookie } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
      assert.ok(res.ok, `${method} ${url} -> ${res.status}`);
      return { data: await res.json(), cookie: res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ") };
    };
    const { cookie: authorCookie } = await api("/admin/auth/login", { method: "POST", body: { email: author.email, password } });
    for (let i = 1; i <= 3; i++) {
      const { data } = await api("/admin/articles", { method: "POST", cookie: authorCookie, body: { title: `Notification source ${i}`, content: "<p>Body</p>", category: String(category._id), status: "draft" } });
      await api(`/admin/articles/${data.data._id}/submit`, { method: "POST", cookie: authorCookie, body: {} });
    }
    assert.equal(await Notification.countDocuments({ recipientId: admin._id }), 3);
    const articlesBefore = await Article.countDocuments();

    await dashboard.goto("http://localhost:5188/admin/notifications");
    const rows = dashboard.getByRole("checkbox", { name: /^Select notification:/ });
    await rows.first().waitFor();
    assert.equal(await rows.count(), 3);
    await waitText(dashboard, "3 unread");

    await rows.nth(0).check();
    await waitText(dashboard, "1 notification selected on this page");
    await rows.nth(0).uncheck();
    await dashboard.getByText("selected on this page").waitFor({ state: "hidden" });

    await dashboard.getByLabel("Select all notifications on this page").check();
    await waitText(dashboard, "3 notifications selected on this page");
    await dashboard.getByRole("button", { name: "Deselect All" }).click();
    await dashboard.getByText("selected on this page").waitFor({ state: "hidden" });

    await rows.nth(0).check(); await rows.nth(1).check();
    await dashboard.getByRole("button", { name: "Delete Selected" }).click();
    await waitText(dashboard, "You're about to delete 2 selected notifications. This action cannot be undone.");
    await dashboard.getByRole("button", { name: "Delete Notifications" }).click();
    await waitText(dashboard, "Deleted 2 notifications");
    assert.equal(await Notification.countDocuments({ recipientId: admin._id }), 1);
    await waitText(dashboard, "1 unread");

    await dashboard.reload();
    await rows.first().waitFor();
    assert.equal(await rows.count(), 1, "deleted notifications stay gone after refresh");

    await dashboard.getByRole("button", { name: "Delete notification" }).click();
    await dashboard.getByRole("button", { name: "Delete Notification", exact: true }).click();
    await waitText(dashboard, "You're all caught up. No notifications to display.");
    assert.equal(await Notification.countDocuments({ recipientId: admin._id }), 0);
    assert.equal(await Article.countDocuments(), articlesBefore, "deleting notifications never removes articles");
    await dashboard.screenshot({ path: "test-results/notifications-empty.png", fullPage: true });
  });
  await t.test("about page stats are live: readers and desks follow the database, fixed figures stay", async () => {
    const { default: PageView } = await import("../src/models/PageViewEvent.js");
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const readers = async () => (await PageView.distinct("visitorKey", { occurredAt: { $gte: since } })).filter(Boolean).length;
    const desks = () => Category.countDocuments({ status: "active", deletedAt: null });
    const stat = (label) => page.locator(`[data-stat="${label}"]`);
    await page.goto("http://localhost:5188/about");
    await page.waitForFunction(() => document.querySelector('[data-stat="Monthly Readers"]')?.textContent !== "—");
    assert.equal(await stat("Monthly Readers").textContent(), String(await readers()));
    assert.equal(await stat("Regional Desks").textContent(), String(await desks()));
    assert.equal(await stat("Verified Accuracy").textContent(), "99.8%");
    assert.equal(await stat("Real-time Updates").textContent(), "24/7");

    // New activity appears without reloading the page
    await PageView.create({ eventType: "page_view", pageKey: "home", visitorKey: `live-${Date.now()}`, sessionKey: "s-live", occurredAt: new Date() });
    await Category.create({ name: "Live Desk", slug: "live-desk", status: "active" });
    const [expectedReaders, expectedDesks] = [String(await readers()), String(await desks())];
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await page.waitForFunction(([r, d]) =>
      document.querySelector('[data-stat="Monthly Readers"]')?.textContent === r && document.querySelector('[data-stat="Regional Desks"]')?.textContent === d,
      [expectedReaders, expectedDesks]);
    assert.equal(await stat("Verified Accuracy").textContent(), "99.8%");
    assert.equal(await stat("Real-time Updates").textContent(), "24/7");
  });
  await t.test("branding: uploaded logo and favicon apply to navbar, footer and browser tab", async () => {
    const { default: SiteSettings } = await import("../src/models/SiteSettings.js");
    const { default: Media } = await import("../src/models/Media.js");
    const branding = async () => (await SiteSettings.findOne({ key: "global" }).lean()).values.branding;
    // Real PNG files produced by the browser itself
    await dashboard.goto("http://localhost:5188/admin/settings");
    const logoPng = await dashboard.screenshot({ clip: { x: 0, y: 0, width: 240, height: 80 } });
    const faviconPng = await dashboard.screenshot({ clip: { x: 0, y: 0, width: 64, height: 64 } });

    await dashboard.getByRole("button", { name: /^Branding/ }).click();
    await dashboard.locator("#logo-upload").setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: logoPng });
    await waitText(dashboard, "Logo uploaded. Save to apply it to the site.");
    await visible(dashboard.getByTestId("preview-navbar").locator("img"));
    await visible(dashboard.getByTestId("preview-footer").locator("img"));
    await dashboard.locator("#favicon-upload").setInputFiles({ name: "favicon.png", mimeType: "image/png", buffer: faviconPng });
    await waitText(dashboard, "Favicon uploaded. Save to apply it to the site.");
    assert.equal((await branding()).logoUrl || "", "", "nothing changes on the site before saving");
    await dashboard.getByRole("button", { name: "Save changes" }).click();
    await waitText(dashboard, "Branding settings saved.");
    // Saving one section must not make other (untouched) sections look edited
    assert.equal(await dashboard.getByLabel("Unsaved changes").count(), 0);

    const saved = await branding();
    const logoMedia = await Media.findById(saved.logoMediaId).lean();
    assert.equal(logoMedia.url, saved.logoUrl);
    assert.equal(logoMedia.folder, "branding");
    assert.ok(saved.faviconUrl.startsWith("http://localhost:5188/test-uploads/"));

    // Public navbar and footer show the logo; the tab uses the favicon
    await page.goto("http://localhost:5188/");
    await visible(page.locator(`header img[src="${saved.logoUrl}"]`));
    await visible(page.locator(`footer img[src="${saved.logoUrl}"]`));
    await page.waitForFunction((href) => document.querySelector('link[rel="icon"]')?.href === href, saved.faviconUrl);
    assert.ok(await page.locator("header").getByText("Browser Verified News").first().isVisible(), "name shown beside a logo by default");

    // Logo that already contains the name: text hidden, image carries the name
    await dashboard.getByRole("switch", { name: "My logo already includes the site name" }).click();
    await dashboard.getByRole("button", { name: "Save changes" }).click();
    await waitText(dashboard, "Branding settings saved.");
    await page.reload();
    await visible(page.locator('header img[alt="Browser Verified News"]'));
    assert.equal(await page.locator("header").getByText("Stories That Matter.").count(), 0);

    // In-use images cannot be deleted from the Media Library
    const del = await dashboard.request.delete(`http://localhost:5055/api/admin/media/${saved.logoMediaId}`, { headers: { Origin: "http://localhost:5188" } });
    assert.equal(del.status(), 409);

    // Removing them restores the initials badge and the default favicon
    await dashboard.getByRole("button", { name: "Remove" }).first().click();
    await dashboard.getByRole("button", { name: "Remove" }).first().click();
    await dashboard.getByRole("button", { name: "Save changes" }).click();
    await waitText(dashboard, "Branding settings saved.");
    assert.equal((await branding()).logoUrl, "");
    await page.reload();
    await page.locator("header").getByText("Browser Verified News").first().waitFor();
    assert.equal(await page.locator(`header img[src="${saved.logoUrl}"]`).count(), 0);
    await page.waitForFunction(() => document.querySelector('link[rel="icon"]')?.getAttribute("href") === "/favicon.svg");
    await dashboard.screenshot({ path: "test-results/settings-branding.png", fullPage: true });
  });
  await t.test("article editor: rich text, cover, metadata and settings persist through draft, retry and review", async () => {
    const { default: Tag } = await import("../src/models/Tag.js");
    const tag = await Tag.create({ name: "Climate", slug: "climate", status: "active" });
    await dashboard.setViewportSize({ width: 1440, height: 1100 });
    await dashboard.goto("http://localhost:5188/admin/articles/new");
    await visible(dashboard.getByRole("heading", { name: "Create an article." }));
    await waitText(dashboard, "Not saved yet");
    await dashboard.getByRole("button", { name: "Save draft", exact: true }).click();
    await waitText(dashboard, "Article headline is required.");
    const title = "The communities bringing new life to Ghana's coastline";
    await dashboard.getByLabel("Headline", { exact: false }).fill(title);
    await dashboard.getByLabel("Subtitle", { exact: true }).fill("Local voices, shared solutions and a changing shore.");
    const body = dashboard.getByRole("textbox", { name: "Article body", exact: true });
    await body.fill("Coastal communities are working together to protect the places they call home. Local volunteers are restoring mangroves, documenting changes and sharing practical solutions with the next generation.");
    await body.press("ControlOrMeta+A");
    await dashboard.getByTitle("Bold (Ctrl+B)", { exact: true }).click();
    await dashboard.getByRole("button", { name: "HTML", exact: true }).click();
    const source = dashboard.getByLabel("Article HTML source");
    const html = await source.inputValue();
    assert.match(html, /<(b|strong)>/);
    await source.fill(html + "<p>Every story begins with listening to the people who live it.</p>");
    await dashboard.getByRole("button", { name: "Visual", exact: true }).click();
    assert.match(await body.innerText(), /Every story begins/);
    await dashboard.getByRole("textbox", { name: "Story summary", exact: true }).fill("Meet the people working together to restore coastal habitats and protect their communities.");
    await dashboard.getByLabel("Category", { exact: false }).selectOption(String(category._id));
    await dashboard.getByRole("button", { name: "Climate", exact: true }).click();
    await dashboard.getByText("Featured story", { exact: true }).click();
    await dashboard.getByText("Reader comments", { exact: true }).click();

    const coverPng = Buffer.from(await dashboard.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 960; canvas.height = 540;
      const ctx = canvas.getContext("2d"); const gradient = ctx.createLinearGradient(0, 0, 960, 540);
      gradient.addColorStop(0, "#115e59"); gradient.addColorStop(1, "#38bdf8");
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, 960, 540);
      ctx.fillStyle = "#ffffff33"; ctx.beginPath(); ctx.arc(810, 120, 280, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = "bold 54px sans-serif"; ctx.fillText("A changing coastline", 70, 390);
      return canvas.toDataURL("image/png").split(",")[1];
    }), "base64");
    await dashboard.getByLabel("Upload cover image", { exact: true }).setInputFiles({ name: "coastline.png", mimeType: "image/png", buffer: coverPng });
    await visible(dashboard.getByAltText("Article cover preview"));
    await dashboard.getByLabel("Image description", { exact: true }).fill("Community coastline reporting cover");
    await dashboard.getByRole("button", { name: /Search & social/ }).click();
    await dashboard.getByLabel("URL slug", { exact: true }).fill("communities-ghana-coastline");
    await dashboard.getByLabel("SEO title", { exact: true }).fill("Ghana's coastline: communities leading change");
    await dashboard.getByLabel("Meta description", { exact: true }).fill("Local voices and shared solutions from Ghana's coastal communities.");
    await dashboard.getByLabel("Social title", { exact: true }).fill("Stories from the shore");
    await dashboard.getByRole("button", { name: /Search & social/ }).click();
    await dashboard.getByRole("button", { name: "Preview", exact: true }).click();
    await visible(dashboard.getByRole("heading", { name: title, exact: true }));
    await visible(dashboard.getByText("Every story begins with listening to the people who live it.", { exact: true }).last());
    await dashboard.getByLabel("Close preview", { exact: true }).click();
    await dashboard.evaluate(() => scrollTo(0, 0));
    await dashboard.getByText("Image added to your media library.", { exact: true }).waitFor({ state: "hidden" });
    await dashboard.screenshot({ path: "test-results/create-article-desktop.png", fullPage: true });
    await dashboard.setViewportSize({ width: 390, height: 844 });
    await dashboard.waitForFunction(() => getComputedStyle(document.querySelector("main").parentElement).marginLeft === "0px");
    await dashboard.screenshot({ path: "test-results/create-article-mobile.png", fullPage: true });
    assert.equal(await dashboard.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    await dashboard.getByRole("button", { name: "Save draft", exact: true }).click();
    await dashboard.waitForURL(/\/admin\/articles\/[a-f0-9]+\/edit$/);
    await waitText(dashboard, "All changes saved");
    let saved = await Article.findOne({ slug: "communities-ghana-coastline" }).lean();
    assert.equal(saved.status, "draft"); assert.equal(saved.title, title);
    assert.equal(saved.isFeatured, true); assert.equal(saved.commentsEnabled, false);
    assert.equal(String(saved.category), String(category._id)); assert.ok(saved.tags.some((id) => String(id) === String(tag._id)));
    assert.ok(saved.featuredImage.media); assert.equal(saved.featuredImage.alt, "Community coastline reporting cover");
    assert.equal(saved.seo.ogTitle, "Stories from the shore"); assert.match(saved.content, /<(b|strong)>/);
    await dashboard.reload(); await waitText(dashboard, "All changes saved");
    assert.equal(await dashboard.getByLabel("Headline", { exact: false }).inputValue(), title);
    assert.match(await dashboard.getByRole("textbox", { name: "Article body", exact: true }).innerText(), /Every story begins/);
    await dashboard.getByLabel("Headline", { exact: false }).fill(title + ": a local view");
    await dashboard.route("**/api/admin/articles/*", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, message: "Temporary story save failure." }) });
    });
    await dashboard.getByRole("button", { name: "Save draft", exact: true }).click();
    await waitText(dashboard, "Temporary story save failure.");
    assert.equal(await dashboard.getByLabel("Headline", { exact: false }).inputValue(), title + ": a local view");
    assert.equal((await Article.findById(saved._id)).title, title);
    await dashboard.unroute("**/api/admin/articles/*");
    await dashboard.getByRole("button", { name: "Save draft", exact: true }).click();
    await dashboard.getByText("Unsaved changes", { exact: true }).waitFor({ state: "hidden" });
    assert.equal(await Article.countDocuments({ slug: "communities-ghana-coastline" }), 1, "saving again updates the same draft");
    assert.equal((await Article.findById(saved._id)).title, title + ": a local view");
    await dashboard.getByRole("button", { name: "Submit for review", exact: true }).click();
    await visible(dashboard.getByRole("heading", { name: "Submit Article for Editorial Review" }));
    await dashboard.getByRole("dialog").getByRole("button", { name: "Submit to Desk", exact: true }).click();
    await dashboard.waitForURL("**/admin/articles");
    saved = await Article.findById(saved._id).lean();
    assert.equal(saved.status, "pending_review"); assert.ok(await Revision.findOne({ articleId: saved._id }));
  });

  await t.test("article editor: authors can write and submit on mobile with publication controls restricted", async () => {
    const authorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const writer = await authorContext.newPage();
    writer.on("pageerror", (error) => errors.push(error.message));
    try {
      await writer.goto("http://localhost:5188/admin/login");
      await writer.locator('input[type="email"]').fill(author.email); await writer.locator('input[type="password"]').fill(password);
      await writer.getByRole("button", { name: /sign in|authenticate/i }).click(); await writer.waitForURL("**/admin");
      await writer.goto("http://localhost:5188/admin/articles/new");
      await visible(writer.getByRole("heading", { name: "Create an article." }));
      assert.equal(await writer.getByText("Publication options", { exact: true }).count(), 0);
      assert.equal(await writer.getByRole("switch", { name: "Featured story", exact: true }).count(), 0);
      await writer.getByLabel("Headline", { exact: false }).fill("Author's mobile newsroom story");
      await writer.getByRole("textbox", { name: "Article body", exact: true }).fill("A complete mobile draft, written and submitted for editorial review.");
      await writer.getByLabel("Category", { exact: false }).selectOption(String(category._id));
      await writer.getByRole("button", { name: "Submit for review", exact: true }).click();
      await writer.waitForURL("**/admin/articles");
      const submitted = await Article.findOne({ title: "Author's mobile newsroom story" }).lean();
      assert.equal(submitted.status, "pending_review"); assert.equal(String(submitted.author), String(author._id));
      assert.equal(submitted.isFeatured, false);
    } finally { await authorContext.close(); }
  });

  await t.test("profile: preview, save, replace and remove a photo with persistent personal details", async () => {
    const { default: Media } = await import("../src/models/Media.js");
    const { default: mediaUsageService } = await import("../src/services/mediaUsageService.js");
    await dashboard.setViewportSize({ width: 1440, height: 1080 });
    await dashboard.goto("http://localhost:5188/admin/profile");
    await visible(dashboard.getByRole("heading", { name: "My profile." }));
    const picker = dashboard.getByLabel("Choose profile photo");
    await picker.setInputFiles({ name: "invalid.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg></svg>") });
    await waitText(dashboard, "Choose a JPG, PNG or WebP image.");
    await picker.setInputFiles({ name: "broken.png", mimeType: "image/png", buffer: Buffer.from("not an image") });
    await waitText(dashboard, "This image could not be opened.");
    await picker.setInputFiles({ name: "large.png", mimeType: "image/png", buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
    await waitText(dashboard, "Your photo must be 5 MB or smaller.");

    // Generate an actual image locally; all uploads remain in the isolated storage adapter.
    const photo = Buffer.from(await dashboard.evaluate(() => {
      const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = 160;
      const ctx = canvas.getContext("2d"); ctx.fillStyle = "#164e63"; ctx.fillRect(0, 0, 160, 160);
      ctx.fillStyle = "#cffafe"; ctx.font = "bold 56px sans-serif"; ctx.textAlign = "center"; ctx.fillText("BA", 80, 100);
      return canvas.toDataURL("image/png").split(",")[1];
    }), "base64");
    const selectPhoto = () => picker.setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: photo });
    await selectPhoto();
    await waitText(dashboard, "New photo ready.");
    assert.equal((await Admin.findById(admin._id)).avatar, "", "preview must not write the profile");
    await dashboard.getByRole("button", { name: "Discard", exact: true }).click();
    assert.equal(await dashboard.getByText("New photo ready.", { exact: false }).count(), 0);
    await dashboard.getByLabel("Full name").fill("Ama Mensah");
    await dashboard.getByLabel("Phone number").fill("+233 24 000 0000");
    await dashboard.getByLabel("Short bio").fill("Reporting the stories that matter to our communities.");
    await selectPhoto(); await waitText(dashboard, "New photo ready.");
    await dashboard.getByRole("button", { name: "Save changes", exact: true }).click();
    await waitText(dashboard, "Your profile is up to date.");
    let saved = await Admin.findById(admin._id).lean();
    assert.equal(saved.name, "Ama Mensah");
    assert.equal(saved.phone, "+233 24 000 0000");
    assert.equal(saved.bio, "Reporting the stories that matter to our communities.");
    assert.ok(saved.avatarMedia);
    const firstPhoto = await Media.findById(saved.avatarMedia).lean();
    assert.equal(firstPhoto.url, saved.avatar); assert.equal(firstPhoto.folder, "authors");
    assert.equal(String(firstPhoto.uploadedBy), String(admin._id));
    await visible(dashboard.locator(`header img[src="${saved.avatar}"]`));
    assert.ok(await dashboard.locator(`img[src="${saved.avatar}"]`).count() >= 3, "profile, header and sidebar use the saved photo");
    await dashboard.reload();
    await visible(dashboard.getByLabel("Full name"));
    assert.equal(await dashboard.getByLabel("Full name").inputValue(), "Ama Mensah");
    assert.equal((await mediaUsageService.getBatchUsageCounts([firstPhoto]))[String(firstPhoto._id)], 1);
    const deletion = await dashboard.request.delete(`http://localhost:5055/api/admin/media/${firstPhoto._id}`, { headers: { Origin: "http://localhost:5188" } });
    assert.equal(deletion.status(), 409, "profile photo is protected from permanent deletion");

    // Replacing uses another media record; the original remains available in the library.
    await selectPhoto(); await waitText(dashboard, "New photo ready.");
    await dashboard.route("**/api/admin/profile", async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, message: "Temporary profile save failure. Please retry." }) });
    });
    const uploadsBeforeRetry = uploadCount;
    await dashboard.getByRole("button", { name: "Save changes", exact: true }).click();
    await waitText(dashboard, "Temporary profile save failure. Please retry.");
    assert.equal(await dashboard.getByLabel("Full name").inputValue(), "Ama Mensah");
    assert.equal(uploadCount, uploadsBeforeRetry + 1);
    await dashboard.unroute("**/api/admin/profile");
    await dashboard.getByRole("button", { name: "Save changes", exact: true }).click();
    await waitText(dashboard, "Your profile is up to date.");
    assert.equal(uploadCount, uploadsBeforeRetry + 1, "retry reuses the already uploaded photo");
    saved = await Admin.findById(admin._id).lean();
    assert.notEqual(String(saved.avatarMedia), String(firstPhoto._id));
    assert.ok(await Media.findById(firstPhoto._id));
    await dashboard.getByText("Profile updated.", { exact: true }).waitFor({ state: "hidden" });
    await dashboard.screenshot({ path: "test-results/admin-profile-desktop.png", fullPage: true });
    await dashboard.setViewportSize({ width: 390, height: 844 });
    // The shared workspace animates its sidebar margin when a breakpoint changes.
    await dashboard.waitForFunction(() => getComputedStyle(document.querySelector("main").parentElement).marginLeft === "0px");
    await dashboard.screenshot({ path: "test-results/admin-profile-mobile.png", fullPage: true });
    assert.equal(await dashboard.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "mobile page does not overflow");
    await dashboard.getByRole("button", { name: "Change password", exact: true }).click();
    await dashboard.getByLabel("Current password", { exact: true }).fill("incorrect-current-password");
    await dashboard.getByLabel("New password", { exact: true }).fill("Valid-Replacement-2049!");
    await dashboard.getByLabel("Confirm new password", { exact: true }).fill("Valid-Replacement-2049!");
    await dashboard.getByRole("button", { name: "Show new password", exact: true }).click();
    assert.equal(await dashboard.getByLabel("New password", { exact: true }).getAttribute("type"), "text");
    await dashboard.getByRole("button", { name: "Update password", exact: true }).click();
    await waitText(dashboard, "Current password is incorrect.");

    const foreign = await Media.create({ fileId: "foreign-profile", url: "https://example.test/foreign.png", filePath: "/foreign.png", name: "Another staff photo", mimeType: "image/png", extension: "png", uploadedBy: author._id });
    const forbidden = await dashboard.request.patch("http://localhost:5055/api/admin/profile", { headers: { Origin: "http://localhost:5188" }, data: { avatarMedia: String(foreign._id) } });
    assert.equal(forbidden.status(), 400, "another staff member's upload cannot be assigned");
    assert.equal(String((await Admin.findById(admin._id)).avatarMedia), String(saved.avatarMedia));
    const malformed = await dashboard.request.patch("http://localhost:5055/api/admin/profile", { headers: { Origin: "http://localhost:5188" }, data: { avatarMedia: "not-an-id" } });
    assert.equal(malformed.status(), 400);

    await dashboard.getByRole("button", { name: "Remove photo", exact: true }).click();
    await waitText(dashboard, "Your photo will be removed when you save.");
    assert.ok((await Admin.findById(admin._id)).avatar, "removal is pending until saved");
    await dashboard.getByRole("button", { name: "Save changes", exact: true }).click();
    await waitText(dashboard, "Your profile is up to date.");
    assert.equal((await Admin.findById(admin._id)).avatar, "");
    assert.equal((await Admin.findById(admin._id)).avatarMedia, null);
    await dashboard.reload(); await visible(dashboard.getByRole("heading", { name: "My profile." }));
    assert.equal(await dashboard.locator(`img[src="${saved.avatar}"]`).count(), 0);
    const removedPhoto = await Media.findById(saved.avatarMedia).lean();
    assert.equal((await mediaUsageService.getBatchUsageCounts([removedPhoto]))[String(removedPhoto._id)], 0);

    // The redesigned security form still changes the password and ends the session.
    await dashboard.getByRole("button", { name: "Change password", exact: true }).click();
    await dashboard.getByLabel("Current password", { exact: true }).fill(password);
    await dashboard.getByLabel("New password", { exact: true }).fill("Valid-Replacement-2049!");
    await dashboard.getByLabel("Confirm new password", { exact: true }).fill("Valid-Replacement-2049!");
    await dashboard.getByRole("button", { name: "Update password", exact: true }).click();
    await dashboard.waitForURL("**/admin/login");
    await dashboard.locator('input[type="email"]').fill(admin.email);
    await dashboard.locator('input[type="password"]').fill("Valid-Replacement-2049!");
    await dashboard.getByRole("button", { name: /sign in|authenticate/i }).click();
    await dashboard.waitForURL("**/admin/profile");
    await visible(dashboard.getByRole("heading", { name: "My profile." }));
  });
  assert.deepEqual(errors, [], `Browser exceptions: ${errors.join(", ")}`);
});
