// src/api/insurance.js
// Mirrors the insurance controller endpoints.

import client from "./client";

// GET /insurance/plans — static plan list (cached, no auth needed)
export const getInsurancePlans = () =>
  client.get("/insurance/plans").then((r) => r.data.data.plans);

// POST /insurance/checkout — creates Stripe checkout session
// Returns { url, sessionId }
export const createInsuranceCheckout = (planId, bookingId) =>
  client
    .post("/insurance/checkout", { planId, bookingId })
    .then((r) => r.data.data);

// POST /insurance/verify — call after Stripe redirect with the sessionId
export const verifyInsuranceCheckout = (sessionId) =>
  client.post("/insurance/verify", { sessionId }).then((r) => r.data.data);

// GET /insurance/my — policies the hirer has purchased
export const getMyInsurance = () =>
  client.get("/insurance/my").then((r) => r.data.data);
