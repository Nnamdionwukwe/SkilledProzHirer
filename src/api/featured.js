// src/api/featured.js
import client from "./client";

// GET /featured/packages  →  { packages: [...] }
export const getPackages = () =>
  client.get("/featured/packages").then((r) => r.data.data.packages ?? []);

// GET /featured/my  →  { listing, isActive }
export const getMyFeatured = () =>
  client.get("/featured/my").then((r) => r.data.data);

// POST /featured/checkout  →  { url, sessionId }
export const createFeaturedCheckout = (packageId, categoryId = null) =>
  client
    .post("/featured/checkout", { packageId, categoryId })
    .then((r) => r.data.data);

// POST /featured/verify  →  { listing, package, reference, expiresAt }
export const verifyFeaturedCheckout = (sessionId) =>
  client.post("/featured/verify", { sessionId }).then((r) => r.data.data);

// GET /featured/invoice/:sessionId
export const getFeaturedInvoice = (sessionId) =>
  client.get(`/featured/invoice/${sessionId}`).then((r) => r.data.data);
