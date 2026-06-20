// src/screens/main/DashboardScreen.js
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import AppCurrency from "../../components/AppCurrency";
import StatCard from "../../components/StatCard";
import SectionHeader from "../../components/SectionHeader";
import Card from "../../components/Card";
import BookingRow from "../../components/BookingRow";
import WorkerRow from "../../components/WorkerRow";
import CurrencyPicker from "../../components/CurrencyPicker";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { hirerApi } from "../../api/hirer";
import { useAuthStore } from "../../store/authStore";

// DashboardScreen — Hirer-facing landing screen.
//
// Mirrors the website dashboard one-to-one:
//   - "OVERVIEW" eyebrow + "Your Dashboard" display heading
//   - Currency picker + "Post a Job" CTA
//   - 4 stat cards: Total Bookings / Active Jobs / Completed / Total Spent
//   - Recent Bookings list (5 items + View all)
//   - Recent Workers list (5 items + View all)
//
// Backend: GET /api/hirer/me/dashboard
export default function DashboardScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stable load function — empty dep array means same identity across renders,
  // which keeps the mount-effect below from re-firing in a loop. `t` and
  // `toast` are looked up via closure at call time, which is fine here
  // because we don't want to refetch on language or theme change anyway.
  const load = useCallback(async () => {
    try {
      const result = await hirerApi.getDashboard();
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
      <AppScreen scroll={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.colors.orange} />
        </View>
      </AppScreen>
    );
  }

  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];
  const recentWorkers = data?.recentWorkers || [];

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
      {/* Header */}
      <AppText variant="label" tone="brand">
        {t("dashboard.overview")}
      </AppText>

      {/* Controls row */}
      <View style={styles.controlsRow}>
        <CurrencyPicker label={t("dashboard.viewingIn")} />
        <AppButton
          title={t("dashboard.postAJob")}
          iconLeft="add"
          fullWidth={false}
          onPress={goPostJob}
          style={styles.postBtn}
        />
      </View>

      {/* 4 stat cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatCard
              icon="📋"
              label={t("dashboard.totalBookings")}
              value={String(stats.totalBookings ?? 0)}
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              icon="⚡"
              label={t("dashboard.activeJobs")}
              value={String(stats.activeBookings ?? 0)}
              tone="warning"
            />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <StatCard
              icon="✅"
              theme="success"
              label={t("dashboard.completed")}
              value={String(stats.completedBookings ?? 0)}
              // tone="success"
            />
          </View>
          <View style={styles.statCol}>
            <StatCard
              icon="💳"
              label={t("dashboard.totalSpent")}
              value={
                <AppCurrency
                  amount={stats.totalSpent ?? 0}
                  variant="display"
                  weight="displayBlack"
                  style={{
                    fontSize: 25,
                    lineHeight: 36,
                    letterSpacing: -0.5,
                  }}
                />
              }
            />
          </View>
        </View>
      </View>

      {/* Recent Bookings */}
      <View style={{ marginTop: 24 }}>
        <Card padded>
          <SectionHeader
            title={t("dashboard.recentBookings")}
            actionLabel={t("dashboard.viewAll")}
            onActionPress={
              recentBookings.length > 0 ? goAllBookings : undefined
            }
          />
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
                  navigation.navigate("BookingDetail", { id: booking.id })
                }
              />
            ))
          )}
        </Card>
      </View>

      {/* Recent Workers */}
      <View style={{ marginTop: 16 }}>
        <Card padded>
          <SectionHeader
            title={t("dashboard.recentWorkers")}
            actionLabel={t("dashboard.viewAll")}
            onActionPress={recentWorkers.length > 0 ? goAllWorkers : undefined}
          />
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
                  navigation.navigate("WorkerProfile", { userId: worker.id })
                }
              />
            ))
          )}
        </Card>
      </View>
    </AppScreen>
  );
}

function EmptyState({ icon, text }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={32} color={theme.colors.textMuted} />
      <AppText variant="small" tone="muted" style={{ marginTop: 8 }}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { marginTop: 8, lineHeight: 42 },
  subtitle: { marginTop: 6 },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 20,
    flexWrap: "wrap",
  },
  postBtn: { flex: 1, minWidth: 140 },
  statsGrid: { marginTop: 20 },
  statsRow: {
    flexDirection: "row",
    marginBottom: 12,
    marginHorizontal: -6, // counteract child col margin to avoid edge gaps
  },
  statCol: {
    flex: 1,
    paddingHorizontal: 6, // creates the 12px gutter between cards
  },

  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
  },
});
