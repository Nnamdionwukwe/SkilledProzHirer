// src/api/subscriptions.js
import client from "./client";

// GET /subscriptions/plans?role=HIRER
export const getPlans = (role = "HIRER") =>
  client
    .get(`/subscriptions/plans?role=${role}`)
    .then((r) => r.data.data.plans ?? []);

// GET /subscriptions/my
export const getMySubscription = () =>
  client.get("/subscriptions/my").then((r) => r.data.data);

// POST /subscriptions/checkout  →  { url, sessionId }
export const createCheckout = (planId) =>
  client.post("/subscriptions/checkout", { planId }).then((r) => r.data.data);

// POST /subscriptions/verify  →  { subscription, plan }
export const verifyCheckout = (sessionId) =>
  client.post("/subscriptions/verify", { sessionId }).then((r) => r.data.data);

// POST /subscriptions/cancel
export const cancelSubscription = () =>
  client.post("/subscriptions/cancel").then((r) => r.data);

// GET /subscriptions/invoice/:sessionId  →  { invoiceUrl, pdfUrl }
export const getInvoice = (sessionId) =>
  client.get(`/subscriptions/invoice/${sessionId}`).then((r) => r.data.data);
