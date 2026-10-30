// src/screens/main/BookingDetailScreen.js
//
// Verbatim port of pages/booking/BookingDetail/index.jsx.
// Fixes:
//  1. Invoice download (with Android "activity no longer available" retry)
//  2. Payment routing (navigates to InitiatePayment for card, ReleaseEscrow for release)
//  3. Uses the fully-ported BookingDetailMain

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import { calcPricing } from "../../utils/pricing";
import BookingDetailMain from "../../components/booking/BookingDetailMain";
import BookingDetailPayment from "../../components/booking/BookingDetailPayment";
import BookingDetailSidebar from "../../components/booking/BookingDetailSidebar";
import WorkerPaymentPreview from "../../components/booking/WorkerPaymentPreview";
import RaiseDisputeSheet from "../../components/booking/RaiseDisputeSheet";
import { FaArrowLeft, FaExclamationCircle, FaTimes } from "../../icons/fa";

// ═══════════════════════════════════════════════════════════════════════
// Inline stubs — RefundRequest / RefundStatus
// ═══════════════════════════════════════════════════════════════════════

function RefundRequestInline({
  booking,
  payment,
  isProcessing,
  isHirer,
  onRequestRefund,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  if (!isHirer) {
    return (
      <AppText style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}>
        Only the hirer can request a refund.
      </AppText>
    );
  }

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Please describe the reason for the refund request.");
      return;
    }
    const amount = Number(payment?.amount) || Number(booking?.agreedRate) || 0;
    onRequestRefund({
      bookingId: booking.id,
      reason: reason.trim(),
      amount,
      currency: booking.currency || "NGN",
    });
  };

  return (
    <View style={{ gap: 12 }}>
      <AppText style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}>
        Request a refund for this booking. Our team will review it within 24-48
        hours.
      </AppText>

      <View>
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            marginBottom: 6,
          }}
        >
          Reason for refund <AppText style={{ color: c.red }}>*</AppText>
        </AppText>
        <View
          style={{
            borderWidth: 1,
            borderColor: error ? c.red : c.border,
            borderRadius: 8,
            backgroundColor: c.bgCard,
            overflow: "hidden",
          }}
        >
          <TextInput
            value={reason}
            onChangeText={(t) => {
              setReason(t);
              setError("");
            }}
            placeholder="Explain why you're requesting a refund…"
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{
              minHeight: 96,
              padding: 12,
              fontSize: 13,
              color: c.text,
              lineHeight: 18,
            }}
          />
        </View>
        {error ? (
          <AppText style={{ fontSize: 12, color: c.red, marginTop: 4 }}>
            {error}
          </AppText>
        ) : null}
      </View>

      <Pressable
        onPress={handleSubmit}
        disabled={isProcessing}
        style={({ pressed }) => [
          {
            paddingVertical: 12,
            backgroundColor: c.red,
            borderRadius: 10,
            alignItems: "center",
            opacity: isProcessing ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
            Submit Refund Request
          </AppText>
        )}
      </Pressable>
    </View>
  );
}

