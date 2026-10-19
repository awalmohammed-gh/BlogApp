// Allowlist sanitizer for stored article HTML, built on the browser's DOMParser
// (no extra dependency). Keeps the formatting the rich text editor produces and
// removes scripts, event handlers, inline styles and unsafe URLs.

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "del", "mark", "small", "sub", "sup", "span",
  "a", "ul", "ol", "li", "blockquote", "q", "cite", "code", "pre",
  "img", "figure", "figcaption", "table", "thead", "tbody", "tr", "th", "td"
]);

// Removed together with everything inside them
const DROP_WITH_CONTENT = new Set([
  "script", "style", "iframe", "frame", "frameset", "object", "embed", "applet", "noscript",
  "template", "svg", "math", "form", "input", "button", "textarea", "select", "option",
  "link", "meta", "base", "title", "head"
]);

const ALLOWED_ATTRS = {
  a: ["href", "title"],
  img: ["src", "alt", "title", "width", "height"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["start"]
};

const isSafeUrl = (value, { allowMail = false } = {}) => {
  // Drop whitespace and control characters, which browsers ignore inside schemes ("java\nscript:")
  const url = [...value].filter((c) => c.charCodeAt(0) > 0x20 && c.charCodeAt(0) !== 0x7f).join("");
  if (!url) return false;
  if (/^(\/(?!\/)|#|\.\.?\/)/.test(url)) return true; // relative
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (!scheme) return !url.startsWith("//"); // bare relative path; no protocol-relative hosts
  return scheme === "https" || scheme === "http" || (allowMail && (scheme === "mailto" || scheme === "tel"));
};

const cleanNode = (node) => {
  for (const child of [...node.childNodes]) {
    if (child.nodeType === Node.COMMENT_NODE) {
      child.remove();
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = child.tagName.toLowerCase();
    if (DROP_WITH_CONTENT.has(tag)) {
      child.remove();
      continue;
    }
    cleanNode(child);
    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...child.childNodes); // keep the text, drop the wrapper
      continue;
    }

    const allowed = ALLOWED_ATTRS[tag] || [];
    for (const attr of [...child.attributes]) {
      const name = attr.name.toLowerCase();
      if (!allowed.includes(name)) child.removeAttribute(attr.name);
      else if ((name === "href" || name === "src") && !isSafeUrl(attr.value, { allowMail: name === "href" })) child.removeAttribute(attr.name);
    }
    if (tag === "img" && !child.getAttribute("src")) {
      child.remove();
      continue;
    }
    if (tag === "a" && /^https?:/i.test(child.getAttribute("href") || "")) {
      child.setAttribute("target", "_blank");
      child.setAttribute("rel", "noopener noreferrer");
    }
  }
};

export const sanitizeHtml = (html) => {
  if (!html || typeof window === "undefined" || typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}`, "text/html");
  cleanNode(doc.body);
  return doc.body.innerHTML;
};

export default sanitizeHtml;
