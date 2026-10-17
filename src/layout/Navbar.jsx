import { NavLink, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronUp, Menu, X, Search, Clock, TrendingUp } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useBlog } from "../context/BlogProvider";

const Navbar = () => {
  const [openLink, setOpenLink] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const navigate = useNavigate();
  const { articles } = useBlog();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpenLink(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  const primaryDesks = [
    { name: "Home", path: "/" },
    { name: "All Stories", path: "/blog" },
    { name: "Sports", path: "/sports" },
    { name: "Technology", path: "/technology" },
    { name: "Local News", path: "/local-news" },
    { name: "Foreign News", path: "/foreign-news" },
    { name: "Business", path: "/business" },
  ];

  const moreDesks = [
    { name: "Latest", path: "/latest" },
    { name: "E-commerce", path: "/e-commerce" },
    { name: "Trading", path: "/trading" },
    { name: "Lifestyle", path: "/lifestyle" },
    { name: "Politics", path: "/politics" },
    { name: "World", path: "/world" },
  ];

  // Quick search matching real articles
  const searchResults = searchQuery.trim()
    ? (articles || [])
        .filter(
          (a) =>
            a.isPublished &&
            (a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.author.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 5)
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/blog`);
      setSearchOpen(false);
    }
  };

  const currentDateFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <header className="fixed top-0 left-0 w-full z-50 transition-all duration-300">
      {/* Top Editorial Utility / Date Bar */}
      <div className="bg-[#0B1B3D] text-blue-100 text-[11px] border-b border-blue-900/60 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 py-1.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium tracking-wide">
              <Clock size={12} className="text-blue-300" />
              {currentDateFormatted}
            </span>
            <span className="text-blue-400/50">&bull;</span>
            <span className="text-blue-200 uppercase tracking-widest text-[10px] font-semibold">
              Ghana & Global Edition
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-blue-300">
              <TrendingUp size={12} className="text-blue-400" />
              <span className="text-gray-300">Trending:</span>
              <NavLink to="/technology" className="text-white hover:underline">
                Accra Tech Hub
              </NavLink>
              <span className="text-blue-400/50">&bull;</span>
              <NavLink to="/sports" className="text-white hover:underline">
                Olympic Qualifiers
              </NavLink>
            </div>
            <span className="text-blue-400/50">&bull;</span>
            <NavLink to="/about" className="hover:text-white transition-colors">
              About Bureau
            </NavLink>
            <NavLink to="/contact" className="hover:text-white transition-colors">
              Contact Desk
            </NavLink>
            <span className="text-blue-400/50">&bull;</span>
            <NavLink to="/admin" className="text-amber-400 font-bold hover:text-amber-300 transition-colors flex items-center gap-1">
              Admin
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Masthead Navigation Bar */}
      <div
        className={`w-full transition-all duration-300 border-b ${
          isScrolled
            ? "bg-[#0B1B3D]/95 backdrop-blur-md shadow-lg border-blue-900/80 py-3"
            : "bg-[#0B1B3D]/90 backdrop-blur-sm border-blue-900/40 py-3.5 md:py-4"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between">
          
          {/* Logo / Brand */}
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-[#1E3A8A] border border-blue-300/30 flex items-center justify-center font-serif text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
              N
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white block leading-none font-serif-headline">
                News<span className="text-blue-300 font-sans font-extrabold">Front</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-blue-200 block font-medium mt-0.5">
                The Accra & International Dispatch
              </span>
            </div>
          </NavLink>

          {/* Desktop Nav Items */}
          <nav className="hidden lg:flex items-center gap-1 text-[13px] font-medium text-white/90">
            {primaryDesks.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "text-white bg-blue-600/30 font-semibold border-b-2 border-blue-400"
                      : "text-blue-100/90 hover:text-white hover:bg-white/10"
                  }`
                }
              >
                {item.name}
              </NavLink>
            ))}

            {/* "More Desks" Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setOpenLink(!openLink)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-blue-100/90 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-expanded={openLink}
              >
                More Desks {openLink ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {openLink && (
                <div className="absolute top-9 left-0 bg-white text-gray-900 rounded-xl shadow-2xl w-56 py-2 z-50 animate-fadeIn border border-gray-100">
                  <div className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Additional Sections
                  </div>
                  {moreDesks.map((desk) => (
                    <NavLink
                      key={desk.path}
                      to={desk.path}
                      className={({ isActive }) =>
                        `block px-4 py-2 text-xs transition-colors ${
                          isActive
                            ? "bg-blue-50 text-[#1E3A8A] font-semibold"
                            : "hover:bg-gray-50 hover:text-[#1E3A8A]"
                        }`
                      }
                      onClick={() => setOpenLink(false)}
                    >
                      {desk.name}
                    </NavLink>
                  ))}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <NavLink
                      to="/about"
                      className="block px-4 py-1.5 text-xs text-gray-600 hover:text-[#1E3A8A] hover:bg-gray-50"
                      onClick={() => setOpenLink(false)}
                    >
                      Editorial Standards & About
                    </NavLink>
                    <NavLink
                      to="/contact"
                      className="block px-4 py-1.5 text-xs text-gray-600 hover:text-[#1E3A8A] hover:bg-gray-50"
                      onClick={() => setOpenLink(false)}
                    >
                      Pitch a Story / Contact
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Right Action Icons (Search + Contact) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Search articles"
              title="Quick Search"
            >
              <Search size={18} />
            </button>

            <NavLink
              to="/blog"
              className="hidden sm:inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-xs"
            >
              All Articles
            </NavLink>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="lg:hidden p-2 text-white hover:text-blue-200 transition-colors"
              aria-label="Toggle navigation"
            >
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Quick Search Drawer */}
        {searchOpen && (
          <div className="bg-[#07132B] border-t border-blue-900/60 px-6 py-4 animate-fadeIn">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search headlines, topics, or correspondents..."
                  className="w-full bg-white text-gray-900 pl-12 pr-24 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-400 shadow-inner"
                />
                <div className="absolute right-3 flex items-center gap-1.5">
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-gray-400 hover:text-gray-600 p-1"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#1E3A8A] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-blue-900 transition"
                  >
                    Search
                  </button>
                </div>
              </form>

              {/* Instant Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="mt-3 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100">
                  {searchResults.map((story) => (
                    <NavLink
                      key={story._id}
                      to={`/blog-details/${story._id}`}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                      className="p-3.5 flex items-center justify-between hover:bg-blue-50/70 transition-colors group"
                    >
                      <div className="pr-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block mb-0.5">
                          {story.category}
                        </span>
                        <h4 className="text-sm font-semibold text-gray-900 group-hover:text-[#1E3A8A] line-clamp-1">
                          {story.title}
                        </h4>
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">
                        {story.date}
                      </span>
                    </NavLink>
                  ))}
                  <div className="p-2 text-center bg-gray-50">
                    <NavLink
                      to="/blog"
                      onClick={() => setSearchOpen(false)}
                      className="text-xs font-semibold text-[#1E3A8A] hover:underline"
                    >
                      View all results in Story Archive &rarr;
                    </NavLink>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenu && (
          <div className="lg:hidden bg-[#0B1B3D] border-t border-blue-900/80 px-6 py-6 space-y-4 max-h-[80vh] overflow-y-auto animate-fadeIn">
            <div className="text-xs text-blue-300 font-semibold uppercase tracking-wider">
              Main News Desks
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...primaryDesks, ...moreDesks].map((desk) => (
                <NavLink
                  key={desk.path}
                  to={desk.path}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white font-bold"
                        : "text-blue-100 hover:bg-white/10 hover:text-white"
                    }`
                  }
                  onClick={() => setMobileMenu(false)}
                >
                  {desk.name}
                </NavLink>
              ))}
            </div>

            <div className="border-t border-blue-900/60 pt-4 space-y-2">
              <NavLink
                to="/admin"
                className="block text-sm font-bold text-amber-400 hover:text-amber-300 py-1"
                onClick={() => setMobileMenu(false)}
              >
                NewsFront Admin &rarr;
              </NavLink>
              <NavLink
                to="/about"
                className="block text-sm text-blue-200 hover:text-white py-1"
                onClick={() => setMobileMenu(false)}
              >
                About Our Newsroom & Standards
              </NavLink>
              <NavLink
                to="/contact"
                className="block text-sm text-blue-200 hover:text-white py-1"
                onClick={() => setMobileMenu(false)}
              >
                Contact & Pitch Leads
              </NavLink>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;