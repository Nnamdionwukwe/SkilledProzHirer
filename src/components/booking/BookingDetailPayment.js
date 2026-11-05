// src/components/booking/BookingDetailPayment.js

import React from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { getHirerFeeRate } from "../../utils/pricing";
import {
  FaCreditCard,
  FaGift,
  FaBolt,
  FaCheckCircle,
  FaInfoCircle,
  FaChevronUp,
  FaClock,
} from "../../icons/fa";

function getFeePercent(currency = "NGN") {
  return Math.round(getHirerFeeRate(currency) * 100);
}

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Sub-components ─────────────────────────────────────────────────────

function PayRow({ label, value, muted, green, capitalize, mono, extra, c }) {
  return (
    <View style={styles.paymentRow}>
      <AppText style={[styles.payLabel, { color: c.textDim }]}>{label}</AppText>
      {extra ? (
        extra
      ) : (
        <AppText
          style={[
            styles.payValue,
            { color: c.text },
            muted && [styles.payMuted, { color: c.textDim }],
            green && [styles.payGreen, { color: c.green }],
            capitalize && { textTransform: "capitalize" },
            mono && styles.payRef,
          ]}
        >
          {value}
        </AppText>
      )}
    </View>
  );
}

function FeeRow({ label, value, c }) {
  return (
    <View style={styles.feeRow}>
      <AppText
        style={{
          fontSize: 12,
          color: c.textDim,
          flexShrink: 1,
          fontFamily: "DMSans_400Regular",
        }}
      >
        {label}
      </AppText>
      {typeof value === "string" ? (
        <AppText
          style={{
            fontSize: 12,
            color: c.text,
            textAlign: "right",
            flexShrink: 1,
            fontFamily: "DMSans_700Bold",
          }}
        >
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

function FeeTotal({ label, value, c }) {
  return (
    <View style={[styles.feeTotal, { borderTopColor: c.border }]}>
      <AppText
        style={{ fontSize: 13, fontFamily: "DMSans_700Bold", color: c.text }}
      >
        {label}
      </AppText>
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 12,
          color: c.orange,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function ReferralSlider({ value, onChange, disabled, c }) {
  const step = 5;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable
        onPress={() => !disabled && onChange(Math.max(0, Number(value) - step))}
        disabled={disabled || Number(value) <= 0}
        hitSlop={6}
        style={[
          styles.sliderBtn,
          {
            borderColor: c.border,
            opacity: disabled || Number(value) <= 0 ? 0.4 : 1,
          },
        ]}
      >
        <AppText style={{ fontSize: 16, color: c.text, lineHeight: 18 }}>
          −
        </AppText>
      </Pressable>
      <View style={[styles.sliderTrack, { backgroundColor: c.border }]}>
        <View
          style={[
            styles.sliderFill,
            {
              backgroundColor: c.orange,
              width: `${Math.min(100, Math.max(0, Number(value)))}%`,
            },
          ]}
        />
      </View>
      <Pressable
        onPress={() =>
          !disabled && onChange(Math.min(100, Number(value) + step))
        }
        disabled={disabled || Number(value) >= 100}
        hitSlop={6}
        style={[
          styles.sliderBtn,
          {
            borderColor: c.border,
            opacity: disabled || Number(value) >= 100 ? 0.4 : 1,
          },
        ]}
      >
        <AppText style={{ fontSize: 16, color: c.text, lineHeight: 18 }}>
          +
        </AppText>
      </Pressable>
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
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const isJobPostBooking = booking?.source === "JOB_POST";
  const feeCurrency =
    (feeBreakdown && feeBreakdown.currency) || booking?.currency || "NGN";
  const feePercent = getFeePercent(feeCurrency);

  const realDurationText =
    booking?.estimatedValue && booking?.estimatedUnit
      ? `${booking.estimatedValue} ${
          {
            hours:
              booking.estimatedValue == 1
                ? t("payment.detail.units.hour")
                : t("payment.detail.units.hours"),
            days:
              booking.estimatedValue == 1
                ? t("payment.detail.units.day")
                : t("payment.detail.units.days"),
            weeks:
              booking.estimatedValue == 1
                ? t("payment.detail.units.week")
                : t("payment.detail.units.weeks"),
            months:
              booking.estimatedValue == 1
                ? t("payment.detail.units.month")
                : t("payment.detail.units.months"),
            years:
              booking.estimatedValue == 1
                ? t("payment.detail.units.year")
                : t("payment.detail.units.years"),
            custom: "",
          }[booking.estimatedUnit] || booking.estimatedUnit
        }`
      : null;

  const handleCardPay = () => {
    if (!booking?.id) return;
    navigation.navigate("InitiatePayment", { bookingId: booking.id });
  };

  const renderFeeBreakdown = () => {
    if (!feeBreakdown) return null;

    const isNegotiated = booking.isNegotiated && booking.negotiatedRate;
    const isFixedTotalView = isNegotiated || isJobPostBooking;

    // ── Worker View ──
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
          <AppText style={[styles.feeBreakdownLabel, { color: c.textMuted }]}>
            {isNegotiated
              ? t(
                  "payment.detail.titles.agreedTotalNegotiated",
                  "Agreed Total (Negotiated)",
                )
              : isJobPostBooking
                ? t(
                    "payment.detail.titles.yourEarningsJobPost",
                    "Your Earnings (From Job Post)",
                  )
                : t("payment.detail.titles.yourEarnings", "Your Earnings")}
          </AppText>

          {isFixedTotalView ? (
            <>
              <FeeRow
                label={
                  isNegotiated
                    ? t("payment.detail.labels.agreedTotal", "Agreed Total")
                    : t(
                        "payment.detail.labels.selectedAmount",
                        "Selected Amount",
                      )
                }
                value={formatPrice(agreedRate, cur)}
                c={c}
              />
              {isJobPostBooking && realDurationText && (
                <FeeRow
                  label={t("payment.detail.labels.duration", "Duration")}
                  value={
                    <AppText
                      style={{
                        fontSize: 12,
                        color: c.text,
                        fontFamily: "DMSans_700Bold",
                      }}
                    >
                      {realDurationText}
                      {booking.estimatedHours && (
                        <AppText style={{ color: c.textMuted, fontSize: 10 }}>
                          {" "}
                          {t("payment.detail.labels.approxHours", {
                            hours: booking.estimatedHours,
                            defaultValue: "(≈ {{hours}}h)",
                          })}
                        </AppText>
                      )}
                    </AppText>
                  }
                  c={c}
                />
              )}
              <FeeRow
                label={t("payment.detail.labels.platformFee", {
                  percent: feePercent,
                  defaultValue: "Platform Fee ({{percent}}%)",
                })}
                value={`+ ${formatPrice(feeBreakdown.platformFee || 0, cur)}`}
                c={c}
              />
              <FeeTotal
                label={t("payment.detail.labels.youEarn", "You Earn")}
                value={formatPrice(workerPayout, cur)}
                c={c}
              />
            </>
          ) : (
            <>
              <FeeRow
                label={t("payment.detail.labels.agreedRate", "Agreed Rate")}
                value={`${formatPrice(agreedRate, cur)}${
                  {
                    hours: t("payment.detail.units.perHour", "/hr"),
                    days: t("payment.detail.units.perDay", "/day"),
                    weeks: t("payment.detail.units.perWeek", "/wk"),
                    months: t("payment.detail.units.perMonth", "/mo"),
                  }[feeBreakdown.estimatedUnit] || ""
                }`}
                c={c}
              />
              {feeBreakdown.hasQty && (
                <FeeRow
                  label={t("payment.detail.labels.duration", "Duration")}
                  value={`${feeBreakdown.qty} ${feeBreakdown.unitLabel}${feeBreakdown.qty !== 1 ? t("payment.detail.labels.pluralSuffix", "s") : ""}`}
                  c={c}
                />
              )}
              {feeBreakdown.hasQty && (
                <FeeRow
                  label={t("payment.detail.labels.subtotalLine", {
                    qty: feeBreakdown.qty,
                    rate: formatPrice(agreedRate, cur),
                    defaultValue: "Subtotal ({{qty}} × {{rate}})",
                  })}
                  value={formatPrice(feeBreakdown.subtotal || 0, cur)}
                  c={c}
                />
              )}
              <FeeRow
                label={t("payment.detail.labels.platformFee", {
                  percent: feePercent,
                  defaultValue: "Platform Fee ({{percent}}%)",
                })}
                value={`+ ${formatPrice(feeBreakdown.platformFee || 0, cur)}`}
                c={c}
              />
              <FeeTotal
                label={t("payment.detail.labels.youEarn", "You Earn")}
                value={formatPrice(workerPayout, cur)}
                c={c}
              />
            </>
          )}
        </View>
      );
    }

    // ── Hirer View ──
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

    const isPaymentPending = payment?.status === "PENDING";
    const isBookingAccepted = booking?.status === "ACCEPTED";

    return (
      <View
        style={[
          styles.feeBreakdown,
          { backgroundColor: c.bgCard, borderColor: c.orange },
        ]}
      >
        <AppText style={[styles.feeBreakdownLabel, { color: c.textMuted }]}>
          {isNegotiated
            ? t(
                "payment.detail.titles.agreedTotalNegotiated",
                "Agreed Total (Negotiated)",
              )
            : isJobPostBooking
              ? t(
                  "payment.detail.titles.paymentBreakdownJobPost",
                  "Payment Breakdown (From Job Post)",
                )
              : t(
                  "payment.detail.titles.paymentBreakdown",
                  "Payment Breakdown",
                )}
        </AppText>

        {isFixedTotalView ? (
          <>
            <FeeRow
              label={
                isNegotiated
                  ? t("payment.detail.labels.agreedTotal", "Agreed Total")
                  : t("payment.detail.labels.selectedAmount", "Selected Amount")
              }
              value={formatPrice(agreedRate, cur)}
              c={c}
            />
            {isJobPostBooking && realDurationText && (
              <FeeRow
                label={t("payment.detail.labels.duration", "Duration")}
                value={
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.text,
                      fontFamily: "DMSans_700Bold",
                    }}
                  >
                    {realDurationText}
                    {booking.estimatedHours && (
                      <AppText style={{ color: c.textMuted, fontSize: 10 }}>
                        {" "}
                        {t("payment.detail.labels.approxHours", {
                          hours: booking.estimatedHours,
                          defaultValue: "(≈ {{hours}}h)",
                        })}
                      </AppText>
                    )}
                  </AppText>
                }
                c={c}
              />
            )}
            {isNegotiated && (feeBreakdown.hasQty || isCustom) && (
              <FeeRow
                label={t("payment.detail.labels.duration", "Duration")}
                value={`${feeBreakdown.qty} ${feeBreakdown.unitLabel}${feeBreakdown.qty !== 1 ? t("payment.detail.labels.pluralSuffix", "s") : ""}`}
                c={c}
              />
            )}
            <FeeRow
              label={t("payment.detail.labels.platformFee", {
                percent: feePercent,
                defaultValue: "Platform Fee ({{percent}}%)",
              })}
              value={`+ ${formatPrice(platformFee, cur)}`}
              c={c}
            />
            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <View style={[styles.feeRow, { color: c.green }]}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <FaGift size={10} color={c.green} />
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.green,
                      fontFamily: "DMSans_400Regular",
                    }}
                  >
                    {t("payment.detail.labels.referralBonus", "Referral bonus")}
                  </AppText>
                </View>
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.green,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  − {formatPrice(discount, booking.currency)}
                </AppText>
              </View>
            )}
            <FeeTotal
              label={t("payment.detail.labels.youPay", "You Pay")}
              value={formatPrice(finalTotal, cur)}
              c={c}
            />
          </>
        ) : (
          <>
            <FeeRow
              label={t("payment.detail.labels.agreedRate", "Agreed Rate")}
              value={`${formatPrice(agreedRate, cur)}${
                {
                  hours: t("payment.detail.units.perHour", "/hr"),
                  days: t("payment.detail.units.perDay", "/day"),
                  weeks: t("payment.detail.units.perWeek", "/wk"),
                  months: t("payment.detail.units.perMonth", "/mo"),
                }[feeBreakdown.estimatedUnit] || ""
              }`}
              c={c}
            />
            {(feeBreakdown.hasQty || isCustom) && (
              <FeeRow
                label={t("payment.detail.labels.duration", "Duration")}
                value={`${feeBreakdown.qty} ${feeBreakdown.unitLabel}${feeBreakdown.qty !== 1 ? t("payment.detail.labels.pluralSuffix", "s") : ""}`}
                c={c}
              />
            )}
            {(feeBreakdown.hasQty || isCustom) && (
              <FeeRow
                label={t("payment.detail.labels.subtotalLine", {
                  qty: feeBreakdown.qty,
                  rate: formatPrice(agreedRate, cur),
                  defaultValue: "Subtotal ({{qty}} × {{rate}})",
                })}
                value={formatPrice(subtotal, cur)}
                c={c}
              />
            )}
            <FeeRow
              label={t("payment.detail.labels.platformFee", {
                percent: feePercent,
                defaultValue: "Platform Fee ({{percent}}%)",
              })}
              value={`+ ${formatPrice(platformFee, cur)}`}
              c={c}
            />
            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <View style={[styles.feeRow, { color: c.green }]}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <FaGift size={10} color={c.green} />
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.green,
                      fontFamily: "DMSans_400Regular",
                    }}
                  >
                    {t("payment.detail.labels.referralBonus", "Referral bonus")}
                  </AppText>
                </View>
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.green,
                    fontFamily: "DMSans_700Bold",
                  }}
                >
                  − {formatPrice(discount, booking.currency)}
                </AppText>
              </View>
            )}
            <FeeTotal
              label={t("payment.detail.labels.youPay", "You Pay")}
              value={formatPrice(finalTotal, cur)}
              c={c}
            />
          </>
        )}

        {/* Referral slider */}
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
                <FaGift size={12} color={c.green} />
                <AppText style={[styles.referralTitle, { color: c.text }]}>
                  {t("payment.detail.referral.balanceLabel", {
                    amount: formatPrice(walletBalance, "NGN"),
                    defaultValue: "Referral Wallet Balance: {{amount}}",
                  })}
                </AppText>
              </View>
              <ReferralSlider
                value={referralPercent}
                onChange={onPercentChange}
                disabled={walletBalance <= 0}
                c={c}
              />
              <View style={styles.referralRow}>
                <AppText style={[styles.referralPercent, { color: c.orange }]}>
                  {referralPercent}%
                </AppText>
                <AppText style={[styles.referralAmount, { color: c.text }]}>
                  {formatPrice(referralAmount, "NGN")}
                </AppText>
                <Pressable
                  onPress={onReferralToggle}
                  disabled={referralAmount === 0}
                  style={({ pressed }) => [
                    styles.referralToggleBtn,
                    {
                      borderColor: referralApplied ? c.orange : c.border,
                      backgroundColor: referralApplied ? c.orange : c.bgCard,
                      opacity: referralAmount === 0 ? 0.4 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 11,
                      fontFamily: "DMSans_700Bold",
                      color: referralApplied ? "#fff" : c.textDim,
                    }}
                  >
                    {referralApplied
                      ? t("payment.detail.referral.remove", "Remove")
                      : t("payment.detail.referral.apply", "Apply")}
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}

        {/* No-referral info */}
        {!feeBreakdown.isActual && isHirer && walletBalance === 0 && (
          <View
            style={[
              styles.referralPerk,
              { backgroundColor: c.greenDim, borderColor: c.green },
            ]}
          >
            <FaInfoCircle size={10} color={c.green} style={{ marginTop: 3 }} />
            <AppText
              style={{
                fontSize: 9,
                color: c.green,
                flex: 1,
                lineHeight: 16,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t(
                "payment.detail.referral.noBonusYet",
                "You don't have any referral bonus yet. Invite friends to earn!",
              )}
            </AppText>
          </View>
        )}

        {/* Pay Now Banner */}
        {isHirer && paymentRequired && (
          <View style={[styles.payNowBanner, { borderTopColor: c.border }]}>
            {isPaymentPending && isBookingAccepted && (
              <View
                style={[
                  styles.paymentBannerPerk,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <FaClock size={10} color={c.orange} style={{ marginTop: 5 }} />
                <AppText
                  style={{
                    fontSize: 8,
                    color: c.text,
                    flex: 1,
                    lineHeight: 10,
                    fontFamily: "DMSans_400Regular",
                  }}
                >
                  <AppText
                    style={{ fontFamily: "DMSans_700Bold", fontSize: 10 }}
                  >
                    {t(
                      "payment.detail.payBanner.workerWaiting",
                      "Worker is waiting for you to complete payment.",
                    )}
                  </AppText>
                </AppText>
              </View>
            )}

            {walletBalance > 0 && booking.currency === "NGN" && (
              <View
                style={[
                  styles.paymentBannerPerk,
                  { backgroundColor: c.greenDim, borderColor: c.green },
                ]}
              >
                {referralApplied ? (
                  <>
                    <FaCheckCircle
                      size={10}
                      color={c.green}
                      style={{ marginTop: 2 }}
                    />
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.green,
                        flex: 1,
                        lineHeight: 16,
                        fontFamily: "DMSans_400Regular",
                      }}
                    >
                      {t("payment.detail.payBanner.referralApplied", {
                        amount: formatPrice(referralAmount, booking.currency),
                        defaultValue:
                          "Referral bonus of {{amount}} will be deducted at checkout",
                      })}
                    </AppText>
                  </>
                ) : (
                  <>
                    <FaGift
                      size={10}
                      color={c.green}
                      style={{ marginTop: 2 }}
                    />
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.green,
                        flex: 1,
                        lineHeight: 16,
                        fontFamily: "DMSans_400Regular",
                      }}
                    >
                      {t("payment.detail.payBanner.referralAvailable", {
                        amount: formatPrice(referralAmount, booking.currency),
                        defaultValue:
                          "Apply your {{amount}} referral bonus using the slider above",
                      })}
                    </AppText>
                  </>
                )}
              </View>
            )}

            <AppText
              style={{
                fontSize: 10,
                color: c.textMuted,
                lineHeight: 11,
                fontFamily: "DMSans_400Regular",
              }}
            >
              {t(
                "payment.detail.payBanner.refundPrefix",
                "By proceeding, you agree to our",
              )}{" "}
              <AppText
                onPress={() =>
                  Linking.openURL("https://skilledproz.com/refund-policy")
                }
                style={{
                  color: c.orange,
                  fontSize: 9,
                  textDecorationLine: "underline",
                  fontFamily: "DMSans_700Bold",
                }}
              >
                {t("payment.detail.payBanner.refundLink", "Refund Policy")}
              </AppText>
              {t(
                "payment.detail.payBanner.refundSuffix",
                ". Platform fees are non-refundable.",
              )}
            </AppText>

            <Pressable
              onPress={onTogglePayOptions}
              style={({ pressed }) => [
                styles.payNowBtn,
                {
                  backgroundColor: showPayOptions ? c.bgCard : c.orange,
                  borderWidth: showPayOptions ? 1 : 0,
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {showPayOptions ? (
                <>
                  <FaChevronUp size={10} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontFamily: "DMSans_700Bold",
                      color: c.textDim,
                    }}
                  >
                    {t(
                      "payment.detail.payBanner.hideOptions",
                      "Hide Payment Options",
                    )}
                  </AppText>
                </>
              ) : isPaymentPending ? (
                <>
                  <FaBolt size={10} color="#fff" />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontFamily: "DMSans_700Bold",
                      color: "#fff",
                    }}
                  >
                    {t(
                      "payment.detail.payBanner.chooseMethod",
                      "Choose a Different Method",
                    )}
                  </AppText>
                </>
              ) : (
                <>
                  <FaCreditCard size={10} color="#fff" />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontFamily: "DMSans_700Bold",
                      color: "#fff",
                    }}
                  >
                    {t("payment.detail.payBanner.payNow", "Pay Now")}
                  </AppText>
                </>
              )}
            </Pressable>

            {showPayOptions && (
              <View
                style={[
                  styles.paymentOptionsWrap,
                  { borderTopColor: c.orangeGlow },
                ]}
              >
                <Pressable
                  onPress={handleCardPay}
                  style={({ pressed }) => [
                    styles.cardBtn,
                    { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <FaCreditCard size={10} color="#fff" />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontFamily: "DMSans_700Bold",
                      color: "#fff",
                    }}
                  >
                    {t("payment.detail.payBanner.payByCard", "Pay by Card")}
                  </AppText>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderPaymentCard = () => {
    if (!payment) return null;

    const useBreakdown = feeBreakdown && !feeBreakdown.isActual;
    const cur =
      (useBreakdown ? feeBreakdown.currency : payment.currency) || "NGN";
    const cardFeePercent = getFeePercent(cur);

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

    const statusColor =
      {
        PENDING: "#fbbf24",
        HELD: "#818cf8",
        RELEASED: "#22c55e",
        REFUNDED: "#ef4444",
        FAILED: "#ef4444",
      }[payment.status] || c.textDim;

    return (
      <View
        style={[
          styles.paymentCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={[styles.receiptTitle, { color: c.textDim }]}>
          {t("payment.detail.receipt.title", "Payment")}
        </AppText>
        <PayRow
          label={t("payment.detail.receipt.total", "Total")}
          value={formatPrice(total, cur)}
          c={c}
        />
        <PayRow
          label={t("payment.detail.labels.platformFee", {
            percent: cardFeePercent,
            defaultValue: "Platform Fee ({{percent}}%)",
          })}
          value={formatPrice(platformFee, cur)}
          muted
          c={c}
        />
        <PayRow
          label={t("payment.detail.receipt.workerPayout", "Worker Payout")}
          value={formatPrice(workerPayout, cur)}
          green
          c={c}
        />
        <View style={[styles.paymentDivider, { borderTopColor: c.border }]} />
        <PayRow
          label={t("payment.detail.receipt.provider", "Provider")}
          value={payment.provider}
          capitalize
          c={c}
        />
        <PayRow
          label={t("payment.detail.receipt.status", "Status")}
          extra={
            <View
              style={[
                styles.payStatus,
                {
                  backgroundColor: `${statusColor}22`,
                  borderColor: `${statusColor}55`,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 9,
                  fontFamily: "DMSans_700Bold",
                  color: statusColor,
                  textTransform: "uppercase",
                }}
              >
                {t(
                  `payment.detail.status.${String(payment.status).toLowerCase()}`,
                  { defaultValue: payment.status },
                )}
              </AppText>
            </View>
          }
          c={c}
        />
        {payment.providerRef && (
          <PayRow
            label={t("payment.detail.receipt.ref", "Ref")}
            value={payment.providerRef}
            mono
            c={c}
          />
        )}
      </View>
    );
  };

  const isPending = !payment || payment.status === "PENDING";

  return <View>{isPending ? renderFeeBreakdown() : renderPaymentCard()}</View>;
}

const styles = StyleSheet.create({
  feeBreakdown: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 6,
  },
  feeBreakdownLabel: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  feeTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 6,
    borderTopWidth: 1,
    marginTop: 2,
  },
  referralSection: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
    gap: 6,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  referralTitle: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    flex: 1,
  },
  sliderBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sliderTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  sliderFill: {
    height: "100%",
  },
  referralRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  referralPercent: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    minWidth: 36,
  },
  referralAmount: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    flex: 1,
    textAlign: "right",
  },
  referralToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  referralPerk: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  payNowBanner: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  paymentBannerPerk: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  payNowBtn: {
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  paymentOptionsWrap: {
    gap: 6,
    paddingTop: 4,
    borderTopWidth: 1,
  },
  cardBtn: {
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  paymentCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 2,
  },
  receiptTitle: {
    fontSize: 10,
    fontFamily: "DMSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    paddingVertical: 3,
  },
  payLabel: {
    fontSize: 11,
    fontFamily: "DMSans_400Regular",
    flexShrink: 1,
  },
  payValue: {
    fontSize: 12,
    fontFamily: "DMSans_700Bold",
    textAlign: "right",
    flexShrink: 1,
  },
  payMuted: {
    fontFamily: "DMSans_400Regular",
  },
  payGreen: {
    fontFamily: "DMSans_700Bold",
  },
  payRef: {
    fontFamily: "monospace",
    fontSize: 10,
  },
  paymentDivider: {
    borderTopWidth: 1,
    marginVertical: 3,
  },
  payStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
});
