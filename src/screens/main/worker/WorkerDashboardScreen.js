// src/screens/main/worker/WorkerDashboardScreen.js
// Mirrors the website's worker dashboard — earnings hero, stats grid,
// bar chart, profile completion, upcoming jobs, recent bookings, recent reviews.
// API: GET /workers/dashboard
// All strings via t("workerDash.*") — fully i18n.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../../components/AppScreen";
import AppText from "../../../components/AppText";
import Card from "../../../components/Card";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─── Status meta ──────────────────────────────────────────────────────────────
// labelKey maps to workerDash.status* — resolved at render time via t()
const STATUS_META = {
  PENDING: {
    color: "#f97316",
    bg: "rgba(249,115,22,0.18)",
    labelKey: "statusPending",
  },
  ACCEPTED: {
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.18)",
    labelKey: "statusAccepted",
  },
  IN_PROGRESS: {
    color: "#6366f1",
    bg: "rgba(99,102,241,0.18)",
    labelKey: "statusInProgress",
  },
  COMPLETED: {
    color: "#22c55e",
    bg: "rgba(34,197,94,0.15)",
    labelKey: "statusCompleted",
  },
  CANCELLED: {
    color: "#ef4444",
    bg: "rgba(239,68,68,0.15)",
    labelKey: "statusCancelled",
  },
  DISPUTED: {
    color: "#f43f5e",
    bg: "rgba(244,63,94,0.18)",
    labelKey: "statusDisputed",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount, currency = "USD") {
  if (!amount && amount !== 0) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 14 }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color="#f97316"
        />
      ))}
    </View>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, t }) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  return (
    <View style={[bk.badge, { backgroundColor: meta.bg }]}>
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: meta.color, fontSize: 10 }}
      >
        {t(`workerDash.${meta.labelKey}`)}
      </AppText>
    </View>
  );
}

// ─── Earnings Hero ────────────────────────────────────────────────────────────
function EarningsHero({ earnings, c, t }) {
  const {
    currency = "USD",
    thisMonth = 0,
    lastMonth = 0,
    pendingPayout = 0,
  } = earnings ?? {};
  return (
    <View style={[hero.card, { backgroundColor: "#1a0e00" }]}>
      <View style={hero.glow} />

      <AppText
        variant="small"
        weight="semibold"
        style={{ color: c.textMuted, letterSpacing: 1.2, fontSize: 11 }}
      >
        {t("workerDash.thisMonth")}
      </AppText>
      <AppText style={hero.amount}>{fmt(thisMonth, currency)}</AppText>
      <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
        {t("workerDash.lastMonth", { value: fmt(lastMonth, currency) })}
      </AppText>

      {pendingPayout > 0 && (
        <View style={[hero.escrow, { borderColor: c.orange }]}>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, letterSpacing: 1, fontSize: 11 }}
          >
            {t("workerDash.inEscrow")}
          </AppText>
          <AppText style={[hero.escrowAmt, { color: c.orange }]}>
            {fmt(pendingPayout, currency)}
          </AppText>
          <AppText variant="small" tone="dim">
            {t("workerDash.awaitingRelease")}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, c }) {
  return (
    <View
      style={[sc.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: c.textMuted, letterSpacing: 1.2, fontSize: 10 }}
      >
        {label.toUpperCase()}
      </AppText>
      <AppText style={[sc.value, { color: c.text }]}>{value ?? "—"}</AppText>
      {sub ? (
        <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
          {sub}
        </AppText>
      ) : null}
    </View>
  );
}

