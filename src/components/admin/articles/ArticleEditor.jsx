import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Save,
  Eye,
  Send,
  Calendar,
  CheckCircle,
  Clock,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Globe,
  Sparkles,
  Flame,
  Star,
  Tag as TagIcon,
  AlertCircle,
  Loader2,
  MessageSquare,
  ShieldAlert,
  History
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../../../context/admin/AuthContext";
import { articleService } from "../../../services/admin/articleService";
import { categoryService } from "../../../services/admin/categoryService";
import { tagService } from "../../../services/admin/tagService";
import { generateSlug } from "../../../utils/slugify";
import RichTextEditor from "../common/RichTextEditor";
import ImagePicker from "../common/ImagePicker";
import StatusBadge from "../common/StatusBadge";
import ArticlePreviewModal from "./ArticlePreviewModal";
import ArticleRevisionsModal from "../editorial/ArticleRevisionsModal";
import SubmitForReviewModal from "../editorial/SubmitForReviewModal";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

export const ArticleEditor = ({ initialData = null, isEditMode = false }) => {
  const { admin } = useAuth();
  const [showRevisionsModal, setShowRevisionsModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const navigate = useNavigate();

  const isAuthorRole = admin?.role === "author";
  // Public article URLs are served by this frontend at /blog-details/:slug
  const publicBaseUrl = `${window.location.origin}/blog-details/`;

  // The persisted MongoDB record this editor writes to. Set after the first
  // successful create so later saves update the same article instead of
  // creating duplicates; updatedAt guards against overwriting someone else's save.
  const [savedArticle, setSavedArticle] = useState({
    id: initialData?._id || null,
    status: initialData?.status || "draft",
    updatedAt: initialData?.updatedAt || null
  });

  // Active taxonomy states fetched from MongoDB
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    subTitle: initialData?.subTitle || "",
    slug: initialData?.slug || "",
    excerpt: initialData?.excerpt || "",
    description: initialData?.content || initialData?.description || "<p></p>",
    category:
      initialData?.category?._id ||
      initialData?.category?.id ||
      (typeof initialData?.category === "string" ? initialData.category : ""),
    author: initialData?.author?.name || admin?.name || "",
    image: initialData?.featuredImage?.url || initialData?.image || "",
    featuredImageData: initialData?.featuredImage || null,
    status: initialData?.status
      ? initialData.status === "published"
        ? "Published"
        : initialData.status === "pending_review"
        ? "Pending Review"
        : initialData.status === "scheduled"
        ? "Scheduled"
        : initialData.status === "archived"
        ? "Archived"
        : "Draft"
      : "Draft",
    scheduledFor: initialData?.scheduledAt
      ? new Date(new Date(initialData.scheduledAt).getTime() - new Date(initialData.scheduledAt).getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      : "",
    isFeatured: initialData?.isFeatured || false,
    isBreaking: initialData?.isBreakingNews || initialData?.isBreaking || false,
    commentsEnabled: initialData?.commentsEnabled !== false,
    imageAlt: initialData?.featuredImage?.alt || "",
    tags: Array.isArray(initialData?.tags)
      ? initialData.tags.map((t) => (typeof t === "object" ? t.name : t))
      : [],
    seo: {
      metaTitle: initialData?.seo?.metaTitle || "",
      metaDescription: initialData?.seo?.metaDescription || "",
      canonicalUrl: initialData?.seo?.canonicalUrl || "",
      ogTitle: initialData?.seo?.ogTitle || "",
      ogDescription: initialData?.seo?.ogDescription || "",
      ogImage: initialData?.seo?.ogImage || ""
    }
  });

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [seoOpen, setSeoOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch active categories and tags on mount
  useEffect(() => {
    let isMounted = true;
    const fetchTaxonomy = async () => {
      try {
        setLoadingTaxonomy(true);
        const [catRes, tagRes] = await Promise.all([
          categoryService.getActiveCategories(),
          tagService.getActiveTags()
        ]);

        if (isMounted) {
          // No category is pre-selected: the writer chooses one explicitly
          if (catRes?.success && Array.isArray(catRes.data)) {
            setCategories(catRes.data);
          }
          if (tagRes?.success && Array.isArray(tagRes.data)) {
            setAvailableTags(tagRes.data);
          }
        }
      } catch {
        // Handled silently
      } finally {
        if (isMounted) setLoadingTaxonomy(false);
      }
    };

    fetchTaxonomy();
    return () => {
      isMounted = false;
    };
  }, []);

  // Auto-generate slug when title changes unless manually edited
  useEffect(() => {
    if (!isSlugManuallyEdited && !isEditMode) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(prev.title)
      }));
    }
  }, [formData.title, isSlugManuallyEdited, isEditMode]);

  // Track dirty state
  const updateField = (field, value) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      [field]: value
    }));
    // Clear validation error for field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  // Add tag: only existing MongoDB tags can be attached (the API rejects unknown IDs)
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    const match = availableTags.find(
      (t) => t.name.toLowerCase() === trimmed.toLowerCase() || t.slug?.toLowerCase() === trimmed.toLowerCase()
    );
    if (!match) {
      toast.error(`"${trimmed}" is not an existing tag. Create it under Tags first.`);
      return;
    }
    if (formData.tags.some((t) => t.toLowerCase() === match.name.toLowerCase())) {
      toast.error("Tag already added");
      return;
    }
    updateField("tags", [...formData.tags, match.name]);
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove) => {
    updateField(
      "tags",
      formData.tags.filter((t) => t !== tagToRemove)
    );
  };

  // Map status name to backend enum
  const mapStatusToBackend = (statusStr) => {
    switch (statusStr?.toLowerCase()) {
      case "published":
        return "published";
      case "pending review":
      case "pending_review":
        return "pending_review";
      case "scheduled":
        return "scheduled";
      case "archived":
        return "archived";
      case "draft":
      default:
        return "draft";
    }
  };

  // Save / submit handler
  const handleSave = async (targetStatus = null) => {
    const finalStatusStr = targetStatus || formData.status;
    const finalStatusEnum = mapStatusToBackend(finalStatusStr);

    // Permission enforcement: Authors cannot publish directly
    if (isAuthorRole && finalStatusEnum === "published") {
      toast.error("Author accounts cannot publish directly. Please submit for review.");
      return;
    }

    // Client-side validation
    const clientValidation = articleService.validateArticle({
      title: formData.title,
      category: formData.category,
      content: formData.description,
      status: finalStatusEnum
    });

    if (!clientValidation.isValid) {
      setErrors(clientValidation.errors);
      toast.error("Please resolve the required fields before continuing.");
      return;
    }

    // Resolve tag IDs from availableTags if they match names or are already IDs
    const resolvedTagIds = formData.tags
      .map((tagText) => {
        const found = availableTags.find(
          (t) =>
            t._id === tagText ||
            t.name.toLowerCase() === tagText.toLowerCase() ||
            t.slug.toLowerCase() === tagText.toLowerCase()
        );
        return found ? found._id : null;
      })
      .filter(Boolean);

    // Resolve category ID
    let selectedCategoryId = formData.category;
    if (selectedCategoryId) {
      const foundCat = categories.find(
        (c) =>
          c._id === selectedCategoryId ||
          c.name.toLowerCase() === selectedCategoryId.toLowerCase()
      );
      if (foundCat) {
        selectedCategoryId = foundCat._id;
      }
    }

    const payload = {
      title: formData.title.trim(),
      subTitle: formData.subTitle?.trim() || "",
      slug: formData.slug?.trim() || undefined,
      excerpt: formData.excerpt?.trim() || "",
      // Stored HTML is restricted to safe formatting before it reaches the API
      content: sanitizeHtml(formData.description),
      category: selectedCategoryId || null,
      tags: resolvedTagIds,
      featuredImage: {
        media: formData.featuredImageData?.media?._id || formData.featuredImageData?.media || formData.featuredImageData?.mediaId || null,
        fileId: formData.featuredImageData?.fileId || "",
        url: formData.image || "",
        name: formData.featuredImageData?.name || "",
        width: formData.featuredImageData?.width || null,
        height: formData.featuredImageData?.height || null,
        alt: formData.imageAlt?.trim() || ""
      },
      status: finalStatusEnum,
      isFeatured: isAuthorRole ? false : Boolean(formData.isFeatured),
      isBreakingNews: isAuthorRole ? false : Boolean(formData.isBreaking),
      commentsEnabled: Boolean(formData.commentsEnabled),
      scheduledAt:
        finalStatusEnum === "scheduled" && formData.scheduledFor
          ? new Date(formData.scheduledFor).toISOString()
          : null,
      seo: {
        metaTitle: formData.seo.metaTitle || formData.title,
        metaDescription: formData.seo.metaDescription || formData.excerpt,
        canonicalUrl: formData.seo.canonicalUrl?.trim() || "",
        ogTitle: formData.seo.ogTitle?.trim() || "",
        ogDescription: formData.seo.ogDescription?.trim() || "",
        ogImage: formData.seo.ogImage?.trim() || ""
      }
    };

    if (finalStatusEnum === "scheduled" && !payload.scheduledAt) {
      setErrors((prev) => ({ ...prev, scheduledFor: "Choose a publication date and time." }));
      toast.error("Choose a publication date and time before scheduling.");
      return;
    }

    setIsSaving(true);
    let articleId = savedArticle.id;
    let persisted = false;
    try {
      // 1. Persist the content. The record stays a draft (or keeps its current
      //    state); publication only happens through the dedicated actions below.
      const existingStatus = savedArticle.status || "draft";
      const recordStatus = ["published", "scheduled", "pending_review"].includes(finalStatusEnum) || (finalStatusEnum === "draft" && existingStatus === "published") ? existingStatus : finalStatusEnum;
      const result = articleId
        ? await articleService.updateArticle(articleId, {
            ...payload,
            status: recordStatus,
            scheduledAt: initialData?.scheduledAt || null,
            ...(savedArticle.updatedAt ? { expectedUpdatedAt: savedArticle.updatedAt } : {})
          })
        : await articleService.createArticle({ ...payload, status: "draft", scheduledAt: null });
      articleId = result.data._id;
      persisted = true;
      setSavedArticle({ id: articleId, status: result.data.status, updatedAt: result.data.updatedAt });
      setIsDirty(false);

      // 2. Workflow action, if one was requested
      if (finalStatusEnum === "published") await articleService.publishArticle(articleId);
      else if (finalStatusEnum === "scheduled") await articleService.scheduleArticle(articleId, payload.scheduledAt);
      else if (finalStatusEnum === "pending_review" && existingStatus !== "pending_review") await articleService.submitArticle(articleId);

      if (finalStatusEnum === "draft") {
        toast.success("Draft saved.");
        // Open the saved record so a refresh reloads it from MongoDB
        if (!isEditMode) navigate(`/admin/articles/${articleId}/edit`, { replace: true });
      } else {
        toast.success(finalStatusEnum === "published" ? "Approved revision published." : finalStatusEnum === "scheduled" ? "Approved revision scheduled." : "Submitted for editorial review.");
        navigate("/admin/articles");
      }
    } catch (err) {
      if (err?.errors && typeof err.errors === "object") setErrors(err.errors);
      const message = err?.message || "Failed to save article";
      if (persisted) {
        // Content is safely stored; only the workflow step failed. Later saves update this same article.
        toast.error(`Your changes were saved, but the next step failed: ${message}`);
        if (!isEditMode) navigate(`/admin/articles/${articleId}/edit`, { replace: true });
      } else {
        toast.error(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/articles"
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Back to Articles"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {isEditMode ? "Edit Article" : "Create New Article"}
              </h1>
              <StatusBadge status={formData.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500">
              {isDirty ? (
                <span className="text-amber-600 font-medium">
                  &bull; Unsaved changes in active editor
                </span>
              ) : (
                "All changes synced with database"
              )}
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Eye size={14} className="text-blue-600" />
            <span>Live Preview</span>
          </button>

          {isEditMode && initialData?._id && (
            <button
              type="button"
              onClick={() => setShowRevisionsModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <History size={14} className="text-blue-600" />
              <span>Version History</span>
            </button>
          )}

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSave("Draft")}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              if (isEditMode && initialData?._id && !isDirty) {
                setShowSubmitModal(true);
              } else {
                handleSave("Pending Review");
              }
            }}
            className="px-3.5 py-2 text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send size={14} className="text-amber-600" />
            <span>Submit for Review</span>
          </button>

          {!isAuthorRole && (
            <button
              type="button"
              disabled={isSaving}
              onClick={() => handleSave("Published")}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCircle size={14} />
              )}
              <span>Publish Article</span>
            </button>
          )}
        </div>
      </div>

      {/* Changes Requested Banner from Editorial Desk */}
      {initialData?.editorialStatus === "changes_requested" && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-950 flex items-start gap-3 shadow-2xs">
          <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <div className="font-bold text-sm text-rose-900">
              Changes Requested by Editorial Desk
            </div>
            <p className="text-rose-800 leading-relaxed">
              The reviewing editor has requested corrections on this story. Please review your content, make the necessary updates, and click <strong>Submit for Review</strong> to create an updated version snapshot for clearance.
            </p>
          </div>
        </div>
      )}

      {/* Role Alert for Authors */}
      {isAuthorRole && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
          <ShieldAlert size={16} className="text-amber-600 shrink-0" />
          <span>
            You are drafting as an <strong>Author</strong>. Once your article is ready, submit it
            for review. An accredited Editor or Super Admin will verify and publish your story.
          </span>
        </div>
      )}

      {/* Two Column Layout on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Editor Canvas (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Article Title Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Article Headline <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-semibold ${
                    formData.title.length > 90
                      ? "text-rose-500"
                      : formData.title.length >= 40
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  {formData.title.length} / 100 characters
                </span>
              </div>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="Enter your article headline..."
                className={`w-full px-4 py-3 bg-slate-50/70 border rounded-xl text-base sm:text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all ${
                  errors.title ? "border-rose-400 ring-2 ring-rose-100" : "border-slate-300 focus:border-blue-600"
                }`}
              />
              {errors.title && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={13} /> {errors.title}
                </p>
              )}
            </div>

            {/* Subtitle / Decker */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Decker / Standfirst (Sub-headline)
              </label>
              <input
                type="text"
                value={formData.subTitle}
                onChange={(e) => updateField("subTitle", e.target.value)}
                placeholder="Brief secondary headline to provide context..."
                className="w-full px-3.5 py-2 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            {/* Slug Editor */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Permalink:</span>
                <span className="text-slate-400 truncate max-w-[45%]">{publicBaseUrl}</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => {
                    setIsSlugManuallyEdited(true);
                    updateField("slug", generateSlug(e.target.value));
                  }}
                  className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Article Excerpt */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Lead Excerpt / Summary
              </label>
              <span className="text-[11px] text-slate-400">
                {formData.excerpt.length} / 250 characters
              </span>
            </div>
            <textarea
              rows={3}
              value={formData.excerpt}
              onChange={(e) => updateField("excerpt", e.target.value)}
              placeholder="Provide a concise 2-3 sentence overview for wire syndication and homepage cards..."
              className="w-full p-3 bg-slate-50/70 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Main Rich Text Content Editor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Article Body Content <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Rich Text &bull; ImageKit Upload Integrated
              </span>
            </div>

            <RichTextEditor
              value={formData.description}
              onChange={(html) => updateField("description", html)}
            />
            {errors.content && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={13} /> {errors.content}
              </p>
            )}
            {errors.description && (
              <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                <AlertCircle size={13} /> {errors.description}
              </p>
            )}
          </div>

          {/* Collapsible SEO & Social Metadata */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => setSeoOpen((prev) => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-100/60 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Search Engine Optimization (SEO) & Social Graph
                </span>
              </div>
              {seoOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {seoOpen && (
              <div className="p-5 border-t border-slate-100 space-y-4 animate-fadeIn">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Custom SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={formData.seo.metaTitle || formData.title}
                    onChange={(e) =>
                      updateField("seo", { ...formData.seo, metaTitle: e.target.value })
                    }
                    placeholder="Headline optimized for Google search results..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Meta Description
                  </label>
                  <textarea
                    rows={2}
                    value={formData.seo.metaDescription || formData.excerpt}
                    onChange={(e) =>
                      updateField("seo", { ...formData.seo, metaDescription: e.target.value })
                    }
                    placeholder="Short summary under 160 characters for search engine snippets..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Canonical URL
                  </label>
                  <input
                    type="url"
                    value={formData.seo.canonicalUrl}
                    onChange={(e) => updateField("seo", { ...formData.seo, canonicalUrl: e.target.value })}
                    placeholder="Leave empty unless the original copy of this story lives at another URL"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Social Sharing (Open Graph)
                  </div>
                  <input
                    type="text"
                    value={formData.seo.ogTitle}
                    onChange={(e) => updateField("seo", { ...formData.seo, ogTitle: e.target.value })}
                    maxLength={100}
                    placeholder="Social title (defaults to the SEO title)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <textarea
                    rows={2}
                    value={formData.seo.ogDescription}
                    onChange={(e) => updateField("seo", { ...formData.seo, ogDescription: e.target.value })}
                    maxLength={300}
                    placeholder="Social description (defaults to the meta description)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <input
                    type="url"
                    value={formData.seo.ogImage}
                    onChange={(e) => updateField("seo", { ...formData.seo, ogImage: e.target.value })}
                    placeholder="Social image URL (defaults to the featured image)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>

                {/* Search result snippet preview */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Search Engine Result Preview
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-emerald-800 flex items-center gap-1">
                      <span className="truncate">{publicBaseUrl}{formData.slug || "article-slug"}</span>
                    </div>
                    <div className="text-sm font-semibold text-blue-800 hover:underline mt-0.5 cursor-pointer">
                      {formData.seo.metaTitle || formData.title || "Article headline"}
                    </div>
                    <div className="text-xs text-slate-600 mt-1 line-clamp-2">
                      {formData.seo.metaDescription || formData.excerpt || "Add an excerpt or meta description to control this snippet."}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Publishing Sidebar Controls (Col 4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Publishing Settings Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2">
              Publishing Controls
            </h3>

            {/* Status Select */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Article Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => updateField("status", e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              >
                <option value="Draft">Draft</option>
                <option value="Pending Review">Pending Review</option>
                {!isAuthorRole && <option value="Scheduled">Scheduled</option>}
                {!isAuthorRole && <option value="Published">Published</option>}
                {!isAuthorRole && <option value="Archived">Archived</option>}
              </select>
            </div>

            {/* Scheduled Date/Time if Scheduled */}
            {formData.status === "Scheduled" && !isAuthorRole && (
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-200 space-y-2">
                <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
                  <Calendar size={14} className="text-indigo-600" />
                  Scheduled Release Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => updateField("scheduledFor", e.target.value)}
                  className="w-full bg-white border border-indigo-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                {errors.scheduledFor && <p className="text-xs text-rose-600">{errors.scheduledFor}</p>}
              </div>
            )}

            {/* News Category */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Primary Category <span className="text-rose-500">*</span>
              </label>
              {loadingTaxonomy ? (
                <div className="p-2.5 text-xs text-slate-400 flex items-center gap-1.5">
                  <Loader2 size={13} className="animate-spin" /> Loading categories...
                </div>
              ) : categories.length === 0 ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                  <p className="font-semibold">No categories available</p>
                  <p className="text-[11px] text-amber-700">
                    {isAuthorRole ? (
                      "Ask an Editor to create a category before saving this article."
                    ) : (
                      <>
                        Create one before saving this article.{" "}
                        <Link to="/admin/categories" className="underline font-bold hover:text-amber-950">
                          Manage Categories
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              ) : (
                <select
                  value={formData.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                    errors.category ? "border-rose-400" : "border-slate-300 focus:border-blue-600"
                  }`}
                >
                  <option value="">-- Select Active Category --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.category && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={13} /> {errors.category}
                </p>
              )}
            </div>

            {/* Author Attribution */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Byline Author Attribution
              </label>
              <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-xs sm:text-sm font-medium text-slate-700">
                {formData.author} ({admin?.role ? admin.role.toUpperCase() : "STAFF"})
              </div>
            </div>

            {/* Reader comments */}
            <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-purple-500" />
                <div>
                  <div className="text-xs font-semibold text-slate-800">Comments Enabled</div>
                  <div className="text-[10px] text-slate-400">Allow reader comments (the site-wide setting also applies)</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.commentsEnabled}
                onChange={(e) => updateField("commentsEnabled", e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 h-4 w-4 cursor-pointer"
              />
            </label>

            {/* Editorial Toggles (Visible to Editors & Super Admins) */}
            {!isAuthorRole && (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                {/* Featured toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-amber-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Featured Story</div>
                      <div className="text-[10px] text-slate-400">Pin to prominent homepage grid</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => updateField("isFeatured", e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                </label>

                {/* Breaking News toggle */}
                <label className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Flame size={16} className="text-rose-500" />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">Breaking News Wire</div>
                      <div className="text-[10px] text-slate-400">Trigger top ticker banner</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isBreaking}
                    onChange={(e) => updateField("isBreaking", e.target.checked)}
                    className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4 cursor-pointer"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Featured Image Box (ImageKit) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <ImagePicker
              value={formData.image}
              onChange={(imgUrl, meta) => {
                updateField("image", imgUrl);
                if (meta) updateField("featuredImageData", meta);
                // Reuse the media library's alt text unless the writer already wrote one
                if (!imgUrl) updateField("imageAlt", "");
                else if (meta?.alt && !formData.imageAlt) updateField("imageAlt", meta.alt);
              }}
              label="Featured Image (ImageKit)"
            />
            {formData.image && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Featured Image Alt Text
                </label>
                <input
                  type="text"
                  value={formData.imageAlt}
                  onChange={(e) => updateField("imageAlt", e.target.value)}
                  maxLength={200}
                  placeholder="Describe the image for screen readers"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            )}
          </div>

          {/* Tags Box */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <TagIcon size={14} className="text-blue-600" /> Article Tags
            </h3>

            {/* Current Tags Chips */}
            <div className="flex flex-wrap gap-1.5 min-h-[36px]">
              {formData.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg border border-blue-200"
                >
                  <span>#{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-600 ml-1 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>

            {!loadingTaxonomy && availableTags.length === 0 && (
              <p className="text-[11px] text-slate-500">
                No tags available.{" "}
                {!isAuthorRole && (
                  <Link to="/admin/tags" className="text-blue-600 font-semibold hover:underline">
                    Create tags
                  </Link>
                )}
              </p>
            )}

            {/* Suggested / Available Tags Chips */}
            {availableTags.length > 0 && (
              <div className="pt-1">
                <span className="text-[11px] font-semibold text-slate-400 block mb-1.5">
                  Click to add from active tags:
                </span>
                <div className="flex flex-wrap gap-1">
                  {availableTags
                    .filter((t) => !formData.tags.includes(t.name))
                    .slice(0, 8)
                    .map((t) => (
                      <button
                        key={t._id}
                        type="button"
                        onClick={() => updateField("tags", [...formData.tags, t.name])}
                        className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-700 rounded-md transition-colors cursor-pointer"
                      >
                        +{t.name}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Add an existing tag by name */}
            <div className={`flex items-center gap-2 pt-2 border-t border-slate-100 ${availableTags.length === 0 ? "hidden" : ""}`}>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Type an existing tag & press enter..."
                className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Modal */}
      <ArticlePreviewModal
        article={{
          ...formData,
          category:
            categories.find((c) => c._id === formData.category)?.name || formData.category
        }}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />

      {/* Article Revisions Modal */}
      {isEditMode && initialData?._id && (
        <ArticleRevisionsModal
          isOpen={showRevisionsModal}
          onClose={() => setShowRevisionsModal(false)}
          articleId={initialData._id}
          onRestored={(restoredArticle) => {
            if (restoredArticle) {
              setFormData((prev) => ({
                ...prev,
                title: restoredArticle.title || prev.title,
                subTitle: restoredArticle.subTitle || prev.subTitle,
                excerpt: restoredArticle.excerpt || prev.excerpt,
                description: restoredArticle.content || prev.description
              }));
            }
          }}
        />
      )}

      {/* Submit For Review Modal */}
      {isEditMode && initialData?._id && (
        <SubmitForReviewModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          article={{ ...initialData, ...formData }}
          onSubmitted={() => {
            navigate("/admin/articles");
          }}
        />
      )}
    </div>
  );
};

export default ArticleEditor;
