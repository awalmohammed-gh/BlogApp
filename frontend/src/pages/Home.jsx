import { useEffect } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import Advert from "../components/common/Advert";
import Hero from "../components/common/Hero";
import Newsletter from "../components/common/Newsletter";
import PopularCategory from "../components/common/PopularCategory";
import RecentArticles from "../components/common/RecentArticles";
import SEO from "../components/common/SEO";
import ProjectsSection from "../components/common/ProjectsSection";
import ServicesSection from "../components/common/ServicesSection";
import ContactSection from "../components/common/ContactSection";

const Home = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();

  useEffect(() => {
    const section = searchParams.get("section");
    if (!section) return;

    const targetId = section.toLowerCase().trim();

    const scrollToTarget = () => {
      const element =
        document.getElementById(targetId) ||
        document.querySelector(`[data-section="${targetId}"]`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return true;
      }
      return false;
    };

    // Attempt immediate scroll
    if (!scrollToTarget()) {
      // Retry in case dynamic components / images are still rendering
      const timer1 = setTimeout(scrollToTarget, 100);
      const timer2 = setTimeout(scrollToTarget, 350);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [searchParams, location.search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SEO type="website" />
      {/* Hero with spinning globe */}
      <Hero />

      {/* Sticky desk navigation */}
      <PopularCategory />

      {/* Stories */}
      <div id="articles-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20 space-y-20 scroll-mt-40">
        <RecentArticles />

        {/* Shown only when an active campaign exists */}
        <Advert />

        <Newsletter />
      </div>

      {/* Projects Showcase Section (Triggered by ?section=projects shortcut) */}
      <ProjectsSection />

      {/* Services & Media Solutions Section (Triggered by ?section=services shortcut) */}
      <ServicesSection />

      {/* Direct Newsroom Contact Section (Triggered by ?section=contact shortcut) */}
      <ContactSection />
    </div>
  );
};

export default Home;
