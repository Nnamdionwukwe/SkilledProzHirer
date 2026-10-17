// src/screens/main/BookingDetailScreen.js
//
// Orchestrator. Works for both Hirer (drawer) and Worker (stack push).
// Loading state uses a skeleton that mirrors the actual layout.
// Content hugs the phone edges (8px horizontal) — same rhythm as BookingsScreen.

import React, { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  FaArrowLeft,
  FaExclamationCircle,
  FaExclamationTriangle,
  FaTimes,
} from "../../icons/fa";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import {
  getBooking,
  resolveSOS,
  updateBookingStatus,
} from "../../api/bookings";
import { getPaymentForBooking, releasePayment } from "../../api/payments";
import client from "../../api/client";
import { calcPricing } from "../../utils/pricing";

import BookingDetailMain from "../../components/booking/BookingDetailMain";
import BookingDetailSidebar from "../../components/booking/BookingDetailSidebar";
import BookingDetailPayment from "../../components/booking/BookingDetailPayment";
import WorkerPaymentPreview from "../../components/booking/WorkerPaymentPreview";
import RaiseDisputeSheet from "../../components/booking/RaiseDisputeSheet";
import { RefundRequest, RefundStatus } from "../../components/booking/Refund";

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

const STATUS_STEP = {
  PENDING: 0,
  ACCEPTED: 1,
  IN_PROGRESS: 2,
  COMPLETED: 3,
  CANCELLED: -1,
  DISPUTED: -1,
};

// ── Skeleton (edge-to-edge, mirrors layout below) ──────────────────────
function BookingDetailSkeleton() {
  const { theme: th } = useTheme();
  const c = th.colors;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 8, paddingBottom: 40, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Title block */}
      <Skeleton width="100%" height={110} radius={16} />

      {/* Timeline */}
      <Skeleton width="100%" height={76} radius={14} />

      {/* Description / job info */}
      <Skeleton width="100%" height={140} radius={14} />

      {/* Job details grid */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 8,
        }}
      >
        <Skeleton.Line width={90} height={10} />
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: c.border,
              backgroundColor: c.bgCard,
            }}
          >
            <Skeleton.Circle size={20} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton.Line width="40%" height={9} />
              <Skeleton.Line width="70%" height={12} />
            </View>
          </View>
        ))}
      </View>

      {/* Party card */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 20,
          alignItems: "center",
          gap: 10,
        }}
      >
        <Skeleton.Circle size={56} />
        <Skeleton.Line width={140} height={14} />
        <Skeleton.Line width={100} height={11} />
        <Skeleton width="100%" height={40} radius={8} />
      </View>

      {/* Actions card */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 18,
          gap: 10,
        }}
      >
        <Skeleton.Line width={80} height={10} />
        <Skeleton width="100%" height={42} radius={10} />
        <Skeleton width="100%" height={42} radius={10} />
        <Skeleton width="100%" height={42} radius={10} />
      </View>
    </ScrollView>
  );
}

