import { NavLink } from "react-router-dom";
import {motion} from "motion/react"


const PopularCategory = () => {
 const navLinks = [
  // From original navLinks
  { name: "Latest", path: "/latest" },
  { name: "Politics", path: "/politics" },
  { name: "Business", path: "/business" },
  { name: "Technology", path: "/technology" },
  { name: "Sports", path: "/sports" },
  { name: "Entertainment", path: "/entertainment" },
  { name: "Health", path: "/health" },
  { name: "World", path: "/world" },
  
  // From article categories (excluding "All" and duplicates)
  { name: "E-commerce", path: "/e-commerce" },
  { name: "Trading", path: "/trading" },
  { name: "Lifestyle", path: "/lifestyle" },
  { name: "Local News", path: "/local-news" },
  { name: "Foreign News", path: "/foreign-news" },
];

  return (
    <div className="my-18 flex flex-col items-center justify-center">
      
      {/* Title */}
      <motion.h1 initial={{opacity:0, y:0}} animate={{opacity:1, y:-20}} transition={{duration:0.6, delay:0.2}} className="text-2xl sm:text-3xl md:text-5xl font-bold text-center">
        Most Popular Categories
      </motion.h1>

      {/* Links */}
      <nav className="flex flex-wrap items-center justify-center gap-3 mt-8">
        {navLinks.map((link, index) => (
          <NavLink
            key={index}
            to={link.path}
            className={({ isActive }) =>
              isActive
                ? "bg-[#1E3A8A] text-white px-5 py-3 rounded-xl transition"
                : "bg-gray-100 text-gray-800 px-5 py-3 rounded-xl hover:bg-[#1E3A8A] hover:text-white transition"
            }
          >
            {link.name}
          </NavLink>
        ))}
      </nav>

      {/* Divider */}
      <div className="w-full max-w-4xl border-t border-gray-300 my-10" />
    </div>
  );
};

export default PopularCategory;