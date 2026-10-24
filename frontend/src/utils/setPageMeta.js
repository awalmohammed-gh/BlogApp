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

const upsertCanonical = (url) => {
  let el = document.head.querySelector("link[rel='canonical']");
  if (!url) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.append(el);
  }
  el.setAttribute("href", url);
};

const upsertStructuredData = (jsonLd) => {
  const ID = "seo-json-ld";
  let el = document.getElementById(ID);
  if (!jsonLd) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.id = ID;
    el.type = "application/ld+json";
    document.head.append(el);
  }
  el.textContent = typeof jsonLd === "string" ? jsonLd : JSON.stringify(jsonLd);
};

/**
 * Keep the document title, description, canonical link, social tags, and structured data in sync.
 */
export const setPageMeta = ({
  title,
  description,
  siteName,
  image,
  type = "website",
  url,
  canonical,
  robots = "index, follow",
  twitterSite = "",
  structuredData = null
}) => {
  if (title) document.title = title;
  upsertMeta("name", "description", description);
  upsertMeta("name", "robots", robots);
  upsertMeta("property", "og:site_name", siteName);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:title", title);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url || canonical);
  upsertMeta("property", "og:image", image);
  upsertMeta("name", "twitter:card", image ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", title);
  upsertMeta("name", "twitter:description", description);
  upsertMeta("name", "twitter:image", image);
  upsertMeta("name", "twitter:site", twitterSite ? `@${twitterSite.replace(/^@/, "")}` : "");

  upsertCanonical(canonical || url);
  upsertStructuredData(structuredData);
};

export default setPageMeta;
