// src/api/workerAuth.js
// All authenticated WORKER endpoints.
// The public worker endpoints (search, view profile) stay in src/api/workers.js
// These are the endpoints that require the worker to be logged in.

import client from "./client";

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const getWorkerDashboard = async () => {
  const res = await client.get("/workers/dashboard");
  return res.data.data;
};

export const getWorkerEarnings = async (params = {}) => {
  const res = await client.get("/workers/dashboard/earnings", { params });
  return res.data.data;
};

export const getWorkerReviews = async (params = {}) => {
  const res = await client.get("/workers/dashboard/reviews", { params });
  return res.data.data;
};

export const getWorkerNotifications = async (params = {}) => {
  const res = await client.get("/workers/dashboard/notifications", { params });
  return res.data.data;
};

export const markWorkerNotificationsRead = async () => {
  const res = await client.patch("/workers/dashboard/notifications/read-all");
  return res.data;
};

// ─── Profile ──────────────────────────────────────────────────────────────────
export const updateWorkerProfile = async (data) => {
  const res = await client.put("/workers/profile", data);
  return res.data.data.worker;
};

// ─── Availability ─────────────────────────────────────────────────────────────
// availability = [{ dayOfWeek: 0-6, startTime: "09:00", endTime: "17:00", isAvailable: true }]
export const updateAvailability = async (availability) => {
  const res = await client.put("/workers/availability", { availability });
  return res.data;
};

// ─── Portfolio ────────────────────────────────────────────────────────────────
export const addPortfolioItem = async (formData) => {
  const res = await client.post("/workers/portfolio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data.item;
};

export const deletePortfolioItem = async (id) => {
  const res = await client.delete(`/workers/portfolio/${id}`);
  return res.data;
};

// ─── Certifications ───────────────────────────────────────────────────────────
export const addCertification = async (formData) => {
  const res = await client.post("/workers/certifications", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data.cert;
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const addWorkerCategory = async (categoryId, isPrimary = false) => {
  const res = await client.post("/workers/categories", {
    categoryId,
    isPrimary,
  });
  return res.data.data.wc;
};

export const removeWorkerCategory = async (categoryId) => {
  const res = await client.delete(`/workers/categories/${categoryId}`);
  return res.data;
};

// ─── Applications ─────────────────────────────────────────────────────────────
export const getMyApplications = async (params = {}) => {
  const res = await client.get("/workers/my-applications", { params });
  return res.data.data;
};

// ─── Video intro ──────────────────────────────────────────────────────────────
export const addVideoIntro = async (formData) => {
  const res = await client.post("/workers/video-intro", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data;
};

export const deleteVideoIntro = async () => {
  const res = await client.delete("/workers/video-intro");
  return res.data;
};
