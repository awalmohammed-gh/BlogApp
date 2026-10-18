import { useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useBlog } from "../../context/BlogProvider";
import BlogCard from "../card/BlogCard";
import { 
  ArrowRight, 
  Flame, 
  Clock, 
  User, 
  TrendingUp, 
  Sparkles, 
  ShieldCheck, 
  Bookmark, 
  Newspaper 
} from "lucide-react";

const RecentArticles = () => {
  const { articles, refreshArticles } = useBlog();

  useEffect(() => {
    if (typeof refreshArticles === "function") {
      refreshArticles();
    }
  }, [refreshArticles]);

  const published = useMemo(() => {
    return (articles || []).filter((blog) => blog.isPublished === true);
  }, [articles]);

  // Clean HTML from text helper
  const cleanText = (html) => {
    return (html || "").replace(/<[^>]*>/g, "");
  };

  // 1. Lead Story & Top Supporting Wire
  const leadStory = published[0];
  const supportingStories = published.slice(1, 4);

  // 2. Editor's Spotlight Cards
  const spotlightStories = published.slice(4, 8);

  // 3. In-Depth Analysis & Most Read Sidebar
  const inDepthStories = published.slice(8, 12);
  const trendingStories = published.slice(12, 17);

  if (published.length === 0) {
    return (
      <div className="p-12 text-center bg-gray-50 rounded-2xl border border-gray-100 my-8">
        <Newspaper className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-800">No stories published yet</h3>
        <p className="text-gray-500 text-sm mt-1">Please check back soon for real-time news updates.</p>
      </div>
    );
  }

  return (
    <div className="space-y-16">
      
      {/* =========================================================================
          SECTION 1: THE FRONT-PAGE LEAD & SUPPORTING WIRE
         ========================================================================= */}
      <section>
        {/* Section Header */}
        <div className="flex items-center justify-between border-b-2 border-[#0B1B3D] pb-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></span>
            <h2 className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#0B1B3D]">
              Front-Page Lead &bull; Live Wire
            </h2>
          </div>
          <span className="text-[11px] text-gray-500 font-medium hidden sm:inline">
            Updated in Real-Time &bull; Verified Editorial Desk
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Lead Story (Left - 7 cols) */}
          {leadStory && (
            <article className="lg:col-span-7 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
              <Link to={`/blog-details/${leadStory._id}`} className="block">
                {/* 16:9 Featured Image */}
                <div className="relative aspect-16/9 w-full overflow-hidden bg-gray-100">
                  <img
                    src={leadStory.image}
                    alt={leadStory.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent"></div>
                  
                  {/* Category Pill */}
                  <span className="absolute top-4 left-4 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-md">
                    Lead Story &bull; {leadStory.category}
                  </span>

                  <span className="absolute bottom-4 left-4 text-xs text-white/90 font-medium flex items-center gap-1.5 drop-shadow-sm">
                    <Clock size={13} />
                    {leadStory.date}
                  </span>
                </div>

                {/* Lead Story Copy */}
                <div className="p-6 sm:p-7 space-y-3">
                  <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold font-serif-headline text-gray-950 group-hover:text-blue-700 transition-colors leading-[1.18] tracking-tight">
                    {leadStory.title}
                  </h3>

                  <p className="text-sm sm:text-base text-gray-600 line-clamp-3 leading-relaxed">
                    {cleanText(leadStory.description)}
                  </p>

                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-xs">
                        {leadStory.author.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">{leadStory.author}</span>
                      <span className="text-gray-300">&bull;</span>
                      <span className="text-gray-500">{leadStory.subTitle}</span>
                    </div>

                    <span className="text-blue-700 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Read Full Story &rarr;
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          )}

          {/* Supporting Headlines Wire (Right - 5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 divide-y divide-gray-100">
            <div className="pb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-600" />
                Top Developing Stories
              </h3>
              <Link to="/latest" className="text-xs font-semibold text-blue-700 hover:underline">
                View wire &rarr;
              </Link>
            </div>

            {supportingStories.map((story) => (
              <article key={story._id} className="py-4 first:pt-4 last:pb-0 group">
                <Link to={`/blog-details/${story._id}`} className="flex gap-4 items-start">
                  {/* Thumbnail */}
                  <div className="w-24 sm:w-28 h-20 sm:h-22 rounded-xl overflow-hidden shrink-0 relative bg-gray-100">
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                      {story.category}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                      {story.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-gray-400 pt-0.5">
                      <span>{story.author}</span>
                      <span>&bull;</span>
                      <span>{story.date}</span>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 2: EDITOR'S SPOTLIGHT & KEY DESKS
         ========================================================================= */}
      <section className="bg-slate-50 -mx-4 sm:-mx-[4vw] md:-mx-[6vw] px-4 sm:px-[4vw] md:px-[6vw] py-14 border-y border-gray-200">
        <div className="max-w-7xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-gray-200 pb-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-blue-700">
                Editorial Curations
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold font-serif-headline text-gray-900 tracking-tight mt-0.5">
                Editor's Choice & Across the Desks
              </h2>
            </div>

            <Link
              to="/blog"
              className="text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 group"
            >
              <span>Explore all desks</span>
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {spotlightStories.map((story) => (
              <BlogCard key={story._id} blog={story} />
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          SECTION 3: IN-DEPTH REPORTING & TRENDING / MOST READ SIDEBAR
         ========================================================================= */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: In-Depth Analytical Features (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b-2 border-gray-900 pb-3">
              <h2 className="text-xl sm:text-2xl font-bold font-serif-headline text-gray-950 tracking-tight">
                In-Depth Analysis & Regional Reports
              </h2>
              <span className="text-xs text-gray-500 font-medium">Longform &bull; 4 Min Reads</span>
            </div>

            <div className="space-y-6">
              {inDepthStories.map((story) => (
                <article 
                  key={story._id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow group flex flex-col sm:flex-row gap-5 items-start"
                >
                  {/* Image */}
                  <Link 
                    to={`/blog-details/${story._id}`} 
                    className="w-full sm:w-56 aspect-16/10 rounded-xl overflow-hidden shrink-0 bg-gray-100 block"
                  >
                    <img
                      src={story.image}
                      alt={story.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>

                  {/* Body */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-blue-700 font-bold uppercase tracking-wider text-[11px]">
                        {story.category}
                      </span>
                      <span className="text-gray-400 text-[11px]">{story.date}</span>
                    </div>

                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
                      <Link to={`/blog-details/${story._id}`}>
                        {story.title}
                      </Link>
                    </h3>

                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                      {cleanText(story.description)}
                    </p>

                    <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50">
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-gray-400" />
                        <span className="font-medium text-gray-700">{story.author}</span>
                      </div>
                      <Link
                        to={`/blog-details/${story._id}`}
                        className="text-blue-700 font-semibold hover:underline"
                      >
                        Read analysis &rarr;
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {/* View More Link */}
            <div className="text-center pt-4">
              <Link
                to="/blog"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-white border-2 border-[#0B1B3D] text-[#0B1B3D] font-bold rounded-xl hover:bg-[#0B1B3D] hover:text-white transition-all duration-200 text-sm shadow-xs hover:shadow-md cursor-pointer"
              >
                <span>Browse All 39+ Published Articles</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Right Column: Most Read Ranked 1 to 5 + Trust Box (4 cols) */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Most Read Box */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
                <h3 className="font-bold text-gray-950 text-sm uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-blue-700" />
                  Most Read on NewsFront
                </h3>
                <span className="text-[10px] font-semibold text-gray-400 uppercase">Today</span>
              </div>

              <div className="space-y-4">
                {trendingStories.map((story, idx) => (
                  <Link
                    key={story._id}
                    to={`/blog-details/${story._id}`}
                    className="flex gap-4 items-start group pb-4 border-b border-gray-50 last:border-0 last:pb-0"
                  >
                    {/* Rank Number */}
                    <span className="font-serif-headline text-3xl font-black text-slate-300 group-hover:text-blue-600 transition-colors w-8 text-center shrink-0 leading-none mt-0.5">
                      {`0${idx + 1}`}
                    </span>

                    {/* Story summary */}
                    <div className="flex-1 space-y-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 block">
                        {story.category}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                        {story.title}
                      </h4>
                      <p className="text-[11px] text-gray-400">{story.author}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Newsroom Editorial Standards Badge */}
            <div className="bg-gradient-to-br from-[#0B1B3D] to-[#122353] rounded-2xl p-6 text-white shadow-md space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-blue-300" />
              </div>
              <h4 className="font-bold text-base font-serif-headline">
                The NewsFront Trust Standard
              </h4>
              <p className="text-xs text-blue-100/80 leading-relaxed">
                Our correspondents adhere strictly to the GJA Code of Ethics and international verification benchmarks. We do not accept sponsored interference in editorial stories.
              </p>
              <div className="pt-2">
                <Link
                  to="/about"
                  className="text-xs font-semibold text-blue-300 hover:text-white underline inline-block"
                >
                  Read our Editorial Charter &rarr;
                </Link>
              </div>
            </div>

          </aside>

        </div>
      </section>

    </div>
  );
};

export default RecentArticles;