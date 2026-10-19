// Read-only lab audit of genuine published content. Never submits telemetry or forms.
import express from "express";
import { chromium } from "playwright";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { gzipSync } from "node:zlib";
import path from "node:path";

const phase = process.argv[2] || "baseline";
const api = process.env.AUDIT_API || "http://localhost:5000";
const origin = "http://localhost:5199";
const output = path.resolve("../performance");
await mkdir(output, { recursive: true });
const sample = await (await fetch(`${api}/api/articles?limit=1`)).json();
if (!sample.data?.[0]?.slug) throw new Error("Genuine published content is required for this audit.");
const slug = process.env.AUDIT_SLUG || sample.data[0].slug;
const previous = phase !== "baseline" ? JSON.parse(await readFile(path.join(output, "baseline.json"), "utf8")) : null;
if (previous && previous.slug !== slug) throw new Error("Use AUDIT_SLUG to measure the same article as the baseline.");
const report = { phase, measuredAt: new Date().toISOString(), slug, publishedCount: sample.pagination.total, conditions: { viewport: "390x844", cpuSlowdown: 4, latencyMs: 150, downloadMbps: 1.6, samplesPerPage: 3, observationMs: 8000, note: "Local synthetic lab data; telemetry blocked. Not field Core Web Vitals or Lighthouse." }, bundles: [], api: {}, pages: {} };
for (const name of (await readdir("../frontend/dist/assets")).filter((name) => /\.(js|css)$/.test(name))) {
  const data = await readFile(`../frontend/dist/assets/${name}`);
  report.bundles.push({ name, bytes: data.length, gzipBytes: gzipSync(data).length });
}
const percentile = (values, fraction) => [...values].sort((a,b) => a-b)[Math.min(values.length - 1, Math.floor(values.length * fraction))];
for (const endpoint of ["/api/articles?limit=50", "/api/articles?limit=12", `/api/articles/${slug}`, "/api/articles?search=community&limit=12", "/api/site/settings", "/api/site/stats"]) {
  const times = []; let bytes, status, cacheControl;
  for (let i = 0; i < 12; i++) {
    const start = performance.now(); const response = await fetch(api + endpoint); const body = await response.arrayBuffer();
    times.push(+(performance.now() - start).toFixed(2)); bytes = body.byteLength; status = response.status; cacheControl = response.headers.get("cache-control");
  }
  report.api[endpoint] = { medianMs: percentile(times, .5), p95Ms: percentile(times, .95), bytes, status, cacheControl };
}
const app = express();
app.use("/api", async (req, res) => {
  if (!["GET", "HEAD"].includes(req.method)) return res.status(405).end();
  try {
    const response = await fetch(api + req.originalUrl);
    for (const name of ["content-type", "cache-control", "etag"]) if (response.headers.has(name)) res.set(name, response.headers.get(name));
    res.status(response.status).send(Buffer.from(await response.arrayBuffer()));
  } catch { res.status(502).json({ success: false, message: "Audit upstream unavailable" }); }
});
app.use(express.static(path.resolve("../frontend/dist"))); app.get("*", (req,res) => res.sendFile(path.resolve("../frontend/dist/index.html")));
const server = await new Promise((resolve,reject) => { const handle = app.listen(5199,"127.0.0.1", () => resolve(handle)); handle.once("error",reject); });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  for (const route of ["/", `/blog-details/${slug}`]) {
    const runs = [];
    for (let i=0; i<3; i++) {
      const context = await browser.newContext({ viewport: { width:390, height:844 }, deviceScaleFactor: 1, isMobile:true, reducedMotion:"reduce" });
      await context.route("**/api/**", (route) => ["GET", "HEAD"].includes(route.request().method()) ? route.continue() : route.fulfill({ status:204, body:"" }));
      const page = await context.newPage(); const session = await context.newCDPSession(page);
      await session.send("Network.enable"); await session.send("Network.setCacheDisabled", { cacheDisabled:true });
      await session.send("Network.emulateNetworkConditions", { offline:false, latency:150, downloadThroughput:1.6*1024*1024/8, uploadThroughput:750*1024/8 });
      await session.send("Emulation.setCPUThrottlingRate", { rate:4 });
      await page.addInitScript(() => {
        window.__audit = { lcp:0, cls:0, longTasks:0 };
        new PerformanceObserver((list) => { for (const item of list.getEntries()) window.__audit.lcp = item.startTime; }).observe({ type:"largest-contentful-paint", buffered:true });
        let sessionValue=0, start=0, last=0;
        new PerformanceObserver((list) => { for (const item of list.getEntries()) { if(item.hadRecentInput)continue; if(item.startTime-last>1000||item.startTime-start>5000){sessionValue=0;start=item.startTime;} last=item.startTime;sessionValue+=item.value;window.__audit.cls=Math.max(window.__audit.cls,sessionValue); } }).observe({ type:"layout-shift", buffered:true });
        new PerformanceObserver((list) => { window.__audit.longTasks += list.getEntries().reduce((sum,item)=>sum+Math.max(0,item.duration-50),0); }).observe({ type:"longtask", buffered:true });
      });
      const requests=[]; const errors=[];
      page.on("request", (request) => { if(request.url().includes("/api/")) requests.push(new URL(request.url()).pathname+new URL(request.url()).search); });
      page.on("pageerror", (error)=>errors.push(error.message));
      await page.goto(origin+route, { waitUntil:"domcontentloaded", timeout:60000 });
      await page.waitForTimeout(8000);
      const metrics = await page.evaluate(() => {
        const resources=performance.getEntriesByType("resource"); const nav=performance.getEntriesByType("navigation")[0];
        return { ...window.__audit, fcpMs:performance.getEntriesByName("first-contentful-paint")[0]?.startTime || null, ttfbMs:nav.responseStart-nav.requestStart, javascriptBytes:resources.filter(r=>r.initiatorType==="script"||r.name.endsWith(".js")).reduce((s,r)=>s+r.decodedBodySize,0), imageTransferBytes:resources.filter(r=>r.initiatorType==="img").reduce((s,r)=>s+r.transferSize,0), imageRequests:resources.filter(r=>r.initiatorType==="img").length, overflow:document.documentElement.scrollWidth>innerWidth, articleReadable: Boolean(document.querySelector("#article-body")?.textContent?.trim()), title:document.title };
      });
      runs.push({ ...metrics, apiRequests:requests, errors });
      await page.screenshot({ path:path.join(output, `${phase}-${route==="/"?"home":"article"}.png`), fullPage:false });
      await context.close();
    }
    report.pages[route]={ runs, medianLcpMs:percentile(runs.map(r=>r.lcp),.5), medianFcpMs:percentile(runs.map(r=>r.fcpMs),.5), medianBlockingMs:percentile(runs.map(r=>r.longTasks),.5), maxCls:Math.max(...runs.map(r=>r.cls)) };
    console.log(`${phase} ${route}: LCP ${report.pages[route].medianLcpMs} ms`);
  }
} finally { await browser.close(); await new Promise((resolve)=>server.close(resolve)); }
await writeFile(path.join(output, `${phase}.json`), JSON.stringify(report,null,2));
console.log(`Saved performance/${phase}.json`);
