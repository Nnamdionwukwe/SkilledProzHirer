// src/screens/main/DashboardScreen.js
//
// Verbatim port of HirerDashboard.jsx + HirerDashboard.module.css.
//
// Mapping reference:
//   react-icons  →  @expo/vector-icons (Ionicons)
//     FiClipboard      → "clipboard-outline"
//     FiZap            → "flash-outline"
//     FiCheckCircle    → "checkmark-circle-outline"
//     FiCreditCard     → "card-outline"
//     FiStar           → "star" (filled, 12px, #fbbf24)
//     FiPlus           → "add" (16px, color = --bg)
//
// Phone root font-size = 14 (global.css @media 480).
//
// Responsive breakpoints (mirror website media queries):
//   ≥768  → statsGrid 4 cols
//   ≥900  → grid2 2 cols
//   <360  → header stacked; .ctaBtn flex:1 + center; booking/worker rows
//           shrink to padding 8/10
//
// Loading state uses <DashboardSkeleton /> (matches website's shimmer).
//
// Backend: GET /hirers/me/dashboard (via getHirerDashboard)

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  Pressable,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import Panel from "../../components/Panel";
import BookingRow from "../../components/BookingRow";
import WorkerRow from "../../components/WorkerRow";
import CurrencyPicker from "../../components/CurrencyPicker";
import DashboardSkeleton from "../../components/DashboardSkeleton";

import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useToast } from "../../contexts/ToastContext";
import { getHirerDashboard } from "../../api/hirer";

