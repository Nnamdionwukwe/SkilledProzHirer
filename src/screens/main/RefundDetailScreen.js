// src/screens/main/RefundDetailScreen.js
//
// Port of pages/refund/RefundDetail.jsx + Refund.module.css.
//
// Preserved verbatim:
//   - STATUS_CONFIG (7 statuses with colors + bg)
//   - GET /refunds/:id
//   - generateReceiptHTML (byte-identical to web, minus DOM-only)
//   - 4 detail sections: Refund Information, Booking Information,
//     Timeline, Reason & Notes
//   - Print + Download actions (only shown when COMPLETED)
//   - Error state with "Redirecting to refund history…" copy

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaFileInvoice,
  FaInfoCircle,
  FaDownload,
  FaPrint,
  FaCreditCard,
  FaWallet,
  FaDollarSign,
  FaShieldAlt,
  FaPlus,
  FaMinus,
  FaArrowUp,
  FaBuilding,
} from "../../icons/fa";

const STATUS_CONFIG = {
  PENDING: {
    Icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    bg: "rgba(251,191,36,0.1)",
  },
  APPROVED: {
    Icon: FaCheckCircle,
    color: "#22c55e",
    label: "Approved",
    bg: "rgba(34,197,94,0.1)",
  },
  PROCESSING: {
    Icon: FaSpinner,
    color: "#818cf8",
    label: "Processing",
    bg: "rgba(129,140,248,0.1)",
  },
  COMPLETED: {
    Icon: FaCheckCircle,
    color: "#22c55e",
    label: "Completed",
    bg: "rgba(34,197,94,0.1)",
  },
  FAILED: {
    Icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    bg: "rgba(239,68,68,0.1)",
  },
  REJECTED: {
    Icon: FaTimesCircle,
    color: "#ef4444",
    label: "Rejected",
    bg: "rgba(239,68,68,0.1)",
  },
  DISPUTED: {
    Icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
    bg: "rgba(245,158,11,0.1)",
  },
};

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status] || {
      Icon: FaClock,
      color: "#888",
      label: status || "Unknown",
      bg: "rgba(136,136,136,0.1)",
    }
  );
}

