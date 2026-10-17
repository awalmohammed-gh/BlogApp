import { useState } from "react";
import { Mail, CheckCircle2, ShieldCheck, Sparkles, Send, Loader2 } from "lucide-react";

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const validateEmail = (val) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your work or personal email address.");
      return;
    }

    if (!validateEmail(email.trim())) {
      setError("Please enter a valid email address (e.g. name@domain.com).");
      return;
    }

    setIsSubmitting(true);

    // Simulated network submit
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setEmail("");
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    }, 600);
  };

  return (
    <section className="w-full bg-linear-to-br from-[#0B1B3D] via-[#0F275A] to-[#1E3A8A] rounded-3xl p-6 sm:p-10 md:p-14 text-white shadow-xl relative overflow-hidden border border-blue-900/60 my-6">
      
      {/* Editorial Decorative Watermark */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-3xl mx-auto text-center space-y-4 relative z-10">
        
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-xs font-semibold uppercase tracking-widest text-blue-200">
          <Sparkles className="w-3.5 h-3.5 text-blue-300" />
          <span>The NewsFront Daily Briefing</span>
        </div>

        {/* Heading */}
        <h2 className="text-2xl sm:text-4xl font-bold font-serif-headline tracking-tight text-white">
          Start Your Day Informed with Clarity and Context
        </h2>

        {/* Value Proposition */}
        <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed max-w-xl mx-auto">
          Join over 50,000 readers who rely on our 6:00 AM GMT morning dispatch covering major Ghanaian developments, Pan-African headlines, and global markets.
        </p>

        {/* Feature Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-blue-200 pt-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Curated Executive Digest
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            Zero Advertising Clutter
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-emerald-400" />
            1-Click Unsubscribe
          </span>
        </div>

        {/* Form or Success State */}
        {isSubmitted ? (
          <div className="p-4 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl animate-fadeIn max-w-md mx-auto text-center space-y-1 mt-6">
            <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-sm">
              <CheckCircle2 size={18} />
              <span>You're officially subscribed!</span>
            </div>
            <p className="text-xs text-emerald-100">
              Welcome aboard. Please check your inbox for tomorrow morning's 6:00 AM edition.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="pt-4 max-w-lg mx-auto space-y-2"
          >
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative w-full flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  placeholder="Enter your email address..."
                  className={`w-full pl-11 pr-4 py-3 rounded-xl text-sm text-gray-900 bg-white placeholder-gray-400 outline-none transition-all shadow-sm ${
                    error
                      ? "ring-2 ring-red-400 border border-red-500"
                      : "focus:ring-2 focus:ring-blue-300"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl text-sm shadow-md transition-all duration-150 flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Subscribing...</span>
                  </>
                ) : (
                  <>
                    <span>Subscribe Free</span>
                    <Send size={14} />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-300 text-left pl-2 animate-fadeIn">
                {error}
              </p>
            )}
          </form>
        )}

        {/* Privacy Note */}
        <p className="text-[11px] text-blue-300/60 flex items-center justify-center gap-1.5 pt-2">
          <ShieldCheck size={12} className="text-blue-300/80" />
          We respect your privacy. Strictly editorial updates; no commercial spam ever.
        </p>

      </div>
    </section>
  );
};

export default Newsletter;