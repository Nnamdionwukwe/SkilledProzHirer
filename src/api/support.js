// src/api/support.js
//
// Mirrors src/lib/supportApi.js exactly.
// Routes (from src/routes/support.routes.js):
//   POST /support/chat/start
//   POST /support/chat/upload      ← upload endpoint
//   GET  /support/chat/:id
//   GET  /support/chat/my
//   POST /support/chat/:id/escalate
//   POST /support/chat/:id/csat
//   GET  /support/tickets · POST /support/tickets · etc.

import client from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// Helper — pull a value from any of the plausible response envelopes
// ─────────────────────────────────────────────────────────────────────────────
function pick(body, keys) {
  for (const k of keys) {
    const parts = k.split(".");
    let cur = body;
    let ok = true;
    for (const p of parts) {
      if (cur == null) {
        ok = false;
        break;
      }
      cur = cur[p];
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

// ── Tickets ──────────────────────────────────────────────────────────────
export const getMyTickets = (params) =>
  client.get("/support/tickets", { params }).then((r) => {
    const body = r.data;
    const list =
      pick(body, ["data.tickets", "tickets", "data.data.tickets"]) ??
      (Array.isArray(body?.data) ? body.data : null) ??
      (Array.isArray(body) ? body : null) ??
      [];
    return {
      tickets: Array.isArray(list) ? list : [],
      total:
        pick(body, ["data.total", "total"]) ??
        (Array.isArray(list) ? list.length : 0),
      pages: pick(body, ["data.pages", "pages"]) ?? 1,
      page: pick(body, ["data.page", "page"]) ?? 1,
    };
  });

export const getTicket = (id) =>
  client.get(`/support/tickets/${id}`).then((r) => {
    const body = r.data;
    return pick(body, ["data.ticket", "ticket", "data"]) ?? body ?? null;
  });

// ── Multipart Uploads ────────────────────────────────────────────────────
// NOTE: we explicitly set "multipart/form-data" here (matching the website).
// Do NOT set this to `undefined` — axios will strip the boundary and the
// request will hang with a "Network Error" on Android. RN + axios 1.7+
// correctly auto-appends the boundary when you pass "multipart/form-data".

export const createTicket = (formData) =>
  client
    .post("/support/tickets", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data.data);

export const replyToTicket = (id, formData) =>
  client
    .post(`/support/tickets/${id}/reply`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => {
      const body = r.data;
      const message = pick(body, ["data.message", "message"]) ?? null;
      const ticketStatus =
        pick(body, ["data.ticketStatus", "ticketStatus"]) ?? null;
      return { message, ticketStatus };
    });

export const uploadChatAttachments = (formData) =>
  client
    .post("/support/chat/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => {
      const d = r.data;
      return d?.attachments ?? d?.data?.attachments ?? [];
    });

// ── Standard Ticket Actions ──────────────────────────────────────────────
export const closeTicket = (id) =>
  client.post(`/support/tickets/${id}/close`).then((r) => r.data.data);

export const reopenTicket = (id) =>
  client.post(`/support/tickets/${id}/reopen`).then((r) => r.data.data);

export const submitTicketCsat = (id, data) =>
  client.post(`/support/tickets/${id}/csat`, data).then((r) => r.data.data);

// ── Live chat ────────────────────────────────────────────────────────────
export const getMyChats = (params) =>
  client.get("/support/chat/my", { params }).then((r) => r.data.data);

export const getChat = (id) =>
  client.get(`/support/chat/${id}`).then((r) => r.data.data);

/**
 * startChat — matches web: `api.post("/support/chat/start", data)`
 */
export const startChat = (data = {}) =>
  client.post("/support/chat/start", data).then((r) => {
    const body = r.data;
    return (
      pick(body, [
        "data.conversation",
        "conversation",
        "data.chat",
        "chat",
        "data",
      ]) ??
      body ??
      null
    );
  });

export const escalateChat = (id, data) =>
  client.post(`/support/chat/${id}/escalate`, data).then((r) => r.data.data);

export const submitChatCsat = (id, data) =>
  client.post(`/support/chat/${id}/csat`, data).then((r) => r.data.data);