// ─── Earnings Bar Chart ───────────────────────────────────────────────────────
function EarningsChart({ monthlyTrend, c, t, onPress }) {
  if (!monthlyTrend?.length) return null;
  const max = Math.max(...monthlyTrend.map((m) => m.earnings), 1);
  const BAR_HEIGHT = 80;
  return (
    <Card padded style={{ marginBottom: 12 }}>
      <View style={ch.header}>
        <AppText variant="title" weight="semibold">
          {t("workerDash.earningsTrend")}
        </AppText>
        <Pressable onPress={onPress} hitSlop={8}>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {t("workerDash.fullReport")} →
          </AppText>
        </Pressable>
      </View>
      <View style={ch.chartRow}>
        {monthlyTrend.map((item, i) => {
          const barH = Math.max((item.earnings / max) * BAR_HEIGHT, 4);
          const isMax = item.earnings === max && item.earnings > 0;
          return (
            <View key={i} style={ch.barWrap}>
              <View style={[ch.barTrack, { height: BAR_HEIGHT }]}>
                <View
                  style={[
                    ch.bar,
                    {
                      height: barH,
                      backgroundColor: isMax ? c.orange : c.orangeDim,
                    },
                  ]}
                />
              </View>
              <AppText
                variant="small"
                tone="dim"
                style={{ fontSize: 10, marginTop: 6, textAlign: "center" }}
              >
                {item.month?.split(" ")[0]?.toUpperCase() ?? ""}
              </AppText>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

// ─── Profile Completion ───────────────────────────────────────────────────────
function ProfileCompletion({ pct, c, t, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[pc.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <View style={pc.row}>
        <AppText variant="body" weight="semibold">
          {t("workerDash.profileCompletion")}
        </AppText>
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: c.orange, fontSize: 18 }}
        >
          {pct}%
        </AppText>
      </View>
      <View style={[pc.track, { backgroundColor: c.bgInput }]}>
        <View
          style={[
            pc.fill,
            { backgroundColor: c.orange, width: `${Math.min(pct, 100)}%` },
          ]}
        />
      </View>
    </Pressable>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title, linkLabel, onLink, c }) {
  return (
    <View style={s.sectionHeader}>
      <AppText variant="title" weight="semibold">
        {title}
      </AppText>
      {onLink && (
        <Pressable onPress={onLink} hitSlop={8}>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {linkLabel} →
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

// ─── Upcoming Job Row ─────────────────────────────────────────────────────────
function UpcomingJobRow({ booking, c, t, onPress }) {
  const hirer = booking.hirer ?? {};
  const cat = booking.category ?? {};
  const date = new Date(booking.scheduledAt);
  return (
    <Pressable
      onPress={onPress}
      style={[bk.row, { borderBottomColor: c.border }]}
    >
      <View style={[bk.avatar, { backgroundColor: c.bgInput }]}>
        {hirer.avatar ? (
          <Image source={{ uri: hirer.avatar }} style={bk.avatarImg} />
        ) : (
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, fontSize: 11 }}
          >
            {initials(hirer.firstName, hirer.lastName)}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText variant="body" weight="semibold" numberOfLines={1}>
          {booking.title}
        </AppText>
        <AppText variant="small" tone="dim">
          {date.toLocaleDateString("en-GB", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })}
          {cat.name ? ` · ${cat.name}` : ""}
        </AppText>
      </View>
      <StatusBadge status={booking.status} t={t} />
    </Pressable>
  );
}

// ─── Recent Booking Row ───────────────────────────────────────────────────────
function BookingRow({ booking, c, t, onPress }) {
  const hirer = booking.hirer ?? {};
  const cat = booking.category ?? {};
  const currency = booking.currency ?? "USD";
  return (
    <Pressable
      onPress={onPress}
      style={[bk.row, { borderBottomColor: c.border }]}
    >
      <View style={[bk.avatar, { backgroundColor: c.bgInput }]}>
        {hirer.avatar ? (
          <Image source={{ uri: hirer.avatar }} style={bk.avatarImg} />
        ) : (
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, fontSize: 11 }}
          >
            {initials(hirer.firstName, hirer.lastName)}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <AppText variant="body" weight="semibold" numberOfLines={1}>
          {booking.title}
        </AppText>
        <AppText variant="small" tone="dim">
          {[hirer.firstName, hirer.lastName].filter(Boolean).join(" ")}
          {cat.name ? ` · ${cat.name}` : ""}
        </AppText>
        {booking.agreedRate > 0 && (
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#22c55e", marginTop: 2 }}
          >
            {currency} {Number(booking.agreedRate).toLocaleString()}
          </AppText>
        )}
      </View>
      <StatusBadge status={booking.status} t={t} />
    </Pressable>
  );
}

// ─── Recent Review Row ────────────────────────────────────────────────────────
function ReviewRow({ review, c }) {
  const giver = review.giver ?? {};
  return (
    <View style={[rv.row, { borderBottomColor: c.border }]}>
      <View style={rv.left}>
        <AppText variant="body" weight="semibold">
          {[giver.firstName, giver.lastName].filter(Boolean).join(" ") ||
            "Anonymous"}
        </AppText>
        {review.comment ? (
          <AppText
            variant="small"
            tone="dim"
            numberOfLines={2}
            style={{ marginTop: 2 }}
          >
            {review.comment}
          </AppText>
        ) : null}
      </View>
      <StarRow rating={review.rating ?? 0} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerDashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await client.get("/workers/dashboard");
      setData(res.data.data);
    } catch {
      toast.error(t("toast.networkError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  // ── Data extraction ──────────────────────────────────────────────────────────
  const profile = data?.profile ?? {};
  const stats = data?.stats ?? {};
  const earnings = stats.earnings ?? {};
  const bookingStats = stats.bookings ?? {};
  const engagement = stats.engagement ?? {};
  const upcomingJobs = data?.upcomingBookings ?? [];
  const recentBookings = data?.recentBookings ?? [];
  const recentReviews = data?.recentReviews ?? [];
  const monthlyTrend = data?.monthlyTrend ?? [];
  const profilePct = profile.profileCompletion ?? 0;
  const workerUser = profile.user ?? user ?? {};

  // Quick actions (labels translated here — in main component where t() is valid)
  const QUICK_ACTIONS = [
    {
      icon: "briefcase-outline",
      label: t("nav.browseJobs"),
      screen: "WorkerJobs",
    },
    {
      icon: "person-outline",
      label: t("workerDash.qaProfile"),
      screen: "WorkerProfile",
    },
    {
      icon: "card-outline",
      label: t("workerDash.qaEarnings"),
      screen: "WorkerEarnings",
    },
    {
      icon: "document-text-outline",
      label: t("workerDash.qaApplications"),
      screen: "WorkerApplications",
    },
  ];

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── GREETING ──────────────────────────────────────────────────────── */}
      <View style={s.greeting}>
        <View>
          <AppText variant="small" tone="dim">
            {t("workerDash.welcomeBack")}
          </AppText>
          <AppText
            variant="display"
            weight="displayBlack"
            style={{ marginTop: 2 }}
          >
            {workerUser.firstName}
          </AppText>
        </View>
        <View
          style={[
            s.availPill,
            {
              backgroundColor: profile.isAvailable
                ? "rgba(34,197,94,0.15)"
                : "rgba(239,68,68,0.12)",
              borderColor: profile.isAvailable ? "#22c55e" : "#ef4444",
            },
          ]}
        >
          <View
            style={[
              s.availDot,
              { backgroundColor: profile.isAvailable ? "#22c55e" : "#ef4444" },
            ]}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{
              color: profile.isAvailable ? "#22c55e" : "#ef4444",
              marginLeft: 6,
            }}
          >
            {profile.isAvailable
              ? t("workerDash.available")
              : t("workerDash.unavailable")}
          </AppText>
        </View>
      </View>

      {/* ── EARNINGS HERO ─────────────────────────────────────────────────── */}
      <EarningsHero earnings={earnings} c={c} t={t} />

      {/* ── STATS GRID ────────────────────────────────────────────────────── */}
      <View style={s.statsGrid}>
        <StatCard
          label={t("workerDash.activeJobs")}
          value={bookingStats.active ?? 0}
          sub={t("workerDash.pendingRequests", {
            count: bookingStats.pending ?? 0,
          })}
          c={c}
        />
        <StatCard
          label={t("workerDash.rating")}
          value={
            engagement.avgRating > 0
              ? Number(engagement.avgRating).toFixed(1)
              : t("workerDash.newWorker")
          }
          sub={t("workerDash.fromReviews", {
            count: engagement.totalReviews ?? 0,
          })}
          c={c}
        />
        <StatCard
          label={t("workerDash.jobsDone")}
          value={engagement.completedJobs ?? 0}
          sub={t("workerDash.responseRate", {
            rate: engagement.responseRate ?? 0,
          })}
          c={c}
        />
        <StatCard
          label={t("workerDash.unreadMessages")}
          value={engagement.unreadMessages ?? 0}
          sub={t("workerDash.unreadConversations")}
          c={c}
        />
      </View>

      {/* ── EARNINGS CHART ────────────────────────────────────────────────── */}
      <EarningsChart
        monthlyTrend={monthlyTrend}
        c={c}
        t={t}
        onPress={() => navigation.navigate("WorkerEarnings")}
      />

      {/* ── PROFILE COMPLETION ────────────────────────────────────────────── */}
      {profilePct < 100 && (
        <ProfileCompletion
          pct={profilePct}
          c={c}
          t={t}
          onPress={() => navigation.navigate("WorkerProfile")}
        />
      )}

      {/* ── UPCOMING JOBS ─────────────────────────────────────────────────── */}
      <Card padded style={{ marginBottom: 12 }}>
        <SectionHeader
          title={t("workerDash.upcomingJobs")}
          linkLabel={t("workerDash.seeAll")}
          onLink={() => navigation.navigate("WorkerBookings")}
          c={c}
        />
        {upcomingJobs.length === 0 ? (
          <View style={s.emptyWrap}>
            <AppText variant="small" tone="dim">
              {t("workerDash.noUpcomingJobs")}
            </AppText>
          </View>
        ) : (
          upcomingJobs.map((b) => (
            <UpcomingJobRow
              key={b.id}
              booking={b}
              c={c}
              t={t}
              onPress={() =>
                navigation.navigate("BookingDetail", { bookingId: b.id })
              }
            />
          ))
        )}
      </Card>

      {/* ── RECENT BOOKINGS ───────────────────────────────────────────────── */}
      <Card padded style={{ marginBottom: 12 }}>
        <SectionHeader
          title={t("workerDash.recentBookings")}
          linkLabel={t("workerDash.viewAll")}
          onLink={() => navigation.navigate("WorkerBookings")}
          c={c}
        />
        {recentBookings.length === 0 ? (
          <View style={s.emptyWrap}>
            <AppText variant="small" tone="dim">
              {t("workerDash.noBookings")}
            </AppText>
          </View>
        ) : (
          recentBookings
            .slice(0, 6)
            .map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                c={c}
                t={t}
                onPress={() =>
                  navigation.navigate("BookingDetail", { bookingId: b.id })
                }
              />
            ))
        )}
      </Card>

      {/* ── RECENT REVIEWS ────────────────────────────────────────────────── */}
      <Card padded style={{ marginBottom: 12 }}>
        <SectionHeader
          title={t("workerDash.recentReviews")}
          linkLabel={t("workerDash.seeAll")}
          onLink={() => navigation.navigate("WorkerReviews")}
          c={c}
        />
        {recentReviews.length === 0 ? (
          <View style={s.emptyWrap}>
            <AppText variant="small" tone="dim">
              {t("workerDash.noReviews")}
            </AppText>
          </View>
        ) : (
          recentReviews.map((r) => <ReviewRow key={r.id} review={r} c={c} />)
        )}
      </Card>

      {/* ── QUICK ACTIONS ─────────────────────────────────────────────────── */}
      <Card padded style={{ marginBottom: 0 }}>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={{ letterSpacing: 0.8, marginBottom: 14 }}
        >
          {t("workerDash.quickActions")}
        </AppText>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((item) => (
            <Pressable
              key={item.screen}
              onPress={() => navigation.navigate(item.screen)}
              style={[
                s.quickBtn,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <View style={[s.quickIcon, { backgroundColor: c.orangeDim }]}>
                <Ionicons name={item.icon} size={20} color={c.orange} />
              </View>
              <AppText
                variant="small"
                weight="semibold"
                style={{ marginTop: 8, textAlign: "center", color: c.text }}
              >
                {item.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </Card>
    </AppScreen>
  );
}

// ─── StyleSheets ──────────────────────────────────────────────────────────────

const hero = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
    position: "relative",
    backgroundColor: "#1a0e00",
  },
  glow: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(249,115,22,0.12)",
  },
  amount: {
    fontSize: 36,
    fontWeight: "900",
    color: "#fff",
    marginTop: 6,
    letterSpacing: -0.5,
  },
  escrow: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(249,115,22,0.08)",
  },
  escrowAmt: {
    fontSize: 28,
    fontWeight: "900",
    marginTop: 4,
    letterSpacing: -0.5,
  },
});

const sc = StyleSheet.create({
  card: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  value: { fontSize: 32, fontWeight: "900", marginTop: 6, letterSpacing: -0.5 },
});

const ch = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 6,
  },
  barWrap: { flex: 1, alignItems: "center" },
  barTrack: { width: "100%", justifyContent: "flex-end" },
  bar: { borderRadius: 6, width: "100%" },
});

const pc = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  track: { height: 6, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});

const bk = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 19 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginLeft: 8,
  },
});

const rv = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  left: { flex: 1 },
});

const s = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  greeting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  availPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  emptyWrap: { paddingVertical: 24, alignItems: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickBtn: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
