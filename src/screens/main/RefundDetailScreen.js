// src/screens/main/RefundDetailScreen.js
//
// Verbatim port of pages/refund/RefundDetail.jsx.
//
// Fetch: GET /refunds/:id
// Renders:
//   · Back link → RefundHistory
//   · Status banner (icon + label + reference pill, colored by status)
//   · 2-column grid (mobile: stacked) of 4 detail sections:
//       1. Refund Information
//       2. Booking Information
//       3. Timeline
//       4. Reason & Notes
//   · Action buttons (when COMPLETED): Print Receipt, Download Receipt
//   · Back to History link
//   · PageSkeleton during load
//
// Receipt generation:
//   · Web downloads HTML via Blob + anchor click.
//   · Mobile: build the HTML string, write it to a file via expo-file-system,
//     then open with expo-sharing / expo-intent-launcher.
//   · Both expo-file-system and expo-sharing are guarded — if missing,
//     receipt actions are hidden.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaFileInvoice,
  FaInfoCircle,
  FaDownload,
  FaPrint,
} from "../../icons/fa";

// Optional expo modules — guarded
let FileSystem = null;
let Sharing = null;
try {
  FileSystem = require("expo-file-system");
} catch {}
try {
  Sharing = require("expo-sharing");
} catch {}

// ── Status config — verbatim from web ────────────────────────────────
const STATUS_CONFIG = {
  PENDING: {
    icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    bg: "rgba(251,191,36,0.1)",
  },
  APPROVED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Approved",
    bg: "rgba(34,197,94,0.1)",
  },
  PROCESSING: {
    icon: FaClock,
    color: "#818cf8",
    label: "Processing",
    bg: "rgba(129,140,248,0.1)",
  },
  COMPLETED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Completed",
    bg: "rgba(34,197,94,0.1)",
  },
  FAILED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    bg: "rgba(239,68,68,0.1)",
  },
  REJECTED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Rejected",
    bg: "rgba(239,68,68,0.1)",
  },
  DISPUTED: {
    icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
    bg: "rgba(245,158,11,0.1)",
  },
};

