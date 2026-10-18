import { useMemo, useState, useEffect } from "react";
import { useBlog } from "../context/BlogProvider";
import { NavLink, useParams, Link } from "react-router-dom";
import BlogCard from "../components/card/BlogCard";
import Advert from "../components/common/Advert";
import Newsletter from "../components/common/Newsletter";
import {
  TrendingUp,
  Landmark,
  Briefcase,
  Cpu,
  Trophy,
  Film,
  Heart,
  Globe,
  ShoppingBag,
  LineChart,
  Coffee,
  Newspaper,
  Radio,
  ChevronRight,
  Sparkles,
  Search,
  X,
  Grid3X3,
  List,
  SlidersHorizontal,
  Clock,
  User,
  ShieldCheck,
  ArrowRight,
  Mail,
  MapPin,
  Building2,
} from "lucide-react";

// Representative thematic banner images for each desk
import blog1 from "../assets/blog1.jpg"; // Sports (Championship Athletics / Football)
import blog7 from "../assets/blog7.jpg"; // E-commerce (Fashion & Retail Commerce)
import blog13 from "../assets/blog13.jpg"; // Business (Stock Exchange & Markets Floor)
import blog18 from "../assets/blog18.png"; // Trading (Algorithmic Charts & Financial Data)
import blog19 from "../assets/blog19.jpeg"; // Lifestyle (Wellness Retreat & Architecture)
import blog20 from "../assets/blog20.jpg"; // Entertainment (Creative Arts & Fashion Week)
import blog25 from "../assets/blog25.jpg"; // Health (Medical Science & AI Diagnostics)
import blog28 from "../assets/blog28.jpg"; // Technology (5G Digital City & High-Tech Infrastructure)
import blog30 from "../assets/blog30.jpg"; // Local News (Ghana Civic & Community Engagement)
import blog34 from "../assets/blog34.jpg"; // Foreign News / World (Global Geneva Summit of Leaders)
import blog35 from "../assets/blog35.jpg"; // Politics (High-Level Diplomatic Accord & Delegation)

