import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the httpOnly refresh cookie automatically
});

// The access token lives outside React state too, in this module-level
// variable, so the interceptor (which runs outside React) can read it
// without needing a hook.
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// If a request fails with 401 (expired access token), try refreshing
// once using the refresh cookie, then retry the original request.
// This is what lets a user stay logged in for days without re-entering
// their password every 15 minutes.
let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshCall = originalRequest?.url?.includes("/auth/refresh");

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      try {
        // Dedupe concurrent refresh calls if multiple requests 401 at once
        if (!refreshPromise) {
          refreshPromise = api.post("/auth/refresh").finally(() => {
            refreshPromise = null;
          });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
