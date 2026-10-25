import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.resolve(__dirname, "../public");
const iconsDir = path.resolve(publicDir, "icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// User uploaded official logo source
const userLogoPath =
  "C:/Users/USER/.gemini/antigravity-ide/brain/41ed0222-f824-4347-b871-ded46c722153/.user_uploaded/media_1792930673018.jpg";

if (!fs.existsSync(userLogoPath)) {
  console.error("User uploaded logo image not found at:", userLogoPath);
  process.exit(1);
}

// SVGs for the shortcuts
// 1. Shortcut: Front Website / Home
const shortcutHomeSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="homeBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
    <linearGradient id="homeGrad" x1="48" y1="44" x2="144" y2="148" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#homeBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="40" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

  <!-- Home Roof & Structure -->
  <path d="M96 46L44 88H58V146H84V110H108V146H134V88H148L96 46Z" fill="#FFFFFF"/>
  <path d="M96 66L66 90V136H78V102H114V136H126V90L96 66Z" fill="url(#homeGrad)"/>
  <circle cx="96" cy="84" r="8" fill="#FCD34D"/>
</svg>
`;

// 2. Shortcut: Projects (Layers / Bento Grid / Showcase)
const shortcutProjectsSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="projBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <linearGradient id="projGrad" x1="48" y1="48" x2="144" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#34D399"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#projBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="40" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

  <!-- Bento Grid / Projects Blocks -->
  <rect x="46" y="46" width="44" height="44" rx="10" fill="url(#projGrad)"/>
  <rect x="102" y="46" width="44" height="44" rx="10" fill="#FFFFFF"/>
  <rect x="46" y="102" width="44" height="44" rx="10" fill="#FFFFFF"/>
  <rect x="102" y="102" width="44" height="44" rx="10" fill="url(#projGrad)"/>

  <!-- Inner accents -->
  <circle cx="68" cy="68" r="7" fill="#0B1B3A"/>
  <circle cx="124" cy="68" r="7" fill="#047857"/>
  <circle cx="68" cy="124" r="7" fill="#047857"/>
  <circle cx="124" cy="124" r="7" fill="#0B1B3A"/>
</svg>
`;

// 3. Shortcut: Admin Dashboard (Shield / Keyhole / CMS Crown)
const shortcutAdminSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="adminBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#B91C1C"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="48" y1="44" x2="144" y2="148" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#EF4444"/>
      <stop offset="50%" stop-color="#DC2626"/>
      <stop offset="100%" stop-color="#991B1B"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="80" y1="70" x2="112" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#adminBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="40" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  
  <!-- Shield outline -->
  <path d="M96 38L144 58V104C144 135 123.5 153.5 96 161C68.5 153.5 48 135 48 104V58L96 38Z" fill="rgba(220,38,38,0.25)" stroke="#FFFFFF" stroke-width="5" stroke-linejoin="round"/>
  
  <!-- Shield inner fill -->
  <path d="M96 46L136 63V104C136 129 119 144 96 151C73 144 56 129 56 104V63L96 46Z" fill="url(#shieldGrad)"/>

  <!-- Inner Key / Lock / Badge symbol -->
  <circle cx="96" cy="86" r="14" fill="url(#goldGrad)"/>
  <path d="M92 96H100V122H92V96Z" fill="url(#goldGrad)"/>
  <path d="M100 106H107V114H100V106Z" fill="url(#goldGrad)"/>
  <circle cx="96" cy="86" r="5" fill="#0B1B3A"/>
</svg>
`;

async function generateAppIcons() {
  console.log("Generating app icons from user uploaded official Nsemfoa News logo...");
  const rawImage = sharp(userLogoPath);

  // 1. Copy original as app-logo.png in public
  await sharp(userLogoPath)
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "app-logo.png"));
  console.log("✓ Updated public/app-logo.png");

  // 2. Main App Icons (any) - Exact 512x512 and 192x192
  await sharp(userLogoPath)
    .resize(512, 512, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-512x512.png"));
  await sharp(userLogoPath)
    .resize(512, 512, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "pwa-512x512.png"));
  console.log("✓ icon-512x512.png & pwa-512x512.png");

  await sharp(userLogoPath)
    .resize(192, 192, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-192x192.png"));
  await sharp(userLogoPath)
    .resize(192, 192, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "pwa-192x192.png"));
  console.log("✓ icon-192x192.png & pwa-192x192.png");

  // 3. Maskable App Icons with Safe-Zone Padding (80% safe circle for Samsung One UI & Android)
  // For 512x512: inner content 410x410, padded by 51px
  await sharp(userLogoPath)
    .resize(410, 410, { fit: "contain", background: "#ffffff" })
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-maskable-512x512.png"));
  await sharp(userLogoPath)
    .resize(410, 410, { fit: "contain", background: "#ffffff" })
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "pwa-512x512-maskable.png"));
  console.log("✓ icon-maskable-512x512.png & pwa-512x512-maskable.png");

  // For 192x192: inner content 154x154, padded by 19px
  await sharp(userLogoPath)
    .resize(154, 154, { fit: "contain", background: "#ffffff" })
    .extend({ top: 19, bottom: 19, left: 19, right: 19, background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, "icon-maskable-192x192.png"));
  await sharp(userLogoPath)
    .resize(154, 154, { fit: "contain", background: "#ffffff" })
    .extend({ top: 19, bottom: 19, left: 19, right: 19, background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "pwa-192x192-maskable.png"));
  console.log("✓ icon-maskable-192x192.png & pwa-192x192-maskable.png");

  // 4. Apple Touch Icon (180x180)
  await sharp(userLogoPath)
    .resize(180, 180, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "apple-touch-icon-180x180.png"));
  console.log("✓ apple-touch-icon-180x180.png");

  // 5. Favicons
  await sharp(userLogoPath)
    .resize(64, 64, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "favicon.png"));
  await sharp(userLogoPath)
    .resize(32, 32, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "favicon-32x32.png"));
  await sharp(userLogoPath)
    .resize(16, 16, { fit: "contain", background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(publicDir, "favicon-16x16.png"));
  console.log("✓ Favicons 16/32/64");

  // 6. Generate Shortcuts (Home, Projects, Admin in 192x192 & 96x96)
  const shortcuts = [
    { file: "shortcut-home.png", size: 192, svg: shortcutHomeSvg },
    { file: "shortcut-home-96x96.png", size: 96, svg: shortcutHomeSvg },
    { file: "shortcut-projects.png", size: 192, svg: shortcutProjectsSvg },
    { file: "shortcut-projects-96x96.png", size: 96, svg: shortcutProjectsSvg },
    { file: "shortcut-admin.png", size: 192, svg: shortcutAdminSvg },
    { file: "shortcut-admin-96x96.png", size: 96, svg: shortcutAdminSvg }
  ];

  for (const s of shortcuts) {
    const dest = path.join(iconsDir, s.file);
    await sharp(Buffer.from(s.svg))
      .resize(s.size, s.size)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(dest);
    console.log(`✓ ${s.file} (${s.size}x${s.size}px)`);
  }
}

generateAppIcons()
  .then(() => console.log("\nAll icons generated successfully with official logo!"))
  .catch((err) => {
    console.error("Icon generation error:", err);
    process.exit(1);
  });
