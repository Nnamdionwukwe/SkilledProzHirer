// src/screens/main/worker/WorkerRetainedCyclesScreen.js
// Verbatim port of pages/worker/retained-staff/WorkerRetainedCycles.
//
// Endpoint:
//   GET /retained-staff/me/cycles  (retainedStaffApi.listMyCycles({ page, limit, status }))

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

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
// FILTER TABS — matches STATUS_FILTERS in the web version
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_FILTERS = [
  { value: "", key: "all" },
  { value: "AWAITING_PAYMENT", key: "awaitingPayment" },
  { value: "HELD", key: "held" },
  { value: "PARTIALLY_RELEASED", key: "partiallyReleased" },
  { value: "RELEASED", key: "released" },
  { value: "CANCELLED", key: "cancelled" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE CARD
// ─────────────────────────────────────────────────────────────────────────────
function CycleCard({ cycle, c, t, onPress }) {
  const meta = statusMeta(cycle.status);
  const hirer = cycle.member?.hirer;
  const cycleTitle = cycle.label || String(cycle.type || "").replace(/_/g, " ");
  const hasBooking = !!(cycle.booking?.id || cycle.bookingId);

  return (
    <Pressable
      onPress={hasBooking ? onPress : undefined}
      disabled={!hasBooking}
      style={({ pressed }) => ({
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
        overflow: "hidden",
        opacity: pressed ? 0.92 : 1,
      })}
    >
      {/* Accent bar */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: meta.color,
          opacity: 0.7,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />

      {/* Top: employer avatar/name + status pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.bgInput,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {hirer?.avatar ? (
            <Image
              source={{ uri: hirer.avatar }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: c.textMuted,
              }}
            >
              {initials(hirer)}
            </AppText>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            style={{ fontSize: 13, fontWeight: "700", color: c.text }}
            numberOfLines={1}
          >
            {hirer?.firstName} {hirer?.lastName}
          </AppText>
          {cycle.member?.jobTitle ? (
            <AppText
              style={{ fontSize: 11, color: c.textDim }}
              numberOfLines={1}
            >
              {cycle.member.jobTitle}
            </AppText>
          ) : null}
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 4,
            backgroundColor: meta.bg,
            flexShrink: 0,
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
            {String(cycle.status || "").replace(/_/g, " ")}
          </AppText>
        </View>
      </View>

      {/* Cycle label + pay date */}
      <AppText
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: c.text,
          marginBottom: 2,
        }}
        numberOfLines={1}
      >
        {cycleTitle}
      </AppText>
      <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 10 }}>
        {t("workerRetainedCycles.card.payDate", {
          date: formatDate(cycle.payDate),
        })}
      </AppText>

      {/* Period + Amount row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
          }}
        >
          <Ionicons name="calendar-outline" size={12} color={c.textMuted} />
          <AppText style={{ fontSize: 11, color: c.textDim }} numberOfLines={1}>
            {formatDate(cycle.periodStart)} — {formatDate(cycle.periodEnd)}
          </AppText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginLeft: 8,
            flexShrink: 0,
          }}
        >
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 12,
              color: c.green,
              letterSpacing: -0.3,
            }}
            numberOfLines={1}
          >
            {fmtMoney(cycle.netAmount, cycle.currency)}
          </AppText>
          {hasBooking && (
            <Ionicons
              name="chevron-forward"
              size={14}
              color={c.textMuted}
              style={{ opacity: 0.6 }}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerRetainedCyclesScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [cycles, setCycles] = useState([]);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const LIMIT = 20;

  const loadCycles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit: LIMIT };
      if (status) params.status = status;
      const res = await client.get("/retained-staff/me/cycles", { params });
      const data = res.data?.data || {};
      setCycles(data.cycles || []);
      setTotal(data.meta?.total ?? (data.cycles || []).length);
      setTotalPages(data.meta?.pages ?? 1);
    } catch (err) {
      setError(
        err?.response?.data?.message || t("workerRetainedCycles.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, status, t]);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  useFocusEffect(
    useCallback(() => {
      loadCycles();
    }, [loadCycles]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadCycles();
  };

  const currentFilter = STATUS_FILTERS.find((f) => f.value === status);

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
      <View style={{ marginBottom: 4 }}>
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 15,
            color: c.text,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t("workerRetainedCycles.header.title")}
        </AppText>
        <AppText style={{ fontSize: 12, color: c.textDim }}>
          {t("workerRetainedCycles.header.subtitle")}
        </AppText>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {STATUS_FILTERS.map((f) => {
          const active = status === f.value;
          return (
            <Pressable
              key={f.key}
              onPress={() => {
                setPage(1);
                setStatus(f.value);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? c.orange : c.border,
                backgroundColor: active ? c.orangeDim : c.bgCard,
              }}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: active ? c.orange : c.textDim,
                }}
              >
                {t(`workerRetainedCycles.filters.${f.key}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Content */}
      {loading && !cycles.length ? (
        <View style={{ gap: 12 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} width="100%" height={140} radius={14} />
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
            {t("workerRetainedCycles.errorTitle")}
          </AppText>
          <AppText
            style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
          >
            {error}
          </AppText>
          <Pressable
            onPress={loadCycles}
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
              {t("workerRetainedCycles.tryAgain")}
            </AppText>
          </Pressable>
        </View>
      ) : cycles.length === 0 ? (
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
            name="time-outline"
            size={48}
            color={c.textMuted}
            style={{ opacity: 0.6 }}
          />
          <AppText
            style={{
              fontSize: 14,
              color: c.textDim,
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            {status
              ? t("workerRetainedCycles.emptyFiltered", {
                  status: t(
                    `workerRetainedCycles.filters.${currentFilter?.key || "all"}`,
                  ).toLowerCase(),
                })
              : t("workerRetainedCycles.emptyAll")}
          </AppText>
        </View>
      ) : (
        <>
          <View style={{ gap: 12 }}>
            {cycles.map((cycle) => {
              const bookingId = cycle.booking?.id || cycle.bookingId || null;
              return (
                <CycleCard
                  key={cycle.id}
                  cycle={cycle}
                  c={c}
                  t={t}
                  onPress={() => {
                    if (!bookingId) return;
                    navigation.navigate("BookingDetail", { id: bookingId });
                  }}
                />
              );
            })}
          </View>

          {/* Pagination */}
          {totalPages > 1 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                marginTop: 20,
                flexWrap: "wrap",
              }}
            >
              <Pressable
                disabled={page === 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: page === 1 ? c.border : c.orange,
                  backgroundColor: c.bgPanel,
                  opacity: page === 1 ? 0.4 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={14}
                  color={page === 1 ? c.textMuted : c.orange}
                />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: page === 1 ? c.textMuted : c.orange,
                  }}
                >
                  {t("workerRetainedCycles.pagination.previous")}
                </AppText>
              </Pressable>
              <AppText
                style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
              >
                {t("workerRetainedCycles.pagination.pageOf", {
                  page,
                  pages: totalPages,
                  total,
                })}
              </AppText>
              <Pressable
                disabled={page === totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: page === totalPages ? c.border : c.orange,
                  backgroundColor: c.bgPanel,
                  opacity: page === totalPages ? 0.4 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: page === totalPages ? c.textMuted : c.orange,
                  }}
                >
                  {t("workerRetainedCycles.pagination.next")}
                </AppText>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={page === totalPages ? c.textMuted : c.orange}
                />
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
