// src/api/reviews.js
import client from "./client";

// ── Hirer endpoints (legacy) ───────────────────────────────────────────────────
// GET /hirers/me/reviews/received
export const getReviewsReceived = (params = {}) =>
  client
    .get("/hirers/me/reviews/received", { params })
    .then((r) => r.data.data);

// GET /hirers/me/reviews/given
export const getReviewsGiven = (params = {}) =>
  client.get("/hirers/me/reviews/given", { params }).then((r) => r.data.data);

// ── Shared — works for BOTH worker and hirer ──────────────────────────────────
// GET /reviews/my/received  → logged-in user's received reviews + avg + distribution
export const getMyReceivedReviews = (params = {}) =>
  client.get("/reviews/my/received", { params }).then((r) => r.data.data);

// GET /reviews/my/given  → reviews the logged-in user has written
export const getMyGivenReviews = (params = {}) =>
  client.get("/reviews/my/given", { params }).then((r) => r.data.data);

// ── Public ────────────────────────────────────────────────────────────────────
// GET /reviews/worker/:userId
export const getWorkerReviews = (userId, params = {}) =>
  client.get(`/reviews/worker/${userId}`, { params }).then((r) => r.data.data);

// GET /reviews/hirer/:userId
export const getHirerReviews = (userId, params = {}) =>
  client.get(`/reviews/hirer/${userId}`, { params }).then((r) => r.data.data);

// ── Mutations ─────────────────────────────────────────────────────────────────
// POST /reviews
export const createReview = (payload) =>
  client.post("/reviews", payload).then((r) => r.data.data.review);

// GET /reviews/check/:bookingId  → { hasReviewed, review }
export const checkReviewStatus = (bookingId) =>
  client.get(`/reviews/check/${bookingId}`).then((r) => r.data.data);