export default function DashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { format } = useCurrency();
  const { toast } = useToast();
  const { width } = useWindowDimensions();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Breakpoints — mirror website media queries exactly.
  const statsRowSingle = width >= 768;
  const gridTwoCol = width >= 900;
  const headerStacked = width < 360;

  // Stat value clamp — clamp(16px, 3vw, 28px) from website
  const statValueFontSize = Math.min(28, Math.max(16, width * 0.03));

  const load = useCallback(async () => {
    try {
      const result = await getHirerDashboard();
      setData(result);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.networkError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return (
      <AppScreen scroll={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <DashboardSkeleton />
      </AppScreen>
    );
  }

  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];
  const recentWorkers = data?.recentWorkers || [];

  const totalSpent = Number(stats.totalSpent) || 0;
  const inEscrow = Number(stats.inEscrow) || 0;
  const released = Math.max(0, totalSpent - inEscrow);

  const spentFooter =
    inEscrow > 0
      ? `${format(inEscrow)} in escrow · ${format(released)} released`
      : `${format(released)} released`;

  const goPostJob = () => navigation.navigate("PostJob");
  const goAllBookings = () => navigation.navigate("Bookings");
  const goAllWorkers = () => navigation.navigate("SavedWorkers");

  return (
    <AppScreen
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.orange}
          colors={[theme.colors.orange]}
        />
      }
    >
      {/* ══════════ HEADER ══════════ */}
      <View style={[styles.header, headerStacked && styles.headerStacked]}>
        <View style={styles.headerTitleBlock}>
          <AppText style={[styles.eyebrow, { color: theme.colors.orange }]}>
            {t("dashboard.overview")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {t("dashboard.title")}
          </AppText>
        </View>

        <View
          style={[
            styles.headerActions,
            headerStacked && styles.headerActionsStacked,
          ]}
        >
          <CurrencyPicker compact />
          <Pressable
            onPress={goPostJob}
            style={({ pressed }) => [
              styles.ctaBtn,
              { backgroundColor: theme.colors.orange },
              headerStacked && styles.ctaBtnStacked,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="add" size={16} color={theme.colors.bg} />
            <AppText style={[styles.ctaBtnText, { color: theme.colors.bg }]}>
              {t("dashboard.postAJob")}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* ══════════ STATS ══════════ */}
      {/* Row 1 — three cards, flexed equally */}
      <View style={styles.statsRowThree}>
        <View style={styles.statCellThird}>
          <StatCard
            icon="clipboard-outline"
            label={t("dashboard.totalBookings")}
            value={String(stats.totalBookings ?? 0)}
            fontSize={statValueFontSize}
            color={theme.colors.text}
            bg={theme.colors.bgCard}
            border={theme.colors.border}
          />
        </View>

        <View style={styles.statCellThird}>
          <StatCard
            icon="flash-outline"
            label={t("dashboard.activeJobs")}
            value={String(stats.activeBookings ?? 0)}
            fontSize={statValueFontSize}
            color="#f97316"
            bg="rgba(249, 115, 22, 0.12)"
            border="rgba(249, 115, 22, 0.20)"
          />
        </View>

        <View style={styles.statCellThird}>
          <StatCard
            icon="checkmark-circle-outline"
            label={t("dashboard.completed")}
            value={String(stats.completedBookings ?? 0)}
            fontSize={statValueFontSize}
            color="#22c55e"
            bg="rgba(34, 197, 94, 0.10)"
            border="rgba(34, 197, 94, 0.15)"
          />
        </View>
      </View>

      {/* Row 2 — Total Spent, full width on its own line */}
      <View style={styles.statsRowFull}>
        <StatCard
          icon="card-outline"
          label={t("dashboard.totalSpent")}
          value={format(totalSpent)}
          fontSize={statValueFontSize}
          color={theme.colors.text}
          bg={theme.colors.bgCard}
          border={theme.colors.border}
          footer={spentFooter}
        />
      </View>

      {/* ══════════ PANELS ══════════ */}
      <View style={[styles.grid2, gridTwoCol && styles.grid2TwoCol]}>
        {/* Recent Bookings */}
        <View style={styles.grid2Cell}>
          <Panel
            title={t("dashboard.recentBookings")}
            actionLabel={
              recentBookings.length > 0 ? t("dashboard.viewAll") : undefined
            }
            onActionPress={
              recentBookings.length > 0 ? goAllBookings : undefined
            }
          >
            {recentBookings.length === 0 ? (
              <EmptyState
                icon="briefcase-outline"
                text={t("dashboard.noBookingsYet")}
              />
            ) : (
              recentBookings.map((booking, idx) => (
                <BookingRow
                  key={booking.id}
                  booking={booking}
                  showDivider={idx < recentBookings.length - 1}
                  onPress={() =>
                    navigation.navigate("BookingDetail", {
                      bookingId: booking.id,
                    })
                  }
                />
              ))
            )}
          </Panel>
        </View>

        {/* Recent Workers */}
        <View style={styles.grid2Cell}>
          <Panel
            title={t("dashboard.recentWorkers")}
            actionLabel={
              recentWorkers.length > 0 ? t("dashboard.viewAll") : undefined
            }
            onActionPress={recentWorkers.length > 0 ? goAllWorkers : undefined}
          >
            {recentWorkers.length === 0 ? (
              <EmptyState
                icon="people-outline"
                text={t("dashboard.noWorkersYet")}
              />
            ) : (
              recentWorkers.map((worker, idx) => (
                <WorkerRow
                  key={worker.id}
                  worker={worker}
                  showDivider={idx < recentWorkers.length - 1}
                  onPress={() =>
                    navigation.navigate("WorkerProfile", {
                      userId: worker.id,
                    })
                  }
                />
              ))
            )}
          </Panel>
        </View>
      </View>
    </AppScreen>
  );
}

// ─── Inline StatCard ──────────────────────────────────────────────────────────
// Mirrors the website's local `StatCard` function in HirerDashboard.jsx
// (which reads its colors from the .statCard/.statCard_{accent} CSS classes).

function StatCard({ icon, label, value, footer, fontSize, color, bg, border }) {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.statCard, { backgroundColor: bg, borderColor: border }]}
    >
      <Ionicons name={icon} size={24} color={color} style={styles.statIcon} />
      <AppText
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        weight="displayBlack"
        style={{
          fontSize: 15,
          letterSpacing: -0.5,
          marginBottom: 4,
        }}
      >
        {value}
      </AppText>
      <AppText
        numberOfLines={1}
        style={[
          styles.statLabel,
          { color: theme.colors.textDim, fontSize: 10 },
        ]}
      >
        {label}
      </AppText>
      {footer ? (
        <AppText
          numberOfLines={2}
          style={[styles.statFooter, { color: theme.colors.textMuted }]}
        >
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

function EmptyState({ icon, text }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={theme.colors.textMuted} />
      <AppText
        numberOfLines={3}
        style={[styles.emptyText, { color: theme.colors.textMuted }]}
      >
        {text}
      </AppText>
    </View>
  );
}

// ─── Styles (modern glass + layered depth, phone root=14) ─────────────────────
const styles = StyleSheet.create({
  // .header — sits on a card with soft ambient shadow
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 24,
    padding: 18,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    // layered shadow — reads as "lifted card"
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 6,
  },
  headerStacked: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  headerTitleBlock: { flexShrink: 1, minWidth: 0 },

  // .eyebrow — pill badge with tinted bg
  eyebrow: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9.63,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 1.156,
    textTransform: "uppercase",
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    alignSelf: "flex-start",
    backgroundColor: "rgba(249,115,22,0.10)",
    overflow: "hidden",
  },

  // .title — larger, tracking tighter, more weight
  title: {
    fontFamily: "Syne_700Bold",
    fontSize: 22,
    lineHeight: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
  },

  // .headerActions
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  headerActionsStacked: { justifyContent: "flex-start" },

  // .ctaBtn — modern: gradient feel via tint + soft shadow + hover-lift radius
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minHeight: 42,
    shadowColor: "#f97316",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtnStacked: {
    flex: 1,
    justifyContent: "center",
  },
  ctaBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12.25,
    lineHeight: 16,
    fontWeight: "700",
  },

  // .statsGrid — wider gutter so the cards breathe
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    marginHorizontal: -7,
  },
  // Row 1 — three flexed cards
  statsRowThree: {
    flexDirection: "row",
    marginBottom: 16,
    marginHorizontal: -8,
  },
  statCellThird: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 8,
  },

  // Row 2 — full-width row
  statsRowFull: {
    marginBottom: 28,
  },
  statsGridSingleRow: {},

  statCellTwoCol: {
    width: "50%",
    paddingHorizontal: 7,
    paddingBottom: 14,
  },
  statCellSingleRow: {
    width: "25%",
    paddingHorizontal: 7,
    paddingBottom: 0,
  },
  statCell: {},

  // .statCard — modern: 16 radius, deep shadow, inner top highlight
  statCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    minWidth: 0,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 4,
    // subtle top-border glow — reads as a glass card catching light
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  statIcon: {
    fontSize: 26,
    lineHeight: 26,
    marginBottom: 8,
  },

  statValue: {
    fontFamily: "Syne_700Bold",
    fontWeight: "700",
    letterSpacing: -0.6,
    marginBottom: 4,
  },

  statLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },

  statFooter: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9.1,
    lineHeight: 12.3,
    fontWeight: "500",
    marginTop: 6,
  },

  // .grid2 — larger gap so panels separate cleanly
  grid2: {
    gap: 18,
  },
  grid2TwoCol: {
    flexDirection: "row",
    gap: 20,
  },
  grid2Cell: { flex: 1, minWidth: 0 },

  // .empty — bigger tap area, softer icon treatment
  empty: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11.38,
    lineHeight: 16,
    textAlign: "center",
  },
});
