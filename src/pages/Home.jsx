import Advert from "../components/common/Advert";
import Hero from "../components/common/Hero";
import Newsletter from "../components/common/Newsletter";
import PopularCategory from "../components/common/PopularCategory";
import RecentArticles from "../components/common/RecentArticles";

const Home = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <Hero />

      {/* Content Section */}
      <div className="px-4 sm:px-[4vw] md:px-[6vw] py-10 space-y-16">
        <PopularCategory />
        <RecentArticles />
      </div>
      <Advert />
      <div className="px-4 sm:px-[4vw] md:px-[6vw] py-10 space-y-16">
        <Newsletter />
      </div>
    </div>
  );
};

export default Home;
