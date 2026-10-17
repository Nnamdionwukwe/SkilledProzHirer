import React from "react";
import { View, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { FaMoneyBillWave, FaInfoCircle, FaHandshake } from "../../icons/fa";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { calcPricing, HIRER_FEE_RATE } from "../../utils/pricing";

function formatPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WorkerPaymentPreview({ booking }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  if (!booking) return null;

  const p = calcPricing(booking);
  const currency = p.currency || "NGN";
  const isJobPostBooking = booking?.source === "JOB_POST";

  const realDurationText =
    booking?.estimatedValue && booking?.estimatedUnit
      ? `${booking.estimatedValue} ${booking.estimatedValue == 1 ? booking.estimatedUnit.slice(0, -1) : booking.estimatedUnit}`
      : null;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View style={styles.header}>
        <FaMoneyBillWave size={20} color="#22c55e" style={{ marginRight: 8 }} />
        <AppText weight="bold" style={{ flex: 1, fontSize: 16 }}>
          {isJobPostBooking
            ? t("booking.payment.yourEarningsJobPost")
            : t("booking.payment.yourEarnings")}
        </AppText>
        <View
          style={[
            styles.badge,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          <AppText style={{ fontSize: 9, color: c.orange, fontWeight: "bold" }}>
            Before accepting
          </AppText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.row}>
          <AppText tone="dim">
            {isJobPostBooking
              ? t("booking.payment.agreedTotal")
              : t("booking.payment.agreedRate")}
          </AppText>
          <AppText weight="semibold">
            {formatPrice(p.agreedRate, currency)}
            {!isJobPostBooking && p.unitSuffix}
          </AppText>
        </View>

        {isJobPostBooking && realDurationText && (
          <View style={styles.row}>
            <AppText tone="dim">Duration</AppText>
            <AppText weight="semibold">
              {realDurationText}
              {booking.estimatedHours && ` (≈ ${booking.estimatedHours}h)`}
            </AppText>
          </View>
        )}

        {!isJobPostBooking && p.hasQty && (
          <View style={styles.row}>
            <AppText tone="dim">Duration</AppText>
            <AppText weight="semibold">
              {p.qty} {p.unitLabel}
              {p.qty !== 1 ? "s" : ""}
            </AppText>
          </View>
        )}

        {!isJobPostBooking && p.hasQty && (
          <View style={styles.row}>
            <AppText tone="dim">
              {t("booking.payment.subtotal")} ({p.qty} ×{" "}
              {formatPrice(p.agreedRate, currency)})
            </AppText>
            <AppText weight="semibold">
              {formatPrice(p.subtotal, currency)}
            </AppText>
          </View>
        )}

        {booking.isNegotiated && booking.negotiatedRate && (
          <View style={styles.row}>
            <AppText tone="dim">
              <FaHandshake size={12} /> Negotiated Rate
            </AppText>
            <AppText weight="semibold">
              {formatPrice(booking.negotiatedRate, currency)}
              {!isJobPostBooking && p.unitSuffix}
            </AppText>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.row}>
          <AppText tone="dim">
            {t("booking.payment.platformFee")} ({HIRER_FEE_RATE * 100}%){" "}
            <AppText style={{ fontSize: 10, color: c.textMuted }}>
              {t("booking.payment.paidByHirer")}
            </AppText>
          </AppText>
          <AppText weight="semibold">
            + {formatPrice(p.hirerFee, currency)}
          </AppText>
        </View>

        <View style={[styles.divider, { backgroundColor: c.border }]} />

        <View style={styles.row}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <FaMoneyBillWave size={14} color={c.text} />
            <AppText weight="bold" style={{ fontSize: 16 }}>
              {t("booking.payment.youEarn")}
            </AppText>
          </View>
          <AppText
            weight="displayBlack"
            style={{ color: "#22c55e", fontSize: 20 }}
          >
            {formatPrice(p.workerPayout, currency)}
          </AppText>
        </View>

        <View
          style={[
            styles.noteBox,
            {
              backgroundColor: "rgba(34,197,94,0.06)",
              borderColor: "rgba(34,197,94,0.15)",
            },
          ]}
        >
          <FaInfoCircle size={14} color="#22c55e" style={{ marginTop: 2 }} />
          <AppText variant="small" tone="dim" style={{ flex: 1 }}>
            {t("booking.payment.estimateNote")}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  body: { gap: 10 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  divider: { height: 1, marginVertical: 4 },
  noteBox: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    gap: 8,
  },
});