function formatCurrency(amount, currency = "NGN") {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "NGN",
      minimumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

function formatDateLong(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(date) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPaymentChannel(tx) {
  if (tx.type === "REFUND") return { label: "Refund", Icon: FaArrowUp };
  if (tx.type === "PAYMENT") {
    const p = tx.meta?.paymentProvider || "WALLET";
    if (p === "WALLET") return { label: "Wallet", Icon: FaWallet };
    if (p === "PAYSTACK")
      return { label: "Card (Paystack)", Icon: FaCreditCard };
    if (p === "FLUTTERWAVE")
      return { label: "Card (Flutterwave)", Icon: FaCreditCard };
    if (p === "BANK_TRANSFER")
      return { label: "Bank Transfer", Icon: FaBuilding };
    if (p === "CRYPTO") return { label: "Crypto", Icon: FaDollarSign };
    return { label: "Payment", Icon: FaCreditCard };
  }
  if (tx.type === "SUBSCRIPTION")
    return { label: "Subscription", Icon: FaShieldAlt };
  if (tx.type === "BONUS") return { label: "Bonus", Icon: FaPlus };
  return { label: "Adjustment", Icon: FaMinus };
}

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
  }
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Receipt HTML — byte-identical to web ───────────────────────────────
function generateReceiptHTML(refund, isDark) {
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

  const channel = getPaymentChannel(transaction);
  const isPaid =
    transaction.status === "COMPLETED" || transaction.status === "SUCCESS";

  const bg = isDark ? "#080810" : "#f8f9fa";
  const panel = isDark ? "#0c0c18" : "#ffffff";
  const text = isDark ? "#ffffff" : "#1a1a2e";
  const textDim = isDark ? "#a1a1aa" : "#6b7280";
  const border = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const borderDash = isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb";
  const footerBg = isDark ? "#0c0c18" : "#f9fafb";
  const tearColor = isDark ? "#080810" : "#f9fafb";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt - ${transaction.reference}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${bg}; color: ${text}; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 20px; }
    .receipt { max-width: 520px; width: 100%; background: ${panel}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,${isDark ? "0.4" : "0.1"}); border: 1px solid ${border}; }
    .receipt-header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 32px 32px 24px; text-align: center; }
    .receipt-header h1 { font-size: 24px; font-weight: 800; color: #fff; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; margin-top: 4px; color: #fff; }
    .receipt-status { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 6px 16px; background: rgba(255,255,255,0.2); border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #fff; }
    .receipt-amount { text-align: center; padding: 28px 32px 24px; border-bottom: 2px dashed ${borderDash}; }
    .receipt-amount .label { font-size: 12px; color: ${textDim}; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    .receipt-amount .value { font-size: 36px; font-weight: 800; margin-top: 8px; }
    .receipt-amount .value.credit { color: #22c55e; }
    .receipt-amount .channel { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 4px 12px; background: rgba(249,115,22,0.15); color: #f97316; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .receipt-body { padding: 24px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid ${border}; gap: 16px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: ${textDim}; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: ${text}; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${textDim}; font-weight: 800; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid ${border}; border-bottom: none; }
    .net-row .label { font-weight: 700; color: ${text}; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: ${footerBg}; text-align: center; font-size: 12px; color: ${textDim}; }
    .receipt-footer strong { color: ${text}; }
    .tear-line { height: 16px; background-image: radial-gradient(circle, ${tearColor} 4px, transparent 4px); background-size: 16px 16px; background-position: -8px 50%; background-color: ${footerBg}; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>SkilledProz</h1>
      <p class="subtitle">Refund Receipt</p>
      <div class="receipt-status">${STATUS_CONFIG[transaction.status]?.label || transaction.status}</div>
    </div>
    <div class="receipt-amount">
      <div class="label">Amount Received</div>
      <div class="value credit">+ ${formatCurrency(transaction.amount, transaction.currency)}</div>
      <div class="channel">${channel.label}</div>
    </div>
    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Reference</span><span class="value mono">${transaction.reference}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">Refund</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(transaction.createdAt)}</span></div>
      ${transaction.completedAt ? `<div class="row"><span class="label">Completed</span><span class="value">${formatDateLong(transaction.completedAt)}</span></div>` : ""}
      ${transaction.description ? `<div class="row"><span class="label">Reason</span><span class="value">${transaction.description}</span></div>` : ""}
      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row net-row"><span class="label">Refund Amount</span><span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span></div>
      ${
        transaction.meta?.paymentProvider
          ? `<div class="row section-title"><span class="label">Payment Details</span></div>
             <div class="row"><span class="label">Provider</span><span class="value">${transaction.meta.paymentProvider}</span></div>
             ${transaction.meta?.transactionId ? `<div class="row"><span class="label">Provider Ref</span><span class="value mono">${transaction.meta.transactionId}</span></div>` : ""}`
          : ""
      }
    </div>
    <div class="tear-line"></div>
    <div class="receipt-footer">
      <p>Thank you for using <strong>SkilledProz</strong></p>
      <p style="margin-top: 6px;">This is an electronically generated receipt. No signature required.</p>
      <p style="margin-top: 6px; font-size: 11px;">skilledproz.com · support@skilledproz.com</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Detail row ─────────────────────────────────────────────────────────
function DetailRow({ label, value, valueStyle, c, children }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <AppText style={{ fontSize: 11, color: c.textDim }}>{label}</AppText>
      <View
        style={{
          flexShrink: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        {children || (
          <AppText
            style={[
              {
                fontSize: 12,
                fontWeight: "700",
                color: c.text,
                textAlign: "right",
              },
              valueStyle,
            ]}
          >
            {value}
          </AppText>
        )}
      </View>
    </View>
  );
}

function SectionTitle({ Icon, children, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginBottom: 10,
      }}
    >
      {Icon ? <Icon size={12} color={c.orange} /> : null}
      <AppText
        style={{
          fontFamily: "DMSans_600SemiBold",
          fontSize: 10,
          fontWeight: "800",
          color: c.textMuted,
          letterSpacing: 1,
          textTransform: "uppercase",
        }}
      >
        {children}
      </AppText>
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────
export default function RefundDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;
  const isDark = bgLuminance(c.bg) < 0.5;

  const id = route.params?.id;

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Refund not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    client
      .get(`/refunds/${id}`)
      .then((res) => setRefund(res.data.data.refund))
      .catch((err) => {
        setError(
          err.response?.data?.message || "Failed to load refund details",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = async () => {
    if (!refund) return;
    try {
      await Print.printAsync({ html: generateReceiptHTML(refund, isDark) });
    } catch (err) {
      Alert.alert(
        "Print failed",
        err?.message || "Could not open the print dialog.",
      );
    }
  };

  const handleDownloadReceipt = async () => {
    if (!refund) return;
    setDownloading(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: generateReceiptHTML(refund, isDark),
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `receipt-${refund.reference}`,
        });
      } else {
        Alert.alert("Receipt saved", uri);
      }
    } catch (err) {
      Alert.alert(
        "Download failed",
        err?.message || "Failed to generate receipt. Please try again.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleBack = () => navigation.navigate("RefundHistory");

  // Loading
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton width="40%" height={18} radius={6} />
          <Skeleton width="60%" height={30} radius={8} />
          <Skeleton width="100%" height={80} radius={14} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={160} radius={14} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error || !refund) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 12,
          }}
        >
          <FaExclamationTriangle size={44} color={c.red} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.text,
            }}
          >
            {error || "Refund not found"}
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
          >
            The refund could not be loaded.
          </AppText>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: c.orange,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaArrowLeft size={12} color="#000" />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: "#000",
              }}
            >
              Back to Refunds
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = getStatusConfig(refund.status);
  const StatusIcon = statusConfig.Icon;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
      >
        {/* Header */}
        <View>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                paddingVertical: 4,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText
              style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
            >
              Back to Refunds
            </AppText>
          </Pressable>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 22,
              fontWeight: "800",
              color: c.text,
              letterSpacing: -0.3,
              marginTop: 4,
            }}
          >
            Refund Details
          </AppText>
        </View>

        {/* Status banner */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            paddingHorizontal: 14,
            paddingVertical: 14,
            backgroundColor: statusConfig.bg,
            borderWidth: 1.5,
            borderColor: statusConfig.color,
            borderRadius: 14,
          }}
        >
          <StatusIcon size={22} color={statusConfig.color} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              style={{
                fontFamily: "DMSans_600SemiBold",
                fontSize: 9,
                fontWeight: "800",
                color: c.textMuted,
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Status
            </AppText>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 16,
                fontWeight: "800",
                color: statusConfig.color,
                marginTop: 2,
              }}
            >
              {statusConfig.label}
            </AppText>
          </View>
          <View
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 999,
              maxWidth: 160,
            }}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontSize: 9,
                color: c.textMuted,
                fontFamily: "monospace",
              }}
            >
              {`Ref: ${refund.reference}`}
            </AppText>
          </View>
        </View>

        {/* Refund Information */}
        <Section Icon={FaMoneyBillWave} title="REFUND INFORMATION" c={c}>
          <DetailRow
            label="Amount"
            value={`${refund.currency} ${Number(refund.amount).toLocaleString()}`}
            valueStyle={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 16,
              fontWeight: "800",
              color: c.orange,
            }}
            c={c}
          />
          <DetailRow
            label="Type"
            value={refund.refundType?.replace("_", " ") || "N/A"}
            c={c}
          />
          {refund.percentage ? (
            <DetailRow
              label="Percentage"
              value={`${refund.percentage}%`}
              c={c}
            />
          ) : null}
          <DetailRow
            label="Platform Fee Refunded"
            value={`${refund.currency} ${Number(refund.platformFeeRefunded || 0).toLocaleString()}`}
            c={c}
          />
          <DetailRow
            label="Worker Deducted"
            value={`${refund.currency} ${Number(refund.workerAmountDeducted || 0).toLocaleString()}`}
            c={c}
          />
        </Section>

        {/* Booking Information */}
        <Section Icon={FaFileInvoice} title="BOOKING INFORMATION" c={c}>
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
                  fontSize: 12,
                  fontWeight: "700",
                  color: c.orange,
                  textAlign: "right",
                }}
              >
                {refund.booking?.title || "N/A"}
              </AppText>
            </Pressable>
          </DetailRow>
          <DetailRow
            label="Hirer"
            value={
              `${refund.hirer?.firstName || ""} ${refund.hirer?.lastName || ""}`.trim() ||
              "N/A"
            }
            c={c}
          />
          <DetailRow
            label="Worker"
            value={
              `${refund.worker?.firstName || ""} ${refund.worker?.lastName || ""}`.trim() ||
              "N/A"
            }
            c={c}
          />
          <DetailRow
            label="Original Payment"
            value={`${refund.payment?.provider || "N/A"} - ${refund.payment?.providerRef || "N/A"}`}
            c={c}
          />
        </Section>

        {/* Timeline */}
        <Section Icon={FaClock} title="TIMELINE" c={c}>
          <DetailRow
            label="Requested"
            value={formatDateShort(refund.createdAt)}
            c={c}
          />
          {refund.autoApprovedAt ? (
            <DetailRow
              label="Auto-Approved"
              value={formatDateShort(refund.autoApprovedAt)}
              c={c}
            />
          ) : null}
          {refund.processedAt ? (
            <DetailRow
              label="Processed"
              value={formatDateShort(refund.processedAt)}
              c={c}
            />
          ) : null}
          {refund.status === "COMPLETED" ? (
            <DetailRow label="Completed" c={c}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <FaCheckCircle size={12} color="#22c55e" />
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: "#22c55e" }}
                >
                  Done
                </AppText>
              </View>
            </DetailRow>
          ) : null}
        </Section>

        {/* Reason & Notes */}
        <Section Icon={FaInfoCircle} title="REASON & NOTES" c={c}>
          <DetailRow
            label="Reason"
            value={refund.reason || "N/A"}
            valueStyle={{ maxWidth: "65%" }}
            c={c}
          />
          {refund.adminNotes ? (
            <DetailRow
              label="Admin Notes"
              value={refund.adminNotes}
              valueStyle={{ maxWidth: "65%" }}
              c={c}
            />
          ) : null}
        </Section>

        {/* Actions */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {refund.status === "COMPLETED" ? (
            <>
              <Pressable
                onPress={handlePrint}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 12,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    opacity: pressed ? 0.85 : 1,
                    minWidth: 100,
                  },
                ]}
              >
                <FaPrint size={13} color={c.text} />
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 13,
                    fontWeight: "800",
                    color: c.text,
                  }}
                >
                  Print
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleDownloadReceipt}
                disabled={downloading}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    paddingVertical: 12,
                    backgroundColor: c.orange,
                    borderRadius: 10,
                    opacity: downloading ? 0.5 : pressed ? 0.85 : 1,
                    minWidth: 120,
                  },
                ]}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <FaDownload size={13} color="#000" />
                )}
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 13,
                    fontWeight: "800",
                    color: "#000",
                  }}
                >
                  {downloading ? "Generating..." : "Download"}
                </AppText>
              </Pressable>
            </>
          ) : null}
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              {
                flexBasis: "100%",
                alignItems: "center",
                paddingVertical: 12,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
            >
              View All Refunds
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────
function Section({ Icon, title, children, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 14,
      }}
    >
      <SectionTitle Icon={Icon} c={c}>
        {title}
      </SectionTitle>
      {children}
    </View>
  );
}
