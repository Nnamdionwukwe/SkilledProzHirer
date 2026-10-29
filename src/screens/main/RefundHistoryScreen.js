// src/screens/main/RefundHistoryScreen.js
//
// Port of pages/refund/RefundHistory.jsx + Refund.module.css.
//
// Preserved verbatim:
//   - STATUS_CONFIG (7 statuses, exact colors)
//   - GET /refunds/my?status=... (server-side filter)
//   - Stats computed client-side from fetched list (total / totalAmount /
//     pending / completed / rejected)
//   - Filter tabs: all / PENDING / APPROVED / PROCESSING / COMPLETED / REJECTED
//   - Search box (reference / booking.title / currency)
//   - Empty state copy with filter-aware subtext
//   - Skeleton mirrors the CSS shimmer

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

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

const formatPrice = (amount, currency = "NGN") => {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// ── Skeleton ───────────────────────────────────────────────────────────
function RefundSkeleton({ c }) {
  return (
    <View style={{ gap: 14 }}>
      {/* Stats skeletons */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={{ width: "48%", minWidth: 0 }}>
            <Skeleton width="100%" height={72} radius={14} />
          </View>
        ))}
      </View>

      {/* Filter skeletons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width={70} height={32} radius={999} />
        ))}
      </ScrollView>
      <Skeleton width="100%" height={40} radius={10} />

      {/* Refund rows skeleton */}
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} width="100%" height={92} radius={12} />
      ))}
    </View>
  );
}

