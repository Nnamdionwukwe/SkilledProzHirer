// src/screens/main/RetainedStaffCycleDetailScreen.js
//
// Verbatim port of src/pages/hirer/retained-staff/HirerCycleDetail.jsx
// + HirerCycleDetail.module.css.
//
// Note: RN has no useSearchParams. We read `route.params.payment` for
// the "success" flag (set by PayCycleModal navigation).

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import EmptyState from "../../components/EmptyState";
import PayCycleModal from "../../components/RetainedStaff/PayCycleModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

const STATUS_META = (t) => ({
  AWAITING_PAYMENT: {
    labelKey: "retainedStaff.cycleStatusAwaiting",
    color: "yellow",
    icon: "time-outline",
  },
  HELD: {
    labelKey: "retainedStaff.cycleStatusHeld",
    color: "orange",
    icon: "cash-outline",
  },
  PARTIALLY_RELEASED: {
    labelKey: "retainedStaff.cycleStatusPartial",
    color: "orange",
    icon: "send-outline",
  },
  RELEASED: {
    labelKey: "retainedStaff.cycleStatusReleased",
    color: "green",
    icon: "checkmark-circle-outline",
  },
  CANCELLED: {
    labelKey: "retainedStaff.cycleStatusCancelled",
    color: "red",
    icon: "close-outline",
  },
  FAILED: {
    labelKey: "retainedStaff.cycleStatusFailed",
    color: "red",
    icon: "alert-circle-outline",
  },
});

export default function RetainedStaffCycleDetailScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  const { id: memberId, cycleId, payment } = route.params || {};

  const [cycle, setCycle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [releaseAmount, setReleaseAmount] = useState("");
  const [releaseNote, setReleaseNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  const loadCycle = useCallback(
    async (opts = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const res = await retainedStaffApi.getCycle(memberId, cycleId);
        setCycle(res.data?.data?.cycle || null);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || t("retainedStaff.cycleLoadFailed"),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [memberId, cycleId, toast, t],
  );

  useEffect(() => {
    loadCycle();
  }, [loadCycle]);

  useEffect(() => {
    if (payment === "success") {
      setSuccessMessage(t("retainedStaff.paymentHeld"));
    } else if (payment === "failed") {
      setError(t("retainedStaff.paymentFailed"));
    }
  }, [payment, t]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCycle({ silent: true });
  };

  const paymentObj = cycle?.booking?.payments?.[0];
  const releases = paymentObj?.releases || [];
  const workerPayout = Number(paymentObj?.workerPayout) || 0;
  const releasedAmount = Number(paymentObj?.releasedAmount) || 0;
  const remaining = Math.max(0, workerPayout - releasedAmount);
  const fullyReleased = remaining === 0 && releasedAmount > 0;
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;

  const handleRelease = async () => {
    setError("");
    const amount = parseFloat(releaseAmount);
    if (!amount || amount <= 0) {
      setError(t("retainedStaff.releaseAmountRequired"));
      return;
    }
    if (amount > remaining) {
      setError(
        t("retainedStaff.releaseAmountExceeds", {
          amount: formatMoney(remaining, cycle.currency),
        }),
      );
      return;
    }
    setActionLoading(true);
    try {
      await retainedStaffApi.releaseCycle(cycleId, {
        amount,
        note: releaseNote.trim() || undefined,
      });
      toast.success(t("retainedStaff.releaseSuccess"));
      setReleaseAmount("");
      setReleaseNote("");
      loadCycle({ silent: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || t("retainedStaff.releaseFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError(t("retainedStaff.cancelReasonRequired"));
      return;
    }
    setActionLoading(true);
    try {
      await retainedStaffApi.cancelCycle(cycleId, cancelReason.trim());
      toast.success(t("retainedStaff.cycleCancelled"));
      setShowCancel(false);
      loadCycle({ silent: true });
    } catch (err) {
      const msg =
        err?.response?.data?.message || t("retainedStaff.cancelFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const goBack = () => navigation.navigate("RetainedStaffDetail", { memberId });

  if (loading) {
    return (
      <AppScreen scroll={false} contentContainerStyle={{ padding: 20 }}>
        <View style={{ gap: 16 }}>
          <View
            style={{
              height: 20,
              width: "30%",
              backgroundColor: c.bgInput,
              borderRadius: 4,
            }}
          />
          <View
            style={{
              height: 100,
              backgroundColor: c.bgPanel,
              borderRadius: 12,
            }}
          />
          <View
            style={{
              height: 140,
              backgroundColor: c.bgPanel,
              borderRadius: 12,
            }}
          />
        </View>
      </AppScreen>
    );
  }

  if (!cycle) {
    return (
      <AppScreen scroll={false}>
        <EmptyState
          icon="alert-circle-outline"
          iconSize={48}
          title={t("retainedStaff.cycleNotFound")}
          text={t("retainedStaff.cycleNotFoundSub")}
        />
      </AppScreen>
    );
  }

  const metaFn = STATUS_META(t);
  const meta = metaFn[cycle.status] || metaFn.AWAITING_PAYMENT;
  const statusColor = {
    green: c.green,
    orange: c.orange,
    yellow: "#fbbf24",
    red: c.red,
  }[meta.color];

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

      {successMessage ? (
        <View
          style={{
            backgroundColor: c.greenDim,
            borderRadius: 8,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Ionicons name="checkmark-circle" size={18} color={c.green} />
          <AppText
            style={{
              fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
              fontSize: rem(0.875),
              fontWeight: "600",
              color: c.green,
              flex: 1,
            }}
          >
            {successMessage}
          </AppText>
        </View>
      ) : null}

      {error ? (
        <View
          style={{
            backgroundColor: c.redDim,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.3)",
            borderRadius: 8,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <Ionicons name="alert-circle-outline" size={16} color={c.red} />
          <AppText
            style={{
              fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
              fontSize: rem(0.85),
              fontWeight: "600",
              color: c.red,
              flex: 1,
            }}
          >
            {error}
          </AppText>
          <Pressable onPress={() => setError("")} hitSlop={8}>
            <Ionicons name="close" size={16} color={c.red} />
          </Pressable>
        </View>
      ) : null}

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <View style={{ flex: 1 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 13,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {cycle.label || t("retainedStaff.payrollCycleDefault")}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.875),
              color: c.textDim,
              marginTop: 2,
            }}
          >
            {cycle.member?.jobTitle} · {cycle.member?.worker?.firstName}{" "}
            {cycle.member?.worker?.lastName}
          </AppText>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: `${statusColor}22`,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
          }}
        >
          <Ionicons name={meta.icon} size={12} color={statusColor} />
          <AppText
            style={{
              fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
              fontSize: rem(0.5),
              fontWeight: "800",
              letterSpacing: 0.06 * rem(0.65),
              textTransform: "uppercase",
              color: statusColor,
            }}
          >
            {t(meta.labelKey)}
          </AppText>
        </View>
      </View>

      {/* Summary card */}
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.summaryGrid}>
          <SummaryItem
            label={t("retainedStaff.period")}
            value={`${formatDate(cycle.periodStart)} — ${formatDate(
              cycle.periodEnd,
            )}`}
            theme={theme}
            rem={rem}
          />
          <SummaryItem
            label={t("retainedStaff.payDateLabel")}
            value={formatDate(cycle.payDate)}
            theme={theme}
            rem={rem}
          />
          <SummaryItem
            label={t("retainedStaff.type")}
            value={String(cycle.type || "").replace("_", " ")}
            theme={theme}
            rem={rem}
          />
          <SummaryItem
            label={t("retainedStaff.currency")}
            value={cycle.currency}
            theme={theme}
            rem={rem}
          />
        </View>

        <View style={{ gap: 10, marginTop: 16 }}>
          <BreakRow
            label={t("retainedStaff.baseAmountShort")}
            value={formatMoney(cycle.baseAmount, cycle.currency)}
            theme={theme}
            rem={rem}
          />
          {cycle.bonusAmount > 0 ? (
            <BreakRow
              label={t("retainedStaff.bonusShort")}
              value={`+ ${formatMoney(cycle.bonusAmount, cycle.currency)}`}
              theme={theme}
              rem={rem}
            />
          ) : null}
          {cycle.deductionAmount > 0 ? (
            <BreakRow
              label={t("retainedStaff.deductionsShort")}
              value={`− ${formatMoney(cycle.deductionAmount, cycle.currency)}`}
              theme={theme}
              rem={rem}
            />
          ) : null}
          <BreakRow
            label={t("retainedStaff.platformFee")}
            value={`− ${formatMoney(cycle.platformFee, cycle.currency)}`}
            theme={theme}
            rem={rem}
          />
          <View style={[styles.breakTotal, { borderTopColor: c.border }]}>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 10,
                letterSpacing: -0.5,
              }}
            >
              {t("retainedStaff.workerReceives")}
            </AppText>
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 11,
                letterSpacing: -0.5,
                color: c.orange,
              }}
            >
              {formatMoney(cycle.workerPayout, cycle.currency)}
            </AppText>
          </View>
        </View>
      </View>

      {/* Pay action */}
      {cycle.status === "AWAITING_PAYMENT" ? (
        <View
          style={[
            styles.actionCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <View style={[styles.actionIcon, { backgroundColor: c.orangeDim }]}>
              <Ionicons name="cash-outline" size={20} color={c.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{
                  fontFamily: theme.fonts?.display || "Syne_700Bold",
                  fontSize: rem(1.05),
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                {t("retainedStaff.readyToFund")}
              </AppText>
              <AppText
                style={{
                  fontFamily: theme.fonts?.body || "DMSans_400Regular",
                  fontSize: rem(0.85),
                  lineHeight: rem(0.85) * 1.5,
                  color: c.textDim,
                  marginTop: 4,
                }}
              >
                {t("retainedStaff.readyToFundDesc", {
                  amount: formatMoney(cycle.netAmount, cycle.currency),
                })}
              </AppText>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setShowPayModal(true)}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? c.orangeHover : c.orange,
                  flex: 1,
                  justifyContent: "center",
                },
              ]}
            >
              <Ionicons name="cash-outline" size={16} color="#fff" />
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(0.875),
                  fontWeight: "700",
                  color: "#fff",
                  marginLeft: 6,
                }}
              >
                {t("retainedStaff.payNowBtn")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setShowCancel(true)}
              style={({ pressed }) => [
                styles.ghostBtn,
                {
                  borderColor: pressed ? c.borderHover : c.border,
                  flex: 1,
                  justifyContent: "center",
                },
              ]}
            >
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.875),
                  fontWeight: "600",
                  color: c.textDim,
                }}
              >
                {t("retainedStaff.cancelCycleBtn")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Release funds */}
      {["HELD", "PARTIALLY_RELEASED"].includes(cycle.status) &&
      !fullyReleased ? (
        <View
          style={[
            styles.actionCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
            <View style={[styles.actionIcon, { backgroundColor: c.orangeDim }]}>
              <Ionicons name="send-outline" size={20} color={c.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{
                  fontFamily: theme.fonts?.display || "Syne_700Bold",
                  fontSize: rem(1.05),
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                {t("retainedStaff.releaseFunds")}
              </AppText>
              <AppText
                style={{
                  fontFamily: theme.fonts?.body || "DMSans_400Regular",
                  fontSize: rem(0.85),
                  lineHeight: rem(0.85) * 1.5,
                  color: c.textDim,
                  marginTop: 4,
                }}
              >
                {t("retainedStaff.releaseFundsDesc", {
                  released: formatMoney(releasedAmount, cycle.currency),
                  total: formatMoney(workerPayout, cycle.currency),
                  remaining: formatMoney(remaining, cycle.currency),
                })}
              </AppText>
            </View>
          </View>
          <View style={{ gap: 12 }}>
            <View>
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.75),
                  fontWeight: "600",
                  color: c.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.05 * rem(0.75),
                  marginBottom: 6,
                }}
              >
                {t("retainedStaff.amountToRelease")}
              </AppText>
              <View
                style={[
                  styles.amountInputWrap,
                  {
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.amountPrefix,
                    {
                      backgroundColor: c.bgCard,
                      borderRightColor: c.border,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                      fontSize: rem(0.75),
                      fontWeight: "700",
                      color: c.textDim,
                      textTransform: "uppercase",
                    }}
                  >
                    {cycle.currency}
                  </AppText>
                </View>
                <TextInput
                  value={releaseAmount}
                  onChangeText={setReleaseAmount}
                  placeholder="0.00"
                  placeholderTextColor={c.textMuted}
                  keyboardType="decimal-pad"
                  style={{
                    flex: 1,
                    color: c.text,
                    fontFamily: theme.fonts?.body || "DMSans_400Regular",
                    fontSize: rem(0.9),
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                  }}
                />
              </View>
              <AppText
                style={{
                  fontFamily: theme.fonts?.body || "DMSans_400Regular",
                  fontSize: rem(0.75),
                  color: c.textMuted,
                  marginTop: 4,
                }}
              >
                {t("retainedStaff.availableToRelease", {
                  amount: formatMoney(remaining, cycle.currency),
                })}
              </AppText>
            </View>
            <View>
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.75),
                  fontWeight: "600",
                  color: c.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.05 * rem(0.75),
                  marginBottom: 6,
                }}
              >
                {t("retainedStaff.releaseNote")}
              </AppText>
              <TextInput
                value={releaseNote}
                onChangeText={setReleaseNote}
                placeholder={t("retainedStaff.releaseNotePlaceholder")}
                placeholderTextColor={c.textMuted}
                style={{
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: c.text,
                  fontFamily: theme.fonts?.body || "DMSans_400Regular",
                  fontSize: rem(0.9),
                }}
              />
            </View>
            <Pressable
              onPress={handleRelease}
              disabled={actionLoading}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? c.orangeHover : c.orange,
                  opacity: actionLoading ? 0.6 : 1,
                  alignSelf: "flex-start",
                },
              ]}
            >
              <Ionicons name="send-outline" size={16} color="#fff" />
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(0.875),
                  fontWeight: "700",
                  color: "#fff",
                  marginLeft: 6,
                }}
              >
                {actionLoading
                  ? t("retainedStaff.releasing")
                  : t("retainedStaff.releaseFundsBtn")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* Fully released */}
      {fullyReleased ? (
        <View
          style={[
            styles.actionCard,
            {
              backgroundColor: c.greenDim,
              borderColor: "rgba(34,197,94,0.3)",
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            },
          ]}
        >
          <Ionicons name="checkmark-circle" size={24} color={c.green} />
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontFamily: theme.fonts?.display || "Syne_700Bold",
                fontSize: rem(1.05),
                fontWeight: "700",
                color: c.text,
              }}
            >
              {t("retainedStaff.fullyReleasedTitle")}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.85),
                lineHeight: rem(0.85) * 1.5,
                color: c.textDim,
                marginTop: 2,
              }}
            >
              {t("retainedStaff.fullyReleasedDesc")}
            </AppText>
          </View>
        </View>
      ) : null}

      {/* Release history */}
      {releases.length > 0 ? (
        <View
          style={[
            styles.card,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontFamily: theme.fonts?.display || "Syne_700Bold",
              fontSize: rem(1),
              fontWeight: "700",
              color: c.text,
              marginBottom: 12,
            }}
          >
            {t("retainedStaff.releaseHistoryTitle", {
              count: releases.length,
            })}
          </AppText>
          <View
            style={{
              height: 8,
              backgroundColor: c.bgInput,
              borderRadius: 4,
              overflow: "hidden",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${releasedPct}%`,
                backgroundColor: c.orange,
                borderRadius: 4,
              }}
            />
          </View>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.8),
              color: c.textDim,
              marginBottom: 16,
            }}
          >
            {t("retainedStaff.progressLabel", {
              pct: releasedPct,
              released: formatMoney(releasedAmount, cycle.currency),
              total: formatMoney(workerPayout, cycle.currency),
            })}
          </AppText>
          <View style={{ gap: 10 }}>
            {releases.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.releaseRow,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.releaseAvatar,
                    { backgroundColor: c.orangeDim },
                  ]}
                >
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                      fontSize: rem(0.8),
                      fontWeight: "700",
                      color: c.orange,
                    }}
                  >
                    {(r.releasedBy?.firstName?.[0] || "H").toUpperCase()}
                  </AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{
                      fontFamily:
                        theme.fonts?.displayBlack || "Syne_800ExtraBold",
                      fontSize: rem(0.95),
                      fontWeight: "800",
                      color: c.text,
                    }}
                  >
                    {formatMoney(r.amount, r.currency || cycle.currency)}
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.body || "DMSans_400Regular",
                      fontSize: rem(0.72),
                      color: c.textMuted,
                      marginTop: 2,
                    }}
                  >
                    {r.releasedBy?.firstName || "Hirer"} ·{" "}
                    {formatDate(r.createdAt)}
                  </AppText>
                  {r.note ? (
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.body || "DMSans_400Regular",
                        fontSize: rem(0.78),
                        fontStyle: "italic",
                        color: c.textDim,
                        marginTop: 4,
                      }}
                    >
                      "{r.note}"
                    </AppText>
                  ) : null}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.body || "DMSans_400Regular",
                      fontSize: rem(0.7),
                      color: c.textMuted,
                    }}
                  >
                    {t("retainedStaff.remainingLabel")}
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                      fontSize: rem(0.75),
                      fontWeight: "700",
                      color: c.textDim,
                    }}
                  >
                    {formatMoney(r.remainingAfter, cycle.currency)}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Cancel box */}
      {showCancel ? (
        <View
          style={{
            backgroundColor: c.redDim,
            borderColor: "rgba(239,68,68,0.3)",
            borderWidth: 1,
            borderRadius: 14,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <AppText
            style={{
              fontFamily: theme.fonts?.display || "Syne_700Bold",
              fontSize: rem(0.95),
              fontWeight: "700",
              color: c.red,
              marginBottom: 6,
            }}
          >
            {t("retainedStaff.cancelCycleTitle")}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.85),
              lineHeight: rem(0.85) * 1.5,
              color: c.textDim,
              marginBottom: 12,
            }}
          >
            {t("retainedStaff.cancelCycleDesc")}
          </AppText>
          <TextInput
            value={cancelReason}
            onChangeText={setCancelReason}
            placeholder={t("retainedStaff.cancelReasonPlaceholder")}
            placeholderTextColor={c.textMuted}
            multiline
            style={{
              backgroundColor: c.bgInput,
              borderColor: "rgba(239,68,68,0.3)",
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: c.text,
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.85),
              minHeight: 60,
              textAlignVertical: "top",
            }}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            <Pressable
              onPress={handleCancel}
              disabled={actionLoading}
              style={({ pressed }) => ({
                backgroundColor: c.red,
                opacity: pressed ? 0.85 : actionLoading ? 0.6 : 1,
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderRadius: 8,
                flex: 1,
                alignItems: "center",
              })}
            >
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(0.85),
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                {actionLoading
                  ? t("retainedStaff.cancelling")
                  : t("retainedStaff.confirmCancelBtn")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                setShowCancel(false);
                setCancelReason("");
              }}
              style={({ pressed }) => [
                styles.ghostBtn,
                {
                  borderColor: pressed ? c.borderHover : c.border,
                  flex: 1,
                  alignItems: "center",
                },
              ]}
            >
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                  fontSize: rem(0.85),
                  fontWeight: "600",
                  color: c.textDim,
                }}
              >
                {t("retainedStaff.keepCycle")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {cycle.member ? (
        <PayCycleModal
          isOpen={showPayModal}
          onClose={() => setShowPayModal(false)}
          cycle={cycle}
          member={cycle.member}
        />
      ) : null}
    </AppScreen>
  );
}

function SummaryItem({ label, value, theme, rem }) {
  return (
    <View style={{ flex: 1, minWidth: 140 }}>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
          fontSize: rem(0.7),
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.06 * rem(0.7),
          color: theme.colors.textMuted,
          marginBottom: 2,
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.9),
          fontWeight: "600",
          color: theme.colors.text,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function BreakRow({ label, value, theme, rem }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <AppText
        style={{
          fontFamily: theme.fonts?.body || "DMSans_400Regular",
          fontSize: rem(0.875),
          color: theme.colors.textDim,
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.875),
          fontWeight: "600",
          color: theme.colors.text,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  breakTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  actionCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  amountInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  amountPrefix: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRightWidth: 1,
  },
  releaseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  releaseAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
