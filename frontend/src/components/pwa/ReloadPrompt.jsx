import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X } from "lucide-react";

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Check for updates every 60 minutes
        setInterval(() => {
          registration.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn("PWA Service Worker registration failed:", error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 p-4 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 max-w-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4 animate-spin-reverse" />
        </div>
        <div>
          <p className="text-xs font-semibold">New stories / update available</p>
          <p className="text-[11px] text-slate-400">Reload to get the latest version</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss notification"
          className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
