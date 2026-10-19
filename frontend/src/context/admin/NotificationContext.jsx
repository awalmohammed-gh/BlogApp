import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import toast from "../../utils/toast";
import { useAuth } from "./AuthContext";
import notificationService from "../../services/admin/notificationService";

const NotificationContext = createContext();

const POLLING_INTERVAL_MS = 30000; // 30 seconds
const PREVIEW_LIMIT = 10;

/**
 * MongoDB is the source of truth. This provider keeps a small preview list for
 * the header dropdown plus the unread badge, polls with Axios, and coordinates
 * mutations so that a poll which overlaps a delete/read change is discarded
 * instead of re-inserting stale rows. Full paginated lists (the Notifications
 * page) fetch their own query and refetch whenever `syncToken` changes.
 */
export const NotificationProvider = ({ children }) => {
  const { admin } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // Incremented on every poll tick and successful mutation; list views refetch on change.
  const [syncToken, setSyncToken] = useState(0);

  const requestSeqRef = useRef(0);
  // Changes whenever a mutation starts or finishes; responses requested under an older epoch are stale.
  const mutationEpochRef = useRef(0);
  const deletedIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);
  const knownNotificationIdsRef = useRef(new Set());
  const isPollingRef = useRef(false);
  const previewPending = useRef(false);
  const previewSignature = useRef("");

  const getEpoch = useCallback(() => mutationEpochRef.current, []);
  const withoutDeleted = useCallback(
    (items) => items.filter((n) => !deletedIdsRef.current.has(String(n._id))),
    []
  );
  const bumpSync = useCallback(() => setSyncToken((t) => t + 1), []);

  /**
   * Fetch the header preview and unread count. Out-of-order or mutation-overlapping
   * responses are ignored.
   */
  const loadPreview = useCallback(
    async ({ background = false } = {}) => {
      if (!admin?._id || previewPending.current) return false;
      previewPending.current=true;
      const seq = ++requestSeqRef.current;
      const epoch = mutationEpochRef.current;
      if (!background) setIsLoading(true);

      try {
        const res = await notificationService.getNotifications({ page: 1, limit: PREVIEW_LIMIT });
        if (seq !== requestSeqRef.current || epoch !== mutationEpochRef.current) return;
        if (!res.success || !Array.isArray(res.data)) return;

        const items = withoutDeleted(res.data);
        const signature=JSON.stringify([items,res.unreadCount]);
        const changed=signature !== previewSignature.current;
        if(changed)setNotifications(items);
        previewSignature.current=signature;
        setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : 0);
        setError(null);

        // Subtle toast for notifications that arrived since the last refresh
        const arrivals = items.filter((item) => !knownNotificationIdsRef.current.has(item._id));
        arrivals.forEach((item) => knownNotificationIdsRef.current.add(item._id));
        const firstUnread = arrivals.find((item) => !item.isRead);
        if (!isInitialLoadRef.current && firstUnread) {
          toast.info(`${firstUnread.title}: ${firstUnread.message}`, {
            id: `notif-${firstUnread._id}`,
            duration: 4000
          });
        }
        isInitialLoadRef.current = false;
        return changed;
      } catch (err) {
        if (seq === requestSeqRef.current && !background) {
          setError(err?.message || "Failed to load notifications");
        }
      } finally {
        previewPending.current=false;
        if (seq === requestSeqRef.current && !background) setIsLoading(false);
      }
    },
    [admin?._id, withoutDeleted]
  );

  /** Re-read preview + badge and tell list views to refetch their own query. */
  const refresh = useCallback(
    async (options) => {
      const changed=await loadPreview(options);
      if(changed || !options?.background)bumpSync();
    },
    [bumpSync, loadPreview]
  );

  /** Wrap a server mutation so any poll started before it finishes is discarded. */
  const runMutation = useCallback(
    async (request) => {
      mutationEpochRef.current += 1;
      try {
        return await request();
      } finally {
        mutationEpochRef.current += 1;
      }
    },
    []
  );

  const performPollTick = useCallback(async () => {
    if (!admin?._id || isPollingRef.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    isPollingRef.current = true;
    try {
      await refresh({ background: true });
    } finally {
      isPollingRef.current = false;
    }
  }, [admin?._id, refresh]);

  useEffect(() => {
    if (!admin?._id) {
      setNotifications([]);
      setUnreadCount(0);
      knownNotificationIdsRef.current.clear();
      deletedIdsRef.current.clear();
      isInitialLoadRef.current = true;
      return;
    }

    loadPreview();
    const timer = setInterval(performPollTick, POLLING_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") performPollTick();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", performPollTick);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", performPollTick);
    };
  }, [admin?._id, loadPreview, performPollTick]);

  const patchPreview = (id, changes) =>
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, ...changes } : n)));

  const syncUnreadFromServer = async () => {
    try {
      const res = await notificationService.getUnreadCount();
      if (res.success && typeof res.unreadCount === "number") setUnreadCount(res.unreadCount);
    } catch {
      // The next poll reconciles the badge
    }
  };

  /** Mark one notification read. Resolves with the updated document; throws on failure. */
  const markNotificationAsRead = async (id) => {
    try {
      const res = await runMutation(() => notificationService.markAsRead(id));
      patchPreview(id, { isRead: true, readAt: res.data?.readAt || new Date().toISOString() });
      await syncUnreadFromServer();
      bumpSync();
      return res.data;
    } catch (err) {
      toast.error(err?.message || "Failed to mark notification as read");
      throw err;
    }
  };

  const markNotificationAsUnread = async (id) => {
    try {
      const res = await runMutation(() => notificationService.markAsUnread(id));
      patchPreview(id, { isRead: false, readAt: null });
      await syncUnreadFromServer();
      bumpSync();
      return res.data;
    } catch (err) {
      toast.error(err?.message || "Failed to mark notification as unread");
      throw err;
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const res = await runMutation(() => notificationService.markAllAsRead());
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await syncUnreadFromServer();
      bumpSync();
      toast.success(res.modifiedCount === 1 ? "1 notification marked as read" : `${res.modifiedCount} notifications marked as read`);
    } catch (err) {
      toast.error(err?.message || "Failed to mark all as read");
    }
  };

  const archiveNotification = async (id) => {
    try {
      await runMutation(() => notificationService.archiveNotification(id));
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      await syncUnreadFromServer();
      bumpSync();
      toast.success("Notification archived");
    } catch (err) {
      toast.error(err?.message || "Failed to archive notification");
      throw err;
    }
  };

  /**
   * Permanently delete one notification in MongoDB. The row is removed only
   * after the server confirms. Resolves with { wasUnread, unreadCount, total }.
   */
  const deleteNotification = async (id) => {
    const res = await runMutation(() => notificationService.deleteNotification(id));
    deletedIdsRef.current.add(String(id));
    setNotifications((prev) => prev.filter((n) => n._id !== id));
    if (typeof res.unreadCount === "number") setUnreadCount(res.unreadCount);
    bumpSync();
    return res;
  };

  /**
   * Permanently delete the selected notifications in MongoDB. Resolves with the
   * server's exact result: { deletedCount, deletedIds, unavailableIds, unreadCount, total }.
   */
  const deleteBulkNotifications = async (notificationIds) => {
    const res = await runMutation(() => notificationService.deleteBulkNotifications(notificationIds));
    const gone = new Set([...(res.deletedIds || []), ...(res.unavailableIds || [])].map(String));
    (res.deletedIds || []).forEach((id) => deletedIdsRef.current.add(String(id)));
    setNotifications((prev) => prev.filter((n) => !gone.has(String(n._id))));
    if (typeof res.unreadCount === "number") setUnreadCount(res.unreadCount);
    bumpSync();
    return res;
  };

  const value = {
    notifications,
    unreadCount,
    isLoading,
    error,
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
  };

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export default NotificationContext;
