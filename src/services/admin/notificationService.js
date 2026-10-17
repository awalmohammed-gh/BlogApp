import api from "../../api/axios";

export const notificationService = {
  /**
   * Retrieve paginated notifications with optional filters
   */
  async getNotifications(params = {}) {
    const response = await api.get("/admin/notifications", { params });
    return response.data;
  },

  /**
   * Retrieve accurate unread notifications count
   */
  async getUnreadCount() {
    const response = await api.get("/admin/notifications/unread-count");
    return response.data;
  },

  /**
   * Retrieve single notification by ID
   */
  async getNotificationById(id) {
    const response = await api.get(`/admin/notifications/${id}`);
    return response.data;
  },

  /**
   * Mark a single notification as read
   */
  async markAsRead(id) {
    const response = await api.patch(`/admin/notifications/${id}/read`);
    return response.data;
  },

  /**
   * Mark a single notification as unread
   */
  async markAsUnread(id) {
    const response = await api.patch(`/admin/notifications/${id}/unread`);
    return response.data;
  },

  /**
   * Mark all active unread notifications as read
   */
  async markAllAsRead() {
    const response = await api.patch("/admin/notifications/read-all");
    return response.data;
  },

  /**
   * Archive a notification (soft delete)
   */
  async archiveNotification(id) {
    const response = await api.patch(`/admin/notifications/${id}/archive`);
    return response.data;
  },

  /**
   * Permanently delete a single notification from MongoDB
   */
  async deleteNotification(id) {
    const response = await api.delete(`/admin/notifications/${id}`);
    return response.data;
  },

  /**
   * Permanently delete multiple notifications from MongoDB
   */
  async deleteBulkNotifications(notificationIds) {
    const response = await api.delete("/admin/notifications/bulk", {
      data: { notificationIds }
    });
    return response.data;
  }
};

export default notificationService;
