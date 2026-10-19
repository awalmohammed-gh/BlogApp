import { responsiveImageProps, optimizeArticleImages } from "../utils/imageKit";
import { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronRight, Clock, Eye, Link2, Check, Printer, Share2, Tag } from "lucide-react";
import { FaXTwitter, FaFacebookF, FaLinkedinIn, FaWhatsapp } from "react-icons/fa6";
import { setPageMeta } from "../utils/setPageMeta";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { formatPublicDate } from "../utils/formatPublicDate";
import ReadingProgress from "../components/common/ReadingProgress";
import { publicGet } from "../api/publicCache";
import { formatArticle } from "../hooks/usePublicArticles";
import { publicArticleService } from "../services/public/publicArticleService";
import { analyticsTrackingService } from "../services/public/analyticsTrackingService";
import CommentSection from "../components/common/CommentSection";
import BlogCard from "../components/card/BlogCard";
import Advert from "../components/common/Advert";
import Newsletter from "../components/common/Newsletter";
import { getDesk, toCategorySlug } from "../config/desks";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { readingMinutes, hideBrokenImage } from "../utils/articleMeta";

// Typography for the stored rich text (headings, lists, quotes, links, images)
const PROSE =
  "text-[1.075rem] sm:text-lg leading-8 text-slate-700 " +
  "[&_p]:my-6 [&_strong]:text-slate-900 [&_strong]:font-semibold " +
  "[&_h2]:font-serif-headline [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:leading-tight " +
  "[&_h3]:font-serif-headline [&_h3]:text-2xl [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-10 [&_h3]:mb-3 " +
  "[&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-slate-900 [&_h4]:mt-8 " +
  "[&_a]:text-blue-700 [&_a]:underline [&_a]:decoration-blue-300 [&_a]:underline-offset-4 hover:[&_a]:decoration-blue-700 " +
  "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6 [&_ul]:my-6 [&_ol]:my-6 [&_li]:my-2 [&_li]:pl-1 " +
  "[&_blockquote]:my-10 [&_blockquote]:border-l-4 [&_blockquote]:border-blue-600 [&_blockquote]:pl-6 [&_blockquote]:font-serif-headline [&_blockquote]:text-2xl [&_blockquote]:leading-snug [&_blockquote]:text-slate-900 " +
  "[&_img]:my-10 [&_img]:rounded-2xl [&_img]:w-full [&_figcaption]:text-sm [&_figcaption]:text-slate-500 [&_figcaption]:text-center [&_figcaption]:-mt-6 " +
  "[&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-5 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_code]:text-[0.9em] [&_hr]:my-12 [&_hr]:border-slate-200 " +
  "[&>p:first-of-type]:first-letter:float-left [&>p:first-of-type]:first-letter:font-serif-headline [&>p:first-of-type]:first-letter:text-6xl [&>p:first-of-type]:first-letter:font-bold [&>p:first-of-type]:first-letter:leading-[0.85] [&>p:first-of-type]:first-letter:mr-3 [&>p:first-of-type]:first-letter:mt-1 [&>p:first-of-type]:first-letter:text-blue-700";