// Editorial configuration for all newsroom desks
const DESK_CONFIG = {
  sports: {
    name: "Sports",
    fullName: "Sports & Athletics Desk",
    kicker: "Athletic Reporting & Competitions",
    description:
      "Comprehensive reporting on Ghanaian athletics, continental tournaments, football leagues, and international championships.",
    icon: Trophy,
    bannerImage: blog1,
    accentBorder: "border-amber-500",
    badgeBg: "bg-amber-500/20 text-amber-200 border-amber-400/30",
    leadCorrespondent: "Mohammed Awal",
    correspondentRole: "Chief Sports Correspondent",
    topics: ["Olympics", "Premier League", "Athletics", "Championship", "Black Stars"],
    bureauLocation: "Accra Sports Stadium Press Center",
  },
  technology: {
    name: "Technology",
    fullName: "Technology & Innovation Desk",
    kicker: "Digital Innovation & Emerging Tech",
    description:
      "Authoritative analysis of African startups, AI breakthroughs, telecommunications infrastructure, and enterprise innovation.",
    icon: Cpu,
    bannerImage: blog28,
    accentBorder: "border-blue-500",
    badgeBg: "bg-blue-500/20 text-blue-200 border-blue-400/30",
    leadCorrespondent: "Amina Osei",
    correspondentRole: "Senior Technology Editor",
    topics: ["Accra Tech Hub", "Artificial Intelligence", "Fintech", "Telecom", "Startups"],
    bureauLocation: "Airport City Innovation Hub, Accra",
  },
  "local-news": {
    name: "Local News",
    fullName: "Local News & National Affairs",
    kicker: "Accra Bureau & Regional Dispatches",
    description:
      "Grassroots reporting and investigative coverage spanning Greater Accra, Ashanti, Western, and all 16 regions of Ghana.",
    icon: Newspaper,
    bannerImage: blog30,
    accentBorder: "border-emerald-500",
    badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    leadCorrespondent: "Kwame Mensah",
    correspondentRole: "National News Bureau Chief",
    topics: ["Accra Municipal", "Kumasi Dispatches", "Infrastructure", "Civic Affairs", "Regional Governance"],
    bureauLocation: "NewsFront Accra Central Bureau",
  },
  "foreign-news": {
    name: "Foreign News",
    fullName: "Foreign News & Diplomacy",
    kicker: "Global Affairs & Multilateral Diplomacy",
    description:
      "Critical reporting on African Union summits, ECOWAS developments, global geopolitics, and international accords.",
    icon: Globe,
    bannerImage: blog34,
    accentBorder: "border-indigo-500",
    badgeBg: "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
    leadCorrespondent: "Kofi Boateng",
    correspondentRole: "Diplomatic & Global Affairs Editor",
    topics: ["African Union", "ECOWAS", "United Nations", "Trade Pacts", "Global Summits"],
    bureauLocation: "International Desk, Accra",
  },
  world: {
    name: "World",
    fullName: "World & International Desk",
    kicker: "Global Affairs & Geopolitics",
    description:
      "Critical perspectives on geopolitical events, multilateral summits, climate treaties, and transnational developments.",
    icon: Globe,
    bannerImage: blog34,
    accentBorder: "border-indigo-500",
    badgeBg: "bg-indigo-500/20 text-indigo-200 border-indigo-400/30",
    leadCorrespondent: "Kofi Boateng",
    correspondentRole: "Diplomatic & Global Affairs Editor",
    topics: ["Diplomacy", "Global Economy", "International Pacts", "Geopolitics", "Summit"],
    bureauLocation: "International Desk, Accra",
  },
  business: {
    name: "Business",
    fullName: "Business & Financial Markets Desk",
    kicker: "Macroeconomics, Enterprise & Markets",
    description:
      "Market intelligence, corporate balance sheets, currency fluctuations, and consumer commerce trends shaping West African trade.",
    icon: Briefcase,
    bannerImage: blog13,
    accentBorder: "border-emerald-600",
    badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    leadCorrespondent: "Akosua Addo",
    correspondentRole: "Chief Business & Economics Editor",
    topics: ["Ghana Cedi", "Inflation", "Banking", "Trade Agreements", "Startups"],
    bureauLocation: "Financial District Bureau, Accra",
  },
  "e-commerce": {
    name: "E-commerce",
    fullName: "E-Commerce & Digital Retail Desk",
    kicker: "Digital Commerce & Consumer Trends",
    description:
      "Tracking online retail growth, cross-border payment platforms, logistics networks, and consumer spending patterns across Africa.",
    icon: ShoppingBag,
    bannerImage: blog7,
    accentBorder: "border-purple-500",
    badgeBg: "bg-purple-500/20 text-purple-200 border-purple-400/30",
    leadCorrespondent: "Akosua Addo",
    correspondentRole: "Digital Commerce Analyst",
    topics: ["Digital Payments", "Retail Logistics", "Online Marketplaces", "Mobile Money", "Consumer Goods"],
    bureauLocation: "NewsFront Digital Media Lab, Accra",
  },
  trading: {
    name: "Trading",
    fullName: "Trading & Capital Markets Desk",
    kicker: "Capital Markets, Commodities & FX",
    description:
      "Daily reporting on equity markets, cocoa and gold commodities, sovereign bond yields, and foreign exchange movements.",
    icon: LineChart,
    bannerImage: blog18,
    accentBorder: "border-teal-500",
    badgeBg: "bg-teal-500/20 text-teal-200 border-teal-400/30",
    leadCorrespondent: "Kwabena Yeboah",
    correspondentRole: "Capital Markets Correspondent",
    topics: ["GSE Composite", "Gold & Cocoa", "Treasury Bills", "FX Reserves", "Commodities"],
    bureauLocation: "Accra Stock Exchange Press Gallery",
  },
  lifestyle: {
    name: "Lifestyle",
    fullName: "Lifestyle & Cultural Desk",
    kicker: "Culture, Wellness & Urban Living",
    description:
      "Curated features on contemporary African architecture, gastronomy, wellbeing, modern arts, and creative industries.",
    icon: Coffee,
    bannerImage: blog19,
    accentBorder: "border-rose-500",
    badgeBg: "bg-rose-500/20 text-rose-200 border-rose-400/30",
    leadCorrespondent: "Efua Mensah",
    correspondentRole: "Lifestyle & Culture Editor",
    topics: ["Culinary Arts", "Urban Design", "Wellness", "Creative Economy", "Travel"],
    bureauLocation: "Arts & Culture Bureau, Osu, Accra",
  },
  politics: {
    name: "Politics",
    fullName: "Politics & Governance Desk",
    kicker: "Governance, Policy & Parliament",
    description:
      "Authoritative analysis of parliamentary debates, policy formulation, electoral developments, and civic engagement.",
    icon: Landmark,
    bannerImage: blog35,
    accentBorder: "border-red-500",
    badgeBg: "bg-red-500/20 text-red-200 border-red-400/30",
    leadCorrespondent: "Kwame Mensah",
    correspondentRole: "Political Editor",
    topics: ["Parliament", "Policy Reform", "Elections", "Civic Rights", "Governance"],
    bureauLocation: "Parliament House Press Gallery, Accra",
  },
  entertainment: {
    name: "Entertainment",
    fullName: "Arts & Entertainment Desk",
    kicker: "Creative Arts, Music & Cinema",
    description:
      "Coverage of African music, film festivals, literary releases, and pop culture shaping the global African narrative.",
    icon: Film,
    bannerImage: blog20,
    accentBorder: "border-fuchsia-500",
    badgeBg: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-400/30",
    leadCorrespondent: "Efua Mensah",
    correspondentRole: "Entertainment Editor",
    topics: ["Music Industry", "Cinema", "Fashion Week", "Literary Arts", "Concerts"],
    bureauLocation: "Arts & Culture Desk, Accra",
  },
  health: {
    name: "Health",
    fullName: "Health & Wellbeing Desk",
    kicker: "Public Health & Medical Science",
    description:
      "In-depth reporting on healthcare delivery, medical advancements, wellness research, and public health initiatives.",
    icon: Heart,
    bannerImage: blog25,
    accentBorder: "border-emerald-500",
    badgeBg: "bg-emerald-500/20 text-emerald-200 border-emerald-400/30",
    leadCorrespondent: "Amina Osei",
    correspondentRole: "Science & Health Correspondent",
    topics: ["Public Health", "Medical Innovations", "Mental Wellness", "Nutrition", "Hospitals"],
    bureauLocation: "Science & Medical Bureau, Accra",
  },
  latest: {
    name: "Latest",
    fullName: "Latest Dispatches & Continuous Wire",
    kicker: "Real-Time News Wire",
    description:
      "Immediate developments, breaking bulletins, and continuous updates filed by NewsFront correspondents across the continent.",
    icon: TrendingUp,
    bannerImage: "/categoryBg.jpg",
    accentBorder: "border-blue-600",
    badgeBg: "bg-blue-500/20 text-blue-200 border-blue-400/30",
    leadCorrespondent: "NewsFront Bureau Team",
    correspondentRole: "Continuous Wire Editors",
    topics: ["Breaking Wire", "Top Headlines", "Daily Brief", "Live Updates", "Special Reports"],
    bureauLocation: "NewsFront 24/7 Editorial Newsroom",
  },
};

