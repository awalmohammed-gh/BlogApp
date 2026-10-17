import React, { useMemo, useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useBlog } from "../context/BlogProvider";
import { publicArticleService } from "../services/public/publicArticleService";
import { analyticsTrackingService } from "../services/public/analyticsTrackingService";
import { 
  Slash, 
  User, 
  Calendar, 
  Home, 
  Newspaper, 
  BookOpen, 
  Share2, 
  Bookmark,
  ArrowLeft,
  Tag,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Printer,
  Copy,
  CheckCircle2
} from "lucide-react";
import CommentSection from "../components/common/CommentSection";
import BlogCard from "../components/card/BlogCard";
import Advert from "../components/common/Advert";

// Representative thematic banner images
import blog1 from "../assets/blog1.jpg"; // Sports
import blog7 from "../assets/blog7.jpg"; // E-commerce
import blog13 from "../assets/blog13.jpg"; // Business
import blog18 from "../assets/blog18.png"; // Trading
import blog19 from "../assets/blog19.jpeg"; // Lifestyle
import blog20 from "../assets/blog20.jpg"; // Entertainment
import blog25 from "../assets/blog25.jpg"; // Health
import blog28 from "../assets/blog28.jpg"; // Technology
import blog30 from "../assets/blog30.jpg"; // Local News
import blog34 from "../assets/blog34.jpg"; // Foreign News / World
import blog35 from "../assets/blog35.jpg"; // Politics

const CATEGORY_BANNERS = {
  sports: blog1,
  technology: blog28,
  trading: blog18,
  "e-commerce": blog7,
  lifestyle: blog19,
  "local-news": blog30,
  "foreign-news": blog34,
  world: blog34,
  business: blog13,
  politics: blog35,
  entertainment: blog20,
  health: blog25,
};

