// src/screens/main/PaymentHistoryScreen.js
//
// Port of pages/hirer/HirerPaymentHistory.jsx.
//
// Currency switcher: uses `format` from useCurrency() — the SAME function
// DashboardScreen uses. `format` reads `currencyCode` (set by CurrencyPicker
// via setCurrencyCode), so tapping the picker changes every displayed amount
// here immediately, identical to the Dashboard.
//
// `fmt` from useCurrency reads `dashboardCurrency` — a separate state field
// CurrencyPicker does NOT change. Using `fmt` was why the switcher had no
// effect. We use `format` throughout.
//
// Receipt modal + receipt HTML deliberately use the payment's OWN currency
// (payment.currency), because a receipt must reflect the actual transaction,
// not the user's display preference.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import CurrencyPicker from "../../components/CurrencyPicker";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency, CURRENCY_META } from "../../contexts/CurrencyContext";
import { getHirerFeeRate } from "../../utils/pricing";
import client from "../../api/client";
import {
  FaSearch,
  FaTimes,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaInbox,
} from "../../icons/fa";

const LIMIT = 10;

// ── Status config ───────────────────────────────────────────────────────
const STATUS_META = {
  HELD: { label: "In Escrow", key: "escrow" },
  RELEASED: { label: "Released", key: "released" },
  PENDING: { label: "Pending", key: "pending" },
  REFUNDED: { label: "Refunded", key: "refunded" },
  FAILED: { label: "Failed", key: "failed" },
};

const BOOKING_STATUS_META = {
  COMPLETED: { label: "Completed", key: "released" },
  IN_PROGRESS: { label: "In Progress", key: "escrow" },
  CANCELLED: { label: "Cancelled", key: "failed" },
  DISPUTED: { label: "Disputed", key: "pending" },
};

const STATUS_CONFIG_LABEL = {
  PENDING: "Pending Review",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  SUCCESS: "Success",
  FAILED: "Failed",
  REVERSED: "Reversed",
  CANCELLED: "Cancelled",
  INITIATED: "Initiated",
  HELD: "In Escrow",
  RELEASED: "Released",
  REFUNDED: "Refunded",
};

