import React, { useState, useEffect } from "react";
import { Download, Share2, PlusSquare, X, Smartphone } from "lucide-react";

/**
 * Hook to manage PWA install prompt lifecycle & environment detection
 */
export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
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

    // 2. iOS Safari detection
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|edgios/.test(ua);
    setIsIOS(isIosDevice && isSafari);

    // 3. Chromium beforeinstallprompt handling
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.__pwaDeferredPrompt = e;
      window.dispatchEvent(new CustomEvent("pwa:promptready"));
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

    if (window.__pwaDeferredPrompt) {
      setDeferredPrompt(window.__pwaDeferredPrompt);
    }

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
 * Reusable Install PWA Button Component with iOS Safari fallback modal
 */
export default function InstallPWAButton({
  className = "",
  label = "Install App",
  variant = "pill", // 'pill', 'text', 'icon'
}) {
  const { canInstall, isIOS, hasNativePrompt, triggerInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (!canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await triggerInstall();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        id="pwa-install-btn"
        aria-label="Install App to your device"
        title="Download and install Nsemfoa News app"
        className={
          className ||
          (variant === "pill"
            ? "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            : variant === "mobile"
            ? "flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            : "inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors")
        }
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
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
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold shrink-0 text-[11px]">1</span>
                <span>
                  Tap the <strong className="text-blue-600 dark:text-blue-400 inline-flex items-center gap-1 font-semibold">Share <Share2 className="w-3 h-3 inline" /></strong> button in the Safari navigation bar.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold shrink-0 text-[11px]">2</span>
                <span>
                  Scroll down the share menu and select <strong className="text-slate-900 dark:text-white inline-flex items-center gap-1 font-semibold">Add to Home Screen <PlusSquare className="w-3 h-3 inline" /></strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-bold shrink-0 text-[11px]">3</span>
                <span>
                  Tap <strong className="text-blue-600 dark:text-blue-400 font-semibold">Add</strong> in the top-right corner to launch directly as an app anytime!
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-xs shadow-xs transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