// All registered navigation desks
const ALL_DESKS = [
  { name: "Sports", path: "/sports", icon: Trophy, slug: "sports" },
  { name: "Technology", path: "/technology", icon: Cpu, slug: "technology" },
  { name: "Local News", path: "/local-news", icon: Newspaper, slug: "local-news" },
  { name: "Foreign News", path: "/foreign-news", icon: Radio, slug: "foreign-news" },
  { name: "Business", path: "/business", icon: Briefcase, slug: "business" },
  { name: "E-commerce", path: "/e-commerce", icon: ShoppingBag, slug: "e-commerce" },
  { name: "Trading", path: "/trading", icon: LineChart, slug: "trading" },
  { name: "Lifestyle", path: "/lifestyle", icon: Coffee, slug: "lifestyle" },
  { name: "Latest", path: "/latest", icon: TrendingUp, slug: "latest" },
  { name: "Politics", path: "/politics", icon: Landmark, slug: "politics" },
  { name: "World", path: "/world", icon: Globe, slug: "world" },
];

const formatCategory = (value) => value?.toLowerCase().replace(/\s+/g, "-");
const cleanText = (html) => (html || "").replace(/<[^>]*>/g, "");
const getReadingTime = (text) => {
  const words = cleanText(text).split(/\s+/).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
};

