// src/components/booking/BookingDetailPayment.js
//
// Verbatim port of components/booking/BookingDetail/BookingDetailPayment.jsx
// (aka the modern web file you pasted at `import { Link } from "react-router-dom";`).
//
// Two render paths:
//   · payment PENDING (or missing) → renderFeeBreakdown()
//       - Worker branch OR Hirer branch
//       - Fixed-total view (job-post / negotiated) OR rate×qty view
//       - Referral slider (hirer only, NGN only, wallet > 0)
//       - Pay Now banner (hirer only, paymentRequired)
//   · payment HELD / RELEASED → renderPaymentCard() (receipt)
//
// Fee rate is always `getHirerFeeRate(currency) * 100` — no hardcoding.
// Numbers use Intl.NumberFormat with 2 fraction digits (matches web).

import React from "react";
import { Pressable, View } from "react-native";

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

// Mobile PaymentOptions sheet — lightweight stub; wire to your existing
// checkout flow later. Exports a component taking { booking, onSuccess,
// referralAmount, referralApplied, onReferralToggle }.
import PaymentOptions from "./PaymentOptions";

// ── Helpers ────────────────────────────────────────────────────────────
function getFeePercent(currency = "NGN") {
  return Math.round(getHirerFeeRate(currency) * 100);
}

function formatPrice(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Sub-components ─────────────────────────────────────────────────────
function PayRow({ label, value, muted, green, capitalize, mono, extra }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        gap: 8,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textDim, flexShrink: 1 }}>
        {label}
      </AppText>
      {extra ? (
        extra
      ) : (
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: green ? c.green : muted ? c.textDim : c.text,
            textTransform: capitalize ? "capitalize" : "none",
            fontFamily: mono ? "DMSans_400Regular" : undefined,
            textAlign: "right",
            flexShrink: 1,
          }}
        >
          {value}
        </AppText>
      )}
    </View>
  );
}

