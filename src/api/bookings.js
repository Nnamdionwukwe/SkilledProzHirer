// src/api/bookings.js
import client from "./client";

// GET /bookings?page=1&limit=12&status=PENDING
export const getBookings = (params = {}) =>
  client.get("/bookings", { params }).then((r) => r.data.data);

// GET /bookings/:id
export const getBooking = (id) =>
  client.get(`/bookings/${id}`).then((r) => r.data.data.booking);

// POST /bookings
export const createBooking = (data) =>
  client.post("/bookings", data).then((r) => r.data.data.booking);

// PATCH /bookings/:id/status — cancel, accept, complete etc.
export const updateBookingStatus = (id, status, extra = {}) =>
  client
    .patch(`/bookings/${id}/status`, { status, ...extra })
    .then((r) => r.data.data.booking);

// PATCH /bookings/:id/checkin — worker checks in (starts job)
export const checkIn = (id, coords = {}) =>
  client
    .patch(`/bookings/${id}/checkin`, coords)
    .then((r) => r.data.data.booking);

// PATCH /bookings/:id/checkout — worker checks out (marks complete)
export const checkOut = (id, coords = {}) =>
  client
    .patch(`/bookings/${id}/checkout`, coords)
    .then((r) => r.data.data.booking);

// POST /bookings/:id/sos — worker activates emergency SOS
export const activateSOS = (id, coords = {}) =>
  client.post(`/bookings/${id}/sos`, coords).then((r) => r.data.data.booking);

// PATCH /bookings/:id/sos/resolve — resolve SOS alert
export const resolveSOS = (id) =>
  client.patch(`/bookings/${id}/sos/resolve`).then((r) => r.data.data.booking);

// PATCH /bookings/:id/emergency-contact
export const updateEmergencyContact = (id, data) =>
  client.patch(`/bookings/${id}/emergency-contact`, data).then((r) => r.data);

// GET /workers/:id  — for CreateBooking worker lookup
export const getWorkerProfile = (workerId) =>
  client.get(`/workers/${workerId}`).then((r) => r.data.data.worker);
