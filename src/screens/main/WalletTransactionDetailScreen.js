// src/screens/main/WalletTransactionDetailScreen.js
//
// Port of pages/hirer/WalletTransactionDetail.jsx + HirerWallet.module.css.
//
// Preserved verbatim:
//   - STATUS_CONFIG (8 statuses, exact colors/labels/backgrounds)
//   - fetch: GET /wallet/transactions?limit=100, find by id
//   - status banner, two detail sections, conditional Payment Details
//     & Description blocks
//   - generateReceiptHTML (byte-identical to web, minus DOM-only calls)
//   - Print / Download / Share actions
//   - error state with auto-back to wallet
//
// RN adaptations:
//   - <Link to> → navigation.navigate("Wallet", ...)
//   - navigator.clipboard → expo-clipboard
//   - handlePrint (window.open) → expo-print Print.printAsync({ html })
//   - handleDownloadReceipt (Blob URL) → expo-print Print.printToFileAsync
//     → expo-sharing shareAsync(file.uri)
//   - handleShare (navigator.share) → expo-sharing shareAsync
//   - useParams/useNavigate → route.params / useNavigation

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaArrowUp,
  FaArrowDown,
  FaCreditCard,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaPlus,
  FaMinus,
  FaCopy,
  FaCheck,
  FaDownload,
  FaShareAlt,
  FaFileInvoice,
  FaPrint,
  FaBuilding,
  FaWallet,
  FaDollarSign,
  FaShieldAlt,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaUser,
  FaCalendarAlt,
  FaInfoCircle,
  FaEnvelope,
} from "../../icons/fa";

