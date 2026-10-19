import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  UploadCloud,
  Search,
  Grid,
  List as ListIcon,
  Image as ImageIcon,
  Copy,
  Trash2,
  Eye,
  Info,
  Calendar,
  User,
  Check,
  X,
  Folder,
  Archive,
  RotateCcw,
  RefreshCw,
  HardDrive,
  Layers,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Loader2,
  FileText
} from "lucide-react";
import toast from "../../utils/toast";

import { useAuth } from "../../context/admin/AuthContext";
import mediaService from "../../services/admin/mediaService";
import Modal from "../../components/admin/common/Modal";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";
import EmptyState from "../../components/admin/common/EmptyState";
import Pagination from "../../components/admin/common/Pagination";
import StatCard from "../../components/admin/common/StatCard";

const FOLDER_OPTIONS = [
  { key: "all", label: "All Folders" },
  { key: "articles-featured", label: "Articles / Featured" },
  { key: "articles-content", label: "Articles / Content" },
  { key: "articles", label: "Articles (Legacy)" },
  { key: "general", label: "General Media" },
  { key: "advertisements", label: "Advertisements" },
  { key: "authors", label: "Authors" },
  { key: "branding", label: "Branding" }
];

export const MediaLibrary = () => {
  const { admin } = useAuth();
  const isAuthor = admin?.role === "author";

  // State: Assets and Pagination
  const [mediaItems, setMediaItems] = useState([]);
  const [stats, setStats] = useState({
    totalFiles: 0,
    activeFiles: 0,
    archivedFiles: 0,
    totalStorageBytes: 0,
    inUseCount: 0,
    unusedCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [mimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // View & Inspection
  const [viewMode, setViewMode] = useState("grid"); // 'grid' | 'list'
  const [activeMediaDetail, setActiveMediaDetail] = useState(null);
  const [detailUsage, setDetailUsage] = useState(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Metadata Edit Modal
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", altText: "", caption: "", folder: "general" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Confirmation Modals
  const [mediaToArchive, setMediaToArchive] = useState(null);
  const [mediaToRestore, setMediaToRestore] = useState(null);
  const [mediaToDelete, setMediaToDelete] = useState(null);
  const [deleteBlockedInfo, setDeleteBlockedInfo] = useState(null);

  // Upload Modal State (Supports Multiple Files & Drag-Drop)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [targetUploadFolder, setTargetUploadFolder] = useState("articles-featured");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch Media List
  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const res = await mediaService.getMedia({
        page: currentPage,
        limit: pageSize,
        search: searchQuery,
        folder: folderFilter !== "all" ? folderFilter : undefined,
        status: statusFilter,
        mimeType: mimeFilter !== "all" ? mimeFilter : undefined,
        sortBy,
        sortOrder
      });

      if (res?.success) {
        setMediaItems(res.data || []);
        setTotalItems(res.pagination?.total || 0);
        setTotalPages(res.pagination?.totalPages || 1);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load media assets");
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchQuery, folderFilter, statusFilter, mimeFilter, sortBy, sortOrder]);

  // Fetch Real Media Stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await mediaService.getMediaStats();
      if (res?.success && res.data) {
        setStats(res.data);
      }
    } catch {
      // Silently handled
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  useEffect(() => {
    fetchStats();
  }, []);

  // Fetch Usage details when viewing single asset
  const handleOpenDetails = async (item) => {
    setActiveMediaDetail(item);
    setDetailUsage(null);
    setLoadingUsage(true);
    try {
      const res = await mediaService.getMediaUsage(item._id);
      if (res?.success && res.data) {
        setDetailUsage(res.data);
      }
    } catch {
      // Handled silently
    } finally {
      setLoadingUsage(false);
    }
  };

  const handleCopyUrl = (url, id) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success("ImageKit CDN URL copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Edit Form
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name || "",
      altText: item.altText || "",
      caption: item.caption || "",
      folder: item.folder || "general"
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSavingEdit(true);
      const res = await mediaService.updateMedia(editingItem._id, editForm);
      if (res?.success && res.data) {
        toast.success("Media metadata updated successfully");
        setMediaItems((prev) =>
          prev.map((item) => (item._id === editingItem._id ? { ...item, ...res.data } : item))
        );
        if (activeMediaDetail?._id === editingItem._id) {
          setActiveMediaDetail({ ...activeMediaDetail, ...res.data });
        }
        setEditingItem(null);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to update media metadata");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Archive Action
  const handleArchiveConfirm = async () => {
    if (!mediaToArchive) return;
    try {
      const res = await mediaService.archiveMedia(mediaToArchive._id);
      if (res?.success) {
        toast.success(`"${mediaToArchive.name}" has been archived`);
        setMediaToArchive(null);
        if (activeMediaDetail?._id === mediaToArchive._id) {
          setActiveMediaDetail(null);
        }
        fetchMedia();
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.message || "Failed to archive media asset");
    }
  };

  // Restore Action
  const handleRestoreConfirm = async () => {
    if (!mediaToRestore) return;
    try {
      const res = await mediaService.restoreMedia(mediaToRestore._id);
      if (res?.success) {
        toast.success(`"${mediaToRestore.name}" restored to active media`);
        setMediaToRestore(null);
        if (activeMediaDetail?._id === mediaToRestore._id) {
          setActiveMediaDetail(null);
        }
        fetchMedia();
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.message || "Failed to restore media asset");
    }
  };

  // Attempt Delete with Usage Safeguard
  const handleTriggerDelete = async (item) => {
    try {
      const res = await mediaService.getMediaUsage(item._id);
      const usageCount = res?.data?.usageCount || 0;

      if (usageCount > 0) {
        setDeleteBlockedInfo({
          item,
          usageCount,
          articles: res?.data?.articles || []
        });
        return;
      }

      setMediaToDelete(item);
    } catch (err) {
      toast.error(err?.message || "Failed to verify asset usage");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!mediaToDelete) return;
    try {
      const res = await mediaService.deleteMedia(mediaToDelete._id);
      if (res?.success) {
        toast.success("Media asset permanently deleted from ImageKit & database");
        setMediaToDelete(null);
        if (activeMediaDetail?._id === mediaToDelete._id) {
          setActiveMediaDetail(null);
        }
        fetchMedia();
        fetchStats();
      }
    } catch (err) {
      if (err?.status === 409) {
        toast.error(err.message || "Cannot delete: Asset is currently referenced by articles");
      } else {
        toast.error(err?.message || "Failed to permanently delete media asset");
      }
    }
  };

  // File Upload Handlers (Single / Multiple)
  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const validFiles = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) {
        toast.error(`"${f.name}" is not an image (JPEG, PNG, WebP supported)`);
        continue;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds 5MB limit`);
        continue;
      }
      validFiles.push({
        file: f,
        preview: URL.createObjectURL(f),
        name: f.name,
        size: mediaService.formatBytes(f.size)
      });
    }

    setSelectedUploadFiles((prev) => [...prev, ...validFiles].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUploadSubmit = async () => {
    if (selectedUploadFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(10);

      const rawFiles = selectedUploadFiles.map((item) => item.file);

      let res;
      if (rawFiles.length === 1) {
        res = await mediaService.uploadSingle(
          rawFiles[0],
          { folder: targetUploadFolder },
          (p) => setUploadProgress(p)
        );
      } else {
        res = await mediaService.uploadMultiple(
          rawFiles,
          targetUploadFolder,
          (p) => setUploadProgress(p)
        );
      }

      if (res?.success) {
        toast.success(res.message || "Upload complete!");
        setIsUploadModalOpen(false);
        setSelectedUploadFiles([]);
        fetchMedia();
        fetchStats();
      } else if (res?.failures?.length) {
        toast.error(res.message || "Some files failed to upload");
        fetchMedia();
        fetchStats();
      }
    } catch (err) {
      toast.error(err?.message || "Failed to upload image(s) to ImageKit");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Media Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Upload, organize, and manage images across your newsroom.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedUploadFiles([]);
            setIsUploadModalOpen(true);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <UploadCloud size={16} />
          <span>Upload Media</span>
        </button>
      </div>

      {/* Real Statistics Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Media"
          value={loadingStats ? "..." : stats.totalFiles}
          icon={Layers}
          color="blue"
        />
        <StatCard
          title="Active Assets"
          value={loadingStats ? "..." : stats.activeFiles}
          icon={ImageIcon}
          color="emerald"
        />
        <StatCard
          title="In Use"
          value={loadingStats ? "..." : stats.inUseCount}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Unreferenced"
          value={loadingStats ? "..." : stats.unusedCount}
          icon={Info}
          color="slate"
        />
        <StatCard
          title="Archived"
          value={loadingStats ? "..." : stats.archivedFiles}
          icon={Archive}
          color="amber"
        />
        <StatCard
          title="Storage Recorded"
          value={loadingStats ? "..." : mediaService.formatBytes(stats.totalStorageBytes)}
          icon={HardDrive}
          color="blue"
        />
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by filename, display name, alt text..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Filters & View Toggles */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            {/* Folder Select */}
            <select
              value={folderFilter}
              onChange={(e) => {
                setFolderFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              {FOLDER_OPTIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="active">Active Only</option>
              <option value="archived">Archived Only</option>
              <option value="all">All Statuses</option>
            </select>

            {/* Sort Select */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="name-asc">Name (A–Z)</option>
              <option value="name-desc">Name (Z–A)</option>
              <option value="size-desc">Largest Size</option>
            </select>

            {/* Grid / List Switcher */}
            <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === "grid" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
                title="Grid View"
              >
                <Grid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                  viewMode === "list" ? "bg-white text-blue-600 shadow-xs" : "hover:text-slate-900"
                }`}
                title="List View"
              >
                <ListIcon size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-16 flex flex-col items-center justify-center gap-2 text-slate-400">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <span className="text-xs font-medium">Fetching real MongoDB media records...</span>
        </div>
      ) : mediaItems.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title={stats.total === 0 && !searchQuery ? "No media uploaded yet" : "No media assets found"}
          description={
            stats.total === 0 && !searchQuery
              ? "No media uploaded yet."
              : "We couldn't find any images matching your current filter criteria. Upload images to ImageKit for your newsroom."
          }
          actionLabel="Upload Media"
          onAction={() => {
            setSelectedUploadFiles([]);
            setIsUploadModalOpen(true);
          }}
        />
      ) : viewMode === "grid" ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {mediaItems.map((item) => (
            <div
              key={item._id}
              className={`bg-white rounded-xl border overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col ${
                item.status === "archived" ? "border-amber-300/80 bg-amber-50/20" : "border-slate-200/80"
              }`}
            >
              <div
                onClick={() => handleOpenDetails(item)}
                className="relative aspect-video bg-slate-950 overflow-hidden cursor-pointer"
              >
                <img
                  src={item.thumbnailUrl || item.url}
                  alt={item.altText || item.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <span className="p-1.5 bg-white text-slate-900 rounded-lg shadow">
                    <Eye size={14} />
                  </span>
                </div>
                <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 bg-slate-900/80 text-white rounded text-[9px] font-mono uppercase">
                    {item.extension || "IMG"}
                  </span>
                  {item.usageCount > 0 && (
                    <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold">
                      {item.usageCount} {item.usageCount === 1 ? "use" : "uses"}
                    </span>
                  )}
                  {item.status === "archived" && (
                    <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded text-[9px] font-bold">
                      Archived
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div
                    onClick={() => handleOpenDetails(item)}
                    className="text-xs font-semibold text-slate-800 truncate cursor-pointer hover:text-blue-600"
                    title={item.name}
                  >
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {mediaService.formatBytes(item.size)} &bull; {item.folder}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-slate-400">
                  <button
                    type="button"
                    onClick={() => handleCopyUrl(item.url, item._id)}
                    title="Copy ImageKit Delivery URL"
                    className="p-1 hover:text-blue-600 rounded transition-colors cursor-pointer"
                  >
                    {copiedId === item._id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Metadata"
                      className="p-1 hover:text-slate-800 rounded transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>

                    {item.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => setMediaToArchive(item)}
                        title="Archive Asset"
                        className="p-1 hover:text-amber-600 rounded transition-colors cursor-pointer"
                      >
                        <Archive size={13} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setMediaToRestore(item)}
                        title="Restore to Active"
                        className="p-1 hover:text-emerald-600 rounded transition-colors cursor-pointer"
                      >
                        <RotateCcw size={13} />
                      </button>
                    )}

                    {!isAuthor && (
                      <button
                        type="button"
                        onClick={() => handleTriggerDelete(item)}
                        title={item.usageCount > 0 ? "Cannot delete: currently referenced" : "Permanently Delete Asset"}
                        className={`p-1 rounded transition-colors cursor-pointer ${
                          item.usageCount > 0
                            ? "hover:text-amber-600 text-slate-300"
                            : "hover:text-rose-600"
                        }`}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Asset</th>
                  <th className="px-4 py-3.5">Name</th>
                  <th className="px-4 py-3.5">Folder</th>
                  <th className="px-4 py-3.5">Dimensions</th>
                  <th className="px-4 py-3.5">Size</th>
                  <th className="px-4 py-3.5">Usage</th>
                  <th className="px-4 py-3.5">Uploaded By</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mediaItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3">
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt=""
                        className="w-12 h-9 rounded-lg object-cover border border-slate-200 bg-slate-900 cursor-pointer"
                        onClick={() => handleOpenDetails(item)}
                        loading="lazy"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        onClick={() => handleOpenDetails(item)}
                        className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer truncate max-w-xs"
                      >
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {item.originalName}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px]">
                        {item.folder}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {item.width && item.height ? `${item.width} × ${item.height}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{mediaService.formatBytes(item.size)}</td>
                    <td className="px-4 py-3">
                      {item.usageCount > 0 ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded-full text-[10px]">
                          {item.usageCount} {item.usageCount === 1 ? "article" : "articles"}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Unreferenced</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.uploadedBy?.name || "System"}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(item)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Inspect Details"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(item.url, item._id)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Copy Link"
                        >
                          {copiedId === item._id ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
                          title="Edit Details"
                        >
                          <Edit2 size={15} />
                        </button>
                        {!isAuthor && (
                          <button
                            type="button"
                            onClick={() => handleTriggerDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                            title="Delete Asset"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Server-Side Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={(page) => setCurrentPage(page)}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />

      {/* ASSET INSPECTION & USAGE MODAL */}
      <Modal
        isOpen={!!activeMediaDetail}
        onClose={() => setActiveMediaDetail(null)}
        title="Asset Inspection & Usage Tracking"
        maxWidth="max-w-2xl"
      >
        {activeMediaDetail && (
          <div className="space-y-4">
            <div className="rounded-xl overflow-hidden border border-slate-200 aspect-16/9 bg-slate-900 flex items-center justify-center">
              <img
                src={activeMediaDetail.url}
                alt={activeMediaDetail.name}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Display Name</span>
                <span className="font-semibold text-slate-800 truncate block">{activeMediaDetail.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Dimensions</span>
                <span className="font-semibold text-slate-800">
                  {activeMediaDetail.width && activeMediaDetail.height
                    ? `${activeMediaDetail.width} × ${activeMediaDetail.height} px`
                    : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">File Size</span>
                <span className="font-semibold text-slate-800">{mediaService.formatBytes(activeMediaDetail.size)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Folder</span>
                <span className="font-semibold text-slate-800">{activeMediaDetail.folder}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Uploaded By</span>
                <span className="font-semibold text-slate-800">{activeMediaDetail.uploadedBy?.name || "System"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">ImageKit File ID</span>
                <span className="font-mono text-[10px] text-slate-600 truncate block">{activeMediaDetail.fileId}</span>
              </div>
            </div>

            {/* Alt Text & Caption */}
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block">Default Alternative Text:</span>
                <p className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-mono text-[11px]">
                  {activeMediaDetail.altText || "(None provided)"}
                </p>
              </div>
              {activeMediaDetail.caption && (
                <div>
                  <span className="text-slate-500 font-semibold block">Caption:</span>
                  <p className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700">
                    {activeMediaDetail.caption}
                  </p>
                </div>
              )}
            </div>

            {/* ARTICLE USAGE REFERENCES TRACKING */}
            <div className="pt-3 border-t border-slate-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2 flex items-center justify-between">
                <span>Article Usage References</span>
                {loadingUsage ? (
                  <span className="text-slate-400 font-normal">Inspecting...</span>
                ) : (
                  <span className="text-blue-600 font-bold">{detailUsage?.usageCount || 0} referenced</span>
                )}
              </h4>

              {loadingUsage ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  <Loader2 size={16} className="animate-spin inline mr-1" /> Checking article references...
                </div>
              ) : detailUsage?.articles?.length ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                  {detailUsage.articles.map((art) => (
                    <div
                      key={art._id}
                      className="p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <Link
                          to={`/admin/articles/${art._id}/edit`}
                          className="font-semibold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          {art.title} <ExternalLink size={11} />
                        </Link>
                        <span className="text-[10px] text-slate-500">
                          Type: <strong className="font-semibold">{art.usageType}</strong> &bull; Status: {art.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  This media asset is currently not referenced in any published or draft articles.
                </p>
              )}
            </div>

            {/* Modal Bottom Controls */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                {!isAuthor && (
                  <button
                    type="button"
                    onClick={() => {
                      const item = activeMediaDetail;
                      setActiveMediaDetail(null);
                      handleTriggerDelete(item);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete Permanently
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyUrl(activeMediaDetail.url, activeMediaDetail._id)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy size={13} />
                  <span>Copy Asset URL</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMediaDetail(null)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* METADATA EDIT MODAL */}
      <Modal
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        title="Edit Media Metadata"
        maxWidth="max-w-lg"
      >
        {editingItem && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-200">
              <img src={editingItem.url} alt="" className="w-full h-full object-cover" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alt Text (Accessibility)</label>
                <textarea
                  rows={2}
                  value={editForm.altText}
                  onChange={(e) => setEditForm({ ...editForm, altText: e.target.value })}
                  placeholder="Descriptive text for visually impaired readers..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Caption</label>
                <input
                  type="text"
                  value={editForm.caption}
                  onChange={(e) => setEditForm({ ...editForm, caption: e.target.value })}
                  placeholder="Optional photographic caption or photo credit..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Logical Folder</label>
                <select
                  value={editForm.folder}
                  onChange={(e) => setEditForm({ ...editForm, folder: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="articles-featured">Articles / Featured</option>
                  <option value="articles-content">Articles / Content</option>
                  <option value="general">General</option>
                  <option value="advertisements">Advertisements</option>
                  <option value="authors">Authors</option>
                  <option value="branding">Branding</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* UPLOAD MODAL (DRAG & DROP + MULTIPLE UPLOAD) */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          if (!isUploading) {
            setIsUploadModalOpen(false);
            setSelectedUploadFiles([]);
          }
        }}
        title="Upload Images to Media Library"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFilesSelected}
            className="hidden"
          />

          {/* Target Folder Selection */}
          <div className="flex items-center justify-between text-xs p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Target Folder:</span>
            <select
              value={targetUploadFolder}
              onChange={(e) => setTargetUploadFolder(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="articles-featured">Articles / Featured</option>
              <option value="articles-content">Articles / Content</option>
              <option value="general">General Media</option>
            </select>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = Array.from(e.dataTransfer.files || []);
              const valid = [];
              for (const f of files) {
                if (f.type.startsWith("image/") && f.size <= 5 * 1024 * 1024) {
                  valid.push({
                    file: f,
                    preview: URL.createObjectURL(f),
                    name: f.name,
                    size: mediaService.formatBytes(f.size)
                  });
                }
              }
              setSelectedUploadFiles((prev) => [...prev, ...valid].slice(0, 10));
            }}
            className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
              <UploadCloud size={24} />
            </div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900">
              Drag & Drop images here or click to browse
            </h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Supports multiple files (Max: 10 files per batch, 5MB each). Formats: JPEG, PNG, WebP.
            </p>
          </div>

          {/* Selected File Previews */}
          {selectedUploadFiles.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Selected {selectedUploadFiles.length} file(s) for upload:</span>
                <button
                  type="button"
                  onClick={() => setSelectedUploadFiles([])}
                  className="text-rose-600 hover:underline cursor-pointer"
                >
                  Clear all
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-1">
                {selectedUploadFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 bg-slate-900 group"
                  >
                    <img src={item.preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUploadFiles((prev) => prev.filter((_, i) => i !== idx));
                      }}
                      className="absolute top-1 right-1 p-1 bg-slate-950/70 hover:bg-rose-600 text-white rounded cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 p-1 text-[9px] text-white truncate">
                      {item.name} ({item.size})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Uploading to ImageKit CDN & registering in MongoDB...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                setIsUploadModalOpen(false);
                setSelectedUploadFiles([]);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedUploadFiles.length === 0 || isUploading}
              onClick={handleUploadSubmit}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Uploading...
                </>
              ) : (
                <>
                  <UploadCloud size={14} /> Upload {selectedUploadFiles.length ? `(${selectedUploadFiles.length})` : ""}
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ARCHIVE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!mediaToArchive}
        onClose={() => setMediaToArchive(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Media Asset?"
        message={`"${mediaToArchive?.name}" will be hidden from new article image selection, but its ImageKit file and existing article references will be preserved.`}
        confirmText="Archive Asset"
        variant="warning"
      />

      {/* RESTORE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!mediaToRestore}
        onClose={() => setMediaToRestore(null)}
        onConfirm={handleRestoreConfirm}
        title="Restore Media Asset?"
        message={`"${mediaToRestore?.name}" will become active and available for article selection again.`}
        confirmText="Restore Asset"
        variant="primary"
      />

      {/* PERMANENT DELETE CONFIRMATION */}
      <ConfirmDialog
        isOpen={!!mediaToDelete}
        onClose={() => setMediaToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Permanently Delete Media Asset?"
        message={`Are you sure you want to permanently delete "${mediaToDelete?.name}"? This will delete the actual file from ImageKit storage and remove its database record.`}
        confirmText="Permanently Delete"
        variant="danger"
      />

      {/* DELETE BLOCKED MODAL (WHEN MEDIA IS IN USE) */}
      <Modal
        isOpen={!!deleteBlockedInfo}
        onClose={() => setDeleteBlockedInfo(null)}
        title="Deletion Blocked: Media Asset In Use"
        maxWidth="max-w-lg"
      >
        {deleteBlockedInfo && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
              <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  This image is currently used in {deleteBlockedInfo.usageCount} article
                  {deleteBlockedInfo.usageCount === 1 ? "" : "s"} and cannot be permanently deleted.
                </p>
                <p className="mt-1 text-rose-700">
                  To protect public articles and published URLs, please replace or remove this image from the following articles before deleting:
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
              {deleteBlockedInfo.articles.map((art) => (
                <div
                  key={art._id}
                  className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-800 block">{art.title}</span>
                    <span className="text-[10px] text-slate-500">Placement: {art.usageType}</span>
                  </div>
                  <Link
                    to={`/admin/articles/${art._id}/edit`}
                    target="_blank"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-semibold text-[11px]"
                  >
                    Edit Article <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  const item = deleteBlockedInfo.item;
                  setDeleteBlockedInfo(null);
                  setMediaToArchive(item);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow-xs cursor-pointer"
              >
                Archive Instead
              </button>
              <button
                type="button"
                onClick={() => setDeleteBlockedInfo(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MediaLibrary;
