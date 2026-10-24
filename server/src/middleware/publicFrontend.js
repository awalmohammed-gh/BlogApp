import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import Article from "../models/Article.js";
import ArticleRevision from "../models/ArticleRevision.js";
import { resolvePublicArticle } from "../controllers/publicArticleController.js";
import { getSettings } from "../services/settingsService.js";
import env from "../config/env.js";

const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../frontend/dist");
const escape = (value="") => String(value).replace(/[&<>"']/g,(character)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[character]));
const safeUrl = (value) => { try {const url=new URL(value);return ["http:","https:"].includes(url.protocol)?url.href:"";}catch{return "";} };
const published = () => ({status:"published",deletedAt:null,publishedAt:{$lte:new Date()}});
const readable = (html="") => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,"").replace(/<\/(p|h[1-6]|li|blockquote)>/gi,"\n\n").replace(/<[^>]*>/g,"").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").trim();

export function mountPublicFrontend(app) {
  app.get("/robots.txt", (req, res) => {
    const base = env.FRONTEND_URL.replace(/\/$/, "");
    res.type("text/plain").send(
`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin
Disallow: /api/internal

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api/admin

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: WhatsApp
Allow: /

User-agent: LinkedInBot
Allow: /

Sitemap: ${base}/sitemap.xml
`
    );
  });

  app.get("/sitemap.xml", async (req, res, next) => {
    try {
      const rows = await Article.find(published())
        .select("slug updatedAt publishedAt publishedRevision")
        .populate("publishedRevision", "slug")
        .sort({ publishedAt: -1, _id: -1 })
        .limit(50000)
        .lean()
        .maxTimeMS(10000);

      const base = env.FRONTEND_URL.replace(/\/$/, "");
      const now = new Date().toISOString();

      const staticUrls = [
        { loc: `${base}/`, changefreq: "daily", priority: "1.0", lastmod: now },
        { loc: `${base}/blog`, changefreq: "daily", priority: "0.9", lastmod: now },
        { loc: `${base}/sports`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/technology`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/local-news`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/foreign-news`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/business`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/e-commerce`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/lifestyle`, changefreq: "daily", priority: "0.8", lastmod: now },
        { loc: `${base}/about`, changefreq: "monthly", priority: "0.5", lastmod: now },
        { loc: `${base}/contact`, changefreq: "monthly", priority: "0.5", lastmod: now }
      ];

      const xmlEntries = staticUrls.map(
        (u) =>
          `<url><loc>${escape(u.loc)}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq><priority>${u.priority}</priority></url>`
      );

      for (const row of rows) {
        const slug = encodeURIComponent(row.publishedRevision?.slug || row.slug);
        const lastmod = new Date(row.updatedAt || row.publishedAt || Date.now()).toISOString();
        xmlEntries.push(
          `<url><loc>${escape(`${base}/blog-details/${slug}`)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
        );
      }

      res
        .set("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400")
        .type("application/xml")
        .send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${xmlEntries.join("")}</urlset>`);
    } catch (error) {
      next(error);
    }
  });

  if (process.env.SERVE_FRONTEND !== "true") return;

  // PWA Service Worker & Manifest headers (never cache SW so clients receive instant updates)
  app.get(["/sw.js", "/service-worker.js", "/registerSW.js", "/workbox-*.js"], (req, res, next) => {
    res.set({
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    next();
  });
  app.get(["/manifest.webmanifest", "/manifest.json"], (req, res, next) => {
    res.set({
      "Content-Type": "application/manifest+json",
      "Cache-Control": "no-cache, must-revalidate"
    });
    next();
  });

  app.use("/assets", express.static(path.join(directory, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }));

  // Social Media Crawler / Link Preview handler for single blog posts
  app.get(["/blog-details/:slug", "/post/:slug", "/article/:slug"], async (req, res, next) => {
    try {
      const param = req.params.slug;
      const lookup = { ...published(), $or: [{ slug: param.toLowerCase() }] };
      if (param.match(/^[0-9a-fA-F]{24}$/)) {
        lookup.$or.push({ _id: param });
      }

      let article = await Article.findOne(lookup)
        .select("title subTitle slug excerpt content seo featuredImage author byline category publishedAt updatedAt publishedRevision")
        .populate("author", "name")
        .populate("publishedRevision", "title subTitle slug excerpt content seo featuredImage")
        .lean();

      if (!article) {
        const revision = await ArticleRevision.findOne({ slug: param.toLowerCase(), isPublished: true, isApproved: true })
          .select("articleId")
          .lean();
        if (revision) {
          article = await Article.findOne({ ...published(), _id: revision.articleId })
            .populate("author", "name")
            .populate("publishedRevision", "title subTitle slug excerpt content seo featuredImage")
            .lean();
        }
      }

      if (!article) {
        return res.status(404).set("Cache-Control", "no-store").send("<!doctype html><title>Story not found</title><h1>Story not found</h1><a href='/blog'>Browse published stories</a>");
      }

      const data = resolvePublicArticle(article);
      const settings = (await getSettings()).values;
      const canonical = safeUrl(data.seo?.canonicalUrl) || `${env.FRONTEND_URL.replace(/\/$/, "")}/blog-details/${encodeURIComponent(data.slug)}`;
      const title = data.seo?.metaTitle || `${data.title} | ${settings.general.siteName}`;
      const description = data.seo?.metaDescription || data.excerpt || settings.seo.defaultMetaDescription;
      const image = safeUrl(data.seo?.ogImage || data.featuredImage?.url);

      let html = await readFile(path.join(directory, "index.html"), "utf8");
      html = html
        .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escape(title)}</title>`)
        .replace(/<meta\s+(name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi, "")
        .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, "");

      const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        mainEntityOfPage: {
          "@type": "WebPage",
          "@id": canonical
        },
        headline: data.title,
        description,
        image: image ? [image] : undefined,
        datePublished: data.publishedAt,
        dateModified: data.updatedAt || data.publishedAt,
        author: {
          "@type": "Person",
          name: data.byline || data.author?.name || settings.general.siteName
        },
        publisher: {
          "@type": "Organization",
          name: settings.general.siteName,
          logo: {
            "@type": "ImageObject",
            url: `${env.FRONTEND_URL.replace(/\/$/, "")}/app-logo.png`
          }
        }
      };

      const metadata = [
        `<meta name="description" content="${escape(description)}">`,
        `<link rel="canonical" href="${escape(canonical)}">`,
        `<meta property="og:site_name" content="${escape(settings.general.siteName)}">`,
        `<meta property="og:type" content="article">`,
        `<meta property="og:title" content="${escape(data.seo?.ogTitle || title)}">`,
        `<meta property="og:description" content="${escape(data.seo?.ogDescription || description)}">`,
        `<meta property="og:url" content="${escape(canonical)}">`,
        image ? `<meta property="og:image" content="${escape(image)}">` : "",
        `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}">`,
        `<meta name="twitter:title" content="${escape(data.seo?.ogTitle || title)}">`,
        `<meta name="twitter:description" content="${escape(data.seo?.ogDescription || description)}">`,
        image ? `<meta name="twitter:image" content="${escape(image)}">` : "",
        settings.seo.twitterHandle ? `<meta name="twitter:site" content="@${escape(settings.seo.twitterHandle.replace(/^@/, ""))}">` : "",
        `<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>`
      ].filter(Boolean).join("");

      html = html
        .replace("</head>", metadata + "</head>")
        .replace(
          '<div id="root"></div>',
          `<div id="root"><article style="max-width:48rem;margin:3rem auto;padding:1.5rem"><a href="/">${escape(settings.general.siteName)}</a><h1>${escape(data.title)}</h1><p>${escape(data.subTitle || data.excerpt)}</p><div style="white-space:pre-wrap;line-height:1.8">${escape(readable(data.content))}</div></article></div>`
        );

      res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300").type("html").send(html);
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(directory, { index: false, maxAge: "1h" }));
  app.get(/^\/(?!api(?:\/|$)).*/, async (req, res, next) => {
    try {
      res.set("Cache-Control", "no-cache").type("html").send(await readFile(path.join(directory, "index.html"), "utf8"));
    } catch (error) {
      next(error);
    }
  });
}
