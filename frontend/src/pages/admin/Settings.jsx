import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import toast from "../../utils/toast";
import {
  Building2, Palette, Newspaper, Search, Share2, Lock, RefreshCw, AlertTriangle, CheckCircle2,
  Loader2, Mail, Phone, MapPin, Globe2, CalendarDays, ExternalLink, Info, Minus, Plus
} from "lucide-react";
import { FaXTwitter, FaFacebookF, FaLinkedinIn, FaYoutube, FaInstagram } from "react-icons/fa6";
import { adminEngagementService as service } from "../../services/admin/engagementService";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { formatPublicDate } from "../../utils/formatPublicDate";
import { resizeImage } from "../../utils/imageKit";
import BrandMark from "../../components/common/BrandMark";
import BrandAssetField from "../../components/admin/settings/BrandAssetField";

const SECTIONS = [
  { id: "general", label: "General", icon: Building2, description: "Publication identity, contact details and dates" },
  { id: "branding", label: "Branding", icon: Palette, description: "Colours used by the logo and footer" },
  { id: "publishing", label: "Publishing", icon: Newspaper, description: "Comments, scheduling and archive pages" },
  { id: "seo", label: "SEO & Sharing", icon: Search, description: "How the site appears in search and social" },
  { id: "social", label: "Social Links", icon: Share2, description: "Profiles linked in the site footer" }
];

const SOCIAL = [
  { key: "twitter", label: "X (Twitter)", icon: FaXTwitter, placeholder: "https://x.com/yourhandle" },
  { key: "facebook", label: "Facebook", icon: FaFacebookF, placeholder: "https://facebook.com/yourpage" },
  { key: "linkedin", label: "LinkedIn", icon: FaLinkedinIn, placeholder: "https://linkedin.com/company/yourcompany" },
  { key: "youtube", label: "YouTube", icon: FaYoutube, placeholder: "https://youtube.com/@yourchannel" },
  { key: "instagram", label: "Instagram", icon: FaInstagram, placeholder: "https://instagram.com/yourhandle" }
];

const DATE_FORMATS = ["MMMM D, YYYY", "YYYY-MM-DD", "DD/MM/YYYY"];
const TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Africa/Accra", "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Europe/London", "America/New_York", "UTC"];
  }
})();

// Client-side mirror of the server's rules, so problems are shown on the exact field.
const isHex = (v) => /^#[a-f\d]{6}$/i.test(v || "");
const isHttpUrl = (v) => !v || (/^https?:\/\//i.test(v) && (() => { try { new URL(v); return true; } catch { return false; } })());
const isTimezone = (v) => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return Boolean(v); } catch { return false; } };
const validate = (section, v) => {
  const e = {};
  if (section === "general") {
    if (!v.siteName?.trim()) e.siteName = "Site name is required.";
    if (v.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail)) e.contactEmail = "Enter a valid email address.";
    if (!isTimezone(v.timezone)) e.timezone = "Choose a timezone from the list, e.g. Africa/Accra.";
  }
  if (section === "branding") {
    if (!isHex(v.primaryColor)) e.primaryColor = "Use a 6-digit hex colour like #0B1B3A.";
    if (!isHex(v.brandBlue)) e.brandBlue = "Use a 6-digit hex colour like #2563EB.";
  }
  if (section === "publishing" && !(Number.isInteger(v.articlesPerPage) && v.articlesPerPage >= 1 && v.articlesPerPage <= 50)) {
    e.articlesPerPage = "Choose a whole number from 1 to 50.";
  }
  if (section === "seo" && !v.defaultMetaTitle?.trim()) e.defaultMetaTitle = "A default page title is required.";
  if (section === "social") for (const { key } of SOCIAL) if (!isHttpUrl(v[key])) e[key] = "Use a full link starting with https://";
  return e;
};

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- Small form building blocks ---------- */

const Card = ({ title, description, children, aside }) => (
  <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
    <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">{title}</h3>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      {aside}
    </div>
    <div className="p-5 sm:p-6 space-y-5">{children}</div>
  </section>
);

