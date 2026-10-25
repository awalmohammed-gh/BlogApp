import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  Home, 
  Layers, 
  MessageSquare, 
  ShieldCheck, 
  Download, 
  X, 
  Smartphone, 
  Share2, 
  PlusSquare,
  Sparkles,
  Radio
} from "lucide-react";
import { usePWAInstall } from "../pwa/InstallPWAButton";

/**
 * Universal QuickActionsMenu
 * Triggered via:
 * 1. Mobile Long-Press (600ms hold with haptic vibration navigator.vibrate(40))
 * 2. Desktop Right-Click (onContextMenu)
 */
export default function QuickActionsMenu({ children, className = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null); // { x, y } for desktop right-click
  const [showIOSModal, setShowIOSModal] = useState(false);

  const timerRef = useRef(null);
  const touchStartPos = useRef({ x: 0, y: 0 });
  const isLongPressTriggered = useRef(false);
  const menuRef = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { isInstalled, isStandalone, isIOS, hasNativePrompt, triggerInstall } = usePWAInstall();

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handlePointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  // Trigger haptic vibration feedback
  const triggerHaptic = useCallback(() => {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      try {
        navigator.vibrate(40);
      } catch (_) {
        // Ignore haptics errors if blocked by browser policy
      }
    }
  }, []);

  // Desktop right-click
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Position the menu near the cursor, clamped to viewport boundaries
    const padding = 16;
    const estimatedWidth = 280;
    const estimatedHeight = 360;

    let x = e.clientX;
    let y = e.clientY;

    if (x + estimatedWidth > window.innerWidth - padding) {
      x = window.innerWidth - estimatedWidth - padding;
    }
    if (y + estimatedHeight > window.innerHeight - padding) {
      y = window.innerHeight - estimatedHeight - padding;
    }

    setMenuPosition({ x: Math.max(padding, x), y: Math.max(padding, y) });
    setIsOpen(true);
  };

  // Mobile Touch Handlers (600ms Long-Press)
  const handleTouchStart = (e) => {
    isLongPressTriggered.current = false;
    if (e.touches.length !== 1) return;

    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };

    timerRef.current = setTimeout(() => {
      isLongPressTriggered.current = true;
      triggerHaptic();
      setMenuPosition(null); // Mobile uses centered bottom/floating sheet
      setIsOpen(true);
    }, 600);
  };

  const handleTouchMove = (e) => {
    if (!timerRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const diffX = Math.abs(touch.clientX - touchStartPos.current.x);
    const diffY = Math.abs(touch.clientY - touchStartPos.current.y);

    // If movement exceeds threshold, cancel long-press
    if (diffX > 10 || diffY > 10) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchEnd = (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // If long-press triggered, suppress the subsequent click
    if (isLongPressTriggered.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const handleClick = (e) => {
    if (isLongPressTriggered.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressTriggered.current = false;
    }
  };

  // Action Navigation Handler
  const handleAction = (item) => {
    setIsOpen(false);

    if (item.action === "install") {
      if (hasNativePrompt) {
        triggerInstall();
      } else if (isIOS) {
        setShowIOSModal(true);
      }
      return;
    }

    if (item.url) {
      // Dual-PWA secret navigation: Always use window.location.href for /admin so the browser
      // cleanly loads /admin with /admin-manifest.json and fires a fresh beforeinstallprompt event specifically for the Admin App!
      if (item.url.startsWith("/admin")) {
        window.location.href = item.url;
        return;
      }

      const isHome = location.pathname === "/";
      if (item.url === "/") {
        if (isHome) {
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        } else {
          navigate("/");
        }
      } else if (item.url.startsWith("/?section=")) {
        const sectionId = item.url.replace("/?section=", "");
        if (isHome) {
          const el = document.getElementById(sectionId) || document.querySelector(`[data-section="${sectionId}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
          navigate(item.url, { replace: true });
        } else {
          navigate(item.url);
        }
      } else {
        navigate(item.url);
      }
    }
  };

  const menuItems = [
    {
      id: "home",
      label: "Front Website (Home)",
      desc: "Read latest stories & front page",
      icon: Home,
      url: "/",
      accent: "text-blue-400 bg-blue-500/10 border-blue-500/20"
    },
    {
      id: "projects",
      label: "Projects",
      desc: "Investigative series & data packages",
      icon: Layers,
      url: "/?section=projects",
      accent: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
    },
    {
      id: "admin",
      label: "Admin Dashboard",
      desc: "Newsroom CMS & editorial management",
      icon: ShieldCheck,
      url: "/admin",
      accent: "text-red-400 bg-red-500/10 border-red-500/20"
    },
    {
      id: "contact",
      label: "Contact Desk",
      desc: "News tips & editorial line",
      icon: MessageSquare,
      url: "/?section=contact",
      accent: "text-pink-400 bg-pink-500/10 border-pink-500/20"
    }
  ];

  // Context detection: Are we on the Admin or Public side?
  const isAdminRoute = location.pathname.startsWith("/admin");

  // Show "Install App" if not installed
  const showInstall = !isStandalone && !isInstalled;

  return (
    <div
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onClickCapture={handleClick}
      title="Press & hold or right-click for Quick Actions"
      className={`relative inline-flex items-center cursor-pointer select-none ${className}`}
      style={{ WebkitTouchCallout: "none" }}
    >
      {children}

      {/* Quick Actions Floating Modal / Popup */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          style={{ overscrollBehavior: "contain" }}
        >
          <div
            ref={menuRef}
            style={
              menuPosition
                ? {
                    position: "fixed",
                    left: `${menuPosition.x}px`,
                    top: `${menuPosition.y}px`,
                    transform: "none"
                  }
                : undefined
            }
            className="w-full max-w-xs sm:max-w-sm bg-[#0B1B3A] text-slate-100 rounded-2xl shadow-2xl border border-slate-700/80 p-4 animate-in zoom-in-95 duration-150 overflow-hidden"
          >
            {/* Header with Official Logo & Nsemfoa : Stories That Matters */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl p-1 bg-gradient-to-b from-blue-900/60 to-slate-900/90 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-sm">
                  <img
                    src="/icons/icon-192x192.png"
                    alt="Nsemfoa News"
                    className="w-full h-full object-contain filter drop-shadow-sm"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-black tracking-tight text-white font-serif truncate">
                    Nsemfoa : Stories That Matters
                  </h3>
                  <div className="flex items-center gap-1.5 text-[10px] text-cyan-300 font-medium mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Global Channels Synchronized</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-1"
                aria-label="Close Quick Actions menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Options List */}
            <div className="mt-3 space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleAction(item)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-800/80 active:bg-slate-800 transition-all text-left group border border-transparent hover:border-slate-700/60"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${item.accent}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Install PWA Option (Context-Aware for Public vs Admin App) */}
              {showInstall && (
                <div className="pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleAction({ action: "install" })}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group ${
                      isAdminRoute
                        ? "bg-gradient-to-r from-red-600/25 to-rose-700/25 border border-red-500/40 hover:border-red-400 hover:bg-red-600/35"
                        : "bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-600/30"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs ${
                      isAdminRoute ? "bg-red-600" : "bg-blue-600"
                    }`}>
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-bold transition-colors truncate flex items-center gap-1.5 ${
                        isAdminRoute ? "text-red-200 group-hover:text-white" : "text-blue-200 group-hover:text-white"
                      }`}>
                        {isAdminRoute ? "Install Admin App" : "Install Nsemfoa News"}
                        <Sparkles className="w-3 h-3 text-amber-400" />
                      </div>
                      <div className={`text-[11px] truncate ${
                        isAdminRoute ? "text-red-300/80" : "text-blue-300/80"
                      }`}>
                        {isAdminRoute ? "Standalone Newsroom CMS App" : "Add to Home Screen as app"}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Footer with Broadcast Replay & Quick Tip */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  window.dispatchEvent(new CustomEvent("nsemfoa:show-splash"));
                }}
                className="w-full py-2 px-3 rounded-xl bg-blue-950/70 hover:bg-blue-900/80 border border-blue-500/30 text-blue-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] group"
              >
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse group-hover:scale-110 transition-transform" />
                <span>Replay Global Broadcast Intro</span>
              </button>

              <div className="text-center text-[10px] text-slate-500">
                Long-press or right-click any brand icon to trigger
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS Installation Guide Modal */}
      {showIOSModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
        >
          <div className="bg-[#0B1B3A] text-slate-100 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative border border-slate-700">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                isAdminRoute ? "bg-red-600" : "bg-blue-600"
              }`}>
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight text-white">
                  {isAdminRoute ? "Install Admin App" : "Install Nsemfoa News"}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdminRoute ? "Add Standalone CMS to iPhone / iPad" : "Add to your iPhone / iPad Home Screen"}
                </p>
              </div>
            </div>

            <ol className="text-xs space-y-3 mb-5 text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 font-bold shrink-0 text-[11px]">1</span>
                <span>
                  Tap the <strong className="text-blue-400 inline-flex items-center gap-1 font-semibold">Share <Share2 className="w-3 h-3 inline" /></strong> button in Safari.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 font-bold shrink-0 text-[11px]">2</span>
                <span>
                  Select <strong className="text-white inline-flex items-center gap-1 font-semibold">Add to Home Screen <PlusSquare className="w-3 h-3 inline" /></strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-900/60 text-blue-300 font-bold shrink-0 text-[11px]">3</span>
                <span>
                  Tap <strong className="text-blue-400 font-semibold">Add</strong> in the top-right corner to install!
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
    </div>
  );
}
