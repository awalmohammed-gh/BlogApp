import { createContext, useCallback, useContext, useEffect, useState, useMemo } from "react";
import { publicGet } from "../api/publicCache";
import { resizeImage } from "../utils/imageKit";
const Context = createContext(null);
export const SiteSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [error, setError] = useState("");
  const refreshSettings = useCallback(async (fresh = false) => {
    try {
      const data = await publicGet("/site/settings", { fresh: fresh === true, ttl:30000 });
      setSettings((previous) => JSON.stringify(previous) === JSON.stringify(data.data.values) ? previous : data.data.values);
      setError("");
    } catch (err) { setError(err.message || "Unable to load website settings."); }
  }, []);
  useEffect(() => {
    // Loading saved configuration is synchronization with an external system.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshSettings();
    window.addEventListener("focus", refreshSettings);
    window.addEventListener("newsfront:settings", refreshSettings);
    return () => { window.removeEventListener("focus", refreshSettings); window.removeEventListener("newsfront:settings", refreshSettings); };
  }, [refreshSettings]);
  useEffect(() => {
    if (!settings) return;
    document.documentElement.style.setProperty("--brand-primary", settings.branding.primaryColor);
    document.documentElement.style.setProperty("--brand-blue", settings.branding.brandBlue);
  }, [settings]);
  // Favicon from Settings -> Branding; the built-in /favicon.svg when none is set
  const faviconUrl = settings?.branding?.faviconUrl || "";
  useEffect(() => {
    if (!settings) return;
    const setIcon = (rel, href, type) => {
      let link = document.head.querySelector(`link[rel="${rel}"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        document.head.append(link);
      }
      link.href = href;
      if (type) link.type = type;
      else link.removeAttribute("type");
    };
    if (faviconUrl) {
      setIcon("icon", resizeImage(faviconUrl, "w-64,h-64"));
      setIcon("apple-touch-icon", resizeImage(faviconUrl, "w-180,h-180"));
    } else {
      setIcon("icon", "/favicon.svg", "image/svg+xml");
      document.head.querySelector('link[rel="apple-touch-icon"]')?.remove();
    }
  }, [settings, faviconUrl]);
  const value=useMemo(()=>({settings,error,refreshSettings}),[settings,error,refreshSettings]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
};
// eslint-disable-next-line react-refresh/only-export-components
export const useSiteSettings = () => useContext(Context);
