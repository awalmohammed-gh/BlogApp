import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useBlog } from "../context/BlogProvider";
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
import CommentSection from "../components/common/CommentSection"

const BlogPage = () => {
  const { id } = useParams();
  const { articles } = useBlog();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const blogDetails = useMemo(() => {
    return articles.find((blog) => blog._id === id);
  }, [articles, id]);

  if (!blogDetails) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-[#1E3A8A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading article...</p>
      </div>
    </div>
  );

  const formatCategory = (value) =>
    value?.replace(/-/g, " ");

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const readingTime = () => {
    const wordsPerMinute = 200;
    const text = blogDetails.description.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
  };

  return (
    <>
      {/* Banner */}
      <div className="bg-[url('/categoryBg.jpg')] bg-cover bg-center h-[40vh] relative flex items-center justify-center">
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/60 to-black/80"></div>
        
        <div className="relative text-center text-white px-6 max-w-4xl animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/30 backdrop-blur-md rounded-full text-sm font-medium mb-4 border border-blue-400/30">
            <BookOpen className="w-4 h-4" />
            Featured Story
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-3 capitalize">
            {formatCategory(blogDetails.category)} News
          </h1>
          <p className="text-sm md:text-lg text-gray-200 max-w-2xl mx-auto">
            Explore the full story behind this headline and stay informed with accurate reporting and deeper insights.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 sm:px-[4vw] py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Link to="/" className="hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
              <Home size={14} />
              Home
            </Link>
            <Slash size={12} />
            <Link to="/latest" className="hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
              <Newspaper size={14} />
              Blog
            </Link>
            <Slash size={12} />
            <Link
              to={`/${blogDetails.category.toLowerCase().replace(/\s+/g, '-')}`}
              className="capitalize hover:text-[#1E3A8A] transition-colors"
            >
              {formatCategory(blogDetails.category)}
            </Link>
          </div>
          
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-[#1E3A8A] transition-colors flex items-center gap-1">
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
            <button className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200">
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

        <div className="my-10">
         <CommentSection/>
        </div>
      </div>
    </>
  );
};

export default BlogPage;