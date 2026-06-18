// src/api/settings.js
import api from "./client";

export const settingsApi = {
  // ── Profile ──────────────────────────────────────────────────────────────
  getProfile: () => api.get("/settings/profile").then((r) => r.data.data.user),

  updateProfile: (payload) =>
    api.patch("/settings/profile", payload).then((r) => r.data.data.user),

  updateAvatar: async (uri) => {
    const form = new FormData();
    const filename = uri.split("/").pop();
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";
    form.append("avatar", { uri, name: filename, type });
    const { data } = await api.post("/settings/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.data.avatar;
  },

  // ── Hirer profile ─────────────────────────────────────────────────────────
  updateHirerProfile: (payload) =>
    api.patch("/settings/hirer-profile", payload).then((r) => r.data),

  // ── Password ──────────────────────────────────────────────────────────────
  changePassword: (payload) =>
    api.patch("/settings/password", payload).then((r) => r.data),

  // ── Notifications ─────────────────────────────────────────────────────────
  getNotificationPrefs: () =>
    api.get("/settings/notifications").then((r) => r.data.data.prefs),

  updateNotificationPrefs: (payload) =>
    api.patch("/settings/notifications", payload).then((r) => r.data),

  // ── Privacy ───────────────────────────────────────────────────────────────
  getPrivacySettings: () =>
    api.get("/settings/privacy").then((r) => r.data.data.privacy),

  updatePrivacySettings: (payload) =>
    api.patch("/settings/privacy", payload).then((r) => r.data),

  // ── Security ──────────────────────────────────────────────────────────────
  getSecurityInfo: () => api.get("/settings/security").then((r) => r.data.data),

  // ── Withdrawal PIN ─────────────────────────────────────────────────────────
  getPinStatus: () => api.get("/payments/pin/status").then((r) => r.data.data),

  setPin: (pin) => api.post("/payments/pin/set", { pin }).then((r) => r.data),

  changePin: (currentPin, newPin) =>
    api
      .post("/payments/pin/change", { currentPin, newPin })
      .then((r) => r.data),

  // ── Activity ──────────────────────────────────────────────────────────────
  getActivitySummary: () =>
    api.get("/settings/activity").then((r) => r.data.data),

  // ── Account ───────────────────────────────────────────────────────────────
  deleteAccount: (payload) =>
    api.delete("/settings/account", { data: payload }).then((r) => r.data),
};