const getDeskConfig = (category) => {
  const raw = (category || "").toLowerCase().trim();
  if (DESK_CONFIG[raw]) {
    return DESK_CONFIG[raw];
  }
  const formattedName = (category || "News")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    name: formattedName,
    fullName: `${formattedName} Desk`,
    kicker: `${formattedName.toUpperCase()} REPORTING & INSIGHTS`,
    description: `Comprehensive journalism, exclusive reports, and in-depth analysis from the NewsFront ${formattedName} bureau.`,
    icon: Sparkles,
    accentBorder: "border-blue-500",
    badgeBg: "bg-blue-500/20 text-blue-200 border-blue-400/30",
    leadCorrespondent: "Editorial Desk Staff",
    correspondentRole: "Special Correspondents",
    topics: [formattedName, "Analysis", "Special Dispatch", "NewsFront"],
    bureauLocation: "NewsFront Central Bureau, Accra",
  };
};

const CategoryPage = () => {
  const { category } = useParams();
  const { articles, refreshArticles } = useBlog();

  useEffect(() => {
    if (typeof refreshArticles === "function") {
      refreshArticles();
    }
  }, [refreshArticles]);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [visibleCount, setVisibleCount] = useState(6);

  // Sync state when category changes in URL
  const [prevCategory, setPrevCategory] = useState(category);
  if (category !== prevCategory) {
    setPrevCategory(category);
    setSearchQuery("");
    setSortBy("newest");
    setVisibleCount(6);
  }

  // Reset pagination when local search or sort changes
  const [prevFilters, setPrevFilters] = useState({ searchQuery, sortBy });
  if (prevFilters.searchQuery !== searchQuery || prevFilters.sortBy !== sortBy) {
    setPrevFilters({ searchQuery, sortBy });
    setVisibleCount(6);
  }

  const desk = getDeskConfig(category);
  const DeskIcon = desk.icon || Sparkles;

  // Real-time article counts per desk
  const deskCounts = useMemo(() => {
    const counts = {};
    ALL_DESKS.forEach((d) => {
      if (d.slug === "latest") {
        counts[d.slug] = (articles || []).filter((b) => b.isPublished).length;
      } else if (d.slug === "world") {
        counts[d.slug] = (articles || []).filter(
          (b) => formatCategory(b.category) === "foreign-news" && b.isPublished
        ).length;
      } else if (d.slug === "business") {
        counts[d.slug] = (articles || []).filter(
          (b) =>
            (formatCategory(b.category) === "trading" ||
              formatCategory(b.category) === "e-commerce") &&
            b.isPublished
        ).length;
      } else {
        counts[d.slug] = (articles || []).filter(
          (b) => formatCategory(b.category) === d.slug && b.isPublished
        ).length;
      }
    });
    return counts;
  }, [articles]);

  // Filtered stories for this specific desk + in-desk search + sorting
  const filteredBlogs = useMemo(() => {
    const rawCategory = (category || "").toLowerCase().trim();
    let list = [];

    // Filter by Desk / Category
    if (!rawCategory || rawCategory === "latest" || rawCategory === "all") {
      list = (articles || []).filter((blog) => blog.isPublished);
    } else if (rawCategory === "world") {
      list = (articles || []).filter(
        (blog) => formatCategory(blog?.category) === "foreign-news" && blog.isPublished
      );
    } else if (rawCategory === "business") {
      list = (articles || []).filter(
        (blog) =>
          (formatCategory(blog?.category) === "trading" ||
            formatCategory(blog?.category) === "e-commerce") &&
          blog.isPublished
      );
    } else {
      list = (articles || []).filter(
        (blog) => formatCategory(blog?.category) === rawCategory && blog.isPublished
      );
    }

    // In-desk search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (blog) =>
          blog.title?.toLowerCase().includes(q) ||
          blog.subTitle?.toLowerCase().includes(q) ||
          blog.author?.toLowerCase().includes(q) ||
          blog.description?.toLowerCase().includes(q)
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
  }, [articles, category, searchQuery, sortBy]);

  const visibleBlogs = filteredBlogs.slice(0, visibleCount);

  const leadStory =
    filteredBlogs.length > 0 && !searchQuery.trim() ? filteredBlogs[0] : null;
  const standardList = leadStory ? visibleBlogs.slice(1) : visibleBlogs;

  const currentDeskSlug = (category || "").toLowerCase().trim();
  const deskBannerImage = desk.bannerImage || leadStory?.image || "/categoryBg.jpg";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* =========================================================================
          DYNAMIC EDITORIAL HERO MASTHEAD (Desk-Themed Banner Imagery + Navy Overlays)
         ========================================================================= */}
      <section className="relative w-full pt-32 sm:pt-36 md:pt-40 pb-16 overflow-hidden">
        {/* Dynamic Desk Banner Background Image with gentle scale & high visual impact */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={deskBannerImage}
            alt={`${desk.name} Banner`}
            className="w-full h-full object-cover object-center scale-105 transition-transform duration-700 ease-out"
          />
        </div>

        {/* Sophisticated Editorial Overlays: preserves dark navy palette & brand identity while letting the theme image clearly shine through */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0B1B3D]/92 via-[#0B1B3D]/80 to-[#0B1B3D]/95 pointer-events-none"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-[#0B1B3D]/30 to-[#07132B]/85 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center text-white z-10">
          {/* Breadcrumb pills */}
          <nav aria-label="Breadcrumb" className="mb-4 flex items-center justify-center gap-2 text-xs text-blue-200/80">
            <Link to="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <ChevronRight size={13} className="text-blue-400/60" />
            <Link to="/blog" className="hover:text-white transition-colors">
              All Stories
            </Link>
            <ChevronRight size={13} className="text-blue-400/60" />
            <span className="text-blue-300 font-medium capitalize">{desk.name} Desk</span>
          </nav>

          {/* Dynamic Eyebrow Kicker */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full backdrop-blur-md mb-4 text-xs font-semibold uppercase tracking-widest border ${desk.badgeBg}`}
          >
            <DeskIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{desk.kicker}</span>
          </div>

          {/* Master Headline */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold font-serif-headline tracking-tight text-white mb-4">
            {desk.fullName}
          </h1>

          {/* Dynamic Editorial Mission Description */}
          <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed font-light mb-8">
            {desk.description}
          </p>

          {/* Dynamic Desk Intelligence Stats Bar */}
          <div className="max-w-4xl mx-auto bg-[#07132B]/80 border border-blue-900/60 rounded-2xl p-4 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-blue-900/40">
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-white block">
                {deskCounts[currentDeskSlug] || filteredBlogs.length}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                Published Reports
              </span>
            </div>
            <div className="pt-2 sm:pt-0">
              <span className="text-base sm:text-lg font-bold text-blue-300 block truncate">
                {desk.leadCorrespondent}
              </span>
              <span className="text-[11px] uppercase tracking-wider text-blue-400 font-medium">
                {desk.correspondentRole}
              </span>
            </div>
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-emerald-400 block flex items-center justify-center gap-1">
                <ShieldCheck size={20} />
                100%
              </span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                Verified Newsroom
              </span>
            </div>
            <div className="pt-2 sm:pt-0">
              <span className="text-2xl font-black text-white block">Daily</span>
              <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">
                Active Desk Wire
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE DESK CONTROL BAR (Floating Sticky Search & Quick Desks)
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
                placeholder={`Search headlines or topics in ${desk.name}...`}
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

            {/* Sort & View Controls */}
            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              {/* Sort Dropdown */}
              <div className="relative flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-gray-400 hidden sm:block" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-[#0B1B3D] cursor-pointer"
                >
                  <option value="newest">Featured & Recent</option>
                  <option value="title">Alphabetical (A–Z)</option>
                  <option value="readingTime">In-Depth (Longest Read)</option>
                </select>
              </div>

              {/* View Switcher: Grid vs Editorial List */}
              <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-white text-[#0B1B3D] shadow-xs font-semibold"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="Grid View"
                >
                  <Grid3X3 size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-white text-[#0B1B3D] shadow-xs font-semibold"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                  title="Editorial List View"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Desk Navigation Tabs (Horizontal Scrollable) */}
          <div className="pt-2 border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 shrink-0 mr-1">
              Desks:
            </span>
            {ALL_DESKS.map((d) => {
              const isActive = currentDeskSlug === d.slug;
              const count = deskCounts[d.slug] ?? 0;
              const Icon = d.icon;
              return (
                <NavLink
                  key={d.slug}
                  to={d.path}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                    isActive
                      ? "bg-[#0B1B3D] text-white shadow-sm font-semibold"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900"
                  }`}
                >
                  <Icon size={12} className={isActive ? "text-blue-300" : "text-gray-500"} />
                  <span>{d.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? "bg-blue-600 text-white" : "bg-gray-200/80 text-gray-600"
                    }`}
                  >
                    {count}
                  </span>
                </NavLink>
              );
            })}
          </div>

          {/* Desk Topic Pills */}
          {desk.topics && desk.topics.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 pt-1">
              <span className="font-medium text-gray-400">Beat Topics:</span>
              {desk.topics.map((tag, i) => (
                <button
                  key={i}
                  onClick={() => setSearchQuery(tag)}
                  className={`px-2.5 py-0.5 rounded-md border text-xs transition-colors cursor-pointer ${
                    searchQuery === tag
                      ? "bg-blue-50 text-blue-700 border-blue-200 font-medium"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MAIN EDITORIAL CONTENT & SIDEBAR COMPANION
         ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* Main Article Stream */}
          <main className="flex-1 min-w-0">
            {/* Stream Header & Active Filter State */}
            <div className="mb-6 flex items-center justify-between flex-wrap gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold font-serif-headline text-gray-900 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0"></span>
                  {desk.name} Dispatches
                </h2>
                <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
                  Showing <span className="font-semibold text-gray-800">{filteredBlogs.length}</span> verified stories
                  {searchQuery && (
                    <span>
                      {" "}
                      • Matching <span className="text-blue-600 font-semibold">"{searchQuery}"</span>
                    </span>
                  )}
                </p>
              </div>

              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <X size={14} />
                  Reset Desk Filter
                </button>
              )}
            </div>

            {/* Empty State */}
            {filteredBlogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-6 bg-white rounded-2xl shadow-xs border border-gray-100 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 text-[#0B1B3D]">
                  <DeskIcon size={32} />
                </div>
                <h3 className="text-xl font-bold font-serif-headline text-gray-900 mb-2">
                  No Dispatches Found in {desk.name}
                </h3>
                <p className="text-gray-500 text-sm max-w-md mb-6 leading-relaxed">
                  {searchQuery
                    ? `No stories matched "${searchQuery}" in this section. Try clearing your search or browsing our other active news desks.`
                    : "Our newsroom is continuously filing new investigative stories. Check back soon or explore another active desk below."}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="px-4 py-2 bg-[#0B1B3D] text-white rounded-xl text-xs font-semibold hover:bg-blue-900 transition-colors cursor-pointer"
                    >
                      Clear Search
                    </button>
                  )}
                  <Link
                    to="/blog"
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    View All Stories
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* =============================================================
                    LEAD DESK SPOTLIGHT (Featured Story in this Section)
                   ============================================================= */}
                {leadStory && (
                  <article className="bg-white rounded-2xl border border-gray-200/80 shadow-md overflow-hidden hover:shadow-xl transition-all duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-0">
                      {/* Visual 16:9 Column */}
                      <div className="md:col-span-7 relative overflow-hidden bg-gray-900 group min-h-[260px] sm:min-h-[320px]">
                        <img
                          src={leadStory.image}
                          alt={leadStory.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>
                        <div className="absolute top-4 left-4">
                          <span className="bg-red-600 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-md flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                            Lead {desk.name} Dispatch
                          </span>
                        </div>
                      </div>

                      {/* Editorial Copy Column */}
                      <div className="md:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-xs text-blue-600 font-semibold tracking-wide uppercase">
                            <span>{leadStory.category || desk.name}</span>
                            <span>•</span>
                            <span className="text-gray-400 font-normal">
                              {getReadingTime(leadStory.description)}
                            </span>
                          </div>

                          <Link to={`/blog-details/${leadStory._id}`}>
                            <h3 className="text-2xl sm:text-3xl font-bold font-serif-headline text-gray-900 hover:text-blue-700 transition-colors leading-tight">
                              {leadStory.title}
                            </h3>
                          </Link>

                          <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                            {cleanText(leadStory.description)}
                          </p>
                        </div>

                        <div className="pt-6 mt-4 border-t border-gray-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#0B1B3D] flex items-center justify-center font-bold text-xs">
                              {leadStory.author?.[0] || "N"}
                            </div>
                            <div className="text-xs">
                              <span className="font-semibold text-gray-900 block">
                                {leadStory.author}
                              </span>
                              <span className="text-gray-400">{leadStory.date}</span>
                            </div>
                          </div>

                          <Link
                            to={`/blog-details/${leadStory._id}`}
                            className="text-xs font-bold text-[#0B1B3D] hover:text-blue-700 flex items-center gap-1 transition-colors"
                          >
                            Read Report
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                )}

                {/* =============================================================
                    ARTICLE STREAM (Grid vs Editorial List View)
                   ============================================================= */}
                {standardList.length > 0 && (
                  <>
                    {viewMode === "grid" ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {standardList.map((blog) => (
                          <BlogCard key={blog._id} blog={blog} />
                        ))}
                      </div>
                    ) : (
                      /* Editorial List Mode */
                      <div className="space-y-4">
                        {standardList.map((blog) => (
                          <article
                            key={blog._id}
                            className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row gap-5 items-start"
                          >
                            <Link
                              to={`/blog-details/${blog._id}`}
                              className="w-full sm:w-48 sm:h-32 shrink-0 rounded-xl overflow-hidden relative group bg-gray-100 block"
                            >
                              <img
                                src={blog.image}
                                alt={blog.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              <span className="absolute top-2 left-2 bg-[#0B1B3D]/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-xs">
                                {blog.category}
                              </span>
                            </Link>

                            <div className="flex-1 flex flex-col justify-between h-full space-y-2 w-full">
                              <div>
                                <div className="flex items-center gap-2 text-[11px] text-gray-400 mb-1">
                                  <span className="text-blue-600 font-semibold uppercase">
                                    {blog.category}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Clock size={12} />
                                    {getReadingTime(blog.description)}
                                  </span>
                                </div>

                                <Link to={`/blog-details/${blog._id}`}>
                                  <h4 className="text-base sm:text-lg font-bold font-serif-headline text-gray-900 hover:text-blue-700 transition-colors line-clamp-2">
                                    {blog.title}
                                  </h4>
                                </Link>

                                <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mt-1">
                                  {cleanText(blog.description)}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                <div className="flex items-center gap-2">
                                  <User size={13} className="text-gray-400" />
                                  <span className="font-medium text-gray-700">{blog.author}</span>
                                  <span>•</span>
                                  <span>{blog.date}</span>
                                </div>
                                <Link
                                  to={`/blog-details/${blog._id}`}
                                  className="text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1"
                                >
                                  Read article →
                                </Link>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Load More Button */}
                {visibleCount < filteredBlogs.length && (
                  <div className="mt-10 text-center">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 6)}
                      className="px-6 py-3 bg-white border-2 border-[#0B1B3D] text-[#0B1B3D] rounded-xl font-semibold hover:bg-[#0B1B3D] hover:text-white transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer text-sm"
                    >
                      Load More {desk.name} Stories ({filteredBlogs.length - visibleCount} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>

          {/* =========================================================================
              EDITORIAL SIDEBAR COMPANION
             ========================================================================= */}
          <aside className="lg:w-80 shrink-0 space-y-6">
            {/* All Desks Directory */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 overflow-hidden">
              <div className="bg-[#0B1B3D] px-5 py-4 text-white">
                <h3 className="font-bold text-sm font-serif-headline tracking-wide flex items-center gap-2">
                  <Building2 size={16} className="text-blue-300" />
                  NewsFront Desks Directory
                </h3>
                <p className="text-blue-200 text-[11px] mt-0.5">Explore coverage by specialized bureau</p>
              </div>

              <nav className="p-2 space-y-1 max-h-[55vh] overflow-y-auto no-scrollbar">
                {ALL_DESKS.map((d) => {
                  const isActive = currentDeskSlug === d.slug;
                  const Icon = d.icon;
                  const count = deskCounts[d.slug] ?? 0;
                  return (
                    <NavLink
                      key={d.slug}
                      to={d.path}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 text-xs font-medium ${
                        isActive
                          ? "bg-[#0B1B3D] text-white shadow-xs font-semibold"
                          : "text-gray-700 hover:bg-gray-100 hover:text-[#0B1B3D]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon size={14} className={isActive ? "text-blue-300" : "text-gray-400"} />
                        <span>{d.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {count}
                      </span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Bureau Dossier Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200/80 space-y-4">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-[#0B1B3D] flex items-center justify-center font-bold">
                  <DeskIcon size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-gray-900 uppercase tracking-wider">
                    {desk.name} Bureau
                  </h4>
                  <p className="text-[11px] text-gray-500">Verified Editorial Staff</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2 text-gray-600">
                  <User size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gray-900 block">{desk.leadCorrespondent}</span>
                    <span className="text-[11px] text-gray-500">{desk.correspondentRole}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-gray-600">
                  <MapPin size={13} className="text-gray-400 shrink-0 mt-0.5" />
                  <span className="text-[11px]">{desk.bureauLocation}</span>
                </div>

                <div className="flex items-center gap-2 text-gray-600">
                  <ShieldCheck size={13} className="text-emerald-500 shrink-0" />
                  <span className="text-[11px] text-emerald-700 font-medium">
                    Strict adherence to NewsFront verification charter
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="mailto:tips@newsfront.com"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Mail size={13} className="text-gray-500" />
                  Submit {desk.name} News Tip
                </a>
              </div>
            </div>

            {/* Quick Link to All Archive */}
            <div className="bg-linear-to-br from-[#0B1B3D] to-[#07132B] rounded-2xl p-5 text-white shadow-md">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300 block mb-1">
                NewsFront Archive
              </span>
              <h4 className="font-bold font-serif-headline text-lg mb-2">
                Looking for our full catalogue?
              </h4>
              <p className="text-xs text-blue-200/80 mb-4 leading-relaxed">
                Browse all 39 verified reports spanning all 7 editorial beats and special dispatches.
              </p>
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-xl transition-colors shadow-xs"
              >
                Access All Stories
                <ArrowRight size={13} />
              </Link>
            </div>
          </aside>
        </div>

        {/* Commercial Partner Feature */}
        <div className="mt-16">
          <Advert />
        </div>
      </div>

      {/* The NewsFront Daily Briefing */}
      <Newsletter />
    </div>
  );
};

export default CategoryPage;
