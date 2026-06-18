// src/api/payments.js
// Matches payment.controller.js + payment.routes.js exactly.
// Response shapes taken directly from each controller function's res.json() call.

import client from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// CARD — POST /payments/initiate/:bookingId
// Stripe  → data: { clientSecret }
// Paystack→ data: { authorizationUrl, reference }
// Already paid → data: { alreadyPaid: true, bookingId }
// ─────────────────────────────────────────────────────────────────────────────
export const initiatePayment = (bookingId) =>
  client.post(`/payments/initiate/${bookingId}`).then((r) => r.data.data);

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE STRIPE CHECKOUT — POST /payments/initiate-checkout/:bookingId
// Returns { url, sessionId } — Checkout Session URL, safe to open in browser.
// Add this single extra endpoint to payment.routes.js (see mobile_stripe_addition.js)
// ─────────────────────────────────────────────────────────────────────────────
export const initiateStripeCheckout = (bookingId) =>
  client
    .post(`/payments/initiate-checkout/${bookingId}`)
    .then((r) => r.data.data);

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY PAYSTACK — GET /payments/verify/paystack?reference=xxx
// Returns { success, message, data: { bookingId, status:"HELD" } }
// ─────────────────────────────────────────────────────────────────────────────
export const verifyPaystackPayment = (reference) =>
  client
    .get("/payments/verify/paystack", { params: { reference } })
    .then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// BANK TRANSFER — Step 1: GET details (no DB write)
// POST /payments/bank-transfer/:bookingId
// Returns {
//   reference, platformFee, workerPayout, totalToSend,
//   bankDetails: { bankName, accountNumber, accountName, amount, currency, narration }
// }
// ─────────────────────────────────────────────────────────────────────────────
export const initiateBankTransfer = (bookingId) =>
  client.post(`/payments/bank-transfer/${bookingId}`).then((r) => r.data.data);

// BANK TRANSFER — Step 2: Confirm after manual transfer (creates DB record)
// PATCH /payments/bank-transfer/:bookingId/confirm
// Body: { reference, proofUrl?, senderName?, bankName? }
// Returns { success, message, data: { payment } }
export const confirmBankTransfer = (bookingId, payload) =>
  client
    .patch(`/payments/bank-transfer/${bookingId}/confirm`, payload)
    .then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// CRYPTO — Step 1: GET wallet details (no DB write)
// POST /payments/crypto/:bookingId  body: { cryptoCurrency: "USDC" }
// Returns {
//   reference, platformFee, workerPayout, totalToSend,
//   cryptoDetails: { currency, network, wallet, amountFiat, note }
// }
// ─────────────────────────────────────────────────────────────────────────────
export const initiateCrypto = (bookingId, cryptoCurrency = "USDC") =>
  client
    .post(`/payments/crypto/${bookingId}`, { cryptoCurrency })
    .then((r) => r.data.data);

// CRYPTO — Step 2: Submit tx hash (creates DB record)
// PATCH /payments/crypto/:bookingId/confirm
// Body: { txHash, cryptoCurrency, reference, cryptoAmount? }
// Returns { success, message, data: { payment } }
export const confirmCrypto = (bookingId, payload) =>
  client
    .patch(`/payments/crypto/${bookingId}/confirm`, payload)
    .then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// RELEASE ESCROW — POST /payments/release/:bookingId  (HIRER)
// ─────────────────────────────────────────────────────────────────────────────
export const releasePayment = (bookingId) =>
  client.post(`/payments/release/${bookingId}`).then((r) => r.data);

// ─────────────────────────────────────────────────────────────────────────────
// GET PAYMENT — GET /payments/:bookingId
// Returns { success, data: payment }
// ─────────────────────────────────────────────────────────────────────────────
export const getPaymentForBooking = (bookingId) =>
  client.get(`/payments/${bookingId}`).then((r) => r.data.data);

// ─────────────────────────────────────────────────────────────────────────────
// HIRER PAYMENT HISTORY — GET /payments/hirer
// Params: { page, limit, status?, currency? }
// Returns { payments, total, pages, page, summary:{ totalSpent, inEscrow, totalRefunds }, availableCurrencies }
// ─────────────────────────────────────────────────────────────────────────────
export const getHirerPayments = (params = {}) =>
  client.get("/payments/hirer", { params }).then((r) => r.data.data);
