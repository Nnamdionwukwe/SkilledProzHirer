// src/api/retainedStaff.js
//
// Ported verbatim from src/lib/retainedStaffApi.js (web).
// Uses the app's existing axios client (src/api/client.js) so auth headers,
// interceptors and base URL are identical to the rest of the app.

import client from "./client";

export const retainedStaffApi = {
  // ── Hirer ──
  listStaff: (params) => client.get("/retained-staff", { params }),
  addStaff: (data) => client.post("/retained-staff", data),
  getStaff: (id) => client.get(`/retained-staff/${id}`),
  updateStaff: (id, data) => client.patch(`/retained-staff/${id}`, data),
  pauseStaff: (id, reason) =>
    client.patch(`/retained-staff/${id}/pause`, { reason }),
  resumeStaff: (id) => client.patch(`/retained-staff/${id}/resume`),
  endStaff: (id, data) => client.patch(`/retained-staff/${id}/end`, data),
  deleteStaff: (id) => client.delete(`/retained-staff/${id}`),
  getDashboard: () => client.get("/retained-staff/dashboard"),
  lookupWorker: (q) => client.get("/retained-staff/lookup", { params: { q } }),

  // ── Cycles (Hirer) ──
  listCycles: (memberId, params) =>
    client.get(`/retained-staff/${memberId}/cycles`, { params }),
  createCycle: (memberId, data) =>
    client.post(`/retained-staff/${memberId}/cycles`, data),
  getCycle: (memberId, cycleId) =>
    client.get(`/retained-staff/${memberId}/cycles/${cycleId}`),
  payCycle: (memberId, cycleId, data) =>
    client.post(`/retained-staff/${memberId}/cycles/${cycleId}/pay`, data),
  releaseCycle: (cycleId, data) =>
    client.post(`/retained-staff/cycles/${cycleId}/release`, data),
  cancelCycle: (cycleId, reason) =>
    client.post(`/retained-staff/cycles/${cycleId}/cancel`, { reason }),
  deleteCycle: (cycleId) => client.delete(`/retained-staff/cycles/${cycleId}`),

  // ── Documents & Notes ──
  uploadDocument: (memberId, data) =>
    client.post(`/retained-staff/${memberId}/documents`, data),
  listDocuments: (memberId) =>
    client.get(`/retained-staff/${memberId}/documents`),
  deleteDocument: (memberId, docId) =>
    client.delete(`/retained-staff/${memberId}/documents/${docId}`),
  addNote: (memberId, data) =>
    client.post(`/retained-staff/${memberId}/notes`, data),
  listNotes: (memberId) => client.get(`/retained-staff/${memberId}/notes`),
  deleteNote: (memberId, noteId) =>
    client.delete(`/retained-staff/${memberId}/notes/${noteId}`),

  // ── Worker ──
  listMyEmployers: () => client.get("/retained-staff/me/employers"),
  getMyEmployment: (id) => client.get(`/retained-staff/me/employers/${id}`),
  listMyCycles: (params) => client.get("/retained-staff/me/cycles", { params }),
  getMyEarnings: () => client.get("/retained-staff/me/earnings"),

  // ── Admin ──
  adminListStaff: (params) => client.get("/admin/retained-staff", { params }),
  adminListCycles: (params) => client.get("/admin/retained-cycles", { params }),
};
