// src/components/booking/Refund/RefundStatus.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSpinner,
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

export default function RefundStatus({ refund, onViewDetails, isHirer }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  if (!refund) return null;

  const config = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText variant="small" weight="bold" tone="dim" style={styles.title}>
        Refund
      </AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: `${config.color}22`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={config.color} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText weight="bold" style={{ color: config.color }}>
            {config.label}
          </AppText>
          <AppText variant="small" tone="dim">
            {isHirer
              ? "Your refund is being processed."
              : "The refund for this booking is being processed."}
          </AppText>
        </View>
      </View>

      <View style={{ gap: 6, marginTop: 12 }}>
        <Row label="Reference" value={refund.reference} />
        <Row
          label="Amount"
          value={`${refund.currency} ${Number(refund.amount || 0).toLocaleString()}`}
        />
        <Row label="Type" value={refund.refundType?.replace("_", " ")} />
        <Row
          label="Requested"
          value={new Date(refund.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        />
        {refund.processedAt && (
          <Row
            label="Processed"
            value={new Date(refund.processedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />
        )}
      </View>

      {refund.adminNotes ? (
        <View
          style={[
            styles.note,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          <AppText variant="small" weight="bold" tone="dim">
            Admin Note:
          </AppText>
          <AppText variant="small" tone="dim">
            {refund.adminNotes}
          </AppText>
        </View>
      ) : null}

      <Pressable
        onPress={() => onViewDetails?.(refund)}
        style={[styles.viewBtn, { borderColor: c.orange }]}
      >
        <AppText variant="small" weight="bold" style={{ color: c.orange }}>
          View Full Details
        </AppText>
      </Pressable>
    </View>
  );
}

function Row({ label, value }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <AppText variant="small" tone="dim">
        {label}
      </AppText>
      <AppText variant="small" weight="semibold">
        {value || "—"}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 14, borderWidth: 1 },
  title: { textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 10 },
  note: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 10, gap: 4 },
  viewBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
});
