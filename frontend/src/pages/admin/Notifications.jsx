import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  GitPullRequest,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Check,
  Eye,
  RefreshCw,
  Archive,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Globe,
  Tag,
  Mail
} from "lucide-react";
import toast from "react-hot-toast";
import { useNotifications } from "../../context/admin/NotificationContext";
import notificationService from "../../services/admin/notificationService";
import EmptyState from "../../components/admin/common/EmptyState";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";

const PAGE_SIZE = 20;
const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const Notifications = () => {
  const {
    unreadCount,
    syncToken,
    getEpoch,
    withoutDeleted,
    refresh,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    archiveNotification,
    deleteNotification,
    deleteBulkNotifications
  } = useNotifications();

  const navigate = useNavigate();

  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);

  // This page's own list. The header preview never overwrites it.
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Selection is scoped to the notifications visible on the current page and uses MongoDB IDs.
  const [selectedIds, setSelectedIds] = useState([]);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const query = useMemo(() => {
    const params = { page: currentPage, limit: PAGE_SIZE, sortBy: "createdAt", sortOrder };
    if (typeFilter !== "all") params.type = typeFilter;
    if (readFilter === "unread") params.isRead = "false";
    else if (readFilter === "read") params.isRead = "true";
    return params;
  }, [currentPage, sortOrder, typeFilter, readFilter]);

  const requestSeqRef = useRef(0);
  const loadList = useCallback(
    async ({ background = false } = {}) => {
      const seq = ++requestSeqRef.current;
      const epoch = getEpoch();
      if (!background) setIsLoading(true);
      try {
        const res = await notificationService.getNotifications(query);
        // Ignore out-of-order responses and any that overlapped a delete/read change
        if (seq !== requestSeqRef.current || epoch !== getEpoch()) return;
        const page = res.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };
        if (res.data.length === 0 && page.page > 1 && page.page > page.totalPages) {
          // The last page was emptied (e.g. after a deletion): step back to the new last page
          setCurrentPage(page.totalPages);
          return;
        }
        setItems(withoutDeleted(res.data));
        setPagination(page);
        setLoadError("");
      } catch (err) {
        if (seq === requestSeqRef.current) setLoadError(err?.message || "Failed to load notifications");
      } finally {
        if (seq === requestSeqRef.current) setIsLoading(false);
      }
    },
    [query, getEpoch, withoutDeleted]
  );

  // New query: clear selection so nothing off-screen can ever be deleted
  useEffect(() => {
    setSelectedIds([]);
    loadList();
  }, [loadList]);

  // Poll ticks and mutations (in this or another view) refresh the current query
  const lastSyncTokenRef = useRef(syncToken);
  useEffect(() => {
    if (syncToken === lastSyncTokenRef.current) return;
    lastSyncTokenRef.current = syncToken;
    loadList({ background: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncToken]);

  // Keep the selection limited to rows that are still visible after any refresh
  useEffect(() => {
    const visible = new Set(items.map((n) => n._id));
    setSelectedIds((prev) => {
      const next = prev.filter((id) => visible.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  const visibleNotificationIds = items.map((n) => n._id);
  const isAllVisibleSelected =
    visibleNotificationIds.length > 0 && visibleNotificationIds.every((id) => selectedIds.includes(id));
  const isSomeVisibleSelected = selectedIds.length > 0 && !isAllVisibleSelected;

  const selectAllRef = useRef(null);
  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = isSomeVisibleSelected;
  }, [isSomeVisibleSelected]);

  const handleSelectAllVisible = () => {
    setSelectedIds(isAllVisibleSelected ? [] : visibleNotificationIds);
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const patchItem = (id, changes) =>
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, ...changes } : n)));

  const handleToggleRead = async (notif) => {
    try {
      if (notif.isRead) {
        await markNotificationAsUnread(notif._id);
        patchItem(notif._id, { isRead: false, readAt: null });
      } else {
        await markNotificationAsRead(notif._id);
        patchItem(notif._id, { isRead: true });
      }
    } catch {
      // Context already reported the error; the list is unchanged
    }
  };

  const handleArchive = async (id) => {
    try {
      await archiveNotification(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
    } catch {
      // Context already reported the error
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!notificationToDelete) return;
    const id = notificationToDelete._id;
    setIsDeleting(true);
    try {
      await deleteNotification(id);
      setItems((prev) => prev.filter((n) => n._id !== id));
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
      toast.success("Notification deleted");
    } catch (err) {
      if (err?.status === 404) {
        // Already gone (e.g. deleted in another tab): reconcile with the server
        setItems((prev) => prev.filter((n) => n._id !== id));
        toast.error("That notification is no longer available.");
        refresh({ background: true });
      } else {
        toast.error(err?.message || "Failed to delete notification");
      }
    } finally {
      setIsDeleting(false);
      setNotificationToDelete(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setIsDeleting(true);
    try {
      const res = await deleteBulkNotifications(ids);
      const gone = new Set([...(res.deletedIds || []), ...(res.unavailableIds || [])]);
      setItems((prev) => prev.filter((n) => !gone.has(n._id)));
      setSelectedIds((prev) => prev.filter((id) => !gone.has(id)));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - (res.deletedCount || 0)) }));

      const unavailable = (res.unavailableIds || []).length;
      if (unavailable > 0) {
        toast(`Deleted ${res.deletedCount} of ${res.requestedCount}. ${plural(unavailable, "notification")} ${unavailable === 1 ? "was" : "were"} no longer available.`, { icon: "⚠️" });
      } else {
        toast.success(`Deleted ${plural(res.deletedCount, "notification")}`);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to delete the selected notifications. Nothing was removed.");
    } finally {
      setIsDeleting(false);
      setIsBulkDeleteConfirmOpen(false);
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case "article_submitted":
        return <GitPullRequest size={16} className="text-amber-500" />;
      case "article_approved":
        return <CheckCircle2 size={16} className="text-emerald-500" />;
      case "changes_requested":
        return <Send size={16} className="text-rose-500" />;
      case "article_rejected":
        return <ShieldAlert size={16} className="text-rose-600" />;
      case "article_published":
        return <CheckCircle2 size={16} className="text-blue-500" />;
      case "article_assigned":
        return <Calendar size={16} className="text-indigo-500" />;
      case "comment_pending":
        return <MessageSquare size={16} className="text-purple-500" />;
      case "contact_received":
        return <Mail size={16} className="text-sky-600" />;
      case "staff_role_changed":
        return <ShieldAlert size={16} className="text-amber-600" />;
      case "cms_page_published":
        return <Globe size={16} className="text-blue-600" />;
      case "advertisement_updated":
        return <Tag size={16} className="text-emerald-600" />;
      default:
        return <Bell size={16} className="text-slate-500" />;
    }
  };

  const isFiltered = typeFilter !== "all" || readFilter !== "all";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell size={24} className="text-blue-600" />
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Editorial, moderation and newsroom alerts created by actual activity. {isFiltered ? "Matching" : "Total"}: {pagination.total}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              loadList();
              refresh({ background: true });
            }}
            disabled={isLoading}
            className="p-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            title="Refresh notifications"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin text-blue-600" : ""} />
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllNotificationsAsRead}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Check size={14} />
              <span>Mark All as Read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Alerts" },
            { id: "article_submitted", label: "Submissions" },
            { id: "article_approved", label: "Approvals" },
            { id: "changes_requested", label: "Changes" },
            { id: "article_published", label: "Published" },
            { id: "comment_pending", label: "Comments" },
            { id: "staff_role_changed", label: "Staff" },
            { id: "cms_page_published", label: "Website" },
            { id: "advertisement_updated", label: "Commercial" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setTypeFilter(tab.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                typeFilter === tab.id
                  ? "bg-blue-600 text-white font-semibold shadow-2xs"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500">Status:</span>
            <select
              value={readFilter}
              onChange={(e) => {
                setReadFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-1 cursor-pointer"
            title={`Sort: ${sortOrder === "desc" ? "Newest first" : "Oldest first"}`}
          >
            <ArrowUpDown size={14} />
            <span className="hidden sm:inline font-medium text-[11px]">
              {sortOrder === "desc" ? "Newest" : "Oldest"}
            </span>
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div
          className="sticky top-2 z-20 bg-blue-50/95 backdrop-blur border border-blue-200 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3"
          role="region"
          aria-label="Bulk notification actions"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="min-w-6 h-6 px-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-blue-900">
              {plural(selectedIds.length, "notification")} selected on this page
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={isDeleting}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-blue-100/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              disabled={isDeleting}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {items.length > 0 && (
          <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <label className="flex items-center gap-2.5 font-medium cursor-pointer select-none">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleSelectAllVisible}
                disabled={isDeleting}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                aria-label="Select all notifications on this page"
              />
              <span>Select all on this page ({visibleNotificationIds.length})</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Selection covers this page only and clears when you change page or filters.
            </span>
          </div>
        )}

        {loadError && (
          <div className="px-5 py-3 text-xs text-rose-700 bg-rose-50 border-b border-rose-100">{loadError}</div>
        )}

        {isLoading && items.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading notifications...</p>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={isFiltered ? "No matching notifications" : "You're all caught up"}
            description={isFiltered ? "No notifications match the current filters." : "You're all caught up. No notifications to display."}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((notif) => {
              const id = notif._id;
              const isSelected = selectedIds.includes(id);
              const isRead = notif.isRead;
              const targetUrl = notif.actionUrl;
              const timeDisplay = notif.createdAt ? new Date(notif.createdAt).toLocaleString() : "";

              return (
                <div
                  key={id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isSelected ? "bg-blue-50/60" : !isRead ? "bg-blue-50/20 hover:bg-blue-50/40" : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="pt-2 sm:pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(id)}
                        disabled={isDeleting}
                        className="w-5 h-5 sm:w-4 sm:h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        aria-label={`Select notification: ${notif.title}`}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5">
                      {getIconForType(notif.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 wrap-break-word">{notif.title}</h4>
                        {!isRead && <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" aria-label="Unread" />}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed wrap-break-word">{notif.message}</p>
                      <div className="text-[11px] text-slate-400 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                        {timeDisplay && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {timeDisplay}
                          </span>
                        )}
                        {notif.actorId?.name && <span>&bull; By {notif.actorId.name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {targetUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isRead) markNotificationAsRead(id).catch(() => {});
                          navigate(targetUrl);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleRead(notif)}
                      className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={isRead ? "Mark as Unread" : "Mark as Read"}
                      aria-label={isRead ? "Mark as unread" : "Mark as read"}
                    >
                      <Check size={16} className={isRead ? "text-emerald-600" : ""} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleArchive(id)}
                      className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Archive Notification"
                      aria-label="Archive notification"
                    >
                      <Archive size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationToDelete(notif)}
                      disabled={isDeleting}
                      className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete Notification"
                      aria-label="Delete notification"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1 || isDeleting}
                className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages || isDeleting}
                className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!notificationToDelete}
        onClose={() => setNotificationToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        closeOnConfirm={false}
        isProcessing={isDeleting}
        processingText="Deleting..."
        title="Delete Notification?"
        message="This permanently deletes the notification. The related article, comment or record is not affected. This action cannot be undone."
        confirmText="Delete Notification"
      />

      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        closeOnConfirm={false}
        isProcessing={isDeleting}
        processingText="Deleting..."
        title="Delete Selected Notifications?"
        message={`You're about to delete ${plural(selectedIds.length, "selected notification")}. This action cannot be undone.`}
        confirmText="Delete Notifications"
      />
    </div>
  );
};

export default Notifications;
