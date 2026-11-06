/**
 * Central Axios HTTP Client with JWT Bearer Token Injection.
 * 
 * Provides an authenticated Axios instance targeting the backend REST API
 * (http://localhost:8000/api/v1). Automatically attaches stored JWT Bearer tokens
 * to outgoing requests and handles unauthorized responses.
 */

import axios, { type InternalAxiosRequestConfig } from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

/**
 * Resolves a relative API path to a fully qualified backend URL or returns data URIs unchanged.
 */
export const resolveApiUrl = (path?: string | null): string => {
  if (!path) return "";
  if (path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000, // 45 seconds to accommodate large image/PDF OCR analysis
});

/**
 * Request interceptor to attach Authorization header if a token exists in localStorage.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor to intercept 401 unauthorized errors and clear stale tokens.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or invalid
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_user");
    }
    return Promise.reject(error);
  }
);
