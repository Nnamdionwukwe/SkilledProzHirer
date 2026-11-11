// src/screens/main/worker/WorkerDashboardScreen.js
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useWorkerAvailability } from "../../../store/workerAvailabilityStore";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useCurrency } from "../../../contexts/CurrencyContext";
import { useAuthStore } from "../../../store/authStore";
import { rem, FONTS } from "../../../constants/theme";
import { getWorkerDashboard } from "../../../api/workerAuth";
import { CURRENCIES } from "../../../constants/currencies";
import client from "../../../api/client";

function formatCurrency(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

function StatusBadge({ status, c, t }) {
  const map = {
    PENDING: { bg: "rgba(234,179,8,0.12)", color: "#eab308" },
    IN_PROGRESS: { bg: "rgba(59,130,246,0.12)", color: "#60a5fa" },
    COMPLETED: { bg: c.greenDim, color: c.green },
    CANCELLED: { bg: "rgba(255,255,255,0.05)", color: c.textMuted },
    DISPUTED: { bg: c.redDim, color: c.red },
    ACCEPTED: { bg: "rgba(168,85,247,0.12)", color: "#c084fc" },
    RELEASED: { bg: c.greenDim, color: c.green },
  };
  const style = map[status] || map.PENDING;
  return (
    <View style={[s.badge, { backgroundColor: style.bg }]}>
      <AppText style={[s.badgeText, { color: style.color }]}>
        {t(`booking.status.${status?.toLowerCase() || "pending"}`)}
      </AppText>
    </View>
  );
}

function CurrencySwitch() {
  const { t } = useTranslation();
  const { dashboardCurrency, changeDashboardCurrency } = useCurrency();
  const [showModal, setShowModal] = useState(false);
  const { theme } = useTheme();
  const c = theme.colors;

  const activeCurrency = CURRENCIES.find((x) => x.code === dashboardCurrency);

  return (
    <>
      <Pressable style={s.currWrap} onPress={() => setShowModal(true)}>
        <AppText style={s.currLabel}>{t("workerDash.viewingIn")}</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <AppText style={s.currSelect}>
            {activeCurrency?.symbol} {dashboardCurrency}
          </AppText>
          <Ionicons name="chevron-down" size={12} color={c.textMuted} />
        </View>
      </Pressable>

      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={s.modalOverlay} onPress={() => setShowModal(false)}>
          <View style={[s.modalBox, { backgroundColor: c.bgPanel }]}>
            <AppText
              variant="title"
              weight="displayBlack"
              style={{ fontSize: 18, color: c.text, marginBottom: 16 }}
            >
              {t("settings.select.currency")}
            </AppText>
            <ScrollView style={{ maxHeight: 300 }}>
              {CURRENCIES.map((cur) => (
                <Pressable
                  key={cur.code}
                  style={s.currRow}
                  onPress={() => {
                    changeDashboardCurrency(cur.code);
                    setShowModal(false);
                  }}
                >
                  <AppText
                    style={{
                      color: cur.code === dashboardCurrency ? c.orange : c.text,
                    }}
                  >
                    {cur.symbol} {cur.code}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <View style={s.page}>
      <Skeleton width="100%" height={140} radius={12} />
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} width="47%" height={100} radius={12} />
        ))}
      </View>
      <Skeleton width="100%" height={220} radius={12} />
    </View>
  );
}

