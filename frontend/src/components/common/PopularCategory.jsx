import { NavLink, Link } from "react-router-dom";
import { Compass, ChevronRight } from "lucide-react";

const PopularCategory = () => {
  const editorialDesks = [
    { name: "Latest", path: "/latest" },
    { name: "Sports", path: "/sports" },
    { name: "Technology", path: "/technology" },
    { name: "Local News", path: "/local-news" },
    { name: "Foreign News", path: "/foreign-news" },
    { name: "Business", path: "/business" },
    { name: "E-commerce", path: "/e-commerce" },
    { name: "Trading", path: "/trading" },
    { name: "Lifestyle", path: "/lifestyle" },
    { name: "Politics", path: "/politics" },
    { name: "World", path: "/world" },
  ];

  return (
    <section className="w-full border-b border-slate-200/80 bg-white/85 backdrop-blur-md sticky top-[60px] md:top-[85px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        
        {/* Left Section Label */}
        <div className="hidden md:flex items-center gap-2 pr-4 border-r border-gray-200 py-3 text-xs font-bold uppercase tracking-wider text-[#0B1B3D] shrink-0">
          <Compass size={14} className="text-blue-600" />
          <span>Sections</span>
        </div>

        {/* Scrollable Editorial Desks List */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2.5 px-1 sm:px-4 no-scrollbar scroll-smooth flex-1">
          {editorialDesks.map((desk, idx) => (
            <NavLink
              key={idx}
              to={desk.path}
              className={({ isActive }) =>
                `text-xs sm:text-[13px] font-medium px-3.5 py-1.5 rounded-full whitespace-nowrap border transition-all duration-150 ${
                  isActive
                    ? "bg-slate-900 border-slate-900 text-white font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:border-slate-200"
                }`
              }
            >
              {desk.name}
            </NavLink>
          ))}
        </nav>

        {/* Right Quick Link: Story Archive */}
        <div className="hidden sm:flex items-center pl-4 border-l border-gray-200 py-3 shrink-0">
          <Link
            to="/blog"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 transition-colors"
          >
            <span>Archive</span>
            <ChevronRight size={14} />
          </Link>
        </div>

      </div>
    </section>
  );
};

export default PopularCategory;