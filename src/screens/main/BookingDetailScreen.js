// src/screens/main/BookingDetailScreen.js
//
// Verbatim port of the web `components/booking/BookingDetail/index.jsx`.
//
// Structure:
//   · Back link
//   · SOS banner (if active)
//   · Toast (auto-dismiss)  — mirrors web `showToastMessage`
//   · Main column:
//       - BookingDetailMain   (title, timeline, description, job details,
//                              GPS, reviews, cancellation reason,
//                              bottom actions: invoice + refund)
//       - WorkerPaymentPreview (only for workers on PENDING)
//   · Sidebar column:
//       - BookingDetailPayment  (fee breakdown + Pay Now or Receipt)
//       - BookingDetailSidebar  (party + actions + cancel + dispute)
//   · Refund status (if any)
//
// Data:
//   GET  /bookings/:bookingId
//   GET  /payments/:bookingId
//   GET  /reviews/check/:bookingId
//   GET  /referral/wallet
//   GET  /refunds/my?bookingId=:bookingId
//
// Verbatim behaviours preserved:
//   · Dynamic fee percent — `getHirerFeeRate(currency)` (NGN=2%, other=5%)
//   · Referral slider — only for hirer, NGN currency, walletBalance > 0,
//                        wallet applies against subtotal (not grossTotal)
//   · Referral is recalculated on both percent change AND booking change
//   · Pay Now only visible when `paymentRequired` is true
//   · Refund & invoice only rendered once booking is COMPLETED

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import { getBooking, updateBookingStatus } from "../../api/bookings";
import { getPaymentForBooking, releasePayment } from "../../api/payments";
import { calcPricing } from "../../utils/pricing";
import { FaArrowLeft, FaExclamationCircle, FaTimes } from "../../icons/fa";

import BookingDetailMain from "../../components/booking/BookingDetailMain";
import BookingDetailSidebar from "../../components/booking/BookingDetailSidebar";
import BookingDetailPayment from "../../components/booking/BookingDetailPayment";
import WorkerPaymentPreview from "../../components/booking/WorkerPaymentPreview";
import RaiseDisputeSheet from "../../components/booking/RaiseDisputeSheet";
import { RefundRequest, RefundStatus } from "../../components/booking/Refund";
import PageSkeleton from "../../components/PageSkeleton";

// ─── Helpers ───────────────────────────────────────────────────────────
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

function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
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
    };
    const num = parseFloat(value);
    const label = (labels[unit] || unit) + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }
  return hours ? { main: `${hours} hours`, sub: null } : null;
}

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", step: 0 },
  ACCEPTED: { label: "Accepted", color: "orange", step: 1 },
  IN_PROGRESS: { label: "In Progress", color: "indigo", step: 2 },
  COMPLETED: { label: "Completed", color: "green", step: 3 },
  CANCELLED: { label: "Cancelled", color: "red", step: -1 },
  DISPUTED: { label: "Disputed", color: "rose", step: -1 },
};