// ── Utility ─────────────────────────────────────────────────────────────
function fmtMoneyNative(amount, currency) {
  // ALWAYS native currency — used only by the receipt.
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `${currency || "USD"} ${Number(amount ?? 0).toFixed(2)}`;
  }
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function formatDateLong(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentChannel(tx) {
  if (tx.provider === "PAYSTACK" || tx.provider?.includes("PAYSTACK")) {
    return { label: "Card (Paystack)" };
  }
  if (tx.provider === "FLUTTERWAVE" || tx.provider?.includes("FLUTTERWAVE")) {
    return { label: "Card / Mobile Money" };
  }
  return { label: tx.provider || "Payment" };
}

// Rough luminance — used only to pick dark/light receipt colors.
function bgLuminance(color) {
  if (!color) return 0.5;
  let r = 0,
    g = 0,
    b = 0;
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
  } else if (color.startsWith("rgb")) {
    const m = color.match(/[\d.]+/g);
    if (m) {
      r = Number(m[0]);
      g = Number(m[1]);
      b = Number(m[2]);
    }
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function statusColors(key, c) {
  switch (key) {
    case "escrow":
      return { bg: "rgba(234,179,8,0.12)", fg: "#eab308" };
    case "released":
      return { bg: c.greenDim, fg: c.green };
    case "pending":
      return { bg: c.orangeDim, fg: c.orange };
    case "refunded":
      return { bg: "rgba(139,92,246,0.12)", fg: "#a78bfa" };
    case "failed":
      return { bg: c.redDim, fg: c.red };
    default:
      return { bg: c.orangeDim, fg: c.orange };
  }
}

// ── Receipt HTML — native currency ──────────────────────────────────────
function generateReceiptHTML(payment, isDark) {
  const channel = getPaymentChannel(payment);
  const feeRate = getHirerFeeRate(payment.currency);
  const feePercent = Math.round(feeRate * 100);

  const bg = isDark ? "#080810" : "#f8f9fa";
  const panel = isDark ? "#0c0c18" : "#ffffff";
  const text = isDark ? "#ffffff" : "#1a1a2e";
  const textDim = isDark ? "#a1a1aa" : "#6b7280";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const borderDash = isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb";
  const footerBg = isDark ? "#0c0c18" : "#f9fafb";

  const statusLabel =
    STATUS_CONFIG_LABEL[payment.status] || payment.status || "—";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${payment.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${bg}; color: ${text}; display: flex; justify-content: center; align-items: flex-start; padding: 20px; }
    .receipt { max-width: 520px; width: 100%; background: ${panel}; border-radius: 16px; overflow: hidden; border: 1px solid ${border}; }
    .receipt-header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 32px 32px 24px; text-align: center; }
    .receipt-header h1 { font-size: 24px; font-weight: 800; color: #fff; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; color: #fff; }
    .receipt-status { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 6px 16px; background: rgba(255,255,255,0.2); border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #fff; }
    .receipt-amount { text-align: center; padding: 28px 32px 24px; border-bottom: 2px dashed ${borderDash}; }
    .receipt-amount .label { font-size: 12px; color: ${textDim}; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    .receipt-amount .value { font-size: 36px; font-weight: 800; margin-top: 8px; }
    .receipt-amount .value.debit { color: #ef4444; }
    .receipt-amount .channel { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 4px 12px; background: rgba(249,115,22,0.15); color: #f97316; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .receipt-body { padding: 24px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${border}; gap: 16px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: ${textDim}; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: ${text}; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${textDim}; font-weight: 800; }
    .fee-row { color: #f97316; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid ${border}; border-bottom: none; }
    .net-row .label { font-weight: 700; color: ${text}; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: ${footerBg}; text-align: center; font-size: 12px; color: ${textDim}; }
    .receipt-footer strong { color: ${text}; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>SkilledProz</h1>
      <p class="subtitle">Transaction Receipt</p>
      <div class="receipt-status">${statusLabel}</div>
    </div>
    <div class="receipt-amount">
      <div class="label">Amount Charged</div>
      <div class="value debit">- ${fmtMoneyNative(payment.amount, payment.currency)}</div>
      <div class="channel">${channel.label}</div>
    </div>
    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Receipt ID</span><span class="value mono">#${String(payment.id).slice(0, 12).toUpperCase()}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">Payment</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(payment.createdAt)}</span></div>
      <div class="row section-title"><span class="label">Booking Details</span></div>
      <div class="row"><span class="label">Service</span><span class="value">${payment.booking?.title || "—"}</span></div>
      <div class="row"><span class="label">Worker</span><span class="value">${payment.booking?.worker?.firstName || ""} ${payment.booking?.worker?.lastName || ""}</span></div>
      <div class="row"><span class="label">Hirer</span><span class="value">${payment.booking?.hirer?.firstName || ""} ${payment.booking?.hirer?.lastName || ""}</span></div>
      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Worker's Earnings</span><span class="value">${fmtMoneyNative(payment.workerPayout || payment.amount * (1 - feeRate), payment.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee (${feePercent}%)</span><span class="value">+ ${fmtMoneyNative(payment.platformFee || payment.amount * feeRate, payment.currency)}</span></div>
      <div class="row net-row"><span class="label">Total Paid</span><span class="value">${fmtMoneyNative(payment.amount, payment.currency)}</span></div>
      ${
        payment.provider || payment.providerRef
          ? `
      <div class="row section-title"><span class="label">Payment Details</span></div>
      <div class="row"><span class="label">Provider</span><span class="value">${payment.provider || "—"}</span></div>
      ${payment.providerRef ? `<div class="row"><span class="label">Provider Ref</span><span class="value mono">${payment.providerRef}</span></div>` : ""}
      `
          : ""
      }
    </div>
    <div class="receipt-footer">
      <p>Thank you for using <strong>SkilledProz</strong></p>
      <p style="margin-top: 6px;">This is an electronically generated receipt. No signature required.</p>
      <p style="margin-top: 8px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Receipt Modal ───────────────────────────────────────────────────────
function ReceiptModal({ payment, onClose, c, isDark }) {
  const [printing, setPrinting] = useState(false);
  if (!payment) return null;

  const { booking } = payment;
  const hirer = booking?.hirer ?? {};
  const worker = booking?.worker ?? {};
  const statusMeta = STATUS_META[payment.status] ?? {
    label: payment.status,
    key: "pending",
  };
  const sc = statusColors(statusMeta.key, c);

  const feeRate = getHirerFeeRate(payment.currency);
  const feePercent = Math.round(feeRate * 100);
  const workerPayout = payment.workerPayout ?? payment.amount * (1 - feeRate);
  const platformFee = payment.platformFee ?? payment.amount * feeRate;

  const handlePrint = async () => {
    setPrinting(true);
    try {
      await Print.printAsync({
        html: generateReceiptHTML(payment, isDark),
      });
    } catch (err) {
      Alert.alert(
        "Print failed",
        err?.message || "Could not open the print dialog.",
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(8,8,16,0.9)" }}>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                backgroundColor: c.bgPanel,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c.border,
                padding: 20,
                gap: 18,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{
                      backgroundColor: c.orange,
                      paddingHorizontal: 6,
                      paddingVertical: 3,
                      borderRadius: 5,
                    }}
                  >
                    <AppText
                      style={{
                        fontFamily: "Syne_800ExtraBold",
                        fontSize: 11,
                        fontWeight: "700",
                        color: "#000",
                      }}
                    >
                      SP
                    </AppText>
                  </View>
                  <AppText
                    style={{
                      fontFamily: "Syne_700Bold",
                      fontSize: 14,
                      fontWeight: "600",
                      color: c.text,
                    }}
                  >
                    SkilledProz
                  </AppText>
                </View>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    {
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      backgroundColor: c.bgInput || c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <FaTimes size={13} color={c.textDim} />
                </Pressable>
              </View>

              {/* Title + status pill */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 20,
                    fontWeight: "700",
                    color: c.text,
                  }}
                >
                  Payment Receipt
                </AppText>
                <View
                  style={{
                    backgroundColor: sc.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: sc.fg,
                      letterSpacing: 0.5,
                    }}
                  >
                    {statusMeta.label}
                  </AppText>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: c.border }} />

              {/* Meta grid */}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                <MetaItem
                  label="Receipt ID"
                  value={`#${String(payment.id).slice(0, 12).toUpperCase()}`}
                  c={c}
                />
                <MetaItem
                  label="Date"
                  value={fmtDateTime(payment.createdAt)}
                  c={c}
                />
                <MetaItem
                  label="Provider"
                  value={payment.provider ?? "—"}
                  c={c}
                />
                {payment.providerRef ? (
                  <MetaItem label="Ref" value={payment.providerRef} c={c} />
                ) : null}
              </View>

              <View style={{ height: 1, backgroundColor: c.border }} />

              {/* Parties */}
              <View style={{ gap: 12 }}>
                <View>
                  <AppText style={labelStyle(c)}>FROM (HIRER)</AppText>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: c.text,
                      marginTop: 2,
                    }}
                  >
                    {`${hirer.firstName || ""} ${hirer.lastName || ""}`.trim() ||
                      "—"}
                  </AppText>
                  {hirer.email ? (
                    <AppText style={{ fontSize: 12, color: c.textDim }}>
                      {hirer.email}
                    </AppText>
                  ) : null}
                </View>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: c.border }}
                  />
                  <AppText style={{ fontSize: 14, color: c.orange }}>→</AppText>
                  <View
                    style={{ flex: 1, height: 1, backgroundColor: c.border }}
                  />
                </View>
                <View>
                  <AppText style={labelStyle(c)}>TO (WORKER)</AppText>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: c.text,
                      marginTop: 2,
                    }}
                  >
                    {`${worker.firstName || ""} ${worker.lastName || ""}`.trim() ||
                      "—"}
                  </AppText>
                  {worker.email ? (
                    <AppText style={{ fontSize: 12, color: c.textDim }}>
                      {worker.email}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: c.border }} />

              {/* Job */}
              {booking ? (
                <View>
                  <AppText style={labelStyle(c)}>JOB</AppText>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "500",
                      color: c.text,
                      marginTop: 4,
                    }}
                  >
                    {booking.title || "—"}
                  </AppText>
                  {booking.category?.name ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        marginTop: 6,
                        backgroundColor: c.orangeDim,
                        paddingHorizontal: 10,
                        paddingVertical: 3,
                        borderRadius: 999,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          color: c.orange,
                          fontWeight: "600",
                        }}
                      >
                        {booking.category.name}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={{ height: 1, backgroundColor: c.border }} />

              {/* Breakdown — native currency (actual transaction) */}
              <View style={{ gap: 10 }}>
                <View style={rowBetween}>
                  <AppText style={dimText(c)}>Worker's earnings</AppText>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: c.green,
                    }}
                  >
                    {fmtMoneyNative(workerPayout, payment.currency)}
                  </AppText>
                </View>
                <View style={rowBetween}>
                  <AppText style={dimText(c)}>
                    Platform fee ({feePercent}%)
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: c.red,
                    }}
                  >
                    {`+ ${fmtMoneyNative(platformFee, payment.currency)}`}
                  </AppText>
                </View>
                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                    paddingTop: 10,
                    marginTop: 4,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: c.text,
                    }}
                  >
                    Total you paid
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: "Syne_800ExtraBold",
                      fontSize: 18,
                      fontWeight: "800",
                      color: c.orange,
                    }}
                  >
                    {fmtMoneyNative(payment.amount, payment.currency)}
                  </AppText>
                </View>
              </View>

              {/* Worker gets 100% note */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                  backgroundColor: "rgba(34,197,94,0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.2)",
                  borderRadius: 8,
                  padding: 10,
                }}
              >
                <FaCheckCircle size={16} color={c.green} />
                <AppText
                  style={{
                    flex: 1,
                    fontSize: 12,
                    color: c.textDim,
                    lineHeight: 17,
                  }}
                >
                  Worker receives{" "}
                  <AppText style={{ fontWeight: "700", color: c.green }}>
                    100%
                  </AppText>{" "}
                  of the job amount (
                  {fmtMoneyNative(workerPayout, payment.currency)})
                </AppText>
              </View>

              {payment.escrowReleasedAt ? (
                <View
                  style={{
                    backgroundColor: c.greenDim,
                    borderWidth: 1,
                    borderColor: "rgba(34,197,94,0.2)",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <AppText style={{ fontSize: 12, color: c.green }}>
                    Funds released to worker on{" "}
                    {fmtDateTime(payment.escrowReleasedAt)}
                  </AppText>
                </View>
              ) : null}

              {payment.refundedAt ? (
                <View
                  style={{
                    backgroundColor: "rgba(139,92,246,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(139,92,246,0.2)",
                    borderRadius: 8,
                    padding: 10,
                  }}
                >
                  <AppText style={{ fontSize: 12, color: "#a78bfa" }}>
                    Refunded on {fmtDateTime(payment.refundedAt)}
                  </AppText>
                </View>
              ) : null}

              {/* Footer */}
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  paddingTop: 14,
                  gap: 10,
                }}
              >
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  SkilledPro · Global Skills Marketplace
                </AppText>
                <Pressable
                  onPress={handlePrint}
                  disabled={printing}
                  style={({ pressed }) => [
                    {
                      backgroundColor: c.orangeDim,
                      borderWidth: 1,
                      borderColor: c.orangeGlow,
                      borderRadius: 8,
                      paddingVertical: 10,
                      alignItems: "center",
                      opacity: printing ? 0.5 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: c.orange,
                    }}
                  >
                    {printing ? "Preparing…" : "Print / Save PDF"}
                  </AppText>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function MetaItem({ label, value, c }) {
  return (
    <View style={{ flexBasis: "45%", minWidth: 120 }}>
      <AppText style={labelStyle(c)}>{label}</AppText>
      <AppText
        style={{
          fontFamily: "Syne_700Bold",
          fontSize: 12,
          color: c.textDim,
          marginTop: 2,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

const rowBetween = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
};

const labelStyle = (c) => ({
  fontSize: 10,
  fontWeight: "700",
  color: c.textMuted,
  letterSpacing: 0.7,
  textTransform: "uppercase",
});

const dimText = (c) => ({
  fontSize: 14,
  color: c.textDim,
});

// ── Summary card ────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, accent, c }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        backgroundColor: accent ? "rgba(249,115,22,0.06)" : c.bgCard,
        borderWidth: 1,
        borderColor: accent ? c.orangeGlow : c.border,
        borderRadius: 12,
        padding: 16,
        gap: 4,
      }}
    >
      <AppText
        style={{
          fontSize: 11,
          color: c.textDim,
          letterSpacing: 0.7,
          textTransform: "uppercase",
        }}
      >
        {label}
      </AppText>
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 20,
          fontWeight: "700",
          color: accent ? c.orange : c.text,
          marginTop: 2,
        }}
      >
        {value}
      </AppText>
      {sub ? (
        <AppText style={{ fontSize: 11, color: c.textMuted }}>{sub}</AppText>
      ) : null}
    </View>
  );
}

