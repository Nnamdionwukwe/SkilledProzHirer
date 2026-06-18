// ── src/api/notifications.js ──────────────────────────────────────────────────
import client from "./client";

// GET /notifications?page=1&limit=30&unreadOnly=false
// Returns { notifications, total, unreadCount, page, pages }
export const getNotifications = (params = {}) =>
  client.get("/notifications", { params }).then((r) => r.data.data);

// PATCH /notifications/:id/read
export const markAsRead = (id) =>
  client.patch(`/notifications/${id}/read`).then((r) => r.data);

// PATCH /notifications/read-all
export const markAllAsRead = () =>
  client.patch("/notifications/read-all").then((r) => r.data);

// DELETE /notifications/:id
export const deleteNotification = (id) =>
  client.delete(`/notifications/${id}`).then((r) => r.data);

// DELETE /notifications/clear-all
export const clearAllNotifications = () =>
  client.delete("/notifications/clear-all").then((r) => r.data);
