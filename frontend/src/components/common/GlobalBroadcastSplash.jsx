import React, { useState, useEffect, useRef } from "react";
import { Globe, Radio, Wifi, Sparkles, ChevronRight } from "lucide-react";

/**
 * GlobalBroadcastSplash
 * 
 * Cinematic launch animation featuring:
 * 1. Nsemfoa 3D logo pop-up with radiant orbital pulse rings.
 * 2. "Nsemfoa : Stories That Matters" title and global motto.
 * 3. Worldwide channel tuning animation ("getting channels in the world")
 *    cycling through global news bureaus (Accra, London, New York, Doha, Johannesburg).
 * 4. Resilient & non-blocking: auto-dismisses after 2.6s, tap-anywhere to skip instantly,
 *    and unmounts completely from DOM so it never interferes with navigation or state.
 */
const CHANNELS = [
  { country: "🇬🇭", city: "Accra", outlet: "Joy News / GTV", freq: "99.7 MHz", tag: "West Africa Bureau" },
  { country: "🇬🇧", city: "London", outlet: "BBC World Service", freq: "98.4 MHz", tag: "Europe Bureau" },
  { country: "🇺🇸", city: "New York", outlet: "CNN International", freq: "104.1 MHz", tag: "Americas Bureau" },
  { country: "🇶🇦", city: "Doha", outlet: "Al Jazeera English", freq: "101.5 MHz", tag: "Middle East Bureau" },
  { country: "🇿🇦", city: "Johannesburg", outlet: "SABC News Africa", freq: "103.8 MHz", tag: "Southern Africa Bureau" },
  { country: "🌍", city: "Global", outlet: "Nsemfoa World Wire", freq: "108.0 MHz", tag: "All Channels Connected" }
];

