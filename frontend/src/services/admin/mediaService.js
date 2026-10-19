import api from "../../api/axios";

export const mediaService = {
  /**
   * Fetch paginated, filtered, and searchable media library assets with usage counts
   * @param {{ page?: number, limit?: number, search?: string, folder?: string, mimeType?: string, status?: string, uploadedBy?: string, sortBy?: string, sortOrder?: string }} params
   */
  async getMedia(params = {}) {
    const response = await api.get("/admin/media", { params });
    return response.data;
  },

  /**
   * Fetch statistical metrics (total, active, archived, storage size, in-use counts)
   */
  async getMediaStats() {
    const response = await api.get("/admin/media/stats");
    return response.data;
  },

  /**
   * Fetch single media asset details including referenced articles
   * @param {string} id
   */
  async getMediaById(id) {
    const response = await api.get(`/admin/media/${id}`);
    return response.data;
  },

  /**
   * Fetch specific usage information for a media asset
   * @param {string} id
   */
  async getMediaUsage(id) {
    const response = await api.get(`/admin/media/${id}/usage`);
    return response.data;
  },

  /**
   * Upload single image with optional upload progress callback
   * @param {File} file
   * @param {{ folder?: string, altText?: string, caption?: string, name?: string }} metadata
   * @param {Function} [onUploadProgress]
   */
  async uploadSingle(file, metadata = {}, onUploadProgress = null) {
    const formData = new FormData();
    formData.append("file", file);
    if (metadata.folder) formData.append("folder", metadata.folder);
    if (metadata.altText) formData.append("altText", metadata.altText);
    if (metadata.caption) formData.append("caption", metadata.caption);
    if (metadata.name) formData.append("name", metadata.name);

    const config = {
      timeout:60000,
      headers: { "Content-Type": "multipart/form-data" }
    };
    if (typeof onUploadProgress === "function") {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onUploadProgress(percentCompleted);
      };
    }

    const response = await api.post("/admin/media/upload", formData, config);
    return response.data;
  },

  /**
   * Upload multiple images in a single batch
   * @param {File[]} files
   * @param {string} [folder="general"]
   * @param {Function} [onUploadProgress]
   */
  async uploadMultiple(files, folder = "general", onUploadProgress = null) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("folder", folder);

    const config = {
      headers: { "Content-Type": "multipart/form-data" }
    };
    if (typeof onUploadProgress === "function") {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        onUploadProgress(percentCompleted);
      };
    }

    const response = await api.post("/admin/media/upload-multiple", formData, config);
    return response.data;
  },

  /**
   * Update media metadata
   * @param {string} id
   * @param {{ name?: string, altText?: string, caption?: string, folder?: string }} data
   */
  async updateMedia(id, data) {
    const response = await api.patch(`/admin/media/${id}`, data);
    return response.data;
  },

  /**
   * Archive media item
   * @param {string} id
   */
  async archiveMedia(id) {
    const response = await api.post(`/admin/media/${id}/archive`);
    return response.data;
  },

  /**
   * Restore archived media item
   * @param {string} id
   */
  async restoreMedia(id) {
    const response = await api.post(`/admin/media/${id}/restore`);
    return response.data;
  },

  /**
   * Permanently delete unreferenced media item
   * @param {string} id
   */
  async deleteMedia(id) {
    const response = await api.delete(`/admin/media/${id}`);
    return response.data;
  },

  /**
   * Format file size helper
   * @param {number} bytes
   */
  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
};

export default mediaService;
