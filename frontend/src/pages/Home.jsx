import Advert from "../components/common/Advert";
import Hero from "../components/common/Hero";
import Newsletter from "../components/common/Newsletter";
import PopularCategory from "../components/common/PopularCategory";
import RecentArticles from "../components/common/RecentArticles";
import SEO from "../components/common/SEO";

const Home = () => {
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
    </div>
  );
};

export default Home;
