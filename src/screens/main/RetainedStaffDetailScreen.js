// src/screens/main/RetainedStaffDetailScreen.js
//
// Verbatim port of src/pages/hirer/retained-staff/HirerRetainedStaffDetail.jsx
// + HirerRetainedStaff.module.css (profile header, KPIs, tabs, table).

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import EmptyState from "../../components/EmptyState";
import StatCard from "../../components/RetainedStaff/StatCard";
import CreateCycleModal from "../../components/RetainedStaff/CreateCycleModal";
import EditStaffModal from "../../components/RetainedStaff/EditStaffModal";
import ConfirmModal from "../../components/ConfirmModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";
import client from "../../api/client";

const API_BASE = client?.defaults?.baseURL || "https://api.skilledproz.com";
const resolveAvatar = (raw) => {
  if (!raw || typeof raw !== "string") return null;
  if (raw.startsWith("http")) return raw;
  return `${API_BASE}${raw.startsWith("/") ? "" : "/"}${raw}`;
};

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

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const STATUS_COLOR = (theme, status) => {
  const map = {
    ACTIVE: theme.colors.green,
    PAUSED: "#fbbf24",
    ENDED: theme.colors.textMuted,
    TERMINATED: theme.colors.red,
  };
  return map[status] || theme.colors.textMuted;
};

const CYCLE_STATUS_COLOR = (theme, status) => {
  const map = {
    RELEASED: theme.colors.green,
    AWAITING_PAYMENT: "#fbbf24",
    HELD: theme.colors.orange,
    CANCELLED: theme.colors.red,
    PARTIALLY_RELEASED: theme.colors.orange,
    FAILED: theme.colors.red,
  };
  return map[status] || theme.colors.textMuted;
};

