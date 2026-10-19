import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
  timeout: 15000,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => {
    if (!["get", "head"].includes(response.config.method) && response.config.url?.startsWith("/admin/")) window.dispatchEvent(new Event("newsfront:content"));
    return response;
  },
  (error) => {
    if (axios.isCancel(error)) return Promise.reject(error);
    // Check if network error (server offline / unreachable)
    if (!error.response) {
      return Promise.reject({
        message: "Unable to reach the Nsemra News API server. Please ensure the backend is running.",
        status: 0,
        isNetworkError: true,
      });
    }

    const { status, data } = error.response;
    return Promise.reject({
      status,
      message: data?.message || "An unexpected error occurred. Please try again.",
      errors: data?.errors || null,
      data,
    });
  }
);

export default api;
