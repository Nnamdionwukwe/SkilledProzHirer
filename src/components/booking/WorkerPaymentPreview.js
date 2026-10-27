// src/components/booking/WorkerPaymentPreview.js
//
// Verbatim port of components/booking/BookingDetail/WorkerPaymentPreview.jsx.
//
// Renders only when `isWorker` is true — the parent screen guards this too
// (only shows for `isWorker && booking.status === "PENDING"`), but we keep
// the internal guard for safety.
//
// Shows:
//   · Header "Your Earnings Estimate" (or "Your Earnings (From Job Post)")
//   · Agreed Rate (direct bookings) OR Agreed Total (job-post)
//   · Duration (real duration for job-post, qty×unit for direct)
//   · Subtotal (direct bookings only, when hasQty)
//   · Negotiated Rate row (if booking.isNegotiated)
//   · Platform Fee (paid by hirer)
//   · You Earn (total payout)
//   · Info note — "platform fee is covered by the hirer"
//
// All numbers go through `calcPricing(booking)` and use the currency-aware
// `getHirerFeeRate(currency)` — NGN 2%, foreign 5%.

import React from "react";
import { StyleSheet, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { calcPricing, getHirerFeeRate } from "../../utils/pricing";
import { FaMoneyBillWave, FaHandshake, FaInfoCircle } from "../../icons/fa";

function formatPrice(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function WorkerPaymentPreview({ booking, isWorker }) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (!isWorker) return null;

  const p = calcPricing(booking);
  const currency = p.currency || "NGN";
  const subtotal = p.subtotal;
  const platformFee = p.hirerFee;
  const workerPayout = p.workerPayout;

  // Currency-aware fee percent (NGN 2%, foreign 5%)
  const feePercent = Math.round(getHirerFeeRate(currency) * 100);

  const unitLabel = p.unitLabel || "unit";
  const unitSuffix = p.unitSuffix || "";

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

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <FaMoneyBillWave size={16} color={c.green} />
        <AppText style={[styles.title, { color: c.text }]} numberOfLines={2}>
          {isJobPostBooking
            ? "Your Earnings (From Job Post)"
            : "Your Earnings Estimate"}
        </AppText>
        <View
          style={[
            styles.badge,
            {
              backgroundColor: c.orangeDim,
              borderColor: c.orangeGlow,
            },
          ]}
        >
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "700",
              color: c.orange,
              letterSpacing: 0.5,
              textTransform: "uppercase",
            }}
          >
            Before accepting
          </AppText>
        </View>
      </View>

      {/* Body rows */}
      <View style={{ gap: 6 }}>
        {/* Agreed Rate / Total */}
        <Row
          label={isJobPostBooking ? "Agreed Total" : "Agreed Rate"}
          value={`${formatPrice(p.agreedRate, currency)}${
            !isJobPostBooking ? unitSuffix : ""
          }`}
        />

        {/* Real duration for job-post bookings */}
        {isJobPostBooking && realDurationText ? (
          <Row
            label="Duration"
            value={
              <AppText style={{ fontSize: 13, color: c.text }}>
                {realDurationText}
                {booking.estimatedHours ? (
                  <AppText style={{ color: c.textMuted, fontSize: 11 }}>
                    {" "}
                    (≈ {booking.estimatedHours}h)
                  </AppText>
                ) : null}
              </AppText>
            }
          />
        ) : null}

        {/* Duration & subtotal for direct bookings */}
        {!isJobPostBooking && p.hasQty ? (
          <Row
            label="Duration"
            value={`${p.qty} ${unitLabel}${p.qty !== 1 ? "s" : ""}`}
          />
        ) : null}

        {!isJobPostBooking && p.hasQty ? (
          <Row
            label={`Subtotal (${p.qty} × ${formatPrice(p.agreedRate, currency)})`}
            value={formatPrice(subtotal, currency)}
          />
        ) : null}

        {/* Negotiated rate row */}
        {booking.isNegotiated && booking.negotiatedRate ? (
          <View style={styles.row}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <FaHandshake size={11} color={c.textDim} />
              <AppText style={{ fontSize: 13, color: c.textDim }}>
                Negotiated Rate
              </AppText>
            </View>
            <AppText style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
              {formatPrice(booking.negotiatedRate, currency)}
              {!isJobPostBooking ? unitSuffix : ""}
            </AppText>
          </View>
        ) : null}

        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }}
        />

        {/* Platform Fee — paid by hirer */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 13, color: c.textDim }}>
              Platform Fee ({feePercent}%)
            </AppText>
            <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 1 }}>
              (paid by hirer)
            </AppText>
          </View>
          <AppText style={{ fontSize: 13, fontWeight: "600", color: c.text }}>
            + {formatPrice(platformFee, currency)}
          </AppText>
        </View>

        <View
          style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }}
        />

        {/* Total */}
        <View style={styles.row}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <FaMoneyBillWave size={13} color={c.text} />
            <AppText style={{ fontSize: 15, fontWeight: "700", color: c.text }}>
              You Earn
            </AppText>
          </View>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 20,
              fontWeight: "800",
              color: c.green,
            }}
          >
            {formatPrice(workerPayout, currency)}
          </AppText>
        </View>

        {/* Info note */}
        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: "rgba(34,197,94,0.06)",
              borderColor: "rgba(34,197,94,0.15)",
            },
          ]}
        >
          <FaInfoCircle size={12} color={c.green} style={{ marginTop: 2 }} />
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              flex: 1,
              marginLeft: 8,
              lineHeight: 17,
            }}
          >
            This is the amount you will receive after the job is completed and
            the hirer releases payment. The platform fee is covered by the
            hirer.
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Row({ label, value }) {
  const { theme } = useTheme();
  const c = theme.colors;
  return (
    <View style={styles.row}>
      <AppText style={{ fontSize: 13, color: c.textDim, flexShrink: 1 }}>
        {label}
      </AppText>
      {typeof value === "string" ? (
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: c.text,
            textAlign: "right",
            flexShrink: 1,
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

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginTop: 10,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontFamily: "Syne_700Bold",
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
    minWidth: 0,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
  noteBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
});
