// src/api/client.js
import axios from "axios";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL =
  Constants.expoConfig?.extra?.API_URL || "https://api.skilledproz.com/api";

const ACCESS_KEY = "skp_access";
const REFRESH_KEY = "skp_refresh";

// ─── Token storage ────────────────────────────────────────────────────────
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

// ─── Axios instance ───────────────────────────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// ─── Dev logging ─────────────────────────────────────────────────────────
if (__DEV__) {
  api.interceptors.request.use(
    (config) => {
      console.log(
        `🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
      );
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

// ─── Auth token interceptor ───────────────────────────────────────────────
// Skip attaching bearer to auth endpoints themselves — the refresh POST
// must go without a (stale) Authorization header or the backend rejects it.
const AUTH_EXEMPT_PATHS = ["/auth/refresh", "/auth/login", "/auth/register"];

api.interceptors.request.use(async (config) => {
  if (AUTH_EXEMPT_PATHS.some((p) => config.url?.includes(p))) {
    return config;
  }
  const token = await tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── 401 → refresh queue ─────────────────────────────────────────────────
// One in-flight refresh at a time. All 401'd requests queue here.
// The critical fix: isRefreshing must be cleared BEFORE the queue is
// flushed, so any 401 arriving during flush starts a NEW refresh cycle
// rather than enqueueing into a dead queue.

let isRefreshing = false;
let queued = [];

const flushQueue = (err, token) => {
  const pending = queued;
  queued = [];
  pending.forEach(({ resolve, reject }) => {
    try {
      if (err) reject(err);
      else resolve(token);
    } catch {}
  });
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    const is401 = error.response?.status === 401;
    const alreadyRetried = original?._retry;
    const isAuthEndpoint = AUTH_EXEMPT_PATHS.some((p) =>
      original?.url?.includes(p),
    );

    if (!is401 || alreadyRetried || isAuthEndpoint) {
      return Promise.reject(error);
    }

    original._retry = true;

    // If a refresh is already in flight, wait for it.
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queued.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    // Start a new refresh cycle.
    const refresh = await tokenStore.getRefresh();
    if (!refresh) {
      return Promise.reject(error);
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${API_URL}/auth/refresh`,
        { refreshToken: refresh },
        {
          timeout: 60000,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      const newAccess = data?.data?.accessToken;
      const newRefresh = data?.data?.refreshToken;

      if (!newAccess) {
        throw new Error("Refresh response missing access token");
      }

      await tokenStore.setTokens(newAccess, newRefresh);

      // CRITICAL: clear the flag BEFORE flushing so any concurrent 401
      // that arrives during retry starts a new cycle instead of queueing
      // to a queue that will never be flushed again.
      isRefreshing = false;
      flushQueue(null, newAccess);

      // Retry the original request with the new token.
      original.headers.Authorization = `Bearer ${newAccess}`;
      return api(original);
    } catch (err) {
      isRefreshing = false;
      flushQueue(err, null);
      await tokenStore.clear();
      return Promise.reject(err);
    }
  },
);

// ─── Helper ──────────────────────────────────────────────────────────────
export function getErrorMessage(err, fallback = "Something went wrong") {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export default api;
