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
import { useAuthStore } from "../store/authStore";

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

// ─────────────────────────────────────────────────────────────────────────────
// Resolve the auth token synchronously from the auth store.
// `client`'s request interceptor normally attaches this to every request —
// but axios SKIPS the interceptor when the caller sets an explicit
// `Content-Type: multipart/form-data` header. That's why the chat upload
// (which must not set that header, since RN's fetch sets it with a
// boundary) bypasses `client` and calls `fetch` directly with the token
// read here.
// ─────────────────────────────────────────────────────────────────────────────
function readAuthToken() {
  try {
    const state = useAuthStore.getState?.() ?? {};
    return (
      state.token ||
      state.accessToken ||
      state.authToken ||
      state.user?.token ||
      state.user?.accessToken ||
      null
    );
  } catch {
    return null;
  }
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
// NOTE: for the ticket endpoints we keep the explicit "multipart/form-data"
// header (matching the website). The chat upload uses `fetch` directly
// because axios's interceptor is skipped when that header is set, which
// causes the Authorization header to be dropped before the request leaves
// the device — the failure surfaces as a 401 "Not authorized" / "token
// missing" from the backend.

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

/**
 * uploadChatAttachments — direct fetch to keep the Authorization header
 * attached. `client.post` with an explicit `Content-Type: multipart/form-data`
 * skips the axios interceptor that adds the token, so the request reaches
 * the backend without auth and returns 401. Sending the token explicitly
 * with `fetch` fixes that.
 */
export const uploadChatAttachments = async (formData) => {
  const baseURL = client.defaults.baseURL || "";
  const url = `${baseURL.replace(/\/+$/, "")}/support/chat/upload`;

  const token = readAuthToken();
  if (!token) {
    const err = new Error("Authentication token missing");
    err.response = { status: 401, data: { message: "Not authorized" } };
    throw err;
  }

  const res = await fetch(url, {
    method: "POST",
    // Do NOT set Content-Type — fetch derives multipart + boundary from FormData
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-json response */
  }

  if (!res.ok) {
    const err = new Error(json?.message || `Upload failed (${res.status})`);
    err.response = { status: res.status, data: json ?? text };
    throw err;
  }

  return json?.attachments ?? json?.data?.attachments ?? [];
};

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
