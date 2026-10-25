import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Updates the document <link rel="manifest"> and PWA meta tags dynamically
 * based on whether the current route belongs to the Admin App (/admin) or the Public App (/).
 */
export function applyManifestForRoute(pathname = window.location.pathname) {
  if (typeof document === "undefined") return;

  const isAdmin = pathname.startsWith("/admin");
  const targetManifest = isAdmin ? "/admin-manifest.json" : "/manifest.json";
  const targetTitle = isAdmin ? "Admin" : "Nsemfoa News";
  const targetThemeColor = isAdmin ? "#991B1B" : "#0B1B3A";

  // 1. Update or create <link rel="manifest">
  let manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement("link");
    manifestLink.rel = "manifest";
    manifestLink.id = "app-manifest";
    document.head.appendChild(manifestLink);
  }

  if (manifestLink.getAttribute("href") !== targetManifest) {
    manifestLink.setAttribute("href", targetManifest);
    // Dispatch custom event for telemetry or debugging
    window.dispatchEvent(
      new CustomEvent("pwa:manifestswitched", {
        detail: { manifest: targetManifest, isAdmin }
      })
    );
  }

  // 2. Update Apple Mobile Web App Title
  let appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitleMeta) {
    appleTitleMeta = document.createElement("meta");
    appleTitleMeta.name = "apple-mobile-web-app-title";
    document.head.appendChild(appleTitleMeta);
  }
  appleTitleMeta.content = targetTitle;

  // 3. Update theme-color meta tag
  const themeColorMetas = document.querySelectorAll('meta[name="theme-color"]');
  themeColorMetas.forEach((meta) => {
    // Only update the primary theme-color (without dark/light media query constraint)
    if (!meta.getAttribute("media")) {
      meta.content = targetThemeColor;
    }
  });
}

/**
 * ManifestSwitcher Client Component
 * Listens to React Router location changes and ensures the correct manifest is active.
 */
export default function ManifestSwitcher() {
  const location = useLocation();

  useEffect(() => {
    applyManifestForRoute(location.pathname);
  }, [location.pathname]);

  return null;
}
