// src/screens/main/RefundHistoryScreen.js
//
// Verbatim port of pages/refund/RefundHistory.jsx.
//
// Fetch: GET /refunds/my?status=...
// Renders:
//   · Header: icon + "Refund History" + "{N} requests" pill
//   · Stats grid: total / pending / completed / rejected / total refunded
//   · Filter tabs: All / Pending / Approved / Processing / Completed / Rejected
//   · Search box: reference, booking title, currency
//   · Refund rows: icon + title + reference + amount/type/date + status
//   · Empty state
//   · PageSkeleton during initial load

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import {
  FaHistory,
  FaMoneyBillWave,
  FaChevronRight,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaSearch,
  FaCalendarAlt,
} from "../../icons/fa";

// ── Status config — verbatim from web ─────────────────────────────────
const STATUS_CONFIG = {
  PENDING: { color: "#fbbf24", label: "Pending Review", icon: FaClock },
  APPROVED: { color: "#22c55e", label: "Approved", icon: FaCheckCircle },
  PROCESSING: { color: "#818cf8", label: "Processing", icon: FaClock },
  COMPLETED: { color: "#22c55e", label: "Completed", icon: FaCheckCircle },
  FAILED: { color: "#ef4444", label: "Failed", icon: FaTimesCircle },
  REJECTED: { color: "#ef4444", label: "Rejected", icon: FaTimesCircle },
  DISPUTED: {
    color: "#f59e0b",
    label: "In Dispute",
    icon: FaExclamationTriangle,
  },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "APPROVED", label: "Approved" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REJECTED", label: "Rejected" },
];

