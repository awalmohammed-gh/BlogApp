import BrandLogo from "../components/common/BrandLogo";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const { settings } = useSiteSettings();
  const general = settings?.general;

  return (
    <footer className="bg-[var(--brand-primary,#0B1B3D)] text-white mt-12 sm:mt-16 border-t border-blue-900/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-10 py-10 sm:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12">

        {/* Brand */}
        <div className="space-y-4">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <BrandLogo />
          </Link>
          <p className="text-xs sm:text-sm text-blue-100/80 leading-relaxed">
            {general?.description || "Independent journalism from Ghana, Africa and beyond."}
          </p>
          <div className="flex items-center gap-2.5 text-xs text-blue-200 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Newsroom Active</span>
          </div>
        </div>

        {/* Categories / Desks */}
        <div>
          <h2 className="font-bold text-xs uppercase tracking-widest text-blue-300 mb-3 sm:mb-4 pb-2 border-b border-blue-900/50">
            Editorial Desks
          </h2>
          <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-blue-100/80">
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
          <h2 className="font-bold text-xs uppercase tracking-widest text-blue-300 mb-3 sm:mb-4 pb-2 border-b border-blue-900/50">
            Publication Navigation
          </h2>
          <ul className="space-y-2 sm:space-y-2.5 text-xs sm:text-sm text-blue-100/80">
            <li><Link to="/" className="hover:text-white transition-colors">Front Page</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">All Stories Archive</Link></li>
            <li><Link to="/latest" className="hover:text-white transition-colors">Latest Breaking News Wire</Link></li>
            <li><Link to="/about" className="hover:text-white transition-colors">Editorial Charter & Team</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Newsroom Tips & Whistleblower</Link></li>
            <li><Link to="/contact" className="hover:text-white transition-colors">Advertising & Commercial Desk</Link></li>
          </ul>
        </div>

        {/* Contact Bureau */}
        <div>
          <h2 className="font-bold text-xs uppercase tracking-widest text-blue-300 mb-3 sm:mb-4 pb-2 border-b border-blue-900/50">
            Accra News Bureau
          </h2>
          <div className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-blue-100/80">
            <div className="flex items-start gap-2.5">
              <MapPin size={16} className="text-blue-300 shrink-0 mt-0.5" />
              <span>{general?.address || "Accra, Ghana"}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Mail size={16} className="text-blue-300 shrink-0" />
              {general?.contactEmail ? (
                <a href={`mailto:${general.contactEmail}`} className="hover:text-white">{general.contactEmail}</a>
              ) : (
                <Link to="/contact" className="hover:text-white">Contact the newsroom</Link>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <Phone size={16} className="text-blue-300 shrink-0" />
              <span>{general?.contactPhone || "Contact our newsroom"}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Social Links */}
      {Object.entries(settings?.social || {}).some(([, url]) => url) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-6 flex gap-4 sm:gap-5 flex-wrap">
          {Object.entries(settings?.social || {}).filter(([, url]) => url).map(([name, url]) => (
            <a key={name} href={url} target="_blank" rel="noopener noreferrer" className="capitalize underline text-xs sm:text-sm text-blue-200 hover:text-white transition-colors">
              {name}
            </a>
          ))}
        </div>
      )}

      {/* Bottom Bar: Tight, responsive, seamless on mobile */}
      <div className="border-t border-blue-900/60 bg-[#07132B] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:py-3.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-blue-200/75">
          <p className="text-center sm:text-left text-[11px] sm:text-xs">
            © {new Date().getFullYear()} {general?.siteName || "Nsemfoa News"} Media Group. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 sm:gap-x-6 gap-y-1.5 text-[11px] sm:text-xs">
            <Link to="/about" className="hover:text-white transition-colors">Editorial Standards</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Corrections</Link>
            <Link to="/admin/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Staff Portal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;