import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { publicAdvertisementService } from "../../services/public/publicAdvertisementService";

const Advert = ({ placement = "homepage_banner", className = "" }) => {
  const [ad, setAd] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadAd = async () => {
      try {
        const res = await publicAdvertisementService.getActiveAdvertisement(placement);
        if (isMounted && res?.success && res.data) {
          setAd(res.data);
        }
      } catch {
        // No advertisement is shown when the request fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAd();
    return () => {
      isMounted = false;
    };
  }, [placement]);

  // If loading, render subtle skeleton frame
  if (loading) {
    return (
      <div className={`w-full my-8 animate-pulse bg-slate-900/60 rounded-2xl h-48 border border-slate-800 ${className}`} />
    );
  }

  // Active MongoDB Campaign
  if (ad) {
    const isExternal = ad.destinationUrl?.startsWith("http");

    return (
      <section className={`w-full my-8 ${className}`}>
        <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 md:p-10 border border-slate-800 shadow-md relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Disclaimer Tag */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Sponsored &bull; Commercial Partner Placement
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              {ad.advertiserName || "Commercial Partner"}
            </span>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Optional Ad Image */}
            {ad.media?.url && (
              <div className="md:col-span-3 h-36 md:h-32 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50">
                <img
                  src={ad.media.url}
                  alt={ad.media.altText || ad.headline}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            )}

            <div className={`${ad.media?.url ? "md:col-span-6" : "md:col-span-8"} space-y-2`}>
              <h3 className="text-xl sm:text-2xl font-bold font-serif-headline text-white tracking-tight">
                {ad.headline}
              </h3>
              {ad.description && (
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                  {ad.description}
                </p>
              )}
            </div>

            <div className={`${ad.media?.url ? "md:col-span-3" : "md:col-span-4"} flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-3`}>
              {isExternal ? (
                <a
                  href={ad.destinationUrl}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="w-full sm:w-auto md:w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>{ad.buttonText || "Learn More"}</span>
                  <ExternalLink size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </a>
              ) : (
                <Link
                  to={ad.destinationUrl || "/contact"}
                  className="w-full sm:w-auto md:w-full text-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all duration-200 flex items-center justify-center gap-2 group"
                >
                  <span>{ad.buttonText || "Learn More"}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
              <p className="text-[10px] text-slate-400 text-right w-full">
                Sponsored placement &bull; Nsemra News
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // No active campaign in MongoDB: render nothing rather than an invented placement
  return null;
};

export default Advert;