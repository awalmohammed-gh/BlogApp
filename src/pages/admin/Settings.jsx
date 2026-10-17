import { useState } from "react";
import {
  Settings as SettingsIcon,
  Palette,
  FileText,
  Globe,
  Share2,
  Bell,
  ShieldAlert,
  Save,
  Check,
  Lock
} from "lucide-react";
import toast from "react-hot-toast";

import { useAdmin } from "../../context/admin/AdminContext";

export const Settings = () => {
  const { settings, updateSettings, categories, authors } = useAdmin();

  const [activeTab, setActiveTab] = useState("general");
  const [localSettings, setLocalSettings] = useState(settings);

  const handleUpdate = (section, field, value) => {
    setLocalSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleSaveSection = (section) => {
    updateSettings(section, localSettings[section]);
  };

  const tabs = [
    { id: "general", label: "General", icon: SettingsIcon },
    { id: "branding", label: "Branding & Appearance", icon: Palette },
    { id: "publishing", label: "Publishing Policies", icon: FileText },
    { id: "seo", label: "Search Engine Optimization", icon: Globe },
    { id: "social", label: "Social Media Accounts", icon: Share2 },
    { id: "notifications", label: "Notification Channels", icon: Bell },
    { id: "security", label: "Security & Access", icon: Lock }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Newsroom System Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Configure publication identity, newsroom editorial policies, branding parameters, and syndication defaults.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation Tabs (Col 3) */}
        <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-2 shadow-xs space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel (Col 9) */}
        <div className="md:col-span-9 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          {/* GENERAL SETTINGS */}
          {activeTab === "general" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  General Publication Details
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Primary publication identity and news bureau contact credentials.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Website Name
                  </label>
                  <input
                    type="text"
                    value={localSettings.general.siteName}
                    onChange={(e) => handleUpdate("general", "siteName", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Bureau Tagline
                  </label>
                  <input
                    type="text"
                    value={localSettings.general.tagline}
                    onChange={(e) => handleUpdate("general", "tagline", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Publication Mission Summary
                </label>
                <textarea
                  rows={3}
                  value={localSettings.general.description}
                  onChange={(e) => handleUpdate("general", "description", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Official Inquiries Email
                  </label>
                  <input
                    type="email"
                    value={localSettings.general.contactEmail}
                    onChange={(e) => handleUpdate("general", "contactEmail", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Newsroom Phone Hotline
                  </label>
                  <input
                    type="text"
                    value={localSettings.general.contactPhone}
                    onChange={(e) => handleUpdate("general", "contactPhone", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Physical Bureau Address
                </label>
                <input
                  type="text"
                  value={localSettings.general.address}
                  onChange={(e) => handleUpdate("general", "address", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Default Timezone
                  </label>
                  <select
                    value={localSettings.general.timezone}
                    onChange={(e) => handleUpdate("general", "timezone", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Africa/Accra (GMT+0)">Africa/Accra (GMT+0)</option>
                    <option value="Africa/Lagos (GMT+1)">Africa/Lagos (GMT+1)</option>
                    <option value="Africa/Nairobi (GMT+3)">Africa/Nairobi (GMT+3)</option>
                    <option value="Africa/Johannesburg (GMT+2)">Africa/Johannesburg (GMT+2)</option>
                    <option value="UTC">Universal Coordinated Time (UTC)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Date Display Format
                  </label>
                  <select
                    value={localSettings.general.dateFormat}
                    onChange={(e) => handleUpdate("general", "dateFormat", e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="MMMM D, YYYY">July 5, 2025</option>
                    <option value="DD/MM/YYYY">05/07/2025</option>
                    <option value="YYYY-MM-DD">2025-07-05</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection("general")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save General Settings</span>
                </button>
              </div>
            </div>
          )}

          {/* BRANDING SETTINGS */}
          {activeTab === "branding" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Branding & Visual Palette
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure corporate colors, logos, and public typography accents.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Primary Brand Color (Navy)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.branding.primaryColor}
                      onChange={(e) => handleUpdate("branding", "primaryColor", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-700">
                      {localSettings.branding.primaryColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Interactive Accent Blue
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={localSettings.branding.brandBlue}
                      onChange={(e) => handleUpdate("branding", "brandBlue", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                    />
                    <span className="font-mono text-xs text-slate-700">
                      {localSettings.branding.brandBlue}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Header Brand Lockup Preview
                </div>
                <div className="flex items-center gap-3 p-3 bg-[#0B1B3A] rounded-xl text-white max-w-sm">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
                    NF
                  </div>
                  <div>
                    <div className="font-bold text-sm">NewsFront</div>
                    <div className="text-[10px] text-slate-400">Newsroom Workspace</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection("branding")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Branding</span>
                </button>
              </div>
            </div>
          )}

          {/* PUBLISHING POLICIES */}
          {activeTab === "publishing" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Editorial & Publishing Policies
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage workflow approval gates, scheduled release rights, and default categorization.
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Require Senior Editorial Approval
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Authors cannot publish directly without editor sign-off
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.publishing.requireEditorialApproval}
                    onChange={(e) =>
                      handleUpdate("publishing", "requireEditorialApproval", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Allow Scheduled Post Automations
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Allow queues for morning editions and wire embargoes
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.publishing.allowScheduledArticles}
                    onChange={(e) =>
                      handleUpdate("publishing", "allowScheduledArticles", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Moderate Reader Comments by Default
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Hold reader comments in moderation queue before public display
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.publishing.moderateCommentsByDefault}
                    onChange={(e) =>
                      handleUpdate("publishing", "moderateCommentsByDefault", e.target.checked)
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Default Article Category
                  </label>
                  <select
                    value={localSettings.publishing.defaultCategory}
                    onChange={(e) =>
                      handleUpdate("publishing", "defaultCategory", e.target.value)
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Articles Displayed per Page
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="50"
                    value={localSettings.publishing.articlesPerPage}
                    onChange={(e) =>
                      handleUpdate("publishing", "articlesPerPage", Number(e.target.value))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection("publishing")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Publishing Rules</span>
                </button>
              </div>
            </div>
          )}

          {/* SEO SETTINGS */}
          {activeTab === "seo" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Search Engine Optimization (SEO) Defaults
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fallback metadata used across section directories and syndicated feeds.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Default Platform Meta Title
                </label>
                <input
                  type="text"
                  value={localSettings.seo.defaultMetaTitle}
                  onChange={(e) => handleUpdate("seo", "defaultMetaTitle", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Default Meta Description
                </label>
                <textarea
                  rows={3}
                  value={localSettings.seo.defaultMetaDescription}
                  onChange={(e) =>
                    handleUpdate("seo", "defaultMetaDescription", e.target.value)
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  X / Twitter Handle
                </label>
                <input
                  type="text"
                  value={localSettings.seo.twitterHandle}
                  onChange={(e) => handleUpdate("seo", "twitterHandle", e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection("seo")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save SEO Defaults</span>
                </button>
              </div>
            </div>
          )}

          {/* SOCIAL MEDIA */}
          {activeTab === "social" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Official Social Accounts & Feeds
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verify links for footer syndication and social author sharing.
                </p>
              </div>

              {["twitter", "facebook", "linkedin", "youtube", "instagram"].map((network) => (
                <div key={network}>
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                    {network} Profile
                  </label>
                  <input
                    type="url"
                    value={localSettings.social[network] || ""}
                    onChange={(e) => handleUpdate("social", network, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection("social")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Social Accounts</span>
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATION PREFERENCES */}
          {activeTab === "notifications" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Editorial Notification Preferences
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Choose which alerts send instant newsroom broadcast notifications.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  { id: "emailOnSubmission", label: "Email alerts on new story submissions" },
                  { id: "emailOnApproval", label: "Email alerts when stories are approved" },
                  { id: "emailOnComment", label: "Alert on reader comments requiring moderation" },
                  { id: "dailyDigest", label: "Send daily morning publishing digest" },
                  { id: "breakingNewsAlerts", label: "Send breaking news wire alerts" }
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-800">
                      {item.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={localSettings.notifications[item.id] || false}
                      onChange={(e) =>
                        handleUpdate("notifications", item.id, e.target.checked)
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSaveSection("notifications")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>Save Preferences</span>
                </button>
              </div>
            </div>
          )}

          {/* SECURITY & ACCESS (PHASE 19 REQUIREMENT: PROMINENTLY DISABLED / FUTURE INTEGRATION) */}
          {activeTab === "security" && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Security, Passwords & Authentication
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform access controls and credential encryption.
                </p>
              </div>

              {/* Requirement: These controls must be visibly marked as unavailable until backend authentication is implemented. */}
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
                <ShieldAlert size={20} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold">Backend Integration Pending</div>
                  <p className="leading-relaxed">
                    Live credential modification, cryptographic password hashing, session invalidation, and multi-factor authentication (2FA) require backend server infrastructure and are visibly disabled in this frontend prototype.
                  </p>
                </div>
              </div>

              <div className="space-y-4 opacity-50 pointer-events-none select-none">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    disabled
                    value="••••••••••••"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      disabled
                      placeholder="Minimum 12 characters"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500 block mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      disabled
                      placeholder="Re-enter password"
                      className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-700">
                      Two-Factor Authentication (2FA)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Enforce TOTP authenticator app verification upon login
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full">
                    Unavailable in Prototype
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
