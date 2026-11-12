// src/screens/main/RetainedStaffScreen.js
//
// Verbatim port of src/pages/hirer/retained-staff/HirerRetainedStaffDashboard.jsx
// + HirerRetainedStaff.module.css.
//
// Post-load enrichment: /retained-staff/dashboard does NOT include worker
// avatars in upcomingCycles. We fetch each member's full record via
// GET /retained-staff/:memberId and merge `worker.avatar` into the cycle.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  I18nManager,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import EmptyState from "../../components/EmptyState";
import StatCard from "../../components/RetainedStaff/StatCard";
import FilterTabs from "../../components/RetainedStaff/FilterTabs";
import UpcomingItem from "../../components/RetainedStaff/UpcomingItem";
import SummaryItem from "../../components/RetainedStaff/SummaryItem";
import AddStaffModal from "../../components/RetainedStaff/AddStaffModal";
import RetainedStaffSkeleton from "../../components/Skeleton/RetainedStaffSkeleton";

import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";

const CURRENCY_SYMBOLS = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "GH₵",
  KES: "KSh",
  ZAR: "R",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  AED: "د.إ",
  SAR: "ر.س",
  QAR: "ر.ق",
  EGP: "E£",
  TZS: "TSh",
  UGX: "USh",
  RWF: "FRw",
  XOF: "CFA",
  MAD: "DH",
  PHP: "₱",
  IDR: "Rp",
  VND: "₫",
  THB: "฿",
  BDT: "৳",
  PKR: "₨",
  MYR: "RM",
  SGD: "S$",
  HKD: "HK$",
  USDC: "USDC",
  USDT: "USDT",
};

function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] || currency || "";
}

// Symbol-prefixed money formatter — no Intl (renders the ISO code on
// Hermes/Android). Uses CURRENCY_SYMBOLS for the prefix and
// toLocaleString for the numeric portion.
function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  const sym = getCurrencySymbol(currency || "NGN");
  const isCrypto = ["USDC", "USDT"].includes(currency);
  try {
    const formatted = Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    return isCrypto ? `${sym} ${formatted}` : `${sym}${formatted}`;
  } catch {
    return isCrypto ? `${sym} ${amount}` : `${sym}${amount}`;
  }
}

// Pull the avatar from a full staff record.
// Backend shape is typically: { worker: { avatar, firstName, lastName, ... }, ... }
function extractAvatarFromMember(member) {
  if (!member) return null;
  return (
    member?.worker?.avatar ||
    member?.worker?.avatarUrl ||
    member?.workerAvatar ||
    member?.avatar ||
    member?.avatarUrl ||
    member?.profileImage ||
    null
  );
}

