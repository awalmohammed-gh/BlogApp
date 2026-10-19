import api from "../../api/axios";
export const adminEngagementService = {
  list: async (collection, params) => (await api.get(`/admin/${collection}`, { params })).data,
  // Comments accept an optional moderation reason; contact enquiries take status only
  status: async (collection, id, status, reason) =>
    (await api.patch(`/admin/${collection}/${id}/status`, reason ? { status, reason } : { status })).data,
  get: async (collection, id) => (await api.get(`/admin/${collection}/${id}`)).data,
  settings: async () => (await api.get("/admin/settings/general")).data,
  saveSettings: async (body) => (await api.patch("/admin/settings/general", body)).data
};
