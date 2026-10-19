import { useState, useEffect, useCallback, useRef } from "react";
import {
  Tag as TagIcon,
  Plus,
  Search,
  Edit,
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Hash,
  CheckCircle2,
  Archive,
  ArrowUpDown
} from "lucide-react";
import toast from "../../utils/toast";

import { useAuth } from "../../context/admin/AuthContext";
import tagService from "../../services/admin/tagService";
import { slugify } from "../../utils/slugify";
import Modal from "../../components/admin/common/Modal";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";
import StatusBadge from "../../components/admin/common/StatusBadge";
import Pagination from "../../components/admin/common/Pagination";

export const Tags = () => {
  const { admin } = useAuth();
  const canManage = admin?.role === "super_admin" || admin?.role === "editor";

  // Data & Query States
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    archived: 0
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");

  // Modal & Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [tagToArchive, setTagToArchive] = useState(null);
  const [tagToRestore, setTagToRestore] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    status: "active"
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Debounced search query tracker
  const searchTimeoutRef = useRef(null);

  // Fetch tags from MongoDB
  const fetchTags = useCallback(
    async (pageToLoad = pagination.page) => {
      try {
        setIsLoading(true);
        setError(null);

        const params = {
          page: pageToLoad,
          limit: pagination.limit,
          search: searchQuery.trim(),
          status: statusFilter,
          sortBy,
          sortOrder
        };

        const res = await tagService.getTags(params);
        if (res?.success) {
          setTags(res.data || []);
          setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          if (res.stats) {
            setStats(res.stats);
          }
        }
      } catch (err) {
        console.error("Failed to load tags:", err);
        setError(err.message || "Failed to load tags. Please check your network connection.");
        if (err.status === 403) {
          toast.error("You lack permission to view the tag management list.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, searchQuery, statusFilter, sortBy, sortOrder]
  );

  // Initial load and filter change trigger
  useEffect(() => {
    fetchTags(1);
  }, [statusFilter, sortBy, sortOrder]);

  // Debounced search trigger
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchTags(1);
    }, 350);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTag(null);
    setIsSlugManuallyEdited(false);
    setFormData({
      name: "",
      slug: "",
      description: "",
      status: "active"
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (tag) => {
    setEditingTag(tag);
    setIsSlugManuallyEdited(true);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || "",
      status: tag.status || "active"
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Name change with auto-slug generation
  const handleNameChange = (e) => {
    const newName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      name: newName,
      slug: !isSlugManuallyEdited ? slugify(newName) : prev.slug
    }));
    if (formErrors.name) {
      setFormErrors((prev) => ({ ...prev, name: null }));
    }
  };

  // Slug change
  const handleSlugChange = (e) => {
    setIsSlugManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      slug: slugify(e.target.value)
    }));
    if (formErrors.slug) {
      setFormErrors((prev) => ({ ...prev, slug: null }));
    }
  };

  // Form submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    if (!formData.name.trim()) {
      setFormErrors({ name: "Tag name is required" });
      return;
    }

    try {
      setIsActionLoading(true);

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim(),
        status: formData.status
      };

      if (editingTag) {
        await tagService.updateTag(editingTag._id, payload);
        toast.success(`Tag "#${formData.name}" updated successfully.`);
      } else {
        await tagService.createTag(payload);
        toast.success(`Tag "#${formData.name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchTags(pagination.page);
    } catch (err) {
      console.error("Save tag error:", err);
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to save tag.");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // Soft-Delete (Archive) Tag
  const handleConfirmArchive = async () => {
    if (!tagToArchive) return;
    try {
      setIsActionLoading(true);
      await tagService.archiveTag(tagToArchive._id);
      toast.success(`Tag "#${tagToArchive.name}" has been archived.`);
      setTagToArchive(null);
      fetchTags(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to archive tag.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Restore Archived Tag
  const handleConfirmRestore = async () => {
    if (!tagToRestore) return;
    try {
      setIsActionLoading(true);
      await tagService.restoreTag(tagToRestore._id);
      toast.success(`Tag "#${tagToRestore.name}" restored to active status.`);
      setTagToRestore(null);
      fetchTags(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to restore tag.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Quick Toggle Status
  const handleToggleStatus = async (tag) => {
    if (!canManage) {
      toast.error("You do not have permission to modify tag status.");
      return;
    }
    if (tag.status === "archived") {
      setTagToRestore(tag);
      return;
    }

    const nextStatus = tag.status === "active" ? "inactive" : "active";
    try {
      await tagService.updateTagStatus(tag._id, nextStatus);
      toast.success(`Tag "#${tag.name}" marked as ${nextStatus}.`);
      fetchTags(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to update tag status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Article Tags & Topics
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
              Database Synced
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage granular indexing terms, cross-category keywords, and editorial topics.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>New Tag</span>
          </button>
        )}
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Tags
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Hash size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">All editorial indexing tags</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Active Topics
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{stats.active}</div>
          <div className="text-[11px] text-slate-400 mt-1">Available for article tagging</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inactive Tags
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <TagIcon size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-2">{stats.inactive}</div>
          <div className="text-[11px] text-slate-400 mt-1">Hidden from author tag pickers</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Archived Tags
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Archive size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{stats.archived}</div>
          <div className="text-[11px] text-slate-400 mt-1">Preserved for historical search</div>
        </div>
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search tags by topic name or slug..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        {/* Filters and Sorters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400 hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">Active & Inactive</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
              <option value="archived">Archived Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className="text-slate-400 hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="name">Name (A-Z)</option>
              <option value="createdAt">Date Created</option>
            </select>
            <button
              type="button"
              onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
              title={`Sorting ${sortOrder === "asc" ? "Ascending" : "Descending"}. Click to toggle.`}
              className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
            >
              <ArrowUpDown size={14} />
            </button>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchTags(pagination.page)}
            disabled={isLoading}
            title="Refresh from MongoDB"
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Tags Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Loading editorial tags from MongoDB...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle size={36} className="text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to load tags</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchTags(1)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : tags.length === 0 ? (
          <EmptyState
            icon={TagIcon}
            title={searchQuery ? "No matching tags found" : "No tags created yet"}
            description={
              searchQuery
                ? `No topic tags match "${searchQuery}". Clear your search query or filter to see all terms.`
                : "Create indexing tags to help readers discover cross-category stories and deep reporting."
            }
            actionLabel={canManage ? (searchQuery ? "Clear Search" : "Create Tag") : undefined}
            onAction={
              searchQuery
                ? () => {
                    setSearchQuery("");
                    fetchTags(1);
                  }
                : handleOpenCreate
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Tag Name</th>
                  <th className="px-4 py-3.5">URL Slug</th>
                  <th className="px-4 py-3.5">Description</th>
                  <th className="px-4 py-3.5 text-center">Articles</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tags.map((t) => {
                  const isArchived = t.status === "archived";
                  const badgeStatus =
                    t.status === "active" ? "Active" : isArchived ? "Archived" : "Inactive";

                  return (
                    <tr
                      key={t._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isArchived ? "bg-amber-50/20 opacity-75" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Hash size={13} />
                          </span>
                          <div>
                            <span className="font-bold text-slate-900 block">#{t.name}</span>
                            {t.createdBy?.name && (
                              <span className="text-[10px] text-slate-400">
                                By {t.createdBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        /{t.slug}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={t.description}>
                        {t.description || <span className="text-slate-300 italic">No description</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md text-[11px]">
                          {t.articleCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(t)}
                            className="cursor-pointer"
                            title={isArchived ? "Archived tag. Click to restore." : "Click to toggle Active/Inactive"}
                          >
                            <StatusBadge status={badgeStatus} size="sm" />
                          </button>
                        ) : (
                          <StatusBadge status={badgeStatus} size="sm" />
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(t)}
                              title="Edit Tag"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit size={15} />
                            </button>

                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => setTagToRestore(t)}
                                title="Restore Tag to Active"
                                className="p-1.5 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <RotateCcw size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setTagToArchive(t)}
                                title="Archive Tag"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Read-only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination */}
        {!isLoading && !error && tags.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(newPage) => fetchTags(newPage)}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize }));
              fetchTags(1);
            }}
          />
        )}
      </div>

      {/* Create / Edit Tag Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTag ? "Edit Topic Tag" : "Create New Topic Tag"}
        subtitle="Specify tag name, URL slug, and topic indexing context."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Tag Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. AfCFTA, Fintech, Elections, Artificial Intelligence"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                formErrors.name ? "border-rose-400" : "border-slate-300 focus:border-blue-600"
              }`}
            />
            {formErrors.name && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.name}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              URL Slug <span className="text-slate-400 font-normal">(auto-generated)</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={handleSlugChange}
              placeholder="topic-slug"
              className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                formErrors.slug ? "border-rose-400" : "border-slate-300 focus:border-blue-600"
              }`}
            />
            {formErrors.slug && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.slug}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Topic Description (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Brief context about this topic for reporters and editors..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            {formErrors.description && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              {editingTag && <option value="archived">Archived</option>}
            </select>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isActionLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isActionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {isActionLoading && <RefreshCw size={13} className="animate-spin" />}
              <span>{editingTag ? "Update Tag" : "Create Tag"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Tag Confirmation Dialog (Soft-Delete) */}
      <ConfirmDialog
        isOpen={!!tagToArchive}
        onClose={() => setTagToArchive(null)}
        onConfirm={handleConfirmArchive}
        title="Archive Tag?"
        message={`Are you sure you want to archive the tag "#${tagToArchive?.name}"? Historical articles referencing this tag will remain indexed, but it will be excluded from new article selectors until restored.`}
        confirmText="Archive Tag"
      />

      {/* Restore Tag Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!tagToRestore}
        onClose={() => setTagToRestore(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Tag?"
        message={`Restore the tag "#${tagToRestore?.name}" back to active status? It will immediately become selectable for articles and editorial tagging.`}
        confirmText="Restore Tag"
      />
    </div>
  );
};

export default Tags;