function fmtPrice(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function RefundHistoryScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ── Fetch ───────────────────────────────────────────────────────────
  const fetchRefunds = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const params =
          filter !== "all" ? `?status=${encodeURIComponent(filter)}` : "";
        const res = await client.get(`/refunds/my${params}`);
        const list = res?.data?.data?.refunds || [];
        setRefunds(list);

        // Client-side stats (verbatim from web)
        const totalAmount = list.reduce(
          (sum, r) => sum + (Number(r.amount) || 0),
          0,
        );
        const pendingCount = list.filter((r) => r.status === "PENDING").length;
        const completedCount = list.filter(
          (r) => r.status === "COMPLETED",
        ).length;
        const rejectedCount = list.filter(
          (r) => r.status === "REJECTED" || r.status === "FAILED",
        ).length;

        setStats({
          total: list.length,
          totalAmount,
          pending: pendingCount,
          completed: completedCount,
          rejected: rejectedCount,
        });
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to load refund history",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filter],
  );

  useEffect(() => {
    fetchRefunds(false);
  }, [fetchRefunds]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRefunds(true);
  };

  // ── Client-side search ──────────────────────────────────────────────
  const filteredRefunds = useMemo(() => {
    if (!searchTerm.trim()) return refunds;
    const q = searchTerm.toLowerCase();
    return refunds.filter(
      (r) =>
        r.reference?.toLowerCase().includes(q) ||
        r.booking?.title?.toLowerCase().includes(q) ||
        r.currency?.toLowerCase().includes(q),
    );
  }, [refunds, searchTerm]);

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="list" rows={5} />
      </AppScreen>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <FaHistory size={22} color={c.orange} />
        <AppText
          style={{
            fontFamily: "Syne_800ExtraBold",
            fontSize: 22,
            fontWeight: "800",
            color: c.text,
            marginLeft: 10,
            letterSpacing: -0.4,
            flex: 1,
          }}
        >
          Refund History
        </AppText>
        {stats ? (
          <View
            style={[
              styles.headerCount,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText
              style={{ fontSize: 10, fontWeight: "700", color: c.textDim }}
            >
              {stats.total} requests
            </AppText>
          </View>
        ) : null}
      </View>

      {/* ── Stats grid ──────────────────────────────────────────── */}
      {stats ? (
        <View style={styles.statsGrid}>
          <StatCard
            value={stats.total}
            label="Total Requests"
            color={c.text}
            c={c}
          />
          <StatCard
            value={stats.pending}
            label="Pending"
            color="#fbbf24"
            c={c}
          />
          <StatCard
            value={stats.completed}
            label="Completed"
            color="#22c55e"
            c={c}
          />
          <StatCard
            value={stats.rejected}
            label="Rejected"
            color="#ef4444"
            c={c}
          />
          <StatCard
            value={fmtPrice(stats.totalAmount, "NGN")}
            label="Total Refunded"
            color="#f59e0b"
            c={c}
            wide
          />
        </View>
      ) : null}

      {/* ── Filter tabs ─────────────────────────────────────────── */}
      <FlatList
        data={FILTERS}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={{ gap: 6, paddingRight: 8 }}
        renderItem={({ item }) => {
          const active = filter === item.key;
          return (
            <Pressable
              onPress={() => setFilter(item.key)}
              style={({ pressed }) => [
                styles.filterTab,
                {
                  backgroundColor: active ? c.orangeDim : c.bgCard,
                  borderColor: active ? c.orange : c.border,
                  opacity: pressed && !active ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: active ? c.orange : c.textDim,
                }}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        }}
      />

      {/* ── Search ──────────────────────────────────────────────── */}
      <View
        style={[
          styles.searchBox,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <FaSearch size={12} color={c.textMuted} />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by reference or booking..."
          placeholderTextColor={c.textMuted}
          style={[styles.searchInput, { color: c.text }]}
        />
      </View>

      {/* ── Refund list ─────────────────────────────────────────── */}
      {filteredRefunds.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <FaHistory
            size={32}
            color={c.textMuted}
            style={{ marginBottom: 12 }}
          />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 16,
              fontWeight: "800",
              color: c.text,
              textAlign: "center",
            }}
          >
            No refund requests found
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              marginTop: 6,
              marginBottom: 16,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            {filter !== "all"
              ? `You have no ${filter.toLowerCase()} refund requests.`
              : "You haven't requested any refunds yet."}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("Bookings")}
            style={({ pressed }) => [
              styles.emptyBtn,
              { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
              View Bookings
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          {filteredRefunds.map((refund) => {
            const config =
              STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
            const StatusIcon = config.icon;
            return (
              <Pressable
                key={refund.id}
                onPress={() =>
                  navigation.navigate("RefundDetail", { refundId: refund.id })
                }
                style={({ pressed }) => [
                  styles.refundRow,
                  {
                    backgroundColor: c.bgPanel,
                    borderColor: c.border,
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                {/* Left: icon + info */}
                <View style={styles.refundMain}>
                  <View
                    style={[
                      styles.refundIconWrap,
                      {
                        backgroundColor: c.orangeDim,
                        borderColor: c.orangeGlow,
                      },
                    ]}
                  >
                    <FaMoneyBillWave size={15} color={c.orange} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: c.text,
                          flexShrink: 1,
                        }}
                        numberOfLines={1}
                      >
                        {refund.booking?.title || "Booking Refund"}
                      </AppText>
                      <View
                        style={[
                          styles.refPill,
                          { backgroundColor: c.bgCard, borderColor: c.border },
                        ]}
                      >
                        <AppText
                          style={{
                            fontSize: 9,
                            color: c.textMuted,
                            fontFamily: "monospace",
                          }}
                          numberOfLines={1}
                        >
                          {refund.reference}
                        </AppText>
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      <AppText
                        style={{
                          fontFamily: "Syne_800ExtraBold",
                          fontSize: 12,
                          fontWeight: "800",
                          color: c.orange,
                        }}
                      >
                        {refund.currency}{" "}
                        {Number(refund.amount || 0).toLocaleString()}
                      </AppText>
                      <View
                        style={[
                          styles.typePill,
                          { backgroundColor: c.bgCard, borderColor: c.border },
                        ]}
                      >
                        <AppText
                          style={{
                            fontSize: 9,
                            fontWeight: "700",
                            color: c.textDim,
                            textTransform: "uppercase",
                            letterSpacing: 0.4,
                          }}
                        >
                          {(refund.refundType || "REFUND").replace("_", " ")}
                        </AppText>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <FaCalendarAlt size={9} color={c.textMuted} />
                        <AppText style={{ fontSize: 10, color: c.textMuted }}>
                          {new Date(refund.createdAt).toLocaleDateString(
                            "en-GB",
                            { day: "numeric", month: "short", year: "numeric" },
                          )}
                        </AppText>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Right: status + arrow */}
                <View style={styles.refundRight}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        borderColor: config.color,
                        backgroundColor: `${config.color}22`,
                      },
                    ]}
                  >
                    <StatusIcon size={10} color={config.color} />
                    <AppText
                      style={{
                        fontSize: 9,
                        fontWeight: "800",
                        color: config.color,
                        textTransform: "uppercase",
                        letterSpacing: 0.3,
                        marginLeft: 3,
                      }}
                    >
                      {config.label}
                    </AppText>
                  </View>
                  <FaChevronRight size={10} color={c.textMuted} />
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </AppScreen>
  );
}

function StatCard({ value, label, color, c, wide }) {
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          width: wide ? "100%" : "48.5%",
        },
      ]}
    >
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: wide ? 20 : 18,
          fontWeight: "800",
          color,
          letterSpacing: -0.3,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginTop: 4,
          textAlign: "center",
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 4,
  },
  headerCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersRow: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  refundRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  refundMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 10,
    minWidth: 0,
  },
  refundIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  refPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  refundRight: {
    alignItems: "flex-end",
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 16,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
});
