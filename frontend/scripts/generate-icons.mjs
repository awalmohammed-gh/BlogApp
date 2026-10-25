import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.resolve(__dirname, "../public/icons");
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. App Icon (192x192 & 512x512)
const appIconSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="512" y2="512" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#071228"/>
      <stop offset="50%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#1B315E"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="120" y1="120" x2="392" y2="392" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="40%" stop-color="#F59E0B"/>
      <stop offset="100%" stop-color="#B45309"/>
    </linearGradient>
    <filter id="shadow" x="50" y="50" width="412" height="420" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
  </defs>

  <!-- Base background with rounded squircle -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect x="4" y="4" width="504" height="504" rx="108" stroke="rgba(255,255,255,0.14)" stroke-width="4"/>

  <!-- Concentric decorative news compass rings -->
  <circle cx="256" cy="256" r="186" fill="rgba(255,255,255,0.02)" stroke="rgba(245,158,11,0.22)" stroke-width="4" stroke-dasharray="12 8"/>
  <circle cx="256" cy="256" r="150" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.08)" stroke-width="2"/>

  <!-- Stylized "N" Monogram -->
  <g filter="url(#shadow)">
    <path d="M168 360V152H206L306 310V152H344V360H306L206 202V360H168Z" fill="url(#goldGrad)"/>
  </g>

  <!-- Accent beacons -->
  <circle cx="344" cy="152" r="12" fill="#FFFFFF"/>
  <circle cx="168" cy="360" r="12" fill="#FDE68A"/>
</svg>
`;

// 2. Shortcut: Front Website / Home (Newspaper & House emblem)
const shortcutHomeSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="homeBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#2563EB"/>
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

// 3. Shortcut: Projects (Layers / Bento Grid / Showcase)
const shortcutProjectsSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="projBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#059669"/>
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
  <circle cx="124" cy="68" r="7" fill="#059669"/>
  <circle cx="68" cy="124" r="7" fill="#059669"/>
  <circle cx="124" cy="124" r="7" fill="#0B1B3A"/>
</svg>
`;

// 4. Shortcut: Services (Tools / Wrench / Sparkles / Offerings)
const shortcutServicesSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="servBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#D97706"/>
    </linearGradient>
    <linearGradient id="servGrad" x1="48" y1="48" x2="144" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#F59E0B"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#servBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="40" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

  <!-- Central Cog / Gear of Services -->
  <circle cx="96" cy="96" r="32" stroke="url(#servGrad)" stroke-width="12" fill="rgba(245,158,11,0.1)"/>
  <circle cx="96" cy="96" r="14" fill="#FFFFFF"/>

  <!-- 4 Cog teeth -->
  <rect x="90" y="44" width="12" height="16" rx="4" fill="url(#servGrad)"/>
  <rect x="90" y="132" width="12" height="16" rx="4" fill="url(#servGrad)"/>
  <rect x="44" y="90" width="16" height="12" rx="4" fill="url(#servGrad)"/>
  <rect x="132" y="90" width="16" height="12" rx="4" fill="url(#servGrad)"/>

  <!-- Sparkle dots in corners -->
  <circle cx="62" cy="62" r="5" fill="#FFFFFF"/>
  <circle cx="130" cy="62" r="5" fill="#FDE68A"/>
  <circle cx="62" cy="130" r="5" fill="#FDE68A"/>
  <circle cx="130" cy="130" r="5" fill="#FFFFFF"/>
</svg>
`;

// 5. Shortcut: Admin (Shield / Key / CMS Dashboard)
const shortcutAdminSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="adminBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
    <linearGradient id="shieldGrad" x1="48" y1="44" x2="144" y2="148" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38BDF8"/>
      <stop offset="100%" stop-color="#0284C7"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#adminBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="40" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>
  
  <!-- Shield outline -->
  <path d="M96 42L142 62V104C142 133 122.4 151.2 96 158C69.6 151.2 50 133 50 104V62L96 42Z" fill="rgba(14,165,233,0.18)" stroke="url(#shieldGrad)" stroke-width="6" stroke-linejoin="round"/>
  
  <!-- Inner Key / Lock symbol -->
  <circle cx="96" cy="88" r="15" fill="#FFFFFF"/>
  <path d="M92 98H100V124H92V98Z" fill="#FFFFFF"/>
  <path d="M100 110H108V118H100V110Z" fill="#FFFFFF"/>
  <circle cx="96" cy="88" r="6" fill="#0B1B3A"/>
</svg>
`;

