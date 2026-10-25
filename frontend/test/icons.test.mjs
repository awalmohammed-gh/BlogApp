import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const required = [
  { file: "icon-192x192.png", w: 192, h: 192 },
  { file: "icon-512x512.png", w: 512, h: 512 },
  { file: "shortcut-home.png", w: 192, h: 192 },
  { file: "shortcut-home-96x96.png", w: 96, h: 96 },
  { file: "shortcut-projects.png", w: 192, h: 192 },
  { file: "shortcut-projects-96x96.png", w: 96, h: 96 },
  { file: "shortcut-services.png", w: 192, h: 192 },
  { file: "shortcut-services-96x96.png", w: 96, h: 96 },
  { file: "shortcut-admin.png", w: 192, h: 192 },
  { file: "shortcut-admin-96x96.png", w: 96, h: 96 }
];

let allValid = true;
for (const req of required) {
  const p = path.resolve(__dirname, "../public/icons", req.file);
  if (!fs.existsSync(p)) {
    console.error("MISSING:", req.file);
    allValid = false;
    continue;
  }
  const buf = fs.readFileSync(p);
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a;

  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const ok = isPng && w === req.w && h === req.h;
  if (!ok) {
    console.error("INVALID:", req.file, { isPng, w, h });
    allValid = false;
  } else {
    console.log(`✓ VALID: ${req.file} (${w}x${h}px, ${buf.length} bytes, genuine PNG)`);
  }
}

if (!allValid) {
  process.exit(1);
} else {
  console.log("\nALL ICONS VERIFIED SUCCESSFULLY!");
}
