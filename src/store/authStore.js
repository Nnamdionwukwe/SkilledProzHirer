// src/store/authStore.js
// Mirror of the website's `useAuthStore` adapted for React Native:
//   - tokens live in SecureStore (via tokenStore)
//   - user lives in AsyncStorage so we can rehydrate quickly on app open

import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api, { tokenStore, getErrorMessage } from "../api/client";

const USER_KEY = "@skilledproz:user";

export const useAuthStore = create((set, get) => ({
  user: null,
  isLoading: false,
  isHydrated: false,

  // Rehydrate user + decide auth state on app launch
  hydrate: async () => {
    try {
      const [rawUser, access] = await Promise.all([
        AsyncStorage.getItem(USER_KEY),
        tokenStore.getAccess(),
      ]);
      const cachedUser = rawUser ? JSON.parse(rawUser) : null;
      // Show cached user immediately for snappy UX
      set({ user: cachedUser });

      if (access) {
        // Validate by fetching /auth/me - this also picks up server-side updates
        try {
          const { data } = await api.get("/auth/me");
          set({ user: data.data });
          await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data));
        } catch {
          // Token invalid or refresh failed - clear
          await get().clearAuth();
        }
      }
    } finally {
      set({ isHydrated: true });
    }
  },

  setAuth: async (user, accessToken, refreshToken) => {
    await tokenStore.setTokens(accessToken, refreshToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    set({ user });
  },

  updateUser: async (patch) => {
    const next = { ...(get().user || {}), ...patch };
    set({ user: next });
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(next));
    } catch {}
  },

  clearAuth: async () => {
    await tokenStore.clear();
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null });
  },

  fetchMe: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.data });
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.data));
      return data.data;
    } catch {
      await get().clearAuth();
      return null;
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/login", { email, password });
      const { user, accessToken, refreshToken } = data.data;
      await get().setAuth(user, accessToken, refreshToken);
      return user;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Login failed"));
    } finally {
      set({ isLoading: false });
    }
  },

  // ✅ Google Sign-In — accepts idToken from the native Google SDK
  googleSignIn: async ({ idToken, ref }) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/google", {
        idToken,
        ...(ref ? { ref } : {}),
      });

      // Backend responses can take two shapes:
      //   1. { user, accessToken, refreshToken } — existing account
      //   2. { needsRole: true, googleProfile } — new user, must pick role
      const payload = data.data || data;

      if (payload.needsRole) {
        return payload;
      }

      const { user, accessToken, refreshToken } = payload;
      if (!user || !accessToken) {
        throw new Error("Google sign-in response missing tokens");
      }

      await get().setAuth(user, accessToken, refreshToken);
      return payload;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Google sign-in failed"));
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (payload) => {
    set({ isLoading: true });
    try {
      const { data } = await api.post("/auth/register", payload);
      const { user, accessToken, refreshToken } = data.data;
      await get().setAuth(user, accessToken, refreshToken);
      return user;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Registration failed"));
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {}
    await get().clearAuth();
  },

  forgotPassword: async (email) => {
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      return data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Could not send reset link"));
    }
  },

  resetPassword: async (token, password) => {
    try {
      const { data } = await api.post("/auth/reset-password", {
        token,
        password,
      });
      return data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Could not reset password"));
    }
  },

  resendVerification: async (email) => {
    try {
      const { data } = await api.post("/auth/resend-verification", { email });
      return data;
    } catch (err) {
      throw new Error(getErrorMessage(err, "Could not resend verification"));
    }
  },
}));
