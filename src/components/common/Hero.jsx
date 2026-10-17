import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ArrowDown, Newspaper, ShieldCheck, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { publicSiteContentService } from "../../services/public/publicSiteContentService";

const Hero = () => {
  const [content, setContent] = useState({
    title: "Ghana and Beyond",
    kicker: "The Digital Frontline of African & Global Journalism",
    description:
      "Delivering independent, fact-checked reporting, investigative inquiries, and breaking developments from Accra, the West African corridor, and key capitals across the world.",
    buttonText: "Browse Stories",
    buttonUrl: "#articles-section",
    secondaryButtonText: "Latest News Wire",
    secondaryButtonUrl: "/blog",
    bgImage: "/heroBg.jpg"
  });

  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      try {
        const res = await publicSiteContentService.getPublishedPage("home");
        if (isMounted && res?.success && res.data?.sections) {
          const heroSection = res.data.sections.find((s) => s.type === "hero");
          if (heroSection?.data) {
            setContent((prev) => ({
              ...prev,
              ...heroSection.data
            }));
          }
        }
      } catch (err) {
        // Fallback gracefully to default editorial content
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleScrollToContent = () => {
    if (content.buttonUrl?.startsWith("#")) {
      const el = document.getElementById(content.buttonUrl.replace("#", ""));
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
  };

  // Format headline with beautiful accent on last word
  const renderHeadline = (rawTitle) => {
    if (!rawTitle) return "Ghana and Beyond";
    const words = rawTitle.trim().split(" ");
    if (words.length <= 1) return rawTitle;
    const lastWord = words.pop();
    const leading = words.join(" ");

    return (
      <>
        {leading}{" "}
        <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-300 via-white to-blue-200">
          {lastWord}
        </span>
      </>
    );
  };

  return (
    <div
      style={{
        backgroundImage: `url('${content.bgImage || "/heroBg.jpg"}')`
      }}
      className="relative w-full min-h-[82vh] md:min-h-[86vh] flex flex-col justify-between bg-cover bg-center pt-36 md:pt-44 pb-10 overflow-hidden"
    >
      {/* Editorial Gradient Overlays */}
      <div className="absolute inset-0 bg-linear-to-b from-[#0B1B3D]/95 via-[#0B1B3D]/80 to-[#0B1B3D]/95 pointer-events-none" />
      <div className="absolute inset-0 bg-radial from-transparent via-[#0B1B3D]/40 to-[#07132B]/90 pointer-events-none" />

      {/* Hero Center Content */}
      <div className="relative max-w-5xl mx-auto px-6 text-center text-white my-auto">
        {/* Eyebrow Kicker Badge */}
        {content.kicker && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md mb-6"
          >
            <Flame className="w-3.5 h-3.5 text-blue-300" />
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-blue-200">
              {content.kicker}
            </span>
          </motion.div>
        )}

        {/* Master Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-serif-headline tracking-tight leading-[1.08] mb-6"
        >
          {renderHeadline(content.title)}
        </motion.h1>

        {/* Refined Editorial Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="text-base sm:text-lg md:text-xl text-blue-100/90 max-w-3xl mx-auto leading-relaxed mb-8 font-light"
        >
          {content.description}
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          {content.buttonUrl?.startsWith("#") ? (
            <button
              onClick={handleScrollToContent}
              className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm md:text-base shadow-lg shadow-blue-900/40 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
            >
              <span>{content.buttonText || "Browse Stories"}</span>
              <ArrowDown size={16} className="group-hover:translate-y-1 transition-transform" />
            </button>
          ) : (
            <Link
              to={content.buttonUrl || "/blog"}
              className="px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-sm md:text-base shadow-lg shadow-blue-900/40 transition-all duration-200 flex items-center gap-2 cursor-pointer group"
            >
              <span>{content.buttonText || "Browse Stories"}</span>
              <ArrowDown size={16} className="group-hover:translate-y-1 transition-transform" />
            </Link>
          )}

          <Link
            to={content.secondaryButtonUrl || "/blog"}
            className="px-7 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-sm md:text-base border border-white/20 backdrop-blur-xs transition-all duration-200 flex items-center gap-2"
          >
            <Newspaper size={16} className="text-blue-300" />
            <span>{content.secondaryButtonText || "Latest News Wire"}</span>
          </Link>
        </motion.div>
      </div>

      {/* Bottom Editorial Ticker & Newsroom Metrics Ribbon */}
      <div className="relative max-w-7xl mx-auto w-full px-6 mt-12">
        <div className="bg-[#07132B]/80 border border-blue-900/60 rounded-2xl p-4 backdrop-blur-md grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-blue-900/40">
          <div className="pt-2 md:pt-0">
            <span className="text-2xl font-black text-white block">39+</span>
            <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">In-Depth Reports</span>
          </div>
          <div className="pt-2 md:pt-0">
            <span className="text-2xl font-black text-blue-400 block">7 Desks</span>
            <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">Politics &bull; Tech &bull; Sports</span>
          </div>
          <div className="pt-2 md:pt-0">
            <span className="text-2xl font-black text-white block">24/7</span>
            <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">Real-Time Newsroom</span>
          </div>
          <div className="pt-2 md:pt-0">
            <span className="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1">
              <ShieldCheck size={22} className="inline text-emerald-400" />
              100%
            </span>
            <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">Verified Sources</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
