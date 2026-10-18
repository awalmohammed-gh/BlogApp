import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  ShieldCheck, 
  Globe2, 
  Sparkles, 
  Users, 
  Award, 
  BookOpen, 
  CheckCircle2, 
  ArrowRight,
  Send
} from "lucide-react";
import { Link } from "react-router-dom";
import blog34 from "../assets/blog34.jpg";
import { publicSiteContentService } from "../services/public/publicSiteContentService";
import { publicStatsService } from "../services/public/publicStatsService";

const STATS_REFRESH_MS = 30000;
const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** Live newsroom figures; refreshes while the tab is visible and when it regains focus. */
const useLiveStats = () => {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    let alive = true;
    const load = () => {
      if (document.visibilityState === "hidden") return;
      publicStatsService
        .getStats()
        .then((res) => alive && res?.success && setStats(res.data))
        .catch(() => {}); // keep the last known figures
    };
    load();
    const timer = setInterval(load, STATS_REFRESH_MS);
    window.addEventListener("focus", load);
    document.addEventListener("visibilitychange", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
      document.removeEventListener("visibilitychange", load);
    };
  }, []);
  return stats;
};

const About = () => {
  const [cmsContent, setCmsContent] = useState(null);

  useEffect(() => {
    let isMounted = true;
    publicSiteContentService.getPublishedPage("about").then((res) => {
      if (isMounted && res?.success && res.data?.sections) {
        setCmsContent(res.data.sections);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const heroSection = cmsContent?.find((s) => s.type === "hero")?.data;
  const missionSection = cmsContent?.find((s) => s.type === "text_content")?.data;
  const charterSection = cmsContent?.find((s) => s.type === "custom_editorial")?.data;
  // Team profiles come only from a CMS "team" section; no placeholder staff are shown.
  const teamMembers = (cmsContent?.find((s) => s.type === "team")?.data?.members || []).filter((m) => m?.name);

  const coreValues = [
    {
      icon: ShieldCheck,
      title: "Fact-Checked & Verified",
      desc: "Every claim, figure, and report undergoes rigorous editorial fact-checking before publication."
    },
    {
      icon: Globe2,
      title: "Pan-African & Global",
      desc: "Providing holistic context from Accra and regional capitals to international capitals worldwide."
    },
    {
      icon: Users,
      title: "People-Centered Stories",
      desc: "Championing public interest reporting that shines a light on community builders and everyday heroes."
    },
    {
      icon: Sparkles,
      title: "Editorial Independence",
      desc: "Free from commercial or political partisanship, ensuring objective and fearless journalism."
    }
  ];

  // Readers and desks are live figures; the last two are fixed newsroom commitments.
  const liveStats = useLiveStats();
  const live = (value) => (typeof value === "number" ? compact.format(value) : "—");
  const milestones = [
    { number: live(liveStats?.monthlyReaders), label: "Monthly Readers", live: true },
    { number: live(liveStats?.desks), label: "Regional Desks", live: true },
    { number: "99.8%", label: "Verified Accuracy" },
    { number: "24/7", label: "Real-time Updates" }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* =========================================================================
          HERO MASTHEAD BANNER (Cohesive with Landing Page Navy Palette)
         ========================================================================= */}
      <section className="relative w-full pt-32 sm:pt-36 md:pt-40 pb-16 overflow-hidden">
        {/* Newsroom Editorial Banner Background Image */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <img
            src={blog34}
            alt="Nsemra News Editorial Bureau"
            className="w-full h-full object-cover object-center scale-105"
          />
        </div>

        {/* Deep Editorial Overlays */}
        <div className="absolute inset-0 bg-linear-to-b from-[#0B1B3D]/92 via-[#0B1B3D]/80 to-[#0B1B3D]/95 pointer-events-none"></div>
        <div className="absolute inset-0 bg-radial from-transparent via-[#0B1B3D]/30 to-[#07132B]/85 pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 text-center text-white z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-400/30 backdrop-blur-md mb-4 text-xs font-semibold uppercase tracking-widest text-blue-200">
            <BookOpen className="w-3.5 h-3.5 text-blue-300" />
            <span>{heroSection?.kicker || "Nsemra News Editorial Bureau & Press House"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold font-serif-headline tracking-tight text-white mb-4">
            {heroSection?.title || "Independent, Fact-Checked Journalism"}
          </h1>

          <p className="text-sm sm:text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed font-light mb-8">
            {heroSection?.description || "Ghana's premier modern digital news platform delivering fearless investigative reporting, economic analysis, and cultural coverage across Africa and the world."}
          </p>

          <div className="max-w-3xl mx-auto bg-[#07132B]/80 border border-blue-900/60 rounded-2xl p-4 backdrop-blur-md grid grid-cols-2 sm:grid-cols-4 gap-4 text-center divide-y sm:divide-y-0 sm:divide-x divide-blue-900/40">
            {milestones.map((item, idx) => (
              <div key={idx} className="pt-2 sm:pt-0">
                <span className="text-2xl font-black text-white block tabular-nums" aria-live={item.live ? "polite" : undefined}>{item.number}</span>
                <span className="text-[11px] uppercase tracking-wider text-blue-300 font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A] bg-blue-50 px-3 py-1 rounded-full">
              {missionSection?.tag || "Our Purpose"}
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mt-4 tracking-tight leading-tight">
              {missionSection?.title || "Informing the public, fostering accountability, and celebrating progress."}
            </h2>
            <p className="text-gray-600 mt-4 leading-relaxed">
              {missionSection?.body || "Founded with the vision to bridge local grassroots realities with continental and global perspectives, Nsemra News delivers clear, credible, and context-rich coverage. Whether tracking legislative bills in Parliament, examining technological breakthroughs, or following sports championships, we put truth first."}
            </p>
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">Real-time alerts on breaking news and critical national developments</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">Deep-dive investigative series on economics, technology, and health</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <span className="text-gray-700 text-sm">Accessible multi-format reporting crafted for readers on any device</span>
              </div>
            </div>
          </div>

          <div className="bg-linear-to-br from-[#1E3A8A] to-[#172554] rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-blue-400/20 rounded-full blur-2xl pointer-events-none"></div>
            <BookOpen className="w-10 h-10 text-blue-300 mb-6" />
            <h3 className="text-xl sm:text-2xl font-bold mb-3">{charterSection?.title || "Our Editorial Charter"}</h3>
            <p className="text-blue-100 text-sm leading-relaxed mb-6">
              {charterSection?.charterText || '"To report without fear or favor, to amplify overlooked voices, and to illuminate complex events through fair, evidence-backed inquiry that empowers citizens and leaders alike."'}
            </p>
            <div className="border-t border-white/10 pt-4 flex items-center justify-between text-xs text-blue-200">
              <span>{charterSection?.adoptedIn || "Adopted in Accra, Ghana"}</span>
              <span>{charterSection?.board || "Nsemra News Editorial Board"}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Counter Bar */}
      <section className="bg-gray-50 border-y border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {milestones.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <p className="text-3xl sm:text-4xl font-extrabold text-[#1E3A8A] tabular-nums" data-stat={item.label}>{item.number}</p>
              <p className="text-gray-600 text-xs sm:text-sm font-medium">{item.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Editorial Values */}
      <section className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A] bg-blue-50 px-3 py-1 rounded-full">
            Standards
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mt-3 tracking-tight">
            Our Core Editorial Values
          </h2>
          <p className="text-gray-600 text-sm sm:text-base mt-2">
            The principles that guide every headline, interview, and analysis published on Nsemra News.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {coreValues.map((val, idx) => {
            const Icon = val.icon;
            return (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1E3A8A] mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{val.title}</h3>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">{val.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Newsroom Team */}
      {teamMembers.length > 0 && (
      <section className="bg-slate-50 py-16 md:py-20 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#1E3A8A] bg-blue-100 px-3 py-1 rounded-full">
              Leadership & Writers
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mt-3 tracking-tight">
              Meet Our Newsroom Team
            </h2>
            <p className="text-gray-600 text-sm sm:text-base mt-2">
              The people behind our reporting.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teamMembers.map((member, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-linear-to-br from-[#1E3A8A] to-[#2E4A9A] text-white rounded-full flex items-center justify-center font-bold text-base shadow-sm">
                    {member.initials || member.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{member.name}</h3>
                    <p className="text-xs text-[#1E3A8A] font-medium">{member.role}</p>
                  </div>
                </div>
                <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                  {member.bio}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* CTA Box */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-linear-to-r from-[#1E3A8A] to-[#2E4A9A] rounded-3xl p-8 sm:p-12 text-center text-white shadow-xl">
          <h2 className="text-2xl sm:text-4xl font-bold mb-3 tracking-tight">
            Have a Story or Tip to Share?
          </h2>
          <p className="text-blue-100 max-w-xl mx-auto text-sm sm:text-base mb-8">
            Our newsroom welcomes leads, op-eds, whistleblower information, and suggestions from readers across the country and the diaspora.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/contact"
              className="bg-white text-[#1E3A8A] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-blue-50 transition-colors shadow-md inline-flex items-center gap-2"
            >
              <Send size={16} />
              Reach Editorial Desk
            </Link>
            <Link
              to="/blog"
              className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-3 rounded-xl font-semibold text-sm transition-colors inline-flex items-center gap-2"
            >
              Browse Stories <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
