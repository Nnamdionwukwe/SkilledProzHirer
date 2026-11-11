// src/screens/main/worker/WorkerRetainedEarningsScreen.js
// Verbatim port of pages/worker/retained-staff/WorkerRetainedEarnings.
//
// Endpoint:
//   GET /retained-staff/me/earnings  (retainedStaffApi.getMyEarnings())

import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import client from "../../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// CURRENCY — symbol-safe formatter
// ─────────────────────────────────────────────────────────────────────────────
const SYMBOL_MAP = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  GHS: "₵",
  KES: "KSh ",
  ZAR: "R ",
  TZS: "TSh ",
  UGX: "USh ",
  CAD: "CA$",
  AUD: "A$",
  INR: "₹",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  MXN: "MX$",
  AED: "AED ",
  SAR: "SAR ",
  EGP: "E£",
  USDC: "USDC ",
  USDT: "USDT ",
  BTC: "₿ ",
  ETH: "Ξ ",
};

function formatAmount(n) {
  // Matches the web's formatMoney: 0 forced decimals, up to 2 shown.
  try {
    return new Intl.NumberFormat("en", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  } catch {
    return String(Number(n) || 0);
  }
}

function fmtMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  const code = String(currency || "NGN").toUpperCase();
  const symbol = SYMBOL_MAP[code];
  const digits = formatAmount(amount);
  return symbol ? `${symbol}${digits}` : `${code} ${digits}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS META — matches CSS classes: released / held / partially_released / …
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  RELEASED: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  HELD: { color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  PARTIALLY_RELEASED: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  AWAITING_PAYMENT: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function statusMeta(raw) {
  const s = String(raw || "").toUpperCase();
  return STATUS_META[s] || { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// KPI CARD
// ─────────────────────────────────────────────────────────────────────────────
function KpiCard({ icon, iconColor, iconBg, label, value, valueColor, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: c.orange,
          opacity: 0.5,
        }}
      />
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 12,
          color: valueColor || c.text,
          letterSpacing: -0.5,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL WRAPPER
// ─────────────────────────────────────────────────────────────────────────────
function Panel({ title, icon, c, children }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 20,
        marginBottom: 12,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 14,
        }}
      >
        {icon ? <Ionicons name={icon} size={14} color={c.orange} /> : null}
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 15,
            fontWeight: "700",
            color: c.text,
            letterSpacing: -0.2,
          }}
        >
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerRetainedEarningsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchEarnings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.get("/retained-staff/me/earnings");
      setData(res.data?.data?.earnings || null);
    } catch (err) {
      setError(
        err?.response?.data?.message || t("workerRetainedEarnings.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  useFocusEffect(
    useCallback(() => {
      fetchEarnings();
    }, [fetchEarnings]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEarnings();
  };

  // ── Loading skeleton ──
  if (loading) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      >
        <Skeleton width="40%" height={26} radius={6} />
        <Skeleton width="70%" height={16} radius={6} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={120} radius={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={120} radius={14} />
          </View>
          <View style={{ flex: 1 }}>
            <Skeleton width="100%" height={120} radius={14} />
          </View>
        </View>
        <Skeleton width="100%" height={200} radius={14} />
        <Skeleton width="100%" height={180} radius={14} />
      </ScrollView>
    );
  }

  // ── Error / no data ──
  if (error || !data) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      >
        <View
          style={{
            alignItems: "center",
            padding: 60,
            gap: 10,
            backgroundColor: c.bgPanel,
            borderRadius: 14,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: c.border,
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={c.red}
            style={{ opacity: 0.7 }}
          />
          <AppText
            style={{
              fontSize: 16,
              fontWeight: "800",
              color: c.text,
              textAlign: "center",
            }}
          >
            {t("workerRetainedEarnings.errorTitle")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {error || t("workerRetainedEarnings.errorBody")}
          </AppText>
          <Pressable
            onPress={fetchEarnings}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: c.orange,
            }}
          >
            <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
              {t("workerRetainedEarnings.retry")}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const primaryCurrency = data.byEmployer?.[0]?.currency || "NGN";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              color: c.text,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {t("workerRetainedEarnings.header.title")}
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim }}>
            {t("workerRetainedEarnings.header.subtitle")}
          </AppText>
        </View>
        <Pressable
          onPress={handleRefresh}
          disabled={loading}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgPanel,
            alignItems: "center",
            justifyContent: "center",
            opacity: loading ? 0.5 : 1,
          }}
        >
          <Ionicons name="refresh" size={16} color={c.textDim} />
        </Pressable>
      </View>

      {/* KPI cards — same as web (auto-fit) → stacked on narrow, side-by-side on wide */}
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <KpiCard
            icon="checkmark-circle-outline"
            iconColor={c.green}
            iconBg="rgba(34,197,94,0.12)"
            label={t("workerRetainedEarnings.kpi.lifetime")}
            value={fmtMoney(data.lifetime, primaryCurrency)}
            valueColor={c.green}
            c={c}
          />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <KpiCard
            icon="time-outline"
            iconColor={c.orange}
            iconBg={c.orangeDim}
            label={t("workerRetainedEarnings.kpi.pending")}
            value={fmtMoney(data.pending, primaryCurrency)}
            valueColor={c.orange}
            c={c}
          />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <KpiCard
            icon="briefcase-outline"
            iconColor={c.textDim}
            iconBg={c.bgCard}
            label={t("workerRetainedEarnings.kpi.employers")}
            value={String(data.byEmployer?.length || 0)}
            c={c}
          />
        </View>
      </View>

      {/* By-status breakdown */}
      {data.byStatus?.length > 0 && (
        <Panel title={t("workerRetainedEarnings.byStatus")} c={c}>
          <View style={{ gap: 8 }}>
            {data.byStatus.map((item) => {
              const meta = statusMeta(item.status);
              return (
                <View
                  key={item.status}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                  }}
                >
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 4,
                      backgroundColor: meta.bg,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color: meta.color,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                      }}
                    >
                      {item.status.replace(/_/g, " ")}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 16,
                    }}
                  >
                    <AppText
                      weight="displayBlack"
                      style={{
                        fontSize: 10,
                        color: c.text,
                        minWidth: 32,
                        textAlign: "right",
                      }}
                    >
                      {item._count}
                    </AppText>
                    <AppText
                      weight="displayBlack"
                      style={{
                        fontSize: 9,
                        color: c.textDim,
                        minWidth: 20,
                        textAlign: "right",
                      }}
                    >
                      {fmtMoney(item._sum?.netAmount || 0, primaryCurrency)}
                    </AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </Panel>
      )}

      {/* By-employer breakdown */}
      <Panel
        title={t("workerRetainedEarnings.byEmployer")}
        icon="trending-up-outline"
        c={c}
      >
        {!data.byEmployer || data.byEmployer.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 28, gap: 10 }}>
            <Ionicons name="briefcase-outline" size={32} color={c.textMuted} />
            <AppText
              style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
            >
              {t("workerRetainedEarnings.emptyEmployers")}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {data.byEmployer.map((item) => {
              const released =
                item.byStatus?.find((s) => s.status === "RELEASED")?._sum
                  ?.netAmount || 0;
              const pending =
                (item.byStatus?.find((s) => s.status === "HELD")?._sum
                  ?.netAmount || 0) +
                (item.byStatus?.find((s) => s.status === "PARTIALLY_RELEASED")
                  ?._sum?.netAmount || 0);
              const totalCycles =
                item.byStatus?.reduce((s, b) => s + b._count, 0) || 0;

              return (
                <Pressable
                  key={item.memberId}
                  onPress={() =>
                    navigation.navigate("WorkerRetainedEmployerDetail", {
                      id: item.memberId,
                    })
                  }
                  style={({ pressed }) => ({
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 12,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  {/* Avatar */}
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: c.bgInput,
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {item.hirer?.avatar ? (
                      <Image
                        source={{ uri: item.hirer.avatar }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <AppText
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: c.textMuted,
                        }}
                      >
                        {initials(item.hirer)}
                      </AppText>
                    )}
                  </View>

                  {/* Name + job title */}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: c.text,
                      }}
                      numberOfLines={1}
                    >
                      {item.hirer?.firstName} {item.hirer?.lastName}
                    </AppText>
                    {item.jobTitle ? (
                      <AppText
                        style={{ fontSize: 12, color: c.textDim }}
                        numberOfLines={1}
                      >
                        {item.jobTitle}
                      </AppText>
                    ) : null}
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={c.textMuted}
                    style={{ flexShrink: 0 }}
                  />
                </Pressable>
              );
            })}
          </View>
        )}
      </Panel>
    </ScrollView>
  );
}