// ── Payment card ────────────────────────────────────────────────────────
// `format` comes straight from useCurrency() — it reads `currencyCode`,
// which CurrencyPicker changes via setCurrencyCode. This is the exact same
// function DashboardScreen uses on its Total Spent card.
function PaymentCard({ payment, onOpenReceipt, c, format }) {
  const statusMeta = STATUS_META[payment.status] ?? {
    label: payment.status,
    key: "pending",
  };
  const sc = statusColors(statusMeta.key, c);
  const worker = payment.booking?.worker ?? {};
  const bookingStatus = BOOKING_STATUS_META[payment.booking?.status];
  const rowFeePercent = Math.round(getHirerFeeRate(payment.currency) * 100);

  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        padding: 14,
        gap: 12,
      }}
    >
      {/* Top row: job + status */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            numberOfLines={1}
            style={{ fontSize: 14, fontWeight: "600", color: c.text }}
          >
            {payment.booking?.title ?? "—"}
          </AppText>
          {payment.booking?.category?.name ? (
            <AppText
              numberOfLines={1}
              style={{ fontSize: 11, color: c.textDim, marginTop: 2 }}
            >
              {payment.booking.category.name}
            </AppText>
          ) : null}
          {bookingStatus ? (
            <View
              style={{
                alignSelf: "flex-start",
                marginTop: 6,
                backgroundColor: statusColors(bookingStatus.key, c).bg,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 999,
              }}
            >
              <AppText
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  color: statusColors(bookingStatus.key, c).fg,
                }}
              >
                {bookingStatus.label}
              </AppText>
            </View>
          ) : null}
        </View>
        <View
          style={{
            alignSelf: "flex-start",
            backgroundColor: sc.bg,
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: 999,
          }}
        >
          <AppText style={{ fontSize: 10, fontWeight: "700", color: sc.fg }}>
            {statusMeta.label}
          </AppText>
        </View>
      </View>

      {/* Worker + date */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flex: 1,
            minWidth: 0,
          }}
        >
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: c.orangeDim,
              borderWidth: 1,
              borderColor: c.orangeGlow,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {worker.avatar ? (
              <Image
                source={{ uri: worker.avatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: c.orange,
                }}
              >
                {initials(worker.firstName, worker.lastName)}
              </AppText>
            )}
          </View>
          <AppText
            numberOfLines={1}
            style={{ fontSize: 13, color: c.text, flex: 1 }}
          >
            {`${worker.firstName || ""} ${worker.lastName || ""}`.trim() || "—"}
          </AppText>
        </View>
        <AppText style={{ fontSize: 12, color: c.textDim }}>
          {fmtDate(payment.createdAt)}
        </AppText>
      </View>

      {/* Amount block — uses format(amount), which reflects currencyCode */}
      <View
        style={{
          backgroundColor: c.bgCard,
          borderRadius: 9,
          borderWidth: 1,
          borderColor: c.border,
          padding: 10,
          gap: 4,
        }}
      >
        <AppText
          style={{
            fontFamily: "Syne_700Bold",
            fontSize: 15,
            fontWeight: "600",
            color: c.text,
          }}
        >
          {format(payment.amount)}
        </AppText>
        <AppText style={{ fontSize: 11, color: c.textMuted }}>
          Worker gets{" "}
          <AppText style={{ fontWeight: "700", color: c.green }}>100%</AppText>{" "}
          ({format(payment.workerPayout)})
        </AppText>
        <AppText style={{ fontSize: 10, color: c.orange, fontWeight: "600" }}>
          {`Platform fee: ${rowFeePercent}%`}
        </AppText>
      </View>

      {/* Actions */}
      <Pressable
        onPress={onOpenReceipt}
        style={({ pressed }) => [
          {
            alignSelf: "flex-start",
            backgroundColor: c.bgInput || c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 7,
            paddingHorizontal: 14,
            paddingVertical: 6,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <AppText style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}>
          Receipt
        </AppText>
      </Pressable>
    </View>
  );
}

