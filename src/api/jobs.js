// src/api/jobs.js
// Mirrors exactly the endpoints the website's job screens call.

import client from "./client";

// GET /jobs/hirer/me?page=1&limit=9&status=OPEN
export const getMyJobPosts = (params = {}) =>
  client.get("/jobs/hirer/me", { params }).then((r) => r.data.data);

// GET /jobs/:id  (protect optional — adds hasApplied if logged in)
export const getJobPost = (id) =>
  client.get(`/jobs/${id}`).then((r) => r.data.data);

// PATCH /jobs/:id/status  { status: "OPEN"|"FILLED"|"CANCELLED" }
export const updateJobStatus = (id, status) =>
  client.patch(`/jobs/${id}/status`, { status }).then((r) => r.data.data);

// GET /jobs/:id/applications
export const getJobApplications = (id) =>
  client.get(`/jobs/${id}/applications`).then((r) => r.data.data);

// PATCH /jobs/:id/applications/:applicationId  { status: "ACCEPTED"|"REJECTED" }
export const updateApplicationStatus = (jobId, applicationId, status) =>
  client
    .patch(`/jobs/${jobId}/applications/${applicationId}`, { status })
    .then((r) => r.data.data);
