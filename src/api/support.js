// src/api/support.js
//
// Thin wrapper over the backend support routes.
// Routes (verbatim from src/routes/support.routes.js):
//   GET  /support/tickets
//   GET  /support/tickets/:id
//   POST /support/tickets
//   POST /support/tickets/:id/reply
//   POST /support/tickets/:id/close
//   POST /support/tickets/:id/reopen
//   GET  /support/chat/my
//   POST /support/chat/start
//   POST /support/chat/:id/escalate
//
// All require auth (protect middleware). The client attaches the bearer
// token automatically via src/api/client.js.

import client from "./client";

// ── Tickets ──────────────────────────────────────────────────────────────
export const getMyTickets = () =>
  client.get("/support/tickets").then((r) => r.data.data);

export const getTicket = (id) =>
  client.get(`/support/tickets/${id}`).then((r) => r.data.data);

export const createTicket = (payload) =>
  client.post("/support/tickets", payload).then((r) => r.data.data);

export const replyToTicket = (id, payload) =>
  client.post(`/support/tickets/${id}/reply`, payload).then((r) => r.data.data);

export const closeTicket = (id) =>
  client.post(`/support/tickets/${id}/close`).then((r) => r.data.data);

export const reopenTicket = (id) =>
  client.post(`/support/tickets/${id}/reopen`).then((r) => r.data.data);

// ── Live chat ────────────────────────────────────────────────────────────
export const getMyChats = () =>
  client.get("/support/chat/my").then((r) => r.data.data);

export const getChat = (id) =>
  client.get(`/support/chat/${id}`).then((r) => r.data.data);

export const startChat = (payload = {}) =>
  client.post("/support/chat/start", payload).then((r) => r.data.data);

export const escalateChat = (id, payload) =>
  client.post(`/support/chat/${id}/escalate`, payload).then((r) => r.data.data);
