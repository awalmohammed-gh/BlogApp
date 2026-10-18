import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { ArrowRight, Search, Newspaper, Radio } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { publicSiteContentService } from "../../services/public/publicSiteContentService";
import { useBlog } from "../../context/BlogProvider";
import { deskCounts, hideBrokenImage } from "../../utils/articleMeta";
import globeImage from "../../assets/hero-globe.jpg";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }
});

const Hero = () => {
  const navigate = useNavigate();
  const { articles } = useBlog();
  const [query, setQuery] = useState("");
  // Copy is editable in Website CMS -> Homepage; these are the defaults.
  const [content, setContent] = useState({
    title: "Stories That Matter.",
    kicker: "Independent journalism from Ghana, Africa & the world",
    description:
      "Reporting, analysis and perspectives on the developments shaping Accra, the West African corridor and key capitals across the world.",
    buttonText: "Start Reading",
    buttonUrl: "#articles-section",
    secondaryButtonText: "All Stories",
    secondaryButtonUrl: "/blog"
  });

  useEffect(() => {
    let isMounted = true;
    publicSiteContentService
      .getPublishedPage("home")
      .then((res) => {
        const hero = res?.success ? res.data?.sections?.find((s) => s.type === "hero") : null;
        if (isMounted && hero?.data) setContent((prev) => ({ ...prev, ...hero.data }));
      })
      .catch(() => {
        // Defaults above stay in place
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const published = useMemo(() => (articles || []).filter((a) => a.isPublished), [articles]);
  const desks = useMemo(() => deskCounts(published), [published]);
  const latest = published[0];

  const handleSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/blog?q=${encodeURIComponent(q)}` : "/blog");
  };

  const scrollToStories = (e) => {
    const target = content.buttonUrl?.startsWith("#") && document.getElementById(content.buttonUrl.slice(1));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  const words = (content.title || "Stories That Matter.").trim().split(" ");
  const accent = words.length > 1 ? words.pop() : null;

  const primaryClass =
    "group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-linear-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-sky-900/40 hover:from-sky-400 hover:to-blue-500 transition-all";

  return (
    <section className="relative overflow-hidden bg-[#050B1F] text-white pt-28 md:pt-36 pb-16 md:pb-24">
      {/* Atmosphere */}
      <div className="absolute inset-0 hero-starfield opacity-80 pointer-events-none" />
      <div className="absolute inset-0 hero-grid pointer-events-none" />
      <div className="absolute -top-40 right-[-10%] w-[46rem] h-[46rem] rounded-full bg-sky-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-30%] left-[-15%] w-[36rem] h-[36rem] rounded-full bg-blue-700/20 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Copy */}
        <div className="lg:col-span-6 text-center lg:text-left">
          {content.kicker && (
            <motion.div {...fadeUp(0)} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-sky-400/25 backdrop-blur-md mb-6">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-sky-400" />
              </span>
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-sky-200">{content.kicker}</span>
            </motion.div>
          )}

          <motion.h1 {...fadeUp(0.1)} className="font-serif-headline font-bold tracking-tight text-balance leading-[1.02] text-5xl sm:text-6xl xl:text-7xl">
            {words.join(" ")}{" "}
            {accent && <span className="text-transparent bg-clip-text bg-linear-to-r from-sky-300 via-cyan-200 to-blue-400">{accent}</span>}
          </motion.h1>

          <motion.p {...fadeUp(0.2)} className="mt-6 text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl mx-auto lg:mx-0">
            {content.description}
          </motion.p>

          {/* Story search */}
          <motion.form {...fadeUp(0.3)} onSubmit={handleSearch} role="search" className="mt-8 max-w-xl mx-auto lg:mx-0">
            <label htmlFor="hero-search" className="sr-only">Search stories</label>
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-white/[0.07] border border-white/15 backdrop-blur-md focus-within:border-sky-400/60 focus-within:bg-white/10 transition-colors">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" aria-hidden="true" />
              <input
                id="hero-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stories, topics or authors"
                className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none"
              />
              <button type="submit" className="shrink-0 px-4 sm:px-5 py-2.5 rounded-xl bg-white text-slate-900 text-sm font-semibold hover:bg-sky-100 transition-colors cursor-pointer">
                Search
              </button>
            </div>
          </motion.form>

          <motion.div {...fadeUp(0.4)} className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3">
            {content.buttonUrl?.startsWith("#") ? (
              <a href={content.buttonUrl} onClick={scrollToStories} className={primaryClass}>
                {content.buttonText || "Start Reading"}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </a>
            ) : (
              <Link to={content.buttonUrl || "/blog"} className={primaryClass}>
                {content.buttonText || "Start Reading"}
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
            <Link
              to={content.secondaryButtonUrl || "/blog"}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 bg-white/5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <Newspaper size={16} className="text-sky-300" />
              {content.secondaryButtonText || "All Stories"}
            </Link>
          </motion.div>

          {/* Real desks with published stories */}
          {desks.length > 0 && (
            <motion.div {...fadeUp(0.5)} className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-2">
              <span className="text-xs text-slate-400 mr-1">Popular desks</span>
              {desks.slice(0, 4).map((desk) => (
                <Link
                  key={desk.slug}
                  to={`/${desk.slug}`}
                  className="px-3 py-1 rounded-full text-xs font-medium text-sky-100 bg-sky-400/10 border border-sky-300/20 hover:bg-sky-400/20 transition-colors"
                >
                  {desk.name}
                </Link>
              ))}
            </motion.div>
          )}
        </div>

        {/* Spinning globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-6 flex justify-center"
        >
          <div className="relative w-[78vw] max-w-[300px] sm:max-w-[400px] lg:max-w-[500px] aspect-square">
            {/* Glow */}
            <div className="absolute inset-[-8%] rounded-full bg-sky-400/25 blur-3xl globe-glow" aria-hidden="true" />

            {/* Orbit rings */}
            <div className="absolute inset-[-7%] rounded-full border border-dashed border-sky-300/25 globe-orbit" aria-hidden="true">
              <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-sky-300 shadow-[0_0_14px_4px_rgba(125,211,252,0.7)]" />
            </div>
            <div className="absolute inset-[-15%] rounded-full border border-blue-400/10 globe-orbit-reverse hidden sm:block" aria-hidden="true">
              <span className="absolute bottom-[14%] right-[6%] w-2 h-2 rounded-full bg-cyan-200 shadow-[0_0_12px_3px_rgba(165,243,252,0.7)]" />
            </div>

            {/* Globe: the image is cropped to its sphere and rotates inside a circle */}
            <div className="globe-float absolute inset-0">
              <div className="absolute inset-0 rounded-full overflow-hidden ring-1 ring-sky-300/30 shadow-[0_0_80px_rgba(56,189,248,0.35)] bg-[#03081a]">
                {/* The wrapper spins; the image inside is scaled and shifted so the
                    sphere's centre (≈45% from the top of the photo) sits on the pivot. */}
                <div className="globe-spin absolute inset-0">
                  <img
                    src={globeImage}
                    alt="Illuminated digital globe representing global news coverage"
                    className="absolute inset-0 w-full h-full object-cover select-none"
                    style={{ transform: "translateY(7.3%) scale(1.4)" }}
                    draggable="false"
                  />
                </div>
              </div>
              {/* Static lighting keeps the sphere looking 3D while the surface turns */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background: "radial-gradient(circle at 32% 28%, rgba(186,230,253,0.22), transparent 42%), radial-gradient(circle at 70% 78%, rgba(2,6,23,0.55), transparent 55%)",
                  boxShadow: "inset -18px -24px 60px rgba(2,6,23,0.7), inset 10px 12px 40px rgba(125,211,252,0.18)"
                }}
                aria-hidden="true"
              />
            </div>

            {/* Real newsroom status */}
            {published.length > 0 && (
              <div className="absolute top-[4%] right-[-4%] hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#0B1B3D]/80 border border-white/10 backdrop-blur-md shadow-xl text-xs">
                <Radio size={14} className="text-sky-300" />
                <span className="font-semibold">{published.length} {published.length === 1 ? "story" : "stories"}</span>
                <span className="text-slate-400">&middot; {desks.length} {desks.length === 1 ? "desk" : "desks"}</span>
              </div>
            )}

            {latest && (
              <Link
                to={`/blog-details/${latest._id}`}
                className="absolute bottom-[2%] left-[-8%] hidden sm:flex items-center gap-3 w-64 p-2.5 pr-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xl shadow-2xl hover:bg-white/15 transition-colors"
              >
                <img src={latest.image} alt="" onError={hideBrokenImage} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-sky-300">Latest &middot; {latest.category}</span>
                  <span className="block text-xs font-semibold text-white leading-snug line-clamp-2">{latest.title}</span>
                </span>
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
