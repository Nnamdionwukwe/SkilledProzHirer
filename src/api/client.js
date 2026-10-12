// src/api/client.js
import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

// Update to use new DigitalOcean backend
const API_URL =
  Constants.expoConfig?.extra?.API_URL || "https://api.skilledproz.com/api";

const ACCESS_KEY = "skp_access";
const REFRESH_KEY = "skp_refresh";

export const tokenStore = {
  async getAccess() {
    try {
      return await SecureStore.getItemAsync(ACCESS_KEY);
    } catch {
      return null;
    }
  },
  async getRefresh() {
    try {
      return await SecureStore.getItemAsync(REFRESH_KEY);
    } catch {
      return null;
    }
  },
  async setTokens(access, refresh) {
    try {
      if (access) await SecureStore.setItemAsync(ACCESS_KEY, access);
      if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    } catch {}
  },
  async clear() {
    try {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    } catch {}
  },
};

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Logging interceptor for debugging (optional - remove in production)
if (__DEV__) {
  api.interceptors.request.use(
    (config) => {
      console.log(
        `🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      );
      if (config.data) console.log("📤 Request Data:", config.data);
      return config;
    },
    (error) => Promise.reject(error),
  );

  api.interceptors.response.use(
    (response) => {
      console.log(`✅ ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error(
        `❌ ${error.response?.status || "Network Error"} ${error.config?.url}`,
      );
      return Promise.reject(error);
    },
  );
}

// Attach access token
api.interceptors.request.use(async (config) => {
  const token = await tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh on 401 once
let isRefreshing = false;
let queued = [];

const flush = (err, token) => {
  queued.forEach(({ resolve, reject }) => {
    if (err) reject(err);
    else resolve(token);
  });
  queued = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("/auth/refresh") &&
      !original.url?.includes("/auth/login")
    ) {
      original._retry = true;
      const refresh = await tokenStore.getRefresh();
      if (!refresh) return Promise.reject(error);

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queued.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken: refresh,
        });
        const newAccess = data?.data?.accessToken;
        const newRefresh = data?.data?.refreshToken;
        await tokenStore.setTokens(newAccess, newRefresh);
        flush(null, newAccess);
        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (err) {
        flush(err, null);
        await tokenStore.clear();
        // Optionally trigger logout event
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  },
);

/** Pull a friendly error message off an axios error. */
export function getErrorMessage(err, fallback = "Something went wrong") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export default api;
