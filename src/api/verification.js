// src/api/verification.js
// Hirer AND Worker verification functions.
// Route breakdown from backend:
//   Worker: GET  /verification/status           → getWorkerVerificationStatus
//   Worker: POST /verification/submit-id        → submitIdVerification
//   Worker: POST /verification/submit-certification → submitWorkerCertification
//   Worker: DELETE /verification/certifications/:certId → deleteWorkerCertification
//   Hirer:  GET  /verification/hirer/status     → getHirerVerificationStatus  (existing)
//   Hirer:  POST /verification/hirer/submit     → submitHirerVerification     (existing)

import client from "./client";

// ── HIRER (unchanged) ─────────────────────────────────────────────────────────
export const getHirerVerificationStatus = async () => {
  const res = await client.get("/verification/hirer/status");
  return res.data.data;
};

export const submitHirerVerification = async (formData) => {
  const res = await client.post("/verification/hirer/submit", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// ── WORKER ────────────────────────────────────────────────────────────────────
export const getWorkerVerificationStatus = async () => {
  const res = await client.get("/verification/status");
  return res.data.data;
};

// formData must contain: idType, idNumber, dateOfBirth?, nationality?, + file
export const submitIdVerification = async (formData) => {
  const res = await client.post("/verification/submit-id", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

// formData: name, issuedBy, issueDate?, expiryDate?, + optional file
export const submitWorkerCertification = async (formData) => {
  const res = await client.post(
    "/verification/submit-certification",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return res.data.data.certification;
};

export const deleteWorkerCertification = async (certId) => {
  const res = await client.delete(`/verification/certifications/${certId}`);
  return res.data;
};

// ── ROLE-AWARE HELPER (used by VerificationScreen) ───────────────────────────
// Call this from VerificationScreen instead of calling role-specific functions directly.
export const getVerificationStatus = async (role) => {
  if (role === "WORKER") return getWorkerVerificationStatus();
  return getHirerVerificationStatus();
};
