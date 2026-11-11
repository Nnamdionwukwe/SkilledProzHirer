// src/screens/main/MyDisputesScreen.js
//
// Verbatim port of pages/disputes/MyDisputes.jsx.
//
// Fetch:  GET  /disputes/my
// Cancel: PATCH /disputes/:bookingId/cancel
//
// Styling follows the retained-staff cards (WorkerRetainedEmployers /
// WorkerRetainedEmployerDetail) — floating cards with top accent line,
// pill-shaped status badges, stacked stat cards, section cards.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";

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

function fmtMoney(amount, currency = "NGN") {
  const n = Number(amount ?? 0);
  const code = String(currency || "NGN").toUpperCase();
  const symbol = SYMBOL_MAP[code];
  let digits;
  try {
    digits = new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    digits = n.toFixed(2);
  }
  return symbol ? `${symbol}${digits}` : `${code} ${digits}`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function isPdfUrl(url) {
  if (!url) return false;
  const clean = String(url).split("?")[0].split("#")[0].toLowerCase();
  return clean.endsWith(".pdf");
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPE — the /disputes/my endpoint can return duplicate rows (same id,
// different joined relation), which makes React complain about duplicate
// keys. We drop duplicate ids here before render.
// ─────────────────────────────────────────────────────────────────────────────
function dedupeDisputes(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const d of list) {
    const k = d?.id;
    if (!k) {
      out.push(d);
      continue;
    }
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(d);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS META
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  DISPUTED: {
    key: "open",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    icon: "alert-circle-outline",
  },
  UNDER_REVIEW: {
    key: "underReview",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.10)",
    icon: "time-outline",
  },
  RESOLVED: {
    key: "resolved",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    icon: "checkmark-circle-outline",
  },
  CANCELLED: {
    key: "cancelled",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
    icon: "close-circle-outline",
  },
};

const FILTERS = [
  { key: "", tKey: "all" },
  { key: "DISPUTED", tKey: "open" },
  { key: "UNDER_REVIEW", tKey: "underReview" },
  { key: "RESOLVED", tKey: "resolved" },
  { key: "CANCELLED", tKey: "cancelled" },
];

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
function StatCard({ label, value, accentColor, c }) {
  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 12,
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
          backgroundColor: accentColor,
          opacity: 0.5,
        }}
      />
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 18,
          color: accentColor,
          letterSpacing: -0.6,
          lineHeight: 24,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {String(value)}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({ title, icon, c, children, style }) {
  return (
    <View
      style={[
        {
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 16,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
        }}
      >
        <Ionicons
          name={icon || "information-circle-outline"}
          size={12}
          color={c.orange}
        />
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {title}
        </AppText>
      </View>
      <View style={{ gap: 8 }}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GRID ITEM
// ─────────────────────────────────────────────────────────────────────────────
function GridItem({ label, value, c }) {
  return (
    <View
      style={{
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: c.bgCard,
        borderColor: c.border,
      }}
    >
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          marginBottom: 3,
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{ fontSize: 12, color: c.text, fontWeight: "600" }}
        numberOfLines={3}
      >
        {value}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PARTY CHIP
// ─────────────────────────────────────────────────────────────────────────────
function PartyChip({ party, role, c }) {
  const initials = `${party.firstName?.[0] || ""}${
    party.lastName?.[0] || ""
  }`.toUpperCase();
  return (
    <View
      style={{
        flex: 1,
        minWidth: 140,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        backgroundColor: c.bgCard,
        borderColor: c.border,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundColor: c.orangeDim,
          borderColor: c.orange + "55",
        }}
      >
        {party.avatar ? (
          <Image
            source={{ uri: party.avatar }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <AppText style={{ fontSize: 10, fontWeight: "700", color: c.orange }}>
            {initials}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          style={{ fontSize: 12, fontWeight: "600", color: c.text }}
          numberOfLines={1}
        >
          {party.firstName} {party.lastName}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Ionicons name="person-outline" size={9} color={c.textMuted} />
          <AppText style={{ fontSize: 10, color: c.textMuted }}>{role}</AppText>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function MyDisputesScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [pdfViewerSrc, setPdfViewerSrc] = useState(null);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const res = await client.get("/disputes/my");
        const list = res?.data?.data?.disputes || [];
        setDisputes(dedupeDisputes(list));
      } catch (err) {
        toast.error(err?.response?.data?.message || t("disputes.loadFailed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t, toast],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load(false);
    }, [load]),
  );

  useEffect(() => {
    const targetId = route?.params?.bookingId;
    if (targetId && disputes.length > 0) {
      const match = disputes.find((d) => d.id === targetId);
      if (match) setExpanded(match.id);
    }
  }, [disputes, route?.params?.bookingId]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  const openCancelModal = (bookingId) => {
    setCancelBookingId(bookingId);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelBookingId(null);
  };

  const confirmCancel = async () => {
    if (!cancelBookingId) return;
    setCancelling(cancelBookingId);
    try {
      await client.patch(`/disputes/${cancelBookingId}/cancel`);
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === cancelBookingId ? { ...d, status: "CANCELLED" } : d,
        ),
      );
      toast.success(t("disputes.cancelledSuccess"));
      closeCancelModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("disputes.cancelFailed"));
      closeCancelModal();
    } finally {
      setCancelling(null);
    }
  };

  const openEvidence = (url) => {
    if (!url) return;
    const absoluteUrl = /^https?:\/\//i.test(url)
      ? url
      : `${client.defaults.baseURL.replace(/\/api\/?$/, "")}${url.startsWith("/") ? "" : "/"}${url}`;
    if (isPdfUrl(absoluteUrl)) {
      setPdfViewerSrc(absoluteUrl);
    } else {
      setLightboxImage(absoluteUrl);
    }
  };

  const total = disputes.length;
  const activeCount = disputes.filter(
    (d) => d.status === "DISPUTED" || d.status === "UNDER_REVIEW",
  ).length;
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED").length;

  const filtered = useMemo(() => {
    if (!filterStatus) return disputes;
    return disputes.filter((d) => d.status === filterStatus);
  }, [disputes, filterStatus]);

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="list" rows={4} />
      </AppScreen>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 48, paddingHorizontal: 16 }}
    >
      {/* ── Header ── */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          marginTop: 12,
          flexWrap: "wrap",
        }}
      >
        <View style={{ flex: 1, minWidth: 200 }}>
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: c.orange,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {t("disputes.eyebrow")}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              color: c.text,
              letterSpacing: -0.6,
              lineHeight: 32,
              marginBottom: 4,
            }}
          >
            {t("disputes.headerTitle")}
          </AppText>
          <AppText style={{ fontSize: 13, color: c.textDim }}>
            {t("disputes.subtitle")}
          </AppText>
        </View>
        <Pressable
          onPress={onRefresh}
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

      {/* ── Stat cards ── */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        <StatCard
          label={t("disputes.stats.total")}
          value={total}
          accentColor={c.text}
          c={c}
        />
        <StatCard
          label={t("disputes.stats.active")}
          value={activeCount}
          accentColor={c.orange}
          c={c}
        />
        <StatCard
          label={t("disputes.stats.resolved")}
          value={resolvedCount}
          accentColor={c.green}
          c={c}
        />
      </View>

      {/* ── Filter pills ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 16 }}
        contentContainerStyle={{ gap: 6 }}
      >
        {FILTERS.map((f) => {
          const active = filterStatus === f.key;
          return (
            <Pressable
              key={f.key || "all"}
              onPress={() => setFilterStatus(f.key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? c.orange : c.border,
                backgroundColor: active ? c.orangeDim : c.bgPanel,
              }}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: active ? c.orange : c.textDim,
                }}
              >
                {t(`disputes.filters.${f.tKey}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            padding: 60,
            gap: 8,
            backgroundColor: c.bgPanel,
            borderRadius: 16,
            borderWidth: 1.5,
            borderStyle: "dashed",
            borderColor: c.border,
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
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
            {filterStatus
              ? t("disputes.emptyFiltered")
              : t("disputes.emptyAll")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            {t("disputes.emptyBody")}
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 14 }}>
          {filtered.map((dispute, idx) => {
            const meta = STATUS_META[dispute.status] || STATUS_META.DISPUTED;
            const isExpanded = expanded === dispute.id;
            return (
              <View
                key={`${dispute.id || "dispute"}-${idx}`}
                style={{
                  backgroundColor: c.bgPanel,
                  borderWidth: 1,
                  borderColor: isExpanded ? c.orange + "88" : c.border,
                  borderRadius: 16,
                  overflow: "hidden",
                }}
              >
                {/* Top accent line */}
                <View
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    backgroundColor: c.orange,
                    opacity: 0.5,
                    zIndex: 1,
                  }}
                />

                {/* Card top */}
                <Pressable
                  onPress={() =>
                    setExpanded((prev) =>
                      prev === dispute.id ? null : dispute.id,
                    )
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 18,
                    paddingTop: 20,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: meta.bg,
                      borderWidth: 1,
                      borderColor: meta.color + "55",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      weight="displayBlack"
                      style={{
                        fontSize: 11,
                        color: c.text,
                        lineHeight: 20,
                        letterSpacing: -0.3,
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {dispute.title || t("disputes.bookingDispute")}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
                      {dispute.disputeReason ? (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 4,
                            borderWidth: 1,
                            backgroundColor: c.bgCard,
                            borderColor: c.border,
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 10,
                              color: c.textDim,
                              textTransform: "capitalize",
                              fontWeight: "600",
                            }}
                          >
                            {String(dispute.disputeReason).replace(/_/g, " ")}
                          </AppText>
                        </View>
                      ) : null}
                      <AppText style={{ fontSize: 11, color: c.textMuted }}>
                        {fmtDate(dispute.createdAt)}
                      </AppText>
                      {dispute.category ? (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 4,
                            backgroundColor: c.orangeDim,
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 10,
                              fontWeight: "600",
                              color: c.orange,
                            }}
                          >
                            {dispute.category.icon} {dispute.category.name}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end", gap: 6 }}>
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
                        {t(`disputes.status.${meta.key}`)}
                      </AppText>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={14}
                      color={c.textMuted}
                    />
                  </View>
                </Pressable>

                {/* Expanded body */}
                {isExpanded ? (
                  <View
                    style={{
                      padding: 18,
                      paddingTop: 0,
                      gap: 12,
                    }}
                  >
                    {/* Dispute Info */}
                    <SectionCard
                      title={t("disputes.sections.disputeInfo")}
                      icon="alert-circle-outline"
                      c={c}
                    >
                      {dispute.disputeReason ? (
                        <View>
                          <AppText
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: c.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              marginBottom: 3,
                            }}
                          >
                            {t("disputes.fields.reason")}
                          </AppText>
                          <AppText
                            style={{
                              fontSize: 13,
                              color: c.text,
                              textTransform: "capitalize",
                            }}
                          >
                            {String(dispute.disputeReason).replace(/_/g, " ")}
                          </AppText>
                        </View>
                      ) : null}
                      {dispute.disputeDescription ? (
                        <View>
                          <AppText
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: c.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              marginBottom: 3,
                            }}
                          >
                            {t("disputes.fields.description")}
                          </AppText>
                          <AppText
                            style={{
                              fontSize: 13,
                              color: c.text,
                              lineHeight: 20,
                            }}
                          >
                            {dispute.disputeDescription}
                          </AppText>
                        </View>
                      ) : null}
                      {dispute.disputeEvidence?.length > 0 ? (
                        <View>
                          <AppText
                            style={{
                              fontSize: 10,
                              fontWeight: "700",
                              color: c.textMuted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              marginBottom: 6,
                            }}
                          >
                            {t("disputes.fields.evidence")}
                          </AppText>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            {dispute.disputeEvidence.map((url, eIdx) => {
                              const pdf = isPdfUrl(url);
                              return (
                                <Pressable
                                  key={`${dispute.id}-ev-${eIdx}`}
                                  onPress={() => openEvidence(url)}
                                  style={{
                                    width: 68,
                                    height: 68,
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    overflow: "hidden",
                                    backgroundColor: c.bgInput,
                                    borderColor: c.border,
                                  }}
                                >
                                  {pdf ? (
                                    <View
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Ionicons
                                        name="document-text-outline"
                                        size={24}
                                        color={c.red}
                                      />
                                      <AppText
                                        style={{
                                          fontSize: 8,
                                          fontWeight: "700",
                                          color: c.textMuted,
                                          marginTop: 2,
                                        }}
                                      >
                                        PDF
                                      </AppText>
                                    </View>
                                  ) : (
                                    <Image
                                      source={{ uri: url }}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                      }}
                                      resizeMode="cover"
                                    />
                                  )}
                                  <View
                                    pointerEvents="none"
                                    style={{
                                      ...StyleSheet.absoluteFillObject,
                                      backgroundColor: "rgba(0,0,0,0.45)",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                  >
                                    <Ionicons
                                      name="eye-outline"
                                      size={16}
                                      color="#fff"
                                    />
                                  </View>
                                </Pressable>
                              );
                            })}
                          </ScrollView>
                        </View>
                      ) : null}
                    </SectionCard>

                    {/* Booking Details */}
                    <SectionCard
                      title={t("disputes.sections.bookingDetails")}
                      icon="calendar-outline"
                      c={c}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        {dispute.agreedRate != null ? (
                          <GridItem
                            label={t("disputes.fields.agreedRate")}
                            value={fmtMoney(
                              dispute.agreedRate,
                              dispute.currency,
                            )}
                            c={c}
                          />
                        ) : null}
                        {dispute.estimatedUnit && dispute.estimatedValue ? (
                          <GridItem
                            label={t("disputes.fields.duration")}
                            value={`${dispute.estimatedValue} ${dispute.estimatedUnit}`}
                            c={c}
                          />
                        ) : null}
                        {dispute.address ? (
                          <GridItem
                            label={t("disputes.fields.address")}
                            value={dispute.address}
                            c={c}
                          />
                        ) : null}
                        {dispute.scheduledAt ? (
                          <GridItem
                            label={t("disputes.fields.scheduled")}
                            value={fmtDateTime(dispute.scheduledAt)}
                            c={c}
                          />
                        ) : null}
                        {dispute.jobType ? (
                          <GridItem
                            label={t("disputes.fields.jobType")}
                            value={String(dispute.jobType).replace(/_/g, " ")}
                            c={c}
                          />
                        ) : null}
                        {dispute.locationType ? (
                          <GridItem
                            label={t("disputes.fields.locationType")}
                            value={String(dispute.locationType).replace(
                              /_/g,
                              " ",
                            )}
                            c={c}
                          />
                        ) : null}
                      </View>
                    </SectionCard>

                    {/* Parties */}
                    {dispute.hirer || dispute.worker ? (
                      <SectionCard
                        title={t("disputes.sections.parties")}
                        icon="people-outline"
                        c={c}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {dispute.hirer ? (
                            <PartyChip
                              party={dispute.hirer}
                              role={t("disputes.roles.hirer")}
                              c={c}
                            />
                          ) : null}
                          {dispute.worker ? (
                            <PartyChip
                              party={dispute.worker}
                              role={t("disputes.roles.worker")}
                              c={c}
                            />
                          ) : null}
                        </View>
                      </SectionCard>
                    ) : null}

                    {/* Payment */}
                    {dispute.payments?.length > 0 ? (
                      <SectionCard
                        title={t("disputes.sections.payment")}
                        icon="cash-outline"
                        c={c}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          <GridItem
                            label={t("disputes.fields.paymentStatus")}
                            value={dispute.payments[0].status}
                            c={c}
                          />
                          <GridItem
                            label={t("disputes.fields.paymentAmount")}
                            value={fmtMoney(
                              dispute.payments[0].amount,
                              dispute.payments[0].currency,
                            )}
                            c={c}
                          />
                        </View>
                      </SectionCard>
                    ) : null}

                    {/* Actions */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      {dispute.status === "DISPUTED" ? (
                        <Pressable
                          onPress={() => openCancelModal(dispute.id)}
                          disabled={cancelling === dispute.id}
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: c.red,
                            backgroundColor: pressed ? c.redDim : "transparent",
                            opacity: cancelling === dispute.id ? 0.5 : 1,
                          })}
                        >
                          {cancelling === dispute.id ? (
                            <ActivityIndicator color={c.red} size="small" />
                          ) : (
                            <>
                              <Ionicons
                                name="trash-outline"
                                size={12}
                                color={c.red}
                              />
                              <AppText
                                style={{
                                  fontSize: 12,
                                  fontWeight: "700",
                                  color: c.red,
                                }}
                              >
                                {t("disputes.actions.cancel")}
                              </AppText>
                            </>
                          )}
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() =>
                          navigation.navigate("BookingDetail", {
                            id: dispute.id,
                          })
                        }
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: c.orange,
                          marginLeft: "auto",
                        }}
                      >
                        <Ionicons
                          name="eye-outline"
                          size={12}
                          color={c.orange}
                        />
                        <AppText
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: c.orange,
                          }}
                        >
                          {t("disputes.actions.viewBooking")}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* Cancel modal */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              padding: 20,
              borderRadius: 16,
              borderWidth: 1,
              backgroundColor: c.bgPanel,
              borderColor: c.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <AppText
                weight="displayBlack"
                style={{ fontSize: 16, color: c.text }}
              >
                {t("disputes.cancelModal.title")}
              </AppText>
              <Pressable onPress={closeCancelModal} hitSlop={8}>
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={c.textDim}
                />
              </Pressable>
            </View>
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                lineHeight: 19,
                marginBottom: 16,
              }}
            >
              {t("disputes.cancelModal.body")}
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={closeCancelModal}
                disabled={!!cancelling}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: "transparent",
                  borderColor: c.border,
                  borderWidth: 1,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.textDim,
                  }}
                >
                  {t("disputes.cancelModal.keep")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                disabled={!!cancelling}
                style={({ pressed }) => ({
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: "center",
                  backgroundColor: c.red,
                  opacity: cancelling ? 0.6 : pressed ? 0.9 : 1,
                })}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                  >
                    {t("disputes.cancelModal.confirm")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lightbox */}
      <Modal
        visible={!!lightboxImage}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxImage(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => setLightboxImage(null)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              zIndex: 2,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {lightboxImage ? (
            <Image
              source={{ uri: lightboxImage }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* PDF viewer */}
      <Modal
        visible={!!pdfViewerSrc}
        animationType="slide"
        onRequestClose={() => setPdfViewerSrc(null)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.bg }}
          edges={["top", "bottom"]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
              backgroundColor: c.bgPanel,
            }}
          >
            <Pressable
              onPress={() => setPdfViewerSrc(null)}
              hitSlop={8}
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={20} color={c.text} />
            </Pressable>
            <AppText
              style={{ fontSize: 14, fontWeight: "600", color: c.text }}
              numberOfLines={1}
            >
              {t("disputes.pdfViewerTitle")}
            </AppText>
            <View style={{ width: 20 }} />
          </View>
          {pdfViewerSrc ? (
            <WebView
              source={{
                uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfViewerSrc)}`,
              }}
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: c.bg,
                  }}
                >
                  <ActivityIndicator size="large" color={c.orange} />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>
    </AppScreen>
  );
}
