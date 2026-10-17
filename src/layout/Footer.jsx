import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, ShieldCheck, Newspaper } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-[#0B1B3D] text-white mt-16 border-t border-blue-900/60">
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">

        {/* Brand */}
        <div className="space-y-4">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-linear-to-br from-blue-500 to-[#1E3A8A] border border-blue-300/30 flex items-center justify-center font-serif text-white font-black text-xl shadow-sm group-hover:scale-105 transition-transform">
              N
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight text-white block leading-none font-serif-headline">
                News<span className="text-blue-300 font-sans font-extrabold">Front</span>
              </span>
              <span className="text-[9px] uppercase tracking-widest text-blue-200 block font-medium mt-0.5">
                Ghana & Beyond
              </span>
            </div>
          </Link>
          <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
            NewsFront is an independent, fact-checked digital publication providing verified journalism, investigative reporting, and real-time updates from Accra, regional capitals, and around the world.
          </p>
          <div className="flex items-center gap-2.5 text-xs text-blue-200 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Newsroom Active &bull; GJA Code of Ethics</span>
          </div>
        </div>

        {/* Categories / Desks */}
        <div>
          <h2 className="font-bold text-xs uppercase tracking-widest text-blue-300 mb-4 pb-2 border-b border-blue-900/50">
            Editorial Desks
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-blue-100/80">
            <li><Link to="/sports" className="hover:text-white transition-colors">Sports & Athletics</Link></li>
            <li><Link to="/technology" className="hover:text-white transition-colors">Technology & Startups</Link></li>
            <li><Link to="/local-news" className="hover:text-white transition-colors">Local Governance</Link></li>
            <li><Link to="/foreign-news" className="hover:text-white transition-colors">Foreign Affairs & Global</Link></li>
            <li><Link to="/business" className="hover:text-white transition-colors">Business & Finance</Link></li>
            <li><Link to="/e-commerce" className="hover:text-white transition-colors">E-commerce & Retail</Link></li>
            <li><Link to="/lifestyle" className="hover:text-white transition-colors">Culture & Lifestyle</Link></li>
          </ul>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="font-bold text-xs uppercase tracking-widest text-blue-300 mb-4 pb-2 border-b border-blue-900/50">
            Publication Navigation
          </h2>
          <ul className="space-y-2.5 text-xs sm:text-sm text-blue-100/80">
            <li><Link to="/" className="hover:text-white transition-colors">Front Page</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">All Stories Archive (39+)</Link></li>
            <li><Link to="/latest" className="hover:text-white transition-colors">Latest Breaking News Wire</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">Editorial Charter & Team</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Newsroom Tips & Whistleblower</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Advertising & Commercial Desk</Link></li>
          </ul>
        </div>

        {/* Contact Bureau */}
        <div>
          <h2 className="font-bold text-xs uppercase tracking-widest text-blue-300 mb-4 pb-2 border-b border-blue-900/50">
            Accra News Bureau
          </h2>
          <div className="space-y-3 text-xs sm:text-sm text-blue-100/80">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-blue-300 shrink-0 mt-0.5" />
              <span>Independence Ave, Ridge, Accra, Ghana</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail size={16} className="text-blue-300 shrink-0" />
              <a href="mailto:info@newsfront.com" className="hover:text-white">info@newsfront.com</a>
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={16} className="text-blue-300 shrink-0" />
              <span>+233 241529904</span>
            </div>
            <div className="pt-2 text-[11px] text-blue-200/70">
              <span>Press Inquiries: newsroom@newsfront.com</span>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="border-t border-blue-900/60 bg-[#07132B]/80 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-blue-200/70">
          <p>© {new Date().getFullYear()} NewsFront Media Group. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-white transition-colors">Editorial Standards</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Corrections & Retractions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;