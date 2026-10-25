import React, { useState } from "react";
import { Download, X, ShieldCheck, ArrowRight, Laptop, Smartphone, MonitorDown } from "lucide-react";
import { usePWAInstall } from "./InstallPWAButton";

const ADMIN_BANNER_DISMISSED_KEY = "nsemfoa_admin_install_banner_dismissed";

export default function AdminInstallPromptBanner() {
  const { canInstall, triggerInstall, hasNativePrompt, isIOS } = usePWAInstall();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return sessionStorage.getItem(ADMIN_BANNER_DISMISSED_KEY) === "true";
  });
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running standalone or installed or dismissed in this session, hide
  if (!canInstall || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(ADMIN_BANNER_DISMISSED_KEY, "true");
  };

  const handleInstallClick = async () => {
    if (hasNativePrompt) {
      const outcome = await triggerInstall();
      if (outcome !== "accepted") {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <aside
        id="admin-install-banner"
        aria-label="Install Nsemfoa Admin App"
        className="relative z-40 bg-gradient-to-r from-red-950 via-[#0B1B3A] to-slate-950 text-white border-b border-red-800/40 shadow-xl shadow-red-950/20"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Info */}
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            <div className="relative shrink-0">
              <img
                src="/admin-logo.png"
                alt="Nsemfoa Admin Logo"
                className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-xl p-0.5 bg-slate-900/80 border border-red-500/30 shadow-md"
              />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-xs sm:text-sm tracking-tight">
                  Install Nsemfoa Admin App
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
                  <ShieldCheck size={11} /> Standalone CMS
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Install on your PC, Mac, iPhone or Android for dedicated full-screen newsroom access.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleInstallClick}
              id="admin-banner-install-trigger"
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 sm:py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 hover:shadow-red-600/40 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download size={14} className="shrink-0" />
              <span>Install Admin App</span>
              <ArrowRight size={13} className="hidden sm:inline shrink-0" />
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss admin install banner"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors cursor-pointer"
              title="Dismiss for this session"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Cross-Platform Installation Guide Modal */}
      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative border border-slate-700/80">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3.5 mb-5">
              <img
                src="/admin-logo.png"
                alt="Nsemfoa Admin"
                className="w-12 h-12 object-contain rounded-2xl bg-slate-950 p-1 border border-red-500/30 shadow-md shrink-0"
              />
              <div>
                <h3 className="font-extrabold text-lg text-white leading-tight">
                  Install Nsemfoa Admin
                </h3>
                <p className="text-xs text-slate-400">
                  Follow the steps below for your current device
                </p>
              </div>
            </div>

            {/* OS Specific Guidance */}
            <div className="space-y-4 mb-6">
              {/* Desktop (Chrome / Edge / Windows / Mac) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-1.5">
                  <Laptop size={14} />
                  <span>On Desktop (Chrome, Edge, Brave):</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                  <li>
                    Look at the <strong>far right of your browser's address bar</strong> for the{" "}
                    <span className="inline-flex items-center gap-1 font-semibold text-white bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                      <MonitorDown size={11} /> Install
                    </span>{" "}
                    icon.
                  </li>
                  <li>
                    Or click Chrome menu (<strong>⋮</strong>) →{" "}
                    <strong>Cast, save and share</strong> →{" "}
                    <strong>Install Nsemfoa Admin</strong>.
                  </li>
                </ol>
              </div>

              {/* Mobile (iOS & Android) */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1.5">
                  <Smartphone size={14} />
                  <span>On Phone / Tablet:</span>
                </div>
                <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside pl-1">
                  <li>
                    <strong>iPhone/iPad (Safari):</strong> Tap the <strong>Share</strong> button, then select <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    <strong>Android (Chrome):</strong> Tap menu (<strong>⋮</strong>), then choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </li>
                </ol>
              </div>
            </div>

            {/* Direct Trigger Action If Prompt Became Available */}
            <div className="flex items-center gap-3">
              {hasNativePrompt && (
                <button
                  type="button"
                  onClick={async () => {
                    await triggerInstall();
                    setShowGuideModal(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-600/30 transition-all cursor-pointer"
                >
                  Prompt Install Dialog Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className={`py-2.5 px-5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer ${
                  hasNativePrompt ? "" : "w-full bg-slate-800"
                }`}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
