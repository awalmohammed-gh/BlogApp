const upsertMeta = (attr, key, content) => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.append(el);
  }
  el.setAttribute("content", content);
};

/**
 * Keep the document title, description and social sharing tags in sync.
 * No canonical URL or domain is invented here; articles may set their own.
 */
export const setPageMeta = ({ title, description, siteName, image, type = "website", twitterSite = "" }) => {
  if (title) document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:site_name", siteName);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
  // Settings -> SEO & Sharing -> X handle
  upsertMeta("name", "twitter:site", twitterSite ? `@${twitterSite.replace(/^@/, "")}` : "");
};

export default setPageMeta;
