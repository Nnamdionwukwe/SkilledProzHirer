// src/screens/main/RefundDetailScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  FaArrowLeft,
  FaMoneyBillWave,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaFileInvoice,
  FaInfoCircle,
  FaDownload,
} from "../../icons/fa";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

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

export default function RefundDetailScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const route = useRoute();
  const navigation = useNavigation();
  const { refundId } = route.params || {};

  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`/refunds/${refundId}`);
        setRefund(res.data.data.refund);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to load refund");
      } finally {
        setLoading(false);
      }
    })();
  }, [refundId]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={c.orange} />
      </View>
    );
  }

  if (error || !refund) {
    return (
      <View style={[styles.empty, { backgroundColor: c.bg }]}>
        <FaExclamationTriangle size={32} color="#ef4444" />
        <AppText weight="bold" style={{ marginTop: 12 }}>
          {error || "Refund not found"}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { borderColor: c.border }]}
        >
          <FaArrowLeft size={11} color={c.textDim} />
          <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
            Back
          </AppText>
        </Pressable>
      </View>
    );
  }

  const cfg = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
  const Icon = cfg.icon;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            alignSelf: "flex-start",
          }}
        >
          <FaArrowLeft size={12} color={c.textDim} />
          <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
            Back to Refunds
          </AppText>
        </Pressable>

        <AppText
          variant="title"
          weight="displayBlack"
          style={{ fontSize: 22, marginBottom: 4 }}
        >
          Refund Details
        </AppText>

        {/* Status banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: `${cfg.color}22`, borderColor: cfg.color },
          ]}
        >
          <Icon size={20} color={cfg.color} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText
              variant="small"
              tone="dim"
              style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
            >
              Status
            </AppText>
            <AppText weight="bold" style={{ color: cfg.color }}>
              {cfg.label}
            </AppText>
          </View>
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

        {/* Refund info */}
        <Section
          title="Refund Information"
          icon={<FaMoneyBillWave size={12} color={c.orange} />}
        >
          <Row
            label="Amount"
            value={`${refund.currency} ${Number(refund.amount || 0).toLocaleString()}`}
            accent
          />
          <Row
            label="Type"
            value={refund.refundType?.replace("_", " ") || "—"}
          />
          {refund.percentage && (
            <Row label="Percentage" value={`${refund.percentage}%`} />
          )}
          <Row
            label="Platform Fee Refunded"
            value={`${refund.currency} ${Number(refund.platformFeeRefunded || 0).toLocaleString()}`}
          />
          <Row
            label="Worker Deducted"
            value={`${refund.currency} ${Number(refund.workerAmountDeducted || 0).toLocaleString()}`}
          />
        </Section>

        <Section
          title="Booking Information"
          icon={<FaFileInvoice size={12} color={c.orange} />}
        >
          <Row label="Booking" value={refund.booking?.title || "—"} />
          <Row
            label="Hirer"
            value={
              `${refund.hirer?.firstName || ""} ${refund.hirer?.lastName || ""}`.trim() ||
              "—"
            }
          />
          <Row
            label="Worker"
            value={
              `${refund.worker?.firstName || ""} ${refund.worker?.lastName || ""}`.trim() ||
              "—"
            }
          />
          <Row
            label="Original Payment"
            value={`${refund.payment?.provider || "—"} - ${refund.payment?.providerRef || "—"}`}
          />
        </Section>

        <Section title="Timeline" icon={<FaClock size={12} color={c.orange} />}>
          <Row
            label="Requested"
            value={new Date(refund.createdAt).toLocaleString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          {refund.processedAt && (
            <Row
              label="Processed"
              value={new Date(refund.processedAt).toLocaleString()}
            />
          )}
        </Section>

        <Section
          title="Reason & Notes"
          icon={<FaInfoCircle size={12} color={c.orange} />}
        >
          <Row label="Reason" value={refund.reason || "—"} />
          {refund.adminNotes && (
            <Row label="Admin Notes" value={refund.adminNotes} />
          )}
        </Section>

        {refund.status === "COMPLETED" && (
          <Pressable
            style={[styles.downloadBtn, { backgroundColor: c.orange }]}
            onPress={() => {
              /* TODO: generate receipt PDF via BookingInvoice util */
            }}
          >
            <FaDownload size={12} color={c.bg} />
            <AppText
              variant="small"
              weight="bold"
              style={{ color: c.bg, marginLeft: 6 }}
            >
              Download Receipt
            </AppText>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, icon, children }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
        }}
      >
        {icon}
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={{ textTransform: "uppercase", letterSpacing: 0.8 }}
        >
          {title}
        </AppText>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

function Row({ label, value, accent }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
      }}
    >
      <AppText variant="small" tone="dim">
        {label}
      </AppText>
      <AppText
        variant={accent ? "title" : "small"}
        weight="bold"
        style={[
          { textAlign: "right", flexShrink: 1 },
          accent && { color: c.orange, fontSize: 16 },
        ]}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 16,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  refBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  section: { padding: 16, borderRadius: 14, borderWidth: 1 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
});
