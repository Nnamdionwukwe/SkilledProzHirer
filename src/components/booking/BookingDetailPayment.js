// src/components/booking/BookingDetailPayment.js
//
// Mirrors BookingDetailPayment.jsx — fee breakdown (hirer + worker),
// referral slider (hirer only, NGN only), payment banner, payment card.

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaCreditCard,
  FaGift,
  FaBolt,
  FaCheckCircle,
  FaInfoCircle,
  FaChevronUp,
  FaClock,
} from "../../icons/fa";
import Slider from "@react-native-community/slider";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { HIRER_FEE_RATE } from "../../utils/pricing";

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function PayRow({ label, value, muted, green, capitalize, mono, extra }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View style={styles.paymentRow}>
      <AppText variant="small" tone="dim">
        {label}
      </AppText>
      {extra || (
        <AppText
          variant="small"
          weight="bold"
          style={[
            { color: c.text },
            muted && { color: c.textDim, fontWeight: "400" },
            green && { color: "#22c55e" },
            capitalize && { textTransform: "capitalize" },
            mono && {
              fontFamily: "monospace",
              fontSize: 11,
              color: c.textMuted,
            },
          ]}
        >
          {value}
        </AppText>
      )}
    </View>
  );
}

export default function BookingDetailPayment({
  booking,
  payment,
  feeBreakdown,
  walletBalance,
  referralAmount,
  referralApplied,
  referralPercent,
  onPercentChange,
  onReferralToggle,
  showPayOptions,
  onTogglePayOptions,
  paymentRequired,
  refetch,
  onSuccess,
  isHirer,
  isWorker,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const isJobPostBooking = booking?.source === "JOB_POST";

  const realDurationText =
    booking?.estimatedValue && booking?.estimatedUnit
      ? `${booking.estimatedValue} ${
          {
            hours: booking.estimatedValue == 1 ? "hour" : "hours",
            days: booking.estimatedValue == 1 ? "day" : "days",
            weeks: booking.estimatedValue == 1 ? "week" : "weeks",
            months: booking.estimatedValue == 1 ? "month" : "months",
            years: booking.estimatedValue == 1 ? "year" : "years",
            custom: "",
          }[booking.estimatedUnit] || booking.estimatedUnit
        }`
      : null;

  // ── Fee Breakdown ───────────────────────────────────────────────
  const renderFeeBreakdown = () => {
    if (!feeBreakdown) return null;

    const isNegotiated = booking.isNegotiated && booking.negotiatedRate;
    const isFixedTotalView = isNegotiated || isJobPostBooking;

    if (isWorker) {
      const cur = feeBreakdown.currency || "NGN";
      const workerPayout = feeBreakdown.workerPayout || 0;
      const agreedRate = feeBreakdown.agreedRate || 0;

      return (
        <View
          style={[
            styles.feeBreakdown,
            { backgroundColor: c.bgCard, borderColor: c.orange },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            tone="dim"
            style={styles.feeBreakdownLabel}
          >
            {isNegotiated
              ? t("booking.payment.agreedTotalNegotiated")
              : isJobPostBooking
                ? t("booking.payment.yourEarningsJobPost")
                : t("booking.payment.yourEarnings")}
          </AppText>

          {isFixedTotalView ? (
            <>
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  {isNegotiated
                    ? t("booking.payment.agreedTotal")
                    : t("booking.payment.selectedAmount")}
                </AppText>
                <AppText variant="small" weight="semibold">
                  {formatPrice(agreedRate, cur)}
                </AppText>
              </View>
              {isJobPostBooking && realDurationText && (
                <View style={styles.feeRow}>
                  <AppText variant="small" tone="dim">
                    Duration
                  </AppText>
                  <AppText variant="small" weight="semibold">
                    {realDurationText}
                    {booking.estimatedHours && (
                      <AppText variant="small" tone="dim">
                        {" "}
                        (≈ {booking.estimatedHours}h)
                      </AppText>
                    )}
                  </AppText>
                </View>
              )}
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  {t("booking.payment.platformFee")} ({HIRER_FEE_RATE * 100}%)
                </AppText>
                <AppText variant="small" weight="semibold">
                  + {formatPrice(feeBreakdown.platformFee || 0, cur)}
                </AppText>
              </View>
              <View style={[styles.feeTotal, { borderTopColor: c.border }]}>
                <AppText variant="body" weight="bold">
                  {t("booking.payment.youEarn")}
                </AppText>
                <AppText
                  variant="title"
                  weight="displayBlack"
                  style={{ color: "#22c55e" }}
                >
                  {formatPrice(workerPayout, cur)}
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  {t("booking.payment.agreedRate")}
                </AppText>
                <AppText variant="small" weight="semibold">
                  {formatPrice(agreedRate, cur)}
                  {{
                    hours: "/hr",
                    days: "/day",
                    weeks: "/wk",
                    months: "/mo",
                  }[feeBreakdown.estimatedUnit] || ""}
                </AppText>
              </View>
              {feeBreakdown.hasQty && (
                <View style={styles.feeRow}>
                  <AppText variant="small" tone="dim">
                    Duration
                  </AppText>
                  <AppText variant="small" weight="semibold">
                    {feeBreakdown.qty} {feeBreakdown.unitLabel}
                    {feeBreakdown.qty !== 1 ? "s" : ""}
                  </AppText>
                </View>
              )}
              {feeBreakdown.hasQty && (
                <View style={styles.feeRow}>
                  <AppText variant="small" tone="dim">
                    {t("booking.payment.subtotal")} ({feeBreakdown.qty} ×{" "}
                    {formatPrice(agreedRate, cur)})
                  </AppText>
                  <AppText variant="small" weight="semibold">
                    {formatPrice(feeBreakdown.subtotal || 0, cur)}
                  </AppText>
                </View>
              )}
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  {t("booking.payment.platformFee")} ({HIRER_FEE_RATE * 100}%)
                </AppText>
                <AppText variant="small" weight="semibold">
                  + {formatPrice(feeBreakdown.platformFee || 0, cur)}
                </AppText>
              </View>
              <View style={[styles.feeTotal, { borderTopColor: c.border }]}>
                <AppText variant="body" weight="bold">
                  {t("booking.payment.youEarn")}
                </AppText>
                <AppText
                  variant="title"
                  weight="displayBlack"
                  style={{ color: "#22c55e" }}
                >
                  {formatPrice(workerPayout, cur)}
                </AppText>
              </View>
            </>
          )}
        </View>
      );
    }

    // Hirer view
    const cur = feeBreakdown.currency || "NGN";
    const agreedRate = feeBreakdown.agreedRate || 0;
    const subtotal = feeBreakdown.subtotal || 0;
    const platformFee = feeBreakdown.platformFee || 0;
    const workerPayout = feeBreakdown.workerPayout || subtotal;
    const grossTotal = feeBreakdown.total || 0;

    const discount =
      referralApplied && booking.currency === "NGN" ? referralAmount : 0;
    const finalTotal = Math.max(0, grossTotal - discount);

    const isCustom = feeBreakdown.estimatedUnit === "custom";

    return (
      <View
        style={[
          styles.feeBreakdown,
          { backgroundColor: c.bgCard, borderColor: c.orange },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.feeBreakdownLabel}
        >
          {isNegotiated
            ? t("booking.payment.agreedTotalNegotiated")
            : isJobPostBooking
              ? t("booking.payment.breakdownJobPost")
              : t("booking.payment.breakdown")}
        </AppText>

        {isFixedTotalView ? (
          <>
            <View style={styles.feeRow}>
              <AppText variant="small" tone="dim">
                {isNegotiated
                  ? t("booking.payment.agreedTotal")
                  : t("booking.payment.selectedAmount")}
              </AppText>
              <AppText variant="small" weight="semibold">
                {formatPrice(agreedRate, cur)}
              </AppText>
            </View>
            {isJobPostBooking && realDurationText && (
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  Duration
                </AppText>
                <AppText variant="small" weight="semibold">
                  {realDurationText}
                  {booking.estimatedHours && (
                    <AppText variant="small" tone="dim">
                      {" "}
                      (≈ {booking.estimatedHours}h)
                    </AppText>
                  )}
                </AppText>
              </View>
            )}
            {isNegotiated && (feeBreakdown.hasQty || isCustom) && (
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  Duration
                </AppText>
                <AppText variant="small" weight="semibold">
                  {feeBreakdown.qty} {feeBreakdown.unitLabel}
                  {feeBreakdown.qty !== 1 ? "s" : ""}
                </AppText>
              </View>
            )}
            <View style={styles.feeRow}>
              <AppText variant="small" tone="dim">
                {t("booking.payment.platformFee")} ({HIRER_FEE_RATE * 100}%)
              </AppText>
              <AppText variant="small" weight="semibold">
                + {formatPrice(platformFee, cur)}
              </AppText>
            </View>
            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <View style={[styles.feeRow, { color: "#22c55e" }]}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FaGift
                    size={11}
                    color="#22c55e"
                    style={{ marginRight: 4 }}
                  />
                  <AppText variant="small" style={{ color: "#22c55e" }}>
                    {t("booking.payment.referralPerk")}
                  </AppText>
                </View>
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#22c55e" }}
                >
                  − {formatPrice(discount, booking.currency)}
                </AppText>
              </View>
            )}
            <View style={[styles.feeTotal, { borderTopColor: c.border }]}>
              <AppText variant="body" weight="bold">
                {t("booking.payment.youPay")}
              </AppText>
              <AppText
                variant="title"
                weight="displayBlack"
                style={{ color: c.orange }}
              >
                {formatPrice(finalTotal, cur)}
              </AppText>
            </View>
          </>
        ) : (
          <>
            <View style={styles.feeRow}>
              <AppText variant="small" tone="dim">
                {t("booking.payment.agreedRate")}
              </AppText>
              <AppText variant="small" weight="semibold">
                {formatPrice(agreedRate, cur)}
                {{
                  hours: "/hr",
                  days: "/day",
                  weeks: "/wk",
                  months: "/mo",
                }[feeBreakdown.estimatedUnit] || ""}
              </AppText>
            </View>
            {(feeBreakdown.hasQty || isCustom) && (
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  Duration
                </AppText>
                <AppText variant="small" weight="semibold">
                  {feeBreakdown.qty} {feeBreakdown.unitLabel}
                  {feeBreakdown.qty !== 1 ? "s" : ""}
                </AppText>
              </View>
            )}
            {(feeBreakdown.hasQty || isCustom) && (
              <View style={styles.feeRow}>
                <AppText variant="small" tone="dim">
                  {t("booking.payment.subtotal")} ({feeBreakdown.qty} ×{" "}
                  {formatPrice(agreedRate, cur)})
                </AppText>
                <AppText variant="small" weight="semibold">
                  {formatPrice(subtotal, cur)}
                </AppText>
              </View>
            )}
            <View style={styles.feeRow}>
              <AppText variant="small" tone="dim">
                {t("booking.payment.platformFee")} ({HIRER_FEE_RATE * 100}%)
              </AppText>
              <AppText variant="small" weight="semibold">
                + {formatPrice(platformFee, cur)}
              </AppText>
            </View>
            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <View style={styles.feeRow}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FaGift
                    size={11}
                    color="#22c55e"
                    style={{ marginRight: 4 }}
                  />
                  <AppText variant="small" style={{ color: "#22c55e" }}>
                    {t("booking.payment.referralPerk")}
                  </AppText>
                </View>
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#22c55e" }}
                >
                  − {formatPrice(discount, booking.currency)}
                </AppText>
              </View>
            )}
            <View style={[styles.feeTotal, { borderTopColor: c.border }]}>
              <AppText variant="body" weight="bold">
                {t("booking.payment.youPay")}
              </AppText>
              <AppText
                variant="title"
                weight="displayBlack"
                style={{ color: c.orange }}
              >
                {formatPrice(finalTotal, cur)}
              </AppText>
            </View>
          </>
        )}

        {/* Referral Slider */}
        {!feeBreakdown.isActual &&
          isHirer &&
          walletBalance > 0 &&
          booking.currency === "NGN" && (
            <View
              style={[
                styles.referralSection,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <View style={styles.referralHeader}>
                <FaGift size={14} color="#22c55e" style={{ marginRight: 6 }} />
                <AppText variant="small" weight="semibold" style={{ flex: 1 }}>
                  {t("booking.payment.walletBalance")}{" "}
                  {formatPrice(walletBalance, "NGN")}
                </AppText>
              </View>
              <Slider
                minimumValue={0}
                maximumValue={100}
                step={1}
                value={referralPercent}
                onValueChange={onPercentChange}
                minimumTrackTintColor={c.orange}
                maximumTrackTintColor={c.border}
                thumbTintColor={c.orange}
                style={{ width: "100%", height: 30, marginTop: 8 }}
              />
              <View style={styles.referralRow}>
                <AppText
                  variant="body"
                  weight="bold"
                  style={{ color: c.orange }}
                >
                  {referralPercent}%
                </AppText>
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ flex: 1, textAlign: "right" }}
                >
                  {formatPrice(referralAmount, "NGN")}
                </AppText>
                <Pressable
                  onPress={onReferralToggle}
                  disabled={referralAmount === 0}
                  style={[
                    styles.referralToggleBtn,
                    {
                      borderColor: referralApplied ? c.orange : c.border,
                      backgroundColor: referralApplied ? c.orange : c.bgCard,
                      opacity: referralAmount === 0 ? 0.4 : 1,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    weight="bold"
                    style={{ color: referralApplied ? "#fff" : c.textDim }}
                  >
                    {referralApplied
                      ? t("booking.payment.remove")
                      : t("booking.payment.apply")}
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}

        {!feeBreakdown.isActual && isHirer && walletBalance === 0 && (
          <View
            style={[
              styles.referralPerk,
              {
                backgroundColor: "rgba(34,197,94,0.08)",
                borderColor: "#22c55e",
              },
            ]}
          >
            <FaInfoCircle size={12} color="#22c55e" />
            <AppText
              variant="small"
              style={{ color: "#22c55e", marginLeft: 6, flex: 1 }}
            >
              {t("booking.payment.noReferral")}
            </AppText>
          </View>
        )}
      </View>
    );
  };

  // ── Payment Card ─────────────────────────────────────────────
  const renderPaymentCard = () => {
    if (!payment) return null;

    const useBreakdown = feeBreakdown && !feeBreakdown.isActual;
    const cur =
      (useBreakdown ? feeBreakdown.currency : payment.currency) || "NGN";

    let total = useBreakdown ? feeBreakdown.total : payment.amount;
    let platformFee = useBreakdown
      ? feeBreakdown.platformFee
      : payment.platformFee;
    let workerPayout = useBreakdown
      ? feeBreakdown.workerPayout
      : payment.workerPayout;

    if (useBreakdown && referralApplied && booking.currency === "NGN") {
      total = Math.max(0, total - referralAmount);
    }

    return (
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.section.payment")}
        </AppText>
        <View style={styles.paymentCard}>
          <PayRow
            label={t("booking.detail.total")}
            value={formatPrice(total, cur)}
          />
          <PayRow
            label={`${t("booking.payment.platformFee")} (${HIRER_FEE_RATE * 100}%)`}
            value={formatPrice(platformFee, cur)}
            muted
          />
          <PayRow
            label={t("booking.detail.workerPayout")}
            value={formatPrice(workerPayout, cur)}
            green
          />
          <View
            style={[styles.paymentDivider, { backgroundColor: c.border }]}
          />
          <PayRow
            label={t("booking.detail.provider")}
            value={payment.provider}
            capitalize
          />
          <PayRow
            label={t("booking.detail.status")}
            extra={
              <View
                style={[
                  styles.payStatusBadge,
                  {
                    backgroundColor: `${getPayStatusColor(payment.status)}22`,
                    borderColor: `${getPayStatusColor(payment.status)}55`,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{
                    color: getPayStatusColor(payment.status),
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  {payment.status}
                </AppText>
              </View>
            }
          />
          {payment.providerRef && (
            <PayRow
              label={t("booking.detail.ref")}
              value={payment.providerRef}
              mono
            />
          )}
        </View>
      </View>
    );
  };

  // ── Payment Banner ───────────────────────────────────────────
  const renderPaymentBanner = () => {
    if (!isHirer) return null;
    if (!paymentRequired) return null;

    const cur = feeBreakdown?.currency || booking.currency || "NGN";
    const grossTotal = feeBreakdown?.total || payment?.amount || 0;
    const discount =
      referralApplied && booking.currency === "NGN" ? referralAmount : 0;

    const isPaymentPending = payment?.status === "PENDING";
    const isBookingAccepted = booking?.status === "ACCEPTED";

    return (
      <View
        style={[
          styles.paymentBanner,
          { backgroundColor: c.orangeDim, borderColor: c.orange },
        ]}
      >
        <View style={styles.paymentBannerHeader}>
          <FaCreditCard size={16} color={c.orange} style={{ marginTop: 2 }} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText weight="bold" style={{ fontSize: 13 }}>
              {isPaymentPending
                ? t("booking.payment.pendingBannerTitle")
                : t("booking.payment.requiredBannerTitle")}
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
              {isPaymentPending
                ? t("booking.payment.processingMessage")
                : isJobPostBooking
                  ? t("booking.payment.jobPostMessage")
                  : t("booking.payment.secureMessage")}
            </AppText>
          </View>
        </View>

        {isPaymentPending && isBookingAccepted && (
          <View
            style={[
              styles.paymentBannerPerk,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            <FaClock size={11} color={c.orange} />
            <AppText variant="small" style={{ marginLeft: 6, flex: 1 }}>
              <AppText weight="bold">
                {t("booking.payment.workerWaiting")}
              </AppText>{" "}
              {t("booking.payment.workerWaitingSub")}
            </AppText>
          </View>
        )}

        {walletBalance > 0 && booking.currency === "NGN" && (
          <>
            <View
              style={[
                styles.paymentBannerPerk,
                {
                  backgroundColor: "rgba(34,197,94,0.08)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              <FaGift size={11} color="#22c55e" />
              <AppText
                variant="small"
                style={{ marginLeft: 6, flex: 1, color: "#22c55e" }}
              >
                <AppText weight="bold">
                  {t("booking.payment.referralPerk")}
                </AppText>{" "}
                {formatPrice(referralAmount, booking.currency)}{" "}
                {t("booking.payment.referralOff")}
              </AppText>
            </View>
            <View
              style={[
                styles.paymentBannerPerk,
                {
                  backgroundColor: "rgba(34,197,94,0.08)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              {referralApplied ? (
                <>
                  <FaCheckCircle size={11} color="#22c55e" />
                  <AppText
                    variant="small"
                    style={{ marginLeft: 6, flex: 1, color: "#22c55e" }}
                  >
                    {t("booking.payment.referralApplied", {
                      amount: formatPrice(referralAmount, booking.currency),
                    })}
                  </AppText>
                </>
              ) : (
                <>
                  <FaGift size={11} color="#22c55e" />
                  <AppText
                    variant="small"
                    style={{ marginLeft: 6, flex: 1, color: "#22c55e" }}
                  >
                    {t("booking.payment.applyReferral", {
                      amount: formatPrice(referralAmount, booking.currency),
                    })}
                  </AppText>
                </>
              )}
            </View>
          </>
        )}
        {walletBalance > 0 && booking.currency !== "NGN" && (
          <View
            style={[
              styles.paymentBannerPerk,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaInfoCircle size={11} color={c.textMuted} />
            <AppText
              variant="small"
              tone="dim"
              style={{ marginLeft: 6, flex: 1 }}
            >
              {t("booking.payment.referralNgnOnly")}
            </AppText>
          </View>
        )}

        <Pressable
          onPress={onTogglePayOptions}
          style={[
            styles.payNowBtn,
            { backgroundColor: c.orange },
            showPayOptions && {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              borderWidth: 1,
            },
          ]}
        >
          {showPayOptions ? (
            <>
              <FaChevronUp
                size={12}
                color={c.textDim}
                style={{ marginRight: 6 }}
              />
              <AppText
                variant="small"
                weight="bold"
                style={{ color: c.textDim }}
              >
                {t("booking.payment.hideOptions")}
              </AppText>
            </>
          ) : isPaymentPending ? (
            <>
              <FaBolt size={12} color="#fff" style={{ marginRight: 6 }} />
              <AppText variant="small" weight="bold" style={{ color: "#fff" }}>
                {t("booking.payment.chooseDifferent")}
              </AppText>
            </>
          ) : (
            <>
              <FaCreditCard size={12} color="#fff" style={{ marginRight: 6 }} />
              <AppText variant="small" weight="bold" style={{ color: "#fff" }}>
                {t("booking.payment.payNow")}
              </AppText>
            </>
          )}
        </Pressable>

        {showPayOptions && (
          <View
            style={[
              styles.paymentOptionsWrap,
              { borderTopColor: `${c.orange}44` },
            ]}
          >
            <Pressable
              style={[
                styles.actionBtn,
                { backgroundColor: c.orange, marginTop: 8 },
              ]}
              onPress={() => {
                onSuccess &&
                  onSuccess(
                    t("booking.payment.redirecting", {
                      defaultValue: "Redirecting to payment…",
                    }),
                  );
                onTogglePayOptions && onTogglePayOptions();
                refetch && refetch();
              }}
            >
              <FaCreditCard size={12} color="#fff" style={{ marginRight: 6 }} />
              <AppText variant="small" weight="bold" style={{ color: "#fff" }}>
                {t("booking.payment.payByCard")}
              </AppText>
            </Pressable>
            <AppText variant="small" tone="dim" style={{ marginTop: 8 }}>
              {t("booking.payment.otherMethods", {
                defaultValue:
                  "Other payment methods (bank transfer, crypto) coming soon.",
              })}
            </AppText>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      {renderFeeBreakdown()}
      {renderPaymentCard()}
      {renderPaymentBanner()}
    </View>
  );
}

function getPayStatusColor(status) {
  switch (status) {
    case "PENDING":
      return "#fbbf24";
    case "HELD":
      return "#818cf8";
    case "RELEASED":
      return "#22c55e";
    case "REFUNDED":
      return "#ef4444";
    case "FAILED":
      return "#ef4444";
    default:
      return "#888888";
  }
}

const styles = StyleSheet.create({
  section: { padding: 20, borderRadius: 14, borderWidth: 1 },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
    fontSize: 11,
  },
  feeBreakdown: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 16,
    gap: 8,
  },
  feeBreakdownLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  paymentCard: { gap: 8 },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  paymentDivider: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  payStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  paymentBanner: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  paymentBannerHeader: { flexDirection: "row", alignItems: "flex-start" },
  paymentBannerPerk: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  payNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 9,
  },
  paymentOptionsWrap: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 9,
  },
  referralSection: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
    gap: 6,
  },
  referralHeader: { flexDirection: "row", alignItems: "center" },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  referralToggleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  referralPerk: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
});