export default function GlobalBroadcastSplash() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [channelIndex, setChannelIndex] = useState(0);
  const [frequency, setFrequency] = useState("98.4");
  const [progress, setProgress] = useState(0);

  const dismissTimerRef = useRef(null);
  const unmountTimerRef = useRef(null);

  const dismiss = () => {
    setIsFading(true);
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    unmountTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 450);
  };

  useEffect(() => {
    // 1. Cycle through global channels
    const channelInterval = setInterval(() => {
      setChannelIndex((prev) => {
        const next = (prev + 1) % CHANNELS.length;
        setFrequency(CHANNELS[next].freq.split(" ")[0]);
        return next;
      });
    }, 450);

    // 2. Animate frequency tuning progress bar
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) return 100;
        return prev + 4;
      });
    }, 80);

    // 3. Auto dismiss after 2.6 seconds so it's snappy and non-blocking
    dismissTimerRef.current = setTimeout(() => {
      dismiss();
    }, 2600);

    // 4. Keyboard dismissal on Escape or Enter
    const handleKeyDown = (e) => {
      if (e.key === "Escape" || e.key === "Enter") {
        dismiss();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    // Allow re-triggering from custom event if desired (e.g. clicking logo)
    const handleTrigger = () => {
      setIsVisible(true);
      setIsFading(false);
      setProgress(0);
      setChannelIndex(0);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        dismiss();
      }, 2600);
    };
    window.addEventListener("nsemfoa:show-splash", handleTrigger);

    return () => {
      clearInterval(channelInterval);
      clearInterval(progressInterval);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("nsemfoa:show-splash", handleTrigger);
    };
  }, []);

  if (!isVisible) return null;

  const currentChannel = CHANNELS[channelIndex];

  return (
    <div
      onClick={dismiss}
      role="banner"
      aria-label="Nsemfoa News Splash Screen"
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-between p-6 bg-[#07132B] text-white select-none transition-opacity duration-500 ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at 50% 30%, rgba(29, 78, 216, 0.28) 0%, rgba(11, 27, 58, 0.95) 70%, #07132B 100%)"
      }}
    >
      {/* Top Bar with Live Indicator & Skip Button */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 text-xs">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/40 border border-blue-500/30 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="w-2 h-2 rounded-full bg-red-500 -ml-4" />
          <span className="text-[11px] font-bold tracking-wider uppercase text-blue-200 flex items-center gap-1">
            <Radio className="w-3.5 h-3.5 text-blue-400" /> Live Feed
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          className="flex items-center gap-1 text-[11px] font-semibold text-blue-300/80 hover:text-white px-3 py-1 rounded-full hover:bg-white/10 transition-colors"
        >
          Skip Intro <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Center Main Stage: Animated Logo + Slogan */}
      <div className="flex flex-col items-center justify-center text-center my-auto max-w-sm px-4">
        {/* Pulsing Global Waves & 3D Logo */}
        <div className="relative flex items-center justify-center mb-6">
          {/* Radar Wave 1 */}
          <div className="absolute w-44 h-44 rounded-full border border-blue-500/20 animate-ping pointer-events-none" />
          {/* Radar Wave 2 */}
          <div
            className="absolute w-56 h-56 rounded-full border border-cyan-400/15 pointer-events-none animate-pulse"
            style={{ animationDuration: "2s" }}
          />
          {/* Radial Aura Glow */}
          <div className="absolute w-36 h-36 rounded-full bg-blue-500/20 blur-xl pointer-events-none" />

          {/* Center Logo Pop-up */}
          <div className="relative z-10 w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-2.5 bg-gradient-to-b from-blue-900/60 to-slate-900/90 border border-blue-400/40 shadow-2xl shadow-blue-600/30 backdrop-blur-md transform transition-transform animate-in zoom-in-75 duration-500">
            <img
              src="/icons/icon-512x512.png"
              alt="Nsemfoa News Official Logo"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
            />
          </div>
        </div>

        {/* User Required Text: Nsemfoa : Stories That Matters */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-serif drop-shadow-md">
          Nsemfoa News: Stories That Matters
        </h1>

        <p className="mt-1.5 text-xs sm:text-sm text-blue-200/90 font-medium tracking-widest uppercase flex items-center justify-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-blue-400 animate-spin" style={{ animationDuration: "12s" }} />
          Worldwide News & Editorial Network
        </p>

        {/* Global Channel Tuning Display ("getting channels in the world") */}
        <div className="w-full mt-7 p-3.5 rounded-2xl bg-slate-900/70 border border-blue-500/25 backdrop-blur-md shadow-xl text-left">
          {/* Tuner Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-blue-900/60">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
              <Wifi className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>SCANNING WORLD CHANNELS</span>
            </div>
            <div className="text-[11px] font-mono text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
              {frequency} MHz
            </div>
          </div>

          {/* Active Tuned Channel Banner */}
          <div className="flex items-center justify-between gap-2 py-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl shrink-0">{currentChannel.country}</span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {currentChannel.outlet}
                </div>
                <div className="text-[10px] text-blue-300/80 truncate">
                  {currentChannel.city} &bull; {currentChannel.tag}
                </div>
              </div>
            </div>

            {/* Audio Spectrum Bars Animation */}
            <div className="flex items-end gap-1 h-5 shrink-0 px-2">
              <span className="w-1 bg-cyan-400 rounded-full animate-pulse h-4" />
              <span className="w-1 bg-blue-400 rounded-full animate-pulse h-2" style={{ animationDelay: "150ms" }} />
              <span className="w-1 bg-emerald-400 rounded-full animate-pulse h-5" style={{ animationDelay: "300ms" }} />
              <span className="w-1 bg-amber-400 rounded-full animate-pulse h-3" style={{ animationDelay: "75ms" }} />
            </div>
          </div>

          {/* Frequency Tuning Progress Bar */}
          <div className="mt-2.5 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Status & Dismissal Prompt */}
      <div className="w-full max-w-md text-center pb-2">
        <p className="text-[11px] text-blue-300/60 font-sans flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Tap anywhere or press Enter to launch newsroom
        </p>
      </div>
    </div>
  );
}