const BlogPage = () => {
  const { id } = useParams();
  const { articles } = useBlog();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const [fetchedArticle, setFetchedArticle] = useState(null);
  const [fetchedRelated, setFetchedRelated] = useState([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadFromApi = async () => {
      try {
        setFetching(true);
        const res = await publicArticleService.getArticleBySlug(id);
        if (isMounted && res?.success && res.data?.article) {
          const art = res.data.article;
          setFetchedArticle({
            _id: art._id,
            title: art.title,
            subTitle: art.subTitle || "",
            slug: art.slug,
            category: art.category?.name || "General News",
            description: art.content || art.excerpt || "",
            content: art.content || art.excerpt || "",
            image: art.featuredImage?.url || "/heroBg.jpg",
            isPublished: art.status === "published",
            date: art.publishedAt
              ? new Date(art.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric"
                })
              : "Recently",
            author: art.author?.name || "NewsFront Desk",
            tags: (art.tags || []).map((t) => (typeof t === "object" ? t.name : t)),
            views: art.views || 0,
            seo: art.seo
          });

          // Dispatch privacy-conscious public readership telemetry
          if (art.status === "published") {
            analyticsTrackingService.trackArticleView(art._id, art.slug);
          }

          if (res.data.relatedStories) {
            setFetchedRelated(
              res.data.relatedStories.map((rel) => ({
                _id: rel._id,
                title: rel.title,
                subTitle: rel.subTitle || "",
                category: rel.category?.name || "General News",
                description: rel.excerpt || "",
                image: rel.featuredImage?.url || "/heroBg.jpg",
                author: rel.author?.name || "NewsFront Desk",
                date: rel.publishedAt
                  ? new Date(rel.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    })
                  : "Recently",
                isPublished: true
              }))
            );
          }
        }
      } catch {
        // Fallback to local memory
      } finally {
        if (isMounted) setFetching(false);
      }
    };

    loadFromApi();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const blogDetails = useMemo(() => {
    if (fetchedArticle) return fetchedArticle;
    return (articles || []).find((blog) => blog._id === id || blog.slug === id);
  }, [articles, id, fetchedArticle]);

  useEffect(() => {
    if (blogDetails?.title) {
      document.title = `${blogDetails.title} | NewsFront`;
    }
  }, [blogDetails]);

  const relatedStories = useMemo(() => {
    if (fetchedRelated.length > 0) return fetchedRelated;
    if (!blogDetails) return [];
    return (articles || [])
      .filter((b) => b.category === blogDetails.category && b._id !== blogDetails._id && b.isPublished)
      .slice(0, 3);
  }, [articles, blogDetails, fetchedRelated]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: blogDetails?.title || "NewsFront Article",
          text: blogDetails?.subTitle || "",
          url: window.location.href,
        });
      } catch {
        // User dismissed share dialog
      }
    } else {
      handleCopyLink();
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading article...</p>
        </div>
      </div>
    );
  }

  if (!blogDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 pt-20">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Article Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">
            The requested story could not be found or has not been published yet.
          </p>
          <Link
            to="/blog"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Browse Published Stories
          </Link>
        </div>
      </div>
    );
  }

  const formatCategory = (value) =>
    value?.replace(/-/g, " ");

  const readingTime = () => {
    const wordsPerMinute = 200;
    const text = (blogDetails.description || "").replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  const categorySlug = (blogDetails?.category || "").toLowerCase().replace(/\s+/g, "-");
  const bannerImage = CATEGORY_BANNERS[categorySlug] || blogDetails?.image || "/categoryBg.jpg";

  return (
    <>
      {/* Thematic Category Desk Hero Masthead */}
      <section className="relative w-full pt-32 sm:pt-36 md:pt-40 pb-14 overflow-hidden">
        {/* Dynamic Category Banner Background Image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={bannerImage}
            alt={`${blogDetails.category} Banner`}
            className="w-full h-full object-cover object-center scale-105"
          />
        </div>

        {/* Deep Editorial Overlays */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0B1B3D]/92 via-[#0B1B3D]/80 to-[#0B1B3D]/95 pointer-events-none"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-[#0B1B3D]/30 to-[#07132B]/85 pointer-events-none"></div>

        <div className="relative text-center text-white px-6 max-w-4xl mx-auto z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-widest mb-4 border border-blue-400/30 text-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>{formatCategory(blogDetails.category)} Desk Dispatch</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold font-serif-headline tracking-tight mb-3 capitalize text-white">
            {formatCategory(blogDetails.category)} News
          </h1>
          <p className="text-sm md:text-base text-blue-100/90 max-w-2xl mx-auto font-light leading-relaxed">
            {blogDetails.title}
          </p>
        </div>
      </section>

      {/* Breadcrumb Bar */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-xs">
        <div className="px-4 sm:px-[4vw] py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <Link to="/" className="hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
              <Home size={14} />
              Home
            </Link>
            <Slash size={12} className="text-gray-300" />
            <Link to="/blog" className="hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
              <Newspaper size={14} />
              All Stories
            </Link>
            <Slash size={12} className="text-gray-300" />
            <Link
              to={`/${categorySlug}`}
              className="capitalize hover:text-[#1E3A8A] transition-colors font-medium text-gray-900"
            >
              {formatCategory(blogDetails.category)}
            </Link>
          </div>
          
          <button onClick={() => navigate(-1)} className="text-xs sm:text-sm font-medium text-gray-600 hover:text-[#1E3A8A] transition-colors flex items-center gap-1.5 cursor-pointer">
            <ArrowLeft size={14} />
            Back
          </button>
        </div>
      </div>
      

      {/* Content */}
      <div className="px-4 sm:px-[4vw] py-8 max-w-6xl mx-auto">
        
        {/* Title */}
        <h1 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-gray-900">
          {blogDetails.title}
        </h1>

        {/* Meta Info */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-6 mb-6">
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-[#1E3A8A] to-[#2E4A9A] rounded-full flex items-center justify-center">
                <User size={14} className="text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{blogDetails.author}</p>
                <p className="text-xs text-gray-500">Author</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>{blogDetails.date}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock size={16} />
              <span>{readingTime()}</span>
            </div>
            
            <div className="flex items-center gap-2">
              <Eye size={16} />
              <span>1.2k views</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className={`p-2 rounded-full transition-all duration-200 ${
                isLiked ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={() => setIsBookmarked(!isBookmarked)}
              className={`p-2 rounded-full transition-all duration-200 ${
                isBookmarked ? 'bg-blue-50 text-[#1E3A8A]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Bookmark size={18} fill={isBookmarked ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={handleCopyLink}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200 relative"
            >
              {copied ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
              {copied && (
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                  Link copied!
                </span>
              )}
            </button>
            <button 
              onClick={() => window.print()}
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
            >
              <Printer size={18} />
            </button>
            <button 
              onClick={handleShare}
              title="Share article"
              className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Featured Image */}
        <div className="w-full h-100 md:h-125 mb-8 rounded-2xl overflow-hidden shadow-xl">
          <img
            src={blogDetails.image}
            alt={blogDetails.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* Subtitle */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-6 bg-[#1E3A8A] rounded-full"></div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800">
              {blogDetails.subTitle}
            </h2>
          </div>
        </div>

        {/* Category Tags */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Tag size={14} className="text-gray-400" />
          <Link 
            to={`/${blogDetails.category.toLowerCase().replace(/\s+/g, '-')}`}
            className="text-xs px-3 py-1 bg-blue-50 text-[#1E3A8A] rounded-full hover:bg-blue-100 transition-colors"
          >
            {formatCategory(blogDetails.category)}
          </Link>
        </div>

        {/* Description */}
        <div className="prose prose-lg max-w-none">
          <div
            className="text-gray-700 leading-relaxed space-y-4 [&>p]:mb-4 [&>h3]:text-xl [&>h3]:font-bold [&>h3]:mt-8 [&>h3]:mb-4 [&>ul]:list-disc [&>ul]:pl-6 [&>ul]:mb-4 [&>blockquote]:border-l-4 [&>blockquote]:border-[#1E3A8A] [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-600 [&>blockquote]:my-4"
            dangerouslySetInnerHTML={{ __html: blogDetails.description }}
          />
        </div>
        
        {/* Article Inline Sponsored Placement */}
        <div className="my-8">
          <Advert placement="article_inline" />
        </div>

        {/* Related Stories */}
        {relatedStories.length > 0 && (
          <div className="my-14 border-t border-gray-200 pt-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Related Stories</h3>
                <p className="text-gray-500 text-sm mt-0.5">More from {blogDetails.category}</p>
              </div>
              <Link
                to={`/${blogDetails.category.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-semibold text-[#1E3A8A] hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {relatedStories.map((story) => (
                <BlogCard key={story._id} blog={story} />
              ))}
            </div>
          </div>
        )}

        <div className="my-10">
         <CommentSection/>
        </div>
      </div>
    </>
  );
};

export default BlogPage;