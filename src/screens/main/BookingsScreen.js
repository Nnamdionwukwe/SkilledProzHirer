// src/screens/main/BookingsScreen.js
// Mirrors the website's BookingList.
// API: GET /bookings?page&limit&status

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import { getBookings } from "../../api/bookings";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUSES = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const STATUS_META = {
  PENDING: { color: "#f97316", bg: "rgba(249,115,22,0.15)" },
  ACCEPTED: { color: "#f97316", bg: "rgba(249,115,22,0.25)" },
  IN_PROGRESS: { color: "#6366f1", bg: "rgba(99,102,241,0.15)" },
  COMPLETED: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  DISPUTED: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)" },
};

// ─── Booking Card ─────────────────────────────────────────────────────────────
function BookingCard({ booking, c, t }) {
  const navigation = useNavigation();
  const meta = STATUS_META[booking.status] ?? STATUS_META.PENDING;
  const other = booking.worker ?? booking.hirer; // counterparty
  const scheduled = new Date(booking.scheduledAt);
  const isPast = scheduled < new Date();

  return (
    <Pressable
      onPress={() =>
        navigation.navigate("BookingDetail", { bookingId: booking.id })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.bgCard,
          borderColor: c.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.cardInner}>
        {/* Top: avatar + status */}
        <View style={styles.cardTop}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            {other?.avatar ? (
              <Image source={{ uri: other.avatar }} style={styles.avatarImg} />
            ) : (
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {other?.firstName?.[0]}
                {other?.lastName?.[0]}
              </AppText>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: meta.color }}
            >
              {booking.status.replace("_", " ")}
            </AppText>
          </View>
        </View>

        {/* Title */}
        <AppText
          variant="title"
          weight="semibold"
          style={{ marginTop: 10 }}
          numberOfLines={2}
        >
          {booking.title}
        </AppText>

        {/* Counterparty + category */}
        <AppText
          variant="small"
          tone="dim"
          numberOfLines={1}
          style={{ marginTop: 4 }}
        >
          {other?.firstName} {other?.lastName}
          {booking.category ? (
            <AppText variant="small" style={{ color: c.orange }}>
              {" · "}
              {booking.category.name}
            </AppText>
          ) : null}
        </AppText>

        {/* Date + address */}
        <View style={{ marginTop: 10, gap: 4 }}>
          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={isPast ? c.textMuted : c.orange}
              style={{ marginRight: 5 }}
            />
            <AppText
              variant="small"
              style={{ color: isPast ? c.textMuted : c.text }}
            >
              {scheduled.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {" · "}
              {scheduled.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </AppText>
          </View>
          {booking.address && (
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={12}
                color={c.textMuted}
                style={{ marginRight: 5 }}
              />
              <AppText variant="small" tone="dim" numberOfLines={1}>
                {booking.address}
              </AppText>
            </View>
          )}
        </View>

        {/* Footer: rate + payment status */}
        <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
          <AppText
            variant="body"
            weight="displayBlack"
            style={{ color: c.text, fontSize: 22 }}
          >
            {booking.currency} {Number(booking.agreedRate).toLocaleString()}
          </AppText>
          {booking.payment && (
            <View
              style={[
                styles.payTag,
                {
                  backgroundColor:
                    booking.payment.status === "RELEASED"
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(249,115,22,0.12)",
                },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{
                  color:
                    booking.payment.status === "RELEASED"
                      ? "#22c55e"
                      : c.orange,
                  fontSize: 10,
                }}
              >
                {booking.payment.status}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function BookingsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;
  const isHirer = user?.role === "HIRER";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(
    async (pg = 1, flt = filter) => {
      try {
        const params = { page: pg, limit: 12 };
        if (flt !== "ALL") params.status = flt;
        const data = await getBookings(params);
        setBookings(data.bookings ?? []);
        setPages(data.pages ?? 1);
        setTotal(data.total ?? 0);
      } catch {
        toast.error(t("toast.networkError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter, t, toast],
  );

  useEffect(() => {
    load(page, filter);
  }, [filter, page]);

  const handleFilter = (f) => {
    setFilter(f);
    setPage(1);
  };

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(1, filter);
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, letterSpacing: 0.8 }}
          >
            {t("bookings.myJobs").toUpperCase()}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginTop: 4,
            }}
          >
            {total > 0 && (
              <View
                style={[
                  styles.totalBadge,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText variant="small" weight="semibold">
                  {total}
                </AppText>
              </View>
            )}
          </View>
        </View>
        {isHirer && (
          <AppButton
            title={t("bookings.newBooking")}
            fullWidth={false}
            onPress={() => navigation.navigate("CreateBooking")}
            style={{ paddingHorizontal: 14 }}
          />
        )}
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 16 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {STATUSES.map((s) => {
          const active = filter === s;
          return (
            <Pressable
              key={s}
              onPress={() => handleFilter(s)}
              style={[
                styles.filterTab,
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
                {s === "ALL"
                  ? t("bookings.all")
                  : s === "IN_PROGRESS"
                    ? t("bookings.inProgress")
                    : t(`bookings.${s.toLowerCase()}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={c.orange} />
        </View>
      ) : bookings.length === 0 ? (
        <Card padded style={styles.emptyCard}>
          <Ionicons name="briefcase-outline" size={36} color={c.textMuted} />
          <AppText variant="body" weight="semibold" style={{ marginTop: 12 }}>
            {t("bookings.noBookings")}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginTop: 6, textAlign: "center" }}
          >
            {filter === "ALL"
              ? isHirer
                ? t("bookings.noBookingsHirer")
                : t("bookings.noBookingsWorker")
              : t("bookings.noBookingsFiltered", {
                  status: filter.toLowerCase().replace("_", " "),
                })}
          </AppText>
          {filter === "ALL" && isHirer && (
            <AppButton
              title={t("bookings.newBooking")}
              iconLeft="add"
              onPress={() => navigation.navigate("CreateBooking")}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      ) : (
        <View style={styles.grid}>
          {bookings.map((b) => (
            <BookingCard key={b.id} booking={b} c={c} t={t} />
          ))}
        </View>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <View style={[styles.pagination, { borderTopColor: c.border }]}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            style={[
              styles.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === 1 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={16} color={c.text} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginLeft: 6 }}
            >
              Prev
            </AppText>
          </Pressable>
          <AppText variant="body" tone="dim">
            {page} {t("bookings.of")} {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => p + 1)}
            style={[
              styles.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === pages ? 0.4 : 1,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginRight: 6 }}
            >
              Next
            </AppText>
            <Ionicons name="arrow-forward" size={16} color={c.text} />
          </Pressable>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  totalBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  emptyCard: { alignItems: "center", paddingVertical: 40, marginTop: 16 },
  grid: { gap: 12, marginTop: 16 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  accentBar: { height: 3, width: "100%" },
  cardInner: { padding: 16 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  detailRow: { flexDirection: "row", alignItems: "center" },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  payTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
