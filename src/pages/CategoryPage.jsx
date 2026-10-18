import { useMemo, useState, useEffect } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { Search, X, Grid3X3, List, Clock, ArrowRight, ArrowUpRight, ChevronRight, Newspaper } from "lucide-react";
import { useBlog } from "../context/BlogProvider";
import { useSiteSettings } from "../context/SiteSettingsContext";
import BlogCard from "../components/card/BlogCard";
import Advert from "../components/common/Advert";
import Newsletter from "../components/common/Newsletter";
import { DESKS, getDesk, storiesForDesk } from "../config/desks";
import { stripHtml, readingMinutes, hideBrokenImage } from "../utils/articleMeta";
import { setPageMeta } from "../utils/setPageMeta";

const SORTS = {
  newest: { label: "Newest first", apply: (list) => list },
  oldest: { label: "Oldest first", apply: (list) => [...list].reverse() },
  title: { label: "Title A–Z", apply: (list) => [...list].sort((a, b) => a.title.localeCompare(b.title)) },
  quick: { label: "Quickest read", apply: (list) => [...list].sort((a, b) => readingMinutes(a.content) - readingMinutes(b.content)) }
};

const ListRow = ({ story }) => (
  <Link to={`/blog-details/${story._id}`} className="group flex gap-5 p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-200 hover:shadow-lg hover:shadow-slate-200/60 transition-all">
    <div className="w-28 h-24 sm:w-48 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-linear-to-br from-slate-100 to-blue-100">
      <img src={story.image} alt={story.title} loading="lazy" onError={hideBrokenImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
    </div>
    <div className="min-w-0 flex flex-col justify-center gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">{story.category}</span>
      <h3 className="font-serif-headline text-lg sm:text-xl font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">{story.title}</h3>
      <p className="hidden sm:block text-sm text-slate-600 line-clamp-2">{stripHtml(story.description)}</p>
      <span className="text-xs text-slate-500">{story.author} &middot; {story.date} &middot; {readingMinutes(story.content)} min read</span>
    </div>
  </Link>
);

const CategoryPage = () => {
  const { category } = useParams();
  const { settings } = useSiteSettings();
  const { articles, refreshArticles, loading } = useBlog();
  const pageSize = settings?.publishing.articlesPerPage || 9;
  const desk = getDesk(category);
  const DeskIcon = desk.icon;

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  const [visible, setVisible] = useState(pageSize);

  useEffect(() => {
    if (typeof refreshArticles === "function") refreshArticles();
  }, [refreshArticles]);

  // Reset the view whenever the desk changes
  const [prevDesk, setPrevDesk] = useState(desk.slug);
  if (prevDesk !== desk.slug) {
    setPrevDesk(desk.slug);
    setSearchQuery("");
    setSortBy("newest");
    setVisible(pageSize);
  }

  useEffect(() => {
    const siteName = settings?.general.siteName || "Nsemra News";
    setPageMeta({ title: `${desk.name} | ${siteName}`, description: desk.tagline, siteName, image: "", twitterSite: settings?.seo.twitterHandle });
  }, [desk.name, desk.tagline, settings?.general.siteName, settings?.seo.twitterHandle]);

  const deskStories = useMemo(() => storiesForDesk(desk, articles), [desk, articles]);
  const counts = useMemo(() => Object.fromEntries(DESKS.map((d) => [d.slug, storiesForDesk(d, articles).length])), [articles]);

  const results = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = q
      ? deskStories.filter((s) => [s.title, s.subTitle, s.author, stripHtml(s.description)].some((v) => v?.toLowerCase().includes(q)))
      : deskStories;
    return SORTS[sortBy].apply(filtered);
  }, [deskStories, searchQuery, sortBy]);

  const isBrowsing = !searchQuery.trim() && sortBy === "newest";
  const lead = isBrowsing ? results[0] : null;
  const rest = lead ? results.slice(1) : results;
  const shown = rest.slice(0, visible);
  const otherDesks = DESKS.filter((d) => d.slug !== desk.slug && d.slug !== "latest" && counts[d.slug] > 0).slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===== Hero with the desk's own image ===== */}
      <section className="relative overflow-hidden bg-[#050B1F] text-white pt-28 md:pt-36 pb-14 md:pb-20">
        <motion.img
          key={desk.slug}
          src={desk.image}
          alt=""
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-[#050B1F] via-[#050B1F]/85 to-[#050B1F]/30" />
        <div className="absolute inset-0 bg-linear-to-t from-[#050B1F] via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-300 mb-6">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={13} className="text-slate-500" />
            <Link to="/blog" className="hover:text-white">Stories</Link>
            <ChevronRight size={13} className="text-slate-500" />
            <span className="text-white font-medium">{desk.name}</span>
          </nav>

          <motion.div key={desk.slug} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-[0.16em] text-sky-200">
              <DeskIcon size={14} /> News desk
            </span>
            <h1 className="mt-5 font-serif-headline text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-none">{desk.name}</h1>
            <p className="mt-5 text-base sm:text-lg text-slate-300 leading-relaxed">{desk.tagline}</p>
            <div className="mt-7 flex flex-wrap items-center gap-3 text-sm">
              <span className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md">
                <strong className="font-semibold">{deskStories.length}</strong> {deskStories.length === 1 ? "story" : "stories"}
              </span>
              {deskStories[0] && (
                <span className="px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 backdrop-blur-md text-slate-200">
                  Latest: {deskStories[0].date}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Desk switcher ===== */}
      <div className="sticky top-[60px] md:top-[85px] z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
        <nav aria-label="News desks" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          {DESKS.map((d) => (
            <NavLink
              key={d.slug}
              to={`/${d.slug}`}
              className={({ isActive }) =>
                `shrink-0 inline-flex items-center gap-2 pl-1 pr-3.5 py-1 rounded-full border text-sm transition-colors ${
                  isActive ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`
              }
            >
              <img src={d.image} alt="" className="w-7 h-7 rounded-full object-cover" />
              <span className="font-medium">{d.name}</span>
              <span className="text-xs opacity-60">{counts[d.slug]}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
        {/* ===== Toolbar ===== */}
        {deskStories.length > 0 && (
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisible(pageSize);
                }}
                placeholder={`Search ${desk.name} stories`}
                aria-label={`Search ${desk.name} stories`}
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort stories"
                className="py-3 pl-4 pr-9 rounded-2xl bg-white border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {Object.entries(SORTS).map(([key, s]) => <option key={key} value={key}>{s.label}</option>)}
              </select>
              <div className="flex p-1 rounded-2xl bg-white border border-slate-200" role="group" aria-label="Layout">
                {[{ mode: "grid", icon: Grid3X3 }, { mode: "list", icon: List }].map((option) => {
                  const ModeIcon = option.icon;
                  return (
                    <button
                      key={option.mode}
                      type="button"
                      onClick={() => setViewMode(option.mode)}
                      aria-pressed={viewMode === option.mode}
                      aria-label={`${option.mode} view`}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${viewMode === option.mode ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}
                    >
                      <ModeIcon size={16} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== Stories ===== */}
        {loading && deskStories.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-80 rounded-2xl bg-slate-200/70" />)}
          </div>
        ) : deskStories.length === 0 ? (
          <div className="py-20 px-6 text-center bg-white rounded-3xl border border-slate-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><Newspaper className="w-7 h-7" /></div>
            <h2 className="font-serif-headline text-2xl font-bold text-slate-900">No {desk.name} stories yet</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Nothing has been published on this desk so far. Catch up on the newest stories in the meantime.</p>
            <Link to="/latest" className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              See the latest stories <ArrowRight size={15} />
            </Link>
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200">
            <h2 className="font-serif-headline text-2xl font-bold text-slate-900">No matches for &ldquo;{searchQuery}&rdquo;</h2>
            <p className="text-sm text-slate-500 mt-2">Try another word, or clear the search to see every {desk.name} story.</p>
            <button type="button" onClick={() => setSearchQuery("")} className="mt-5 px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
              Clear search
            </button>
          </div>
        ) : (
          <section aria-label={`${desk.name} stories`} className="space-y-10">
            {lead && (
              <Link to={`/blog-details/${lead._id}`} className="group grid lg:grid-cols-2 rounded-3xl overflow-hidden bg-white border border-slate-200/80 hover:shadow-2xl hover:shadow-slate-200/70 transition-shadow">
                <div className="relative aspect-16/10 lg:aspect-auto lg:min-h-105 overflow-hidden bg-linear-to-br from-slate-100 to-blue-100">
                  <img src={lead.image} alt={lead.title} onError={hideBrokenImage} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                </div>
                <div className="p-7 sm:p-10 flex flex-col justify-center gap-4">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Latest in {desk.name}</span>
                  <h2 className="font-serif-headline text-3xl sm:text-4xl font-bold text-slate-900 leading-tight group-hover:text-blue-700 transition-colors">{lead.title}</h2>
                  {lead.subTitle && <p className="text-lg text-slate-600">{lead.subTitle}</p>}
                  <p className="text-slate-600 leading-relaxed line-clamp-3">{stripHtml(lead.description)}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 pt-2">
                    <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 text-xs font-bold inline-flex items-center justify-center">{lead.author?.charAt(0)}</span>
                    <span className="font-medium text-slate-800">{lead.author}</span>
                    <span>&middot; {lead.date} &middot;</span>
                    <span className="inline-flex items-center gap-1"><Clock size={13} /> {readingMinutes(lead.content)} min</span>
                  </div>
                </div>
              </Link>
            )}

            {shown.length > 0 && (
              viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {shown.map((story) => <BlogCard key={story._id} blog={story} />)}
                </div>
              ) : (
                <div className="space-y-4">
                  {shown.map((story) => <ListRow key={story._id} story={story} />)}
                </div>
              )
            )}

            <div className="flex flex-col items-center gap-3">
              <span className="text-sm text-slate-500">
                Showing {shown.length + (lead ? 1 : 0)} of {results.length} {results.length === 1 ? "story" : "stories"}
              </span>
              {visible < rest.length && (
                <button
                  type="button"
                  onClick={() => setVisible((v) => v + pageSize)}
                  className="px-6 py-3 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Load more stories
                </button>
              )}
            </div>
          </section>
        )}

        <Advert placement="all_stories_banner" />

        {/* ===== Other desks ===== */}
        {otherDesks.length > 0 && (
          <section aria-label="Explore other desks">
            <div className="flex items-end justify-between mb-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">Keep exploring</span>
                <h2 className="mt-1.5 font-serif-headline text-3xl font-bold text-slate-900">Other desks</h2>
              </div>
              <Link to="/blog" className="text-sm font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1">All stories <ArrowRight size={15} /></Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {otherDesks.map((d) => (
                <Link key={d.slug} to={`/${d.slug}`} className="group relative overflow-hidden rounded-2xl aspect-16/10 bg-slate-900">
                  <img src={d.image} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-0 bg-linear-to-t from-slate-950/90 via-slate-950/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 flex items-end justify-between gap-2">
                    <div>
                      <h3 className="text-white font-semibold text-lg">{d.name}</h3>
                      <span className="text-xs text-slate-300">{counts[d.slug]} {counts[d.slug] === 1 ? "story" : "stories"}</span>
                    </div>
                    <span className="w-8 h-8 shrink-0 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-colors">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Newsletter />
      </div>
    </div>
  );
};

export default CategoryPage;