export default function BookingDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;

  const bookingId = route.params?.bookingId;
  const isHirer = user?.role === "HIRER";
  const isWorker = user?.role === "WORKER";

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [emergencyContact, setEmergencyContact] = useState(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState("");
  const [showPayOptions, setShowPayOptions] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [referralPercent, setReferralPercent] = useState(0);
  const [referralAmount, setReferralAmount] = useState(0);
  const [referralApplied, setReferralApplied] = useState(false);
  const [refunds, setRefunds] = useState([]);
  const [refundLoading, setRefundLoading] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [reviewCheckDone, setReviewCheckDone] = useState(false);
  const [resolvingSOS, setResolvingSOS] = useState(false);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);

  const fetchAll = useCallback(
    async (silent = false) => {
      if (!bookingId) return;
      if (!silent) setLoading(true);
      try {
        const b = await getBooking(bookingId);
        setBooking(b);
        if (b.emergencyContact) {
          try {
            const ec =
              typeof b.emergencyContact === "string"
                ? JSON.parse(b.emergencyContact)
                : b.emergencyContact;
            setEmergencyContact(ec);
          } catch {}
        }
        try {
          const p = await getPaymentForBooking(b.id);
          setPayment(p);
        } catch {}
        if (b.status === "COMPLETED") {
          try {
            const r = await client.get(`/reviews/check/${bookingId}`);
            setHasReviewed(!!r.data?.data?.hasReviewed);
          } catch {
            setHasReviewed(false);
          }
        }
        setReviewCheckDone(true);
        if (isHirer) {
          try {
            const res = await client.get("/referral/wallet");
            setWalletBalance(res.data?.data?.balance || 0);
          } catch {}
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
    [bookingId, isHirer, t, toast],
  );

  useEffect(() => {
    fetchAll(false);
  }, [fetchAll]);

  useEffect(() => {
    if (!booking) return;
    const p = calcPricing(booking);
    const subtotal = p.subtotal || 0;
    const maxDiscount = Math.min(subtotal, walletBalance);
    const rawAmount = (referralPercent / 100) * subtotal;
    const amount = Math.round(rawAmount);
    setReferralAmount(Math.min(amount, maxDiscount));
  }, [referralPercent, walletBalance, booking]);

  const updateStatus = async (status, extra = {}) => {
    setActing(true);
    try {
      const updated = await updateBookingStatus(bookingId, status, extra);
      setBooking(updated);
      toast.success(
        t("booking.statusUpdated", {
          status: status.toLowerCase().replace("_", " "),
        }),
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

  const handleResolveSOS = async () => {
    setResolvingSOS(true);
    try {
      await resolveSOS(bookingId);
      toast.success(t("booking.sos.activated"));
      fetchAll(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("booking.sos.failed"));
    } finally {
      setResolvingSOS(false);
      setSosConfirmVisible(false);
    }
  };

  const handleRefundRequest = async (refundData) => {
    setRefundLoading(true);
    try {
      await client.post("/refunds/request", refundData);
      toast.success(
        t("booking.refund.submitted", {
          defaultValue: "Refund request submitted successfully!",
        }),
      );
      fetchAll(true);
    } catch (error) {
      toast.error(error?.response?.data?.message || t("booking.refund.failed"));
    } finally {
      setRefundLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    try {
      await releasePayment(bookingId);
      toast.success(t("booking.payment.released"));
      fetchAll(true);
    } catch (e) {
      toast.error(e?.response?.data?.message || t("toast.unknownError"));
    }
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

  // ── Skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return <BookingDetailSkeleton />;
  }

  if (!booking) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <FaExclamationCircle size={40} color="#ef4444" />
        <AppText variant="body" tone="dim" style={{ marginTop: 12 }}>
          {t("booking.notFound")}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: c.border, marginTop: 16 }]}
        >
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
            {t("booking.backToBookings")}
          </AppText>
        </Pressable>
      </View>
    );
  }

  const other = isHirer ? booking.worker : booking.hirer;
  const step = STATUS_STEP[booking.status] ?? 0;
  const dur = formatDuration(booking);
  const hasCheckInGps =
    booking.checkInLat != null && booking.checkInLng != null;
  const hasCheckOutGps =
    booking.checkOutLat != null && booking.checkOutLng != null;
  const checkInDistKm =
    hasCheckInGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkInLat,
          booking.checkInLng,
          booking.latitude,
          booking.longitude,
        )
      : null;
  const checkOutDistKm =
    hasCheckOutGps && booking.latitude && booking.longitude
      ? haversineKm(
          booking.checkOutLat,
          booking.checkOutLng,
          booking.latitude,
          booking.longitude,
        )
      : null;

  const p = calcPricing(booking);
  const feeBreakdown = {
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

  const paymentRequired =
    isHirer &&
    ["ACCEPTED", "IN_PROGRESS"].includes(booking.status) &&
    (!payment || payment.status === "PENDING");

  const sosActive = !!booking.sosActivatedAt && !booking.sosResolvedAt;

  const bookingRefunds = refunds.filter(
    (r) => r.bookingId === bookingId || r.booking?.id === bookingId,
  );
  const activeRefund = bookingRefunds.find((r) =>
    ["PENDING", "APPROVED", "PROCESSING", "DISPUTED"].includes(r.status),
  );

  const goToRefundDetail = (refund) => {
    try {
      navigation.navigate("RefundDetail", { refundId: refund.id });
    } catch {
      navigation.getParent()?.navigate("RefundDetail", { refundId: refund.id });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: 40,
          paddingTop: 8,
          gap: 10,
        }}
        showsVerticalScrollIndicator={false}
      >
        {isWorker && (
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: c.border, marginLeft: 4 }]}
          >
            <FaArrowLeft
              size={12}
              color={c.textDim}
              style={{ marginRight: 6 }}
            />
            <AppText variant="small" weight="semibold" tone="dim">
              {t("booking.backToBookings")}
            </AppText>
          </Pressable>
        )}

        {sosActive && (
          <View
            style={[
              styles.sosBanner,
              {
                backgroundColor: "rgba(239,68,68,0.1)",
                borderColor: "#ef4444",
              },
            ]}
          >
            <FaExclamationTriangle size={18} color="#ef4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText weight="bold" style={{ color: "#ef4444" }}>
                {t("booking.sos.bannerTitle")}
              </AppText>
              <AppText variant="small" tone="dim">
                {t("booking.sos.bannerDesc")}
                {booking.sosActivatedAt && (
                  <>
                    {" "}
                    {t("booking.sos.bannerActivated")}{" "}
                    {new Date(booking.sosActivatedAt).toLocaleTimeString()}
                  </>
                )}
              </AppText>
            </View>
            {(isHirer || user?.role === "ADMIN") && (
              <Pressable
                onPress={() => setSosConfirmVisible(true)}
                disabled={resolvingSOS}
                style={[
                  styles.sosResolveBtn,
                  {
                    backgroundColor: "#ef4444",
                    opacity: resolvingSOS ? 0.5 : 1,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#fff" }}
                >
                  {resolvingSOS
                    ? t("booking.sos.resolving")
                    : t("booking.sos.resolve")}
                </AppText>
              </Pressable>
            )}
          </View>
        )}

        <BookingDetailMain
          booking={booking}
          step={step}
          dur={dur}
          mapsUrl={mapsUrl}
          hasCheckInGps={hasCheckInGps}
          hasCheckOutGps={hasCheckOutGps}
          checkInDistKm={checkInDistKm}
          checkOutDistKm={checkOutDistKm}
          reviewCheckDone={reviewCheckDone}
          hasReviewed={hasReviewed}
          isHirer={isHirer}
          payment={payment}
          paymentStatus={payment?.status}
          isWorker={isWorker}
          workerName={booking.worker?.firstName}
          onShowRefundModal={() => setShowRefundModal(true)}
          refundLoading={refundLoading}
          hasActiveRefund={!!activeRefund}
          onShowReviewModal={() =>
            toast.info(
              t("booking.review.openTab", {
                defaultValue: "Please open the Reviews tab to submit a review.",
              }),
            )
          }
        />

        {isWorker && booking.status === "PENDING" && (
          <WorkerPaymentPreview booking={booking} />
        )}

        {booking.payment && !paymentRequired && (
          <BookingDetailPayment
            booking={booking}
            payment={booking.payment}
            feeBreakdown={feeBreakdown}
            walletBalance={walletBalance}
            referralAmount={referralAmount}
            referralApplied={referralApplied}
            referralPercent={referralPercent}
            onPercentChange={handlePercentChange}
            onReferralToggle={handleReferralToggle}
            showPayOptions={showPayOptions}
            onTogglePayOptions={() => setShowPayOptions((v) => !v)}
            paymentRequired={false}
            refetch={() => fetchAll(true)}
            onSuccess={(msg) => toast.success(msg)}
            isHirer={isHirer}
            isWorker={isWorker}
          />
        )}

        <View style={{ gap: 10 }}>
          {isHirer && paymentRequired && (
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

          <BookingDetailSidebar
            booking={booking}
            payment={payment}
            isHirer={isHirer}
            isWorker={isWorker}
            other={other}
            userId={user?.id}
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
              toast.info(
                t("bookingDetail.messagesSoon", {
                  defaultValue: "Messages coming soon",
                }),
              )
            }
            onVideoCall={() =>
              toast.info(
                t("bookingDetail.videoCallSoon", {
                  defaultValue: "Video call coming soon",
                }),
              )
            }
          />
        </View>

        {activeRefund && (
          <RefundStatus
            refund={activeRefund}
            isHirer={isHirer}
            onViewDetails={goToRefundDetail}
          />
        )}
      </ScrollView>

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
              {t("booking.sos.confirmTitle")}
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
              {t("booking.sos.confirmMessage")}
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
                  {t("booking.sos.confirmNo")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleResolveSOS}
                disabled={resolvingSOS}
                style={[
                  styles.modalBtn,
                  {
                    backgroundColor: "#ef4444",
                    opacity: resolvingSOS ? 0.5 : 1,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#fff" }}
                >
                  {resolvingSOS ? "…" : t("booking.sos.confirmYes")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {showDispute && (
        <RaiseDisputeSheet
          bookingId={booking.id}
          bookingTitle={booking.title}
          onClose={() => setShowDispute(false)}
          onSuccess={() => {
            toast.success(
              t("booking.dispute.raised", {
                defaultValue:
                  "Dispute raised. Our team will review within 24–48 hours.",
              }),
            );
            fetchAll(true);
          }}
        />
      )}

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
                  {t("booking.refund.title", {
                    defaultValue: "Request Refund",
                  })}
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

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
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
  sosResolveBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
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
