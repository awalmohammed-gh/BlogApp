import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import notificationService from "../../services/admin/notificationService";

const NotificationContext = createContext();

const POLLING_INTERVAL_MS = 30000; // 30 seconds

export const NotificationProvider = ({ children }) => {
  const { admin } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Tracking refs to manage polling lifecycle and prevent duplicates
  const isFetchingRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const knownNotificationIdsRef = useRef(new Set());
  const pollingTimerRef = useRef(null);

  /**
   * Fetch paginated notifications with optional query parameters
   */
  const fetchNotifications = useCallback(
    async (params = {}, options = { background: false }) => {
      if (!admin?._id) return;

      if (!options.background) {
        setIsLoading(true);
      }

      try {
        const res = await notificationService.getNotifications(params);
        if (res.success && Array.isArray(res.data)) {
          setNotifications(res.data);
          setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : 0);
          if (res.pagination) {
            setPagination(res.pagination);
          }

          // Check for genuinely new incoming notifications to show subtle toast
          const newNotifications = [];
          res.data.forEach((item) => {
            if (!knownNotificationIdsRef.current.has(item._id)) {
              knownNotificationIdsRef.current.add(item._id);
              if (!isInitialLoadRef.current && !item.isRead) {
                newNotifications.push(item);
              }
            }
          });

          // Show subtle in-app alert for newly received items
          if (newNotifications.length > 0 && !isInitialLoadRef.current) {
            const first = newNotifications[0];
            toast(
              `${first.title}: ${first.message}`,
              {
                id: `notif-${first._id}`,
                icon: "🔔",
                duration: 4000,
                style: {
                  borderRadius: "12px",
                  background: "#1e293b",
                  color: "#fff",
                  fontSize: "12px",
                  fontWeight: "600"
                }
              }
            );
          }

          isInitialLoadRef.current = false;
          setError(null);
        }
      } catch (err) {
        if (!options.background) {
          setError(err.response?.data?.message || "Failed to load notifications");
        }
      } finally {
        if (!options.background) {
          setIsLoading(false);
        }
      }
    },
    [admin?._id]
  );

  /**
   * Lightweight unread count refresh
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!admin?._id) return;
    try {
      const res = await notificationService.getUnreadCount();
      if (res.success && typeof res.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Quiet fail on polling tick
    }
  }, [admin?._id]);

  /**
   * Background polling tick
   */
  const performPollTick = useCallback(async () => {
    if (!admin?._id) return;
    if (isFetchingRef.current) return; // Prevent overlapping requests

    // Page Visibility API check: pause frequent updates when tab is hidden
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    try {
      isFetchingRef.current = true;
      // Fetch notifications silently in background
      await fetchNotifications({ page: 1, limit: 20 }, { background: true });
    } finally {
      isFetchingRef.current = false;
    }
  }, [admin?._id, fetchNotifications]);

  /**
   * Setup polling lifecycle: interval, tab visibility, and focus listeners
   */
  useEffect(() => {
    if (!admin?._id) {
      setNotifications([]);
      setUnreadCount(0);
      knownNotificationIdsRef.current.clear();
      isInitialLoadRef.current = true;
      return;
    }

    // Initial fetch on mount / login
    fetchNotifications();

    // Setup interval for 30 seconds
    pollingTimerRef.current = setInterval(performPollTick, POLLING_INTERVAL_MS);

    // Event handler for visibility change (resumes immediately when tab is reopened)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        performPollTick();
      }
    };

    // Event handler for window focus
    const handleFocus = () => {
      performPollTick();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
        pollingTimerRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [admin?._id, fetchNotifications, performPollTick]);

  /**
   * Mark a notification as read
   */
  const markNotificationAsRead = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const res = await notificationService.markAsRead(id);
      if (res.success && res.data) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, ...res.data } : n))
        );
      }
    } catch (err) {
      // Revert on error
      fetchNotifications({ page: 1, limit: 20 }, { background: true });
      toast.error(err.response?.data?.message || "Failed to mark as read");
    }
  };

  /**
   * Mark a notification as unread
   */
  const markNotificationAsUnread = async (id) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: false, readAt: null } : n))
    );
    setUnreadCount((prev) => prev + 1);

    try {
      const res = await notificationService.markAsUnread(id);
      if (res.success && res.data) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, ...res.data } : n))
        );
      }
    } catch (err) {
      fetchNotifications({ page: 1, limit: 20 }, { background: true });
      toast.error(err.response?.data?.message || "Failed to mark as unread");
    }
  };

  /**
   * Mark all active notifications as read
   */
  const markAllNotificationsAsRead = async () => {
    const previousUnread = unreadCount;
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
    );
    setUnreadCount(0);

    try {
      const res = await notificationService.markAllAsRead();
      if (res.success) {
        toast.success("All notifications marked as read");
      }
    } catch (err) {
      setUnreadCount(previousUnread);
      fetchNotifications({ page: 1, limit: 20 }, { background: true });
      toast.error(err.response?.data?.message || "Failed to mark all as read");
    }
  };

  /**
   * Archive a notification (soft delete)
   */
  const archiveNotification = async (id) => {
    const target = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    try {
      const res = await notificationService.archiveNotification(id);
      if (res.success) {
        toast.success("Notification archived");
      }
    } catch (err) {
      fetchNotifications({ page: 1, limit: 20 }, { background: true });
      toast.error(err.response?.data?.message || "Failed to archive notification");
    }
  };

  /**
   * Permanently delete a single notification from MongoDB
   */
  const deleteNotification = async (id) => {
    const target = notifications.find((n) => n._id === id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (target && !target.isRead) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    knownNotificationIdsRef.current.delete(id);

    try {
      const res = await notificationService.deleteNotification(id);
      if (res.success) {
        toast.success("Notification deleted permanently");
      }
    } catch (err) {
      fetchNotifications({ page: 1, limit: 20 }, { background: true });
      toast.error(err.response?.data?.message || "Failed to delete notification");
    }
  };

  /**
   * Permanently delete multiple notifications from MongoDB
   */
  const deleteBulkNotifications = async (notificationIds) => {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) return;

    const idSet = new Set(notificationIds);
    let unreadDeleted = 0;
    notifications.forEach((n) => {
      if (idSet.has(n._id) && !n.isRead) {
        unreadDeleted++;
      }
    });

    setNotifications((prev) => prev.filter((n) => !idSet.has(n._id)));
    if (unreadDeleted > 0) {
      setUnreadCount((prev) => Math.max(0, prev - unreadDeleted));
    }
    notificationIds.forEach((id) => knownNotificationIdsRef.current.delete(id));

    try {
      const res = await notificationService.deleteBulkNotifications(notificationIds);
      if (res.success) {
        toast.success(
          res.deletedCount === 1
            ? "1 notification deleted permanently"
            : `${res.deletedCount} notifications deleted permanently`
        );
      }
    } catch (err) {
      fetchNotifications({ page: 1, limit: 20 }, { background: true });
      toast.error(err.response?.data?.message || "Failed to delete selected notifications");
    }
  };

  const value = {
    notifications,
    unreadCount,
    pagination,
    isLoading,
    error,
    fetchNotifications,
    refreshUnreadCount,
    markNotificationAsRead,
    markNotificationAsUnread,
    markAllNotificationsAsRead,
    archiveNotification,
    deleteNotification,
    deleteBulkNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export default NotificationContext;
