/**
 * Ask ImageKit for a resized rendition (e.g. "h-96" or "w-64,h-64").
 * Non-ImageKit URLs are returned unchanged.
 */
export const resizeImage = (url, transform) => {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.endsWith("imagekit.io")) return url;
    parsed.searchParams.set("tr", transform);
    return parsed.toString();
  } catch {
    return url;
  }
};

export default resizeImage;