// 6. Shortcut: Contact (Chat Bubble / Mail Envelope)
const shortcutContactSvg = `
<svg width="192" height="192" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="contactBg" x1="0" y1="0" x2="192" y2="192" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0B1B3A"/>
      <stop offset="100%" stop-color="#DB2777"/>
    </linearGradient>
    <linearGradient id="contactGrad" x1="48" y1="48" x2="144" y2="144" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#F472B6"/>
      <stop offset="100%" stop-color="#EC4899"/>
    </linearGradient>
  </defs>
  <rect width="192" height="192" rx="42" fill="url(#contactBg)"/>
  <rect x="2" y="2" width="188" height="188" rx="40" stroke="rgba(255,255,255,0.18)" stroke-width="2"/>

  <!-- Speech bubble with tail -->
  <path d="M48 60C48 51.1634 55.1634 44 64 44H128C136.837 44 144 51.1634 144 60V108C144 116.837 136.837 124 128 124H86L60 148V124H64H48V60Z" fill="url(#contactGrad)"/>
  
  <!-- Inside message / 3 dots -->
  <circle cx="78" cy="84" r="8" fill="#FFFFFF"/>
  <circle cx="96" cy="84" r="8" fill="#FFFFFF"/>
  <circle cx="114" cy="84" r="8" fill="#FFFFFF"/>
</svg>
`;

const tasks = [
  // App icons
  { file: "icon-192x192.png", size: 192, svg: appIconSvg },
  { file: "icon-512x512.png", size: 512, svg: appIconSvg },

  // Shortcut Home
  { file: "shortcut-home.png", size: 192, svg: shortcutHomeSvg },
  { file: "shortcut-home-96x96.png", size: 96, svg: shortcutHomeSvg },
  { file: "shortcut-home-192x192.png", size: 192, svg: shortcutHomeSvg },

  // Shortcut Projects
  { file: "shortcut-projects.png", size: 192, svg: shortcutProjectsSvg },
  { file: "shortcut-projects-96x96.png", size: 96, svg: shortcutProjectsSvg },
  { file: "shortcut-projects-192x192.png", size: 192, svg: shortcutProjectsSvg },

  // Shortcut Services
  { file: "shortcut-services.png", size: 192, svg: shortcutServicesSvg },
  { file: "shortcut-services-96x96.png", size: 96, svg: shortcutServicesSvg },
  { file: "shortcut-services-192x192.png", size: 192, svg: shortcutServicesSvg },

  // Shortcut Admin
  { file: "shortcut-admin.png", size: 192, svg: shortcutAdminSvg },
  { file: "shortcut-admin-96x96.png", size: 96, svg: shortcutAdminSvg },
  { file: "shortcut-admin-192x192.png", size: 192, svg: shortcutAdminSvg },

  // Shortcut Contact
  { file: "shortcut-contact.png", size: 192, svg: shortcutContactSvg },
  { file: "shortcut-contact-96x96.png", size: 96, svg: shortcutContactSvg },
  { file: "shortcut-contact-192x192.png", size: 192, svg: shortcutContactSvg },
];

async function generate() {
  console.log("Generating genuine binary PNG icons via sharp...");
  for (const { file, size, svg } of tasks) {
    const dest = path.join(iconsDir, file);
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(dest);

    const stats = fs.statSync(dest);
    const metadata = await sharp(dest).metadata();
    console.log(`✓ ${file}: ${metadata.width}x${metadata.height}px, ${metadata.format.toUpperCase()}, ${stats.size} bytes`);
  }
  console.log("All genuine PNG icons created successfully!");
}

generate().catch((err) => {
  console.error("Error generating icons:", err);
  process.exit(1);
});