export default function RetainedStaffDetailScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  const { memberId } = route.params || {};

  const [member, setMember] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("payroll");
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const isWide = width >= 768;
  const isCompact = width <= 640;
  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  const loadMember = useCallback(
    async (opts = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await retainedStaffApi.getStaff(memberId);
        setMember(res.data?.data?.member || null);
        setCycles(res.data?.data?.recentCycles || []);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || t("retainedStaff.detailLoadFailed"),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [memberId, toast, t],
  );

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMember({ silent: true });
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await retainedStaffApi.pauseStaff(memberId, "Paused from staff detail");
      toast.success(t("retainedStaff.staffPaused"));
      loadMember({ silent: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("retainedStaff.pauseFailed"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await retainedStaffApi.resumeStaff(memberId);
      toast.success(t("retainedStaff.staffResumed"));
      loadMember({ silent: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("retainedStaff.resumeFailed"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStaff = async () => {
    setShowDeleteModal(false);
    setActionLoading(true);
    try {
      await retainedStaffApi.deleteStaff(memberId);
      toast.success(t("retainedStaff.staffDeleted"));
      navigation.navigate("RetainedStaffList");
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("retainedStaff.deleteFailed"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCycle = async () => {
    if (!cycleToDelete) return;
    const target = cycleToDelete;
    setCycleToDelete(null);
    setActionLoading(true);
    try {
      await retainedStaffApi.deleteCycle(target.id);
      toast.success(t("retainedStaff.cycleDeleted"));
      loadMember({ silent: true });
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("retainedStaff.cycleDeleteFailed"),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const goBack = () => navigation.navigate("RetainedStaffList");
  const goCycle = (cycleId) =>
    navigation.navigate("RetainedStaffCycleDetail", {
      id: memberId,
      cycleId,
    });

  // ── Shared display styles for figures / labels ───────────────
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

  if (loading) {
    return (
      <AppScreen scroll={false} contentContainerStyle={{ padding: 20 }}>
        <View style={{ gap: 16 }}>
          <View
            style={{
              height: 80,
              width: 80,
              borderRadius: 40,
              backgroundColor: c.bgInput,
            }}
          />
          <View
            style={{
              height: 24,
              width: "60%",
              backgroundColor: c.bgInput,
              borderRadius: 6,
            }}
          />
          <View
            style={{
              height: 14,
              width: "40%",
              backgroundColor: c.bgInput,
              borderRadius: 4,
            }}
          />
          <View
            style={{
              height: 100,
              backgroundColor: c.bgPanel,
              borderRadius: 12,
              marginTop: 12,
            }}
          />
        </View>
      </AppScreen>
    );
  }

  if (!member) {
    return (
      <AppScreen scroll={false}>
        <EmptyState
          icon="alert-circle-outline"
          iconSize={48}
          title={t("retainedStaff.detailNotFound")}
          text={t("retainedStaff.detailNotFoundSub")}
        />
      </AppScreen>
    );
  }

  const avatar = resolveAvatar(
    member?.worker?.avatar || member?.worker?.avatarUrl,
  );
  const statusColor = STATUS_COLOR(theme, member.status);
  const canDelete = (member?._count?.cycles ?? 0) === 0;

  return (
    <AppScreen
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
          colors={[c.orange]}
        />
      }
    >
      {/* Back link */}
      <Pressable
        onPress={goBack}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}
      >
        <Ionicons name="arrow-back" size={16} color={c.textDim} />
        <AppText
          style={{
            fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
            fontSize: rem(0.85),
            fontWeight: "600",
            color: c.textDim,
            marginLeft: 6,
          }}
        >
          {t("retainedStaff.backToStaff")}
        </AppText>
      </Pressable>

      {/* Profile header */}
      <View style={[styles.profileHeader, isWide && styles.profileHeaderWide]}>
        <View style={[styles.avatarLg, { backgroundColor: c.bgInput }]}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatarLgImg} />
          ) : (
            <Ionicons name="person-outline" size={32} color={c.textMuted} />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            weight="displayBlack"
            numberOfLines={2}
            style={{
              fontSize: 15,
              letterSpacing: -0.5,
            }}
          >
            {member?.worker?.firstName} {member?.worker?.lastName}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.875),
              color: c.textDim,
              marginTop: 2,
            }}
          >
            {member.jobTitle}
            {member.department ? ` · ${member.department}` : ""}
          </AppText>
          <View
            style={{
              alignSelf: "flex-start",
              borderWidth: 1,
              borderColor: statusColor,
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 2,
              marginTop: 6,
            }}
          >
            <AppText
              style={{
                fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                fontSize: rem(0.65),
                fontWeight: "800",
                letterSpacing: 0.05 * rem(0.65),
                textTransform: "uppercase",
                color: statusColor,
              }}
            >
              {member.status}
            </AppText>
          </View>
        </View>

        {/* Actions */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 8,
            marginTop: isWide ? 0 : 12,
          }}
        >
          <IconBtn
            icon="create-outline"
            onPress={() => setShowEditModal(true)}
            theme={theme}
          />
          {canDelete ? (
            <IconBtn
              icon="trash-outline"
              danger
              onPress={() => setShowDeleteModal(true)}
              theme={theme}
            />
          ) : null}
          {member.status === "ACTIVE" ? (
            <SmallBtn
              label={t("retainedStaff.pauseBtn")}
              icon="pause-outline"
              onPress={handlePause}
              disabled={actionLoading}
              theme={theme}
              rem={rem}
            />
          ) : null}
          {member.status === "PAUSED" ? (
            <SmallBtn
              label={t("retainedStaff.resumeBtn")}
              icon="play-outline"
              onPress={handleResume}
              disabled={actionLoading}
              theme={theme}
              rem={rem}
            />
          ) : null}
          <Pressable
            onPress={() => setShowCycleModal(true)}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: pressed ? c.orangeHover : c.orange,
              },
            ]}
          >
            <Ionicons name="add" size={14} color="#fff" />
            <AppText
              style={{
                fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                fontSize: rem(0.85),
                fontWeight: "600",
                color: "#fff",
                marginLeft: 6,
              }}
            >
              {t("retainedStaff.createCycleBtn")}
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* KPI cards */}
      <View style={styles.statsGrid}>
        {[
          {
            icon: "cash-outline",
            label: t("retainedStaff.kpiPayRate"),
            value: formatMoney(member.payRate, member.currency),
            accent: "default",
          },
          {
            icon: "time-outline",
            label: t("retainedStaff.kpiLifetimePaid"),
            value: formatMoney(member.totalPaidLifetime, member.currency),
            accent: "green",
          },
          {
            icon: "cash-outline",
            label: t("retainedStaff.kpiHeld"),
            value: formatMoney(member.totalHeld, member.currency),
            accent: "orange",
          },
          {
            icon: "calendar-outline",
            label: t("retainedStaff.kpiNextCycle"),
            value: member.nextCycleAt ? formatDate(member.nextCycleAt) : "—",
            accent: "yellow",
          },
        ].map((kpi, i) => (
          <View
            key={i}
            style={{
              width: isWide ? "23%" : isCompact ? "48%" : "48%",
              marginBottom: 12,
            }}
          >
            <StatCard
              icon={kpi.icon}
              label={kpi.label}
              value={kpi.value}
              accent={kpi.accent}
              valueStyle={figureStyle}
              labelStyle={labelStyle}
            />
          </View>
        ))}
      </View>

      {/* Tabs */}
      <View
        style={[styles.tabRow, { borderBottomColor: c.border, marginTop: 8 }]}
      >
        {[
          {
            key: "payroll",
            label: t("retainedStaff.tabPayroll"),
            icon: "time-outline",
          },
          {
            key: "documents",
            label: t("retainedStaff.tabDocuments"),
            icon: "document-outline",
          },
          {
            key: "notes",
            label: t("retainedStaff.tabNotes"),
            icon: "book-outline",
          },
        ].map((tb) => {
          const active = tab === tb.key;
          return (
            <Pressable
              key={tb.key}
              onPress={() => setTab(tb.key)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingVertical: 12,
                paddingHorizontal: 8,
                borderBottomWidth: 2,
                borderBottomColor: active ? c.orange : "transparent",
              }}
            >
              <Ionicons
                name={tb.icon}
                size={14}
                color={active ? c.orange : c.textDim}
              />
              <AppText
                style={{
                  fontFamily: active
                    ? theme.fonts?.bodyBold || "DMSans_700Bold"
                    : theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.85),
                  fontWeight: active ? "700" : "600",
                  color: active ? c.orange : c.textDim,
                }}
              >
                {tb.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Tab content */}
      {tab === "payroll" ? (
        <View style={{ marginTop: 16 }}>
          <View style={styles.panelHeader}>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 15,
                letterSpacing: -0.5,
                flex: 1,
              }}
            >
              {t("retainedStaff.recentCycles")}
            </AppText>
            <Pressable
              onPress={() => setShowCycleModal(true)}
              style={({ pressed }) => [
                styles.smallBtn,
                {
                  backgroundColor: c.bgCard,
                  borderColor: pressed ? c.orange : c.border,
                },
              ]}
            >
              <Ionicons name="add" size={12} color={c.textDim} />
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.75),
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 4,
                }}
              >
                {t("retainedStaff.createCycleBtn")}
              </AppText>
            </Pressable>
          </View>

          {cycles.length === 0 ? (
            <EmptyState
              icon="time-outline"
              iconSize={32}
              text={t("retainedStaff.noCyclesYet")}
              compact
            />
          ) : (
            <View style={{ gap: 8, marginTop: 12 }}>
              {cycles.map((cycle) => {
                const statusColor = CYCLE_STATUS_COLOR(theme, cycle.status);
                const canDeleteCycle = [
                  "AWAITING_PAYMENT",
                  "CANCELLED",
                ].includes(cycle.status);
                return (
                  <View
                    key={cycle.id}
                    style={[
                      styles.cycleRow,
                      {
                        backgroundColor: c.bgCard,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText
                        numberOfLines={1}
                        style={{
                          fontFamily:
                            theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                          fontSize: rem(0.9),
                          fontWeight: "600",
                          color: c.text,
                        }}
                      >
                        {formatDate(cycle.periodStart)} —{" "}
                        {formatDate(cycle.periodEnd)}
                      </AppText>
                      <AppText
                        numberOfLines={1}
                        style={{
                          fontFamily: theme.fonts?.body || "DMSans_400Regular",
                          fontSize: rem(0.75),
                          color: c.textDim,
                          marginTop: 2,
                        }}
                      >
                        {String(cycle.type || "").replace("_", " ")}
                        {cycle.label ? ` · ${cycle.label}` : ""}
                      </AppText>
                      <AppText
                        weight="displayBlack"
                        style={{
                          fontSize: 13,
                          letterSpacing: -0.5,
                          marginTop: 4,
                        }}
                      >
                        {formatMoney(cycle.netAmount, cycle.currency)}
                      </AppText>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 8 }}>
                      <View
                        style={{
                          borderWidth: 1,
                          borderColor: statusColor,
                          borderRadius: 999,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                        }}
                      >
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodyBold || "DMSans_700Bold",
                            fontSize: rem(0.65),
                            fontWeight: "800",
                            color: statusColor,
                            letterSpacing: 0.04 * rem(0.65),
                          }}
                        >
                          {String(cycle.status).replace("_", " ")}
                        </AppText>
                      </View>
                      <View style={{ flexDirection: "row", gap: 6 }}>
                        <IconBtn
                          icon="chevron-forward"
                          onPress={() => goCycle(cycle.id)}
                          theme={theme}
                        />
                        {canDeleteCycle ? (
                          <IconBtn
                            icon="trash-outline"
                            danger
                            onPress={() => setCycleToDelete(cycle)}
                            theme={theme}
                          />
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      ) : null}

      {tab === "documents" ? (
        <View style={{ marginTop: 16 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            {t("retainedStaff.employmentDocs")}
          </AppText>
          {!member?.documents || member.documents.length === 0 ? (
            <EmptyState
              icon="document-outline"
              iconSize={32}
              text={t("retainedStaff.noDocs")}
              compact
            />
          ) : (
            <View style={{ gap: 8 }}>
              {member.documents.map((doc) => (
                <View
                  key={doc.id}
                  style={[
                    styles.docRow,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-outline"
                    size={18}
                    color={c.textDim}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      numberOfLines={1}
                      style={{
                        fontFamily:
                          theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                        fontSize: rem(0.875),
                        fontWeight: "600",
                        color: c.text,
                      }}
                    >
                      {doc.title}
                    </AppText>
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.body || "DMSans_400Regular",
                        fontSize: rem(0.75),
                        color: c.textDim,
                        marginTop: 2,
                      }}
                    >
                      {doc.type} · {formatDate(doc.createdAt)}
                    </AppText>
                  </View>
                  <Pressable onPress={() => {}} hitSlop={8}>
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                        fontSize: rem(0.8),
                        fontWeight: "600",
                        color: c.orange,
                      }}
                    >
                      {t("retainedStaff.viewDoc")}
                    </AppText>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {tab === "notes" ? (
        <View style={{ marginTop: 16 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.5,
              marginBottom: 12,
            }}
          >
            {t("retainedStaff.hrNotes")}
          </AppText>
          {!member?.staffNotes || member.staffNotes.length === 0 ? (
            <EmptyState
              icon="book-outline"
              iconSize={32}
              text={t("retainedStaff.noNotes")}
              compact
            />
          ) : (
            <View style={{ gap: 8 }}>
              {member.staffNotes.map((note) => (
                <View
                  key={note.id}
                  style={[
                    styles.docRow,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.border,
                      alignItems: "flex-start",
                    },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                        fontSize: rem(0.875),
                        fontWeight: "600",
                        color: c.text,
                      }}
                    >
                      {note.title}
                    </AppText>
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.body || "DMSans_400Regular",
                        fontSize: rem(0.75),
                        color: c.textDim,
                        marginTop: 2,
                      }}
                    >
                      {note.body}
                    </AppText>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : null}

      {/* Modals */}
      <CreateCycleModal
        isOpen={showCycleModal}
        onClose={() => setShowCycleModal(false)}
        onSuccess={(cycle) => {
          loadMember({ silent: true });
          if (cycle?.id) goCycle(cycle.id);
        }}
        member={member}
      />
      <EditStaffModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updated) => {
          if (updated) setMember(updated);
        }}
        member={member}
      />
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteStaff}
        title={t("retainedStaff.deleteStaffTitle")}
        message={t("retainedStaff.deleteStaffMessage")}
        confirmLabel={t("retainedStaff.deleteStaffConfirm")}
        confirmVariant="danger"
      />
      <ConfirmModal
        isOpen={!!cycleToDelete}
        onClose={() => setCycleToDelete(null)}
        onConfirm={handleDeleteCycle}
        title={t("retainedStaff.deleteCycleTitle")}
        message={t("retainedStaff.deleteCycleMessage", {
          label: cycleToDelete?.label || "",
        })}
        confirmLabel={t("retainedStaff.deleteCycleConfirm")}
        confirmVariant="danger"
      />
    </AppScreen>
  );
}

function IconBtn({ icon, onPress, danger, theme }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: pressed
          ? danger
            ? theme.colors.red
            : theme.colors.orange
          : theme.colors.border,
        backgroundColor: pressed
          ? danger
            ? theme.colors.redDim
            : theme.colors.orangeDim
          : theme.colors.bgCard,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Ionicons
        name={icon}
        size={16}
        color={danger ? theme.colors.red : theme.colors.textDim}
      />
    </Pressable>
  );
}

function SmallBtn({ label, icon, onPress, disabled, theme, rem }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: pressed ? theme.colors.orange : theme.colors.border,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Ionicons name={icon} size={14} color={theme.colors.textDim} />
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.8),
          fontWeight: "600",
          color: theme.colors.textDim,
          marginLeft: 6,
        }}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
    marginBottom: 24,
  },
  profileHeaderWide: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarLg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarLgImg: { width: "100%", height: "100%" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
    borderBottomWidth: 1,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  cycleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
  },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
