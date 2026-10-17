// src/screens/main/RefundHistoryScreen.js
//
// Mirrors the website's RefundHistory.jsx.
// Skeleton loading (uses shared <Skeleton> from components).
// No orange spinner — the skeleton fills the layout while data loads.

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

import {
  FaHistory,
  FaMoneyBillWave,
  FaChevronRight,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaExclamationTriangle,
  FaSearch,
  FaCalendarAlt,
} from "../../icons/fa";

const STATUS_CONFIG = {
  PENDING: { Icon: FaClock, color: "#fbbf24", label: "Pending Review" },
  APPROVED: { Icon: FaCheckCircle, color: "#22c55e", label: "Approved" },
  PROCESSING: { Icon: FaSpinner, color: "#818cf8", label: "Processing" },
  COMPLETED: { Icon: FaCheckCircle, color: "#22c55e", label: "Completed" },
  FAILED: { Icon: FaTimesCircle, color: "#ef4444", label: "Failed" },
  REJECTED: { Icon: FaTimesCircle, color: "#ef4444", label: "Rejected" },
  DISPUTED: {
    Icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
  },
};

const fmtPrice = (amount, currency = "NGN") => {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ── Full-page skeleton (mirrors the web's SkeletonLoader) ─────────────────
function RefundHistorySkeleton() {
  const { theme: th } = useTheme();
  const c = th.colors;

  return (
    <View style={{ gap: 16 }}>
      {/* Stats skeleton — 5 cards */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton
            key={i}
            width="30%"
            height={64}
            radius={12}
            style={{ flexGrow: 1 }}
          />
        ))}
      </View>

      {/* Filter tabs skeleton */}
      <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} width={72} height={30} radius={15} />
        ))}
      </View>

      {/* Search skeleton */}
      <Skeleton width="100%" height={40} radius={10} />

      {/* Refund list skeleton */}
      <View style={{ gap: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton.ListRow key={i} />
        ))}
      </View>
    </View>
  );
}

export default function RefundHistoryScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const navigation = useNavigation();

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filter !== "all" ? `?status=${filter}` : "";
      const res = await client.get(`/refunds/my${qs}`);
      const list = res.data?.data?.refunds || [];
      setRefunds(list);
      setStats({
        total: list.length,
        totalAmount: list.reduce((s, r) => s + (r.amount || 0), 0),
        pending: list.filter((r) => r.status === "PENDING").length,
        completed: list.filter((r) => r.status === "COMPLETED").length,
        rejected: list.filter(
          (r) => r.status === "REJECTED" || r.status === "FAILED",
        ).length,
      });
    } catch {
      setRefunds([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = refunds.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.reference?.toLowerCase().includes(q) ||
      r.booking?.title?.toLowerCase().includes(q) ||
      r.currency?.toLowerCase().includes(q)
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <FaHistory size={18} color={c.orange} />
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ fontSize: 22 }}
          >
            Refund History
          </AppText>
          {stats && !loading && (
            <View
              style={[
                styles.countBadge,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText variant="small" tone="dim">
                {stats.total} requests
              </AppText>
            </View>
          )}
        </View>

        {loading ? (
          <RefundHistorySkeleton />
        ) : (
          <>
            {/* Stats cards */}
            {stats && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <StatCard label="Total Requests" value={stats.total} />
                <StatCard
                  label="Pending"
                  value={stats.pending}
                  color="#fbbf24"
                />
                <StatCard
                  label="Completed"
                  value={stats.completed}
                  color="#22c55e"
                />
                <StatCard
                  label="Rejected"
                  value={stats.rejected}
                  color="#ef4444"
                />
                <StatCard
                  label="Total Refunded"
                  value={fmtPrice(stats.totalAmount, "NGN")}
                  color="#f59e0b"
                />
              </View>
            )}

            {/* Search */}
            <View
              style={[
                styles.searchRow,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaSearch size={12} color={c.textMuted} />
              <TextInput
                placeholder="Search by reference or booking..."
                placeholderTextColor={c.textMuted}
                value={search}
                onChangeText={setSearch}
                style={{ flex: 1, marginLeft: 8, color: c.text, fontSize: 13 }}
              />
            </View>

            {/* Filter tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 6,
                marginBottom: 14,
                marginTop: 12,
              }}
            >
              {[
                "all",
                "PENDING",
                "APPROVED",
                "PROCESSING",
                "COMPLETED",
                "REJECTED",
              ].map((s) => {
                const active = filter === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setFilter(s)}
                    style={[
                      styles.tab,
                      {
                        borderColor: active ? c.orange : c.border,
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                      },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? c.orange : c.textDim }}
                    >
                      {s === "all" ? "All" : s}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {visible.length === 0 ? (
              <View
                style={[
                  styles.empty,
                  { backgroundColor: c.bgPanel, borderColor: c.border },
                ]}
              >
                <FaHistory size={32} color={c.textMuted} />
                <AppText weight="bold" style={{ marginTop: 10 }}>
                  No refund requests found
                </AppText>
                <Pressable
                  onPress={() => navigation.navigate("Bookings")}
                  style={[styles.emptyAction, { backgroundColor: c.orange }]}
                >
                  <AppText
                    variant="small"
                    weight="bold"
                    style={{ color: c.bg }}
                  >
                    View Bookings
                  </AppText>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {visible.map((r) => (
                  <RefundRow
                    key={r.id}
                    refund={r}
                    onPress={() =>
                      navigation.navigate("RefundDetail", { refundId: r.id })
                    }
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ── Row component ─────────────────────────────────────────────────────────
function RefundRow({ refund, onPress }) {
  const { theme: th } = useTheme();
  const c = th.colors;

  const cfg = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
  const { Icon } = cfg;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
        ]}
      >
        <FaMoneyBillWave size={16} color={c.orange} />
      </View>

      <View style={{ flex: 1, gap: 4 }}>
        <View
          style={{
            flexDirection: "row",
            gap: 6,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <AppText weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
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
            flexWrap: "wrap",
          }}
        >
          <AppText variant="small" weight="bold" style={{ color: c.orange }}>
            {refund.currency} {Number(refund.amount || 0).toLocaleString()}
          </AppText>
          <AppText variant="small" tone="dim">
            {refund.refundType?.replace("_", " ") || "Refund"}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
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
}

// ── Small pieces ──────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={[
        styles.statCard,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText
        variant="title"
        weight="displayBlack"
        style={{ color: color || c.text, fontSize: 16 }}
      >
        {value}
      </AppText>
      <AppText
        variant="small"
        tone="dim"
        style={{ textTransform: "uppercase", letterSpacing: 0.6, fontSize: 10 }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  emptyAction: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  rowIcon: {
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
