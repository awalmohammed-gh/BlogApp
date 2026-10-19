import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Edit,
  ExternalLink,
  Search,
  CheckCircle,
  Clock,
  Eye,
  ShieldCheck,
  History,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  AlertCircle,
  X,
  Layers,
  ArrowRight,
  RefreshCw,
  FileCheck
} from "lucide-react";
import toast from "../../utils/toast";

import sitePageService from "../../services/admin/sitePageService";
import Modal from "../../components/admin/common/Modal";
import EmptyState from "../../components/admin/common/EmptyState";
import ImagePicker from "../../components/admin/common/ImagePicker";

export const PagesContent = () => {
  const [pages, setPages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Editor modal state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingPageKey, setEditingPageKey] = useState(null);
  const [pageData, setPageData] = useState(null);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Preview modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // Revisions history state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [isRevisionsLoading, setIsRevisionsLoading] = useState(false);
  const [historyPageKey, setHistoryPageKey] = useState(null);

  // Load pages from backend
  const fetchPages = async () => {
    try {
      setIsLoading(true);
      const res = await sitePageService.getPages();
      if (res.success && res.data) {
        setPages(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load website pages");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  // Filtered pages for search
  const filteredPages = pages.filter(
    (p) =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.pageKey?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open editor for a page
  const handleOpenEdit = async (pageKey) => {
    try {
      setEditingPageKey(pageKey);
      setIsPageLoading(true);
      setIsEditorOpen(true);

      const res = await sitePageService.getPageByKey(pageKey);
      if (res.success && res.data) {
        setPageData(res.data);
      } else {
        toast.error("Could not load page content details");
        setIsEditorOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch page content");
      setIsEditorOpen(false);
    } finally {
      setIsPageLoading(false);
    }
  };

  // Open preview for draft
  const handleOpenPreview = async (pageKey) => {
    try {
      setIsPreviewLoading(true);
      setIsPreviewOpen(true);
      const res = await sitePageService.previewDraft(pageKey);
      if (res.success && res.data) {
        setPreviewData(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate page preview");
      setIsPreviewOpen(false);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Open revision history
  const handleOpenHistory = async (pageKey) => {
    try {
      setHistoryPageKey(pageKey);
      setIsRevisionsLoading(true);
      setIsHistoryOpen(true);
      const res = await sitePageService.getRevisions(pageKey);
      if (res.success && res.data) {
        setRevisions(res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch revision history");
    } finally {
      setIsRevisionsLoading(false);
    }
  };

  // Restore revision
  const handleRestoreRevision = async (version) => {
    if (
      !window.confirm(
        `Restore Revision v${version}? This will load the historical revision into a new working draft for review and editing without overwriting the live website.`
      )
    ) {
      return;
    }

    try {
      const res = await sitePageService.restoreRevision(historyPageKey, version);
      if (res.success) {
        toast.success(res.message || `Revision v${version} restored as new working draft!`);
        setIsHistoryOpen(false);
        fetchPages();
        // Open the editor with the restored draft
        handleOpenEdit(historyPageKey);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore revision");
    }
  };

  // Update section data helper
  const handleSectionDataChange = (sectionIndex, field, value) => {
    setPageData((prev) => {
      const newSections = [...prev.sections];
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        data: {
          ...newSections[sectionIndex].data,
          [field]: value
        }
      };
      return { ...prev, sections: newSections };
    });
  };

  // Update SEO field helper
  const handleSeoChange = (field, value) => {
    setPageData((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo || {}),
        [field]: value
      }
    }));
  };

  // Save Draft
  const handleSaveDraft = async () => {
    try {
      setIsSavingDraft(true);
      const payload = {
        title: pageData.title,
        sections: pageData.sections,
        seo: pageData.seo,
        expectedWorkingVersion: pageData.workingRevision
      };

      const res = await sitePageService.saveDraft(editingPageKey, payload);
      if (res.success) {
        toast.success("Draft saved successfully to MongoDB!");
        setPageData((prev) => ({
          ...prev,
          workingRevision: res.data.workingRevision,
          updatedAt: res.data.updatedAt
        }));
        fetchPages();
      }
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error("Conflict: Another admin updated this page. Please refresh to load latest changes.");
      } else {
        toast.error(err.response?.data?.message || "Failed to save draft");
      }
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Publish to public website
  const handlePublish = async () => {
    if (
      !window.confirm(
        "Publish this page to the public website? The working draft will become the active public version visible to all readers immediately."
      )
    ) {
      return;
    }

    try {
      setIsPublishing(true);
      const payload = {
        changeSummary: `Published from Newsroom CMS dashboard at ${new Date().toLocaleTimeString()}`
      };

      const res = await sitePageService.publishPage(editingPageKey, payload);
      if (res.success) {
        toast.success("🎉 Page published to live website successfully!");
        setIsEditorOpen(false);
        fetchPages();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to publish page content");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Globe size={24} className="text-blue-600" />
            Website Content Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage editorial copy, promotional banners, hero imagery, and SEO metadata across public Nsemra News sections.
          </p>
        </div>
        <button
          onClick={fetchPages}
          disabled={isLoading}
          className="self-start sm:self-auto px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/90 shadow-2xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin text-blue-600" : ""} />
          <span>Refresh Pages</span>
        </button>
      </div>

      {/* Advisory Banner */}
      <div className="p-3.5 bg-blue-50/80 border border-blue-200/90 rounded-2xl flex items-center gap-3 text-xs text-blue-900">
        <ShieldCheck size={18} className="text-blue-600 shrink-0" />
        <span>
          <strong>Live MongoDB Integration:</strong> Content modifications are saved as working drafts before publishing. The public website renders only validated, published revisions.
        </span>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pages by name or slug..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            {pages.filter((p) => p.status === "published").length} Published Live
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            {pages.length} Total Pages
          </span>
        </div>
      </div>

      {/* Pages Cards Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">Loading managed website pages from MongoDB...</p>
        </div>
      ) : filteredPages.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Pages Found"
          description="No website pages matched your query. Click Refresh to reload from the database."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPages.map((page) => (
            <div
              key={page.pageKey}
              className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-100">
                    {page.slug}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 rounded-md">
                      v{page.publishedRevision || 1} live
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${
                        page.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {page.status}
                    </span>
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-3">{page.title}</h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  System Identifier: <code className="text-slate-700 font-mono">{page.pageKey}</code> • Sections: {page.sections?.length || "Configured"}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={11} /> Updated:{" "}
                    {new Date(page.updatedAt || page.publishedAt || Date.now()).toLocaleDateString()}
                  </span>
                  <span>Draft v{page.workingRevision || 1}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    to={page.slug}
                    target="_blank"
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    <span>View Live</span>
                    <ExternalLink size={12} />
                  </Link>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => handleOpenHistory(page.pageKey)}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-600 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <History size={12} />
                    <span>Revisions</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenPreview(page.pageKey)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Eye size={12} />
                    <span>Preview</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(page.pageKey)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit size={13} />
                    <span>Edit Content</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Page Content Editor Modal */}
      <Modal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={pageData ? `Edit Page: ${pageData.title}` : "Edit Page Content"}
        subtitle={pageData ? `Route: ${pageData.slug} | Working Draft v${pageData.workingRevision || 1}` : ""}
        maxWidth="max-w-4xl"
      >
        {isPageLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading structured section content...</p>
          </div>
        ) : pageData ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1 pr-2">
            {/* Meta & Route Banner */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Public Route:</span>{" "}
                <span className="font-mono font-bold text-blue-600">{pageData.slug}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">
                  Published:{" "}
                  <strong className="text-emerald-700">v{pageData.publishedRevision || 1}</strong>
                </span>
                <span className="text-slate-500">
                  Working Draft:{" "}
                  <strong className="text-amber-700">v{pageData.workingRevision || 1}</strong>
                </span>
              </div>
            </div>

            {/* General Page Title */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Internal Page Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={pageData.title || ""}
                onChange={(e) => setPageData((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Structured Sections */}
            <div className="space-y-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers size={14} className="text-blue-600" />
                Structured Page Sections ({pageData.sections?.length || 0})
              </h4>

              {pageData.sections?.map((section, idx) => (
                <div
                  key={section.id || idx}
                  className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-bold text-slate-800 uppercase bg-slate-100 px-2.5 py-0.5 rounded-md">
                        Section {idx + 1}: {section.type}
                      </span>
                      <span className="text-[11px] text-slate-400">ID: {section.id}</span>
                    </div>
                    <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={section.enabled !== false}
                        onChange={(e) => {
                          const updated = [...pageData.sections];
                          updated[idx] = { ...updated[idx], enabled: e.target.checked };
                          setPageData((prev) => ({ ...prev, sections: updated }));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  {/* HERO SECTION FIELDS */}
                  {section.type === "hero" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Hero Kicker / Tagline Badge
                        </label>
                        <input
                          type="text"
                          value={section.data?.kicker || ""}
                          onChange={(e) => handleSectionDataChange(idx, "kicker", e.target.value)}
                          placeholder="e.g. The Digital Frontline of African & Global Journalism"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Hero Headline (Main Title) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={section.data?.title || ""}
                          onChange={(e) => handleSectionDataChange(idx, "title", e.target.value)}
                          placeholder="e.g. Ghana and Beyond"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Hero Description Narrative
                        </label>
                        <textarea
                          rows={3}
                          value={section.data?.description || ""}
                          onChange={(e) => handleSectionDataChange(idx, "description", e.target.value)}
                          placeholder="Hero narrative displayed beneath the main headline..."
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Primary CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={section.data?.buttonText || ""}
                            onChange={(e) => handleSectionDataChange(idx, "buttonText", e.target.value)}
                            placeholder="e.g. Browse Stories"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Primary CTA Destination URL
                          </label>
                          <input
                            type="text"
                            value={section.data?.buttonUrl || ""}
                            onChange={(e) => handleSectionDataChange(idx, "buttonUrl", e.target.value)}
                            placeholder="e.g. #articles-section or /blog"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      {section.data?.secondaryButtonText !== undefined && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Secondary CTA Button Text
                            </label>
                            <input
                              type="text"
                              value={section.data?.secondaryButtonText || ""}
                              onChange={(e) =>
                                handleSectionDataChange(idx, "secondaryButtonText", e.target.value)
                              }
                              placeholder="e.g. Latest News Wire"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">
                              Secondary CTA Destination URL
                            </label>
                            <input
                              type="text"
                              value={section.data?.secondaryButtonUrl || ""}
                              onChange={(e) =>
                                handleSectionDataChange(idx, "secondaryButtonUrl", e.target.value)
                              }
                              placeholder="e.g. /blog"
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                          </div>
                        </div>
                      )}

                      {/* Hero ImagePicker */}
                      <div>
                        <ImagePicker
                          value={section.data?.bgImage || ""}
                          onChange={(url, mediaObj) => {
                            handleSectionDataChange(idx, "bgImage", url);
                            if (mediaObj?.mediaId) {
                              handleSectionDataChange(idx, "imageMediaId", mediaObj.mediaId);
                            }
                          }}
                          label="Hero Background Image (Media Library)"
                          helpText="Select an image from the Media Library or upload a new asset to ImageKit CDN"
                        />
                      </div>
                    </div>
                  )}

                  {/* PROMOTIONAL SECTION FIELDS */}
                  {section.type === "promotional" && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Promotion Tag
                          </label>
                          <input
                            type="text"
                            value={section.data?.tag || ""}
                            onChange={(e) => handleSectionDataChange(idx, "tag", e.target.value)}
                            placeholder="e.g. Commercial Partner Feature"
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Headline Title
                          </label>
                          <input
                            type="text"
                            value={section.data?.title || ""}
                            onChange={(e) => handleSectionDataChange(idx, "title", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Promotion Description Copy
                        </label>
                        <textarea
                          rows={3}
                          value={section.data?.description || ""}
                          onChange={(e) => handleSectionDataChange(idx, "description", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            CTA Button Text
                          </label>
                          <input
                            type="text"
                            value={section.data?.buttonText || ""}
                            onChange={(e) => handleSectionDataChange(idx, "buttonText", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            CTA Destination URL
                          </label>
                          <input
                            type="text"
                            value={section.data?.buttonUrl || ""}
                            onChange={(e) => handleSectionDataChange(idx, "buttonUrl", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NEWSLETTER SECTION FIELDS */}
                  {section.type === "newsletter" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Newsletter Headline
                        </label>
                        <input
                          type="text"
                          value={section.data?.title || ""}
                          onChange={(e) => handleSectionDataChange(idx, "title", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Newsletter Description
                        </label>
                        <textarea
                          rows={2}
                          value={section.data?.description || ""}
                          onChange={(e) => handleSectionDataChange(idx, "description", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Subscribe Button Label
                        </label>
                        <input
                          type="text"
                          value={section.data?.buttonText || ""}
                          onChange={(e) => handleSectionDataChange(idx, "buttonText", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* TEXT CONTENT / MISSION / VISION FIELDS */}
                  {section.type === "text_content" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Section Title
                        </label>
                        <input
                          type="text"
                          value={section.data?.title || ""}
                          onChange={(e) => handleSectionDataChange(idx, "title", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      {section.data?.subtitle !== undefined && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Section Subtitle / Narrative
                          </label>
                          <input
                            type="text"
                            value={section.data?.subtitle || ""}
                            onChange={(e) => handleSectionDataChange(idx, "subtitle", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Body Text Content
                        </label>
                        <textarea
                          rows={4}
                          value={section.data?.body || ""}
                          onChange={(e) => handleSectionDataChange(idx, "body", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  )}

                  {/* CONTACT SECTION FIELDS */}
                  {section.type === "contact" && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Bureau Address
                        </label>
                        <input
                          type="text"
                          value={section.data?.address || ""}
                          onChange={(e) => handleSectionDataChange(idx, "address", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Public Email
                          </label>
                          <input
                            type="email"
                            value={section.data?.email || ""}
                            onChange={(e) => handleSectionDataChange(idx, "email", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1">
                            Public Phone
                          </label>
                          <input
                            type="text"
                            value={section.data?.phone || ""}
                            onChange={(e) => handleSectionDataChange(idx, "phone", e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Bureau Hours / Response Time
                        </label>
                        <input
                          type="text"
                          value={section.data?.hours || ""}
                          onChange={(e) => handleSectionDataChange(idx, "hours", e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* SEO Settings Section */}
            <div className="pt-2 border-t border-slate-200/80 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Globe size={14} className="text-blue-600" />
                Page SEO & OpenGraph Meta Tags
              </h4>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  SEO Meta Title
                </label>
                <input
                  type="text"
                  value={pageData.seo?.metaTitle || ""}
                  onChange={(e) => handleSeoChange("metaTitle", e.target.value)}
                  placeholder="e.g. Nsemra News | Ghana, Africa & World News"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  value={pageData.seo?.metaDescription || ""}
                  onChange={(e) => handleSeoChange("metaDescription", e.target.value)}
                  placeholder="Meta description for search engine listings..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleOpenPreview(editingPageKey)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Eye size={14} />
                <span>Preview Changes</span>
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft || isPublishing}
                  className="px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSavingDraft ? "Saving..." : "Save Working Draft"}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={isSavingDraft || isPublishing}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} />
                  <span>{isPublishing ? "Publishing..." : "Publish to Live Site"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title={previewData ? `Preview: ${previewData.title}` : "Draft Content Preview"}
        subtitle="Live layout preview of working draft before publishing"
        maxWidth="max-w-4xl"
      >
        {isPreviewLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Generating layout preview...</p>
          </div>
        ) : previewData ? (
          <div className="space-y-6 max-h-[75vh] overflow-y-auto px-1">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Draft Preview Notice:</strong> This preview reflects working draft v{previewData.workingRevision || 1}. Public readers currently see published version v{previewData.publishedRevision || 1}.
              </span>
            </div>

            {/* Render Preview Sections */}
            {previewData.sections?.map((sec, i) => (
              <div
                key={sec.id || i}
                className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 p-6 space-y-4"
              >
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Section Type: {sec.type}
                </div>

                {sec.type === "hero" && (
                  <div className="space-y-3">
                    {sec.data?.kicker && (
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-1 rounded">
                        {sec.data.kicker}
                      </span>
                    )}
                    <h2 className="text-2xl font-bold text-slate-900">{sec.data?.title}</h2>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                      {sec.data?.description}
                    </p>
                    <div className="flex gap-3 pt-2">
                      {sec.data?.buttonText && (
                        <span className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold">
                          {sec.data.buttonText}
                        </span>
                      )}
                      {sec.data?.secondaryButtonText && (
                        <span className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold">
                          {sec.data.secondaryButtonText}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {sec.type === "promotional" && (
                  <div className="space-y-2 bg-white p-5 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
                      {sec.data?.tag}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900">{sec.data?.title}</h3>
                    <p className="text-xs text-slate-600">{sec.data?.description}</p>
                    {sec.data?.buttonText && (
                      <div className="pt-2">
                        <span className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                          {sec.data.buttonText}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {sec.type === "newsletter" && (
                  <div className="bg-blue-600 text-white p-5 rounded-xl space-y-2">
                    <h3 className="text-lg font-bold">{sec.data?.title}</h3>
                    <p className="text-xs text-blue-100">{sec.data?.description}</p>
                    <div className="pt-2">
                      <span className="px-3 py-1.5 bg-white text-blue-600 rounded-lg text-xs font-semibold">
                        {sec.data?.buttonText}
                      </span>
                    </div>
                  </div>
                )}

                {sec.type === "text_content" && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-slate-900">{sec.data?.title}</h3>
                    {sec.data?.subtitle && (
                      <p className="text-xs font-semibold text-blue-600">{sec.data.subtitle}</p>
                    )}
                    <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                      {sec.data?.body}
                    </p>
                  </div>
                )}

                {sec.type === "contact" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <strong>Address:</strong> {sec.data?.address}
                    </div>
                    <div>
                      <strong>Email:</strong> {sec.data?.email}
                    </div>
                    <div>
                      <strong>Phone:</strong> {sec.data?.phone}
                    </div>
                    <div>
                      <strong>Hours:</strong> {sec.data?.hours}
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Revision History Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Immutable Revision History"
        subtitle={`Page: ${historyPageKey} | Audit trail of previous published revisions`}
        maxWidth="max-w-2xl"
      >
        {isRevisionsLoading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading revision snapshots from MongoDB...</p>
          </div>
        ) : revisions.length === 0 ? (
          <EmptyState
            icon={History}
            title="No Revisions Found"
            description="No historical revisions have been recorded for this page yet."
          />
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {revisions.map((rev) => (
              <div
                key={rev._id}
                className="bg-white border border-slate-200/90 rounded-xl p-4 flex items-center justify-between hover:border-slate-300 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      Version {rev.version}
                    </span>
                    <span className="text-xs text-slate-700 font-medium">
                      {rev.changeSummary || "Website publication snapshot"}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    <span>Published: {new Date(rev.createdAt).toLocaleString()}</span>
                    <span>By: {rev.createdBy?.name || rev.createdBy?.email || "Super Admin"}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRestoreRevision(rev.version)}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Restore to Draft</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PagesContent;
