// src/screens/main/RefundHistoryScreen.js
// Shared between Hirer and Worker. Uses the modern floating-card styling.
//
// Endpoints:
//   GET /worker/refunds/summary
//   GET /worker/refunds?page&limit&status&refundType
//   GET /worker/refunds/:id

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

// ⚠️ Path fix — from src/screens/main/RefundHistoryScreen.js,
// ../../ resolves to src/, so:
//   ../../components/AppText  → src/components/AppText   ✅
//   ../../contexts/ThemeContext → src/contexts/ThemeContext ✅
import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

const SYMBOL_MAP = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
  KES: "KSh ",
  ZAR: "R ",
  TZS: "TSh ",
  UGX: "USh ",
  CAD: "CA$",
  AUD: "A$",
  INR: "₹",
  USDC: "USDC ",
  USDT: "USDT ",
  BTC: "₿ ",
  ETH: "Ξ ",
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtMoney(amount, currency = "NGN") {
  const n = Number(amount ?? 0);
  const code = (currency || "NGN").toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      currencyDisplay: "narrowSymbol", // ✅ "₦500.00", "$500.00", "€500.00"
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    // Fallback for unknown codes (crypto etc.) — use the symbol map
    return `${SYMBOL_MAP[code] || code} ${n.toLocaleString("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_META = {
  PENDING: { label: "Pending", color: "#facc15", bg: "rgba(234,179,8,0.12)" },
  APPROVED: {
    label: "Approved",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
  },
  PROCESSING: {
    label: "Processing",
    color: "#a78bfa",
    bg: "rgba(139,92,246,0.12)",
  },
  COMPLETED: {
    label: "Completed",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
  },
  FAILED: { label: "Failed", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  REJECTED: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  REVERSED: {
    label: "Reversed",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.12)",
  },
  DISPUTED: { label: "Disputed", color: "#fb923c", bg: "rgba(234,88,12,0.12)" },
};

const STATUS_TABS = [
  "ALL",
  "COMPLETED",
  "APPROVED",
  "PENDING",
  "FAILED",
  "REVERSED",
];
const TYPE_TABS = ["ALL", "FULL", "PARTIAL", "CUSTOM_AMOUNT", "DISPUTE"];
const TYPE_LABEL = {
  ALL: "All types",
  FULL: "Full",
  PARTIAL: "Partial",
  CUSTOM_AMOUNT: "Custom",
  DISPUTE: "Dispute",
};

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const s = String(status || "PENDING").toUpperCase();
  const meta = STATUS_META[s] || {
    label: s,
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
  };
  return (
    <View
      style={[
        s2.pill,
        { backgroundColor: meta.bg, borderColor: meta.color + "55" },
      ]}
    >
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "800",
          color: meta.color,
          letterSpacing: 0.6,
        }}
      >
        {meta.label.toUpperCase()}
      </AppText>
    </View>
  );
}

function StatCard({ label, value, sub, accent, c }) {
  const color =
    accent === "red" ? c.red : accent === "green" ? c.green : c.orange;
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 12,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: color,
          opacity: 0.5,
        }}
      />
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{ fontSize: 13, color: color, letterSpacing: -0.5 }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      {sub ? (
        <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 4 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RefundDetailModal({ refundId, onClose, c, modalBg }) {
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!refundId) return;
    setLoading(true);
    setError("");
    client
      .get(`/worker/refunds/${refundId}`)
      .then((res) => setRefund(res.data.data.refund))
      .catch((err) =>
        setError(err?.response?.data?.message || "Could not load this refund."),
      )
      .finally(() => setLoading(false));
  }, [refundId]);

  if (!refundId) return null;

  const deducted = refund?.workerAmountDeducted ?? 0;
  const currency = refund?.currency || "NGN";
  const wd = refund?.workerDebts?.[0] || null;

  return (
    <Modal
      visible={!!refundId}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.72)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: modalBg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            width: "100%",
            maxHeight: "94%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <Pressable
              onPress={onClose}
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <Ionicons name="arrow-back" size={16} color={c.text} />
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.text }}
              >
                Back
              </AppText>
            </Pressable>
            <AppText style={{ fontSize: 14, fontWeight: "800", color: c.text }}>
              Refund Detail
            </AppText>
            <View style={{ width: 40 }} />
          </View>

          {loading ? (
            <View style={{ padding: 24, gap: 12 }}>
              <Skeleton width="60%" height={24} radius={6} />
              <Skeleton width="100%" height={120} radius={14} />
              <Skeleton width="100%" height={180} radius={14} />
            </View>
          ) : error ? (
            <View style={{ alignItems: "center", padding: 48, gap: 12 }}>
              <Ionicons name="warning" size={40} color={c.red} />
              <AppText
                style={{ fontSize: 15, fontWeight: "700", color: c.text }}
              >
                Refund not found
              </AppText>
              <AppText
                style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
              >
                {error}
              </AppText>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 48,
                gap: 16,
              }}
            >
              <View
                style={{
                  backgroundColor: c.bgPanel,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 16,
                  padding: 20,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    backgroundColor: c.orange,
                    opacity: 0.6,
                  }}
                />
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: c.textMuted,
                    letterSpacing: 1.2,
                  }}
                >
                  DEDUCTED FROM YOUR EARNINGS
                </AppText>
                <AppText
                  weight="displayBlack"
                  style={{
                    fontSize: 15,
                    color: deducted === 0 ? c.textMuted : c.text,
                    letterSpacing: -1,
                    marginTop: 6,
                  }}
                >
                  {deducted === 0
                    ? "No deduction"
                    : fmtMoney(deducted, currency)}
                </AppText>
                <AppText
                  style={{
                    fontSize: 10,
                    color: c.textDim,
                    marginTop: 8,
                    lineHeight: 20,
                  }}
                >
                  {deducted === 0
                    ? "This refund did not affect your earnings."
                    : `This refund resulted in ${fmtMoney(deducted, currency)} being deducted from your account for booking "${refund.booking?.title || "the booking"}".`}
                </AppText>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 14,
                  }}
                >
                  <StatusPill status={refund.status} />
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "600",
                      }}
                    >
                      {refund.reference}
                    </AppText>
                  </View>
                </View>
              </View>

              {wd && (
                <View
                  style={{
                    backgroundColor: "rgba(234,179,8,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(234,179,8,0.25)",
                    borderLeftWidth: 3,
                    borderLeftColor: "#eab308",
                    borderRadius: 12,
                    padding: 14,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Ionicons name="warning" size={16} color="#facc15" />
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#facc15",
                      }}
                    >
                      Outstanding balance recorded
                    </AppText>
                  </View>
                  <AppText
                    style={{ fontSize: 10, color: c.textDim, lineHeight: 18 }}
                  >
                    Because you had already withdrawn this booking's earnings,
                    this refund created a debt of{" "}
                    <AppText
                      style={{ fontWeight: "700", color: c.text, fontSize: 10 }}
                    >
                      {fmtMoney(wd.amount, wd.currency || currency)}
                    </AppText>
                    .{" "}
                    {wd.status === "CLEARED" &&
                      "It has since been fully recovered from your withdrawals."}
                    {wd.status === "FORGIVEN" &&
                      "This debt has since been forgiven by the platform."}
                    {wd.status === "OUTSTANDING" &&
                      "It will be deducted from your next withdrawal."}
                    {wd.status === "COLLECTION" &&
                      "It is currently being followed up by our team."}
                  </AppText>
                </View>
              )}

              <Section title="Refund Details" icon="information-circle" c={c}>
                <Row label="Reference" value={refund.reference} mono c={c} />
                <Row
                  label="Status"
                  value={<StatusPill status={refund.status} />}
                  c={c}
                />
                <Row
                  label="Type"
                  value={refund.refundType?.replace(/_/g, " ") || "—"}
                  c={c}
                />
                {refund.percentage != null && (
                  <Row
                    label="Percentage"
                    value={`${Number(refund.percentage).toFixed(0)}%`}
                    c={c}
                  />
                )}
                <Row
                  label="Total refunded to hirer"
                  value={fmtMoney(refund.amount, currency)}
                  c={c}
                />
                <Row
                  label="Platform fee refunded"
                  value={fmtMoney(refund.platformFeeRefunded || 0, currency)}
                  c={c}
                />
                <Row
                  label="Deducted from you"
                  value={fmtMoney(deducted, currency)}
                  valueColor={deducted > 0 ? c.red : c.textMuted}
                  c={c}
                />
                <Row label="Reason" value={refund.reason || "—"} c={c} />
                <Row
                  label="Initiated"
                  value={formatDateTime(refund.createdAt)}
                  c={c}
                />
                {refund.processedAt && (
                  <Row
                    label="Processed"
                    value={formatDateTime(refund.processedAt)}
                    c={c}
                  />
                )}
              </Section>

              {refund.booking && (
                <Section title="Booking" icon="calendar" c={c}>
                  <Row label="Title" value={refund.booking.title} c={c} />
                  {refund.booking.category && (
                    <Row
                      label="Category"
                      value={`${refund.booking.category.icon || ""} ${refund.booking.category.name}`}
                      c={c}
                    />
                  )}
                  {refund.booking.address && (
                    <Row
                      label="Location"
                      value={refund.booking.address}
                      c={c}
                    />
                  )}
                  {refund.booking.scheduledAt && (
                    <Row
                      label="Scheduled"
                      value={formatDate(refund.booking.scheduledAt)}
                      c={c}
                    />
                  )}
                  {refund.booking.completedAt && (
                    <Row
                      label="Completed"
                      value={formatDate(refund.booking.completedAt)}
                      c={c}
                    />
                  )}
                  {refund.booking.agreedRate != null && (
                    <Row
                      label="Agreed rate"
                      value={fmtMoney(
                        refund.booking.agreedRate,
                        refund.booking.currency || currency,
                      )}
                      c={c}
                    />
                  )}
                </Section>
              )}

              {refund.dispute && (
                <Section title="Dispute Context" icon="chatbubbles" c={c}>
                  <Row
                    label="Raised by"
                    value={
                      refund.dispute.raisedBy
                        ? `${refund.dispute.raisedBy.firstName} ${refund.dispute.raisedBy.lastName} (${refund.dispute.raisedBy.role})`
                        : "—"
                    }
                    c={c}
                  />
                  <Row label="Reason" value={refund.dispute.reason} c={c} />
                  {refund.dispute.description && (
                    <Row
                      label="Description"
                      value={refund.dispute.description}
                      c={c}
                    />
                  )}
                  <Row
                    label="Resolution"
                    value={refund.dispute.resolution || "—"}
                    c={c}
                  />
                  {refund.dispute.resolvedBy && (
                    <Row
                      label="Resolved by"
                      value={`${refund.dispute.resolvedBy.firstName} ${refund.dispute.resolvedBy.lastName}`}
                      c={c}
                    />
                  )}
                  {refund.dispute.resolvedAt && (
                    <Row
                      label="Resolved at"
                      value={formatDateTime(refund.dispute.resolvedAt)}
                      c={c}
                    />
                  )}
                </Section>
              )}

              {refund.hirer && (
                <Section title="Hirer" icon="person" c={c}>
                  <Row
                    label="Name"
                    value={`${refund.hirer.firstName} ${refund.hirer.lastName}`}
                    c={c}
                  />
                  {refund.hirer.email && (
                    <Row label="Email" value={refund.hirer.email} c={c} />
                  )}
                </Section>
              )}

              {wd && (
                <Section title="Outstanding Balance" icon="document-text" c={c}>
                  <Row label="Status" value={wd.status} c={c} />
                  <Row
                    label="Original amount"
                    value={fmtMoney(wd.amount, wd.currency || currency)}
                    c={c}
                  />
                  <Row
                    label="Recovered"
                    value={fmtMoney(
                      wd.amountPaid || 0,
                      wd.currency || currency,
                    )}
                    c={c}
                  />
                  <Row
                    label="Forgiven"
                    value={fmtMoney(
                      wd.amountForgiven || 0,
                      wd.currency || currency,
                    )}
                    c={c}
                  />
                  {wd.clearedAt && (
                    <Row
                      label="Cleared at"
                      value={formatDateTime(wd.clearedAt)}
                      c={c}
                    />
                  )}
                  {wd.forgivenAt && (
                    <Row
                      label="Forgiven at"
                      value={formatDateTime(wd.forgivenAt)}
                      c={c}
                    />
                  )}
                </Section>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, icon, c, children }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={14} color={c.orange} />
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "800",
            color: c.textMuted,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          {title}
        </AppText>
      </View>
      <View style={{ gap: 10 }}>{children}</View>
    </View>
  );
}

function Row({ label, value, mono, valueColor, c }) {
  return (
    <View
      style={{
        paddingVertical: 6,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      }}
    >
      <AppText
        style={{
          fontSize: 10,
          color: c.textMuted,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </AppText>
      {typeof value === "string" || typeof value === "number" ? (
        <AppText
          style={{
            fontSize: 13,
            color: valueColor || c.text,
            marginTop: 3,
            fontFamily: mono ? "Courier" : undefined,
            fontWeight: "500",
          }}
        >
          {value}
        </AppText>
      ) : (
        <View style={{ marginTop: 3 }}>{value}</View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function RefundHistoryScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const c = theme.colors;
  const modalBg = theme.mode === "dark" ? "#111118" : "#ffffff";

  const [refunds, setRefunds] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("ALL");
  const [refundType, setRefundType] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const LIMIT = 15;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  const fetchSummary = useCallback(async () => {
    try {
      const res = await client.get("/worker/refunds/summary");
      setSummary(res.data.data);
    } catch {}
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (status !== "ALL") params.status = status;
      if (refundType !== "ALL") params.refundType = refundType;
      const res = await client.get("/worker/refunds", { params });
      setRefunds(res.data.data?.refunds || []);
      setTotal(res.data.data?.total || 0);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load your refunds.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, status, refundType]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useFocusEffect(
    useCallback(() => {
      fetchSummary();
      fetchList();
    }, [fetchSummary, fetchList]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchSummary();
    fetchList();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize: 10,
              color: c.orange,
              fontWeight: "700",
              letterSpacing: 1,
            }}
          >
            REFUNDS
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              color: c.text,
              letterSpacing: -0.5,
              marginTop: 2,
            }}
          >
            Refund History
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}>
            Every refund that has affected your earnings
          </AppText>
        </View>
        <Pressable
          onPress={handleRefresh}
          disabled={loading}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgPanel,
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Ionicons name="refresh" size={16} color={c.textDim} />
        </Pressable>
      </View>

      {/* Summary Cards */}
      {summary ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View style={{ width: "48%" }}>
            <StatCard
              label="Lifetime Refunds"
              value={String(summary.lifetimeRefunds ?? 0)}
              sub={
                (summary.lifetimeRefunds ?? 0) === 0
                  ? "No refunds on your account"
                  : `Across ${summary.lifetimeRefunds} transaction${summary.lifetimeRefunds === 1 ? "" : "s"}`
              }
              c={c}
            />
          </View>
          <View style={{ width: "48%" }}>
            <StatCard
              label="Deducted From Earnings"
              value={fmtMoney(
                summary.lifetimeDeductedFromEarnings ?? 0,
                summary.primaryCurrency || "NGN",
              )}
              sub="Total clawed back from completed jobs"
              accent="red"
              c={c}
            />
          </View>
          <View style={{ width: "100%" }}>
            <StatCard
              label="Outstanding Balance"
              value={fmtMoney(
                summary.debtBalance ?? 0,
                summary.primaryCurrency || "NGN",
              )}
              sub={
                (summary.debtBalance ?? 0) > 0
                  ? "Will be deducted from your next withdrawal"
                  : "You're all settled up"
              }
              accent={(summary.debtBalance ?? 0) > 0 ? "red" : "green"}
              c={c}
            />
          </View>
        </View>
      ) : null}

      {/* Status Filters */}
      <View>
        <AppText
          style={{
            fontSize: 10,
            color: c.textMuted,
            fontWeight: "700",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          STATUS
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {STATUS_TABS.map((s) => {
            const active = status === s;
            return (
              <Pressable
                key={s}
                onPress={() => {
                  setPage(1);
                  setStatus(s);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? c.orange : c.border,
                  backgroundColor: active ? c.orangeDim : c.bgPanel,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                  }}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Type Filters */}
      <View>
        <AppText
          style={{
            fontSize: 10,
            color: c.textMuted,
            fontWeight: "700",
            letterSpacing: 1,
            marginBottom: 8,
          }}
        >
          TYPE
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {TYPE_TABS.map((tp) => {
            const active = refundType === tp;
            return (
              <Pressable
                key={tp}
                onPress={() => {
                  setPage(1);
                  setRefundType(tp);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? c.orange : c.border,
                  backgroundColor: active ? c.orangeDim : c.bgPanel,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                  }}
                >
                  {TYPE_LABEL[tp]}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {loading && !refunds.length ? (
        <View style={{ gap: 10 }}>
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} width="100%" height={92} radius={14} />
          ))}
        </View>
      ) : error ? (
        <View
          style={{
            alignItems: "center",
            padding: 40,
            gap: 10,
            backgroundColor: c.bgPanel,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Ionicons name="warning" size={36} color={c.red} />
          <AppText style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
            Could not load refunds
          </AppText>
          <AppText
            style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
          >
            {error}
          </AppText>
          <Pressable
            onPress={fetchList}
            style={{
              marginTop: 6,
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
            }}
          >
            <AppText style={{ fontSize: 12, fontWeight: "600", color: c.text }}>
              Try again
            </AppText>
          </Pressable>
        </View>
      ) : refunds.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            padding: 48,
            gap: 10,
            backgroundColor: c.bgPanel,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: c.orangeDim,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 4,
            }}
          >
            <Ionicons name="inbox" size={24} color={c.orange} />
          </View>
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              textAlign: "center",
            }}
          >
            {status !== "ALL" || refundType !== "ALL"
              ? "No refunds match these filters"
              : "No refunds on your account"}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              maxWidth: 340,
            }}
          >
            {status !== "ALL" || refundType !== "ALL"
              ? "Try clearing the filters to see everything."
              : "When a booking is refunded to a hirer, it will appear here with full details."}
          </AppText>
        </View>
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {refunds.map((r) => {
              const deducted = r.workerAmountDeducted ?? 0;
              const currency = r.currency || "NGN";
              const statusMeta = STATUS_META[r.status] || STATUS_META.PENDING;
              return (
                <Pressable
                  key={r.id}
                  onPress={() => setSelectedId(r.id)}
                  style={({ pressed }) => ({
                    backgroundColor: c.bgPanel,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 14,
                    padding: 14,
                    flexDirection: "row",
                    gap: 12,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      backgroundColor: statusMeta.bg,
                      borderWidth: 1,
                      borderColor: statusMeta.color + "55",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons
                      name="cash-outline"
                      size={18}
                      color={statusMeta.color}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <AppText
                      style={{ fontSize: 13, fontWeight: "700", color: c.text }}
                      numberOfLines={1}
                    >
                      {r.booking?.title || "Booking"}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <StatusPill status={r.status} />
                      {r.booking?.category?.name && (
                        <AppText style={{ fontSize: 11, color: c.textMuted }}>
                          {r.booking.category.name}
                        </AppText>
                      )}
                      <AppText style={{ fontSize: 11, color: c.textMuted }}>
                        {formatDate(r.createdAt)}
                      </AppText>
                    </View>
                    {r.reason ? (
                      <AppText
                        style={{
                          fontSize: 11,
                          color: c.textDim,
                          fontStyle: "italic",
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {r.reason}
                      </AppText>
                    ) : null}
                  </View>
                  <View
                    style={{
                      alignItems: "flex-end",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AppText
                      weight="displayBlack"
                      style={{
                        fontSize: 12,
                        color: deducted === 0 ? c.textMuted : c.red,
                        letterSpacing: -0.3,
                      }}
                    >
                      {deducted === 0 ? "—" : fmtMoney(deducted, currency)}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 9,
                        color: c.textMuted,
                        letterSpacing: 0.6,
                        marginTop: 2,
                      }}
                    >
                      {deducted === 0 ? "NO DEDUCTION" : "DEDUCTED"}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {pages > 1 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                marginTop: 8,
              }}
            >
              <Pressable
                disabled={page === 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: page === 1 ? c.border : c.orange,
                  backgroundColor: c.bgPanel,
                  opacity: page === 1 ? 0.4 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={page === 1 ? c.textMuted : c.orange}
                />
                <AppText
                  style={{
                    fontSize: 12,
                    color: page === 1 ? c.textMuted : c.orange,
                  }}
                >
                  Prev
                </AppText>
              </Pressable>
              <AppText style={{ fontSize: 12, color: c.textDim }}>
                {page} of {pages}
              </AppText>
              <Pressable
                disabled={page === pages}
                onPress={() => setPage((p) => Math.min(pages, p + 1))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: page === pages ? c.border : c.orange,
                  backgroundColor: c.bgPanel,
                  opacity: page === pages ? 0.4 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: page === pages ? c.textMuted : c.orange,
                  }}
                >
                  Next
                </AppText>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={page === pages ? c.textMuted : c.orange}
                />
              </Pressable>
            </View>
          )}
        </>
      )}

      {/* Detail Modal */}
      <RefundDetailModal
        refundId={selectedId}
        onClose={() => setSelectedId(null)}
        c={c}
        modalBg={modalBg}
      />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s2 = StyleSheet.create({
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
});
