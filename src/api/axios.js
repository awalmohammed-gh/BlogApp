import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if network error (server offline / unreachable)
    if (!error.response) {
      return Promise.reject({
        message: "Unable to reach the NewsFront API server. Please ensure the backend is running.",
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
