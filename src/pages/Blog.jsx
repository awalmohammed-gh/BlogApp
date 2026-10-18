import { useSiteSettings } from "../context/SiteSettingsContext";
import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useBlog } from "../context/BlogProvider";
import BlogCard from "../components/card/BlogCard";
import Advert from "../components/common/Advert";
import Newsletter from "../components/common/Newsletter";
import {
  Search,
  X,
  SlidersHorizontal,
  BookOpen,
  Filter,
  Grid3X3,
  List,
  Clock,
  User,
  Sparkles,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

// Thematic banner images representing each news beat

import { deskImage } from "../config/desks";

const CATEGORY_META = {
  All: {
    bannerImage: deskImage("latest"),
    kicker: "The Nsemra News Dispatch Archive",
    headline: "All Stories & In-Depth Reports",
    subtitle:
      "Access our complete catalogue of verified journalism, political analysis, economic dispatches, and cultural updates from Ghana and the international community.",
  },
  Sports: {
    bannerImage: deskImage("sports"),
    kicker: "Sports & Athletics Desk",
    headline: "Sports & Athletics Stories",
    subtitle:
      "Championship coverage, Ghanaian athletics, continental tournaments, football leagues, and international sports journalism.",
  },
  Technology: {
    bannerImage: deskImage("technology"),
    kicker: "Technology & Innovation Desk",
    headline: "Technology & Emerging Innovation",
    subtitle:
      "Authoritative analysis of African startups, AI breakthroughs, telecommunications infrastructure, and enterprise innovation.",
  },
  "Local News": {
    bannerImage: deskImage("local-news"),
    kicker: "Local News & National Affairs",
    headline: "Local News & Regional Coverage",
    subtitle:
      "Grassroots reporting and investigative coverage spanning Greater Accra, Ashanti, Western, and all 16 regions of Ghana.",
  },
  "Foreign News": {
    bannerImage: deskImage("foreign-news"),
    kicker: "Foreign News & Diplomacy",
    headline: "Foreign News & World Diplomacy",
    subtitle:
      "Critical reporting on African Union summits, ECOWAS developments, global geopolitics, and international accords.",
  },
  "E-commerce": {
    bannerImage: deskImage("e-commerce"),
    kicker: "E-Commerce & Digital Commerce",
    headline: "E-Commerce & Digital Retail Stories",
    subtitle:
      "Tracking online retail growth, cross-border payment platforms, logistics networks, and consumer spending patterns across Africa.",
  },
  Trading: {
    bannerImage: deskImage("trading"),
    kicker: "Trading & Capital Markets Desk",
    headline: "Trading, Equities & Capital Markets",
    subtitle:
      "Daily reporting on equity markets, cocoa and gold commodities, sovereign bond yields, and foreign exchange movements.",
  },
  Lifestyle: {
    bannerImage: deskImage("lifestyle"),
    kicker: "Lifestyle & Cultural Desk",
    headline: "Lifestyle, Culture & Urban Living",
    subtitle:
      "Curated features on contemporary African architecture, gastronomy, wellbeing, modern arts, and creative industries.",
  },
  Business: {
    bannerImage: deskImage("business"),
    kicker: "Business & Financial Markets Desk",
    headline: "Business & Corporate Dispatches",
    subtitle:
      "Market intelligence, corporate balance sheets, currency fluctuations, and consumer commerce trends shaping West African trade.",
  },
  Politics: {
    bannerImage: deskImage("politics"),
    kicker: "Politics & Governance Desk",
    headline: "Politics, Governance & Parliament",
    subtitle:
      "Authoritative analysis of parliamentary debates, policy formulation, electoral developments, and civic engagement.",
  },
  Entertainment: {
    bannerImage: deskImage("lifestyle"),
    kicker: "Arts & Entertainment Desk",
    headline: "Arts, Entertainment & Culture",
    subtitle:
      "Coverage of African music, film festivals, literary releases, and pop culture shaping the global African narrative.",
  },
  Health: {
    bannerImage: deskImage("lifestyle"),
    kicker: "Health & Wellbeing Desk",
    headline: "Public Health & Medical Science",
    subtitle:
      "In-depth reporting on healthcare delivery, medical advancements, wellness research, and public health initiatives.",
  },
};

const Blog = () => {
  const { settings } = useSiteSettings();
  const pageSize = settings?.publishing.articlesPerPage || 10;
  const { articles, refreshArticles } = useBlog();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (typeof refreshArticles === "function") {
      refreshArticles();
    }
  }, [refreshArticles]);

  // Read initial query from URL search param if present (e.g. from navbar search)
  const urlQ = searchParams.get("q") || "";
  const urlCategory = searchParams.get("category") || "All";

  const [searchQuery, setSearchQuery] = useState(urlQ);
  const [selectedCategory, setSelectedCategory] = useState(urlCategory);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [visiblePages, setVisiblePages] = useState(1);
  const visibleCount = visiblePages * pageSize;

  // Sync state when URL search params change during navigation
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (prevUrlQ !== urlQ) {
    setPrevUrlQ(urlQ);
    setSearchQuery(urlQ);
  }

  const [prevUrlCategory, setPrevUrlCategory] = useState(urlCategory);
  if (prevUrlCategory !== urlCategory) {
    setPrevUrlCategory(urlCategory);
    setSelectedCategory(urlCategory);
  }

  // Curated desks with dynamic inclusion of any real category in published articles
  const categories = useMemo(() => {
    const standardDesks = [
      "All",
      "Sports",
      "Technology",
      "Local News",
      "Foreign News",
      "Business",
      "E-commerce",
      "Trading",
      "Lifestyle",
      "Politics"
    ];
    const liveCats = new Set();
    (articles || []).forEach((a) => {
      if (a.isPublished && a.category && !standardDesks.includes(a.category)) {
        liveCats.add(a.category);
      }
    });
    return [...standardDesks, ...Array.from(liveCats)];
  }, [articles]);

  // Dynamic category counts from real article data
  const categoryCounts = useMemo(() => {
    const counts = {
      All: (articles || []).filter((a) => a.isPublished).length,
    };
    (articles || []).forEach((a) => {
      if (a.isPublished && a.category) {
        counts[a.category] = (counts[a.category] || 0) + 1;
      }
    });
    return counts;
  }, [articles]);

  // Clean HTML from description
  const cleanText = (html) => (html || "").replace(/<[^>]*>/g, "");

  // Calculate reading time
  const getReadingTime = (text) => {
    const words = cleanText(text).split(/\s+/).length;
    return `${Math.max(1, Math.ceil(words / 200))} min read`;
  };

  // Filter & Sort
  const filteredArticles = useMemo(() => {
    let list = (articles || []).filter((item) => item.isPublished);

    // Category filter
    if (selectedCategory !== "All") {
      list = list.filter(
        (item) => item.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title?.toLowerCase().includes(q) ||
          item.subTitle?.toLowerCase().includes(q) ||
          item.author?.toLowerCase().includes(q) ||
          item.category?.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (sortBy === "title") {
      list = [...list].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "readingTime") {
      list = [...list].sort((a, b) => {
        const wordsA = cleanText(a.description).split(/\s+/).length;
        const wordsB = cleanText(b.description).split(/\s+/).length;
        return wordsB - wordsA;
      });
    }

    return list;
  }, [articles, selectedCategory, searchQuery, sortBy]);

  // Reset pagination when filter/search/sort changes
  const [prevFilters, setPrevFilters] = useState({ searchQuery, selectedCategory, sortBy });
  if (
    prevFilters.searchQuery !== searchQuery ||
    prevFilters.selectedCategory !== selectedCategory ||
    prevFilters.sortBy !== sortBy
  ) {
    setPrevFilters({ searchQuery, selectedCategory, sortBy });
    setVisiblePages(1);
  }

  const visibleList = filteredArticles.slice(0, visibleCount);
  // Only a story an editor explicitly marked as featured is highlighted
  const featuredItem = selectedCategory === "All" && !searchQuery ? filteredArticles.find((a) => a.isFeatured) || null : null;
  const standardList = featuredItem ? visibleList.filter((a) => a._id !== featuredItem._id) : visibleList;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("All");
    setSortBy("newest");
    setVisiblePages(1);
    setSearchParams({});
  };

  const popularKeywords = ["Olympics", "Tech Hub", "Summit", "Accra", "Trade", "Champion"];
  const activeMeta = CATEGORY_META[selectedCategory] || CATEGORY_META.All;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      
      {/* =========================================================================
          HERO MASTHEAD BANNER (Cohesive with Landing Page Navy Palette & Dynamic Beat)
         ========================================================================= */}
      <section className="relative w-full pt-32 sm:pt-36 md:pt-40 pb-16 overflow-hidden">
        {/* Dynamic Category Banner Background Image with scale animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={activeMeta.bannerImage}
            alt={`${selectedCategory} Banner`}
            className="w-full h-full object-cover object-center scale-105 transition-all duration-700 ease-out"
          />
        </div>

        {/* Deep Editorial Overlays */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0B1B3D]/92 via-[#0B1B3D]/80 to-[#0B1B3D]/95 pointer-events-none"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-[#0B1B3D]/30 to-[#07132B]/85 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center text-white z-10">
          {/* Eyebrow Kicker */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md mb-4 text-xs font-semibold uppercase tracking-widest text-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>{activeMeta.kicker}</span>
          </div>

          {/* Master Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold font-serif-headline tracking-tight text-white mb-4">
            {activeMeta.headline}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed font-light mb-8">
            {activeMeta.subtitle}
          </p>

          {/* Editorial Archive Metrics Bar */}
          <div className="max-w-4xl mx-auto bg-[#07132B]/80 border border-blue-900/60 rounded-2xl p-4 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-blue-900/40">
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-white block">
                {categoryCounts[selectedCategory] ?? categoryCounts.All ?? filteredArticles.length}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                {selectedCategory === "All" ? "Published Stories" : `${selectedCategory} Stories`}
              </span>
            </div>
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-blue-400 block">
                {selectedCategory === "All" ? "7 Desks" : selectedCategory}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                {selectedCategory === "All" ? "Active Sections" : "Active Beat"}
              </span>
            </div>
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-white block">5</span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                Staff Correspondents
              </span>
            </div>
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-emerald-400 block flex items-center justify-center gap-1">
                <ShieldCheck size={20} />
                100%
              </span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                Verified Reports
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE EDITORIAL CONTROL BAR (Floating Sticky Search & Desk Tabs)
         ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 relative z-30">
        <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-100 space-y-4">
          
          {/* Top Row: Search Input + Sort Dropdown + View Switcher */}
          <div className="flex flex-col md:flex-row items-center gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search headlines, correspondents, keywords, or topics..."
                className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 text-sm text-gray-900 bg-gray-50/50 outline-none focus:bg-white focus:ring-2 focus:ring-[#0B1B3D] focus:border-transparent transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                  title="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Controls Group: Sort + View Mode */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0 justify-between md:justify-end">
              {/* Sort Select */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700">
                <SlidersHorizontal size={14} className="text-gray-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-transparent outline-none cursor-pointer pr-2"
                >
                  <option value="newest">Featured & Recent</option>
                  <option value="title">Alphabetical (A - Z)</option>
                  <option value="readingTime">In-Depth / Longform</option>
                </select>
              </div>

              {/* View Switcher (Grid vs List) */}
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden p-0.5 bg-gray-50">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-[#0B1B3D] text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-colors cursor-pointer ${
                    viewMode === "list"
                      ? "bg-[#0B1B3D] text-white shadow-xs"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                  title="Editorial list view"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Desk Filter Tabs with Counts */}
          <div className="flex items-center gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar border-t border-gray-100">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-2 shrink-0 hidden sm:inline">
              Desks:
            </span>
            {categories.map((cat) => {
              const count = categoryCounts[cat] || 0;
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] font-medium whitespace-nowrap transition-all duration-150 flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? "bg-[#0B1B3D] text-white font-semibold shadow-xs"
                      : "bg-gray-100/90 text-gray-700 hover:bg-gray-200/80 hover:text-[#0B1B3D]"
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Keyword Suggestions if typing */}
          {searchQuery && (
            <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
              <span>Quick tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {popularKeywords.map((kw) => (
                  <button
                    key={kw}
                    onClick={() => setSearchQuery(kw)}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                  >
                    #{kw}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MAIN STORIES REPOSITORY & EDITORIAL CONTENT
         ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        
        {/* Results Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-blue-700 rounded-full"></span>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-headline text-gray-950">
                {selectedCategory === "All" ? "All Editorial Stories" : `${selectedCategory} Desk`}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Showing <span className="font-bold text-gray-900">{filteredArticles.length}</span> verified stories
              {searchQuery && <span> &bull; Matching "{searchQuery}"</span>}
              {selectedCategory !== "All" && <span> &bull; Section: {selectedCategory}</span>}
            </p>
          </div>

          {/* Reset button if filter is active */}
          {(selectedCategory !== "All" || searchQuery) && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
            >
              <X size={13} />
              Reset all filters
            </button>
          )}
        </div>

        {/* =======================================================================
            EMPTY DATABASE / NO PUBLISHED ARTICLES STATE
           ======================================================================= */}
        {articles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-gray-200 shadow-sm max-w-xl mx-auto my-12">
            <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-950 mb-2 font-serif-headline">
              No Published Articles Yet
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Our newsroom is currently preparing stories. Check back soon for the latest investigative dispatches, political analysis, and breaking reports.
            </p>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 sm:p-16 text-center border border-gray-200 shadow-sm max-w-xl mx-auto my-12">
            <div className="w-16 h-16 bg-blue-50 text-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-950 mb-2 font-serif-headline">
              No matching stories found
            </h3>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              We couldn't locate any published reports matching "{searchQuery}" in the {selectedCategory} desk. Try broad search terms or reset your filters.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={resetFilters}
                className="px-6 py-2.5 bg-[#0B1B3D] text-white rounded-xl text-xs font-semibold hover:bg-blue-900 transition-colors cursor-pointer shadow-sm"
              >
                Clear Filters & Show All
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* FEATURED LEAD SPOTLIGHT (Only on initial "All" view with no search) */}
            {featuredItem && (
              <section className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-md hover:shadow-xl transition-all duration-300 group">
                <Link to={`/blog-details/${featuredItem._id}`} className="grid grid-cols-1 lg:grid-cols-12 gap-0 items-center">
                  <div className="lg:col-span-7 aspect-16/10 lg:aspect-auto lg:h-full relative overflow-hidden bg-gray-100">
                    <img
                      src={featuredItem.image}
                      alt={featuredItem.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-md">
                      Featured In Archive &bull; {featuredItem.category}
                    </div>
                  </div>

                  <div className="lg:col-span-5 p-6 sm:p-8 space-y-3">
                    <span className="text-xs text-blue-700 font-bold uppercase tracking-wider">
                      Lead Dispatch
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-bold font-serif-headline text-gray-950 group-hover:text-blue-700 transition-colors leading-tight">
                      {featuredItem.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 line-clamp-3 leading-relaxed">
                      {cleanText(featuredItem.description)}
                    </p>

                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-900 font-bold flex items-center justify-center text-[10px]">
                          {featuredItem.author.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-800">{featuredItem.author}</span>
                      </div>
                      <span className="text-blue-700 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Read Story &rarr;
                      </span>
                    </div>
                  </div>
                </Link>
              </section>
            )}

            {/* ===================================================================
                GRID VIEW
               =================================================================== */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {standardList.map((story) => (
                  <BlogCard key={story._id} blog={story} />
                ))}
              </div>
            ) : (
              /* ===================================================================
                  EDITORIAL LIST VIEW (Horizontal Rows like FT / Bloomberg)
                 =================================================================== */
              <div className="space-y-4">
                {standardList.map((story) => (
                  <article
                    key={story._id}
                    className="bg-white rounded-2xl p-5 border border-gray-200 shadow-xs hover:shadow-md transition-all duration-200 group"
                  >
                    <Link
                      to={`/blog-details/${story._id}`}
                      className="flex flex-col sm:flex-row gap-5 items-start"
                    >
                      {/* Image Thumbnail */}
                      <div className="w-full sm:w-60 aspect-16/10 rounded-xl overflow-hidden shrink-0 bg-gray-100 relative">
                        <img
                          src={story.image}
                          alt={story.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2.5 left-2.5 bg-[#0B1B3D]/90 text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-xs">
                          {story.category}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span className="text-blue-700 font-semibold uppercase tracking-wider text-[11px]">
                            {story.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {getReadingTime(story.description)}
                          </span>
                        </div>

                        <h3 className="text-lg sm:text-xl font-bold font-serif-headline text-gray-900 group-hover:text-blue-700 transition-colors leading-snug">
                          {story.title}
                        </h3>

                        <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {cleanText(story.description)}
                        </p>

                        <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50">
                          <div className="flex items-center gap-2">
                            <User size={13} className="text-gray-400" />
                            <span className="font-medium text-gray-800">{story.author}</span>
                            <span>&bull;</span>
                            <span>{story.date}</span>
                          </div>

                          <span className="text-blue-700 font-semibold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                            Read article &rarr;
                          </span>
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}

            {/* ===================================================================
                PAGINATION / LOAD MORE
               =================================================================== */}
            {visibleCount < filteredArticles.length && (
              <div className="pt-8 text-center space-y-3">
                <button
                  onClick={() => setVisiblePages((prev) => prev + 1)}
                  className="px-8 py-3.5 bg-white border-2 border-[#0B1B3D] text-[#0B1B3D] font-bold rounded-xl hover:bg-[#0B1B3D] hover:text-white transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer text-sm"
                >
                  Load More Stories ({filteredArticles.length - visibleCount} remaining)
                </button>
                <p className="text-xs text-gray-400">
                  Showing {visibleCount} of {filteredArticles.length} stories in this view
                </p>
              </div>
            )}
          </div>
        )}

        {/* Commercial Partner Placement */}
        <div className="mt-16">
          <Advert placement="all_stories_banner" />
        </div>

        {/* The Nsemra News Daily Briefing Newsletter Subscription */}
        <div className="mt-12">
          <Newsletter />
        </div>

      </main>
    </div>
  );
};

export default Blog;
