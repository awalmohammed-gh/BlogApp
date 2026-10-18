// Display helpers derived only from real article data.
import { deskImage } from "../config/desks";

export const stripHtml = (html) => (html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

/** Estimated reading time from the article's own word count (200 words/minute). */
export const readingMinutes = (html) => {
  const words = stripHtml(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const toSlug = (name) =>
  (name || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Published-story counts per category, busiest first. */
export const deskCounts = (articles) => {
  const map = new Map();
  for (const a of articles || []) {
    if (!a.isPublished || !a.category) continue;
    const slug = a.categorySlug || toSlug(a.category);
    const entry = map.get(slug) || { name: a.category, slug, count: 0, image: deskImage(slug) };
    entry.count += 1;
    map.set(slug, entry);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
};

/** onError handler: hide a broken image so its container's background shows instead of alt text. */
export const hideBrokenImage = (e) => {
  e.currentTarget.style.visibility = "hidden";
};
