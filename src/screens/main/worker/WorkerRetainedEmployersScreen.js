// src/screens/main/worker/WorkerRetainedEmployersScreen.js
// Verbatim port of pages/worker/retained-staff/WorkerRetainedEmployers.
//
// Endpoint:
//   GET /retained-staff/me/employers  (retainedStaffApi.listMyEmployers())

import React, { useCallback, useEffect, useState } from "react";
import {
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
  // Matches the web's toLocaleString() — grouping, no forced decimals
  try {
    return new Intl.NumberFormat("en", {
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  } catch {
    return String(Number(n) || 0);
  }
}

function fmtMoney(amount, currency = "NGN") {
  const code = String(currency || "NGN").toUpperCase();
  const symbol = SYMBOL_MAP[code];
  const digits = formatAmount(amount);
  return symbol ? `${symbol}${digits}` : `${code} ${digits}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS META — matches the CSS classes in WorkerRetainedStaff.module.css
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  ACTIVE: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  PAUSED: { color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  ENDED: { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
  RELEASED: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  HELD: { color: "#818cf8", bg: "rgba(129,140,248,0.15)" },
  PARTIALLY_RELEASED: { color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  AWAITING_PAYMENT: { color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  FAILED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

function statusMeta(raw) {
  const s = String(raw || "ACTIVE").toUpperCase();
  return STATUS_META[s] || { color: "#9ca3af", bg: "rgba(156,163,175,0.12)" };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYER CARD
// ─────────────────────────────────────────────────────────────────────────────
function EmployerCard({ employer, c, t, onPress }) {
  const meta = statusMeta(employer.status);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 12,
        padding: 20,
        opacity: pressed ? 0.92 : 1,
        overflow: "hidden",
      })}
    >
      {/* Top orange accent line */}
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

      {/* Header: job title + status badge */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 12,
            color: c.text,
            lineHeight: 20,
            flexShrink: 1,
          }}
          numberOfLines={1}
        >
          {employer.jobTitle || "—"}
        </AppText>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: meta.color + "88",
            backgroundColor: meta.bg,
          }}
        >
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "800",
              color: meta.color,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {employer.status}
          </AppText>
        </View>
      </View>

      {/* Hirer name */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 16,
        }}
      >
        <Ionicons name="person-outline" size={12} color={c.textMuted} />
        <AppText
          style={{ fontSize: 12, color: c.textMuted, flexShrink: 1 }}
          numberOfLines={1}
        >
          {employer.hirer?.firstName} {employer.hirer?.lastName}
        </AppText>
      </View>

      {/* Stats: Pay Rate + Lifetime Earned */}
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          paddingTop: 14,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: c.textMuted,
              marginBottom: 2,
            }}
          >
            {t("workerRetainedEmployers.card.payRate")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 12,
              color: c.text,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {fmtMoney(employer.payRate, employer.currency)}
          </AppText>
        </View>
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: c.textMuted,
              marginBottom: 2,
            }}
          >
            {t("workerRetainedEmployers.card.lifetimeEarned")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 12,
              color: c.text,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {fmtMoney(employer.lifetimeEarned, employer.currency)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <View style={{ borderRadius: 12, padding: 0 }}>
      <Skeleton width="100%" height={160} radius={12} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerRetainedEmployersScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchEmployers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.get("/retained-staff/me/employers");
      setEmployers(res.data?.data?.employers || []);
    } catch (err) {
      setError(
        err?.response?.data?.message || t("workerRetainedEmployers.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchEmployers();
  }, [fetchEmployers]);

  useFocusEffect(
    useCallback(() => {
      fetchEmployers();
    }, [fetchEmployers]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmployers();
  };

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
            {t("workerRetainedEmployers.header.title")}
          </AppText>
          <AppText style={{ fontSize: 14, color: c.textDim }}>
            {t("workerRetainedEmployers.header.subtitle")}
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

      {/* Content */}
      {loading && !employers.length ? (
        <View style={{ gap: 14 }}>
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <View
          style={{
            alignItems: "center",
            padding: 40,
            gap: 10,
            backgroundColor: c.bgPanel,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Ionicons name="warning" size={36} color={c.red} />
          <AppText style={{ fontSize: 14, fontWeight: "700", color: c.text }}>
            {t("workerRetainedEmployers.errorTitle")}
          </AppText>
          <AppText
            style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
          >
            {error}
          </AppText>
          <Pressable
            onPress={fetchEmployers}
            style={{
              marginTop: 6,
              paddingHorizontal: 20,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
            }}
          >
            <AppText style={{ fontSize: 12, fontWeight: "600", color: c.text }}>
              {t("workerRetainedEmployers.tryAgain")}
            </AppText>
          </Pressable>
        </View>
      ) : employers.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            padding: 60,
            gap: 8,
            backgroundColor: c.bgPanel,
            borderRadius: 14,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: c.border,
          }}
        >
          <Ionicons
            name="briefcase-outline"
            size={48}
            color={c.textMuted}
            style={{ opacity: 0.5, marginBottom: 8 }}
          />
          <AppText
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: c.text,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {t("workerRetainedEmployers.empty.title")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {t("workerRetainedEmployers.empty.body")}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {employers.map((emp) => (
            <EmployerCard
              key={emp.id}
              employer={emp}
              c={c}
              t={t}
              onPress={() =>
                navigation.navigate("WorkerRetainedEmployerDetail", {
                  id: emp.id,
                })
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
