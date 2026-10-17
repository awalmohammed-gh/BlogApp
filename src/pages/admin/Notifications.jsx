import { useState, useEffect } from "react";
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
  Tag
} from "lucide-react";
import { useNotifications } from "../../context/admin/NotificationContext";
import EmptyState from "../../components/admin/common/EmptyState";
import ConfirmDialog from "../../components/admin/common/ConfirmDialog";

export const Notifications = () => {
  const {
    notifications,
    unreadCount,
    pagination,
    isLoading,
    fetchNotifications,
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

  // Selection states for bulk actions
  const [selectedIds, setSelectedIds] = useState([]);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  // Clear selection on page or filter change to prevent accidental cross-page deletion
  useEffect(() => {
    setSelectedIds([]);
  }, [typeFilter, readFilter, sortOrder, currentPage]);

  // Trigger query refetch whenever filters change
  useEffect(() => {
    const params = {
      page: currentPage,
      limit: 20,
      sortBy: "createdAt",
      sortOrder
    };

    if (typeFilter !== "all") {
      params.type = typeFilter;
    }

    if (readFilter === "unread") {
      params.isRead = "false";
    } else if (readFilter === "read") {
      params.isRead = "true";
    }

    fetchNotifications(params);
  }, [typeFilter, readFilter, sortOrder, currentPage, fetchNotifications]);

  const visibleNotificationIds = notifications.map((n) => n._id || n.id).filter(Boolean);
  const isAllVisibleSelected =
    visibleNotificationIds.length > 0 &&
    visibleNotificationIds.every((id) => selectedIds.includes(id));

  const handleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleNotificationIds);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmSingleDelete = () => {
    if (notificationToDelete) {
      const id = notificationToDelete._id || notificationToDelete.id;
      deleteNotification(id);
      setSelectedIds((prev) => prev.filter((item) => item !== id));
      setNotificationToDelete(null);
    }
  };

  const handleConfirmBulkDelete = () => {
    if (selectedIds.length > 0) {
      deleteBulkNotifications(selectedIds);
      setSelectedIds([]);
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell size={24} className="text-blue-600" />
              Newsroom Notifications Center
            </h1>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 text-xs font-bold bg-rose-100 text-rose-700 rounded-full">
                {unreadCount > 99 ? "99+" : unreadCount} unread
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time editorial notifications, reporter submissions, and newsroom administrative alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => fetchNotifications()}
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
        {/* Type pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: "all", label: "All Alerts" },
            { id: "article_submitted", label: "Submissions" },
            { id: "article_approved", label: "Approvals" },
            { id: "changes_requested", label: "Changes" },
            { id: "article_published", label: "Published" },
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

        {/* Read Status & Sort Controls */}
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
        <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold text-blue-900">
              {selectedIds.length === 1 ? "1 notification selected" : `${selectedIds.length} notifications selected`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-blue-100/60 rounded-lg transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteConfirmOpen(true)}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* Notifications List Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table/List Subheader with Select All */}
        {notifications.length > 0 && (
          <div className="px-4 sm:px-5 py-3 bg-slate-50/80 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <label className="flex items-center gap-2.5 font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isAllVisibleSelected}
                onChange={handleSelectAllVisible}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span>Select All Visible ({visibleNotificationIds.length})</span>
            </label>
            <span className="text-[11px] text-slate-400">
              Showing page {pagination.page} of {pagination.totalPages}
            </span>
          </div>
        )}

        {isLoading && notifications.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading notifications from MongoDB...</p>
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="You're all caught up. No notifications to display."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notif) => {
              const id = notif._id || notif.id;
              const isSelected = selectedIds.includes(id);
              const isRead = notif.isRead ?? notif.read;
              const targetUrl = notif.actionUrl || notif.targetUrl;
              const timeDisplay = notif.createdAt
                ? new Date(notif.createdAt).toLocaleString()
                : notif.timestamp || "Just now";

              return (
                <div
                  key={id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    isSelected
                      ? "bg-blue-50/60"
                      : !isRead
                      ? "bg-blue-50/20 hover:bg-blue-50/40"
                      : "hover:bg-slate-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox */}
                    <div className="pt-2 sm:pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(id)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        aria-label={`Select notification: ${notif.title}`}
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 mt-0.5">
                      {getIconForType(notif.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {notif.title}
                        </h4>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                        {notif.message}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-1.5 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Clock size={11} /> {timeDisplay}
                        </span>
                        {notif.actorId?.name && (
                          <span>&bull; Actor: {notif.actorId.name}</span>
                        )}
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                          {notif.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {targetUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isRead) markNotificationAsRead(id);
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
                      onClick={() =>
                        isRead ? markNotificationAsUnread(id) : markNotificationAsRead(id)
                      }
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title={isRead ? "Mark as Unread" : "Mark as Read"}
                    >
                      <Check size={16} className={isRead ? "text-emerald-600" : ""} />
                    </button>

                    <button
                      type="button"
                      onClick={() => archiveNotification(id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      title="Archive Notification"
                    >
                      <Archive size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotificationToDelete(notif)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Delete Notification"
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
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Single Notification Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!notificationToDelete}
        onClose={() => setNotificationToDelete(null)}
        onConfirm={handleConfirmSingleDelete}
        title="Delete Notification?"
        message="Are you sure you want to permanently delete this notification? This action cannot be undone."
        confirmText="Delete Notification"
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Notifications?"
        message={`You're about to delete ${selectedIds.length} selected notifications. This action cannot be undone.`}
        confirmText="Delete Notifications"
      />
    </div>
  );
};

export default Notifications;