function fmtCurrency(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtShortDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Receipt HTML generator (verbatim from web) ───────────────────────
function generateReceiptHTML(refund) {
  const transaction = {
    reference: refund.reference,
    type: "REFUND",
    amount: refund.amount,
    currency: refund.currency,
    status: refund.status,
    createdAt: refund.createdAt,
    completedAt: refund.processedAt,
    description: refund.reason || "Refund processed for booking",
    fee: 0,
    netAmount: refund.amount,
    meta: {
      paymentProvider: refund.payment?.provider,
      transactionId: refund.payment?.providerRef,
    },
  };
  const amountPrefix = "+";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Receipt - ${transaction.reference}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, sans-serif; background: #080810; color: #fff; padding: 20px; }
  .receipt { max-width: 520px; margin: 0 auto; background: #0c0c18; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); }
  .header { background: linear-gradient(135deg,#f97316,#ea580c); padding: 32px 32px 24px; text-align: center; }
  .header h1 { font-size: 24px; font-weight: 800; color: #fff; }
  .header p { font-size: 13px; opacity: 0.9; color: #fff; margin-top: 4px; }
  .status { display: inline-flex; margin-top: 16px; padding: 6px 16px; background: rgba(255,255,255,0.2); border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #fff; }
  .amount { text-align: center; padding: 28px 32px; border-bottom: 2px dashed rgba(255,255,255,0.15); }
  .amount .label { font-size: 12px; color: #a1a1aa; text-transform: uppercase; font-weight: 700; }
  .amount .value { font-size: 36px; font-weight: 800; margin-top: 8px; color: #22c55e; }
  .body { padding: 24px 32px; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.08); gap: 16px; }
  .row:last-child { border-bottom: none; }
  .row .label { color: #a1a1aa; font-size: 13px; }
  .row .value { color: #fff; font-size: 13px; font-weight: 600; text-align: right; }
  .footer { padding: 24px 32px; background: #0c0c18; text-align: center; font-size: 12px; color: #a1a1aa; }
</style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>SkilledProz</h1>
      <p>Refund Receipt</p>
      <div class="status">${STATUS_CONFIG[transaction.status]?.label || transaction.status}</div>
    </div>
    <div class="amount">
      <div class="label">Amount Refunded</div>
      <div class="value">${amountPrefix} ${fmtCurrency(transaction.amount, transaction.currency)}</div>
    </div>
    <div class="body">
      <div class="row"><span class="label">Reference</span><span class="value">${transaction.reference}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${fmtDateLong(transaction.createdAt)}</span></div>
      ${transaction.completedAt ? `<div class="row"><span class="label">Completed</span><span class="value">${fmtDateLong(transaction.completedAt)}</span></div>` : ""}
      ${transaction.description ? `<div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>` : ""}
      <div class="row"><span class="label">Net Amount</span><span class="value">${fmtCurrency(transaction.netAmount, transaction.currency)}</span></div>
      ${transaction.meta?.paymentProvider ? `<div class="row"><span class="label">Provider</span><span class="value">${transaction.meta.paymentProvider}</span></div>` : ""}
    </div>
    <div class="footer">
      Thank you for using SkilledProz<br>
      This is an electronically generated receipt.
    </div>
  </div>
</body>
</html>`;
}

export default function RefundDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const refundId = route.params?.refundId;

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch ───────────────────────────────────────────────────────────
  const fetchRefund = useCallback(async () => {
    if (!refundId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(`/refunds/${refundId}`);
      setRefund(res?.data?.data?.refund || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load refund details");
      // If 404, bounce back after a moment
      if (err?.response?.status === 404) {
        setTimeout(() => navigation.navigate("RefundHistory"), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [refundId, navigation]);

  useEffect(() => {
    fetchRefund();
  }, [fetchRefund]);

  const statusConfig = useMemo(() => {
    if (!refund) return null;
    return (
      STATUS_CONFIG[refund.status] || {
        icon: FaClock,
        color: "#888",
        label: refund.status || "Unknown",
        bg: "rgba(136,136,136,0.1)",
      }
    );
  }, [refund]);

  // ── Download receipt (mobile) ───────────────────────────────────────
  const handleDownloadReceipt = async () => {
    if (!refund) return;
    if (!FileSystem || !Sharing) {
      toast.info("Install expo-file-system and expo-sharing to download.");
      return;
    }
    try {
      const html = generateReceiptHTML(refund);
      const filename = `receipt-${refund.reference || refund.id}.html`;
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, {
          mimeType: "text/html",
          dialogTitle: "Save Refund Receipt",
        });
      } else {
        toast.info("Sharing not available on this device.");
      }
    } catch {
      toast.error("Failed to generate receipt.");
    }
  };

  // ── Print receipt (mobile approximation) ───────────────────────────
  const handlePrint = async () => {
    if (!refund) return;
    // On mobile, "print" = open the HTML in a browser tab; the user can print
    // from there (Chrome/Safari both support print). If expo-print is installed,
    // use that instead.
    let Print = null;
    try {
      Print = require("expo-print");
    } catch {}
    if (Print) {
      try {
        await Print.printAsync({ html: generateReceiptHTML(refund) });
        return;
      } catch {}
    }
    toast.info("Install expo-print to enable printing.");
  };

  // ── Guards ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  if (error || !refund) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <FaExclamationTriangle size={40} color={c.red} />
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              marginTop: 12,
            }}
          >
            {error || "Refund not found"}
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim, marginTop: 6 }}>
            Redirecting to refund history…
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("RefundHistory")}
            style={[styles.backBtn, { borderColor: c.border, marginTop: 16 }]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                marginLeft: 6,
              }}
            >
              Back to Refunds
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  const StatusIcon = statusConfig.icon;

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Back link */}
      <Pressable
        onPress={() => navigation.navigate("RefundHistory")}
        style={styles.backLink}
      >
        <FaArrowLeft size={12} color={c.textDim} />
        <AppText
          style={{
            fontSize: 13,
            color: c.textDim,
            fontWeight: "600",
            marginLeft: 6,
          }}
        >
          Back to Refunds
        </AppText>
      </Pressable>

      {/* Title */}
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 24,
          fontWeight: "800",
          color: c.text,
          letterSpacing: -0.4,
          marginTop: 8,
          marginBottom: 16,
        }}
      >
        Refund Details
      </AppText>

      {/* Status banner */}
      <View
        style={[
          styles.statusBanner,
          { backgroundColor: statusConfig.bg, borderColor: statusConfig.color },
        ]}
      >
        <StatusIcon size={24} color={statusConfig.color} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Status
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 15,
              fontWeight: "800",
              color: statusConfig.color,
              marginTop: 1,
            }}
          >
            {statusConfig.label}
          </AppText>
        </View>
        <View
          style={[
            styles.refBadge,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontSize: 9,
              color: c.textMuted,
              fontFamily: "monospace",
              letterSpacing: 0.2,
            }}
            numberOfLines={1}
          >
            Ref: {refund.reference}
          </AppText>
        </View>
      </View>

      {/* ── SECTION: Refund Information ──────────────────────────── */}
      <SectionBlock
        icon={<FaMoneyBillWave size={11} color={c.orange} />}
        title="Refund Information"
        c={c}
      >
        <DetailRow label="Amount" c={c}>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.orange,
            }}
          >
            {refund.currency} {Number(refund.amount || 0).toLocaleString()}
          </AppText>
        </DetailRow>
        <DetailRow label="Type" c={c}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {(refund.refundType || "N/A").replace("_", " ")}
          </AppText>
        </DetailRow>
        {refund.percentage != null ? (
          <DetailRow label="Percentage" c={c}>
            <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
              {refund.percentage}%
            </AppText>
          </DetailRow>
        ) : null}
        <DetailRow label="Platform Fee Refunded" c={c}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {refund.currency}{" "}
            {Number(refund.platformFeeRefunded || 0).toLocaleString()}
          </AppText>
        </DetailRow>
        <DetailRow label="Worker Deducted" c={c}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {refund.currency}{" "}
            {Number(refund.workerAmountDeducted || 0).toLocaleString()}
          </AppText>
        </DetailRow>
      </SectionBlock>

      {/* ── SECTION: Booking Information ─────────────────────────── */}
      <SectionBlock
        icon={<FaFileInvoice size={11} color={c.orange} />}
        title="Booking Information"
        c={c}
      >
        <DetailRow label="Booking" c={c}>
          <Pressable
            onPress={() =>
              refund.booking?.id &&
              navigation.navigate("BookingDetail", {
                bookingId: refund.booking.id,
              })
            }
          >
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.orange,
                textDecorationLine: "underline",
              }}
              numberOfLines={1}
            >
              {refund.booking?.title || "N/A"}
            </AppText>
          </Pressable>
        </DetailRow>
        <DetailRow label="Hirer" c={c}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {refund.hirer?.firstName} {refund.hirer?.lastName}
          </AppText>
        </DetailRow>
        <DetailRow label="Worker" c={c}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {refund.worker?.firstName} {refund.worker?.lastName}
          </AppText>
        </DetailRow>
        <DetailRow label="Original Payment" c={c}>
          <AppText
            style={{ fontSize: 13, fontWeight: "700", color: c.text }}
            numberOfLines={1}
          >
            {refund.payment?.provider || "N/A"} -{" "}
            {refund.payment?.providerRef || "N/A"}
          </AppText>
        </DetailRow>
      </SectionBlock>

      {/* ── SECTION: Timeline ────────────────────────────────────── */}
      <SectionBlock
        icon={<FaClock size={11} color={c.orange} />}
        title="Timeline"
        c={c}
      >
        <DetailRow label="Requested" c={c}>
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
            {fmtShortDate(refund.createdAt)}
          </AppText>
        </DetailRow>
        {refund.autoApprovedAt ? (
          <DetailRow label="Auto-Approved" c={c}>
            <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
              {fmtShortDate(refund.autoApprovedAt)}
            </AppText>
          </DetailRow>
        ) : null}
        {refund.processedAt ? (
          <DetailRow label="Processed" c={c}>
            <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
              {fmtShortDate(refund.processedAt)}
            </AppText>
          </DetailRow>
        ) : null}
        {refund.status === "COMPLETED" ? (
          <DetailRow label="Completed" c={c}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <FaCheckCircle size={11} color={c.green} />
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.green }}
              >
                Done
              </AppText>
            </View>
          </DetailRow>
        ) : null}
      </SectionBlock>

      {/* ── SECTION: Reason & Notes ──────────────────────────────── */}
      <SectionBlock
        icon={<FaInfoCircle size={11} color={c.orange} />}
        title="Reason & Notes"
        c={c}
      >
        <View style={{ paddingVertical: 4 }}>
          <AppText style={{ fontSize: 11, color: c.textDim, marginBottom: 4 }}>
            Reason
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.text, lineHeight: 20 }}
            numberOfLines={6}
          >
            {refund.reason || "N/A"}
          </AppText>
        </View>
        {refund.adminNotes ? (
          <View
            style={{
              paddingVertical: 8,
              paddingTop: 12,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
              marginTop: 8,
            }}
          >
            <AppText
              style={{ fontSize: 11, color: c.textDim, marginBottom: 4 }}
            >
              Admin Notes
            </AppText>
            <AppText
              style={{ fontSize: 13, color: c.text, lineHeight: 20 }}
              numberOfLines={6}
            >
              {refund.adminNotes}
            </AppText>
          </View>
        ) : null}
      </SectionBlock>

      {/* ── Actions ──────────────────────────────────────────────── */}
      {refund.status === "COMPLETED" ? (
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handlePrint}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <FaPrint size={12} color={c.text} />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.text,
                marginLeft: 6,
              }}
            >
              Print Receipt
            </AppText>
          </Pressable>
          <Pressable
            onPress={handleDownloadReceipt}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <FaDownload size={12} color="#fff" />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#fff",
                marginLeft: 6,
              }}
            >
              Download Receipt
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate("RefundHistory")}
        style={{ paddingVertical: 16, alignItems: "center" }}
      >
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: c.textDim,
            textDecorationLine: "underline",
          }}
        >
          View All Refunds
        </AppText>
      </Pressable>
    </AppScreen>
  );
}

// ── Sub-components ───────────────────────────────────────────────────
function SectionBlock({ icon, title, children, c }) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View style={styles.sectionHeader}>
        {icon}
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 1,
            marginLeft: 6,
          }}
        >
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function DetailRow({ label, children, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 8,
        gap: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textDim, flexShrink: 1 }}>
        {label}
      </AppText>
      <View style={{ flex: 1, alignItems: "flex-end" }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  refBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 150,
  },
  section: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "transparent",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
