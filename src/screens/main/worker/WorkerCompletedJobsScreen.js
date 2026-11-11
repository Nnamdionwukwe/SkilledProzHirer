// src/screens/main/worker/WorkerCompletedJobsScreen.js
// Verbatim port of pages/worker/CompletedJobs (list view).
//
// Endpoint:
//   GET /workers/completed-jobs?page=&limit=

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
// Intl.NumberFormat's "narrowSymbol" is unreliable on Hermes/Android release
// builds — it often falls back to the ISO code ("NGN 1,500.00"). So we format
// the numeric part with Intl (grouping/decimals) and prepend the symbol from
// our own map. The map is the single source of truth for the glyph.
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

function formatNumber(n) {
  try {
    return new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(n) || 0);
  } catch {
    return (Number(n) || 0).toFixed(2);
  }
}

function fmtMoney(amount, currency = "NGN") {
  const n = Number(amount ?? 0);
  const code = String(currency || "NGN").toUpperCase();
  const symbol = SYMBOL_MAP[code];
  const digits = formatNumber(n);
  return symbol ? `${symbol}${digits}` : `${code} ${digits}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE / INITIALS
// ─────────────────────────────────────────────────────────────────────────────
function formatDateTime(d) {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETED JOB CARD
// ─────────────────────────────────────────────────────────────────────────────
function CompletedJobCard({ booking, c, t, onPress }) {
  const scheduled = new Date(booking.scheduledAt);
  const isPast = scheduled < new Date();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 16,
        padding: 18,
        paddingLeft: 22,
        opacity: pressed ? 0.92 : 1,
        overflow: "hidden",
      })}
    >
      {/* Accent bar — green for completed */}
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: c.green,
          borderTopRightRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />

      {/* Top row: avatar + status badge */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: c.orangeDim,
            borderWidth: 1,
            borderColor: c.orange + "55",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {booking.hirer?.avatar ? (
            <Image
              source={{ uri: booking.hirer.avatar }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <AppText
              style={{ fontSize: 12, fontWeight: "700", color: c.orange }}
            >
              {initials(booking.hirer)}
            </AppText>
          )}
        </View>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 20,
            backgroundColor: "rgba(34,197,94,0.12)",
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.green,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t("workerCompletedJobs.card.status")}
          </AppText>
        </View>
      </View>

      {/* Title */}
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 15,
          color: c.text,
          lineHeight: 20,
          marginBottom: 4,
        }}
        numberOfLines={2}
      >
        {booking.title}
      </AppText>

      {/* Hirer + category */}
      <AppText style={{ fontSize: 12, color: c.textDim, marginBottom: 8 }}>
        {booking.hirer?.firstName} {booking.hirer?.lastName}
        {booking.category?.name ? (
          <>
            {" · "}
            <AppText style={{ fontSize: 12, color: c.orange }}>
              {booking.category.name}
            </AppText>
          </>
        ) : null}
      </AppText>

      {/* Details: scheduled + address */}
      <View style={{ gap: 4, marginBottom: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            opacity: isPast ? 0.5 : 1,
          }}
        >
          <Ionicons name="calendar-outline" size={12} color={c.textDim} />
          <AppText style={{ fontSize: 11, color: c.textDim }}>
            {formatDateTime(booking.scheduledAt)}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="location-outline" size={12} color={c.textDim} />
          <AppText
            style={{ fontSize: 11, color: c.textDim, flexShrink: 1 }}
            numberOfLines={1}
          >
            {booking.address || "—"}
          </AppText>
        </View>
      </View>

      {/* Footer: rate + earned */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          paddingTop: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          marginTop: 2,
        }}
      >
        <AppText weight="displayBlack" style={{ fontSize: 16, color: c.text }}>
          {fmtMoney(booking.agreedRate, booking.currency)}
        </AppText>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 10,
            backgroundColor: "rgba(34,197,94,0.12)",
          }}
        >
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: c.green,
            }}
          >
            {t("workerCompletedJobs.card.earned", {
              amount: fmtMoney(booking.totalEarned, booking.currency),
            })}
          </AppText>
        </View>
      </View>

      {/* Optional review */}
      {booking.review && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            paddingTop: 8,
            marginTop: 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
          }}
        >
          <AppText style={{ fontSize: 12, color: c.orange }}>
            {"★".repeat(booking.review.rating)}
            {"☆".repeat(5 - booking.review.rating)}
          </AppText>
          {booking.review.comment ? (
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                fontStyle: "italic",
                flexShrink: 1,
              }}
              numberOfLines={2}
            >
              “{booking.review.comment}”
            </AppText>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <View
      style={{
        backgroundColor: "transparent",
        borderWidth: 1,
        borderColor: "transparent",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <Skeleton width="100%" height={200} radius={16} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerCompletedJobsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const limit = 12;
  const pages = Math.max(1, Math.ceil(total / limit));

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.get("/workers/completed-jobs", {
        params: { page, limit },
      });
      const data = res.data.data || {};
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          t("workerCompletedJobs.list.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, t]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  useFocusEffect(
    useCallback(() => {
      fetchJobs();
    }, [fetchJobs]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchJobs();
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
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: c.orange,
              marginBottom: 4,
            }}
          >
            {t("workerCompletedJobs.header.eyebrow")}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 22,
                color: c.text,
                letterSpacing: -0.5,
              }}
            >
              {t("workerCompletedJobs.header.title")}
            </AppText>
            {total > 0 ? (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 2,
                  borderRadius: 20,
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.textDim,
                  }}
                >
                  {total}
                </AppText>
              </View>
            ) : null}
          </View>
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
      {loading && !bookings.length ? (
        <View style={{ gap: 14 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
            {t("workerCompletedJobs.list.errorTitle")}
          </AppText>
          <AppText
            style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
          >
            {error}
          </AppText>
          <Pressable
            onPress={fetchJobs}
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
              {t("workerCompletedJobs.list.tryAgain")}
            </AppText>
          </Pressable>
        </View>
      ) : bookings.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            padding: 60,
            gap: 8,
            backgroundColor: c.bgPanel,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <AppText style={{ fontSize: 52, marginBottom: 8 }}>🏆</AppText>
          <AppText
            style={{
              fontSize: 17,
              fontWeight: "700",
              color: c.text,
              textAlign: "center",
              marginBottom: 4,
            }}
          >
            {t("workerCompletedJobs.empty.title")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              maxWidth: 320,
              marginBottom: 16,
            }}
          >
            {t("workerCompletedJobs.empty.body")}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("BrowseJobs")}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: c.orange,
            }}
          >
            <AppText style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>
              {t("workerCompletedJobs.empty.browseJobs")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={{ gap: 14 }}>
            {bookings.map((b) => (
              <CompletedJobCard
                key={b.id}
                booking={b}
                c={c}
                t={t}
                onPress={() =>
                  navigation.navigate("BookingDetail", { id: b.id })
                }
              />
            ))}
          </View>

          {pages > 1 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                marginTop: 24,
              }}
            >
              <Pressable
                disabled={page === 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
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
                    color: page === 1 ? c.textMuted : c.orange,
                  }}
                >
                  {t("workerCompletedJobs.pagination.prev")}
                </AppText>
              </Pressable>
              <AppText style={{ fontSize: 12, color: c.textDim }}>
                {t("workerCompletedJobs.pagination.pageOf", { page, pages })}
              </AppText>
              <Pressable
                disabled={page === pages}
                onPress={() => setPage((p) => Math.min(pages, p + 1))}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: page === pages ? c.border : c.orange,
                  backgroundColor: c.bgPanel,
                  opacity: page === pages ? 0.4 : 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: page === pages ? c.textMuted : c.orange,
                  }}
                >
                  {t("workerCompletedJobs.pagination.next")}
                </AppText>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={page === pages ? c.textMuted : c.orange}
                />
              </Pressable>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}