const Field = ({ id, label, hint, error, count, max, required, children }) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <span className="text-xs font-semibold text-slate-700">
        <label htmlFor={id}>{label}</label>
        {required && <span aria-hidden="true" className="text-rose-500"> *</span>}
      </span>
      {max && <span className={`text-[11px] tabular-nums ${count > max ? "text-rose-600" : "text-slate-400"}`}>{count}/{max}</span>}
    </div>
    {children}
    {error ? (
      <p id={`${id}-error`} className="text-xs text-rose-600 mt-1.5 flex items-center gap-1"><AlertTriangle size={12} /> {error}</p>
    ) : hint ? (
      <p className="text-xs text-slate-500 mt-1.5">{hint}</p>
    ) : null}
  </div>
);

const inputClass = (error) =>
  `w-full px-3.5 py-2.5 bg-slate-50/70 border rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:bg-white transition-colors ${
    error ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500" : "border-slate-300 focus:ring-blue-500/20 focus:border-blue-600"
  }`;

const Toggle = ({ id, checked, onChange, disabled, label, description, locked }) => (
  <div className="flex items-start justify-between gap-4 py-1">
    <div>
      <label htmlFor={id} className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
        {label}
        {locked && <Lock size={13} className="text-slate-400" aria-label="Locked" />}
      </label>
      <p className="text-xs text-slate-500 mt-0.5 max-w-md">{description}</p>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed ${
        checked ? "bg-blue-600" : "bg-slate-300"
      } ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  </div>
);

