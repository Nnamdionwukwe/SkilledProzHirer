// src/api/hirer.js
import client from "./client";

// ── Dashboard ─────────────────────────────────────────────────────────────────
// GET /hirers/me/dashboard
export const getHirerDashboard = () =>
  client.get("/hirers/me/dashboard").then((r) => r.data.data);

// Alias used by early DashboardScreen.js
export const getDashboard = getHirerDashboard;

// ── Saved workers ─────────────────────────────────────────────────────────────
export const getSavedWorkers = () =>
  client.get("/hirers/me/saved-workers").then((r) => r.data.data.workers);

// ── Profile ───────────────────────────────────────────────────────────────────
export const getMyHirerProfile = () =>
  client.get("/hirers/me/profile").then((r) => r.data.data.profile);

export const updateHirerProfile = (payload) =>
  client.put("/hirers/me/profile", payload).then((r) => r.data);

// ── Bookings ──────────────────────────────────────────────────────────────────
export const getHirerBookings = (params = {}) =>
  client.get("/hirers/me/bookings", { params }).then((r) => r.data.data);

// ── Reviews ───────────────────────────────────────────────────────────────────
export const getHirerReviews = (params = {}) =>
  client
    .get("/hirers/me/reviews/received", { params })
    .then((r) => r.data.data);

// ── Notifications (hirer route — simpler, fewer features) ────────────────────
// Used by TopBar for unread count polling every 30s
export const getHirerNotifications = () =>
  client.get("/hirers/me/notifications").then((r) => r.data.data);

// Old alias kept for backward compatibility
export const getNotifications = getHirerNotifications;

// ── Job posts ─────────────────────────────────────────────────────────────────
// Used by PostJobScreen
export const createJobPost = (payload) =>
  client.post("/jobs", payload).then((r) => r.data.data);

// ─────────────────────────────────────────────────────────────────────────────
// hirerApi namespace — consumed by DashboardScreen, TopBar, SettingsScreen,
// PostJobScreen and any other screen that does:
//   import { hirerApi } from "../../api/hirer";
// ─────────────────────────────────────────────────────────────────────────────
export const hirerApi = {
  // Dashboard
  getDashboard: getHirerDashboard,
  getHirerDashboard,

  // Workers
  getSavedWorkers,

  // Profile
  getMyHirerProfile,
  updateHirerProfile,

  // Bookings
  getHirerBookings,

  // Reviews
  getHirerReviews,

  // Notifications (TopBar polls this every 30s)
  getNotifications: getHirerNotifications,
  getHirerNotifications,

  // Jobs (PostJobScreen)
  createJobPost,
};
