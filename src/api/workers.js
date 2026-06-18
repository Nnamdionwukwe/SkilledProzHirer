// src/api/workers.js
import client from "./client";

// ── Browse / Search ────────────────────────────────────────────────────────────
// GET /workers/search?query&category&city&country&minRate&maxRate&rating&page&limit
export const searchWorkers = (params = {}) =>
  client
    .get("/search", { params })
    .then((r) => r.data.data.workers?.data ?? []);

// GET /search/trending  →  { workers: [], total }
export const getTrending = () =>
  client.get("/search/trending").then((r) => r.data.data);

// GET /search/nearby?lat&lng&radius  →  { workers: [], total }
export const getNearbyWorkers = (params = {}) =>
  client.get("/search/nearby", { params }).then((r) => r.data.data);

// GET /search/filters  →  { categories, locations, rateRanges }
export const getFilterOptions = () =>
  client.get("/search/filters").then((r) => r.data.data);

// ── Public worker profile ─────────────────────────────────────────────────────
// GET /workers/:userId  →  { worker: { ...profile, user, categories, portfolio, certifications, availability } }
export const getWorkerPublicProfile = (userId) =>
  client.get(`/workers/${userId}`).then((r) => r.data.data.worker);

// ── Worker reviews (for public profile tab) ───────────────────────────────────
// GET /reviews/worker/:userId?page&limit
export const getWorkerPublicReviews = (userId, params = {}) =>
  client.get(`/reviews/worker/${userId}`, { params }).then((r) => r.data.data);