const ColorField = ({ id, label, hint, value, error, onChange }) => (
  <Field id={id} label={label} hint={hint} error={error}>
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={isHex(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="w-12 h-11 rounded-xl border border-slate-300 bg-white p-1 cursor-pointer"
        aria-label={`${label} picker`}
      />
      <input id={id} type="text" value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} className={`${inputClass(error)} font-mono uppercase`} aria-invalid={Boolean(error)} />
    </div>
  </Field>
);

/* ---------- Page ---------- */

export default function Settings() {
  const { refreshSettings } = useSiteSettings();
  const [saved, setSaved] = useState(null); // last server copy
  const [draft, setDraft] = useState(null); // edits, per section
  const [active, setActive] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await service.settings();
      setSaved(result.data);
      setDraft(result.data.values);
      setError("");
      setConflict(false);
      setShowErrors(false);
    } catch (err) {
      setError(err.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirtySections = useMemo(
    () => (saved && draft ? SECTIONS.filter((s) => !same(saved.values[s.id], draft[s.id])).map((s) => s.id) : []),
    [saved, draft]
  );
  const isDirty = dirtySections.includes(active);
  const values = draft?.[active] || {};
  const errors = useMemo(() => (draft ? validate(active, draft[active]) : {}), [active, draft]);
  const fieldError = (key) => (showErrors || values[key] !== saved?.values[active]?.[key] ? errors[key] : undefined);

  // Warn before leaving with unsaved edits
  useEffect(() => {
    if (!dirtySections.length) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirtySections.length]);

  const change = (key, value) => setDraft((current) => ({ ...current, [active]: { ...current[active], [key]: value } }));
  const changeMany = (patch) => setDraft((current) => ({ ...current, [active]: { ...current[active], ...patch } }));
  const discard = () => {
    setDraft((current) => ({ ...current, [active]: saved.values[active] }));
    setShowErrors(false);
  };

  const save = async (event) => {
    event?.preventDefault();
    if (Object.keys(errors).length) {
      setShowErrors(true);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await service.saveSettings({ section: active, values: draft[active], version: saved.version });
      // Keep unsaved edits in other sections; this section now matches the server
      setSaved(result.data);
      setDraft((current) => ({ ...current, [active]: result.data.values[active] }));
      setShowErrors(false);
      toast.success(`${SECTIONS.find((s) => s.id === active).label} settings saved.`);
      await refreshSettings();
      window.dispatchEvent(new Event("newsfront:settings"));
    } catch (err) {
      setConflict(err.status === 409);
      setError(err.status === 409 ? "Someone else saved settings after you opened this page." : err.message || "Settings could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const general = draft?.general || {};
  const seo = draft?.seo || {};
  const branding = draft?.branding || {};
  const datePreview = (() => {
    try {
      return formatPublicDate(new Date(), { timezone: isTimezone(general.timezone) ? general.timezone : "UTC", dateFormat: general.dateFormat });
    } catch {
      return "";
    }
  })();
  const twitterHandle = (seo.twitterHandle || "").replace(/^@?/, "@");
  const activeSection = SECTIONS.find((s) => s.id === active);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Site-wide configuration for the public website. Page copy and images live in{" "}
            <Link to="/admin/pages" className="font-semibold text-blue-700 hover:underline">Pages & Content</Link>.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {saved?.updatedAt && <span>Last saved {new Date(saved.updatedAt).toLocaleString()}</span>}
          <button
            type="button"
            onClick={() => {
              if (dirtySections.length && !window.confirm("Reload saved settings? Unsaved changes in every section will be lost.")) return;
              load();
            }}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Reload
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border text-sm ${conflict ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
          <span className="flex items-start gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {error}</span>
          {conflict && (
            <button type="button" onClick={load} className="shrink-0 px-3.5 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 cursor-pointer">
              Load latest settings
            </button>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-[16rem_minmax(0,1fr)] gap-6 items-start">
        {/* Section navigation */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 flex lg:flex-col gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const selected = s.id === active;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setActive(s.id);
                  setShowErrors(false);
                }}
                aria-current={selected ? "page" : undefined}
                className={`shrink-0 lg:w-full text-left flex items-center gap-3 px-3.5 py-2.5 lg:py-3 rounded-xl border transition-colors cursor-pointer ${
                  selected ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${selected ? "bg-white/15" : "bg-slate-100 text-slate-600"}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-2 text-sm font-semibold whitespace-nowrap">
                    {s.label}
                    {dirtySections.includes(s.id) && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" aria-label="Unsaved changes" />}
                  </span>
                  <span className={`hidden lg:block text-[11px] leading-snug mt-0.5 ${selected ? "text-slate-300" : "text-slate-500"}`}>{s.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Section content */}
        {loading || !draft ? (
          <div className="space-y-4 animate-pulse" aria-label="Loading settings">
            <div className="h-64 rounded-2xl bg-slate-200/70" />
            <div className="h-40 rounded-2xl bg-slate-200/70" />
          </div>
        ) : (
          <form onSubmit={save} noValidate className="space-y-6" aria-label={`${activeSection.label} settings`}>
            {active === "general" && (
              <>
                <Card
                  title="Publication identity"
                  description="Shown in the site header, browser tabs and emails."
                  aside={
                    <div className="hidden sm:flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#0B1B3D]" aria-hidden="true">
                      <span className="w-8 h-8 rounded-lg text-white text-xs font-black flex items-center justify-center" style={{ background: isHex(branding.brandBlue) ? branding.brandBlue : "#2563EB" }}>
                        {(general.siteName || "NN").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                      </span>
                      <span className="leading-tight">
                        <span className="block text-white text-xs font-bold">{general.siteName || "Site name"}</span>
                        <span className="block text-blue-200 text-[10px]">{general.tagline}</span>
                      </span>
                    </div>
                  }
                >
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field id="siteName" label="Site name" required error={fieldError("siteName")} count={general.siteName?.length || 0} max={100}>
                      <input id="siteName" aria-required="true" value={general.siteName || ""} maxLength={100} onChange={(e) => change("siteName", e.target.value)} className={inputClass(fieldError("siteName"))} aria-invalid={Boolean(fieldError("siteName"))} />
                    </Field>
                    <Field id="tagline" label="Tagline" hint="Appears under the logo." count={general.tagline?.length || 0} max={200}>
                      <input id="tagline" value={general.tagline || ""} maxLength={200} onChange={(e) => change("tagline", e.target.value)} className={inputClass()} />
                    </Field>
                  </div>
                  <Field id="description" label="Publication description" hint="A short summary of what you publish." count={general.description?.length || 0} max={1000}>
                    <textarea id="description" rows={3} value={general.description || ""} maxLength={1000} onChange={(e) => change("description", e.target.value)} className={inputClass()} />
                  </Field>
                </Card>

                <Card title="Public contact details" description="Shown in the footer and on the Contact page. Leave a field empty to hide it.">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field id="contactEmail" label="Email" error={fieldError("contactEmail")}>
                      <div className="relative">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input id="contactEmail" type="email" value={general.contactEmail || ""} onChange={(e) => change("contactEmail", e.target.value)} placeholder="newsroom@yourdomain.com" className={`${inputClass(fieldError("contactEmail"))} pl-10`} aria-invalid={Boolean(fieldError("contactEmail"))} />
                      </div>
                    </Field>
                    <Field id="contactPhone" label="Phone">
                      <div className="relative">
                        <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input id="contactPhone" type="tel" value={general.contactPhone || ""} maxLength={40} onChange={(e) => change("contactPhone", e.target.value)} className={`${inputClass()} pl-10`} />
                      </div>
                    </Field>
                  </div>
                  <Field id="address" label="Address" count={general.address?.length || 0} max={300}>
                    <div className="relative">
                      <MapPin size={15} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <textarea id="address" rows={2} value={general.address || ""} maxLength={300} onChange={(e) => change("address", e.target.value)} className={`${inputClass()} pl-10`} />
                    </div>
                  </Field>
                </Card>

                <Card title="Dates & time" description="Controls how publication dates appear on the public site.">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <Field id="timezone" label="Timezone" required error={fieldError("timezone")}>
                      <div className="relative">
                        <Globe2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input id="timezone" aria-required="true" list="timezone-options" value={general.timezone || ""} onChange={(e) => change("timezone", e.target.value)} className={`${inputClass(fieldError("timezone"))} pl-10`} aria-invalid={Boolean(fieldError("timezone"))} />
                        <datalist id="timezone-options">{TIMEZONES.map((tz) => <option key={tz} value={tz} />)}</datalist>
                      </div>
                    </Field>
                    <Field id="dateFormat" label="Date format">
                      <select id="dateFormat" value={general.dateFormat} onChange={(e) => change("dateFormat", e.target.value)} className={inputClass()}>
                        {DATE_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </Field>
                  </div>
                  {datePreview && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50/70 border border-blue-100 text-sm text-blue-900">
                      <CalendarDays size={16} className="text-blue-600" /> Today will display as <strong className="font-semibold">{datePreview}</strong>
                    </div>
                  )}
                </Card>
              </>
            )}

            {active === "branding" && (
              <>
                <Card title="Logo & favicon" description="Uploads are stored in the Media Library (Branding folder). The site changes when you save.">
                  <BrandAssetField
                    id="logo-upload"
                    label="Logo"
                    description="Replaces the initials badge in the navbar, footer and admin screens."
                    hint="PNG with a transparent background works best. Max 5 MB. Shown 40 px tall on dark backgrounds."
                    altText={`${general.siteName} logo`}
                    value={{ url: branding.logoUrl || "", mediaId: branding.logoMediaId || "" }}
                    onChange={({ url, mediaId }) => changeMany({ logoUrl: url, logoMediaId: mediaId })}
                  />
                  {branding.logoUrl && (
                    <Toggle
                      id="logoIncludesName"
                      label="My logo already includes the site name"
                      description="Hide the site name and tagline next to the logo so they aren't shown twice."
                      checked={Boolean(branding.logoIncludesName)}
                      disabled={saving}
                      onChange={(v) => change("logoIncludesName", v)}
                    />
                  )}
                  <div className="border-t border-slate-100" />
                  <BrandAssetField
                    id="favicon-upload"
                    label="Favicon"
                    square
                    description="The small icon in browser tabs, bookmarks and home-screen shortcuts."
                    hint="Square PNG, at least 180 × 180 px (512 × 512 recommended). Max 5 MB."
                    altText={`${general.siteName} favicon`}
                    value={{ url: branding.faviconUrl || "", mediaId: branding.faviconMediaId || "" }}
                    onChange={({ url, mediaId }) => changeMany({ faviconUrl: url, faviconMediaId: mediaId })}
                  />
                </Card>

                <Card title="Brand colours" description="Applied across the public site after saving.">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <ColorField id="primaryColor" label="Primary colour" hint="Footer background." value={branding.primaryColor || ""} error={fieldError("primaryColor")} onChange={(v) => change("primaryColor", v)} />
                    <ColorField id="brandBlue" label="Accent colour" hint="Logo badge (when no logo is uploaded)." value={branding.brandBlue || ""} error={fieldError("brandBlue")} onChange={(v) => change("brandBlue", v)} />
                  </div>
                </Card>

                <Card title="Preview" description="How your branding appears on the public site.">
                  <div className="space-y-3" style={{ "--brand-blue": isHex(branding.brandBlue) ? branding.brandBlue : "#2563EB" }}>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Navbar</span>
                      <div className="mt-1.5 px-5 py-4 rounded-xl bg-[#0B1B3D] flex items-center justify-between gap-4" data-testid="preview-navbar">
                        <BrandMark name={general.siteName} tagline={general.tagline} logoUrl={branding.logoUrl} logoIncludesName={branding.logoIncludesName} />
                        <span className="hidden sm:flex gap-4 text-xs text-blue-100/70"><span>Home</span><span>All Stories</span><span>Sports</span></span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Footer</span>
                      <div className="mt-1.5 px-5 py-5 rounded-xl" style={{ background: isHex(branding.primaryColor) ? branding.primaryColor : "#0B1B3A" }} data-testid="preview-footer">
                        <BrandMark name={general.siteName} tagline={general.tagline} logoUrl={branding.logoUrl} logoIncludesName={branding.logoIncludesName} />
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Browser tab</span>
                      <div className="mt-1.5 inline-flex items-center gap-2 max-w-full pl-3 pr-5 py-2 rounded-t-xl bg-slate-100 border border-b-0 border-slate-200">
                        <img src={branding.faviconUrl ? resizeImage(branding.faviconUrl, "w-64,h-64") : "/favicon.svg"} alt="" className="w-4 h-4 object-contain" />
                        <span className="text-xs text-slate-700 truncate">{seo.defaultMetaTitle || general.siteName}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {active === "publishing" && (
              <>
                <Card title="Editorial workflow" description="Newsroom policies for stories and reader comments.">
                  <Toggle id="requireEditorialApproval" label="Require editorial approval" description="Every story must be approved by an Editor before it can be published." checked disabled locked onChange={() => {}} />
                  <Toggle id="allowScheduledArticles" label="Allow scheduled publishing" description="Editors can schedule approved stories to go live at a set time." checked={Boolean(draft.publishing.allowScheduledArticles)} disabled={saving} onChange={(v) => change("allowScheduledArticles", v)} />
                  <div className="border-t border-slate-100" />
                  <Toggle id="enableComments" label="Accept reader comments" description="When off, comment forms are hidden on every article. Individual articles can also switch comments off." checked={Boolean(draft.publishing.enableComments)} disabled={saving} onChange={(v) => change("enableComments", v)} />
                  <Toggle id="moderateCommentsByDefault" label="Review comments before they appear" description="New comments wait in the moderation queue until approved." checked disabled locked onChange={() => {}} />
                  <p className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 rounded-xl px-3.5 py-3">
                    <Lock size={13} className="shrink-0 mt-0.5" /> Locked policies are required by the newsroom workflow and cannot be turned off.
                  </p>
                </Card>
                <Card title="Story archive" description="How many stories load at a time on All Stories and desk pages.">
                  <Field id="articlesPerPage" label="Stories per page" error={fieldError("articlesPerPage")}>
                    <div className="inline-flex items-center rounded-xl border border-slate-300 overflow-hidden">
                      <button type="button" aria-label="Fewer" onClick={() => change("articlesPerPage", Math.max(1, (draft.publishing.articlesPerPage || 1) - 1))} className="px-3 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer"><Minus size={14} /></button>
                      <input id="articlesPerPage" type="number" min={1} max={50} value={draft.publishing.articlesPerPage} onChange={(e) => change("articlesPerPage", e.target.value === "" ? "" : Number(e.target.value))} className="w-16 text-center py-2.5 text-sm font-semibold text-slate-900 focus:outline-none" aria-invalid={Boolean(fieldError("articlesPerPage"))} />
                      <button type="button" aria-label="More" onClick={() => change("articlesPerPage", Math.min(50, (Number(draft.publishing.articlesPerPage) || 0) + 1))} className="px-3 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-pointer"><Plus size={14} /></button>
                    </div>
                  </Field>
                </Card>
              </>
            )}

            {active === "seo" && (
              <>
                <Card title="Search defaults" description="Used on pages that don't set their own title and description.">
                  <Field id="defaultMetaTitle" label="Default page title" required error={fieldError("defaultMetaTitle")} count={seo.defaultMetaTitle?.length || 0} max={150} hint="Around 50–60 characters shows in full on Google.">
                    <input id="defaultMetaTitle" aria-required="true" value={seo.defaultMetaTitle || ""} maxLength={150} onChange={(e) => change("defaultMetaTitle", e.target.value)} className={inputClass(fieldError("defaultMetaTitle"))} aria-invalid={Boolean(fieldError("defaultMetaTitle"))} />
                  </Field>
                  <Field id="defaultMetaDescription" label="Default search description" count={seo.defaultMetaDescription?.length || 0} max={300} hint="Around 150–160 characters shows in full on Google.">
                    <textarea id="defaultMetaDescription" rows={3} value={seo.defaultMetaDescription || ""} maxLength={300} onChange={(e) => change("defaultMetaDescription", e.target.value)} className={inputClass()} />
                  </Field>
                  <Field id="twitterHandle" label="X (Twitter) handle" hint="Added to shared links so X credits your account.">
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">@</span>
                      <input id="twitterHandle" value={(seo.twitterHandle || "").replace(/^@/, "")} maxLength={99} onChange={(e) => change("twitterHandle", e.target.value.replace(/^@/, "").trim() ? `@${e.target.value.replace(/^@/, "").trim()}` : "")} placeholder="yourhandle" className={`${inputClass()} pl-8`} />
                    </div>
                  </Field>
                </Card>

                <Card title="Preview" description="Approximately how the homepage appears when searched and shared.">
                  <div className="p-4 rounded-xl border border-slate-200 bg-white">
                    <div className="text-xs text-slate-500 truncate">{window.location.host}</div>
                    <div className="text-lg text-[#1a0dab] leading-snug mt-0.5 line-clamp-1">{seo.defaultMetaTitle || "Page title"}</div>
                    <div className="text-sm text-slate-600 mt-1 line-clamp-2">{seo.defaultMetaDescription || "Add a description to control this snippet."}</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 overflow-hidden max-w-md">
                    <div className="h-28 bg-linear-to-br from-[#050B1F] via-[#0B1B3D] to-sky-700 flex items-center justify-center text-white font-serif-headline text-2xl font-bold">{general.siteName}</div>
                    <div className="p-3 bg-slate-50 border-t border-slate-200">
                      <div className="text-[11px] uppercase text-slate-500 truncate">{window.location.host}{seo.twitterHandle ? ` · ${twitterHandle}` : ""}</div>
                      <div className="text-sm font-semibold text-slate-900 line-clamp-1">{seo.defaultMetaTitle}</div>
                      <div className="text-xs text-slate-500 line-clamp-1">{seo.defaultMetaDescription}</div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {active === "social" && (
              <Card title="Social profiles" description="Each link you add appears in the site footer. Leave a field empty to hide it.">
                {SOCIAL.map((s) => {
                  const Icon = s.icon;
                  const value = draft.social[s.key] || "";
                  const err = fieldError(s.key);
                  return (
                    <Field key={s.key} id={`social-${s.key}`} label={s.label} error={err}>
                      <div className="flex items-center gap-2">
                        <span className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center"><Icon size={16} /></span>
                        <input id={`social-${s.key}`} type="url" value={value} onChange={(e) => change(s.key, e.target.value.trim())} placeholder={s.placeholder} className={inputClass(err)} aria-invalid={Boolean(err)} />
                        {value && !err && (
                          <a href={value} target="_blank" rel="noopener noreferrer" aria-label={`Open ${s.label} link`} className="w-11 h-11 shrink-0 rounded-xl border border-slate-300 text-slate-500 hover:text-blue-700 hover:border-blue-300 flex items-center justify-center">
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </div>
                    </Field>
                  );
                })}
              </Card>
            )}

            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>
                Email delivery and scheduler secrets are configured on the server. Change your password in{" "}
                <Link to="/admin/profile" className="font-semibold text-blue-700 hover:underline">Profile</Link>.
              </span>
            </p>

            {/* Sticky save bar */}
            <div
              className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl transition-all duration-200 ${
                isDirty ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6 pointer-events-none"
              }`}
              aria-hidden={!isDirty}
            >
              <div className="flex items-center justify-between gap-3 p-3 pl-5 rounded-2xl bg-slate-900 text-white shadow-2xl">
                <span className="text-sm">
                  Unsaved changes in <strong className="font-semibold">{activeSection.label}</strong>
                  {dirtySections.length > 1 && <span className="text-slate-400"> · {dirtySections.length - 1} other section{dirtySections.length > 2 ? "s" : ""}</span>}
                </span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={discard} disabled={saving} tabIndex={isDirty ? 0 : -1} className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-50 cursor-pointer">
                    Discard
                  </button>
                  <button type="submit" disabled={saving || conflict} tabIndex={isDirty ? 0 : -1} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-semibold disabled:opacity-50 cursor-pointer">
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
