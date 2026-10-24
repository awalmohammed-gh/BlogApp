import { useSiteSettings } from "../../context/SiteSettingsContext";
import BrandMark from "./BrandMark";

/** Site logo used in the navbar, footer and admin screens (Settings -> Branding). */
export default function BrandLogo({ compact = false, className = "" }) {
  const { settings } = useSiteSettings() || {};
  const branding = settings?.branding || {};
  return (
    <BrandMark
      name={settings?.general.siteName || "Nsemfoa News"}
      tagline={settings?.general.tagline ?? "Stories That Matter."}
      logoUrl={branding.logoUrl || "/app-logo.png"}
      logoIncludesName={branding.logoIncludesName ?? true}
      compact={compact}
      className={className}
    />
  );
}
