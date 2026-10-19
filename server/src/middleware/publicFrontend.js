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
  app.get("/robots.txt",(req,res)=>res.type("text/plain").send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/admin\nSitemap: ${env.FRONTEND_URL.replace(/\/$/,"")}/sitemap.xml\n`));
  app.get("/sitemap.xml",async(req,res,next)=>{try{
    const rows=await Article.find(published()).select("slug updatedAt publishedRevision").populate("publishedRevision","slug").sort({_id:1}).limit(50000).lean().maxTimeMS(10000);
    const base=env.FRONTEND_URL.replace(/\/$/,"");
    const urls=["/","/blog","/about","/contact"].map((route)=>`<url><loc>${escape(base+route)}</loc></url>`);
    for(const row of rows)urls.push(`<url><loc>${escape(`${base}/blog-details/${encodeURIComponent(row.publishedRevision?.slug || row.slug)}`)}</loc><lastmod>${new Date(row.updatedAt).toISOString()}</lastmod></url>`);
    res.set("Cache-Control","public, max-age=0, must-revalidate").type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`);
  }catch(error){next(error);}});
  if(process.env.SERVE_FRONTEND !== "true") return;
  app.use("/assets",express.static(path.join(directory,"assets"),{immutable:true,maxAge:"1y",fallthrough:false}));
  app.get("/blog-details/:slug",async(req,res,next)=>{try{
    let article=await Article.findOne({...published(),slug:req.params.slug}).select("title subTitle slug excerpt content seo featuredImage author byline category publishedAt updatedAt publishedRevision").populate("author","name").populate("publishedRevision","title subTitle slug excerpt content seo featuredImage").lean();
    if(!article){const revision=await ArticleRevision.findOne({slug:req.params.slug,isPublished:true,isApproved:true}).select("articleId").lean();if(revision)article=await Article.findOne({...published(),_id:revision.articleId}).populate("author","name").populate("publishedRevision","title subTitle slug excerpt content seo featuredImage").lean();}
    if(!article)return res.status(404).set("Cache-Control","no-store").send("<!doctype html><title>Story not found</title><h1>Story not found</h1><a href='/blog'>Browse published stories</a>");
    const data=resolvePublicArticle(article);const settings=(await getSettings()).values;
    const canonical=safeUrl(data.seo?.canonicalUrl)||`${env.FRONTEND_URL.replace(/\/$/,"")}/blog-details/${encodeURIComponent(data.slug)}`;
    const title=data.seo?.metaTitle || `${data.title} | ${settings.general.siteName}`;const description=data.seo?.metaDescription || data.excerpt || settings.seo.defaultMetaDescription;
    const image=safeUrl(data.seo?.ogImage || data.featuredImage?.url);
    let html=await readFile(path.join(directory,"index.html"),"utf8");
    html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${escape(title)}</title>`).replace(/<meta\s+(name="(?:description|twitter:[^"]+)"|property="og:[^"]+")[^>]*>/gi,"").replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,"");
    const json={"@context":"https://schema.org","@type":"NewsArticle",headline:data.title,description,image:image?[image]:undefined,datePublished:data.publishedAt,dateModified:data.updatedAt,mainEntityOfPage:canonical,author:{"@type":"Person",name:data.byline||data.author?.name||settings.general.siteName},publisher:{"@type":"NewsMediaOrganization",name:settings.general.siteName}};
    const metadata=`<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(canonical)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="article"><meta property="og:title" content="${escape(data.seo?.ogTitle || title)}"><meta property="og:description" content="${escape(data.seo?.ogDescription || description)}"><meta property="og:site_name" content="${escape(settings.general.siteName)}"><meta name="twitter:card" content="${image?"summary_large_image":"summary"}">${image?`<meta property="og:image" content="${escape(image)}">`:""}<script type="application/ld+json">${JSON.stringify(json).replace(/</g,"\\u003c")}</script>`;
    html=html.replace("</head>",metadata+"</head>").replace('<div id="root"></div>',`<div id="root"><article style="max-width:48rem;margin:3rem auto;padding:1.5rem"><a href="/">${escape(settings.general.siteName)}</a><h1>${escape(data.title)}</h1><p>${escape(data.subTitle || data.excerpt)}</p><div style="white-space:pre-wrap;line-height:1.8">${escape(readable(data.content))}</div></article></div>`);
    res.set("Cache-Control","no-store").type("html").send(html);
  }catch(error){next(error);}});
  app.use(express.static(directory,{index:false,maxAge:"1h"}));
  app.get(/^\/(?!api(?:\/|$)).*/,async(req,res,next)=>{try{res.set("Cache-Control","no-cache").type("html").send(await readFile(path.join(directory,"index.html"),"utf8"));}catch(error){next(error);}});
}