export default function RetainedStaffScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState("NGN");

  // ── Breakpoints (mirror CSS) ────────────────────────────────
  const isWide = width >= 768;
  const isXWide = width >= 900;
  const isCompact = width <= 640;

  const rem = useCallback((n) => n * 16 * fontScale, [fontScale]);
  const chevron = I18nManager.isRTL ? "chevron-back" : "chevron-forward";

  const load = useCallback(
    async (opts = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await retainedStaffApi.getDashboard();
        const dashboard = res.data?.data?.dashboard || {};
        setData(dashboard);
        const active = dashboard.activeCurrencies || [];
        if (active.length > 0 && !active.includes("NGN")) {
          setSelectedCurrency(active[0]);
        } else if (active.length > 0) {
          setSelectedCurrency("NGN");
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message || t("retainedStaff.genericError"),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  // ─── AVATAR ENRICHMENT ─────────────────────────────────────
  // /dashboard omits worker avatars → fetch each member's full
  // record via /retained-staff/:id and merge worker.avatar.
  useEffect(() => {
    const cycles = data?.upcomingCycles;
    if (!Array.isArray(cycles) || cycles.length === 0) return;

    // Skip if all cycles already have an avatar (idempotent)
    const needsFetch = cycles.some((c) => !c.workerAvatar && !c.avatar);
    if (!needsFetch) return;

    let cancelled = false;

    (async () => {
      const enriched = await Promise.all(
        cycles.map(async (c) => {
          // Already has avatar → keep as-is
          if (c.workerAvatar || c.avatar) return c;
          try {
            const r = await retainedStaffApi.getStaff(c.memberId);
            const member =
              r.data?.data?.member ||
              r.data?.data ||
              r.data?.member ||
              r.member ||
              null;
            const avatar = extractAvatarFromMember(member);
            if (avatar) {
              return { ...c, workerAvatar: avatar };
            }
            return c;
          } catch (err) {
            console.log(
              "[RetainedStaff] getStaff failed for",
              c.memberId,
              err?.message,
              err?.response?.status,
            );
            return c;
          }
        }),
      );
      if (cancelled) return;
      setData((prev) => (prev ? { ...prev, upcomingCycles: enriched } : prev));
    })();

    return () => {
      cancelled = true;
    };
  }, [data?.upcomingCycles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load({ silent: true });
  }, [load]);

  // ── Derived data ────────────────────────────────────────────
  const currency = selectedCurrency;
  const burn = data?.monthlyBurnByCurrency?.[currency] || 0;
  const activeCount = data?.activeCount || 0;
  const pendingPayments = data?.pendingPayments || 0;
  const heldInEscrow = data?.heldInEscrowByCurrency?.[currency] || 0;
  const releasedThisMonth = data?.releasedThisMonthByCurrency?.[currency] || 0;

  const upcoming = useMemo(
    () => (data?.upcomingCycles || []).filter((c) => c.currency === currency),
    [data?.upcomingCycles, currency],
  );
  const activeCurrencies = data?.activeCurrencies || ["NGN"];

  // ── Handlers ────────────────────────────────────────────────
  const goStaffList = () => navigation.navigate("RetainedStaffList");
  const goStaffDetail = (memberId) =>
    navigation.navigate("RetainedStaffDetail", { memberId });

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <RetainedStaffSkeleton />
      </AppScreen>
    );
  }

  // ── Figure styling ─────────────────────────────────────────
  // Reduced-size display-black style for numeric figures inside the
  // sub-components (StatCard, SummaryItem, UpcomingItem). Matches the
  // web's .statValue / .summaryValue / .upcomingAmount rules:
  //   font-family: var(--font-display); font-weight: 800;
  //   letter-spacing: -0.02em;
  // The sub-components must accept and apply `valueStyle` — see notes
  // at the bottom for the one-line addition in each of those files.
  const figureStyle = {
    fontSize: 13,
    letterSpacing: -0.5,
    fontWeight: "800",
  };
  const labelStyle = {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  };

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
      {/* ── Header ── */}
      <View style={[styles.header, isWide && styles.headerRow]}>
        <View style={{ flexShrink: 1, flex: isWide ? 1 : undefined }}>
          <AppText
            style={{
              fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
              fontSize: rem(0.75),
              lineHeight: rem(0.75) * 1.3,
              fontWeight: "700",
              letterSpacing: 0.05 * rem(0.75),
              textTransform: "uppercase",
              color: theme.colors.orange,
              marginBottom: 4,
            }}
          >
            {t("retainedStaff.eyebrow")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.5,
            }}
          >
            {t("retainedStaff.title")}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.85),
              lineHeight: rem(0.85) * 1.35,
              color: theme.colors.textDim,
              marginTop: 4,
            }}
          >
            {t("retainedStaff.subtitle")}
          </AppText>
        </View>

        <Pressable
          onPress={() => setShowAdd(true)}
          style={({ pressed }) => [
            styles.addBtn,
            {
              backgroundColor: pressed
                ? theme.colors.orangeHover
                : theme.colors.orange,
              marginTop: isWide ? 0 : 12,
            },
          ]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <AppText
            style={{
              fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
              fontSize: rem(0.85),
              fontWeight: "600",
              color: "#fff",
              marginLeft: 6,
            }}
          >
            {t("retainedStaff.addStaffBtn")}
          </AppText>
        </Pressable>
      </View>

      {/* ── Currency filter ── */}
      {activeCurrencies.length > 1 ? (
        <View style={{ marginBottom: 20 }}>
          <FilterTabs
            options={activeCurrencies}
            value={selectedCurrency}
            onChange={setSelectedCurrency}
          />
        </View>
      ) : null}

      {/* ── KPI cards ── */}
      <View style={styles.statsGrid}>
        {[
          {
            icon: "people-outline",
            label: t("retainedStaff.activeStaff"),
            value: String(activeCount),
            accent: "default",
          },
          {
            icon: "cash-outline",
            label: t("retainedStaff.monthlyBurn"),
            value: formatMoney(burn, currency),
            accent: "orange",
          },
          {
            icon: "time-outline",
            label: t("retainedStaff.pendingPayments"),
            value: String(pendingPayments),
            accent: "yellow",
          },
          {
            icon: "checkmark-circle-outline",
            label: t("retainedStaff.releasedThisMonth"),
            value: formatMoney(releasedThisMonth, currency),
            accent: "green",
          },
        ].map((c, i) => (
          <View
            key={i}
            style={{
              width: isCompact ? "48%" : isWide ? "23%" : "48%",
              marginBottom: 12,
            }}
          >
            <StatCard
              icon={c.icon}
              label={c.label}
              value={c.value}
              accent={c.accent}
              valueStyle={figureStyle}
              labelStyle={labelStyle}
            />
          </View>
        ))}
      </View>

      {/* ── Two-column panels ── */}
      <View style={[styles.twoCol, isXWide && styles.twoColRow]}>
        {/* Upcoming cycles panel */}
        <View
          style={[
            styles.panel,
            {
              width: isXWide ? "48%" : "100%",
              backgroundColor: theme.colors.bgPanel,
              borderColor: theme.colors.border,
              marginBottom: 16,
            },
          ]}
        >
          <View style={styles.panelHeader}>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 10,
                letterSpacing: -0.5,
                flex: 1,
              }}
            >
              {t("retainedStaff.upcomingCycles", { currency })}
            </AppText>
            <Pressable
              onPress={goStaffList}
              hitSlop={8}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.6),
                  fontWeight: "600",
                  color: theme.colors.textDim,
                }}
              >
                {t("retainedStaff.manageStaff")}
              </AppText>
              <Ionicons
                name={chevron}
                size={14}
                color={theme.colors.textDim}
                style={{ marginLeft: 4 }}
              />
            </Pressable>
          </View>

          {upcoming.length === 0 ? (
            <EmptyState
              icon="time-outline"
              iconSize={32}
              text={t("retainedStaff.noUpcomingCycles", { currency })}
              compact
            />
          ) : (
            <View style={{ gap: 8 }}>
              {upcoming.map((c) => (
                <UpcomingItem
                  key={c.memberId}
                  cycle={c}
                  onPress={() => goStaffDetail(c.memberId)}
                  valueStyle={figureStyle}
                />
              ))}
            </View>
          )}
        </View>

        {/* Payroll summary panel */}
        <View
          style={[
            styles.panel,
            {
              width: isXWide ? "48%" : "100%",
              backgroundColor: theme.colors.bgPanel,
              borderColor: theme.colors.border,
              marginBottom: 16,
            },
          ]}
        >
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 13,
              letterSpacing: -0.5,
            }}
          >
            {t("retainedStaff.payrollSummary", { currency })}
          </AppText>

          <SummaryItem
            label={t("retainedStaff.heldInEscrow")}
            value={formatMoney(heldInEscrow, currency)}
            valueStyle={figureStyle}
            labelStyle={labelStyle}
          />
          <SummaryItem
            label={t("retainedStaff.releasedThisMonth")}
            value={formatMoney(releasedThisMonth, currency)}
            valueStyle={figureStyle}
            labelStyle={labelStyle}
          />
          <SummaryItem
            label={t("retainedStaff.monthlyBurn")}
            value={formatMoney(burn, currency)}
            isLast
            valueStyle={figureStyle}
            labelStyle={labelStyle}
          />

          <Pressable
            onPress={goStaffList}
            style={({ pressed }) => [
              styles.btnGhost,
              {
                borderColor: pressed
                  ? theme.colors.orange
                  : theme.colors.border,
                marginTop: 16,
              },
            ]}
          >
            <AppText
              style={{
                fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                fontSize: rem(0.85),
                fontWeight: "600",
                color: theme.colors.textDim,
              }}
            >
              {t("retainedStaff.viewAllStaff")}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* ── Hint card ── */}
      {activeCount === 0 ? (
        <View
          style={[
            styles.hintCard,
            isWide && styles.hintRow,
            {
              backgroundColor: theme.colors.bgPanel,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.hintIcon,
              { backgroundColor: theme.colors.orangeDim },
            ]}
          >
            <Ionicons
              name="briefcase-outline"
              size={22}
              color={theme.colors.orange}
            />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 15,
                letterSpacing: -0.5,
                marginBottom: 8,
                textAlign: isWide ? "left" : "center",
              }}
            >
              {t("retainedStaff.getStartedTitle")}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.85),
                lineHeight: rem(0.85) * 1.5,
                color: theme.colors.textDim,
                marginBottom: 12,
                textAlign: isWide ? "left" : "center",
              }}
            >
              {t("retainedStaff.getStartedDesc")}
            </AppText>
            <Pressable
              onPress={() => setShowAdd(true)}
              style={({ pressed }) => [
                styles.addBtn,
                {
                  backgroundColor: pressed
                    ? theme.colors.orangeHover
                    : theme.colors.orange,
                  alignSelf: isWide ? "flex-start" : "center",
                },
              ]}
            >
              <Ionicons name="add" size={16} color="#fff" />
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.85),
                  fontWeight: "600",
                  color: "#fff",
                  marginLeft: 6,
                }}
              >
                {t("retainedStaff.addFirstStaff")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── Add Staff Modal ── */}
      <AddStaffModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(member) => {
          load({ silent: true });
          if (member?.id) goStaffDetail(member.id);
        }}
      />
    </AppScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
    gap: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  twoCol: {
    flexDirection: "column",
  },
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 24,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  btnGhost: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  hintCard: {
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    borderWidth: 1,
    borderRadius: 14,
    padding: 24,
    marginTop: 24,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  hintIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
