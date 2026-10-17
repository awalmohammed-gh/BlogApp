import Advert from "../components/common/Advert";
import Hero from "../components/common/Hero";
import Newsletter from "../components/common/Newsletter";
import PopularCategory from "../components/common/PopularCategory";
import RecentArticles from "../components/common/RecentArticles";

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* 1. Ghana and Beyond Editorial Frontispiece */}
      <Hero />

      {/* 2. Editorial Category Sub-Masthead */}
      <PopularCategory />

      {/* 3. Main Publication Content Container */}
      <main id="articles-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
        {/* Tiered Editorial Newsroom Layout */}
        <RecentArticles />

        {/* Commercial Partner Feature */}
        <Advert />

        {/* The NewsFront Daily Briefing */}
        <Newsletter />
      </main>
    </div>
  );
};

export default Home;
