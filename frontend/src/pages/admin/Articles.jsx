import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Copy,
  Trash2,
  CheckCircle,
  XCircle,
  Archive,
  RotateCcw,
  MoreVertical,
  CheckSquare,
  Square,
  ArrowUpDown,
  FileText,
  Loader2,
  Calendar,
  Send,
  History
} from "lucide-react";
import toast from "../../utils/toast";

import { useAuth } from "../../context/admin/AuthContext";
import { articleService } from "../../services/admin/articleService";
import { categoryService } from "../../services/admin/categoryService";
import { staffService } from "../../services/admin/staffService";
import StatusBadge from "../../components/admin/common/StatusBadge";
import Pagination from "../../components/admin/common/Pagination";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";
import ArticlePreviewModal from "../../components/admin/articles/ArticlePreviewModal";
import ReviewStatusBadge from "../../components/admin/editorial/ReviewStatusBadge";
import SubmitForReviewModal from "../../components/admin/editorial/SubmitForReviewModal";
import ArticleRevisionsModal from "../../components/admin/editorial/ArticleRevisionsModal";

export const Articles = () => {
  const { admin } = useAuth();
  const navigate = useNavigate();

  const isAuthorRole = admin?.role === "author";

  // Data states
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesList, setCategoriesList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  // Stats from backend
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    pending_review: 0,
    scheduled: 0,
    archived: 0
  });

  // Search, filter & sorting states
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedAuthor, setSelectedAuthor] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // Selection & pagination states
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatching, setTotalMatching] = useState(0);

  // Modals & Action confirmations
  const [previewArticle, setPreviewArticle] = useState(null);
  const [articleToDelete, setArticleToDelete] = useState(null);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [articleForSubmitReview, setArticleForSubmitReview] = useState(null);
  const [articleForRevisions, setArticleForRevisions] = useState(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load active categories and staff for filter dropdowns
  useEffect(() => {
    let isMounted = true;
    const fetchDropdowns = async () => {
      try {
        const [catRes, staffRes] = await Promise.all([
          categoryService.getActiveCategories(),
          !isAuthorRole ? staffService.getStaff({ limit: 50 }) : Promise.resolve({ data: [] })
        ]);

        if (isMounted) {
          if (catRes?.success && Array.isArray(catRes.data)) {
            setCategoriesList(catRes.data);
          }
          if (staffRes?.success && Array.isArray(staffRes.data)) {
            setStaffList(staffRes.data);
          }
        }
      } catch {
        // Silently handled
      }
    };

    fetchDropdowns();
    return () => {
      isMounted = false;
    };
  }, [isAuthorRole]);

  // Fetch articles from backend
  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: selectedStatus !== "all" ? selectedStatus : "all",
        category: selectedCategory !== "all" ? selectedCategory : undefined,
        author: selectedAuthor !== "all" ? selectedAuthor : undefined,
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      const res = await articleService.getArticles(params);
      if (res?.success) {
        setArticles(res.data || []);
        if (res.pagination) {
          setTotalMatching(res.pagination.total);
          setTotalPages(res.pagination.totalPages);
        }
        if (res.stats) {
          setStats(res.stats);
        }
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load articles from database");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, selectedStatus, selectedCategory, selectedAuthor, sortBy, sortOrder]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const pageIds = articles.map((a) => a._id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    } else {
      const pageIds = new Set(articles.map((a) => a._id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const isAllCurrentPageSelected =
    articles.length > 0 && articles.every((a) => selectedIds.includes(a._id));

  // Action: Single Publish
  const handlePublish = async (id) => {
    try {
      await articleService.publishArticle(id);
      toast.success("Article published successfully to Nsemfoa News!");
      fetchArticles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Publishing failed");
    }
  };

  // Action: Single Unpublish
  const handleUnpublish = async (id) => {
    try {
      await articleService.unpublishArticle(id);
      toast.success("Article unpublished (returned to Draft)");
      fetchArticles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unpublishing failed");
    }
  };

  // Action: Single Duplicate
  const handleDuplicate = async (id) => {
    try {
      await articleService.duplicateArticle(id);
      toast.success("Article duplicated as draft!");
      fetchArticles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Duplication failed");
    }
  };

  // Action: Single Archive / Delete
  const handleArchive = async () => {
    if (!articleToDelete) return;
    try {
      await articleService.deleteArticle(articleToDelete._id);
      toast.success("Article archived (soft-deleted from active listings)");
      setArticleToDelete(null);
      fetchArticles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Archive operation failed");
    }
  };

  // Action: Single Restore
  const handleRestore = async (id) => {
    try {
      await articleService.restoreArticle(id);
      toast.success("Article restored to Draft state!");
      fetchArticles();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Restoration failed");
    }
  };

  // Action: Bulk Archive
  const handleBulkArchive = async () => {
    try {
      await Promise.all(selectedIds.map((id) => articleService.deleteArticle(id)));
      toast.success(`${selectedIds.length} articles archived successfully!`);
      setSelectedIds([]);
      setIsBulkDeleteOpen(false);
      fetchArticles();
    } catch (err) {
      toast.error("One or more articles could not be archived");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Article Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real MongoDB news publishing, ImageKit media storage, and role-based editorial control.
          </p>
        </div>
        <Link
          to="/admin/articles/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          <span>Create Article</span>
        </Link>
      </div>

      {/* Summary Status Metric Pills (From MongoDB Aggregation) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
        {[
          { label: "All Articles", count: stats.total, status: "all" },
          { label: "Published", count: stats.published, status: "published" },
          { label: "Drafts", count: stats.draft, status: "draft" },
          { label: "Pending", count: stats.pending_review, status: "pending_review" },
          { label: "Scheduled", count: stats.scheduled, status: "scheduled" },
          { label: "Archived", count: stats.archived, status: "archived" }
        ].map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setSelectedStatus(item.status);
              setCurrentPage(1);
            }}
            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
              selectedStatus === item.status
                ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200/80 hover:border-slate-300"
            }`}
          >
            <div
              className={`text-[11px] font-medium truncate ${
                selectedStatus === item.status ? "text-blue-100" : "text-slate-500"
              }`}
            >
              {item.label}
            </div>
            <div className="text-lg font-bold tracking-tight mt-0.5">{item.count}</div>
          </button>
        ))}
      </div>

      {/* Search and Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Bar */}
          <div className="md:col-span-5 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, excerpt, slug..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="all">All Categories</option>
              {categoriesList.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Author Filter (if permitted) */}
          <div className="md:col-span-2">
            <select
              disabled={isAuthorRole}
              value={selectedAuthor}
              onChange={(e) => {
                setSelectedAuthor(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:opacity-50"
            >
              <option value="all">All Authors</option>
              {staffList.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="md:col-span-2">
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="publishedAt-desc">Recently Published</option>
              <option value="updatedAt-desc">Recently Updated</option>
              <option value="views-desc">Most Viewed</option>
              <option value="title-asc">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar (when rows are selected) */}
        {selectedIds.length > 0 && !isAuthorRole && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-blue-50/60 p-3 rounded-xl animate-fadeIn">
            <div className="text-xs font-semibold text-blue-900 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                {selectedIds.length}
              </span>
              <span>Selected articles</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Archive size={14} />
                <span>Bulk Archive</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Deselect All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Articles Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">Querying MongoDB published stories...</p>
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={stats.total === 0 && !searchQuery && selectedStatus === "all" ? "No Articles Yet" : "No matching articles found"}
            description={
              stats.total === 0 && !searchQuery && selectedStatus === "all"
                ? "You haven't created any articles. Start by writing your first story."
                : "We couldn't find any articles matching your search query and filters in MongoDB. Try adjusting your search."
            }
            actionLabel={stats.total === 0 && !searchQuery && selectedStatus === "all" ? "Create Article" : "Reset All Filters"}
            onAction={
              stats.total === 0 && !searchQuery && selectedStatus === "all"
                ? () => navigate("/admin/articles/new")
                : () => {
                    setSearchQuery("");
                    setSelectedStatus("all");
                    setSelectedCategory("all");
                    setSelectedAuthor("all");
                    setCurrentPage(1);
                  }
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={isAllCurrentPageSelected}
                        onChange={handleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        aria-label="Select all on this page"
                      />
                    </th>
                    <th className="px-4 py-3.5">Article Headline</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Author</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Views</th>
                    <th className="px-4 py-3.5">Created</th>
                    <th className="px-4 py-3.5">Published</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articles.map((art) => {
                    const isSelected = selectedIds.includes(art._id);
                    const thumbUrl = art.featuredImage?.url || art.image || "";
                    const catName = art.category?.name || "General";
                    const authorName = art.author?.name || "Staff";
                    const isArchived = art.status === "archived";

                    return (
                      <tr
                        key={art._id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          isSelected ? "bg-blue-50/30" : ""
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(art._id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            aria-label={`Select article ${art.title}`}
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            {thumbUrl ? (
                              <img
                                src={thumbUrl}
                                alt=""
                                className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 bg-slate-100"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                <FileText size={18} />
                              </div>
                            )}
                            <div className="truncate max-w-[280px]">
                              <Link
                                to={`/admin/articles/${art._id}/edit`}
                                className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate block"
                              >
                                {art.title}
                              </Link>
                              <div className="text-[11px] text-slate-400 truncate mt-0.5">
                                slug: /{art.slug}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-semibold text-slate-700">{catName}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-slate-600">{authorName}</span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={art.status} size="sm" />
                            {art.editorialStatus && art.editorialStatus !== "none" && (
                              <ReviewStatusBadge status={art.editorialStatus} size="sm" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-700">
                          {Number(art.views || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          {art.createdAt
                            ? new Date(art.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })
                            : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap">
                          {art.publishedAt
                            ? new Date(art.publishedAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })
                            : "-"}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* Submit for Review for drafts or articles requiring changes */}
                            {(art.status === "draft" || art.editorialStatus === "changes_requested") && !isArchived && (
                              <button
                                type="button"
                                onClick={() => setArticleForSubmitReview(art)}
                                title="Submit for Editorial Review"
                                className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Send size={15} />
                              </button>
                            )}

                            {/* Revision History */}
                            <button
                              type="button"
                              onClick={() => setArticleForRevisions(art)}
                              title="Version History & Revisions"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <History size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPreviewArticle(art)}
                              title="Live Preview"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/admin/articles/${art._id}/edit`)}
                              title="Edit Article"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit size={15} />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDuplicate(art._id)}
                              title="Duplicate as Draft"
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Copy size={15} />
                            </button>

                            {/* Publish / Unpublish actions for Editors & Super Admins */}
                            {!isAuthorRole && !isArchived && (
                              <>
                                {art.status === "published" ? (
                                  <button
                                    type="button"
                                    onClick={() => handleUnpublish(art._id)}
                                    title="Unpublish (Return to Draft)"
                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <XCircle size={15} />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handlePublish(art._id)}
                                    title="Publish to Live Website"
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <CheckCircle size={15} />
                                  </button>
                                )}
                              </>
                            )}

                            {/* Restore if Archived */}
                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => handleRestore(art._id)}
                                title="Restore Article to Draft"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <RotateCcw size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setArticleToDelete(art)}
                                title="Archive Article"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              >
                                <Archive size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Server-side Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalMatching}
              pageSize={pageSize}
              onPageChange={(page) => setCurrentPage(page)}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </>
        )}
      </div>

      {/* Archive Single Article Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!articleToDelete}
        onClose={() => setArticleToDelete(null)}
        onConfirm={handleArchive}
        title="Archive Article?"
        message={`Are you sure you want to archive "${articleToDelete?.title}"? It will be safely soft-deleted from live news listings without losing ImageKit media assets.`}
        confirmText="Confirm Archive"
      />

      {/* Bulk Archive Confirm Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkArchive}
        title="Archive Selected Articles?"
        message={`You are about to soft-delete/archive ${selectedIds.length} articles simultaneously from MongoDB.`}
        confirmText={`Archive ${selectedIds.length} Articles`}
      />

      {/* Article Preview Modal */}
      <ArticlePreviewModal
        article={
          previewArticle
            ? {
                title: previewArticle.title,
                subTitle: previewArticle.subTitle,
                category: previewArticle.category?.name || "General News",
                author: previewArticle.author?.name || "Nsemfoa News Desk",
                date: previewArticle.publishedAt
                  ? new Date(previewArticle.publishedAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric"
                    })
                  : "Draft",
                status: previewArticle.status,
                image: previewArticle.featuredImage?.url || previewArticle.image,
                excerpt: previewArticle.excerpt,
                description: previewArticle.content || previewArticle.excerpt,
                tags: (previewArticle.tags || []).map((t) =>
                  typeof t === "object" ? t.name : t
                )
              }
            : null
        }
        isOpen={!!previewArticle}
        onClose={() => setPreviewArticle(null)}
      />

      {/* Submit for Review Modal */}
      {articleForSubmitReview && (
        <SubmitForReviewModal
          isOpen={!!articleForSubmitReview}
          onClose={() => setArticleForSubmitReview(null)}
          article={articleForSubmitReview}
          onSubmitted={() => fetchArticles()}
        />
      )}

      {/* Article Revisions Modal */}
      {articleForRevisions && (
        <ArticleRevisionsModal
          isOpen={!!articleForRevisions}
          onClose={() => setArticleForRevisions(null)}
          articleId={articleForRevisions._id}
          onRestored={() => fetchArticles()}
        />
      )}
    </div>
  );
};

export default Articles;