// ─── Screen ────────────────────────────────────────────────────────────
export default function BookingDetailScreen() {
  const { t } = useTranslation();
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

  // Pay options (toggle)
  const [showPayOptions, setShowPayOptions] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(
    async (silent = false) => {
      if (!bookingId) return;
      if (!silent) setLoading(true);
      try {
        const b = await getBooking(bookingId);
        setBooking(b);

        if (b.emergencyContact) {
          try {
            setEmergencyContact(
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact,
            );
          } catch {}
        }

        try {
          setPayment(await getPaymentForBooking(b.id));
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
            const res = await client.get("/referral/wallet");
            setWalletBalance(Number(res.data?.data?.balance) || 0);
            // Reset slider (per web: on new booking load)
            setReferralPercent(0);
            setReferralAmount(0);
            setReferralApplied(false);
          } catch {
            setWalletBalance(0);
          }
        }

        try {
          const res = await client.get(`/refunds/my?bookingId=${bookingId}`);
          setRefunds(res.data?.data?.refunds || []);
        } catch {
          setRefunds([]);
        }
      } catch (err) {
        toast.error(err?.response?.data?.message || t("toast.networkError"));
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bookingId],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  // ── Recalculate referral on percent / wallet / booking changes ─────
  useEffect(() => {
    if (!booking) return;
    const p = calcPricing(booking);
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (referralPercent / 100) * subtotal;
    const amount = Math.round(rawAmount);
    setReferralAmount(Math.min(amount, maxDiscount));
  }, [referralPercent, walletBalance, booking]);

  // ── Derived flags ─────────────────────────────────────────────────
  const isHirer = userId === booking?.hirerId;
  const isWorker = userId === booking?.workerId;
  const meta = booking ? STATUS_META[booking.status] || {} : {};
  const step = meta.step ?? 0;
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

  // Fee breakdown passed into BookingDetailPayment + Sidebar
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

  const activeRefund = refunds.find((r) =>
    ["PENDING", "APPROVED", "PROCESSING", "DISPUTED"].includes(r.status),
  );

  // ── Status change ─────────────────────────────────────────────────
  const updateStatus = async (status, extra = {}) => {
    setActing(true);
    try {
      const updated = await updateBookingStatus(bookingId, status, extra);
      setBooking(updated);
      toast.success(
        t("booking.statusUpdated", {
          status: String(status).toLowerCase().replace("_", " "),
        }) || `Booking ${String(status).toLowerCase()}.`,
      );
      setShowCancel(false);
      setCancelReason("");
      setCancelError("");
    } catch (e) {
      toast.error(e?.response?.data?.message || t("toast.unknownError"));
    } finally {
      setActing(false);
    }
  };

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) {
      setCancelError(t("booking.cancel.reasonRequired"));
      return;
    }
    updateStatus("CANCELLED", { cancelReason: cancelReason.trim() });
  };

  // ── SOS ──────────────────────────────────────────────────────────
  const handleResolveSOS = async () => {
    setResolvingSOS(true);
    try {
      await client.patch(`/bookings/${bookingId}/sos/resolve`);
      toast.success(t("booking.sos.activated") || "SOS marked as resolved.");
      fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resolve SOS");
    } finally {
      setResolvingSOS(false);
      setSosConfirmVisible(false);
    }
  };

  // ── Refund ────────────────────────────────────────────────────────
  const handleRefundRequest = async (refundData) => {
    setRefundLoading(true);
    try {
      await client.post("/refunds/request", refundData);
      toast.success("Refund request submitted.");
      fetchAll(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Refund request failed.");
    } finally {
      setRefundLoading(false);
    }
  };

  // ── Release (from sidebar) ───────────────────────────────────────
  const handleReleasePayment = async () => {
    try {
      await releasePayment(bookingId);
      toast.success(t("booking.payment.released") || "Payment released.");
      fetchAll(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || t("toast.unknownError"));
    }
  };

  // ── Referral handlers ────────────────────────────────────────────
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

  // ── Guards ────────────────────────────────────────────────────────
  if (loading) {
    return <PageSkeleton variant="booking-detail" />;
  }

  if (!booking) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <FaExclamationCircle size={40} color={c.red} />
        <AppText variant="body" tone="dim" style={{ marginTop: 12 }}>
          {t("booking.notFound") || "Booking not found."}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: c.border, marginTop: 16 }]}
        >
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
            Back
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          padding: 8,
          paddingBottom: 40,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Back link — always visible, top of page */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            styles.backBtn,
            { borderColor: c.border, alignSelf: "flex-start" },
          ]}
        >
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
            Back to Bookings
          </AppText>
        </Pressable>

        {/* SOS banner */}
        {sosActive && (
          <View
            style={[
              styles.sosBanner,
              {
                backgroundColor: "rgba(239,68,68,0.1)",
                borderColor: c.red,
              },
            ]}
          >
            <FaExclamationCircle size={20} color={c.red} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText weight="bold" style={{ color: c.red }}>
                SOS Alert Active
              </AppText>
              <AppText variant="small" tone="dim">
                The worker has triggered an emergency alert.
                {booking.sosActivatedAt
                  ? ` Activated ${new Date(booking.sosActivatedAt).toLocaleTimeString()}`
                  : ""}
              </AppText>
            </View>
            {(isHirer || user?.role === "ADMIN") && (
              <Pressable
                onPress={() => setSosConfirmVisible(true)}
                disabled={resolvingSOS}
                style={[
                  styles.sosBtn,
                  { backgroundColor: c.red, opacity: resolvingSOS ? 0.5 : 1 },
                ]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#fff" }}
                >
                  {resolvingSOS ? "Resolving…" : "Mark Resolved"}
                </AppText>
              </Pressable>
            )}
          </View>
        )}

        {/* MAIN COLUMN */}
        <BookingDetailMain
          booking={booking}
          step={step}
          dur={dur}
          mapsUrl={mapsUrl}
          calcDuration={null}
          hasCheckInGps={hasCheckInGps}
          hasCheckOutGps={hasCheckOutGps}
          checkInDistKm={checkInDistKm}
          checkOutDistKm={checkOutDistKm}
          reviewCheckDone={reviewCheckDone}
          hasReviewed={hasReviewed}
          bookingId={booking.id}
          invoiceLoading={false}
          onDownloadInvoice={() => {
            toast.info(
              "Invoice download — open the Receipt button under Payment to save.",
            );
          }}
          isHirer={isHirer}
          payment={payment}
          paymentStatus={payment?.status}
          isWorker={isWorker}
          workerName={booking.worker?.firstName}
          onRefundRequest={handleRefundRequest}
          refundLoading={refundLoading}
          hasActiveRefund={!!activeRefund}
        />

        {/* Worker pending preview */}
        {isWorker && booking.status === "PENDING" && (
          <WorkerPaymentPreview booking={booking} isWorker={isWorker} />
        )}

        {/* SIDEBAR — merged into same column on mobile, matches the CSS
            which puts the sidebar right after main at <900px (mobile) */}
        <View style={{ marginTop: 10, gap: 10 }}>
          {/* Payment card — only if receipt exists OR pay is required */}
          {((payment && payment.status !== "PENDING") || paymentRequired) && (
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
              refetch={() => fetchAll(true)}
              onSuccess={(msg) => toast.success(msg)}
              isHirer={isHirer}
              isWorker={isWorker}
            />
          )}

          {/* Sidebar (party + actions) */}
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
            onMessage={() => toast.info("Messages coming soon")}
            onVideoCall={() => toast.info("Video call coming soon")}
          />
        </View>

        {/* Refund status */}
        {activeRefund && (
          <RefundStatus
            refund={activeRefund}
            isHirer={isHirer}
            onViewDetails={() =>
              navigation.navigate("RefundDetail", { refundId: activeRefund.id })
            }
          />
        )}
      </ScrollView>

      {/* SOS confirmation modal */}
      <Modal
        visible={sosConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSosConfirmVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText weight="bold" style={{ fontSize: 16, marginBottom: 8 }}>
              Resolve SOS Alert
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
              Are you sure you want to mark this SOS alert as resolved?
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setSosConfirmVisible(false)}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <AppText variant="small" weight="bold" tone="dim">
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleResolveSOS}
                disabled={resolvingSOS}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#eab308",
                    opacity: resolvingSOS ? 0.5 : 1,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#000" }}
                >
                  {resolvingSOS ? "…" : "Yes, Resolve"}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dispute sheet */}
      {showDispute && (
        <RaiseDisputeSheet
          bookingId={booking.id}
          bookingTitle={booking.title}
          onClose={() => setShowDispute(false)}
          onSuccess={() => {
            toast.success(
              "Dispute raised. Our team will review within 24–48 hours.",
            );
            fetchAll(true);
          }}
        />
      )}

      {/* Refund modal */}
      <Modal
        visible={showRefundModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRefundModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                maxHeight: "92%",
                padding: 0,
              },
            ]}
          >
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <AppText weight="bold" style={{ fontSize: 16 }}>
                  Request Refund
                </AppText>
                <Pressable
                  onPress={() => setShowRefundModal(false)}
                  hitSlop={10}
                >
                  <FaTimes size={16} color={c.textDim} />
                </Pressable>
              </View>
              <RefundRequest
                booking={booking}
                payment={payment}
                isProcessing={refundLoading}
                isHirer={isHirer}
                onRequestRefund={async (data) => {
                  await handleRefundRequest(data);
                  setShowRefundModal(false);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  sosBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 10,
  },
  sosBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
});
