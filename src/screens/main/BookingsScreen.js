// src/screens/main/BookingsScreen.js
// Mirrors the website's BookingList.jsx.
// Skeleton loading. Edge-to-edge content.
// API: GET /bookings?page&limit&status

import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import { getBookings } from "../../api/bookings";

import {
  FaBriefcase,
  FaMapMarkerAlt,
  FaClock,
  FaHandshake,
  FaCalendarAlt,
  FaMoneyBillWave,
} from "../../icons/fa";

// ── Duration formatter (mirrors website) ────────────────────────────────
function formatDuration(booking) {
  if (!booking) return null;

  const unit = booking.estimatedUnit || "hours";
  const value = booking.estimatedValue || null;
  const hours = booking.estimatedHours || null;
  const customLabel = booking.customLabel || "Custom";

  if (!value && !hours) return null;

  if (unit === "custom") {
    const quantityNum = booking.quantity || 1;
    return { main: `${quantityNum} ${customLabel}`, sub: null };
  }

  if (value) {
    const unitLabel =
      {
        hours: "hour",
        days: "day",
        weeks: "week",
        months: "month",
        years: "year",
      }[unit] || unit;

    let numValue = value;
    if (typeof value === "string" && !isNaN(parseFloat(value))) {
      numValue = parseFloat(value);
    }

    const num = typeof numValue === "number" ? numValue : parseFloat(value);
    if (isNaN(num) || num <= 0) {
      return { main: value, sub: null };
    }

    const label = unitLabel + (num !== 1 ? "s" : "");
    const eqv = unit !== "hours" && hours ? `≈ ${hours}h` : null;
    return { main: `${num} ${label}`, sub: eqv };
  }

  if (hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) {
      return { main: `${hours} hours`, sub: null };
    }
    return { main: `${num} hours`, sub: null };
  }

  return null;
}

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
  PENDING: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  ACCEPTED: { color: "#f97316", bg: "rgba(249,115,22,0.2)" },
  IN_PROGRESS: { color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  COMPLETED: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  DISPUTED: { color: "#fb7185", bg: "rgba(251,113,133,0.12)" },
};

// ── Skeleton card ──────────────────────────────────────────────────────
function BookingCardSkeleton() {
  const { theme: th } = useTheme();
  const c = th.colors;

  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderColor: c.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        gap: 10,
      }}
    >
      {/* Avatar + badge row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Skeleton.Circle size={36} />
        <Skeleton width={70} height={20} radius={10} />
      </View>
      {/* Title */}
      <Skeleton.Line width="80%" height={16} />
      {/* Party */}
      <Skeleton.Line width="50%" height={11} />
      {/* Meta chips */}
      <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
        <Skeleton width={80} height={18} radius={9} />
        <Skeleton width={60} height={18} radius={9} />
        <Skeleton width={70} height={18} radius={9} />
      </View>
      {/* Date + address */}
      <Skeleton.Line width="65%" height={11} />
      <Skeleton.Line width="90%" height={11} />
      {/* Footer */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
        }}
      >
        <Skeleton width={90} height={20} radius={6} />
        <Skeleton width={60} height={16} radius={8} />
      </View>
    </View>
  );
}

