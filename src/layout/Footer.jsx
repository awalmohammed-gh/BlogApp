import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-[#1E3A8A] text-white mt-16">
      
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

        {/* Brand */}
        <div>
          <h1 className="text-xl font-bold">
            News<span className="text-gray-300">Front</span>
          </h1>
          <p className="text-sm text-white/80 mt-3">
            Your trusted source for news from Ghana, Africa, and the world.
          </p>
        </div>

        {/* Categories */}
        <div>
          <h2 className="font-semibold mb-3">Categories</h2>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/politics">Politics</Link></li>
            <li><Link to="/business">Business</Link></li>
            <li><Link to="/technology">Technology</Link></li>
            <li><Link to="/sports">Sports</Link></li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="font-semibold mb-3">Quick Links</h2>
          <ul className="space-y-2 text-sm text-white/80">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/latest">Latest News</Link></li>
            <li><Link to="/world">World</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h2 className="font-semibold mb-3">Contact</h2>
          <p className="text-sm text-white/80">
            Accra, Ghana <br />
            info@newsfront.com <br />
            +233 241529904
          </p>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/20 text-center py-4 text-sm text-white/70">
        © {new Date().getFullYear()} NewsFront. All rights reserved.
      </div>

    </footer>
  );
};

export default Footer;