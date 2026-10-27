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
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
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
          <View
            style={[
              styles.ctaBtn,
              { backgroundColor: theme.colors.orange },
              headerStacked && styles.ctaBtnStacked,
            ]}
          >
            <Ionicons name="add" size={16} color={theme.colors.bg} />
            <AppText style={[styles.ctaBtnText, { color: theme.colors.bg }]}>
              {t("dashboard.postAJob")}
            </AppText>
          </View>
        </View>
      </View>

      {/* ══════════ STATS ══════════ */}
      <View
        style={[styles.statsGrid, statsRowSingle && styles.statsGridSingleRow]}
      >
        <View
          style={[
            styles.statCell,
            statsRowSingle ? styles.statCellSingleRow : styles.statCellTwoCol,
          ]}
        >
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

        <View
          style={[
            styles.statCell,
            statsRowSingle ? styles.statCellSingleRow : styles.statCellTwoCol,
          ]}
        >
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

        <View
          style={[
            styles.statCell,
            statsRowSingle ? styles.statCellSingleRow : styles.statCellTwoCol,
          ]}
        >
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

        <View
          style={[
            styles.statCell,
            statsRowSingle ? styles.statCellSingleRow : styles.statCellTwoCol,
          ]}
        >
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
        style={[
          styles.statValue,
          { color, fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {value}
      </AppText>
      <AppText
        numberOfLines={1}
        style={[styles.statLabel, { color: theme.colors.textDim }]}
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

// ─── Styles (verbatim from CSS, phone root=14) ────────────────────────────────
const styles = StyleSheet.create({
  // .header
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  headerStacked: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  headerTitleBlock: { flexShrink: 1 },

  // .eyebrow — 0.6875rem @14 = 9.63, 600, ls 0.12em → 1.156, UPPER, mb 2
  eyebrow: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 9.63,
    lineHeight: 12,
    fontWeight: "600",
    letterSpacing: 1.156,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  // .title — 1.5rem @14 = 21, Syne 700, ls -0.4, lh 1.2
  title: {
    fontFamily: "Syne_700Bold",
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "700",
    letterSpacing: -0.4,
  },

  // .headerActions — row, gap 0.5rem (8), wrap, align-center
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  headerActionsStacked: { justifyContent: "flex-start" },

  // .ctaBtn — pad 8/14, r8, font 0.875rem @14 = 12.25, 600, gap 6,
  //           min-h 40, white-space nowrap
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 40,
  },
  // <360px: .ctaBtn { justify-content: center; flex: 1; }
  ctaBtnStacked: {
    flex: 1,
    justifyContent: "center",
  },
  ctaBtnText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12.25,
    lineHeight: 16,
    fontWeight: "600",
  },

  // .statsGrid — flex-wrap, gap 12 (mobile) via per-cell padding
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    marginHorizontal: -6,
  },
  statsGridSingleRow: {},

  // 2-col mobile: width 50%, gutter 6 each side → 12 between
  statCellTwoCol: {
    width: "50%",
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  // 4-col ≥768: width 25%, gutter 6 → 14 between (clamp 8→14)
  statCellSingleRow: {
    width: "25%",
    paddingHorizontal: 7,
    paddingBottom: 0,
  },
  statCell: {},

  // .statCard — border 1, r 12, pad 16, min-width 0, overflow hidden
  statCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minWidth: 0,
    overflow: "hidden",
  },
  // .statIcon — 24px, lh 1 (24), mb 6
  statIcon: {
    fontSize: 24,
    lineHeight: 24,
    marginBottom: 6,
  },
  // .statValue — 700, ls -0.5, lh 1.2, mb 2 (fontSize set inline to clamp)
  statValue: {
    fontFamily: "Syne_700Bold",
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  // .statLabel — 12 / 500 / text-dim
  statLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  // .statFooter — 0.65rem @14 = 9.1 / 500 / lh 1.35 (12.3) / mt 4
  statFooter: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9.1,
    lineHeight: 12.3,
    fontWeight: "500",
    marginTop: 4,
  },

  // .grid2 — mobile 1col, gap clamp(8,1.5vw,16) → 16
  grid2: {
    gap: 16,
  },
  // ≥900: 1fr 1fr, gap clamp(10,1.8vw,18) → 18
  grid2TwoCol: {
    flexDirection: "row",
    gap: 18,
  },
  grid2Cell: { flex: 1, minWidth: 0 },

  // .empty — pad 24/16, 0.8125rem @14 = 11.38 / text-muted
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11.38,
    lineHeight: 16,
    textAlign: "center",
  },
});
