import { useState } from "react";
import { resizeImage } from "../../utils/imageKit";

/**
 * Presentational site logo. Shows the uploaded logo when there is one (falling
 * back to the initials badge if it fails to load) and the site name + tagline
 * unless the logo already contains the name.
 */
export default function BrandMark({ name, tagline, logoUrl = "", logoIncludesName = false, compact = false, className = "" }) {
  const [failedUrl, setFailedUrl] = useState("");
  const hasLogo = Boolean(logoUrl) && failedUrl !== logoUrl;
  const initials = (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  const showText = !compact && !(hasLogo && logoIncludesName);

  return (
    <span className={`inline-flex items-center gap-2.5 min-w-0 ${className}`}>
      {hasLogo ? (
        <img
          src={resizeImage(logoUrl, "h-96")}
          alt={showText ? "" : name}
          onError={() => setFailedUrl(logoUrl)}
          className={`shrink-0 h-10 object-contain ${compact ? "w-10" : logoIncludesName ? "w-auto max-w-44" : "w-auto max-w-24"}`}
        />
      ) : (
        <span aria-hidden="true" className="relative shrink-0 w-10 h-10 rounded-xl bg-(--brand-blue,#2563EB) text-white flex items-center justify-center font-black text-base tracking-tighter shadow-sm border border-white/15">
          {initials}
          <span className="absolute left-2 right-2 bottom-1.5 h-0.5 rounded-full bg-white/70" />
        </span>
      )}
      {showText && (
        <span className="min-w-0 text-left">
          <span className="block truncate text-sm sm:text-lg font-black text-white tracking-tight leading-tight">{name}</span>
          {tagline && <span className="block truncate text-[10px] font-medium text-blue-200 tracking-wide leading-tight mt-0.5">{tagline}</span>}
        </span>
      )}
      {compact && !hasLogo && <span className="sr-only">{name}{tagline ? ` — ${tagline}` : ""}</span>}
    </span>
  );
}
