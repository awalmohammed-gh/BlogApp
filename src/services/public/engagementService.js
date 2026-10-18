import api from "../../api/axios";
export const engagementService = {
  comments: async (slug, params) => (await api.get(`/articles/${encodeURIComponent(slug)}/comments`, { params })).data,
  comment: async (slug, body) => (await api.post(`/articles/${encodeURIComponent(slug)}/comments`, body)).data,
  contact: async (body) => (await api.post("/contact", body)).data,
  subscribe: async (body) => (await api.post("/newsletter/subscribe", body)).data,
  newsletterAction: async (action, token) => (await api.post(`/newsletter/${action}`, { token })).data
};
