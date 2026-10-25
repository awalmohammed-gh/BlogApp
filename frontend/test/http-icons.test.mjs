import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
  ".png": "image/png",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".html": "text/html"
};

const server = http.createServer((req, res) => {
  const safePath = path.normalize(req.url.split("?")[0]);
  const filePath = path.join(__dirname, "../public", safePath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(0, async () => {
  const port = server.address().port;
  const urls = [
    "/manifest.json",
    "/manifest.webmanifest",
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
    "/icons/shortcut-home.png",
    "/icons/shortcut-home-96x96.png",
    "/icons/shortcut-projects.png",
    "/icons/shortcut-projects-96x96.png",
    "/icons/shortcut-services.png",
    "/icons/shortcut-services-96x96.png",
    "/icons/shortcut-admin.png",
    "/icons/shortcut-admin-96x96.png"
  ];

  let passed = true;
  for (const u of urls) {
    const res = await fetch(`http://127.0.0.1:${port}${u}`);
    const ct = res.headers.get("content-type");
    const buf = await res.arrayBuffer();
    if (res.status === 200 && buf.byteLength > 0) {
      console.log(`✓ HTTP 200: ${u} (${buf.byteLength} bytes, ${ct})`);
    } else {
      console.error(`FAILED: ${u} status=${res.status}`);
      passed = false;
    }
  }

  server.close(() => {
    process.exit(passed ? 0 : 1);
  });
});