// ── Main component ─────────────────────────────────────────────────────
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
            hours: booking.estimatedValue == 1 ? "hour" : "hours",
            days: booking.estimatedValue == 1 ? "day" : "days",
            weeks: booking.estimatedValue == 1 ? "week" : "weeks",
            months: booking.estimatedValue == 1 ? "month" : "months",
            years: booking.estimatedValue == 1 ? "year" : "years",
            custom: "",
          }[booking.estimatedUnit] || booking.estimatedUnit
        }`
      : null;

  // ══════════════════════════════════════════════════════════════════════
  // renderFeeBreakdown — orange card + Pay Now banner
  // ══════════════════════════════════════════════════════════════════════
  const renderFeeBreakdown = () => {
    if (!feeBreakdown) return null;

    const isNegotiated = booking.isNegotiated && booking.negotiatedRate;
    const isFixedTotalView = isNegotiated || isJobPostBooking;

    // ── Worker view ────────────────────────────────────────────────
    if (isWorker) {
      const cur = feeBreakdown.currency || "NGN";
      const workerPayout = feeBreakdown.workerPayout || 0;
      const agreedRate = feeBreakdown.agreedRate || 0;

      return (
        <View
          style={{
            backgroundColor: c.bgCard,
            borderColor: c.orange,
            borderWidth: 1.5,
            borderRadius: 12,
            padding: 14,
            gap: 8,
          }}
        >
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: c.textMuted,
              marginBottom: 2,
            }}
          >
            {isNegotiated
              ? "Agreed Total (Negotiated)"
              : isJobPostBooking
                ? "Your Earnings (From Job Post)"
                : "Your Earnings"}
          </AppText>

          {isFixedTotalView ? (
            <>
              <FeeRow
                label={isNegotiated ? "Agreed Total" : "Selected Amount"}
                value={formatPrice(agreedRate, cur)}
              />
              {isJobPostBooking && realDurationText && (
                <FeeRow
                  label="Duration"
                  value={
                    <>
                      {realDurationText}
                      {booking.estimatedHours ? (
                        <AppText
                          style={{
                            color: c.textMuted,
                            fontSize: 11,
                            marginLeft: 4,
                          }}
                        >
                          (≈ {booking.estimatedHours}h)
                        </AppText>
                      ) : null}
                    </>
                  }
                />
              )}
              <FeeRow
                label={`Platform Fee (${feePercent}%)`}
                value={`+ ${formatPrice(feeBreakdown.platformFee || 0, cur)}`}
              />
              <FeeTotal
                label="You Earn"
                value={formatPrice(workerPayout, cur)}
              />
            </>
          ) : (
            <>
              <FeeRow
                label="Agreed Rate"
                value={`${formatPrice(agreedRate, cur)}${
                  { hours: "/hr", days: "/day", weeks: "/wk", months: "/mo" }[
                    feeBreakdown.estimatedUnit
                  ] || ""
                }`}
              />
              {feeBreakdown.hasQty && (
                <FeeRow
                  label="Duration"
                  value={`${feeBreakdown.qty} ${feeBreakdown.unitLabel}${feeBreakdown.qty !== 1 ? "s" : ""}`}
                />
              )}
              {feeBreakdown.hasQty && (
                <FeeRow
                  label={`Subtotal (${feeBreakdown.qty} × ${formatPrice(agreedRate, cur)})`}
                  value={formatPrice(feeBreakdown.subtotal || 0, cur)}
                />
              )}
              <FeeRow
                label={`Platform Fee (${feePercent}%)`}
                value={`+ ${formatPrice(feeBreakdown.platformFee || 0, cur)}`}
              />
              <FeeTotal
                label="You Earn"
                value={formatPrice(workerPayout, cur)}
              />
            </>
          )}
        </View>
      );
    }

    // ── Hirer view ─────────────────────────────────────────────────
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
        style={{
          backgroundColor: c.bgCard,
          borderColor: c.orange,
          borderWidth: 1.5,
          borderRadius: 12,
          padding: 14,
          gap: 8,
        }}
      >
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 0.8,
            color: c.textMuted,
            marginBottom: 2,
          }}
        >
          {isNegotiated
            ? "Agreed Total (Negotiated)"
            : isJobPostBooking
              ? "Payment Breakdown (From Job Post)"
              : "Payment Breakdown"}
        </AppText>

        {isFixedTotalView ? (
          <>
            <FeeRow
              label={isNegotiated ? "Agreed Total" : "Selected Amount"}
              value={formatPrice(agreedRate, cur)}
            />
            {isJobPostBooking && realDurationText && (
              <FeeRow
                label="Duration"
                value={
                  <>
                    {realDurationText}
                    {booking.estimatedHours ? (
                      <AppText
                        style={{
                          color: c.textMuted,
                          fontSize: 11,
                          marginLeft: 4,
                        }}
                      >
                        (≈ {booking.estimatedHours}h)
                      </AppText>
                    ) : null}
                  </>
                }
              />
            )}
            {isNegotiated && (feeBreakdown.hasQty || isCustom) && (
              <FeeRow
                label="Duration"
                value={`${feeBreakdown.qty} ${feeBreakdown.unitLabel}${feeBreakdown.qty !== 1 ? "s" : ""}`}
              />
            )}
            <FeeRow
              label={`Platform Fee (${feePercent}%)`}
              value={`+ ${formatPrice(platformFee, cur)}`}
            />
            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <FaGift size={11} color={c.green} />
                  <AppText
                    style={{ fontSize: 12, color: c.green, fontWeight: "600" }}
                  >
                    Referral bonus
                  </AppText>
                </View>
                <AppText
                  style={{ fontSize: 12, color: c.green, fontWeight: "600" }}
                >
                  − {formatPrice(discount, booking.currency)}
                </AppText>
              </View>
            )}
            <FeeTotal label="You Pay" value={formatPrice(finalTotal, cur)} />
          </>
        ) : (
          <>
            <FeeRow
              label="Agreed Rate"
              value={`${formatPrice(agreedRate, cur)}${
                { hours: "/hr", days: "/day", weeks: "/wk", months: "/mo" }[
                  feeBreakdown.estimatedUnit
                ] || ""
              }`}
            />
            {(feeBreakdown.hasQty || isCustom) && (
              <FeeRow
                label="Duration"
                value={`${feeBreakdown.qty} ${feeBreakdown.unitLabel}${feeBreakdown.qty !== 1 ? "s" : ""}`}
              />
            )}
            {(feeBreakdown.hasQty || isCustom) && (
              <FeeRow
                label={`Subtotal (${feeBreakdown.qty} × ${formatPrice(agreedRate, cur)})`}
                value={formatPrice(subtotal, cur)}
              />
            )}
            <FeeRow
              label={`Platform Fee (${feePercent}%)`}
              value={`+ ${formatPrice(platformFee, cur)}`}
            />
            {referralApplied && discount > 0 && booking.currency === "NGN" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingVertical: 4,
                }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <FaGift size={11} color={c.green} />
                  <AppText
                    style={{ fontSize: 12, color: c.green, fontWeight: "600" }}
                  >
                    Referral bonus
                  </AppText>
                </View>
                <AppText
                  style={{ fontSize: 12, color: c.green, fontWeight: "600" }}
                >
                  − {formatPrice(discount, booking.currency)}
                </AppText>
              </View>
            )}
            <FeeTotal label="You Pay" value={formatPrice(finalTotal, cur)} />
          </>
        )}

        {/* Referral slider */}
        {!feeBreakdown.isActual &&
          isHirer &&
          walletBalance > 0 &&
          booking.currency === "NGN" && (
            <View
              style={{
                backgroundColor: c.bgCard,
                borderColor: c.border,
                borderWidth: 1,
                borderRadius: 10,
                padding: 12,
                marginTop: 8,
                gap: 8,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <FaGift size={14} color={c.green} />
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.text,
                    flex: 1,
                  }}
                >
                  Referral Wallet Balance: {formatPrice(walletBalance, "NGN")}
                </AppText>
              </View>
              <ReferralSlider
                value={referralPercent}
                onChange={onPercentChange}
                disabled={walletBalance <= 0}
              />
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: c.orange,
                    minWidth: 44,
                  }}
                >
                  {referralPercent}%
                </AppText>
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.text,
                    flex: 1,
                    textAlign: "right",
                  }}
                >
                  {formatPrice(referralAmount, "NGN")}
                </AppText>
                <Pressable
                  onPress={onReferralToggle}
                  disabled={referralAmount === 0}
                  style={({ pressed }) => [
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: referralApplied ? c.orange : c.border,
                      backgroundColor: referralApplied ? c.orange : c.bgCard,
                      opacity: referralAmount === 0 ? 0.4 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: referralApplied ? "#fff" : c.textDim,
                    }}
                  >
                    {referralApplied ? "Remove" : "Apply"}
                  </AppText>
                </Pressable>
              </View>
            </View>
          )}

        {/* No-referral info box */}
        {!feeBreakdown.isActual && isHirer && walletBalance === 0 && (
          <View
            style={{
              backgroundColor: c.greenDim,
              borderColor: c.green,
              borderWidth: 1,
              borderStyle: "dashed",
              borderRadius: 8,
              padding: 10,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 6,
              marginTop: 4,
            }}
          >
            <FaInfoCircle size={12} color={c.green} style={{ marginTop: 1 }} />
            <AppText
              style={{ fontSize: 12, color: c.green, flex: 1, lineHeight: 18 }}
            >
              You don't have any referral bonus yet. Invite friends to earn!
            </AppText>
          </View>
        )}

        {/* Pay Now banner */}
        {isHirer && paymentRequired && (
          <View
            style={{
              marginTop: 12,
              borderTopColor: c.border,
              borderTopWidth: 1,
              paddingTop: 12,
              gap: 10,
            }}
          >
            {isPaymentPending && isBookingAccepted && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 6,
                  backgroundColor: c.orangeDim,
                  borderColor: c.orange,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                <FaClock size={12} color={c.orange} style={{ marginTop: 2 }} />
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.text,
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  <AppText style={{ fontWeight: "700" }}>
                    Worker is waiting for you to complete payment.
                  </AppText>
                </AppText>
              </View>
            )}

            {walletBalance > 0 && booking.currency === "NGN" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 6,
                  backgroundColor: c.greenDim,
                  borderColor: c.green,
                  borderWidth: 1,
                  borderStyle: "dashed",
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                {referralApplied ? (
                  <>
                    <FaCheckCircle
                      size={12}
                      color={c.green}
                      style={{ marginTop: 2 }}
                    />
                    <AppText
                      style={{
                        fontSize: 12,
                        color: c.green,
                        flex: 1,
                        lineHeight: 18,
                      }}
                    >
                      Referral bonus of{" "}
                      {formatPrice(referralAmount, booking.currency)} will be
                      deducted at checkout
                    </AppText>
                  </>
                ) : (
                  <>
                    <FaGift
                      size={12}
                      color={c.green}
                      style={{ marginTop: 2 }}
                    />
                    <AppText
                      style={{
                        fontSize: 12,
                        color: c.green,
                        flex: 1,
                        lineHeight: 18,
                      }}
                    >
                      Apply your {formatPrice(referralAmount, booking.currency)}{" "}
                      referral bonus using the slider above
                    </AppText>
                  </>
                )}
              </View>
            )}

            <AppText
              style={{ fontSize: 12, color: c.textMuted, lineHeight: 17 }}
            >
              By proceeding, you agree to our{" "}
              <AppText
                style={{
                  color: c.orange,
                  textDecorationLine: "underline",
                  fontWeight: "600",
                }}
              >
                Refund Policy
              </AppText>
              . Platform fees are non-refundable.
            </AppText>

            <Pressable
              onPress={onTogglePayOptions}
              style={({ pressed }) => [
                {
                  width: "100%",
                  paddingVertical: 12,
                  borderRadius: 9,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: showPayOptions ? c.bgCard : c.orange,
                  borderWidth: showPayOptions ? 1 : 0,
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              {showPayOptions ? (
                <>
                  <FaChevronUp size={12} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: c.textDim,
                    }}
                  >
                    Hide Payment Options
                  </AppText>
                </>
              ) : isPaymentPending ? (
                <>
                  <FaBolt size={12} color="#fff" />
                  <AppText
                    style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
                  >
                    Choose a Different Method
                  </AppText>
                </>
              ) : (
                <>
                  <FaCreditCard size={12} color="#fff" />
                  <AppText
                    style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
                  >
                    Pay Now
                  </AppText>
                </>
              )}
            </Pressable>

            {showPayOptions && (
              <View
                style={{
                  gap: 8,
                  paddingTop: 4,
                  borderTopColor: "rgba(249,115,22,0.2)",
                  borderTopWidth: 1,
                }}
              >
                <Pressable
                  onPress={() => {
                    if (onSuccess) onSuccess("Opening card checkout…");
                  }}
                  style={({ pressed }) => [
                    {
                      height: 42,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 6,
                      backgroundColor: c.orange,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <FaCreditCard size={12} color="#fff" />
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                  >
                    Pay by Card
                  </AppText>
                </Pressable>
                <PaymentOptions
                  booking={booking}
                  referralAmount={referralApplied ? referralAmount : 0}
                  referralApplied={referralApplied}
                  onReferralToggle={onReferralToggle}
                  onSuccess={() => {
                    if (onSuccess) onSuccess("Payment submitted successfully.");
                    onTogglePayOptions();
                    if (refetch) refetch();
                  }}
                />
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // renderPaymentCard — receipt view (HELD / RELEASED / REFUNDED / FAILED)
  // ══════════════════════════════════════════════════════════════════════
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
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
          gap: 4,
        }}
      >
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "700",
            textTransform: "uppercase",
            letterSpacing: 1,
            color: c.textDim,
            marginBottom: 10,
          }}
        >
          Payment
        </AppText>
        <PayRow label="Total" value={formatPrice(total, cur)} />
        <PayRow
          label={`Platform Fee (${cardFeePercent}%)`}
          value={formatPrice(platformFee, cur)}
          muted
        />
        <PayRow
          label="Worker Payout"
          value={formatPrice(workerPayout, cur)}
          green
        />
        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }}
        />
        <PayRow label="Provider" value={payment.provider} capitalize />
        <PayRow
          label="Status"
          extra={
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 2,
                borderRadius: 10,
                backgroundColor: `${statusColor}22`,
                borderColor: `${statusColor}55`,
                borderWidth: 1,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: statusColor,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                }}
              >
                {payment.status}
              </AppText>
            </View>
          }
        />
        {payment.providerRef ? (
          <PayRow label="Ref" value={payment.providerRef} mono />
        ) : null}
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════════════════
  // Final return — mirrors web switch
  // ══════════════════════════════════════════════════════════════════════
  const isPending = !payment || payment.status === "PENDING";

  return (
    <View>
      {isPending && renderFeeBreakdown()}
      {!isPending && renderPaymentCard()}
    </View>
  );
}

// ── Tiny local sub-components ──────────────────────────────────────────
function FeeRow({ label, value }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
      }}
    >
      <AppText style={{ fontSize: 13, color: c.textDim, flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText
        style={{
          fontSize: 13,
          color: c.text,
          textAlign: "right",
          flexShrink: 1,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function FeeTotal({ label, value }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
        paddingTop: 8,
        borderTopColor: c.border,
        borderTopWidth: 1,
        marginTop: 2,
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: "700", color: c.text }}>
        {label}
      </AppText>
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 20,
          fontWeight: "800",
          color: c.orange,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

// ── Referral slider — replaces web `<input type="range">` with +/− steps ─
function ReferralSlider({ value, onChange, disabled }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const step = 5;

  const dec = () => {
    if (disabled) return;
    onChange(Math.max(0, Number(value) - step));
  };
  const inc = () => {
    if (disabled) return;
    onChange(Math.min(100, Number(value) + step));
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable
        onPress={dec}
        disabled={disabled || Number(value) <= 0}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled || Number(value) <= 0 ? 0.4 : 1,
        }}
      >
        <AppText style={{ fontSize: 18, color: c.text, lineHeight: 20 }}>
          −
        </AppText>
      </Pressable>
      <View
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.min(100, Math.max(0, Number(value)))}%`,
            backgroundColor: c.orange,
          }}
        />
      </View>
      <Pressable
        onPress={inc}
        disabled={disabled || Number(value) >= 100}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled || Number(value) >= 100 ? 0.4 : 1,
        }}
      >
        <AppText style={{ fontSize: 18, color: c.text, lineHeight: 20 }}>
          +
        </AppText>
      </Pressable>
    </View>
  );
}