export default function WorkerDashboardScreen() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { theme } = useTheme();
  const c = theme.colors;
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const { dashboardCurrency } = useCurrency();
  const { user, updateUser } = useAuthStore();

  // ── Shared availability store — same source of truth used by Settings
  //    Work Profile and WorkerAvailabilityScreen. Any change in one flips
  //    the others instantly, no refresh needed.
  const {
    isAvailable,
    setAvailable,
    hydrate: hydrateAvailability,
    loading: isTogglingAvail,
  } = useWorkerAvailability();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [greeting, setGreeting] = useState("greetingMorning");

  const isMobile = width <= 640;
  const isTablet = width <= 1100;

  const pagePad = rem(1.25);
  const gap = 16;

  const containerWidth = width - pagePad * 2;
  const mobileCardWidth = (containerWidth - gap) / 2;
  const tabletCardWidth = (containerWidth - gap * 3) / 4;
  const desktopHalfWidth = (containerWidth - gap) / 2;

  const fetchDashboardSilently = useCallback(async () => {
    try {
      const freshData = await getWorkerDashboard();
      setData(freshData);
      // Seed the shared store from the fresh profile so all screens match.
      hydrateAvailability(freshData?.profile || freshData?.user);
      if (
        freshData?.profile?.isAvailable !== undefined &&
        freshData.profile.isAvailable !== user?.isAvailable
      ) {
        if (updateUser)
          updateUser({ isAvailable: freshData.profile.isAvailable });
      }
    } catch (err) {
      console.error("Silent fetch failed:", err);
    }
  }, [updateUser, user?.isAvailable, hydrateAvailability]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("greetingMorning");
    else if (hour < 18) setGreeting("greetingAfternoon");
    else setGreeting("greetingEvening");

    let isMounted = true;
    getWorkerDashboard()
      .then((resData) => {
        if (isMounted) {
          setData(resData);
          // Seed the shared store from the initial fetch too.
          hydrateAvailability(resData?.profile || resData?.user);
          if (
            resData?.profile?.isAvailable !== undefined &&
            resData.profile.isAvailable !== user?.isAvailable
          ) {
            if (updateUser)
              updateUser({ isAvailable: resData.profile.isAvailable });
          }
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load dashboard");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []); // eslint-disable-line

  // ── Toggle — writes through the shared store. Optimistic update, auto
  //    rollback on failure. Keeps authStore.isAvailable mirrored for any
  //    legacy consumer (drawer, TopBar) that still reads it.
  const handleToggleAvailability = async () => {
    const next = !isAvailable;
    try {
      await setAvailable(next);
      if (updateUser) updateUser({ isAvailable: next });
      fetchDashboardSilently();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("workerDash.failedAvailability"),
      );
    }
  };

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Ionicons name="warning-outline" size={48} color={c.orange} />
        <AppText
          style={{
            color: "#fff",
            marginTop: 12,
            fontSize: 16,
            fontWeight: "700",
          }}
        >
          {t("workerDash.failedToLoad")}
        </AppText>
        <AppText
          style={{ color: c.textDim, marginTop: 8, textAlign: "center" }}
        >
          {error || t("workerDash.noData")}
        </AppText>
      </View>
    );
  }

  const stats = data.stats || {};
  const earnings = stats.earnings ||
    data.earnings || {
      thisMonth: 0,
      lastMonth: 0,
      pendingPayout: 0,
      thisYear: 0,
      allTime: 0,
    };
  const bookings = stats.bookings ||
    data.bookings || {
      active: 0,
      pending: 0,
      total: 0,
      completed: 0,
      cancelled: 0,
    };
  const engagement = stats.engagement ||
    data.engagement || {
      avgRating: null,
      totalReviews: 0,
      completedJobs: 0,
      responseRate: 0,
      unreadMessages: 0,
    };
  const profile = data.profile || {};

  const safeTrend = Array.isArray(data.monthlyTrend) ? data.monthlyTrend : [];
  const safeBookings = Array.isArray(data.recentBookings)
    ? data.recentBookings
    : [];
  const safeUpcoming = Array.isArray(data.upcomingBookings)
    ? data.upcomingBookings
    : [];
  const safeReviews = Array.isArray(data.recentReviews)
    ? data.recentReviews
    : [];

  const maxEarning = Math.max(...safeTrend.map((m) => m?.earnings || 0), 1);
  const completion = profile?.profileCompletion || 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={s.page}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Row 1: Greeting Header + Availability ── */}
      <View style={s.greetingRow}>
        <View style={s.iconCircle}>
          <Ionicons name="sunny" size={24} color={c.orange} />
        </View>

        <View style={s.greetingTextWrap}>
          <AppText style={s.greetingText} numberOfLines={1}>
            {t(`workerDash.${greeting}`)},
            <AppText
              variant="title"
              weight="displayBlack"
              style={s.greetingName}
            >
              {user?.firstName || "Worker"}
            </AppText>
          </AppText>
        </View>

        <Pressable
          onPress={handleToggleAvailability}
          disabled={isTogglingAvail}
          style={[
            s.statusPill,
            {
              borderColor: isAvailable ? "rgba(34,197,94,0.3)" : c.border,
              backgroundColor: isAvailable ? c.greenDim : c.bgCard,
            },
          ]}
        >
          {isTogglingAvail ? (
            <ActivityIndicator
              size="small"
              color={isAvailable ? c.green : c.textDim}
              style={{ marginRight: 4, transform: [{ scale: 0.6 }] }}
            />
          ) : (
            <View
              style={[
                s.availabilityDot,
                { backgroundColor: isAvailable ? c.green : c.textMuted },
              ]}
            />
          )}
          <AppText
            style={[
              s.availabilityText,
              { color: isAvailable ? c.green : c.textDim },
            ]}
          >
            {isAvailable
              ? t("workerDash.available")
              : t("workerDash.unavailable")}
          </AppText>
        </Pressable>
      </View>

      {/* ── Row 2: Currency Switch ── */}
      <View style={{ width: "100%" }}>
        <CurrencySwitch />
      </View>

      <View style={[s.gridRow, { gap }]}>
        <View
          style={[
            s.card,
            { backgroundColor: c.bgCard, borderColor: c.border },
            s.earningsCard,
            {
              width: "100%",
              flexDirection: "column",
              gap: 16,
              paddingVertical: 20,
            },
          ]}
        >
          <View style={s.earningsBlob} />
          <View style={{ zIndex: 1, width: "100%" }}>
            <AppText style={s.earningsLabel}>
              {t("workerDash.thisMonth")}
            </AppText>
            <AppText
              variant="title"
              weight="displayBlack"
              style={s.earningsValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(earnings.thisMonth || 0, dashboardCurrency)}
            </AppText>
            <AppText style={s.earningsMeta}>
              {t("workerDash.lastMonth", {
                value: formatCurrency(
                  earnings.lastMonth || 0,
                  dashboardCurrency,
                ),
              })}
            </AppText>
          </View>

          <View style={[s.pendingBox, { width: "100%", minWidth: 0 }]}>
            <AppText style={s.pendingLabel}>{t("workerDash.inEscrow")}</AppText>
            <AppText
              variant="title"
              weight="displayBlack"
              style={s.pendingValue}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(earnings.pendingPayout || 0, dashboardCurrency)}
            </AppText>
            <AppText style={s.pendingSub}>
              {t("workerDash.awaitingRelease")}
            </AppText>
          </View>
        </View>

        <View
          style={[
            s.card,
            {
              width: isMobile ? mobileCardWidth : tabletCardWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <AppText style={s.statLabel}>{t("workerDash.activeJobs")}</AppText>
          <AppText variant="title" weight="displayBlack" style={s.statValue}>
            {bookings.active || 0}
          </AppText>
          <AppText style={s.statSub}>
            {t("workerDash.pendingRequests", {
              count: bookings.pending || 0,
            })}
          </AppText>
        </View>

        <View
          style={[
            s.card,
            {
              width: isMobile ? mobileCardWidth : tabletCardWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <AppText style={s.statLabel}>{t("workerDash.rating")}</AppText>
          <AppText variant="title" weight="displayBlack" style={s.statValue}>
            {engagement?.avgRating
              ? Number(engagement.avgRating).toFixed(1)
              : "—"}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="star"
              size={12}
              color={c.orange}
              style={{ marginRight: 4 }}
            />
            <AppText style={s.statSub}>
              {t("workerDash.fromReviews", {
                count: engagement?.totalReviews || 0,
              })}
            </AppText>
          </View>
        </View>

        <View
          style={[
            s.card,
            {
              width: isMobile ? mobileCardWidth : tabletCardWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <AppText style={s.statLabel}>{t("workerDash.jobsDone")}</AppText>
          <AppText variant="title" weight="displayBlack" style={s.statValue}>
            {engagement?.completedJobs || 0}
          </AppText>
          <AppText style={s.statSub}>
            {t("workerDash.responseRate", {
              rate: engagement?.responseRate || 0,
            })}
          </AppText>
        </View>

        <View
          style={[
            s.card,
            {
              width: isMobile ? mobileCardWidth : tabletCardWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <AppText style={s.statLabel}>{t("workerDash.totalBookings")}</AppText>
          <AppText variant="title" weight="displayBlack" style={s.statValue}>
            {bookings?.total || 0}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <AppText style={s.statSub}>
              {t("workerDash.completedCancelled", {
                completed: bookings?.completed || 0,
                cancelled: bookings?.cancelled || 0,
              })}
            </AppText>
            {Number(bookings?.disputed) > 0 && (
              <AppText style={[s.statSub, { color: c.red, marginLeft: 4 }]}>
                {t("workerDash.disputedCount", {
                  count: bookings.disputed,
                })}
              </AppText>
            )}
          </View>
        </View>

        <View
          style={[
            s.card,
            {
              width: isMobile ? mobileCardWidth : tabletCardWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <AppText style={s.statLabel}>
            {t("workerDash.unreadMessages")}
          </AppText>
          <AppText variant="title" weight="displayBlack" style={s.statValue}>
            {engagement?.unreadMessages || 0}
          </AppText>
          <AppText style={s.statSub}>
            {t("workerDash.unreadConversations")}
          </AppText>
        </View>
      </View>

      <View style={[s.gridRow, { gap: 20 }]}>
        <View
          style={[
            s.card,
            {
              width: isMobile ? "100%" : desktopHalfWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <View style={s.cardHeader}>
            <AppText variant="title" weight="displayBlack" style={s.cardTitle}>
              {t("workerDash.earningsTrend")}
            </AppText>
            <Pressable onPress={() => navigation.navigate("WorkerEarnings")}>
              <AppText style={s.cardLink}>
                {t("workerDash.fullReport")} →
              </AppText>
            </Pressable>
          </View>
          <View style={s.barChart}>
            {safeTrend.map((m, i) => (
              <View key={m?.month || i} style={s.barWrap}>
                <View
                  style={[
                    s.bar,
                    {
                      height: `${Math.max(4, ((m?.earnings || 0) / maxEarning) * 100)}%`,
                    },
                  ]}
                />
                <AppText style={s.barLabel}>
                  {(m?.month || "").split(" ")[0]}
                </AppText>
              </View>
            ))}
          </View>
          <View
            style={[
              s.earningsMeta,
              { marginTop: 12, flexDirection: "row", gap: 12 },
            ]}
          >
            <AppText style={s.earningsMeta}>
              {t("workerDash.thisYear", {
                value: formatCurrency(
                  earnings.thisYear || 0,
                  dashboardCurrency,
                ),
              })}
            </AppText>
            <AppText style={s.earningsMeta}>
              {t("workerDash.allTime", {
                value: formatCurrency(earnings.allTime || 0, dashboardCurrency),
              })}
            </AppText>
          </View>
        </View>

        <View style={{ width: isMobile ? "100%" : desktopHalfWidth, gap: 16 }}>
          {completion < 100 && (
            <View
              style={[
                s.card,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <View style={s.completionHeader}>
                <AppText style={s.completionLabel}>
                  {t("workerDash.profileCompletion")}
                </AppText>
                <AppText
                  variant="title"
                  weight="displayBlack"
                  style={s.completionPct}
                >
                  {completion}%
                </AppText>
              </View>
              <View style={s.progressTrack}>
                <View style={[s.progressFill, { width: `${completion}%` }]} />
              </View>
              <AppText style={s.completionHint}>
                {t("workerDash.completeProfileHint")}
                <AppText
                  style={{ color: c.orange, fontWeight: "600" }}
                  onPress={() => navigation.navigate("WorkerProfile")}
                >
                  {t("workerDash.updateNow")} →
                </AppText>
              </AppText>

              {profile?.title && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.textDim,
                      fontWeight: "600",
                    }}
                  >
                    {profile.title}
                  </AppText>

                  {profile.verificationStatus === "VERIFIED" && (
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: c.green,
                        backgroundColor: c.greenDim,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: c.green,
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {t("workerDash.verified")}
                      </AppText>
                    </View>
                  )}

                  {profile.verificationStatus === "PENDING" && (
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: "rgba(251,191,36,0.3)",
                        backgroundColor: "rgba(251,191,36,0.1)",
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: "#fbbf24",
                          textTransform: "uppercase",
                          letterSpacing: 0.4,
                        }}
                      >
                        {t("workerDash.pending")}
                      </AppText>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View
            style={[
              s.card,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <View style={s.cardHeader}>
              <AppText
                variant="title"
                weight="displayBlack"
                style={s.cardTitle}
              >
                {t("workerDash.upcomingJobs")}
              </AppText>
              <Pressable onPress={() => navigation.navigate("WorkerBookings")}>
                <AppText style={s.cardLink}>{t("workerDash.seeAll")} →</AppText>
              </Pressable>
            </View>
            {safeUpcoming.length === 0 ? (
              <AppText
                style={[
                  s.statSub,
                  { textAlign: "center", paddingVertical: 12 },
                ]}
              >
                {t("workerDash.noUpcomingJobs")}
              </AppText>
            ) : (
              safeUpcoming.map((b, i) => {
                const d = b?.scheduledAt ? new Date(b.scheduledAt) : null;
                return (
                  <Pressable
                    key={b?.id || i}
                    style={s.listItem}
                    onPress={() =>
                      navigation.navigate("BookingDetail", { bookingId: b?.id })
                    }
                  >
                    {d && (
                      <View style={s.dateBox}>
                        <AppText style={s.dateDay}>{d.getDate()}</AppText>
                        <AppText style={s.dateMonth}>
                          {d.toLocaleString("default", { month: "short" })}
                        </AppText>
                      </View>
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText style={s.listTitle} numberOfLines={1}>
                        {b?.title || t("workerDash.untitled")}
                      </AppText>
                      <AppText style={s.listMeta} numberOfLines={1}>
                        {b?.hirer?.firstName} {b?.hirer?.lastName} ·{" "}
                        {b?.category?.name}
                      </AppText>
                    </View>
                    <StatusBadge status={b?.status || "PENDING"} c={c} t={t} />
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      </View>

      <View style={[s.gridRow, { gap: 20 }]}>
        <View
          style={[
            s.card,
            {
              width: isMobile ? "100%" : desktopHalfWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <View style={s.cardHeader}>
            <AppText variant="title" weight="displayBlack" style={s.cardTitle}>
              {t("workerDash.recentBookings")}
            </AppText>
            <Pressable onPress={() => navigation.navigate("WorkerBookings")}>
              <AppText style={s.cardLink}>{t("workerDash.viewAll")} →</AppText>
            </Pressable>
          </View>
          {safeBookings.length === 0 ? (
            <AppText
              style={[s.statSub, { textAlign: "center", paddingVertical: 12 }]}
            >
              {t("workerDash.noBookings")}
            </AppText>
          ) : (
            safeBookings.slice(0, 6).map((b, i) => {
              const pay = b?.payments?.[0];
              const released = Number(pay?.releasedAmount) || 0;
              const promised = Number(pay?.workerPayout) || 0;
              const hasRelease = pay && released > 0;
              const isPartial = hasRelease && released < promised;

              return (
                <Pressable
                  key={b?.id || i}
                  style={s.listItem}
                  onPress={() =>
                    navigation.navigate("BookingDetail", { bookingId: b?.id })
                  }
                >
                  <View style={s.avatar}>
                    {b?.hirer?.avatar ? (
                      <Image
                        source={{ uri: b.hirer.avatar }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "700",
                          color: c.textDim,
                        }}
                      >
                        {initials(b?.hirer)}
                      </AppText>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText style={s.listTitle} numberOfLines={1}>
                      {b?.title || t("workerDash.untitled")}
                    </AppText>
                    <AppText style={s.listMeta} numberOfLines={1}>
                      {b?.hirer?.firstName} {b?.hirer?.lastName} ·{" "}
                      {b?.category?.name}
                    </AppText>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <StatusBadge status={b?.status || "PENDING"} c={c} t={t} />
                    {hasRelease && (
                      <View style={{ alignItems: "flex-end", gap: 2 }}>
                        <AppText
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: c.green,
                          }}
                        >
                          {formatCurrency(released, pay.currency)}
                        </AppText>
                        {isPartial && (
                          <View
                            style={{
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor: c.orangeGlow,
                              backgroundColor: c.orangeDim,
                            }}
                          >
                            <AppText
                              style={{
                                fontSize: 9,
                                fontWeight: "700",
                                color: c.orange,
                                textTransform: "uppercase",
                                letterSpacing: 0.4,
                              }}
                            >
                              {t("workerDash.partial")}
                            </AppText>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <View
          style={[
            s.card,
            {
              width: isMobile ? "100%" : desktopHalfWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        >
          <View style={s.cardHeader}>
            <AppText variant="title" weight="displayBlack" style={s.cardTitle}>
              {t("workerDash.recentReviews")}
            </AppText>
            <Pressable onPress={() => navigation.navigate("WorkerReviews")}>
              <AppText style={s.cardLink}>{t("workerDash.seeAll")} →</AppText>
            </Pressable>
          </View>
          {safeReviews.length === 0 ? (
            <AppText
              style={[s.statSub, { textAlign: "center", paddingVertical: 12 }]}
            >
              {t("workerDash.noReviews")}
            </AppText>
          ) : (
            safeReviews.map((r, i) => (
              <View
                key={r?.id || i}
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: c.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <View
                      style={[
                        s.avatar,
                        { width: 34, height: 34, borderRadius: 17 },
                      ]}
                    >
                      {r?.giver?.avatar ? (
                        <Image
                          source={{ uri: r.giver.avatar }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: c.textDim,
                          }}
                        >
                          {initials(r?.giver)}
                        </AppText>
                      )}
                    </View>
                    <AppText style={s.listTitle} numberOfLines={1}>
                      {r?.giver?.firstName} {r?.giver?.lastName}
                    </AppText>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={
                          star <= (r?.rating || 0) ? "star" : "star-outline"
                        }
                        size={12}
                        color={c.orange}
                      />
                    ))}
                  </View>
                </View>
                <AppText
                  style={{ fontSize: 13, color: c.textDim, lineHeight: 18 }}
                >
                  {r?.comment}
                </AppText>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  page: {
    padding: rem(1.25),
    paddingBottom: rem(6),
    gap: rem(1.25),
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  gridRow: { flexDirection: "row", flexWrap: "wrap", width: "100%" },

  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 24,
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  greetingTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
  },
  greetingText: {
    fontFamily: FONTS.body,
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },
  greetingName: {
    fontSize: 20,
    color: "#fff",
    letterSpacing: -0.7,
  },

  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    alignSelf: "flex-start",
    transform: [{ translateY: 4 }],
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  availabilityText: {
    fontSize: 7,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  currWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: "100%",
  },
  currLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "600",
  },
  currSelect: { fontSize: 13, fontWeight: "700", color: "#f97316" },

  card: { borderWidth: 1, borderRadius: 12, padding: 24, minWidth: 0 },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    color: "#fff",
  },
  cardLink: { fontSize: 13, fontWeight: "600", color: "#f97316" },

  earningsCard: {
    justifyContent: "space-between",
    overflow: "hidden",
    position: "relative",
  },
  earningsBlob: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    backgroundColor: "rgba(249,115,22,0.12)",
    borderRadius: 80,
  },
  earningsLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.28)",
    marginBottom: 6,
  },
  earningsValue: {
    fontSize: 20,
    letterSpacing: -1.5,
    color: "#fff",
    marginBottom: 8,
  },
  earningsMeta: { fontSize: 12, color: "rgba(255,255,255,0.28)" },
  pendingBox: {
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.25)",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    minWidth: 140,
    zIndex: 1,
  },
  pendingLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: "rgba(249,115,22,0.65)",
    marginBottom: 4,
  },
  pendingValue: {
    fontSize: 15,
    letterSpacing: -0.5,
    color: "#f97316",
  },
  pendingSub: { fontSize: 11, color: "rgba(249,115,22,0.55)", marginTop: 4 },

  statLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.28)",
  },
  statValue: {
    fontSize: 20,
    letterSpacing: -1.2,
    color: "#fff",
    lineHeight: 36,
  },
  statSub: { fontSize: 10, color: "rgba(255,255,255,0.55)" },

  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    minHeight: 52,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  listMeta: { fontSize: 12, color: "rgba(255,255,255,0.28)" },

  dateBox: {
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.25)",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: "center",
    minWidth: 48,
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "800",
    color: "#f97316",
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "rgba(249,115,22,0.6)",
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 100,
    marginTop: 12,
  },
  barWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  bar: {
    width: "100%",
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.25)",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.28)",
    textTransform: "uppercase",
    marginTop: 6,
  },

  completionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  completionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.55)",
  },
  completionPct: {
    fontSize: 20,
    letterSpacing: -0.5,
    color: "#f97316",
  },
  progressTrack: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#f97316",
    borderRadius: 999,
  },
  completionHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.28)",
    marginTop: 10,
  },
  badge: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 999 },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBox: {
    width: "80%",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  currRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
});
