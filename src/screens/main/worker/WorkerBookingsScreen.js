// src/screens/main/worker/WorkerBookingsScreen.js
// Mirrors: website worker /bookings page (MY JOBS)
// API: GET /bookings → role-aware, returns worker's assigned bookings
//      GET /bookings/:id → booking detail (navigates to shared BookingDetailScreen)

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../../components/AppText";
import Avatar from "../../../components/Avatar";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { getBookings } from "../../../api/bookings";

const SCREEN_W = Dimensions.get("window").width;
const LIMIT = 15;

// ─── Status meta ──────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: { label: "PENDING", color: "#f59e0b", border: "#f59e0b" },
  ACCEPTED: { label: "ACCEPTED", color: "#f97316", border: "#f97316" },
  IN_PROGRESS: { label: "IN PROGRESS", color: "#3b82f6", border: "#3b82f6" },
  COMPLETED: { label: "COMPLETED", color: "#22c55e", border: "#22c55e" },
  CANCELLED: { label: "CANCELLED", color: "#6b7280", border: "#6b7280" },
  DISPUTED: { label: "DISPUTED", color: "#ef4444", border: "#ec4899" },
};

const PAY_STATUS_META = {
  PENDING: { label: "PENDING", color: "#f59e0b", bg: "rgba(245,158,11,0.18)" },
  COMPLETED: { label: "PAID", color: "#22c55e", bg: "rgba(34,197,94,0.18)" },
  FAILED: { label: "FAILED", color: "#ef4444", bg: "rgba(239,68,68,0.18)" },
  REFUNDED: {
    label: "REFUNDED",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.18)",
  },
};

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: null, label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "ACCEPTED", label: "Accepted" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
}

function fmtBudget(currency, rate) {
  if (!rate && rate !== 0) return "—";
  return `${currency ?? ""} ${Number(rate).toLocaleString()}`.trim();
}

