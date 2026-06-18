// src/api/disputes.js
// Mirrors dispute.routes.js endpoints exactly.

import client from "./client";

// GET /disputes/my — disputes involving the current user (bookings with status DISPUTED)
// Returns { disputes: Booking[], total: number }
export const getMyDisputes = () =>
  client.get("/disputes/my").then((r) => r.data.data);

// GET /disputes/:bookingId — full dispute detail for a booking
export const getDisputeDetail = (bookingId) =>
  client.get(`/disputes/${bookingId}`).then((r) => r.data.data.dispute);

// POST /disputes — raise a dispute
// payload: { bookingId, reason, description }
export const raiseDispute = (payload) =>
  client.post("/disputes", payload).then((r) => r.data);

// PATCH /disputes/:bookingId/cancel — cancel your own dispute
export const cancelDispute = (bookingId) =>
  client.patch(`/disputes/${bookingId}/cancel`).then((r) => r.data);
