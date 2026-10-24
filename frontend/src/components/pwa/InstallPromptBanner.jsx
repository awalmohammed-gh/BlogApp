import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, ArrowRight } from "lucide-react";
import { usePWAInstall } from "./InstallPWAButton";

const DISMISSED_KEY = "nsemfoa_pwa_banner_dismissed_at";

export default function InstallPromptBanner() {
  const { canInstall, triggerInstall, isIOS } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Only show if not previously dismissed in the last 24 hours
    const lastDismissed = localStorage.getItem(DISMISSED_KEY);
    if (lastDismissed) {
      const hoursAgo = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60);
      if (hoursAgo < 24) {
        setDismissed(true);
        return;
      }
    }
    setDismissed(false);
  }, []);

  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      await triggerInstall();
    }
  };

  return (
    <>
      <div
        id="pwa-install-banner"
        className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-slate-900 text-white border-b border-blue-700/50 shadow-sm"
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-amber-400 shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-semibold text-white">Get the Nsemfoa News App</span>
              <span className="hidden md:inline text-blue-200"> — Read offline, instant updates, and full-screen experience.</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 px-3 py-1 sm:py-1.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download App</span>
              <ArrowRight className="w-3 h-3 hidden sm:inline" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="p-1 text-blue-200 hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Installation Guide Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">Install Nsemfoa News</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Add to your iPhone / iPad Home Screen</p>
              </div>
            </div>

            <ol className="text-xs space-y-3 mb-5 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold shrink-0 text-[11px]">1</span>
                <span>Tap the <strong>Share</strong> icon at the bottom of Safari.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold shrink-0 text-[11px]">2</span>
                <span>Select <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold shrink-0 text-[11px]">3</span>
                <span>Tap <strong>Add</strong> in the top-right corner.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