// ── Main ───────────────────────────────────────────────────────────────
export default function RefundHistoryScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchRefunds = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      try {
        const params = {};
        if (filter !== "all") params.status = filter;

        const response = await client.get("/refunds/my", { params });
        const data = response.data.data;
        const list = data.refunds || [];
        setRefunds(list);

        const totalAmount = list.reduce((sum, r) => sum + (r.amount || 0), 0);
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
        if (__DEV__) console.log("[RefundHistory] fetch failed:", err?.message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    fetchRefunds(true);
  }, [fetchRefunds]);

  // Refresh when returning from the detail screen
  const firstFocusRef = useCallback(() => true, []);
  useFocusEffect(
    useCallback(() => {
      // re-fetch on focus (initial fetch handled by useEffect)
      fetchRefunds(false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter]),
  );

  const filteredRefunds = refunds.filter((refund) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      refund.reference?.toLowerCase().includes(search) ||
      refund.booking?.title?.toLowerCase().includes(search) ||
      refund.currency?.toLowerCase().includes(search)
    );
  });

  const statusTabs = [
    { value: "all", label: "All" },
    { value: "PENDING", label: "Pending" },
    { value: "APPROVED", label: "Approved" },
    { value: "PROCESSING", label: "Processing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "REJECTED", label: "Rejected" },
  ];

  if (loading && !refunds.length) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View style={{ padding: 16, gap: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FaHistory size={20} color={c.orange} />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 22,
                fontWeight: "800",
                color: c.text,
                letterSpacing: -0.3,
              }}
            >
              Refund History
            </AppText>
          </View>
          <RefundSkeleton c={c} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchRefunds(false)}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <FaHistory size={20} color={c.orange} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 22,
              fontWeight: "800",
              color: c.text,
              letterSpacing: -0.3,
            }}
          >
            Refund History
          </AppText>
          {stats ? (
            <View
              style={{
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 999,
                marginLeft: "auto",
              }}
            >
              <AppText
                style={{ fontSize: 10, fontWeight: "700", color: c.textDim }}
              >
                {`${stats.total} requests`}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Stats grid */}
        {stats ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <StatCard
              label="Total Requests"
              value={String(stats.total)}
              c={c}
            />
            <StatCard
              label="Pending"
              value={String(stats.pending)}
              valueColor="#fbbf24"
              c={c}
            />
            <StatCard
              label="Completed"
              value={String(stats.completed)}
              valueColor="#22c55e"
              c={c}
            />
            <StatCard
              label="Rejected"
              value={String(stats.rejected)}
              valueColor="#ef4444"
              c={c}
            />
            <StatCard
              label="Total Refunded"
              value={formatPrice(stats.totalAmount, "NGN")}
              valueColor="#f59e0b"
              full
              c={c}
            />
          </View>
        ) : null}

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {statusTabs.map((tab) => {
            const active = filter === tab.value;
            return (
              <Pressable
                key={tab.value}
                onPress={() => setFilter(tab.value)}
                style={({ pressed }) => [
                  {
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    backgroundColor: active ? c.orangeDim : c.bgCard,
                    borderWidth: 1,
                    borderColor: active ? c.orange : c.border,
                    borderRadius: 999,
                    opacity: pressed ? 0.85 : 1,
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
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            backgroundColor: c.bgInput || c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          <FaSearch size={13} color={c.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by reference or booking..."
            placeholderTextColor={c.textMuted}
            style={{
              flex: 1,
              fontSize: 13,
              color: c.text,
              paddingVertical: 8,
            }}
          />
        </View>

        {/* List */}
        {filteredRefunds.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 48,
              paddingHorizontal: 20,
              backgroundColor: c.bgPanel,
              borderWidth: 1.5,
              borderColor: c.border,
              borderStyle: "dashed",
              borderRadius: 14,
              gap: 10,
            }}
          >
            <FaHistory size={40} color={c.textMuted} style={{ opacity: 0.5 }} />
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
                textAlign: "center",
                maxWidth: 340,
              }}
            >
              {filter !== "all"
                ? `You have no ${filter.toLowerCase()} refund requests.`
                : "You haven't requested any refunds yet."}
            </AppText>
            <Pressable
              onPress={() => navigation.navigate("Bookings")}
              style={({ pressed }) => [
                {
                  marginTop: 6,
                  paddingVertical: 10,
                  paddingHorizontal: 24,
                  backgroundColor: c.orange,
                  borderRadius: 10,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 13,
                  fontWeight: "800",
                  color: "#000",
                }}
              >
                View Bookings
              </AppText>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {filteredRefunds.map((refund) => {
              const statusConfig = STATUS_CONFIG[refund.status];
              const StatusIcon = statusConfig?.Icon || FaClock;
              return (
                <Pressable
                  key={refund.id}
                  onPress={() =>
                    navigation.navigate("RefundDetail", { id: refund.id })
                  }
                  style={({ pressed }) => [
                    {
                      backgroundColor: c.bgPanel,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      padding: 14,
                      gap: 10,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  {/* Main row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 9,
                        backgroundColor: c.orangeDim,
                        borderWidth: 1,
                        borderColor: c.orangeGlow,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <FaMoneyBillWave size={14} color={c.orange} />
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
                          numberOfLines={1}
                          style={{
                            fontFamily: "DMSans_600SemiBold",
                            fontSize: 13,
                            fontWeight: "700",
                            color: c.text,
                            flexShrink: 1,
                          }}
                        >
                          {refund.booking?.title || "Booking Refund"}
                        </AppText>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            backgroundColor: c.bgCard,
                            borderWidth: 1,
                            borderColor: c.border,
                            borderRadius: 999,
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              color: c.textMuted,
                              fontWeight: "600",
                            }}
                          >
                            {refund.reference}
                          </AppText>
                        </View>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                          marginTop: 6,
                          alignItems: "center",
                        }}
                      >
                        <AppText
                          style={{
                            fontFamily: "Syne_800ExtraBold",
                            fontSize: 13,
                            fontWeight: "800",
                            color: c.orange,
                          }}
                        >
                          {`${refund.currency} ${Number(refund.amount).toLocaleString()}`}
                        </AppText>
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            backgroundColor: c.bgCard,
                            borderWidth: 1,
                            borderColor: c.border,
                            borderRadius: 999,
                          }}
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
                            {(
                              refund.refundType?.replace("_", " ") || "Refund"
                            ).toUpperCase()}
                          </AppText>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <FaCalendarAlt size={10} color={c.textMuted} />
                          <AppText style={{ fontSize: 10, color: c.textMuted }}>
                            {new Date(refund.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </AppText>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Footer */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: c.border,
                      borderStyle: "dashed",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: statusConfig?.color || c.textMuted,
                      }}
                    >
                      <StatusIcon
                        size={10}
                        color={statusConfig?.color || c.textMuted}
                      />
                      <AppText
                        style={{
                          fontSize: 9,
                          fontWeight: "800",
                          color: statusConfig?.color || c.textMuted,
                          textTransform: "uppercase",
                          letterSpacing: 0.5,
                        }}
                      >
                        {statusConfig?.label || refund.status}
                      </AppText>
                    </View>
                    <FaChevronRight size={11} color={c.textMuted} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────
function StatCard({ label, value, valueColor, full, c }) {
  return (
    <View
      style={{
        width: full ? "100%" : "48%",
        minWidth: 0,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 14,
        alignItems: "center",
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
          backgroundColor: c.orange,
          opacity: 0.4,
        }}
      />
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 18,
          fontWeight: "800",
          color: valueColor || c.text,
          letterSpacing: -0.4,
        }}
      >
        {value}
      </AppText>
      <AppText
        numberOfLines={1}
        style={{
          fontFamily: "DMSans_600SemiBold",
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginTop: 4,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}
