import { NavLink } from "react-router-dom";
import { ChevronDown, ChevronUp, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

const Navbar = () => {
  const [openLink, setOpenLink] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Latest", path: "/latest" },
    { name: "Politics", path: "/politics" },
    { name: "Business", path: "/business" },
    { name: "Technology", path: "/technology" },
    { name: "Sports", path: "/sports" },
    { name: "Entertainment", path: "/entertainment" },
    { name: "Health", path: "/health" },
    { name: "World", path: "/world" },
    { name: "E-commerce", path: "/e-commerce" },
    { name: "Trading", path: "/trading" },
    { name: "Lifestyle", path: "/lifestyle" },
    { name: "Local News", path: "/local-news" },
    { name: "Foreign News", path: "/foreign-news" },
  ];

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-300 py-6 ${
        isScrolled 
          ? "bg-[#1E3A8A] shadow-lg " 
          : "bg-transparent"
      }`}
    >
      <div className="flex items-center justify-between sm:justify-around px-6 md:px-10">
        
        {/* Logo */}
        <NavLink to="/">
          <h1 className={`text-xl font-bold transition-colors duration-300 ${
            isScrolled ? "text-white" : "text-white"
          }`}>
            News<span className="text-gray-300">Front</span>
          </h1>
        </NavLink>

        {/* Desktop Menu */}
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <NavLink 
            to="/" 
            className={({ isActive }) => 
              `transition-colors duration-300 ${
                isActive ? 'text-blue-300 font-semibold' : 'text-white hover:text-blue-200'
              }`
            }
          >
            Home
          </NavLink>

          {/* Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenLink(!openLink)}
              className={`flex items-center gap-1 transition-colors duration-300 ${
                isScrolled ? 'text-white hover:text-blue-200' : 'text-white hover:text-blue-200'
              }`}
            >
              News {openLink ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openLink && (
              <div className="absolute top-8 left-0 bg-white text-black rounded-md shadow-lg w-40 py-2 z-50 animate-fadeIn">
                {navLinks.map((link, index) => (
                  <NavLink
                    key={index}
                    to={link.path}
                    className="block px-4 py-2 hover:bg-gray-100 hover:text-[#1E3A8A] transition-colors text-sm"
                    onClick={() => setOpenLink(false)}
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <NavLink 
            to="/contact"
            className={({ isActive }) => 
              `transition-colors duration-300 ${
                isActive ? 'text-blue-300 font-semibold' : 'text-white hover:text-blue-200'
              }`
            }
          >
            Contact
          </NavLink>
          <NavLink 
            to="/about"
            className={({ isActive }) => 
              `transition-colors duration-300 ${
                isActive ? 'text-blue-300 font-semibold' : 'text-white hover:text-blue-200'
              }`
            }
          >
            About
          </NavLink>
        </nav>

        {/* Mobile Icon */}
        <div className="md:hidden">
          <button 
            onClick={() => setMobileMenu(!mobileMenu)}
            className="text-white hover:text-blue-200 transition-colors"
          >
            {mobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenu && (
        <div className={`md:hidden px-6 pb-4 space-y-3 transition-all duration-300 ${
          isScrolled ? "bg-[#1E3A8A]" : "bg-[#1E3A8A]/95 backdrop-blur-sm"
        }`}>
          <NavLink 
            to="/" 
            className="block text-white hover:text-blue-200 py-2"
            onClick={() => setMobileMenu(false)}
          >
            Home
          </NavLink>

          {/* Mobile Dropdown */}
          <div>
            <button
              onClick={() => setOpenLink(!openLink)}
              className="flex items-center gap-1 text-white hover:text-blue-200 py-2"
            >
              News {openLink ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {openLink && (
              <div className="ml-3 mt-2 space-y-2">
                {navLinks.map((link, index) => (
                  <NavLink 
                    key={index} 
                    to={link.path} 
                    className="block text-sm text-white hover:text-blue-200 py-1"
                    onClick={() => {
                      setOpenLink(false);
                      setMobileMenu(false);
                    }}
                  >
                    {link.name}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          <NavLink 
            to="/contact" 
            className="block text-white hover:text-blue-200 py-2"
            onClick={() => setMobileMenu(false)}
          >
            Contact
          </NavLink>
          <NavLink 
            to="/about" 
            className="block text-white hover:text-blue-200 py-2"
            onClick={() => setMobileMenu(false)}
          >
            About
          </NavLink>
        </div>
      )}

      {/* Add CSS for animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </header>
  );
};

export default Navbar;