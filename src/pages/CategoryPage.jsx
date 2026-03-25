import { useMemo } from "react";
import { useBlog } from "../context/BlogProvider";
import { NavLink, useParams } from "react-router-dom";
import { motion } from "motion/react";

import BlogCard from "../components/card/BlogCard";
import Advert from "../components/common/Advert";
import {
  Home,
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
  Menu,
} from "lucide-react";

const CategoryPage = () => {
  const { category } = useParams();
  const { articles } = useBlog();

  const navLinks = [
    { name: "Latest", path: "/latest", icon: TrendingUp },
    { name: "Politics", path: "/politics", icon: Landmark },
    { name: "Business", path: "/business", icon: Briefcase },
    { name: "Technology", path: "/technology", icon: Cpu },
    { name: "Sports", path: "/sports", icon: Trophy },
    { name: "Entertainment", path: "/entertainment", icon: Film },
    { name: "Health", path: "/health", icon: Heart },
    { name: "World", path: "/world", icon: Globe },
    { name: "E-commerce", path: "/e-commerce", icon: ShoppingBag },
    { name: "Trading", path: "/trading", icon: LineChart },
    { name: "Lifestyle", path: "/lifestyle", icon: Coffee },
    { name: "Local News", path: "/local-news", icon: Newspaper },
    { name: "Foreign News", path: "/foreign-news", icon: Radio },
  ];

  const formatCategory = (value) => value?.toLowerCase().replace(/\s+/g, "-");

  const filteredBlogs = useMemo(() => {
    return articles.filter(
      (blog) => formatCategory(blog?.category) === category && blog.isPublished,
    );
  }, [articles, category]);

  return (
    <>
      {/* Banner */}
      <div className="bg-[url('/categoryBg.jpg')] bg-cover bg-center h-[50vh] relative flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/80"></div>

        <div className="relative text-center text-white px-6 max-w-4xl animate-fadeInUp">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/30 backdrop-blur-md rounded-full text-sm font-medium mb-4 border border-blue-400/30">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
            {category?.replace("-", " ")} Category
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4 capitalize">
            <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              {category?.replace("-", " ")}
            </span>{" "}
            News
          </h1>
          <p className="text-base md:text-lg text-gray-200 max-w-2xl mx-auto leading-relaxed">
            Stay updated with the latest{" "}
            <span className="text-blue-400 font-semibold">
              {category?.replace("-", " ")}
            </span>{" "}
            news, trends, and insights from Ghana and around the world.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col lg:flex-row gap-8 px-4 sm:px-[4vw] py-12 bg-gray-50">
        {/* Sidebar */}
        <aside className="lg:w-80">
          <div className="sticky top-24">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#1E3A8A] to-[#2E4A9A] px-6 py-5">
                <h2 className="text-white font-bold text-xl flex items-center gap-2">
                  <Menu className="w-5 h-5" />
                  Categories
                </h2>
                <p className="text-blue-200 text-xs mt-1">Browse by topic</p>
              </div>

              <nav className="flex flex-col p-3 gap-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {navLinks.map((link, index) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={index}
                      to={link.path}
                      className={({ isActive }) =>
                        `group flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium ${
                          isActive
                            ? "bg-gradient-to-r from-[#1E3A8A] to-[#2E4A9A] text-white shadow-md"
                            : "text-gray-700 hover:bg-gray-100 hover:translate-x-1 hover:text-[#1E3A8A]"
                        }`
                      }
                    >
                      <Icon
                        className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                          window.location.pathname === link.path
                            ? "text-white"
                            : "text-gray-500 group-hover:text-[#1E3A8A]"
                        }`}
                      />
                      <span>{link.name}</span>
                      {window.location.pathname === link.path && (
                        <span className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Advertisement Widget */}
            <div className="mt-6 bg-linear-to-br from-gray-50 to-white rounded-2xl shadow-lg p-5 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-[#1E3A8A]" />
                </div>
                <h3 className="font-semibold text-gray-800">Popular Topics</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {navLinks.slice(0, 6).map((link, idx) => (
                  <span
                    key={idx}
                    className="text-xs px-3 py-1 bg-gray-100 rounded-full text-gray-600 hover:bg-[#1E3A8A] hover:text-white transition-colors cursor-pointer"
                  >
                    {link.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Articles */}
        <main className="flex-1">
          {/* Results Header */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {filteredBlogs.length} Article
                {filteredBlogs.length !== 1 ? "s" : ""}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                Latest {category?.replace("-", " ")} updates
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="w-2 h-2 bg-red-600 rounded-full"></span>
              Live Updates
            </div>
          </div>

          {filteredBlogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] bg-white rounded-2xl shadow-sm">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Newspaper className="w-12 h-12 text-gray-400" />
              </div>
              <p className="text-gray-500 text-xl font-medium">
                No articles found.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Check back later for new {category?.replace("-", " ")} content
              </p>
            </div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredBlogs.map((blog) => (
                  <BlogCard key={blog._id} blog={blog} />
                ))}
              </motion.div>

              {/* Load More Button */}
              {filteredBlogs.length > 6 && (
                <div className="mt-10 text-center">
                  <button className="px-6 py-3 bg-white border-2 border-[#1E3A8A] text-[#1E3A8A] rounded-xl font-semibold hover:bg-[#1E3A8A] hover:text-white transition-all duration-200 hover:shadow-lg">
                    Load More Articles
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      <Advert />
    </>
  );
};

export default CategoryPage;
