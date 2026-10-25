import { useSiteSettings } from "../../context/SiteSettingsContext";
import BrandMark from "./BrandMark";

/** Site logo used in the navbar, footer and admin screens. */
export default function BrandLogo({ compact = false, className = "", isAdmin: propIsAdmin }) {
  const { settings } = useSiteSettings() || {};
  const branding = settings?.branding || {};

  const isAdmin =
    typeof propIsAdmin === "boolean"
      ? propIsAdmin
      : typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  if (isAdmin) {
    return (
      <div className={`inline-flex items-center gap-2.5 ${className}`}>
        <img
          src="/admin-logo.png"
          alt="Nsemfoa Admin"
          className={`${
            compact
              ? "w-8 h-8 object-contain rounded-lg"
              : "h-11 sm:h-13 w-auto max-w-[200px] object-contain drop-shadow-md"
          } transition-transform hover:scale-102`}
        />
        <span className="sr-only">Nsemfoa News Admin</span>
      </div>
    );
  }

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