// ── Skeleton rows ───────────────────────────────────────────────────────
function SkeletonRows({ c }) {
  return (
    <View style={{ gap: 10 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton
          key={i}
          width="100%"
          height={150}
          radius={12}
          style={{ backgroundColor: c.bgPanel }}
        />
      ))}
    </View>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────
function EmptyState({ c }) {
  return (
    <View
      style={{
        alignItems: "center",
        paddingVertical: 56,
        paddingHorizontal: 20,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        gap: 8,
      }}
    >
      <FaInbox size={40} color={c.textMuted} />
      <AppText style={{ fontSize: 15, fontWeight: "600", color: c.textDim }}>
        No transactions yet
      </AppText>
      <AppText
        style={{
          fontSize: 12,
          color: c.textMuted,
          textAlign: "center",
          maxWidth: 300,
        }}
      >
        Your payment history will appear here once you book a worker.
      </AppText>
    </View>
  );
}

// ── Main screen ─────────────────────────────────────────────────────────
export default function PaymentHistoryScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const isDark = bgLuminance(c.bg) < 0.5;

  // `format` is the SAME currency formatter DashboardScreen uses.
  // It reads `currencyCode` under the hood (via CurrencyContext's `code`),
  // which CurrencyPicker updates through setCurrencyCode. That's why
  // tapping the picker changes every displayed amount below.
  const { format } = useCurrency();

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [currencyFilter, setCurrency] = useState("ALL");
  const [availableCurrencies, setAvailableCurrencies] = useState([]);

  // Fetch
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = { page, limit: LIMIT };
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (currencyFilter !== "ALL") params.currency = currencyFilter;

    client
      .get("/payments/hirer", { params })
      .then((res) => {
        const d = res.data.data ?? res.data;
        setPayments(d.payments ?? []);
        setTotal(d.total ?? 0);
        setTotalPages(d.pages ?? 1);
        setSummary(d.summary ?? null);
        setAvailableCurrencies(d.availableCurrencies ?? []);
      })
      .catch(() => setError("Failed to load payment history."))
      .finally(() => setLoading(false));
  }, [page, statusFilter, currencyFilter]);

  // Client-side search
  const visible = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter(
      (p) =>
        p.booking?.title?.toLowerCase().includes(q) ||
        p.booking?.worker?.firstName?.toLowerCase().includes(q) ||
        p.booking?.worker?.lastName?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q),
    );
  }, [payments, search]);

  // Derived summary (client-side fallback if summary omitted)
  const totalSpent =
    summary?.totalSpent ??
    payments
      .filter((p) => p.status === "RELEASED")
      .reduce((s, p) => s + (p.amount ?? 0), 0);
  const inEscrow =
    summary?.inEscrow ??
    payments
      .filter((p) => p.status === "HELD")
      .reduce((s, p) => s + (p.amount ?? 0), 0);
  const totalRefunds =
    summary?.totalRefunds ??
    payments
      .filter((p) => p.status === "REFUNDED")
      .reduce((s, p) => s + (p.amount ?? 0), 0);

  const statusTabList = ["ALL", "HELD", "RELEASED", "REFUNDED", "FAILED"];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <FlatList
        data={loading ? [] : visible}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 10 }}>
            {/* Page header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 22,
                    fontWeight: "700",
                    color: c.text,
                    letterSpacing: -0.3,
                  }}
                >
                  Payment History
                </AppText>
                <AppText
                  style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}
                >
                  All transactions and receipts
                </AppText>
              </View>
              <CurrencyPicker compact />
            </View>

            {/* Summary row — uses format(), same as Dashboard Total Spent */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              <SummaryCard
                label="Total Spent"
                value={format(totalSpent)}
                sub={`${total} transaction${total !== 1 ? "s" : ""}`}
                accent
                c={c}
              />
              <SummaryCard
                label="In Escrow"
                value={format(inEscrow)}
                sub="Awaiting release"
                c={c}
              />
              <SummaryCard
                label="Refunded"
                value={format(totalRefunds)}
                sub="Returned to you"
                c={c}
              />
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: c.bgInput || c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 9,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <FaSearch size={14} color={c.textDim} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search by job, worker, or ID…"
                placeholderTextColor={c.textMuted}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: c.text,
                  fontSize: 13,
                  paddingVertical: 8,
                }}
              />
              {search ? (
                <Pressable onPress={() => setSearch("")} hitSlop={6}>
                  <FaTimes size={14} color={c.textDim} />
                </Pressable>
              ) : null}
            </View>

            {/* Status tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingRight: 8 }}
            >
              {statusTabList.map((s) => {
                const active = statusFilter === s;
                const label =
                  s === "ALL" ? "All" : (STATUS_META[s]?.label ?? s);
                return (
                  <Pressable
                    key={s}
                    onPress={() => {
                      setStatus(s);
                      setPage(1);
                    }}
                    style={({ pressed }) => [
                      {
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? c.orange : c.border,
                        backgroundColor: active ? c.orangeDim : "transparent",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        color: active ? c.orange : c.textDim,
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Currency filter — server-side filter, independent of picker */}
            {availableCurrencies.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  gap: 6,
                  alignItems: "center",
                  paddingRight: 8,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.textMuted,
                    fontWeight: "600",
                    marginRight: 4,
                  }}
                >
                  Currency:
                </AppText>
                <Pressable
                  onPress={() => {
                    setCurrency("ALL");
                    setPage(1);
                  }}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor:
                        currencyFilter === "ALL" ? c.orange : c.border,
                      backgroundColor:
                        currencyFilter === "ALL" ? c.orangeDim : "transparent",
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      color: currencyFilter === "ALL" ? c.orange : c.textDim,
                      fontWeight: "600",
                    }}
                  >
                    All
                  </AppText>
                </Pressable>
                {availableCurrencies.map((cur) => {
                  const active = currencyFilter === cur;
                  return (
                    <Pressable
                      key={cur}
                      onPress={() => {
                        setCurrency(cur);
                        setPage(1);
                      }}
                      style={({ pressed }) => [
                        {
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: active ? c.orange : c.border,
                          backgroundColor: active ? c.orangeDim : "transparent",
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          color: active ? c.orange : c.textDim,
                          fontWeight: "600",
                        }}
                      >
                        {`${CURRENCY_META?.[cur]?.symbol || ""} ${cur}`.trim()}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <PaymentCard
            payment={item}
            onOpenReceipt={() => setReceipt(item)}
            c={c}
            format={format}
          />
        )}
        ListEmptyComponent={
          error ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <AppText style={{ fontSize: 13, color: c.red }}>{error}</AppText>
            </View>
          ) : loading ? (
            <SkeletonRows c={c} />
          ) : (
            <EmptyState c={c} />
          )
        }
        ListFooterComponent={
          !loading && totalPages > 1 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                marginTop: 20,
              }}
            >
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: page === 1 ? 0.35 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                <FaChevronLeft size={11} color={c.textDim} />
                <AppText style={{ fontSize: 12, color: c.textDim }}>
                  Prev
                </AppText>
              </Pressable>
              <AppText style={{ fontSize: 12, color: c.textDim }}>
                {`Page ${page} of ${totalPages}`}
              </AppText>
              <Pressable
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    opacity: page === totalPages ? 0.35 : pressed ? 0.75 : 1,
                  },
                ]}
              >
                <AppText style={{ fontSize: 12, color: c.textDim }}>
                  Next
                </AppText>
                <FaChevronRight size={11} color={c.textDim} />
              </Pressable>
            </View>
          ) : null
        }
      />

      {receipt ? (
        <ReceiptModal
          payment={receipt}
          onClose={() => setReceipt(null)}
          c={c}
          isDark={isDark}
        />
      ) : null}
    </SafeAreaView>
  );
}
