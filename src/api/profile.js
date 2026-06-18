// src/api/profile.js
// Mirrors exactly the endpoints the website's UserProfile.jsx calls.

import client from "./client";

// ─── GET /users/:id ───────────────────────────────────────────────────────────
// Returns user + workerProfile (with categories/portfolio/certs) + hirerProfile
// + hirerStats (augmented server-side for HIRER role)
export const getUser = (userId) =>
  client.get(`/users/${userId}`).then((r) => r.data.data.user);

// ─── GET /users/me (alias using auth store's user id) ─────────────────────────
export const getMe = () => client.get("/auth/me").then((r) => r.data.data);

// ─── Reviews — same endpoints as website ─────────────────────────────────────
export const getHirerReviews = (userId, params = {}) =>
  client.get(`/reviews/hirer/${userId}`, { params }).then((r) => r.data.data);

export const getWorkerReviews = (userId, params = {}) =>
  client.get(`/reviews/worker/${userId}`, { params }).then((r) => r.data.data);

// ─── PUT /users/me/avatar (multipart) ────────────────────────────────────────
export const updateAvatar = (formData) =>
  client
    .put("/users/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.data.user);