function RefundStatusInline({ refund, isHirer, onViewDetails }) {
  const { theme } = useTheme();
  const c = theme.colors;
  if (!refund) return null;

  const statusColors = {
    PENDING: { bg: "rgba(251,191,36,0.1)", fg: "#fbbf24" },
    APPROVED: { bg: c.greenDim, fg: c.green },
    PROCESSING: { bg: "rgba(129,140,248,0.12)", fg: "#818cf8" },
    COMPLETED: { bg: c.greenDim, fg: c.green },
    REJECTED: { bg: c.redDim, fg: c.red },
    DISPUTED: { bg: "rgba(245,158,11,0.1)", fg: "#f59e0b" },
  };
  const sc = statusColors[refund.status] || { bg: c.bgCard, fg: c.textDim };

  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <AppText style={{ fontSize: 12, fontWeight: "700", color: c.text }}>
          Refund Request
        </AppText>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            backgroundColor: sc.bg,
            borderRadius: 10,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: sc.fg,
              textTransform: "uppercase",
              letterSpacing: 0.4,
            }}
          >
            {refund.status}
          </AppText>
        </View>
      </View>
      <AppText style={{ fontSize: 12, color: c.textDim }}>
        Amount: {refund.currency || "NGN"}{" "}
        {Number(refund.amount || 0).toLocaleString()}
      </AppText>
      {refund.reason ? (
        <AppText
          style={{ fontSize: 12, color: c.textDim, fontStyle: "italic" }}
          numberOfLines={3}
        >
          "{refund.reason}"
        </AppText>
      ) : null}
      {onViewDetails ? (
        <Pressable
          onPress={onViewDetails}
          style={({ pressed }) => [
            {
              alignSelf: "flex-start",
              paddingHorizontal: 12,
              paddingVertical: 6,
              backgroundColor: c.orangeDim,
              borderWidth: 1,
              borderColor: c.orange,
              borderRadius: 8,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText style={{ fontSize: 12, fontWeight: "600", color: c.orange }}>
            View Details →
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Receipt Generator — ported from web's index.jsx
// ═══════════════════════════════════════════════════════════════════════
function generateReceiptHTML(transaction) {
  const amountPrefix = "-";
  const channelLabel = transaction.meta?.paymentProvider || "Card / Bank";

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, sans-serif; background: #f8f9fa; color: #1a1a2e; display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; }
    .receipt { max-width: 520px; width: 100%; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
    .receipt-header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: #ffffff; padding: 32px 32px 24px; text-align: center; }
    .receipt-header h1 { font-size: 24px; font-weight: 800; color: #fff; }
    .receipt-header .subtitle { font-size: 13px; opacity: 0.9; color: #fff; margin-top: 4px; }
    .receipt-status { display: inline-flex; align-items: center; gap: 6px; margin-top: 16px; padding: 6px 16px; background: rgba(255,255,255,0.2); border-radius: 999px; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #fff; }
    .receipt-amount { text-align: center; padding: 28px 32px 24px; border-bottom: 2px dashed #e5e7eb; }
    .receipt-amount .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; }
    .receipt-amount .value { font-size: 36px; font-weight: 800; margin-top: 8px; letter-spacing: -0.02em; color: #ef4444; }
    .receipt-amount .channel { display: inline-flex; align-items: center; gap: 6px; margin-top: 12px; padding: 4px 12px; background: rgba(249, 115, 22, 0.15); color: #f97316; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .receipt-body { padding: 24px 32px; }
    .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; gap: 16px; }
    .row:last-child { border-bottom: none; }
    .row .label { color: #6b7280; font-size: 13px; font-weight: 500; flex-shrink: 0; }
    .row .value { color: #1a1a2e; font-size: 13px; font-weight: 600; text-align: right; word-break: break-word; }
    .row .value.mono { font-family: 'SF Mono', Menlo, monospace; font-size: 12px; }
    .row.section-title { padding-top: 18px; padding-bottom: 6px; border-bottom: none; }
    .row.section-title .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 800; }
    .fee-row { color: #f97316; }
    .net-row { margin-top: 8px; padding-top: 16px; border-top: 2px solid #e5e7eb; border-bottom: none; }
    .net-row .label { font-weight: 700; color: #1a1a2e; }
    .net-row .value { font-size: 16px; font-weight: 800; color: #22c55e; }
    .receipt-footer { padding: 24px 32px; background: #f9fafb; text-align: center; font-size: 12px; color: #6b7280; }
    .receipt-footer strong { color: #1a1a2e; }
    .receipt-footer p { margin-top: 6px; }
  </style></head><body>
    <div class="receipt">
      <div class="receipt-header"><h1>SkilledProz</h1><p class="subtitle">Transaction Receipt</p><div class="receipt-status">${transaction.status}</div></div>
      <div class="receipt-amount"><div class="label">Amount Charged</div><div class="value">${amountPrefix} ${formatPrice(transaction.amount, transaction.currency)}</div><div class="channel">${channelLabel}</div></div>
      <div class="receipt-body">
        <div class="row section-title"><span class="label">Transaction</span></div>
        <div class="row"><span class="label">Reference</span><span class="value mono">${transaction.reference}</span></div>
        <div class="row"><span class="label">Date</span><span class="value">${new Date(transaction.createdAt).toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span></div>
        <div class="row"><span class="label">Description</span><span class="value">${transaction.description}</span></div>
        <div class="row section-title"><span class="label">Booking Details</span></div>
        <div class="row"><span class="label">Booking ID</span><span class="value mono">${transaction.bookingId}</span></div>
        <div class="row"><span class="label">Service</span><span class="value">${transaction.bookingTitle}</span></div>
        <div class="row"><span class="label">Worker</span><span class="value">${transaction.workerName}</span></div>
        <div class="row"><span class="label">Hirer</span><span class="value">${transaction.hirerName}</span></div>
        <div class="row section-title"><span class="label">Breakdown</span></div>
        <div class="row"><span class="label">Gross Amount</span><span class="value">${formatPrice(transaction.amount, transaction.currency)}</span></div>
        <div class="row fee-row"><span class="label">Platform Fee</span><span class="value">- ${formatPrice(transaction.fee, transaction.currency)}</span></div>
        <div class="row net-row"><span class="label">Net Amount</span><span class="value">${formatPrice(transaction.netAmount, transaction.currency)}</span></div>
      </div>
      <div class="receipt-footer"><p>Thank you for using <strong>SkilledProz</strong></p><p>skilledproz.com · support@skilledproz.com</p></div>
    </div>
  </body></html>`;
}

function formatPrice(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDuration(booking) {
  if (!booking) return null;
  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue;
  const hours = booking.estimatedHours;
  if (!value && !hours) return null;

  if (value) {
    if (unit === "custom") return { main: value, sub: null };
    const labels = {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
      years: "year",
    };
    const num = parseFloat(value);
    const label = (labels[unit] || unit) + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }
  return hours ? { main: `${hours} hours`, sub: null } : null;
}

const STATUS_STEP = {
  PENDING: 0,
  ACCEPTED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  PAID: 3,
  CANCELLED: -1,
  DISPUTED: -1,
};

// ═══════════════════════════════════════════════════════════════════════
// Screen
// ═══════════════════════════════════════════════════════════════════════

export default function BookingDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const bookingId = route.params?.bookingId;
  const userId = user?.id;

  // Data
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  // Refund / dispute
  const [refunds, setRefunds] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  // SOS
  const [resolvingSOS, setResolvingSOS] = useState(false);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(null);

  // Review
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);

  // Wallet + referral
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);

  // Cancel
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");

  // Pay options toggle
  const [showPayOptions, setShowPayOptions] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────
  const fetchAll = useCallback(
    async (silent = false) => {
      if (!bookingId) return;
      if (!silent) setLoading(true);
      try {
        const bRes = await client.get(`/bookings/${bookingId}`);
        const b = bRes.data?.data?.booking;
        if (!b) throw new Error("Booking not found");
        setBooking(b);

        if (b.emergencyContact) {
          try {
            setEmergencyContact(
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact,
            );
          } catch {
            setEmergencyContact(null);
          }
        }

        try {
          const pRes = await client.get(`/payments/${b.id}`);
          setPayment(pRes.data?.data || null);
        } catch {
          setPayment(null);
        }

        if (b.status === "COMPLETED") {
          try {
            const r = await client.get(`/reviews/check/${bookingId}`);
            setHasReviewed(!!r.data?.data?.hasReviewed);
          } catch {
            setHasReviewed(false);
          }
        }
        setReviewCheckDone(true);

        if (user?.role === "HIRER") {
          try {
            const wRes = await client.get("/referral/wallet");
            setWalletBalance(Number(wRes.data?.data?.balance) || 0);
          } catch {
            setWalletBalance(0);
          }
        }

        try {
          const rRes = await client.get(`/refunds/my`, {
            params: { bookingId },
          });
          setRefunds(rRes.data?.data?.refunds || []);
        } catch {
          setRefunds([]);
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Could not load booking details.",
        );
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookingId, user?.role],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  // Recompute referral amount
  useEffect(() => {
    if (!booking) return;
    const p = calcPricing(booking);
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (referralPercent / 100) * subtotal;
    setReferralAmount(Math.min(Math.round(rawAmount), maxDiscount));
  }, [referralPercent, walletBalance, booking]);

  // ── Derived flags ─────────────────────────────────────────────
  const isHirer = userId === booking?.hirerId;
  const isWorker = userId === booking?.workerId;
  const step = booking ? (STATUS_STEP[booking.status] ?? 0) : 0;
  const other = isHirer ? booking?.worker : booking?.hirer;
  const dur = formatDuration(booking);
  const sosActive = !!booking?.sosActivatedAt && !booking?.sosResolvedAt;

  const hasCheckInGps =
    booking?.checkInLat != null && booking?.checkInLng != null;
  const hasCheckOutGps =
    booking?.checkOutLat != null && booking?.checkOutLng != null;
  const checkInDistKm =
    hasCheckInGps && booking?.latitude && booking?.longitude
      ? haversineKm(
          booking.checkInLat,
          booking.checkInLng,
          booking.latitude,
          booking.longitude,
        )
      : null;
  const checkOutDistKm =
    hasCheckOutGps && booking?.latitude && booking?.longitude
      ? haversineKm(
          booking.checkOutLat,
          booking.checkOutLng,
          booking.latitude,
          booking.longitude,
        )
      : null;

  const feeBreakdown = useMemo(() => {
    if (!booking) return null;
    const p = calcPricing(booking);
    return {
      label: "Payment Breakdown",
      subtotal: p.subtotal,
      total: p.grossTotal,
      platformFee: p.hirerFee,
      workerPayout: p.workerPayout,
      currency: p.currency,
      isActual: false,
      agreedRate: p.agreedRate,
      estimatedUnit: p.unit,
      hasQty: p.hasQty,
      qty: p.qty,
      unitLabel: p.unitLabel,
      suffix: p.unitSuffix,
      noDuration: !p.hasQty,
    };
  }, [booking]);

  const paymentRequired =
    isHirer &&
    ["ACCEPTED", "IN_PROGRESS"].includes(booking?.status) &&
    (!payment || payment.status === "PENDING");

  // Active refund — only for THIS booking
  const activeRefund = refunds.find((r) =>
    ["PENDING", "APPROVED", "PROCESSING", "DISPUTED"].includes(r.status),
  );

  // ── Actions ────────────────────────────────────────────────────
  const updateStatus = async (status, extra = {}) => {
    setActing(true);
    try {
      const res = await client.patch(`/bookings/${bookingId}/status`, {
        status,
        ...extra,
      });
      const updated = res.data?.data?.booking || booking;
      setBooking(updated);
      toast.success(
        `Booking ${String(status).toLowerCase().replace("_", " ")}.`,
      );
      setShowCancel(false);
      setCancelReason("");
      setCancelError("");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Action failed.");
    } finally {
      setActing(false);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) {
      setCancelError("Please provide a reason.");
      return;
    }
    updateStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  };

  const handleResolveSOS = async () => {
    setResolvingSOS(true);
    try {
      await client.patch(`/bookings/${bookingId}/sos/resolve`);
      toast.success("SOS marked as resolved.");
      fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resolve SOS.");
    } finally {
      setResolvingSOS(false);
      setSosConfirmVisible(false);
    }
  };

  const handleRefundRequest = async (refundData) => {
    setRefundLoading(true);
    try {
      await client.post("/refunds/request", refundData);
      toast.success("Refund request submitted.");
      setShowRefundModal(false);
      fetchAll(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Refund request failed.");
    } finally {
      setRefundLoading(false);
    }
  };

  const handleReleasePayment = () => {
    navigation.navigate("ReleaseEscrow", { bookingId });
  };

  const handlePayByCard = () => {
    navigation.navigate("InitiatePayment", { bookingId });
  };

  const handlePercentChange = (pct) => {
    const subtotal = calcPricing(booking).subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (pct / 100) * subtotal;
    const final = Math.min(Math.round(rawAmount), maxDiscount);
    setReferralPercent(pct);
    setReferralAmount(final);
    setReferralApplied(final > 0);
  };

  const handleReferralToggle = () => setReferralApplied((v) => !v);

  // ── Invoice Generation (with Android retry) ─────────────────────
  const handleDownloadInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const p = calcPricing(booking);

      const transaction = {
        reference: payment?.providerRef || booking.id,
        type: "PAYMENT",
        amount: p.grossTotal || booking.amount || 0,
        currency: booking.currency || "NGN",
        status: "COMPLETED",
        createdAt: booking.createdAt || new Date().toISOString(),
        description: `Payment for booking: ${booking.title}`,
        fee: p.hirerFee || 0,
        netAmount: p.subtotal || booking.amount || 0,
        bookingId: booking.id,
        bookingTitle: booking.title,
        workerName: booking.worker
          ? `${booking.worker.firstName} ${booking.worker.lastName}`
          : "—",
        hirerName: booking.hirer
          ? `${booking.hirer.firstName} ${booking.hirer.lastName}`
          : "—",
        meta: {
          paymentProvider: payment?.provider || "Paystack",
        },
      };

      const html = generateReceiptHTML(transaction);
      const { uri } = await Print.printToFileAsync({ html, base64: false });

      // Give Android a tick to settle the activity before opening the
      // share sheet — fixes "activity is no longer available".
      await new Promise((resolve) =>
        setTimeout(resolve, Platform.OS === "android" ? 300 : 0),
      );

      const canShare = await Sharing.isAvailableAsync();

      if (!canShare) {
        Alert.alert(
          "Invoice Ready",
          "The share sheet isn't available on this device. Opening the invoice...",
          [
            {
              text: "OK",
              onPress: async () => {
                try {
                  await Linking.openURL(uri);
                } catch {
                  toast.error("Could not open invoice.");
                }
              },
            },
          ],
        );
        return;
      }

      try {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `Invoice — ${booking.title}`,
          UTI: "com.adobe.pdf",
        });
      } catch (firstErr) {
        if (
          Platform.OS === "android" &&
          /activity.*(no longer|not).*available/i.test(
            String(firstErr?.message),
          )
        ) {
          await new Promise((resolve) => setTimeout(resolve, 800));
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: `Invoice — ${booking.title}`,
            UTI: "com.adobe.pdf",
          });
        } else {
          throw firstErr;
        }
      }
    } catch (e) {
      console.error("Invoice error:", e);
      toast.error(
        e?.message?.includes("activity")
          ? "Couldn't open share sheet. Please try again."
          : "Failed to generate invoice.",
      );
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handleLeaveReview = () => {
    navigation.navigate("LeaveReview", { bookingId });
  };
  const handleShowRefundModal = () => setShowRefundModal(true);

  // Back to Bookings list
  const handleBack = () => {
    navigation.navigate("Bookings");
  };

  // ── Loading — SKELETON ─────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <PageSkeleton variant="detail" />
      </SafeAreaView>
    );
  }

  // ── Not found ──────────────────────────────────────────────────
  if (!booking) {
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
          <FaExclamationCircle size={44} color={c.red} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.text,
            }}
          >
            Booking not found
          </AppText>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 8,
                paddingVertical: 10,
                paddingHorizontal: 20,
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
              Back to Bookings
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ─────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 8, paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back link */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              paddingVertical: 6,
              paddingHorizontal: 14,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 20,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText
            style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
          >
            Back to Bookings
          </AppText>
        </Pressable>

        {/* SOS banner */}
        {sosActive ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 14,
              borderRadius: 12,
              borderWidth: 2,
              backgroundColor: "rgba(239,68,68,0.1)",
              borderColor: c.red,
              flexWrap: "wrap",
            }}
          >
            <FaExclamationCircle size={20} color={c.red} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.red }}
              >
                SOS Alert Active
              </AppText>
              <AppText style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
                The worker has triggered an emergency alert.
                {booking.sosActivatedAt
                  ? ` Activated ${new Date(booking.sosActivatedAt).toLocaleTimeString()}`
                  : ""}
              </AppText>
            </View>
            {isHirer || user?.role === "ADMIN" ? (
              <Pressable
                onPress={() => setSosConfirmVisible(true)}
                disabled={resolvingSOS}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: c.red,
                    borderRadius: 8,
                    opacity: resolvingSOS ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: "#fff" }}
                >
                  {resolvingSOS ? "Resolving…" : "Mark Resolved"}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* MAIN COLUMN */}
        <BookingDetailMain
          booking={booking}
          step={step}
          dur={dur}
          hasCheckInGps={hasCheckInGps}
          hasCheckOutGps={hasCheckOutGps}
          checkInDistKm={checkInDistKm}
          checkOutDistKm={checkOutDistKm}
          reviewCheckDone={reviewCheckDone}
          hasReviewed={hasReviewed}
          bookingId={booking.id}
          invoiceLoading={invoiceLoading}
          onDownloadInvoice={handleDownloadInvoice}
          onLeaveReview={handleLeaveReview}
          isHirer={isHirer}
          payment={payment}
          paymentStatus={payment?.status}
          isWorker={isWorker}
          workerName={booking.worker?.firstName}
          refundLoading={refundLoading}
          hasActiveRefund={!!activeRefund}
          onShowRefundModal={handleShowRefundModal}
        />

        {/* Worker preview — pending only */}
        {isWorker && booking.status === "PENDING" ? (
          <WorkerPaymentPreview booking={booking} isWorker={isWorker} />
        ) : null}

        {/* Payment card — ALWAYS rendered (breakdown or receipt inside) */}
        <BookingDetailPayment
          booking={booking}
          payment={payment}
          feeBreakdown={feeBreakdown}
          walletBalance={walletBalance}
          referralAmount={referralAmount}
          referralApplied={referralApplied}
          referralPercent={referralPercent}
          onPercentChange={handlePercentChange}
          onReferralToggle={handleReferralToggle}
          showPayOptions={showPayOptions}
          onTogglePayOptions={() => setShowPayOptions((v) => !v)}
          paymentRequired={paymentRequired}
          onPayByCard={handlePayByCard}
          refetch={() => fetchAll(true)}
          onSuccess={(msg) => toast.success(msg)}
          isHirer={isHirer}
          isWorker={isWorker}
        />

        {/* Sidebar — party + actions */}
        <BookingDetailSidebar
          booking={booking}
          payment={payment}
          isHirer={isHirer}
          isWorker={isWorker}
          other={other}
          userId={userId}
          acting={acting}
          emergencyContact={emergencyContact}
          showCancel={showCancel}
          cancelReason={cancelReason}
          cancelError={cancelError}
          onCancelOpen={() => {
            setShowCancel(true);
            setCancelError("");
          }}
          onCancelClose={() => {
            setShowCancel(false);
            setCancelReason("");
            setCancelError("");
          }}
          onCancelReasonChange={(v) => {
            setCancelReason(v);
            setCancelError("");
          }}
          onCancelSubmit={handleCancelSubmit}
          onShowDispute={() => setShowDispute(true)}
          onSuccess={(msg) => toast.success(msg)}
          refetch={() => fetchAll(true)}
          updateStatus={updateStatus}
          onRelease={handleReleasePayment}
          onMessage={() =>
            navigation.navigate("Chat", { withUserId: other?.id })
          }
          onVideoCall={() =>
            navigation.navigate("VideoCall", { bookingId: booking.id })
          }
        />

        {/* Refund status — ONLY for this booking */}
        {activeRefund ? (
          <RefundStatusInline
            refund={activeRefund}
            isHirer={isHirer}
            onViewDetails={() =>
              navigation.navigate("RefundDetail", { id: activeRefund.id })
            }
          />
        ) : null}
      </ScrollView>

      {/* SOS confirmation modal */}
      <Modal
        visible={sosConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSosConfirmVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setSosConfirmVisible(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 16,
              padding: 20,
              width: "100%",
              maxWidth: 460,
            }}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 16,
                fontWeight: "800",
                color: c.text,
                marginBottom: 8,
              }}
            >
              Resolve SOS Alert
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                lineHeight: 19,
                marginBottom: 16,
              }}
            >
              Are you sure you want to mark this SOS alert as resolved?
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setSosConfirmVisible(false)}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    alignItems: "center",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleResolveSOS}
                disabled={resolvingSOS}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    paddingVertical: 12,
                    backgroundColor: "#eab308",
                    borderRadius: 10,
                    alignItems: "center",
                    opacity: resolvingSOS ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: "#000" }}
                >
                  {resolvingSOS ? "…" : "Yes, Resolve"}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Dispute sheet */}
      {showDispute ? (
        <RaiseDisputeSheet
          bookingId={booking.id}
          bookingTitle={booking.title}
          onClose={() => setShowDispute(false)}
          onSuccess={() => {
            toast.success(
              "Dispute raised. Our team will review within 24–48 hours.",
            );
            setShowDispute(false);
            fetchAll(true);
          }}
        />
      ) : null}

      {/* Refund modal */}
      <Modal
        visible={showRefundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowRefundModal(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation?.()}
            style={{
              backgroundColor: c.bgPanel,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              maxHeight: "92%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 16,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                Request Refund
              </AppText>
              <Pressable onPress={() => setShowRefundModal(false)} hitSlop={10}>
                <FaTimes size={16} color={c.textDim} />
              </Pressable>
            </View>
            <ScrollView>
              <RefundRequestInline
                booking={booking}
                payment={payment}
                isProcessing={refundLoading}
                isHirer={isHirer}
                onRequestRefund={handleRefundRequest}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