// ── Booking card (mirrors website BookingCard) ─────────────────────────
function BookingCard({ booking }) {
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const meta = STATUS_META[booking.status] || STATUS_META.PENDING;
  const other = booking.worker ?? booking.hirer;
  const scheduled = new Date(booking.scheduledAt);
  const isPast = scheduled < new Date();
  const dur = formatDuration(booking);

  const jobTypeLabel = (type) => {
    if (!type) return null;
    return type
      .toLowerCase()
      .replace("_", " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <Pressable
      onPress={() =>
        navigation.navigate("BookingDetail", { bookingId: booking.id })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.cardInner}>
        {/* Avatar + status badge */}
        <View style={styles.cardTop}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {other?.avatar ? (
              <Image source={{ uri: other.avatar }} style={styles.avatarImg} />
            ) : (
              <AppText
                variant="small"
                weight="bold"
                style={{ color: c.orange }}
              >
                {other?.firstName?.[0]}
                {other?.lastName?.[0]}
              </AppText>
            )}
          </View>
          <View
            style={[
              styles.badge,
              { backgroundColor: meta.bg, borderColor: `${meta.color}55` },
            ]}
          >
            <AppText
              variant="small"
              weight="bold"
              style={{
                color: meta.color,
                textTransform: "uppercase",
                fontSize: 10,
                letterSpacing: 0.5,
              }}
            >
              {booking.status.replace("_", " ")}
            </AppText>
          </View>
        </View>

        {/* Title */}
        <AppText
          variant="title"
          weight="displayBlack"
          numberOfLines={2}
          style={{ fontSize: 15, lineHeight: 20, marginTop: 2 }}
        >
          {booking.title}
        </AppText>

        {/* Party + category */}
        <AppText variant="small" tone="dim" numberOfLines={1}>
          {other?.firstName} {other?.lastName}
          {booking.category ? (
            <AppText variant="small" style={{ color: c.orange }}>
              {" · "}
              {booking.category.name}
            </AppText>
          ) : null}
        </AppText>

        {/* Meta chips */}
        <View style={styles.metaGrid}>
          {booking.jobType && (
            <View
              style={[
                styles.metaChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaBriefcase size={9} color={c.textDim} />
              <AppText
                variant="small"
                weight="semibold"
                tone="dim"
                style={{ fontSize: 10, marginLeft: 4 }}
              >
                {jobTypeLabel(booking.jobType)}
              </AppText>
            </View>
          )}
          {booking.locationType && (
            <View
              style={[
                styles.metaChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaMapMarkerAlt size={9} color={c.textDim} />
              <AppText
                variant="small"
                weight="semibold"
                tone="dim"
                style={{ fontSize: 10, marginLeft: 4 }}
              >
                {booking.locationType.replace("_", " ").toUpperCase()}
              </AppText>
            </View>
          )}
          {dur && (
            <View
              style={[
                styles.metaChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaClock size={9} color={c.textDim} />
              <AppText
                variant="small"
                weight="semibold"
                tone="dim"
                style={{ fontSize: 10, marginLeft: 4 }}
              >
                {dur.main}
                {dur.sub ? ` ${dur.sub}` : ""}
              </AppText>
            </View>
          )}
          {booking.isNegotiated && booking.negotiatedRate && (
            <View
              style={[
                styles.metaChip,
                {
                  backgroundColor: c.orangeDim,
                  borderColor: c.orangeGlow,
                },
              ]}
            >
              <FaHandshake size={9} color={c.orange} />
              <AppText
                variant="small"
                weight="semibold"
                style={{ fontSize: 10, marginLeft: 4, color: c.orange }}
              >
                Negotiated
              </AppText>
            </View>
          )}
        </View>

        {/* Date + address */}
        <View style={{ gap: 4 }}>
          <View style={styles.detailRow}>
            <FaCalendarAlt size={10} color={isPast ? c.textMuted : c.orange} />
            <AppText
              variant="small"
              style={{
                color: isPast ? c.textMuted : c.text,
                marginLeft: 6,
                fontSize: 11,
              }}
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
              <FaMapMarkerAlt size={10} color={c.textMuted} />
              <AppText
                variant="small"
                tone="dim"
                numberOfLines={1}
                style={{ marginLeft: 6, fontSize: 11, flex: 1 }}
              >
                {booking.address}
              </AppText>
            </View>
          )}
        </View>

        {/* Footer: rate + payment status */}
        <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <FaMoneyBillWave size={13} color={c.text} />
            <AppText
              variant="body"
              weight="displayBlack"
              style={{ color: c.text, fontSize: 16 }}
            >
              {booking.currency}{" "}
              {Number(booking.agreedRate || 0).toLocaleString()}
            </AppText>
          </View>
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
                weight="bold"
                style={{
                  color:
                    booking.payment.status === "RELEASED"
                      ? "#22c55e"
                      : c.orange,
                  fontSize: 9,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
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

// ── Main screen ────────────────────────────────────────────────────────
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
      padded={false}
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
      <View style={styles.outer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <AppText
              variant="small"
              weight="bold"
              style={{
                color: c.orange,
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {t("bookings.myJobs")}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
              }}
            >
              <AppText
                variant="title"
                weight="displayBlack"
                style={{ fontSize: 26 }}
              >
                {t("bookings.title", { defaultValue: "Bookings" })}
              </AppText>
              {total > 0 && !loading && (
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <AppText variant="small" weight="bold" tone="dim">
                    {total}
                  </AppText>
                </View>
              )}
            </View>
          </View>
          {isHirer && (
            <Pressable
              onPress={() => navigation.navigate("CreateBooking")}
              style={[styles.newBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                variant="small"
                weight="bold"
                style={{ color: c.bg, fontSize: 13 }}
              >
                + {t("bookings.newBooking", { defaultValue: "New Booking" })}
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: 16, marginBottom: 20 }}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
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
                    backgroundColor: active ? c.orangeDim : "transparent",
                    borderColor: active ? c.orange : c.border,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{
                    color: active ? c.orange : c.textDim,
                    fontSize: 12,
                  }}
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
          <View style={{ gap: 14 }}>
            {[1, 2, 3, 4].map((i) => (
              <BookingCardSkeleton key={i} />
            ))}
          </View>
        ) : bookings.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <FaBriefcase size={40} color={c.textMuted} />
            <AppText weight="bold" style={{ marginTop: 12, fontSize: 18 }}>
              {t("bookings.noBookings")}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ marginTop: 6, textAlign: "center", maxWidth: 320 }}
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
              <Pressable
                onPress={() => navigation.navigate("CreateBooking")}
                style={[styles.emptyBtn, { backgroundColor: c.orange }]}
              >
                <AppText variant="small" weight="bold" style={{ color: c.bg }}>
                  + {t("bookings.newBooking")}
                </AppText>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            {bookings.map((b) => (
              <BookingCard key={b.id} booking={b} />
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
              <AppText variant="small" weight="semibold">
                ← {t("bookings.prev", { defaultValue: "Prev" })}
              </AppText>
            </Pressable>
            <AppText variant="small" tone="dim">
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
              <AppText variant="small" weight="semibold">
                {t("bookings.next", { defaultValue: "Next" })} →
              </AppText>
            </Pressable>
          </View>
        )}
      </View>
    </AppScreen>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Edge-to-edge wrapper — only 8px horizontal
  outer: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 4,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  cardInner: {
    padding: 18,
    paddingLeft: 22,
    gap: 8,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  payTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  emptyBtn: {
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    paddingHorizontal: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
});
