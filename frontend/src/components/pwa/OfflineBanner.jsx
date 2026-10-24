import React, { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-amber-600 text-white px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2 sticky top-0 z-50 shadow-xs"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>
        <strong>You are browsing offline.</strong> Previously viewed stories and cached articles remain accessible.
      </span>
    </div>
  );
}
