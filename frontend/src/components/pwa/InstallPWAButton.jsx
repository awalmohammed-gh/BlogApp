import React, { useState, useEffect } from "react";
import { Download, Share2, PlusSquare, X, Smartphone, ShieldCheck } from "lucide-react";

/**
 * Hook to manage PWA install prompt lifecycle & environment detection
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(() => {
    return typeof window !== "undefined" ? window.__pwaDeferredPrompt || null : null;
  });
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://")
    );
  });
  const [isIOS] = useState(() => {
    if (typeof window === "undefined") return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
    return isIosDevice && isSafari;
  });
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Standalone / installed detection
    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(standalone);
      if (standalone) setIsInstalled(true);
    };

    checkStandalone();
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", checkStandalone);

    // 2. Chromium beforeinstallprompt handling
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__pwaDeferredPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa:promptready", { detail: e }));
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      window.__pwaDeferredPrompt = null;
      setIsInstalled(true);
      setIsStandalone(true);
      window.dispatchEvent(new CustomEvent("pwa:installed"));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      mediaQuery.removeEventListener("change", checkStandalone);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = async () => {
    const prompt = deferredPrompt || window.__pwaDeferredPrompt;
    if (prompt) {
      prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice?.outcome === "accepted") {
        setDeferredPrompt(null);
        window.__pwaDeferredPrompt = null;
        setIsInstalled(true);
      }
      return choice?.outcome;
    }
    return null;
  };

  const canInstall = !isStandalone && !isInstalled;

  return {
    canInstall,
    isStandalone,
    isInstalled,
    isIOS,
    hasNativePrompt: Boolean(deferredPrompt),
    triggerInstall,
  };
}

/**
 * Context-Aware Dual PWA Install Button Component
 * Dynamically presents "Install App" on Public side or "Install Admin App" on Admin side.
 */
export default function InstallPWAButton({
  className = "",
  label,
  variant = "pill", // 'pill', 'text', 'mobile', 'admin-header', 'admin-sidebar'
  isAdmin: propIsAdmin,
  compact = false,
}) {
  const { canInstall, isIOS, hasNativePrompt, triggerInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // Detect admin context from prop or current pathname
  const isAdmin =
    typeof propIsAdmin === "boolean"
      ? propIsAdmin
      : typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  const displayLabel = label || (isAdmin ? "Install Admin App" : "Install App");
  const displayTitle = isAdmin
    ? "Download and install Nsemfoa News Admin Dashboard CMS"
    : "Download and install Nsemfoa News app";

  if (!canInstall) return null;

  const [showGuideModal, setShowGuideModal] = useState(false);

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await triggerInstall();
      if (outcome !== "accepted") {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const defaultClasses = () => {
    if (variant === "admin-header") {
      return "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs border border-rose-500/50 transition-colors cursor-pointer";
    }
    if (variant === "admin-sidebar") {
      return `w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-300 hover:text-white hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer border border-rose-900/40 ${
        compact ? "justify-center" : ""
      }`;
    }
    if (variant === "pill") {
      return isAdmin
        ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors cursor-pointer"
        : "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer";
    }
    if (variant === "mobile") {
      return isAdmin
        ? "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors cursor-pointer"
        : "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors cursor-pointer";
    }
    return isAdmin
      ? "inline-flex items-center gap-1.5 text-xs font-medium text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
      : "inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer";
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        id={isAdmin ? "pwa-admin-install-btn" : "pwa-install-btn"}
        aria-label={displayTitle}
        title={displayTitle}
        className={className || defaultClasses()}
      >
        {isAdmin ? (
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <Download className="w-3.5 h-3.5 shrink-0" />
        )}
        {!compact && <span>{displayLabel}</span>}
      </button>

      {/* Universal Installation Guide Modal */}
      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-slate-900 text-slate-100 rounded-3xl p-6 sm:p-7 max-w-sm w-full shadow-2xl relative border border-slate-700">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-5">
              {isAdmin ? (
                <img
                  src="/admin-logo.png"
                  alt="Nsemfoa Admin"
                  className="w-12 h-12 object-contain rounded-2xl bg-slate-950 p-1 border border-red-500/30 shadow-md shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0 bg-blue-600 shadow-md">
                  <Smartphone className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="font-extrabold text-base sm:text-lg text-white leading-tight">
                  {isAdmin ? "Install Nsemfoa Admin" : "Install Nsemfoa News"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdmin ? "Standalone Newsroom CMS App" : "Add to your device home screen"}
                </p>
              </div>
            </div>

            <div className="text-xs space-y-3 mb-5 text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <p className="font-semibold text-white mb-1">🖥️ On Desktop (Chrome / Edge):</p>
                <p className="text-slate-400">
                  Click the <strong>Install icon (🖥️)</strong> at the right end of the browser address bar, or click Menu (⋮) → <strong>Install {isAdmin ? "Nsemfoa Admin" : "App"}</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
                <p className="font-semibold text-white mb-1">📱 On iPhone / iPad (Safari):</p>
                <p className="text-slate-400">
                  Tap <strong>Share</strong> (box with arrow), then select <strong>Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {hasNativePrompt && (
                <button
                  type="button"
                  onClick={async () => {
                    await triggerInstall();
                    setShowGuideModal(false);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs cursor-pointer ${
                    isAdmin ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
                  }`}
                >
                  Install Now
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className={`py-2.5 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer ${
                  hasNativePrompt ? "" : "w-full bg-slate-800"
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Dedicated Admin PWA Install Button helper
 */
export function InstallAdminPWAButton(props) {
  return <InstallPWAButton isAdmin={true} variant="admin-header" {...props} />;
}
