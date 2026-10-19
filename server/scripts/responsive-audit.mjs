import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import express from "express";
import { chromium } from "playwright";

// Public content is read only; staff sessions and every write are intercepted.
// This audit never signs into, publishes to, or records analytics in the real CMS.
const api = process.env.RESPONSIVE_API_URL || "https://nsemfoa-blogs.vercel.app";
const cache = new Map();
const read = (url) => {
  if (!cache.has(url)) cache.set(url, fetch(api + url, { signal: AbortSignal.timeout(15000) }).then(async (response) => {
    assert.equal(response.status, 200, `Public fixture unavailable: ${url}`);
    return response.json();
  }));
  return cache.get(url);
};
const sample = await read("/api/articles?limit=5");
assert.ok(sample.data?.[0]?.slug, "Published articles are required for layout verification.");
const app = express();
app.use("/api", async (req, res) => {
  if (req.path.startsWith("/admin") || !["GET", "HEAD"].includes(req.method)) return res.status(405).end();
  try { res.json(await read(req.originalUrl)); }
  catch { res.status(502).json({ success: false, message: "Responsive audit upstream unavailable." }); }
});
app.use(express.static(path.resolve("../frontend/dist")));
app.get("*", (req, res) => res.sendFile(path.resolve("../frontend/dist/index.html")));
const server = await new Promise((resolve, reject) => {
  const handle = app.listen(0, "127.0.0.1", () => resolve(handle));
  handle.once("error", reject);
});
const origin = `http://127.0.0.1:${server.address().port}`;
const output = path.resolve("test-results/responsive");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const report = { measuredAt: new Date().toISOString(), layouts: [], notes: "Chromium viewport emulation; real public articles, mocked staff session, no real writes or telemetry." };
const heroOnly = process.env.RESPONSIVE_HERO_ONLY === "1";
const viewports = [
  [320, 568], [360, 640], [390, 844], [430, 932], [844, 390],
  [768, 1024], [1024, 768], [1280, 800], [1920, 1080],
].filter(([width]) => !process.env.RESPONSIVE_WIDTHS || process.env.RESPONSIVE_WIDTHS.split(",").map(Number).includes(width));
const assertNoOverflow = async (page, label) => {
  const dimensions = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    height: innerHeight, minHeight: parseFloat(getComputedStyle(document.querySelector(".min-h-screen") || document.body).minHeight),
    offenders: [...document.querySelectorAll("body *")].filter((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.right > innerWidth + 1 && getComputedStyle(element).position !== "absolute";
    }).slice(0, 4).map((element) => ({ tag: element.tagName, className: element.className })),
  }));
  assert.ok(dimensions.scrollWidth <= dimensions.width + 1, `${label}: horizontal overflow ${JSON.stringify(dimensions)}`);
  assert.ok(dimensions.minHeight >= dimensions.height - 1, `${label}: page does not fill viewport`);
  return dimensions;
};
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", hasTouch: width <= 1024, isMobile: width < 768 || (width < 1024 && height < 500) });
    let authenticated = false;
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/admin")) {
        return ["GET", "HEAD"].includes(request.method()) ? route.continue() : route.fulfill({ status: 204 });
      }
      if (url.pathname === "/api/admin/auth/me") return route.fulfill({ status: authenticated ? 200 : 401, json: authenticated ? { success: true, admin: { _id: "responsive-test-admin", name: "Responsive Test", role: "super_admin", email: "responsive@example.test" } } : { success: false } });
      let data = [];
      if (url.pathname === "/api/admin/articles") data = sample.data;
      if (url.pathname.startsWith("/api/admin/categories")) data = [...new Map(sample.data.filter((item) => item.category).map((item) => [item.category._id, { ...item.category, status: "active", articleCount: 2 }])).values()];
      if (url.pathname === "/api/admin/analytics/overview") data = { totalArticles: 39, publishedArticles: 39, totalArticleViews: 1200 };
      if (url.pathname === "/api/admin/notifications") data = Array.from({ length: 10 }, (_, index) => ({ _id: `notice-${index}`, title: "Editorial update", message: "A newsroom update with enough text to verify scrolling in a small notification panel.", createdAt: new Date().toISOString(), isRead: true }));
      return route.fulfill({ json: { success: true, data, unreadCount: 0, pagination: { page: 1, total: Array.isArray(data) ? data.length : 0, totalPages: 1 } } });
    });
    const page = await context.newPage();
    const errors = [];
    const pending = new Set();
    let lastActivity = Date.now();
    page.on("request", (request) => { if (request.url().includes("/api/")) { pending.add(request); lastActivity = Date.now(); } });
    const finished = (request) => { if (pending.delete(request)) lastActivity = Date.now(); };
    page.on("requestfinished", finished);
    page.on("requestfailed", finished);
    const settle = async () => {
      const deadline = Date.now() + 15000;
      while (pending.size || Date.now() - lastActivity < 300) {
        assert.ok(Date.now() < deadline, "Page API requests did not settle.");
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      await page.evaluate(() => document.fonts.ready);
    };
    page.on("pageerror", (error) => errors.push(error.message));
    page.setDefaultTimeout(10000);
    const result = { width, height, pages: [] };
    for (const route of heroOnly ? ["/"] : ["/", "/blog", "/sports", `/blog-details/${sample.data[0].slug}`, "/about", "/contact", "/admin/login"]) {
      console.log(`Checking ${width}x${height} ${route}`);
      await page.goto(origin + route, { waitUntil: "domcontentloaded" });
      await page.locator("h1").first().waitFor();
      await settle();
      const dimensions = await assertNoOverflow(page, `${width}x${height} ${route}`);
      if (route === "/") {
        await page.screenshot({ path: path.join(output, `home-${width}x${height}.png`) });
        const hero = await page.locator(".home-hero").boundingBox();
        assert.ok(hero.height >= height - 1, "Home hero must fill the visible viewport.");
        if (height >= 568) assert.ok(hero.height <= height + 1, `Hero exceeds the first screen at ${width}x${height}: ${hero.height}`);
        if (width < 1024) {
          for (const selector of [".hero-kicker", ".hero-description", ".hero-search", ".hero-actions"]) {
            const bounds = await page.locator(selector).boundingBox();
            if (bounds) assert.ok(bounds.x >= -1 && bounds.x + bounds.width <= width + 1, `${selector} must remain inside the phone screen.`);
          }
          const globe = await page.locator(".globe-stage").boundingBox();
          assert.ok(Math.abs(globe.x + globe.width / 2 - width / 2) <= 1, "Mobile globe must be horizontally centered.");
          assert.ok(Math.abs(globe.y + globe.height / 2 - hero.height / 2) <= 1, "Mobile globe must be vertically centered in the hero.");
          assert.equal(await page.locator(".globe-channel-stream").count(), 8);
          assert.equal(await page.locator(".globe-channel-stream").first().evaluate((element) => getComputedStyle(element).animationName), "none", "Reduced-motion settings must stop channel animation.");
          if (width === 390) {
            await page.emulateMedia({ reducedMotion: "no-preference" });
            const animationFrame = () => page.evaluate(() => ({
              spin: getComputedStyle(document.querySelector(".globe-spin")).transform,
              packet: getComputedStyle(document.querySelector(".globe-channel-stream")).strokeDashoffset,
            }));
            const before = await animationFrame();
            await page.waitForTimeout(300);
            const after = await animationFrame();
            assert.notEqual(before.spin, after.spin, "The globe must keep rotating.");
            assert.notEqual(before.packet, after.packet, "Channel packets must move toward the globe.");
            await page.emulateMedia({ reducedMotion: "reduce" });
          }
        }
        result.heroHeight = hero.height;
        if (width < 1280) {
          await page.getByRole("button", { name: "Toggle navigation", exact: true }).click();
          const header = await page.locator(".site-navigation").boundingBox();
          assert.ok(Math.abs(header.height - height) <= 1, "Mobile menu must match viewport height.");
          await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Contact & Pitch Leads" }).scrollIntoViewIfNeeded();
          const last = await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Contact & Pitch Leads" }).boundingBox();
          assert.ok(last.y >= 0 && last.y + last.height <= height + 1, "Bottom navigation link must be reachable.");
          assert.equal(await page.evaluate(() => document.body.style.overflow), "hidden");
          await page.keyboard.press("Escape");
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden");
        }
        await page.screenshot({ path: path.join(output, `home-${width}x${height}.png`) });
      }
      result.pages.push({ route, scrollWidth: dimensions.scrollWidth });
    }
    if (heroOnly) {
      assert.deepEqual(errors, [], `${width}x${height} runtime errors`);
      report.layouts.push(result);
      console.log(`PASS ${width}x${height}: hero, centered mobile globe, channels, navigation`);
      await context.close();
      continue;
    }
    authenticated = true;
    await page.goto(origin + "/admin/categories", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "New Category", exact: true }).waitFor();
    await settle();
    await assertNoOverflow(page, `Admin categories ${width}x${height}`);
    await page.getByRole("button", { name: "New Category", exact: true }).click();
    const dialog = page.getByRole("dialog");
    const box = await dialog.boundingBox();
    assert.ok(box.y >= -1 && box.y + box.height <= height + 1, `Dialog escapes viewport at ${width}x${height}`);
    if (width < 640) assert.ok(Math.abs(box.height - height) <= 1, "Phone dialogs must fill the screen.");
    await page.screenshot({ path: path.join(output, `dialog-${width}x${height}.png`) });
    for (const input of await dialog.locator("input, select, textarea").all()) {
      const bounds = await input.boundingBox();
      if (bounds) assert.ok(bounds.x >= box.x - 1 && bounds.x + bounds.width <= box.x + box.width + 1, "Form controls must not be clipped by the dialog.");
    }
    const submit = dialog.locator('button[type="submit"]');
    await submit.scrollIntoViewIfNeeded();
    const action = await submit.boundingBox();
    assert.ok(action.y >= 0 && action.y + action.height <= height + 1, "Dialog actions must be reachable by scrolling.");
    await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    const notifications = await page.locator("#admin-notifications").boundingBox();
    assert.ok(notifications.x >= 0 && notifications.x + notifications.width <= width + 1 && notifications.y + notifications.height <= height + 1, "Notifications must stay inside the screen.");
    await page.getByRole("button", { name: "Notifications", exact: true }).click();
    await page.getByRole("button", { name: "Search newsroom", exact: true }).click();
    const search = page.getByRole("dialog", { name: "Search newsroom" });
    await search.locator("input").fill("e");
    const searchBox = await search.boundingBox();
    assert.ok(searchBox.x >= 0 && searchBox.x + searchBox.width <= width + 1 && searchBox.y + searchBox.height <= height + 1, "Newsroom search must stay inside the screen.");
    await page.keyboard.press("Escape");
    if (width < 1024) {
      await page.getByRole("button", { name: "Open mobile menu", exact: true }).click();
      const close = page.getByRole("button", { name: "Close mobile menu", exact: true });
      await close.waitFor();
      const drawer = await close.locator("xpath=ancestor::div[contains(@class, 'viewport-overlay')]").boundingBox();
      assert.ok(Math.abs(drawer.height - height) <= 1);
      await page.keyboard.press("Escape");
    }
    if (width === 390) {
      await page.getByRole("button", { name: "New Category", exact: true }).click();
      await page.setViewportSize({ width, height: 420 });
      await page.waitForFunction(() => Math.abs(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--overlay-height")) - 420) < 1);
      const resized = await page.getByRole("dialog").boundingBox();
      assert.ok(resized.y + resized.height <= 421, "Dialog must resize with the visible viewport.");
    }
    assert.deepEqual(errors, [], `${width}x${height} runtime errors`);
    report.layouts.push(result);
    console.log(`PASS ${width}x${height}: public pages, login, navigation, admin dialogs`);
    await context.close();
  }
} catch (error) {
  console.error(`Responsive audit failed: ${error.message}`);
  throw error;
} finally {
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2));
  await browser.close();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}
