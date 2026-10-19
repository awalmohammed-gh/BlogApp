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
  Flame,
  Star,
  Tag as TagIcon,
  AlertCircle,
  Loader2,
  MessageSquare,
  ShieldAlert,
  History,
  Check,
  Circle,
  FilePenLine,
  Image as ImageIcon,
  Link as LinkIcon,
  Plus,
  Settings2,
  X,
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
import StaffAvatar from "../common/StaffAvatar";

const fieldClass =
  "w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-50 disabled:text-slate-400";
const cardClass = "overflow-hidden rounded-[22px] border border-slate-200/80 bg-white shadow-xs";
const fieldError = (value) => (Array.isArray(value) ? value.join(" ") : value);

function EditorToggle({ label, description, icon, checked, onChange }) {
  const Icon = icon;
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-3">
      <span className="flex min-w-0 items-start gap-2.5">
        <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
        <span>
          <span className="block text-xs font-semibold text-slate-700">{label}</span>
          <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">
            {description}
          </span>
        </span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-5 w-9 shrink-0 rounded-full bg-slate-200 transition peer-checked:bg-blue-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      />
    </label>
  );
}

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
    updatedAt: initialData?.updatedAt || null,
  });

  // Active taxonomy states fetched from MongoDB
  const [categories, setCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTaxonomy, setLoadingTaxonomy] = useState(true);
  const [taxonomyError, setTaxonomyError] = useState("");
  const [taxonomyReload, setTaxonomyReload] = useState(0);

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
      ? new Date(
          new Date(initialData.scheduledAt).getTime() -
            new Date(initialData.scheduledAt).getTimezoneOffset() * 60000
        )
          .toISOString()
          .slice(0, 16)
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
      ogImage: initialData?.seo?.ogImage || "",
    },
  });

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [seoOpen, setSeoOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  // Fetch active categories and tags on mount
  useEffect(() => {
    let isMounted = true;
    const fetchTaxonomy = async () => {
      try {
        setLoadingTaxonomy(true);
        const [catRes, tagRes] = await Promise.all([
          categoryService.getActiveCategories(),
          tagService.getActiveTags(),
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
      } catch (error) {
        if (isMounted) setTaxonomyError(error.message || "Story settings could not be loaded.");
      } finally {
        if (isMounted) setLoadingTaxonomy(false);
      }
    };

    fetchTaxonomy();
    return () => {
      isMounted = false;
    };
  }, [taxonomyReload]);

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  // Track dirty state
  const updateField = (field, value) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "title" && !isSlugManuallyEdited && !isEditMode
        ? { slug: generateSlug(value) }
        : {}),
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
      (t) =>
        t.name.toLowerCase() === trimmed.toLowerCase() ||
        t.slug?.toLowerCase() === trimmed.toLowerCase()
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
    if (isUploadingCover) {
      toast.error("Wait for your cover image to finish uploading.");
      return;
    }
    setErrors({});
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
      status: finalStatusEnum,
      scheduledFor: formData.scheduledFor,
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
          c._id === selectedCategoryId || c.name.toLowerCase() === selectedCategoryId.toLowerCase()
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
        media:
          formData.featuredImageData?.media?._id ||
          formData.featuredImageData?.media ||
          formData.featuredImageData?.mediaId ||
          null,
        fileId: formData.featuredImageData?.fileId || "",
        url: formData.image || "",
        name: formData.featuredImageData?.name || "",
        width: formData.featuredImageData?.width || null,
        height: formData.featuredImageData?.height || null,
        alt: formData.imageAlt?.trim() || "",
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
        metaTitle: formData.seo.metaTitle || formData.title.slice(0, 100),
        metaDescription: formData.seo.metaDescription || formData.excerpt.slice(0, 300),
        canonicalUrl: formData.seo.canonicalUrl?.trim() || "",
        ogTitle: formData.seo.ogTitle?.trim() || "",
        ogDescription: formData.seo.ogDescription?.trim() || "",
        ogImage: formData.seo.ogImage?.trim() || "",
      },
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
      const recordStatus =
        ["published", "scheduled", "pending_review"].includes(finalStatusEnum) ||
        (finalStatusEnum === "draft" && existingStatus === "published")
          ? existingStatus
          : finalStatusEnum;
      const result = articleId
        ? await articleService.updateArticle(articleId, {
            ...payload,
            status: recordStatus,
            scheduledAt: initialData?.scheduledAt || null,
            ...(savedArticle.updatedAt ? { expectedUpdatedAt: savedArticle.updatedAt } : {}),
          })
        : await articleService.createArticle({ ...payload, status: "draft", scheduledAt: null });
      articleId = result.data._id;
      persisted = true;
      setSavedArticle({
        id: articleId,
        status: result.data.status,
        updatedAt: result.data.updatedAt,
      });
      setIsDirty(false);

      // 2. Workflow action, if one was requested
      if (finalStatusEnum === "published") await articleService.publishArticle(articleId);
      else if (finalStatusEnum === "scheduled")
        await articleService.scheduleArticle(articleId, payload.scheduledAt);
      else if (finalStatusEnum === "pending_review" && existingStatus !== "pending_review")
        await articleService.submitArticle(articleId);

      if (finalStatusEnum === "draft") {
        toast.success("Draft saved.");
        // Open the saved record so a refresh reloads it from MongoDB
        if (!isEditMode) navigate(`/admin/articles/${articleId}/edit`, { replace: true });
      } else {
        toast.success(
          finalStatusEnum === "published"
            ? "Approved revision published."
            : finalStatusEnum === "scheduled"
              ? "Approved revision scheduled."
              : finalStatusEnum === "archived"
                ? "Article archived."
                : "Submitted for editorial review."
        );
        navigate("/admin/articles");
      }
    } catch (err) {
      if (err?.errors && typeof err.errors === "object") setErrors(err.errors);
      const message = err?.message || "Failed to save article";
      setErrors((prev) => ({ ...prev, save: message }));
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

  const plainText = formData.description
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;
  const essentials = [
    { label: "A clear headline", complete: formData.title.trim().length >= 5 },
    { label: "A news category", complete: Boolean(formData.category) },
    { label: "Your story content", complete: Boolean(plainText) },
  ];
  const submitForReview = () => {
    if (isEditMode && initialData?._id && !isDirty) setShowSubmitModal(true);
    else handleSave("Pending Review");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header>
        <Link
          to="/admin/articles"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-blue-600"
        >
          <ArrowLeft size={13} />
          All articles
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">
              The editorial workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-[34px]">
              {isEditMode ? "Shape your story" : "Create an article"}
              <span className="text-blue-600">.</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Start with a great headline. Bring the story to life.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
            <FilePenLine size={14} />
            {wordCount} words<span className="mx-1 text-slate-200">/</span>
            {Math.max(1, Math.ceil(wordCount / 200))} min read
          </span>
        </div>
      </header>

      <div className="sticky top-16 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-md sm:px-5">
        <div className="flex items-center gap-3">
          <StatusBadge status={savedArticle.status} size="sm" />
          <span
            role="status"
            className={`text-[11px] ${isDirty ? "text-amber-600" : "text-slate-400"}`}
          >
            {isSaving
              ? "Saving your story…"
              : isDirty
                ? "Unsaved changes"
                : savedArticle.id
                  ? "All changes saved"
                  : "Not saved yet"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <Eye size={14} />
            Preview
          </button>
          {isEditMode && initialData?._id && (
            <button
              type="button"
              aria-label="Version history"
              title="Version history"
              onClick={() => setShowRevisionsModal(true)}
              className="rounded-xl p-2.5 text-slate-500 hover:bg-slate-50 hover:text-blue-600"
            >
              <History size={15} />
            </button>
          )}
          <button
            type="button"
            disabled={isSaving || isUploadingCover}
            onClick={() => handleSave("Draft")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
            draft
          </button>
          <button
            type="button"
            disabled={isSaving || isUploadingCover}
            onClick={submitForReview}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-blue-700 disabled:opacity-50"
          >
            <Send size={13} />
            Submit for review
          </button>
        </div>
      </div>

      {errors.save && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs text-rose-700"
        >
          <AlertCircle size={15} className="shrink-0" />
          {fieldError(errors.save)}
        </div>
      )}
      {initialData?.editorialStatus === "changes_requested" && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
          <AlertCircle size={17} className="shrink-0" />
          <div>
            <p className="mb-1 font-bold">Your editor has requested changes</p>Review the feedback,
            update your story, then submit it for another review.
          </div>
        </div>
      )}
      {isAuthorRole && (
        <p className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-relaxed text-blue-800">
          <ShieldAlert size={15} className="shrink-0" />
          Save your work as a draft, then submit it for editorial review when it is ready.
        </p>
      )}

      <fieldset
        disabled={isSaving}
        className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
      >
        <div className="min-w-0 space-y-5">
          <section className={cardClass} aria-labelledby="story-canvas-title">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
              <h2
                id="story-canvas-title"
                className="flex items-center gap-2 text-xs font-semibold text-slate-700"
              >
                <FilePenLine size={14} className="text-blue-600" />
                Your story
              </h2>
              <span className="text-[10px] text-slate-400">Make every word count.</span>
            </div>
            <fieldset disabled={isSaving} className="min-w-0 px-5 pb-6 pt-6 sm:px-7 sm:pt-7">
              <label
                htmlFor="article-title"
                className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400"
              >
                Headline <span className="text-blue-600">*</span>
              </label>
              <textarea
                id="article-title"
                rows={2}
                maxLength={200}
                value={formData.title}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Give your story a headline…"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "article-title-error" : undefined}
                className="mt-3 block min-h-24 w-full resize-y border-0 bg-transparent text-2xl font-bold leading-tight tracking-tight text-slate-900 outline-none placeholder:text-slate-300 focus:placeholder:text-slate-200 sm:text-[32px]"
              />
              {errors.title && (
                <p id="article-title-error" className="mt-2 text-xs text-rose-600">
                  {fieldError(errors.title)}
                </p>
              )}
              <label htmlFor="article-subtitle" className="sr-only">
                Subtitle
              </label>
              <textarea
                id="article-subtitle"
                rows={2}
                maxLength={300}
                value={formData.subTitle}
                onChange={(event) => updateField("subTitle", event.target.value)}
                placeholder="Add a subtitle to give readers a little more context (optional)"
                className="mt-3 block w-full resize-y border-0 bg-transparent text-sm leading-relaxed text-slate-500 outline-none placeholder:text-slate-400 sm:text-base"
              />
              {errors.subTitle && (
                <p role="alert" className="mt-2 text-xs text-rose-600">
                  {fieldError(errors.subTitle)}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <span className="inline-flex min-w-0 max-w-full items-start gap-1.5 text-[10px] text-slate-400">
                  <LinkIcon size={11} className="mt-0.5 shrink-0" />
                  <span className="min-w-0 break-all">
                    {formData.slug
                      ? `/blog-details/${formData.slug}`
                      : "Your story URL will appear here"}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400">{formData.title.length}/200</span>
              </div>
            </fieldset>
            <div aria-labelledby="article-body-title" className="border-t border-slate-100">
              <h3 id="article-body-title" className="sr-only">
                Article body
              </h3>
              <fieldset disabled={isSaving} className="min-w-0">
                <RichTextEditor
                  value={formData.description}
                  onChange={(html) => updateField("description", html)}
                  placeholder="Tell the story. Start writing here…"
                  documentStyle
                  disabled={isSaving}
                />
              </fieldset>
            </div>
            {(errors.content || errors.description) && (
              <p id="article-body-error" role="alert" className="px-5 py-3 text-xs text-rose-600">
                {fieldError(errors.content || errors.description)}
              </p>
            )}
          </section>

          <section className={`${cardClass} p-5 sm:p-6`} aria-labelledby="article-summary-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 id="article-summary-title" className="text-sm font-semibold text-slate-800">
                <label htmlFor="article-excerpt">Story summary</label>
              </h2>
              <span className="text-[10px] text-slate-400">{formData.excerpt.length}/600</span>
            </div>
            <p id="article-excerpt-help" className="mb-4 text-xs leading-relaxed text-slate-500">
              A short introduction for your homepage cards and search results.
            </p>
            <textarea
              id="article-excerpt"
              rows={3}
              maxLength={600}
              value={formData.excerpt}
              onChange={(event) => updateField("excerpt", event.target.value)}
              placeholder="Capture the heart of the story in a sentence or two…"
              aria-describedby="article-excerpt-help"
              className={`${fieldClass} resize-y leading-relaxed`}
            />
            {errors.excerpt && (
              <p role="alert" className="mt-2 text-xs text-rose-600">
                {fieldError(errors.excerpt)}
              </p>
            )}
          </section>

          <section className={cardClass} aria-labelledby="article-seo-title">
            <button
              type="button"
              onClick={() => setSeoOpen((open) => !open)}
              aria-expanded={seoOpen}
              aria-controls="article-seo-panel"
              className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-6"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Globe size={16} />
                </span>
                <span>
                  <h2 id="article-seo-title" className="text-sm font-semibold text-slate-800">
                    Search & social
                  </h2>
                  <span className="mt-1 block text-xs text-slate-400">
                    Fine-tune how your story is discovered.
                  </span>
                </span>
              </span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-slate-400 transition-transform ${seoOpen ? "rotate-180" : ""}`}
              />
            </button>
            {seoOpen && (
              <div
                id="article-seo-panel"
                className="space-y-5 border-t border-slate-100 px-5 py-6 sm:px-6"
              >
                <div>
                  <label
                    htmlFor="article-slug"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    URL slug
                  </label>
                  <input
                    id="article-slug"
                    value={formData.slug}
                    maxLength={250}
                    onChange={(event) => {
                      setIsSlugManuallyEdited(true);
                      updateField("slug", generateSlug(event.target.value));
                    }}
                    className={`${fieldClass} font-mono text-xs`}
                  />
                  <p className="mt-2 break-all text-[10px] text-slate-400">
                    {publicBaseUrl}
                    {formData.slug}
                  </p>
                  {errors.slug && (
                    <p role="alert" className="mt-2 text-xs text-rose-600">
                      {fieldError(errors.slug)}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="article-meta-title"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    SEO title
                  </label>
                  <input
                    id="article-meta-title"
                    maxLength={100}
                    value={formData.seo.metaTitle}
                    placeholder={formData.title || "Uses your headline by default"}
                    onChange={(event) =>
                      updateField("seo", { ...formData.seo, metaTitle: event.target.value })
                    }
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label
                    htmlFor="article-meta-description"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Meta description
                  </label>
                  <textarea
                    id="article-meta-description"
                    rows={3}
                    maxLength={300}
                    value={formData.seo.metaDescription}
                    placeholder={formData.excerpt || "Uses your story summary by default"}
                    onChange={(event) =>
                      updateField("seo", { ...formData.seo, metaDescription: event.target.value })
                    }
                    className={fieldClass}
                  />
                  <p className="mt-2 text-[10px] text-slate-400">
                    Aim for around 160 characters for a concise search snippet.
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="article-canonical"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Canonical URL <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <input
                    id="article-canonical"
                    type="url"
                    value={formData.seo.canonicalUrl}
                    onChange={(event) =>
                      updateField("seo", { ...formData.seo, canonicalUrl: event.target.value })
                    }
                    placeholder="https://…"
                    className={fieldClass}
                  />
                  <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
                    Only needed if the original story was published elsewhere.
                  </p>
                </div>
                <div className="space-y-4 border-t border-slate-100 pt-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
                    Social sharing
                  </p>
                  {[
                    {
                      key: "ogTitle",
                      label: "Social title",
                      maxLength: 100,
                      placeholder: "Uses the SEO title by default",
                    },
                    {
                      key: "ogDescription",
                      label: "Social description",
                      maxLength: 300,
                      placeholder: "Uses the meta description by default",
                    },
                    {
                      key: "ogImage",
                      label: "Social image URL",
                      placeholder: "Uses the cover image by default",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={`article-${field.key}`}
                        className="mb-2 block text-xs font-semibold text-slate-700"
                      >
                        {field.label}
                      </label>
                      <input
                        id={`article-${field.key}`}
                        type={field.key === "ogImage" ? "url" : "text"}
                        maxLength={field.maxLength}
                        value={formData.seo[field.key]}
                        placeholder={field.placeholder}
                        onChange={(event) =>
                          updateField("seo", { ...formData.seo, [field.key]: event.target.value })
                        }
                        className={fieldClass}
                      />
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="mb-3 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                    Search preview
                  </p>
                  <p className="break-all text-[11px] text-emerald-700">
                    {publicBaseUrl}
                    {formData.slug || "your-story"}
                  </p>
                  <p className="mt-1 break-words text-lg font-medium leading-snug text-blue-800">
                    {formData.seo.metaTitle || formData.title || "Your article headline"}
                  </p>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-500">
                    {formData.seo.metaDescription ||
                      formData.excerpt ||
                      "Your story summary will appear here."}
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5" aria-label="Story settings">
          <section className={cardClass} aria-labelledby="article-cover-title">
            <div className="flex items-center justify-between px-5 pb-4 pt-5">
              <h2
                id="article-cover-title"
                className="flex items-center gap-2 text-sm font-semibold text-slate-800"
              >
                <ImageIcon size={15} className="text-blue-600" />
                Cover image
              </h2>
              <span className="text-[10px] text-slate-400">Recommended</span>
            </div>
            <div className="px-5 pb-5">
              <ImagePicker
                variant="editor"
                onUploadStateChange={setIsUploadingCover}
                value={formData.image}
                onChange={(url, metadata) => {
                  updateField("image", url);
                  if (metadata) updateField("featuredImageData", metadata);
                  if (!url) updateField("imageAlt", "");
                  else if (metadata?.alt && !formData.imageAlt)
                    updateField("imageAlt", metadata.alt);
                }}
              />
              {formData.image && (
                <div className="mt-4">
                  <label
                    htmlFor="article-image-alt"
                    className="mb-2 block text-xs font-semibold text-slate-700"
                  >
                    Image description
                  </label>
                  <input
                    id="article-image-alt"
                    maxLength={200}
                    value={formData.imageAlt}
                    onChange={(event) => updateField("imageAlt", event.target.value)}
                    placeholder="Describe the image for screen readers"
                    className={`${fieldClass} text-xs`}
                  />
                </div>
              )}
            </div>
          </section>

          <section className={`${cardClass} p-5`} aria-labelledby="article-details-title">
            <h2
              id="article-details-title"
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-800"
            >
              <Settings2 size={15} className="text-blue-600" />
              Story details
            </h2>
            {taxonomyError ? (
              <div role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
                {taxonomyError}
                <button
                  type="button"
                  onClick={() => {
                    setTaxonomyError("");
                    setTaxonomyReload((value) => value + 1);
                  }}
                  className="mt-2 block font-semibold underline"
                >
                  Try again
                </button>
              </div>
            ) : null}
            <div>
              <label
                htmlFor="article-category"
                className="mb-2 block text-xs font-semibold text-slate-700"
              >
                Category <span className="text-blue-600">*</span>
              </label>
              <select
                id="article-category"
                disabled={loadingTaxonomy || Boolean(taxonomyError)}
                value={formData.category}
                onChange={(event) => updateField("category", event.target.value)}
                aria-invalid={Boolean(errors.category)}
                aria-describedby={errors.category ? "article-category-error" : undefined}
                className={fieldClass}
              >
                <option value="">
                  {loadingTaxonomy ? "Loading categories…" : "Choose a category"}
                </option>
                {categories.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p id="article-category-error" className="mt-2 text-xs text-rose-600">
                  {fieldError(errors.category)}
                </p>
              )}
              {!loadingTaxonomy && !taxonomyError && categories.length === 0 && (
                <p className="mt-2 text-xs leading-relaxed text-amber-700">
                  {isAuthorRole ? (
                    "Ask an editor to add a news category."
                  ) : (
                    <Link to="/admin/categories" className="underline">
                      Add a category to organise this story.
                    </Link>
                  )}
                </p>
              )}
            </div>
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-slate-700">Written by</p>
              <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-3">
                <StaffAvatar
                  name={formData.author}
                  src={initialData?.author?.avatar || (!isEditMode ? admin?.avatar : "")}
                  className="h-8 w-8 rounded-full"
                />
                <div className="min-w-0">
                  <p className="break-words text-xs font-semibold text-slate-700">
                    {formData.author}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Story author</p>
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-5">
              <label
                htmlFor="article-tags"
                className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
              >
                <TagIcon size={12} />
                Tags
              </label>
              {formData.tags.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex max-w-full items-center gap-1 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-700"
                    >
                      <span className="truncate">{tag}</span>
                      <button
                        type="button"
                        aria-label={`Remove tag ${tag}`}
                        onClick={() => handleRemoveTag(tag)}
                        className="rounded p-0.5 hover:bg-blue-100"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  id="article-tags"
                  list="article-available-tags"
                  disabled={loadingTaxonomy || !availableTags.length}
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Find an existing tag…"
                  className={`${fieldClass} text-xs`}
                />
                <button
                  type="button"
                  aria-label="Add tag"
                  disabled={!tagInput.trim() || !availableTags.length}
                  onClick={handleAddTag}
                  className="rounded-xl border border-slate-200 px-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Plus size={15} />
                </button>
              </div>
              <datalist id="article-available-tags">
                {availableTags.map((tag) => (
                  <option key={tag._id} value={tag.name} />
                ))}
              </datalist>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {availableTags
                  .filter((tag) => !formData.tags.includes(tag.name))
                  .slice(0, 5)
                  .map((tag) => (
                    <button
                      key={tag._id}
                      type="button"
                      onClick={() => updateField("tags", [...formData.tags, tag.name])}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-[10px] text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Plus size={10} />
                      {tag.name}
                    </button>
                  ))}
              </div>
              {!loadingTaxonomy && !availableTags.length && (
                <p className="mt-2 text-[11px] text-slate-400">
                  {isAuthorRole ? (
                    "No tags available yet."
                  ) : (
                    <Link to="/admin/tags" className="hover:text-blue-600">
                      Create tags to connect related stories.
                    </Link>
                  )}
                </p>
              )}
            </div>
          </section>

          <section
            className={`${cardClass} px-5 pb-2 pt-5`}
            aria-labelledby="article-preferences-title"
          >
            <h2
              id="article-preferences-title"
              className="mb-2 text-sm font-semibold text-slate-800"
            >
              Display & discussion
            </h2>
            <div className="divide-y divide-slate-100">
              {!isAuthorRole && (
                <>
                  <EditorToggle
                    label="Featured story"
                    description="Highlight on the homepage."
                    icon={Star}
                    checked={formData.isFeatured}
                    onChange={(value) => updateField("isFeatured", value)}
                  />
                  <EditorToggle
                    label="Breaking news"
                    description="Include in the breaking news ticker."
                    icon={Flame}
                    checked={formData.isBreaking}
                    onChange={(value) => updateField("isBreaking", value)}
                  />
                </>
              )}
              <EditorToggle
                label="Reader comments"
                description="Also follows your site's comment settings."
                icon={MessageSquare}
                checked={formData.commentsEnabled}
                onChange={(value) => updateField("commentsEnabled", value)}
              />
            </div>
          </section>

          <section className={cardClass} aria-labelledby="article-readiness-title">
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="article-readiness-title" className="text-sm font-semibold text-slate-800">
                  Story essentials
                </h2>
                <span className="text-[10px] font-medium text-slate-400">
                  {essentials.filter((item) => item.complete).length} of {essentials.length}
                </span>
              </div>
              <ul className="space-y-3">
                {essentials.map((item) => (
                  <li
                    key={item.label}
                    className={`flex items-center gap-2 text-xs ${item.complete ? "text-slate-600" : "text-slate-400"}`}
                  >
                    {item.complete ? (
                      <CheckCircle size={14} className="text-emerald-500" />
                    ) : (
                      <Circle size={14} className="text-slate-300" />
                    )}
                    {item.label}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] leading-relaxed text-slate-500">
                Your story stays private until an approved version is published.
              </p>
            </div>
            {!isAuthorRole && (
              <details className="border-t border-slate-100">
                <summary className="cursor-pointer px-5 py-4 text-xs font-semibold text-slate-600">
                  Publication options
                </summary>
                <div className="space-y-4 px-5 pb-5">
                  <p className="text-[11px] leading-relaxed text-slate-400">
                    Publishing and scheduling require editorial approval. Submit your draft for
                    review first.
                  </p>
                  <div>
                    <label
                      htmlFor="article-status"
                      className="mb-2 block text-xs font-semibold text-slate-700"
                    >
                      Next action
                    </label>
                    <select
                      id="article-status"
                      value={formData.status}
                      onChange={(event) => updateField("status", event.target.value)}
                      className={fieldClass}
                    >
                      <option value="Draft">Save draft</option>
                      <option value="Pending Review">Submit for review</option>
                      <option value="Scheduled">Schedule publication</option>
                      <option value="Published">Publish approved version</option>
                      {isEditMode && <option value="Archived">Archive article</option>}
                    </select>
                  </div>
                  {formData.status === "Scheduled" && (
                    <div>
                      <label
                        htmlFor="article-schedule"
                        className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                      >
                        <Calendar size={12} />
                        Publication date & time
                      </label>
                      <input
                        id="article-schedule"
                        type="datetime-local"
                        value={formData.scheduledFor}
                        onChange={(event) => updateField("scheduledFor", event.target.value)}
                        className={`${fieldClass} text-xs`}
                      />
                      <p className="mt-2 text-[10px] text-slate-400">
                        Your local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                      </p>
                      {errors.scheduledFor && (
                        <p role="alert" className="mt-2 text-xs text-rose-600">
                          {fieldError(errors.scheduledFor)}
                        </p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={isSaving || isUploadingCover}
                    onClick={() => handleSave()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {formData.status === "Scheduled" ? <Clock size={13} /> : <Check size={13} />}
                    {
                      {
                        Draft: "Save draft",
                        "Pending Review": "Submit for review",
                        Scheduled: "Schedule article",
                        Published: "Publish approved version",
                        Archived: "Archive article",
                      }[formData.status]
                    }
                  </button>
                </div>
              </details>
            )}
          </section>
        </aside>
      </fieldset>

      <ArticlePreviewModal
        article={{
          ...formData,
          category:
            categories.find((category) => category._id === formData.category)?.name ||
            formData.category,
        }}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
      {isEditMode && initialData?._id && (
        <ArticleRevisionsModal
          isOpen={showRevisionsModal}
          onClose={() => setShowRevisionsModal(false)}
          articleId={initialData._id}
          onRestored={(restored) => {
            if (restored) {
              setFormData((previous) => ({
                ...previous,
                title: restored.title || previous.title,
                subTitle: restored.subTitle || previous.subTitle,
                excerpt: restored.excerpt || previous.excerpt,
                description: restored.content || previous.description,
              }));
              setIsDirty(true);
            }
          }}
        />
      )}
      {isEditMode && initialData?._id && (
        <SubmitForReviewModal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          article={{ ...initialData, ...formData }}
          onSubmitted={() => navigate("/admin/articles")}
        />
      )}
    </div>
  );
};

export default ArticleEditor;
