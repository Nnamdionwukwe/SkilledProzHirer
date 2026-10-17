// src/screens/main/RefundHistoryScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { FaHistory, FaSearch } from "../../icons/fa";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import { RefundHistory as RefundList } from "../../components/booking/Refund";

export default function RefundHistoryScreen() {
  const { theme: th } = useTheme();
  const c = th.colors;
  const navigation = useNavigation();

  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await client.get(`/refunds/my${params}`);
      const list = res.data.data.refunds || [];
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter]);

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
          {stats && (
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
          <ActivityIndicator
            size="large"
            color={c.orange}
            style={{ paddingVertical: 40 }}
          />
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 16,
                }}
              >
                <StatCard label="Total" value={stats.total} />
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
              <RefundList
                refunds={visible}
                onPressItem={(r) =>
                  navigation.navigate("RefundDetail", { refundId: r.id })
                }
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

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
        style={{ color: color || c.text }}
      >
        {value}
      </AppText>
      <AppText
        variant="small"
        tone="dim"
        style={{ textTransform: "uppercase", letterSpacing: 0.6 }}
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
    minWidth: 90,
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
});
