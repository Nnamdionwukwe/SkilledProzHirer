// src/components/booking/Refund/RefundHistory.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaChevronRight,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaCalendarAlt,
} from "../../../icons/fa";

import AppText from "../../AppText";
import { useTheme } from "../../../contexts/ThemeContext";

const STATUS_CONFIG = {
  PENDING: { icon: FaClock, color: "#fbbf24", label: "Pending Review" },
  APPROVED: { icon: FaCheckCircle, color: "#22c55e", label: "Approved" },
  PROCESSING: { icon: FaSpinner, color: "#818cf8", label: "Processing" },
  COMPLETED: { icon: FaCheckCircle, color: "#22c55e", label: "Completed" },
  FAILED: { icon: FaTimesCircle, color: "#ef4444", label: "Failed" },
  REJECTED: { icon: FaTimesCircle, color: "#ef4444", label: "Rejected" },
  DISPUTED: {
    icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
  },
};

export default function RefundHistory({ refunds, onPressItem }) {
  const { theme: th } = useTheme();
  const c = th.colors;

  if (!refunds?.length) return null;

  return (
    <View style={{ gap: 8 }}>
      {refunds.map((refund) => {
        const cfg = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
        const Icon = cfg.icon;
        return (
          <Pressable
            key={refund.id}
            onPress={() => onPressItem?.(refund)}
            style={[
              styles.item,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View
              style={[
                styles.icon,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaMoneyBillWave size={14} color={c.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <AppText
                  weight="bold"
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {refund.booking?.title || "Booking Refund"}
                </AppText>
                <View
                  style={[
                    styles.refBadge,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 10,
                      color: c.textMuted,
                      fontFamily: "monospace",
                    }}
                  >
                    {refund.reference}
                  </AppText>
                </View>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  marginTop: 4,
                  flexWrap: "wrap",
                }}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: c.orange }}
                >
                  {refund.currency}{" "}
                  {Number(refund.amount || 0).toLocaleString()}
                </AppText>
                <AppText variant="small" tone="dim">
                  {refund.refundType?.replace("_", " ") || "Refund"}
                </AppText>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                >
                  <FaCalendarAlt size={10} color={c.textMuted} />
                  <AppText variant="small" tone="dim">
                    {new Date(refund.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </AppText>
                </View>
              </View>
            </View>
            <View style={{ alignItems: "flex-end", gap: 4 }}>
              <View
                style={[
                  styles.badge,
                  { borderColor: cfg.color, backgroundColor: `${cfg.color}22` },
                ]}
              >
                <Icon size={9} color={cfg.color} />
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: cfg.color, marginLeft: 4, fontSize: 10 }}
                >
                  {cfg.label}
                </AppText>
              </View>
              <FaChevronRight size={10} color={c.textMuted} />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  refBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
});