// ── Status config (verbatim) ────────────────────────────────────────────
const STATUS_CONFIG = {
  PENDING: {
    Icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    bg: "rgba(251,191,36,0.1)",
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
  SUCCESS: {
    Icon: FaCheckCircle,
    color: "#22c55e",
    label: "Success",
    bg: "rgba(34,197,94,0.1)",
  },
  FAILED: {
    Icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    bg: "rgba(239,68,68,0.1)",
  },
  REVERSED: {
    Icon: FaTimesCircle,
    color: "#ef4444",
    label: "Reversed",
    bg: "rgba(239,68,68,0.1)",
  },
  CANCELLED: {
    Icon: FaTimesCircle,
    color: "#ef4444",
    label: "Cancelled",
    bg: "rgba(239,68,68,0.1)",
  },
  INITIATED: {
    Icon: FaClock,
    color: "#fbbf24",
    label: "Initiated",
    bg: "rgba(251,191,36,0.1)",
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

// ── Formatters ──────────────────────────────────────────────────────────
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
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTransactionLabel(type) {
  const labels = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    PAYMENT: "Payment",
    SUBSCRIPTION: "Subscription",
    REFUND: "Refund",
    BONUS: "Bonus",
    ADJUSTMENT: "Adjustment",
  };
  return labels[type] || type;
}

function getPaymentChannel(tx) {
  if (tx.type === "DEPOSIT") {
    const p = tx.meta?.paymentProvider;
    if (p === "FLUTTERWAVE" || p === "PAYSTACK")
      return { label: "Card / Mobile Money", Icon: FaCreditCard };
    return { label: "Card / Bank", Icon: FaCreditCard };
  }
  if (tx.type === "WITHDRAWAL")
    return { label: "Bank Transfer", Icon: FaBuilding };
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
  if (tx.type === "REFUND") return { label: "Refund", Icon: FaArrowUp };
  if (tx.type === "BONUS") return { label: "Bonus", Icon: FaPlus };
  return { label: "Adjustment", Icon: FaMinus };
}

// ── Receipt HTML (verbatim from web) ────────────────────────────────────
function generateReceiptHTML(transaction, isDark) {
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountPrefix = isCredit ? "+" : "-";
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
    .tear-line { height: 16px; background-image: radial-gradient(circle, ${tearColor} 4px, transparent 4px); background-size: 16px 16px; background-position: -8px 50%; background-color: ${footerBg}; }
    @media print {
      @page { size: auto; margin: 0; }
      body { background: #fff; color: #000; display: block; padding: 0; }
      .receipt { max-width: 100%; box-shadow: none; border-radius: 0; border: none; page-break-inside: avoid; margin: 0 auto; }
      .receipt { background: #fff !important; }
      .receipt-body { background: #fff !important; padding: 16px 32px; }
      .receipt-footer { background: #fff !important; border-top: 1px solid #eee; }
      .row .value, .net-row .label { color: #000 !important; }
      .row .label, .receipt-amount .label, .receipt-footer { color: #555 !important; }
      .tear-line { display: none; }
      .row { padding: 8px 0; border-bottom: 1px solid #eee; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-header">
      <h1>SkilledProz</h1>
      <p class="subtitle">Transaction Receipt</p>
      <div class="receipt-status">${STATUS_CONFIG[transaction.status]?.label || transaction.status}</div>
    </div>
    <div class="receipt-amount">
      <div class="label">${isCredit ? "Amount Received" : "Amount Charged"}</div>
      <div class="value ${isCredit ? "credit" : "debit"}">${amountPrefix} ${formatCurrency(transaction.amount, transaction.currency)}</div>
      <div class="channel">${channel.label}</div>
    </div>
    <div class="receipt-body">
      <div class="row section-title"><span class="label">Transaction</span></div>
      <div class="row"><span class="label">Reference</span><span class="value mono">${transaction.reference}</span></div>
      <div class="row"><span class="label">Type</span><span class="value">${getTransactionLabel(transaction.type)}</span></div>
      <div class="row"><span class="label">Date</span><span class="value">${formatDateLong(transaction.createdAt)}</span></div>
      ${transaction.completedAt ? `<div class="row"><span class="label">Completed</span><span class="value">${formatDateLong(transaction.completedAt)}</span></div>` : ""}
      ${transaction.description ? `<div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>` : ""}
      <div class="row section-title"><span class="label">Breakdown</span></div>
      <div class="row"><span class="label">Gross Amount</span><span class="value">${formatCurrency(transaction.amount, transaction.currency)}</span></div>
      <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">- ${formatCurrency(transaction.fee || 0, transaction.currency)}</span></div>
      <div class="row net-row"><span class="label">Net Amount</span><span class="value">${formatCurrency(transaction.netAmount || transaction.amount, transaction.currency)}</span></div>
      ${
        transaction.balanceBefore != null || transaction.balanceAfter != null
          ? `<div class="row section-title"><span class="label">Wallet Impact</span></div>
             <div class="row"><span class="label">Balance Before</span><span class="value">${formatCurrency(transaction.balanceBefore || 0, transaction.currency)}</span></div>
             <div class="row"><span class="label">Balance After</span><span class="value">${formatCurrency(transaction.balanceAfter || 0, transaction.currency)}</span></div>`
          : ""
      }
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

// ── Small helpers ──────────────────────────────────────────────────────
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

// ── CopyButton ─────────────────────────────────────────────────────────
function CopyButton({ text, label = "Copy", c }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(String(text ?? ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <Pressable
      onPress={handleCopy}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          paddingHorizontal: 8,
          paddingVertical: 3,
          backgroundColor: c.bgCard,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 6,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {copied ? (
        <FaCheck size={10} color={c.green} />
      ) : (
        <FaCopy size={10} color={c.textDim} />
      )}
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "600",
          color: copied ? c.green : c.textDim,
        }}
      >
        {copied ? "Copied!" : label}
      </AppText>
    </Pressable>
  );
}

const labelStyle = (c) => ({
  fontFamily: "DMSans_600SemiBold",
  fontSize: 10,
  fontWeight: "700",
  color: c.textMuted,
  letterSpacing: 0.7,
  textTransform: "uppercase",
});

// ── Detail row ─────────────────────────────────────────────────────────
function DetailRow({ label, value, copy, valueStyle, c }) {
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
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 1,
          flexWrap: "wrap",
          justifyContent: "flex-end",
        }}
      >
        <AppText
          numberOfLines={2}
          style={[
            {
              fontSize: 12,
              fontWeight: "600",
              color: c.text,
              textAlign: "right",
            },
            valueStyle,
          ]}
        >
          {value}
        </AppText>
        {copy && String(value) !== "—" ? (
          <CopyButton text={String(value)} c={c} />
        ) : null}
      </View>
    </View>
  );
}

// ── Section title ─────────────────────────────────────────────────────
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
      <AppText style={labelStyle(c)}>{children}</AppText>
    </View>
  );
}

// ── MAIN SCREEN ────────────────────────────────────────────────────────
export default function WalletTransactionDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;
  const isDark = bgLuminance(c.bg) < 0.5;

  const id = route.params?.id;

  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Transaction not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    client
      .get("/wallet/transactions", { params: { limit: 100 } })
      .then((res) => {
        const list = res.data.data?.transactions || [];
        const match = list.find((t) => t.id === id);
        if (!match) setError("Transaction not found.");
        else setTransaction(match);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Failed to load transaction details.",
        );
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleBackToWallet = useCallback(() => {
    navigation.navigate("Wallet");
  }, [navigation]);

  const handlePrint = async () => {
    if (!transaction) return;
    try {
      await Print.printAsync({
        html: generateReceiptHTML(transaction, isDark),
      });
    } catch (err) {
      Alert.alert(
        "Print failed",
        err?.message || "Could not open the print dialog.",
      );
    }
  };

  const handleDownloadReceipt = async () => {
    if (!transaction) return;
    setDownloading(true);
    try {
      const { uri } = await Print.printToFileAsync({
        html: generateReceiptHTML(transaction, isDark),
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `receipt-${transaction.reference}`,
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

  const handleShare = async () => {
    if (!transaction) return;
    const channel = getPaymentChannel(transaction);
    const text =
      `Transaction ${transaction.reference}\n` +
      `Type: ${getTransactionLabel(transaction.type)}\n` +
      `Channel: ${channel.label}\n` +
      `Amount: ${formatCurrency(transaction.amount, transaction.currency)}\n` +
      `Status: ${STATUS_CONFIG[transaction.status]?.label || transaction.status}\n` +
      `Date: ${formatDateLong(transaction.createdAt)}`;
    try {
      await Share.share({ message: text, title: "Transaction Details" });
    } catch (err) {
      if (err?.message !== "User did not share") {
        await Clipboard.setStringAsync(text);
        Alert.alert("Copied", "Transaction details copied to clipboard!");
      }
    }
  };

  // ── Loading ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton width="40%" height={20} radius={6} />
          <Skeleton width="60%" height={32} radius={8} />
          <Skeleton width="100%" height={80} radius={14} />
          <Skeleton width="100%" height={220} radius={14} />
          <Skeleton width="100%" height={180} radius={14} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────
  if (error || !transaction) {
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
            {error || "Transaction not found"}
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
          >
            The transaction could not be loaded.
          </AppText>
          <Pressable
            onPress={handleBackToWallet}
            style={({ pressed }) => [
              {
                marginTop: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: c.orange,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: "#000",
              }}
            >
              Back to Wallet
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Derived ────────────────────────────────────────────────────────
  const isCredit =
    transaction.type === "DEPOSIT" ||
    transaction.type === "REFUND" ||
    transaction.type === "BONUS";
  const amountPrefix = isCredit ? "+" : "-";
  const channel = getPaymentChannel(transaction);
  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.Icon;
  const hasPaymentDetails =
    transaction.meta?.paymentProvider ||
    transaction.meta?.transactionId ||
    transaction.meta?.bankName ||
    transaction.meta?.accountNumber ||
    transaction.meta?.accountName;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 16 }}
      >
        {/* Header */}
        <View>
          <Pressable
            onPress={handleBackToWallet}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                paddingVertical: 6,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText
              style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
            >
              Back to Wallet
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
            Transaction Details
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
            <AppText style={labelStyle(c)}>STATUS</AppText>
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
              {`Ref: ${transaction.reference}`}
            </AppText>
          </View>
        </View>

        {/* Detail sections */}
        <View style={{ gap: 12 }}>
          {/* Transaction Information */}
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <SectionTitle Icon={FaMoneyBillWave} c={c}>
              TRANSACTION INFORMATION
            </SectionTitle>
            <DetailRow
              label="Amount"
              value={`${amountPrefix} ${formatCurrency(transaction.amount, transaction.currency)}`}
              valueStyle={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 15,
                fontWeight: "800",
                color: isCredit ? c.green : c.orange,
              }}
              c={c}
            />
            <DetailRow
              label="Type"
              value={getTransactionLabel(transaction.type)}
              c={c}
            />
            <DetailRow label="Channel" value={channel.label} c={c} />
            <DetailRow
              label="Fee"
              value={formatCurrency(transaction.fee || 0, transaction.currency)}
              c={c}
            />
            <DetailRow
              label="Net Amount"
              value={`${amountPrefix} ${formatCurrency(
                transaction.netAmount || transaction.amount,
                transaction.currency,
              )}`}
              c={c}
            />
          </View>

          {/* Reference & Dates */}
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 14,
            }}
          >
            <SectionTitle Icon={FaCalendarAlt} c={c}>
              REFERENCE & DATES
            </SectionTitle>
            <DetailRow
              label="Reference"
              value={transaction.reference}
              copy
              c={c}
            />
            <DetailRow
              label="Date"
              value={formatDateShort(transaction.createdAt)}
              c={c}
            />
            {transaction.completedAt ? (
              <DetailRow
                label="Completed"
                value={formatDateShort(transaction.completedAt)}
                c={c}
              />
            ) : null}
            {transaction.balanceBefore != null ? (
              <DetailRow
                label="Balance Before"
                value={formatCurrency(
                  transaction.balanceBefore,
                  transaction.currency,
                )}
                c={c}
              />
            ) : null}
            {transaction.balanceAfter != null ? (
              <DetailRow
                label="Balance After"
                value={formatCurrency(
                  transaction.balanceAfter,
                  transaction.currency,
                )}
                c={c}
              />
            ) : null}
          </View>

          {/* Payment Details */}
          {hasPaymentDetails ? (
            <View
              style={{
                backgroundColor: c.bgPanel,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <SectionTitle Icon={FaUser} c={c}>
                PAYMENT DETAILS
              </SectionTitle>
              {transaction.meta?.paymentProvider ? (
                <DetailRow
                  label="Provider"
                  value={transaction.meta.paymentProvider}
                  c={c}
                />
              ) : null}
              {transaction.meta?.transactionId ? (
                <DetailRow
                  label="Provider Reference"
                  value={String(transaction.meta.transactionId)}
                  copy
                  c={c}
                />
              ) : null}
              {transaction.meta?.bankName ? (
                <DetailRow
                  label="Bank"
                  value={transaction.meta.bankName}
                  c={c}
                />
              ) : null}
              {transaction.meta?.accountNumber ? (
                <DetailRow
                  label="Account Number"
                  value={transaction.meta.accountNumber}
                  c={c}
                />
              ) : null}
              {transaction.meta?.accountName ? (
                <DetailRow
                  label="Account Name"
                  value={transaction.meta.accountName}
                  c={c}
                />
              ) : null}
            </View>
          ) : null}

          {/* Description */}
          {transaction.description ? (
            <View
              style={{
                backgroundColor: c.bgPanel,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                padding: 14,
              }}
            >
              <SectionTitle Icon={FaInfoCircle} c={c}>
                DESCRIPTION
              </SectionTitle>
              <AppText style={{ fontSize: 12, color: c.text, lineHeight: 18 }}>
                {transaction.description}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
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
                backgroundColor: c.orange,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
                minWidth: 100,
              },
            ]}
          >
            <FaPrint size={13} color="#000" />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: "#000",
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
          <Pressable
            onPress={handleShare}
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
            <FaShareAlt size={13} color={c.text} />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: c.text,
              }}
            >
              Share
            </AppText>
          </Pressable>
        </View>

        <Pressable
          onPress={handleBackToWallet}
          style={({ pressed }) => [
            {
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
            View All Transactions
          </AppText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
