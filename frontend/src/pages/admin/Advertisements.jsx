import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  ExternalLink,
  Calendar,
  ArrowRight,
  TrendingUp,
  Image as ImageIcon,
  Play,
  Pause,
  RotateCcw,
  RefreshCw,
  Loader2,
  Filter,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import toast from "../../utils/toast";

import advertisementService from "../../services/admin/advertisementService";
import Modal from "../../components/admin/common/Modal";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";
import StatusBadge from "../../components/admin/common/StatusBadge";
import ImagePicker from "../../components/admin/common/ImagePicker";

const PLACEMENT_OPTIONS = [
  { value: "homepage_banner", label: "Homepage Banner (Primary)" },
  { value: "all_stories_banner", label: "All Stories Archive Banner" },
  { value: "article_inline", label: "Article Details Inline Placement" },
  { value: "article_sidebar", label: "Article Sidebar Placement" }
];

export const Advertisements = () => {
  const [advertisements, setAdvertisements] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    scheduled: 0,
    draft: 0,
    paused: 0,
    completed: 0,
    archived: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [placementFilter, setPlacementFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewAd, setPreviewAd] = useState(null);
  const [editingAd, setEditingAd] = useState(null);
  const [adToArchive, setAdToArchive] = useState(null);
  const [adToRestore, setAdToRestore] = useState(null);

  // Form Data
  const [formData, setFormData] = useState({
    campaignName: "",
    advertiserName: "",
    headline: "",
    description: "",
    placement: "homepage_banner",
    status: "draft",
    buttonText: "Explore Partnership Options",
    destinationUrl: "https://",
    media: null,
    imageUrl: "",
    startDate: "",
    endDate: "",
    priority: 10
  });
  const [errors, setErrors] = useState({});

  // Fetch advertisements and statistics from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [adsRes, statsRes] = await Promise.all([
        advertisementService.getAdvertisements({
          search: searchQuery,
          placement: placementFilter !== "All" ? placementFilter : undefined,
          status: statusFilter !== "All" ? statusFilter : undefined,
          page: pagination.page,
          limit: pagination.limit
        }),
        advertisementService.getAdvertisementStats()
      ]);

      if (adsRes.success) {
        setAdvertisements(adsRes.data || []);
        if (adsRes.pagination) {
          setPagination((prev) => ({ ...prev, ...adsRes.pagination }));
        }
      }

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load advertisements.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, placementFilter, statusFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingAd(null);
    setFormData({
      campaignName: "",
      advertiserName: "",
      headline: "",
      description: "",
      placement: "homepage_banner",
      status: "draft",
      buttonText: "Learn More",
      destinationUrl: "https://",
      media: null,
      imageUrl: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      priority: 10
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ad) => {
    setEditingAd(ad);
    setFormData({
      campaignName: ad.campaignName,
      advertiserName: ad.advertiserName || "",
      headline: ad.headline,
      description: ad.description || "",
      placement: ad.placement,
      status: ad.status,
      buttonText: ad.buttonText || "Learn More",
      destinationUrl: ad.destinationUrl,
      media: ad.media?._id || ad.media || null,
      imageUrl: ad.media?.url || "",
      startDate: ad.startDate ? ad.startDate.split("T")[0] : "",
      endDate: ad.endDate ? ad.endDate.split("T")[0] : "",
      priority: ad.priority || 0
    });
    setErrors({});
    setIsModalOpen(true);
  };

  // ImagePicker change handler
  const handleImageChange = (url, meta) => {
    setFormData((prev) => ({
      ...prev,
      imageUrl: url,
      media: meta?.mediaId || meta?.media || prev.media
    }));
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!formData.campaignName.trim()) errs.campaignName = "Campaign name is required";
    if (!formData.headline.trim()) errs.headline = "Headline copy is required";
    if (!formData.destinationUrl.trim() || !formData.destinationUrl.startsWith("http")) {
      errs.destinationUrl = "A valid destination URL starting with http:// or https:// is required";
    }
    if (!formData.media) {
      errs.media = "An advertisement image asset must be selected from the Media Library";
    }
    if (formData.startDate && formData.endDate && new Date(formData.endDate) <= new Date(formData.startDate)) {
      errs.endDate = "End date must be later than start date";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        campaignName: formData.campaignName.trim(),
        advertiserName: formData.advertiserName.trim(),
        headline: formData.headline.trim(),
        description: formData.description.trim(),
        placement: formData.placement,
        status: formData.status,
        buttonText: formData.buttonText.trim(),
        destinationUrl: formData.destinationUrl.trim(),
        media: formData.media,
        startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
        endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
        priority: Number(formData.priority) || 0
      };

      if (editingAd) {
        await advertisementService.updateAdvertisement(editingAd._id, payload);
        toast.success("Advertisement campaign updated successfully!");
      } else {
        await advertisementService.createAdvertisement(payload);
        toast.success("Advertisement campaign created successfully!");
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save advertisement.");
    } finally {
      setSubmitting(false);
    }
  };

  // Status Action: Activate
  const handleActivate = async (id) => {
    try {
      await advertisementService.activateAdvertisement(id);
      toast.success("Campaign activated and scheduled for public display!");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to activate campaign.");
    }
  };

  // Status Action: Pause
  const handlePause = async (id) => {
    try {
      await advertisementService.pauseAdvertisement(id);
      toast.success("Campaign paused. Placement hidden from public site.");
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to pause campaign.");
    }
  };

  // Status Action: Archive
  const handleArchiveConfirm = async () => {
    if (!adToArchive) return;
    try {
      await advertisementService.archiveAdvertisement(adToArchive._id);
      toast.success("Campaign archived safely.");
      setAdToArchive(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to archive campaign.");
    }
  };

  // Status Action: Restore
  const handleRestoreConfirm = async () => {
    if (!adToRestore) return;
    try {
      await advertisementService.restoreAdvertisement(adToRestore._id);
      toast.success("Campaign restored to draft.");
      setAdToRestore(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore campaign.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Commercial Advertisements & Partnerships
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Create, schedule, and manage verified commercial placements and sponsored banners across Nsemra News.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Create Advertisement</span>
        </button>
      </div>

      {/* Campaign Statistics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Total Campaigns</span>
            <Megaphone size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-medium">Active (Live)</span>
            <Play size={16} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-medium">Scheduled</span>
            <Calendar size={16} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-medium">Paused</span>
            <Pause size={16} className="text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{stats.paused}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Drafts</span>
            <Edit size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-700">{stats.draft}</div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Completed / Archived</span>
            <RotateCcw size={16} className="text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-600">
            {stats.completed + stats.archived}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns, advertisers, or headlines..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Placement Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter size={14} className="text-slate-400" />
            <select
              value={placementFilter}
              onChange={(e) => setPlacementFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="All">All Placements</option>
              {PLACEMENT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="All">All Statuses</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
            <option value="archived">Archived</option>
          </select>

          <button
            type="button"
            onClick={loadData}
            title="Reload data"
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Advertisements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="text-xs sm:text-sm">Loading advertisement campaigns from database...</p>
          </div>
        ) : advertisements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title={stats.total === 0 && !searchQuery ? "No advertisement campaigns created" : "No advertisement campaigns found"}
            description={
              stats.total === 0 && !searchQuery
                ? "No advertisement campaigns have been created."
                : "Create a campaign or adjust your search filters to display sponsored placements."
            }
            actionLabel="Create Advertisement"
            onAction={handleOpenCreate}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-3.5 px-4">Campaign & Headline</th>
                  <th className="py-3.5 px-4">Advertiser</th>
                  <th className="py-3.5 px-4">Placement</th>
                  <th className="py-3.5 px-4">Schedule Timeline</th>
                  <th className="py-3.5 px-4 text-center">Priority</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {advertisements.map((ad) => {
                  const placementLabel =
                    PLACEMENT_OPTIONS.find((p) => p.value === ad.placement)?.label || ad.placement;

                  return (
                    <tr key={ad._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {ad.media?.url ? (
                            <img
                              src={ad.media.url}
                              alt={ad.headline}
                              className="w-12 h-9 object-cover rounded-lg border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-9 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0">
                              <ImageIcon size={16} />
                            </div>
                          )}
                          <div className="min-w-0 max-w-xs">
                            <span className="font-semibold text-slate-900 block truncate">
                              {ad.campaignName}
                            </span>
                            <span className="text-[11px] text-slate-500 block truncate">
                              {ad.headline}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-800">
                          {ad.advertiserName || "Commercial Partner"}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                          {placementLabel}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-slate-400 shrink-0" />
                          <span>
                            {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : "Immediate"}
                            {" → "}
                            {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : "Open-ended"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {ad.priority || 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge status={ad.status} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Live Action */}
                          <button
                            type="button"
                            onClick={() => setPreviewAd(ad)}
                            title="Preview placement component"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye size={15} />
                          </button>

                          {/* Edit Action */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ad)}
                            title="Edit campaign"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit size={15} />
                          </button>

                          {/* Quick Lifecycle: Activate / Pause */}
                          {ad.status === "active" ? (
                            <button
                              type="button"
                              onClick={() => handlePause(ad._id)}
                              title="Pause campaign"
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pause size={15} />
                            </button>
                          ) : ad.status !== "archived" ? (
                            <button
                              type="button"
                              onClick={() => handleActivate(ad._id)}
                              title="Activate campaign"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Play size={15} />
                            </button>
                          ) : null}

                          {/* Archive or Restore */}
                          {ad.status === "archived" ? (
                            <button
                              type="button"
                              onClick={() => setAdToRestore(ad)}
                              title="Restore to draft"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <RotateCcw size={15} />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setAdToArchive(ad)}
                              title="Archive campaign"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 size={15} />
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
        )}
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-2">
          <span>
            Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total campaigns)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={!pagination.hasPrevPage}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={!pagination.hasNextPage}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create / Edit Campaign Modal Form */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAd ? "Edit Advertisement Campaign" : "Create Advertisement Campaign"}
        subtitle="Manage campaign creative, targeting placement, and scheduled live dates"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Campaign Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.campaignName}
                onChange={(e) => setFormData((p) => ({ ...p, campaignName: e.target.value }))}
                placeholder="e.g. Q4 Executive Tech Summit"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.campaignName && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.campaignName}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Advertiser / Sponsor Name
              </label>
              <input
                type="text"
                value={formData.advertiserName}
                onChange={(e) => setFormData((p) => ({ ...p, advertiserName: e.target.value }))}
                placeholder="e.g. Pan-African Fintech Consortium"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Headline Copy <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.headline}
              onChange={(e) => setFormData((p) => ({ ...p, headline: e.target.value }))}
              placeholder="Primary commercial banner title..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {errors.headline && <p className="text-[11px] text-rose-500 mt-1">{errors.headline}</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Supporting Narrative Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Commercial narrative supporting text..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Placement Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData((p) => ({ ...p, placement: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {PLACEMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Campaign Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData((p) => ({ ...p, status: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="draft">Draft (Private, not live)</option>
                <option value="active">Active (Eligible for display)</option>
                <option value="paused">Paused (Temporarily held)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Call to Action Button Label
              </label>
              <input
                type="text"
                value={formData.buttonText}
                onChange={(e) => setFormData((p) => ({ ...p, buttonText: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Destination URL <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.destinationUrl}
                onChange={(e) => setFormData((p) => ({ ...p, destinationUrl: e.target.value }))}
                placeholder="https://..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.destinationUrl && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.destinationUrl}</p>
              )}
            </div>
          </div>

          {/* Media Selection via ImagePicker (ImageKit Media Library) */}
          <div>
            <ImagePicker
              value={formData.imageUrl}
              onChange={handleImageChange}
              label="Advertisement Image Asset"
              helpText="Select an asset from the ImageKit Media Library or upload a new commercial graphic."
            />
            {errors.media && <p className="text-[11px] text-rose-500 mt-1">{errors.media}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Start Date (Optional)
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              {errors.endDate && <p className="text-[11px] text-rose-500 mt-1">{errors.endDate}</p>}
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Display Priority (0 - 100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData((p) => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              <span>{editingAd ? "Save Changes" : "Create Campaign"}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Visual Placement Preview Modal */}
      {previewAd && (
        <Modal
          isOpen={true}
          onClose={() => setPreviewAd(null)}
          title={`Public Placement Preview: ${previewAd.campaignName}`}
          subtitle={`Placement Target: ${previewAd.placement}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>Live Placement Simulation:</strong> This component renders exactly as public website visitors will see it on Nsemra News.
              </span>
            </div>

            {/* Render exact Nsemra News Advert frame */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 md:p-10 border border-slate-800 shadow-md relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Sponsored &bull; Commercial Partner Placement
                </span>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {previewAd.advertiserName || "Commercial Partner"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                {previewAd.media?.url && (
                  <div className="md:col-span-3 h-32 rounded-xl overflow-hidden border border-slate-800 bg-slate-950/50">
                    <img
                      src={previewAd.media.url}
                      alt={previewAd.headline}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className={`${previewAd.media?.url ? "md:col-span-6" : "md:col-span-8"} space-y-2`}>
                  <h3 className="text-xl sm:text-2xl font-bold font-serif-headline text-white tracking-tight">
                    {previewAd.headline}
                  </h3>
                  {previewAd.description && (
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl">
                      {previewAd.description}
                    </p>
                  )}
                </div>

                <div className={`${previewAd.media?.url ? "md:col-span-3" : "md:col-span-4"} flex flex-col items-end justify-center gap-3`}>
                  <div className="w-full text-center px-6 py-3 bg-blue-600 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md flex items-center justify-center gap-2">
                    <span>{previewAd.buttonText || "Learn More"}</span>
                    <ExternalLink size={14} />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right w-full">
                    Destination: {previewAd.destinationUrl}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setPreviewAd(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={Boolean(adToArchive)}
        onClose={() => setAdToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Advertisement Campaign"
        message={`Are you sure you want to archive "${adToArchive?.campaignName}"? This campaign will no longer appear on the public website, but its records and ImageKit assets will be preserved.`}
        confirmText="Archive Campaign"
        variant="danger"
      />

      {/* Confirm Restore Dialog */}
      <ConfirmDialog
        isOpen={Boolean(adToRestore)}
        onClose={() => setAdToRestore(null)}
        onConfirm={handleRestoreConfirm}
        title="Restore Advertisement Campaign"
        message={`Restore "${adToRestore?.campaignName}" to draft status? It will not be visible publicly until explicitly activated.`}
        confirmText="Restore to Draft"
        variant="primary"
      />
    </div>
  );
};

export default Advertisements;
