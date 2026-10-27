// src/utils/pricing.js
//
// Verbatim port of the web pricing utility. This is the SINGLE source of
// truth for fee rates and the calcPricing pipeline — used by BookingDetail,
// BookingDetailPayment, WorkerPaymentPreview, and the dashboard Total Spent
// footnote.
//
// Rule (matches web exactly):
//   · NGN (local currency) → 2% fee, 98% to worker
//   · Any other currency   → 5% fee, 95% to worker
//
// Do NOT hardcode percentages anywhere else. Call getHirerFeeRate(currency).

const NGN_RATE = 0.03;
const FOREIGN_RATE = 0.06;

/**
 * Fee rate charged to the HIRER for the given currency.
 * Returns a decimal, e.g. 0.02 for 2% or 0.05 for 5%.
 */
export function getHirerFeeRate(currency = "NGN") {
  return String(currency).toUpperCase() === "NGN" ? NGN_RATE : FOREIGN_RATE;
}

// ── Normalize a booking's rate + quantity into a subtotal ────────────────────
function normalizeQuantity(booking) {
  const unit = booking?.estimatedUnit || "hours";
  const rawValue = booking?.estimatedValue;
  const rawHours = booking?.estimatedHours;

  // Custom duration → no arithmetic, treat estimatedValue as the human label
  if (unit === "custom") {
    return {
      unit,
      hasQty: false,
      qty: null,
      unitLabel: "custom",
      unitSuffix: "",
      subtotal: Number(booking?.agreedRate) || 0,
    };
  }

  // Negotiated bookings use negotiatedRate as the whole total (no * qty)
  if (booking?.isNegotiated && booking?.negotiatedRate) {
    return {
      unit,
      hasQty: false,
      qty: null,
      unitLabel: unit,
      unitSuffix: suffixForUnit(unit),
      subtotal: Number(booking.negotiatedRate) || 0,
    };
  }

  // Direct bookings: parse estimatedValue or estimatedHours into qty
  let qty = null;
  if (rawValue) qty = parseFloat(rawValue);
  else if (rawHours) qty = parseFloat(rawHours);

  const agreedRate = Number(booking?.agreedRate) || 0;

  // If we have a valid qty, subtotal = qty × rate; otherwise subtotal = rate
  const hasQty = Number.isFinite(qty) && qty > 0;
  const subtotal = hasQty ? qty * agreedRate : agreedRate;

  return {
    unit,
    hasQty,
    qty: hasQty ? qty : null,
    unitLabel:
      unit === "hours"
        ? "hour"
        : unit === "days"
          ? "day"
          : unit === "weeks"
            ? "week"
            : unit === "months"
              ? "month"
              : unit,
    unitSuffix: suffixForUnit(unit),
    subtotal,
  };
}

function suffixForUnit(unit) {
  switch (unit) {
    case "hours":
      return "/hr";
    case "days":
      return "/day";
    case "weeks":
      return "/wk";
    case "months":
      return "/mo";
    default:
      return "";
  }
}

/**
 * Full pricing pipeline. Given a booking, returns:
 *   { subtotal, hirerFee, grossTotal, workerPayout, currency,
 *     agreedRate, unit, hasQty, qty, unitLabel, unitSuffix }
 *
 * Never throws — bad data yields sensible zeros.
 */
export function calcPricing(booking) {
  if (!booking) {
    return {
      subtotal: 0,
      hirerFee: 0,
      grossTotal: 0,
      workerPayout: 0,
      currency: "NGN",
      agreedRate: 0,
      unit: "hours",
      hasQty: false,
      qty: null,
      unitLabel: "hour",
      unitSuffix: "/hr",
    };
  }

  const currency = booking.currency || "NGN";
  const feeRate = getHirerFeeRate(currency);
  const q = normalizeQuantity(booking);
  const subtotal = q.subtotal;

  // Two possible pricing models:
  //   1. Rate × qty → hirer pays subtotal + fee, worker gets subtotal
  //   2. Job post / negotiated → total is fixed; worker gets total, hirer
  //      pays total + fee
  //
  // Both cases agree that:
  //   hirerFee    = feeRate × (what worker receives)
  //   grossTotal  = worker_receives + hirerFee
  //
  // For "rate × qty" case, what the worker receives = subtotal.
  // For "fixed total" case, what the worker receives = subtotal (agreedRate).
  const workerPayout = subtotal;
  const hirerFee = Math.round(workerPayout * feeRate * 100) / 100;
  const grossTotal = Math.round((workerPayout + hirerFee) * 100) / 100;

  return {
    subtotal,
    hirerFee,
    grossTotal,
    workerPayout,
    currency,
    agreedRate: Number(booking.agreedRate) || 0,
    unit: q.unit,
    hasQty: q.hasQty,
    qty: q.qty,
    unitLabel: q.unitLabel,
    unitSuffix: q.unitSuffix,
  };
}
