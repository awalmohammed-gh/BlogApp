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

  const canInstall = !isStandalone && !isInstalled && (Boolean(deferredPrompt) || isIOS);

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

  const handleClick = async () => {
    if (hasNativePrompt) {
      await triggerInstall();
    } else if (isIOS) {
      setShowIOSModal(true);
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
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                  isAdmin ? "bg-rose-600" : "bg-blue-600"
                }`}
              >
                {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">
                  {isAdmin ? "Install Admin App" : "Install Nsemfoa News"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin ? "Add standalone CMS to iPhone / iPad" : "Add to your iPhone / iPad Home Screen"}
                </p>
              </div>
            </div>

            <ol className="text-xs space-y-3 mb-5 text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2.5">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full font-bold shrink-0 text-[11px] ${
                    isAdmin
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                      : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  1
                </span>
                <span>
                  Tap the{" "}
                  <strong
                    className={`inline-flex items-center gap-1 font-semibold ${
                      isAdmin ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    Share <Share2 className="w-3 h-3 inline" />
                  </strong>{" "}
                  button in Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full font-bold shrink-0 text-[11px] ${
                    isAdmin
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                      : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  2
                </span>
                <span>
                  Scroll down and choose{" "}
                  <strong className="text-slate-900 dark:text-white inline-flex items-center gap-1 font-semibold">
                    Add to Home Screen <PlusSquare className="w-3 h-3 inline" />
                  </strong>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span
                  className={`flex items-center justify-center w-5 h-5 rounded-full font-bold shrink-0 text-[11px] ${
                    isAdmin
                      ? "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300"
                      : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                  }`}
                >
                  3
                </span>
                <span>
                  Tap{" "}
                  <strong
                    className={`font-semibold ${
                      isAdmin ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    Add
                  </strong>{" "}
                  in the top-right corner to launch {isAdmin ? "Admin CMS" : "the app"} from your Home Screen!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className={`w-full py-2.5 text-white rounded-xl font-medium text-xs shadow-xs transition-colors cursor-pointer ${
                isAdmin ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Got it
            </button>
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