// ─── Booking card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, onPress, c }) {
  const statusMeta = STATUS_META[booking.status] ?? STATUS_META.PENDING;
  const payMeta =
    PAY_STATUS_META[booking.paymentStatus] ?? PAY_STATUS_META.PENDING;

  // The hirer who booked this worker
  const hirer = booking.hirer ?? {};
  const category =
    booking.category?.name ?? booking.worker?.workerProfile?.title ?? "";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        bc.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
        { borderLeftColor: statusMeta.border },
        pressed && { opacity: 0.85 },
      ]}
    >
      {/* Top: hirer avatar + status badge */}
      <View style={bc.topRow}>
        <Avatar
          uri={hirer.avatar}
          firstName={hirer.firstName}
          lastName={hirer.lastName}
          size={40}
        />
        <View style={{ flex: 1 }} />
        <View
          style={[
            bc.statusBadge,
            {
              backgroundColor: `${statusMeta.color}22`,
              borderColor: `${statusMeta.color}55`,
            },
          ]}
        >
          <AppText
            style={{
              fontSize: 11,
              color: statusMeta.color,
              fontWeight: "700",
              letterSpacing: 0.5,
            }}
          >
            {statusMeta.label}
          </AppText>
        </View>
      </View>

      {/* Booking title */}
      <AppText
        weight="semibold"
        style={[bc.title, { color: c.text }]}
        numberOfLines={2}
      >
        {booking.title}
      </AppText>

      {/* Hirer name · category (orange) */}
      <View style={bc.hirerRow}>
        <AppText variant="small" style={{ color: c.textMuted }}>
          {hirer.firstName} {hirer.lastName}
        </AppText>
        {category ? (
          <>
            <AppText variant="small" style={{ color: c.textMuted }}>
              {" · "}
            </AppText>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {category}
            </AppText>
          </>
        ) : null}
      </View>

      {/* Scheduled date */}
      {booking.scheduledAt && (
        <View style={bc.metaRow}>
          <AppText style={{ fontSize: 14, marginRight: 6 }}>📅</AppText>
          <AppText variant="small" tone="dim">
            {fmtDate(booking.scheduledAt)}
          </AppText>
        </View>
      )}

      {/* Address */}
      {booking.address && (
        <View style={bc.metaRow}>
          <AppText style={{ fontSize: 14, marginRight: 6 }}>📍</AppText>
          <AppText variant="small" tone="dim" numberOfLines={1}>
            {booking.address}
          </AppText>
        </View>
      )}

      {/* Divider */}
      <View style={[bc.divider, { backgroundColor: c.border }]} />

      {/* Budget + payment status */}
      <View style={bc.bottomRow}>
        <AppText
          weight="displayBlack"
          style={{ color: c.text, fontSize: 22, lineHeight: 28 }}
        >
          {fmtBudget(booking.currency, booking.agreedRate)}
        </AppText>
        {booking.paymentStatus && (
          <View
            style={[
              bc.payBadge,
              {
                backgroundColor: payMeta.bg,
                borderColor: `${payMeta.color}55`,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 10,
                color: payMeta.color,
                fontWeight: "700",
                letterSpacing: 0.5,
              }}
            >
              {payMeta.label}
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const bc = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 12,
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  title: { fontSize: 18, lineHeight: 24, marginBottom: 4 },
  hirerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
});

// ─── Filter tab ───────────────────────────────────────────────────────────────
function FilterTab({ label, active, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        ft.tab,
        {
          backgroundColor: active ? c.orange : c.bgCard,
          borderColor: active ? c.orange : c.border,
        },
      ]}
    >
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: active ? "#fff" : c.text }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const ft = StyleSheet.create({
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
});

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 12, marginTop: 8 }}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            {
              height: 170,
              borderRadius: 16,
              borderWidth: 4,
              borderLeftWidth: 4,
              opacity: 0.4,
            },
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              borderLeftColor: c.orange,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerBookingsScreen({ navigation }) {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const c = th.colors;

  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = 1, tab = activeTab, replace = true) => {
      if (replace && pg === 1) setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (tab) params.status = tab;

        const data = await getBookings(params);
        const list = data.bookings ?? data.data ?? [];

        setBookings(replace ? list : (prev) => [...prev, ...list]);
        setTotal(data.total ?? 0);
        setTotalPages(data.pages ?? 1);
        setPage(pg);
      } catch (err) {
        toast.error(err?.response?.data?.message ?? "Could not load bookings");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    setPage(1);
    load(1, activeTab, true);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, activeTab, true);
  };

  const loadMore = () => {
    if (page < totalPages && !loading) load(page + 1, activeTab, false);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={s.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* ── Page header ── */}
            <AppText
              weight="semibold"
              style={{
                color: c.orange,
                letterSpacing: 1.2,
                fontSize: 12,
                marginBottom: 6,
              }}
            >
              MY JOBS
            </AppText>
            <View style={s.titleRow}>
              <AppText
                weight="displayBlack"
                style={[s.pageTitle, { color: c.text }]}
              >
                Bookings
              </AppText>
              {total > 0 && (
                <View
                  style={[
                    s.countBadge,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text }}
                  >
                    {total}
                  </AppText>
                </View>
              )}
            </View>

            {/* ── Filter tabs ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.tabsScroll}
              contentContainerStyle={{ flexDirection: "row", gap: 8 }}
            >
              {STATUS_TABS.map((tab) => (
                <FilterTab
                  key={String(tab.key)}
                  label={tab.label}
                  active={activeTab === tab.key}
                  onPress={() => setActiveTab(tab.key)}
                  c={c}
                />
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            c={c}
            onPress={() =>
              navigation.navigate("BookingDetail", { bookingId: item.id })
            }
          />
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={s.empty}>
              <AppText style={{ fontSize: 52, marginBottom: 14 }}>📋</AppText>
              <AppText
                variant="title"
                weight="semibold"
                style={{ color: c.text, marginBottom: 8 }}
              >
                {activeTab
                  ? `No ${activeTab.toLowerCase().replace("_", " ")} bookings`
                  : "No bookings yet"}
              </AppText>
              <AppText
                variant="body"
                tone="dim"
                style={{ textAlign: "center" }}
              >
                {activeTab
                  ? "Try switching to a different filter."
                  : "When hirers book you, your jobs will appear here."}
              </AppText>
              {activeTab && (
                <Pressable
                  onPress={() => setActiveTab(null)}
                  style={[s.clearBtn, { borderColor: c.border, marginTop: 16 }]}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.text }}
                  >
                    Show all bookings
                  </AppText>
                </Pressable>
              )}
            </View>
          )
        }
        ListFooterComponent={
          page < totalPages ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator color={c.orange} />
            </View>
          ) : (
            <View style={{ height: 40 }} />
          )
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  pageTitle: { fontSize: 36, lineHeight: 42 },
  countBadge: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },

  tabsScroll: { flexGrow: 0, marginBottom: 20 },

  empty: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 24 },
  clearBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
