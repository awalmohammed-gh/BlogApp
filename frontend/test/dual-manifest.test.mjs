import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import assert from "assert";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

console.log("--- Testing Dual-PWA Configuration ---");

// 1. Verify Public Manifest (public/manifest.json)
const publicManifestPath = path.join(publicDir, "manifest.json");
assert(fs.existsSync(publicManifestPath), "public/manifest.json must exist");
const publicManifest = JSON.parse(fs.readFileSync(publicManifestPath, "utf-8"));

assert.strictEqual(publicManifest.id, "/", "Public manifest 'id' must be '/'");
assert.strictEqual(publicManifest.start_url, "/", "Public manifest 'start_url' must be '/'");
assert.strictEqual(publicManifest.scope, "/", "Public manifest 'scope' must be '/'");
assert.strictEqual(publicManifest.display, "standalone", "Public manifest 'display' must be 'standalone'");
assert(publicManifest.name, "Public manifest must have 'name'");
assert(publicManifest.short_name, "Public manifest must have 'short_name'");

const public192 = publicManifest.icons.find((i) => i.sizes === "192x192" && i.type === "image/png");
const public512 = publicManifest.icons.find((i) => i.sizes === "512x512" && i.type === "image/png");
assert(public192, "Public manifest must include 192x192 PNG icon");
assert(public512, "Public manifest must include 512x512 PNG icon");
console.log("✓ Public manifest (public/manifest.json) verified");

// 2. Verify Admin Manifest (public/admin-manifest.json)
const adminManifestPath = path.join(publicDir, "admin-manifest.json");
assert(fs.existsSync(adminManifestPath), "public/admin-manifest.json must exist");
const adminManifest = JSON.parse(fs.readFileSync(adminManifestPath, "utf-8"));

assert.strictEqual(adminManifest.id, "/admin", "Admin manifest 'id' must be '/admin'");
assert.strictEqual(adminManifest.start_url, "/admin", "Admin manifest 'start_url' must be '/admin'");
assert.strictEqual(adminManifest.scope, "/admin", "Admin manifest 'scope' must be '/admin'");
assert.strictEqual(adminManifest.display, "standalone", "Admin manifest 'display' must be 'standalone'");
assert.strictEqual(adminManifest.name, "Admin Dashboard", "Admin manifest 'name' must be 'Admin Dashboard'");
assert.strictEqual(adminManifest.short_name, "Admin", "Admin manifest 'short_name' must be 'Admin'");

const admin192 = adminManifest.icons.find(
  (i) => i.src === "/icons/admin-192x192.png" && i.sizes === "192x192" && i.type === "image/png"
);
const admin512 = adminManifest.icons.find(
  (i) => i.src === "/icons/admin-512x512.png" && i.sizes === "512x512" && i.type === "image/png"
);
assert(admin192, "Admin manifest must reference /icons/admin-192x192.png");
assert(admin512, "Admin manifest must reference /icons/admin-512x512.png");
console.log("✓ Admin manifest (public/admin-manifest.json) verified");

// 3. Verify Service Worker (public/sw.js)
const swPath = path.join(publicDir, "sw.js");
assert(fs.existsSync(swPath), "public/sw.js must exist");
const swContent = fs.readFileSync(swPath, "utf-8");

// Must NOT precache manifests in PRECACHE_ASSETS
const precacheMatch = swContent.match(/const PRECACHE_ASSETS\s*=\s*\[([\s\S]*?)\];/);
assert(precacheMatch, "PRECACHE_ASSETS array must exist in sw.js");
const precacheList = precacheMatch[1];
assert(!precacheList.includes("manifest.json"), "PRECACHE_ASSETS must not include manifest.json");
assert(!precacheList.includes("admin-manifest.json"), "PRECACHE_ASSETS must not include admin-manifest.json");
assert(!precacheList.includes("manifest.webmanifest"), "PRECACHE_ASSETS must not include manifest.webmanifest");

// Must handle manifests fresh with no-store
assert(
  swContent.includes('cache: "no-store"') || swContent.includes("cache: 'no-store'"),
  "sw.js must fetch manifests with cache: 'no-store'"
);
console.log("✓ Service Worker (public/sw.js) cache exclusions & network-fresh handling verified");

// 4. Verify Service Worker Registration in main.jsx
const mainPath = path.resolve(__dirname, "../src/main.jsx");
const mainContent = fs.readFileSync(mainPath, "utf-8");
assert(
  mainContent.includes("navigator.serviceWorker.register('/sw.js', { scope: '/' })") ||
  mainContent.includes('navigator.serviceWorker.register("/sw.js", { scope: "/" })') ||
  mainContent.includes("register('/sw.js', { scope: '/' })"),
  "main.jsx must register /sw.js with { scope: '/' }"
);
console.log("✓ Service Worker registration in main.jsx with { scope: '/' } verified");

// 5. Verify index.html instant manifest switch script
const htmlPath = path.resolve(__dirname, "../index.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");
assert(htmlContent.includes('id="app-manifest"'), "index.html must have id='app-manifest' on link");
assert(htmlContent.includes("admin-manifest.json"), "index.html must have switcher script referencing admin-manifest.json");
console.log("✓ index.html dynamic manifest switcher script verified");

// 6. Verify QuickActionsMenu full page navigation for /admin
const menuPath = path.resolve(__dirname, "../src/components/common/QuickActionsMenu.jsx");
const menuContent = fs.readFileSync(menuPath, "utf-8");
assert(
  menuContent.includes('window.location.href = item.url') || menuContent.includes('window.location.href = "/admin"'),
  "QuickActionsMenu must navigate to /admin using window.location.href"
);
console.log("✓ QuickActionsMenu secret right-click / long-press uses window.location.href for /admin verified");

console.log("\nALL DUAL-PWA ARCHITECTURE TESTS PASSED SUCCESSFULLY! 🎉\n");
