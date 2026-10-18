import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderTree,
  Plus,
  Search,
  Edit,
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertCircle,
  Layers,
  CheckCircle2,
  Archive,
  ArrowUpDown
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../../context/admin/AuthContext";
import categoryService from "../../services/admin/categoryService";
import { slugify } from "../../utils/slugify";
import Modal from "../../components/admin/common/Modal";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";
import StatusBadge from "../../components/admin/common/StatusBadge";
import Pagination from "../../components/admin/common/Pagination";

export const Categories = () => {
  const { admin } = useAuth();
  const canManage = admin?.role === "super_admin" || admin?.role === "editor";

  // Data & Query States
  const [categories, setCategories] = useState([]);
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
  const [sortBy, setSortBy] = useState("displayOrder");
  const [sortOrder, setSortOrder] = useState("asc");

  // Modal & Dialog States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToArchive, setCategoryToArchive] = useState(null);
  const [categoryToRestore, setCategoryToRestore] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    color: "#2563EB",
    status: "active",
    displayOrder: 1
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);

  // Debounced search query tracker
  const searchTimeoutRef = useRef(null);

  // Fetch categories from MongoDB
  const fetchCategories = useCallback(
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

        const res = await categoryService.getCategories(params);
        if (res?.success) {
          setCategories(res.data || []);
          setPagination(res.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
          if (res.stats) {
            setStats(res.stats);
          }
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
        setError(err.message || "Failed to load categories. Please check your network connection.");
        if (err.status === 403) {
          toast.error("You lack permission to view the category management list.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [pagination.limit, pagination.page, searchQuery, statusFilter, sortBy, sortOrder]
  );

  // Initial load and filter change trigger
  useEffect(() => {
    fetchCategories(1);
  }, [statusFilter, sortBy, sortOrder]);

  // Debounced search trigger
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      fetchCategories(1);
    }, 350);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setIsSlugManuallyEdited(false);
    setFormData({
      name: "",
      slug: "",
      description: "",
      color: "#2563EB",
      status: "active",
      displayOrder: stats.total + 1
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setIsSlugManuallyEdited(true); // Don't auto-overwrite existing slug when editing name
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      color: cat.color || "#2563EB",
      status: cat.status || "active",
      displayOrder: cat.displayOrder !== undefined ? cat.displayOrder : 1
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Name input change with auto-slug generation
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

  // Manual slug input change
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

  // Submit Category Form (Create or Update)
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});

    // Client-side quick check
    if (!formData.name.trim()) {
      setFormErrors({ name: "Category name is required" });
      return;
    }

    try {
      setIsActionLoading(true);

      const payload = {
        name: formData.name.trim(),
        slug: formData.slug.trim() || undefined,
        description: formData.description.trim(),
        color: formData.color,
        status: formData.status,
        displayOrder: Number(formData.displayOrder) || 0
      };

      if (editingCategory) {
        await categoryService.updateCategory(editingCategory._id, payload);
        toast.success(`Category "${formData.name}" updated successfully.`);
      } else {
        await categoryService.createCategory(payload);
        toast.success(`Category "${formData.name}" created successfully.`);
      }

      setIsModalOpen(false);
      fetchCategories(pagination.page);
    } catch (err) {
      console.error("Save category error:", err);
      if (err.errors) {
        setFormErrors(err.errors);
      } else {
        toast.error(err.message || "Failed to save category.");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // Soft-Delete (Archive) Category
  const handleConfirmArchive = async () => {
    if (!categoryToArchive) return;
    try {
      setIsActionLoading(true);
      await categoryService.archiveCategory(categoryToArchive._id);
      toast.success(`Category "${categoryToArchive.name}" has been archived.`);
      setCategoryToArchive(null);
      fetchCategories(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to archive category.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Restore Archived Category
  const handleConfirmRestore = async () => {
    if (!categoryToRestore) return;
    try {
      setIsActionLoading(true);
      await categoryService.restoreCategory(categoryToRestore._id);
      toast.success(`Category "${categoryToRestore.name}" restored to active status.`);
      setCategoryToRestore(null);
      fetchCategories(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to restore category.");
    } finally {
      setIsActionLoading(false);
    }
  };

  // Quick Toggle Status (Active <-> Inactive)
  const handleToggleStatus = async (cat) => {
    if (!canManage) {
      toast.error("You do not have permission to modify category status.");
      return;
    }
    if (cat.status === "archived") {
      setCategoryToRestore(cat);
      return;
    }

    const nextStatus = cat.status === "active" ? "inactive" : "active";
    try {
      await categoryService.updateCategoryStatus(cat._id, nextStatus);
      toast.success(`Category "${cat.name}" marked as ${nextStatus}.`);
      fetchCategories(pagination.page);
    } catch (err) {
      toast.error(err.message || "Failed to update category status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              News Categories & Desks
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700">
              Database Synced
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Organize editorial coverage desks, public navigation sections, and publication taxonomies.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus size={16} />
            <span>New Category</span>
          </button>
        )}
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Categories
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">All registered news sections</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
              Active Desks
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{stats.active}</div>
          <div className="text-[11px] text-slate-400 mt-1">Available for article publishing</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Inactive Desks
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <FolderTree size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-700 mt-2">{stats.inactive}</div>
          <div className="text-[11px] text-slate-400 mt-1">Temporarily hidden from selectors</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              Archived Desks
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Archive size={16} />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700 mt-2">{stats.archived}</div>
          <div className="text-[11px] text-slate-400 mt-1">Preserved for historical integrity</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search categories by name, slug, or theme..."
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
              <option value="displayOrder">Display Order</option>
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
            onClick={() => fetchCategories(pagination.page)}
            disabled={isLoading}
            title="Refresh from MongoDB"
            className="p-2 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Categories Table or Empty/Error State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full mb-3" />
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Loading news categories from MongoDB...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertCircle size={36} className="text-rose-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">Failed to load categories</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{error}</p>
            <button
              type="button"
              onClick={() => fetchCategories(1)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={FolderTree}
            title={searchQuery ? "No matching categories found" : "No categories created yet"}
            description={
              searchQuery
                ? `No categories match "${searchQuery}". Clear your search query or status filter to see all records.`
                : "Organize your newsroom coverage desks by creating your first editorial category."
            }
            actionLabel={canManage ? (searchQuery ? "Clear Search" : "Create Category") : undefined}
            onAction={
              searchQuery
                ? () => {
                    setSearchQuery("");
                    fetchCategories(1);
                  }
                : handleOpenCreate
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Category Name</th>
                  <th className="px-4 py-3.5">URL Slug</th>
                  <th className="px-4 py-3.5">Editorial Description</th>
                  <th className="px-4 py-3.5 text-center">Order</th>
                  <th className="px-4 py-3.5 text-center">Articles</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => {
                  const isArchived = cat.status === "archived";
                  const badgeStatus =
                    cat.status === "active" ? "Active" : isArchived ? "Archived" : "Inactive";

                  return (
                    <tr
                      key={cat._id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isArchived ? "bg-amber-50/20 opacity-75" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: cat.color || "#2563EB" }}
                          />
                          <div>
                            <span className="font-bold text-slate-900 block">{cat.name}</span>
                            {cat.createdBy?.name && (
                              <span className="text-[10px] text-slate-400">
                                Created by {cat.createdBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-500">
                        /{cat.slug}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs truncate" title={cat.description}>
                        {cat.description || <span className="text-slate-300 italic">No description provided</span>}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono text-slate-600 font-semibold">
                        {cat.displayOrder ?? 0}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md text-[11px]">
                          {cat.articleCount ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {canManage ? (
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(cat)}
                            className="cursor-pointer"
                            title={isArchived ? "Archived category. Click to restore." : "Click to toggle Active/Inactive"}
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
                              onClick={() => handleOpenEdit(cat)}
                              title="Edit Category"
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit size={15} />
                            </button>

                            {isArchived ? (
                              <button
                                type="button"
                                onClick={() => setCategoryToRestore(cat)}
                                title="Restore Category to Active"
                                className="p-1.5 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <RotateCcw size={15} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCategoryToArchive(cat)}
                                title="Archive Category"
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
        {!isLoading && !error && categories.length > 0 && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(newPage) => fetchCategories(newPage)}
            onPageSizeChange={(newSize) => {
              setPagination((prev) => ({ ...prev, limit: newSize }));
              fetchCategories(1);
            }}
          />
        )}
      </div>

      {/* Create / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? "Edit Category Desk" : "Create News Category"}
        subtitle="Specify category name, URL slug, display order, and editorial coverage description."
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={handleNameChange}
              placeholder="e.g. Technology, Investigations, Climate Policy"
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
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <span className="font-mono text-slate-400">{window.location.host}/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={handleSlugChange}
                placeholder="category-slug"
                className={`flex-1 px-3 py-1.5 bg-slate-50 border rounded-lg text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  formErrors.slug ? "border-rose-400" : "border-slate-300 focus:border-blue-600"
                }`}
              />
            </div>
            {formErrors.slug && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.slug}</p>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Editorial Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Summary of news coverage themes, beats, and reporting topics under this desk..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
            {formErrors.description && (
              <p className="text-xs text-rose-600 mt-1">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Accent Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="w-9 h-9 rounded-lg border border-slate-300 p-0.5 cursor-pointer"
                />
                <span className="font-mono text-xs text-slate-600">{formData.color}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="0"
                value={formData.displayOrder}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, displayOrder: e.target.value }))
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Desk Status
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
                {editingCategory && <option value="archived">Archived</option>}
              </select>
            </div>
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
              <span>{editingCategory ? "Update Category" : "Save Category"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Category Confirmation Dialog (Soft-Delete) */}
      <ConfirmDialog
        isOpen={!!categoryToArchive}
        onClose={() => setCategoryToArchive(null)}
        onConfirm={handleConfirmArchive}
        title="Archive Category?"
        message={`Are you sure you want to archive "${categoryToArchive?.name}"? It will be safely preserved for historical article integrity and excluded from active selectors, but can be restored anytime.`}
        confirmText="Archive Category"
      />

      {/* Restore Category Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!categoryToRestore}
        onClose={() => setCategoryToRestore(null)}
        onConfirm={handleConfirmRestore}
        title="Restore Category?"
        message={`Restore "${categoryToRestore?.name}" back to active status? It will immediately become selectable for articles and public navigation.`}
        confirmText="Restore Category"
      />
    </div>
  );
};

export default Categories;
