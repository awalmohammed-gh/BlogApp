import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

// Public GET fixtures only. Every contact submission and telemetry write is
// intercepted in the browser; this audit never writes to the production CMS.
const production = process.env.TOAST_SITE_URL;
const upstream = production || "https://nsemfoa-blogs.vercel.app";
const cache = new Map();
const read = (url) => {
  if (!cache.has(url)) cache.set(url, fetch(upstream + url, { signal: AbortSignal.timeout(15000) }).then(async (response) => {
    assert.equal(response.status, 200, `Public fixture unavailable: ${url}`);
    return response.json();
  }));
  return cache.get(url);
};
let vite;
let browser;
const output = path.resolve("test-results/toast");
const report = [];
try {
  let origin = production;
  if (!origin) {
    const { createServer } = await import("../../frontend/node_modules/vite/dist/node/index.js");
    vite = await createServer({ root: path.resolve("../frontend"), server: { host: "127.0.0.1", port: 0 }, clearScreen: false });
    await vite.listen();
    origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  }
  await mkdir(output, { recursive: true });
  browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1280, 800]]) {
    console.log(`Checking custom toasts ${width}x${height}${production ? " production" : ""}`);
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", isMobile: width < 768, hasTouch: width < 768 });
    let contactSucceeds = false;
    let submissions = 0;
    await context.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (!url.pathname.startsWith("/api/")) return route.continue();
      if (request.method() === "POST" && url.pathname === "/api/contact") {
        submissions++;
        return route.fulfill({ status: contactSucceeds ? 200 : 503, json: { success: contactSucceeds, message: contactSucceeds ? "Your message has been received." : "Please try sending your message again." } });
      }
      if (!["GET", "HEAD"].includes(request.method())) return route.fulfill({ status: 204 });
      if (url.pathname.startsWith("/api/admin")) return route.fulfill({ status: 401, json: { success: false } });
      return route.fulfill({ json: await read(url.pathname + url.search) });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin + "/contact", { waitUntil: "domcontentloaded" });
    const submit = page.getByRole("button", { name: "Submit Message", exact: true });
    await submit.click();
    await page.locator(".app-toast--error").waitFor();
    assert.match(await page.locator('div[role="alert"]').textContent(), /Please fill in your name/);
    await page.getByRole("button", { name: /Dismiss message:/ }).click();
    assert.equal(await page.locator(".app-toast").count(), 0);

    await page.locator('input[name="name"]').fill("Toast browser check");
    await page.locator('input[name="email"]').fill("toast-check@example.test");
    await page.locator('textarea[name="message"]').fill("A simulated submission for the custom notification checks.");
    await submit.click();
    await page.locator(".app-toast--error").waitFor();
    assert.match(await page.locator(".app-toast-message").textContent(), /try sending/);
    await page.getByRole("button", { name: /Dismiss message:/ }).click();
    contactSucceeds = true;
    await submit.click();
    await page.locator(".app-toast--success").waitFor();
    assert.match(await page.locator('div[role="status"]').textContent(), /message has been received/);
    assert.equal(await page.locator('input[name="name"]').inputValue(), "");
    assert.equal(submissions, 2);
    const bounds = await page.locator(".app-toast").boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width && bounds.y + bounds.height <= height);
    await page.screenshot({ path: path.join(output, `${production ? "production" : "local"}-${width}x${height}.png`) });
    await page.getByRole("button", { name: /Dismiss message:/ }).click();

    if (!production) {
      // Vite serves the same module used by the real app. No test API is added
      // to the app or included in the production bundle.
      const notify = (action, message, options) => page.evaluate(async ({ action, message, options }) => {
        const { default: toast } = await import("/src/utils/toast.js");
        return toast[action](message, options);
      }, { action, message, options });
      await notify("loading", "Uploading your image…", { id: "upload" });
      await page.locator(".app-toast--loading").waitFor();
      await notify("success", "Image uploaded", { id: "upload" });
      await page.locator(".app-toast--success").waitFor();
      assert.equal(await page.locator(".app-toast").count(), 1);
      assert.equal(await page.locator(".app-toast").getAttribute("data-toast-id"), "upload");
      await notify("dismiss");

      await notify("info", "Read at your own pace", { duration: 500 });
      const close = page.getByRole("button", { name: "Dismiss message: Read at your own pace", exact: true });
      await close.focus();
      await page.waitForTimeout(700);
      assert.equal(await close.count(), 1, "Keyboard focus must pause dismissal");
      await page.locator('input[name="name"]').focus();
      await page.mouse.move(5, height - 5);
      await page.waitForFunction(() => document.querySelectorAll(".app-toast").length === 0);

      if (width >= 768) {
        await notify("warning", "Hover to keep this message", { duration: 500 });
        await page.locator(".app-toast").hover();
        await page.waitForTimeout(700);
        assert.equal(await page.locator(".app-toast").count(), 1);
        await page.mouse.move(5, height - 5);
        await page.waitForFunction(() => document.querySelectorAll(".app-toast").length === 0);
      }

      for (let index = 0; index < 8; index++) await notify("warning", `Message ${index}: ${"A long newsroom notice to check wrapping on small screens. ".repeat(3)}`, { duration: 60000 });
      assert.equal(await page.locator(".app-toast").count(), 5);
      const geometry = await page.locator(".app-toast-viewport").evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x, right: rect.right, bottom: rect.bottom, scrollable: element.scrollHeight > element.clientHeight };
      });
      assert.ok(geometry.x >= 0 && geometry.right <= width && geometry.bottom <= height, JSON.stringify(geometry));
      if (height < 600) assert.equal(geometry.scrollable, true);
      await page.locator(".app-toast-close").last().click();
      assert.equal(await page.locator(".app-toast").count(), 4, "The last stacked message can be reached and dismissed");
      await notify("dismiss");
    }
    assert.deepEqual(errors, []);
    report.push({ width, height, contactErrorAndSuccess: true, bounds, runtimeErrors: errors });
    await context.close();
  }
  await writeFile(path.join(output, `${production ? "production" : "local"}-report.json`), JSON.stringify(report, null, 2));
  console.log(`Passed custom toast checks at ${report.length} viewport sizes.`);
} finally {
  await browser?.close();
  await vite?.close();
}