const ShareButtons = ({ url, title, vertical = false }) => {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "Share on X", icon: FaXTwitter, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "Share on Facebook", icon: FaFacebookF, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "Share on LinkedIn", icon: FaLinkedinIn, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: "Share on WhatsApp", icon: FaWhatsapp, href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}` }
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context)
    }
  };
  const btn = "w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 inline-flex items-center justify-center transition-colors cursor-pointer";
  return (
    <div className={`flex ${vertical ? "flex-col" : "flex-row flex-wrap"} items-center gap-2`}>
      <button type="button" onClick={copy} className={btn} aria-label={copied ? "Link copied" : "Copy link"} title={copied ? "Link copied" : "Copy link"}>
        {copied ? <Check size={16} className="text-emerald-600" /> : <Link2 size={16} />}
      </button>
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" className={btn} aria-label={link.label} title={link.label}>
            <Icon size={15} />
          </a>
        );
      })}
      <button type="button" onClick={() => window.print()} className={btn} aria-label="Print article" title="Print">
        <Printer size={16} />
      </button>
    </div>
  );
};

const BlogPage = () => {
  const { settings } = useSiteSettings();
  const { id } = useParams();

  const navigate = useNavigate();

  const [fetchedArticle, setFetchedArticle] = useState(null);
  const [fetchedRelated, setFetchedRelated] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError,setFetchError] = useState("");
  const [retry,setRetry] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller=new AbortController();
    const loadFromApi = async () => {
      try {
        setFetching(true); setFetchError(""); setFetchedRelated([]);
        const res = await publicArticleService.getArticleBySlug(id,{signal:controller.signal,fresh:retry>0});
        if (isMounted && res?.success && res.data?.article) {
          const art = res.data.article;
          setFetchedArticle({
            requestedSlug: id,
            _id: art._id,
            title: art.title,
            subTitle: art.subTitle || "",
            slug: art.slug,
            category: art.category?.name || "General News",
            categorySlug: art.category?.slug || toCategorySlug(art.category?.name),
            content: optimizeArticleImages(sanitizeHtml(art.content || art.excerpt || "")),
            image: art.featuredImage?.url || "",
            featuredImage: art.featuredImage,
            imageAlt: art.featuredImage?.alt || "",
            publishedAt: art.publishedAt,
            author: art.byline || art.author?.name || "Nsemra News Desk",
            // Account details only describe the author when no separate byline is set
            authorBio: art.byline ? "" : art.author?.bio || "",
            authorAvatar: art.byline ? "" : art.author?.avatar || "",
            tags: (art.tags || []).map((t) => (typeof t === "object" ? t.name : t)).filter(Boolean),
            views: art.views || 0,
            seo: art.seo
          });

          if (art.status === "published") analyticsTrackingService.trackArticleView(art._id, art.slug);

          publicGet(`/articles/${encodeURIComponent(id)}/related`,{signal:controller.signal}).then((result)=>{if(isMounted)setFetchedRelated((result.data||[]).map((article)=>formatArticle(article)));}).catch(()=>{});

        }
      } catch(error) {
        if(isMounted && error.status !== 404 && error.name !== "AbortError")setFetchError(error.message || "This story could not be loaded.");
      } finally {
        if (isMounted) setFetching(false);
      }
    };
    loadFromApi();
    return () => {
      isMounted = false; controller.abort();
    };
  }, [id,retry]);

  const blogDetails = useMemo(() => (fetchedArticle?.requestedSlug === id ? {...fetchedArticle,date:fetchedArticle.publishedAt?formatPublicDate(fetchedArticle.publishedAt,settings?.general):""} : null), [fetchedArticle, id,settings?.general]);

  useEffect(() => {
    if (!blogDetails?.title) return;
    const siteName = settings?.general.siteName || "Nsemra News";
    const title = blogDetails.seo?.metaTitle || `${blogDetails.title} | ${siteName}`;
    const description = blogDetails.seo?.metaDescription || settings?.seo.defaultMetaDescription || "";
    setPageMeta({
      title: blogDetails.seo?.ogTitle || title,
      description: blogDetails.seo?.ogDescription || description,
      siteName,
      type: "article",
      image: blogDetails.seo?.ogImage || blogDetails.featuredImage?.url || "",
      canonical:blogDetails.seo?.canonicalUrl || `${window.location.origin}/blog-details/${blogDetails.slug}`,
      article:blogDetails,
      twitterSite: settings?.seo.twitterHandle
    });
    document.title = title;
  }, [blogDetails, settings]);

  const related = fetchedRelated.slice(0,3);

  if(fetchError) return <div role="alert" className="mx-auto my-32 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center"><h1 className="text-2xl font-bold">This story could not be loaded</h1><p className="mt-3 text-sm text-slate-500">Please check your connection and try again.</p><button onClick={()=>setRetry((value)=>value+1)} className="mt-5 rounded-xl bg-blue-600 px-5 py-3 text-sm text-white">Try again</button></div>;

  if (fetching) {
    return (
      <div className="min-h-screen bg-white pt-32 pb-20" aria-label="Loading article">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 animate-pulse space-y-5">
          <div className="h-4 w-40 rounded bg-slate-200" />
          <div className="h-12 w-full rounded bg-slate-200" />
          <div className="h-12 w-4/5 rounded bg-slate-200" />
          <div className="h-5 w-64 rounded bg-slate-200" />
        </div>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-10 animate-pulse">
          <div className="aspect-video rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!blogDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 pt-24 px-4">
        <div className="text-center max-w-md p-10 bg-white rounded-3xl border border-slate-200">
          <h2 className="font-serif-headline text-3xl font-bold text-slate-900 mb-2">Article Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">This story could not be found or has not been published yet.</p>
          <Link to="/blog" className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
            Browse stories <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  const desk = getDesk(blogDetails.categorySlug || blogDetails.category);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const minutes = readingMinutes(blogDetails.content);
  const nativeShare = async () => {
    try {
      await navigator.share({ title: blogDetails.title, text: blogDetails.subTitle, url: shareUrl });
    } catch {
      // Dismissed
    }
  };

  return (
    <article className="bg-white">
      <ReadingProgress articleId={blogDetails._id} />

      {/* ===== Header ===== */}
      <header className="pt-28 md:pt-36 bg-linear-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 mb-8">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
              <Link to="/" className="hover:text-slate-900">Home</Link>
              <ChevronRight size={13} />
              <Link to="/blog" className="hover:text-slate-900">Stories</Link>
              <ChevronRight size={13} />
              <Link to={`/${desk.slug}`} className="hover:text-slate-900 truncate">{desk.name}</Link>
            </nav>
            <button type="button" onClick={() => navigate(-1)} className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer print:hidden">
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <Link to={`/${desk.slug}`} className="inline-flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-200 hover:text-blue-700 transition-colors">
              <img src={desk.image} alt="" className="w-6 h-6 rounded-full object-cover" />
              {blogDetails.category}
            </Link>

            <h1 className="mt-6 font-serif-headline text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-950 tracking-tight leading-[1.05] text-balance">
              {blogDetails.title}
            </h1>
            {blogDetails.subTitle && <p className="mt-5 text-xl sm:text-2xl text-slate-500 leading-snug">{blogDetails.subTitle}</p>}

            <div className="mt-8 pb-8 border-b border-slate-200 flex flex-wrap items-center justify-between gap-5">
              <div className="flex items-center gap-3">
                {blogDetails.authorAvatar ? (
                  <img src={blogDetails.authorAvatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <span className="w-11 h-11 rounded-full bg-linear-to-br from-sky-400 to-blue-700 text-white font-bold inline-flex items-center justify-center">
                    {blogDetails.author.charAt(0)}
                  </span>
                )}
                <div className="text-sm">
                  <div className="font-semibold text-slate-900">{blogDetails.author}</div>
                  <div className="text-slate-500 flex flex-wrap items-center gap-x-2">
                    {blogDetails.date && <span>{blogDetails.date}</span>}
                    <span aria-hidden="true">&middot;</span>
                    <span className="inline-flex items-center gap-1"><Clock size={13} /> {minutes} min read</span>
                    {blogDetails.views > 0 && (
                      <>
                        <span aria-hidden="true">&middot;</span>
                        <span className="inline-flex items-center gap-1"><Eye size={13} /> {blogDetails.views.toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="lg:hidden print:hidden flex items-center gap-2">
                {typeof navigator !== "undefined" && navigator.share ? (
                  <button type="button" onClick={nativeShare} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">
                    <Share2 size={15} /> Share
                  </button>
                ) : (
                  <ShareButtons url={shareUrl} title={blogDetails.title} />
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {blogDetails.image && (
          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-6xl mx-auto px-4 sm:px-6 mt-10"
          >
            <div className="aspect-video rounded-3xl overflow-hidden bg-linear-to-br from-slate-100 to-blue-100 shadow-2xl shadow-slate-300/40">
              <img {...responsiveImageProps(blogDetails.image,{width:1280,sizes:"(max-width: 1152px) 100vw, 1152px",priority:true})} alt={blogDetails.imageAlt || blogDetails.title} onError={hideBrokenImage} className="w-full h-full object-cover" />
            </div>
            {blogDetails.imageAlt && blogDetails.imageAlt !== blogDetails.title && (
              <figcaption className="mt-3 text-center text-sm text-slate-500">{blogDetails.imageAlt}</figcaption>
            )}
          </motion.figure>
        )}
      </header>

      {/* ===== Body ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-16 grid lg:grid-cols-[3.5rem_minmax(0,48rem)] lg:justify-center gap-10">
        <aside className="hidden lg:block print:hidden" aria-label="Share this story">
          <div className="sticky top-36">
            <ShareButtons url={shareUrl} title={blogDetails.title} vertical />
          </div>
        </aside>

        <div className="min-w-0 w-full max-w-3xl mx-auto lg:mx-0">
          <div id="article-body" className={`article-content ${PROSE}`} dangerouslySetInnerHTML={{ __html: blogDetails.content }} />

          {blogDetails.tags.length > 0 && (
            <div className="mt-12 flex flex-wrap items-center gap-2">
              <Tag size={15} className="text-slate-400" />
              {blogDetails.tags.map((tag) => (
                <Link key={tag} to={`/blog?q=${encodeURIComponent(tag)}`} className="px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700">
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          {/* Author + desk */}
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Written by</span>
              <div className="mt-3 flex items-center gap-3">
                <span className="w-12 h-12 shrink-0 rounded-full bg-linear-to-br from-sky-400 to-blue-700 text-white text-lg font-bold inline-flex items-center justify-center">
                  {blogDetails.author.charAt(0)}
                </span>
                <div className="font-serif-headline text-xl font-bold text-slate-900">{blogDetails.author}</div>
              </div>
              {blogDetails.authorBio && <p className="mt-3 text-sm text-slate-600 leading-relaxed">{blogDetails.authorBio}</p>}
            </div>
            <Link to={`/${desk.slug}`} className="group relative overflow-hidden rounded-2xl min-h-40 bg-slate-900 p-6 flex flex-col justify-end">
              <img src={desk.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 group-hover:opacity-90 transition-all duration-500" />
              <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
              <div className="relative">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-300">Filed under</span>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <span className="font-serif-headline text-2xl font-bold text-white">{desk.name}</span>
                  <ArrowRight size={18} className="text-white group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          <div className="my-10 print:hidden">
            <Advert placement="article_inline" />
          </div>

          <div className="print:hidden">
            <CommentSection key={blogDetails._id} slug={blogDetails.slug || id} />
          </div>
        </div>
      </div>

      {/* ===== Keep reading ===== */}
      {related.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-200/80 py-16 print:hidden" aria-label="Related stories">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Keep reading</span>
                <h2 className="mt-1.5 font-serif-headline text-3xl sm:text-4xl font-bold text-slate-900">More from {desk.name}</h2>
              </div>
              <Link to={`/${desk.slug}`} className="text-sm font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1">
                <span className="hidden sm:inline">View desk</span> <ArrowRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {related.map((story) => <BlogCard key={story._id} blog={story} />)}
            </div>
          </div>
        </section>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 print:hidden">
        <Newsletter source="article" />
      </div>
    </article>
  );
};

export default BlogPage;
