// src/screens/main/MyReportsScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Verbatim mirror of the website's /reports/my page.
// Platform-adaptive modals + skeleton + i18n + support hub link.
//
// Modals:
//   • Detail    — bottom sheet (iOS native pageSheet, Android slide-up)
//   • Delete    — centered branded confirm modal (no native Alert)
//
// The "Report" CTA at the top has been removed — reports are filed from
// the entity being reported (user/job/post detail screens).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import AppScreen from "../../components/AppScreen";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM MODAL HELPER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SheetModal — platform-adaptive bottom sheet.
 *
 * iOS:     native pageSheet (drag handle, swipe-to-dismiss).
 * Android: full-screen slide-up sheet.
 *
 * NOTE ON LAYOUT:
 *   The Android branch uses `position: absolute` for the surface so it
 *   anchors to the bottom. Children must use NATURAL height, not flex:1,
 *   because the surface has no fixed height (only maxHeight). If you need
 *   to scroll, put the ScrollView INSIDE the child content with a fixed
 *   maxHeight on that content (each modal handles its own).
 */
function SheetModal({ visible, onClose, children }) {
  const isIOS = Platform.OS === "ios";
  const { theme: th } = useTheme();
  const c = th.colors;
  const insets = useSafeAreaInsets();

  if (isIOS) {
    return (
      <Modal
        visible={visible}
        animationType="default"
        presentationStyle="pageSheet"
        allowSwipeDismissal
        onRequestClose={onClose}
      >
        <View style={{ flex: 1, backgroundColor: c.bgPanel, paddingTop: 24 }}>
          {children}
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}
          onPress={onClose}
        >
          <Pressable
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "92%",
              backgroundColor: c.bgPanel,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
              paddingBottom: Math.max(insets.bottom, 12),
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                alignSelf: "center",
                marginTop: 10,
                marginBottom: 4,
                backgroundColor: c.border,
              }}
            />
            {/* IMPORTANT: NO flex:1 here — parent has no fixed height. */}
            {children}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: {
    labelKey: "reports.status.pending",
    iconName: "time-outline",
    cls: "yellow",
  },
  REVIEWING: {
    labelKey: "reports.status.reviewing",
    iconName: "search-outline",
    cls: "blue",
  },
  RESOLVED: {
    labelKey: "reports.status.resolved",
    iconName: "checkmark-circle",
    cls: "green",
  },
  DISMISSED: {
    labelKey: "reports.status.dismissed",
    iconName: "ban-outline",
    cls: "dim",
  },
};

const ACTION_META = {
  NO_ACTION: { labelKey: "reports.action.noAction", iconName: null },
  WARNING_ISSUED: {
    labelKey: "reports.action.warning",
    iconName: "warning-outline",
  },
  CONTENT_REMOVED: {
    labelKey: "reports.action.removed",
    iconName: "trash-outline",
  },
  USER_SUSPENDED: {
    labelKey: "reports.action.suspended",
    iconName: "lock-closed-outline",
  },
  USER_BANNED: { labelKey: "reports.action.banned", iconName: "ban-outline" },
};

const TYPE_META = {
  USER: { labelKey: "reports.type.user", iconName: "person-outline" },
  JOB_POST: { labelKey: "reports.type.job", iconName: "briefcase-outline" },
  POST: { labelKey: "reports.type.post", iconName: "create-outline" },
  REVIEW: { labelKey: "reports.type.review", iconName: "star-outline" },
  BOOKING: { labelKey: "reports.type.booking", iconName: "calendar-outline" },
  MESSAGE: { labelKey: "reports.type.message", iconName: "chatbubble-outline" },
};

const REASON_OPTIONS = [
  { value: "SPAM", labelKey: "reports.reason.spam" },
  { value: "FAKE_PROFILE", labelKey: "reports.reason.fakeProfile" },
  { value: "INAPPROPRIATE_CONTENT", labelKey: "reports.reason.inappropriate" },
  { value: "FRAUD", labelKey: "reports.reason.fraud" },
  { value: "HARASSMENT", labelKey: "reports.reason.harassment" },
  { value: "SCAM", labelKey: "reports.reason.scam" },
  { value: "MISLEADING_INFORMATION", labelKey: "reports.reason.misleading" },
  { value: "FAKE_REVIEWS", labelKey: "reports.reason.fakeReviews" },
  { value: "UNDERAGE_USER", labelKey: "reports.reason.underage" },
  { value: "HATE_SPEECH", labelKey: "reports.reason.hateSpeech" },
  { value: "OTHER", labelKey: "reports.reason.other" },
];

const STATUS_TABS = [
  { key: "ALL", labelKey: "reports.tabs.all" },
  { key: "PENDING", labelKey: "reports.tabs.pending" },
  { key: "REVIEWING", labelKey: "reports.tabs.reviewing" },
  { key: "RESOLVED", labelKey: "reports.tabs.resolved" },
  { key: "DISMISSED", labelKey: "reports.tabs.dismissed" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const timeAgo = (d, t) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}${t("reports.timeMin")}`;
  if (hours < 24) return `${hours}${t("reports.timeHour")}`;
  if (days < 30) return `${days}${t("reports.timeDay")}`;
  return fmtDate(d);
};

function statusColors(cls, c) {
  switch (cls) {
    case "yellow":
      return {
        color: "#eab308",
        bg: "rgba(234,179,8,0.12)",
        border: "rgba(234,179,8,0.25)",
      };
    case "blue":
      return {
        color: "#3b82f6",
        bg: "rgba(59,130,246,0.12)",
        border: "rgba(59,130,246,0.25)",
      };
    case "green":
      return {
        color: "#22c55e",
        bg: "rgba(34,197,94,0.12)",
        border: "rgba(34,197,94,0.25)",
      };
    case "dim":
    default:
      return { color: c.textMuted, bg: c.bgCard, border: c.border };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ height = 14, width = "100%", radius = 6, c, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  const bg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [c.bgCard, c.border],
  });
  return (
    <Animated.View
      style={[
        { height, width, borderRadius: radius, backgroundColor: bg },
        style,
      ]}
    />
  );
}

function PageSkeleton({ c }) {
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, padding: 16 }}>
      <Skeleton height={10} width={110} c={c} style={{ marginBottom: 8 }} />
      <Skeleton height={28} width="55%" c={c} style={{ marginBottom: 8 }} />
      <Skeleton height={13} width="90%" c={c} style={{ marginBottom: 4 }} />
      <Skeleton height={13} width="75%" c={c} style={{ marginBottom: 20 }} />
      <View
        style={{
          flexDirection: "row",
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {[1, 2, 3].map((i) => (
          <React.Fragment key={i}>
            {i > 1 && (
              <View
                style={{
                  width: StyleSheet.hairlineWidth,
                  backgroundColor: c.border,
                }}
              />
            )}
            <View
              style={{
                flex: 1,
                alignItems: "center",
                paddingVertical: 14,
                gap: 5,
              }}
            >
              <Skeleton height={16} width={16} c={c} radius={8} />
              <Skeleton height={18} width={28} c={c} />
              <Skeleton height={9} width={55} c={c} />
            </View>
          </React.Fragment>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          gap: 12,
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          borderLeftWidth: 3,
          borderLeftColor: c.orange,
          backgroundColor: c.bgPanel,
          marginBottom: 16,
        }}
      >
        <Skeleton height={16} width={16} c={c} radius={4} />
        <View style={{ flex: 1, gap: 4 }}>
          <Skeleton height={11} c={c} />
          <Skeleton height={11} width="85%" c={c} />
          <Skeleton height={11} width="60%" c={c} />
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 6, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} height={30} width={70} c={c} radius={20} />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgPanel,
            borderRadius: 16,
            padding: 16,
            marginBottom: 10,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
              }}
            >
              <Skeleton height={40} width={40} c={c} radius={10} />
              <View style={{ flex: 1, gap: 5 }}>
                <Skeleton height={13} width="45%" c={c} />
                <Skeleton height={10} width="30%" c={c} />
              </View>
            </View>
            <Skeleton height={22} width={90} c={c} radius={20} />
          </View>
          <Skeleton height={14} width="60%" c={c} style={{ marginBottom: 8 }} />
          <Skeleton height={11} c={c} style={{ marginBottom: 4 }} />
          <Skeleton
            height={11}
            width="70%"
            c={c}
            style={{ marginBottom: 14 }}
          />
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              paddingTop: 10,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: c.border,
            }}
          >
            <Skeleton height={10} width={50} c={c} />
            <Skeleton height={28} width={100} c={c} radius={8} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ status, t, c }) {
  const m = STATUS_META[status] || STATUS_META.DISMISSED;
  const col = statusColors(m.cls, c);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: col.bg,
        borderWidth: 1,
        borderColor: col.border,
        gap: 5,
      }}
    >
      <Ionicons name={m.iconName} size={12} color={col.color} />
      <AppText
        style={{ fontSize: 11, fontWeight: "700", color: col.color }}
        numberOfLines={1}
      >
        {t(m.labelKey)}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL DRAWER (bottom sheet)
// ─────────────────────────────────────────────────────────────────────────────
function DetailDrawer({ report, visible, onClose, onCancel, c, t }) {
  if (!report) return null;

  const typeMeta = TYPE_META[report.targetType] || {
    labelKey: null,
    iconName: "document-text-outline",
  };
  const statusMeta = STATUS_META[report.status] || STATUS_META.DISMISSED;
  const statusCol = statusColors(statusMeta.cls, c);
  const actionMeta = ACTION_META[report.actionTaken] || {
    labelKey: null,
    iconName: null,
  };
  const canCancel = report.status === "PENDING";
  const isDone = report.status === "RESOLVED" || report.status === "DISMISSED";
  const reasonLabel = REASON_OPTIONS.find(
    (r) => r.value === report.reason,
  )?.labelKey;

  const timelineSteps = [
    {
      label: t("reports.detail.timelineSubmitted"),
      date: fmtDate(report.createdAt),
      done: true,
      active: false,
    },
    {
      label: t("reports.detail.timelineReview"),
      date: "—",
      done: report.status !== "PENDING",
      active: report.status === "REVIEWING",
    },
    {
      label:
        report.status === "RESOLVED"
          ? t("reports.status.resolved")
          : report.status === "DISMISSED"
            ? t("reports.status.dismissed")
            : t("reports.detail.timelineAwaiting"),
      date: isDone ? fmtDate(report.resolvedAt) : "—",
      done: isDone,
      active: false,
    },
  ];

  return (
    <SheetModal visible={visible} onClose={onClose}>
      <View style={{ paddingHorizontal: 20, maxHeight: 720 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingBottom: 14,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: c.border,
            marginBottom: 16,
            paddingTop: 8,
          }}
        >
          <View>
            <AppText
              style={{
                fontSize: 10,
                color: c.orange,
                fontWeight: "700",
                letterSpacing: 0.9,
                marginBottom: 2,
                textTransform: "uppercase",
              }}
            >
              {t("reports.detail.title")}
            </AppText>
            <AppText
              weight="displayBlack"
              style={{ fontSize: 18, color: c.text, letterSpacing: 0.5 }}
            >
              {report.ref}
            </AppText>
          </View>
          <Pressable
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={16} color={c.textMuted} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Status hero */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 14,
              borderRadius: 14,
              borderWidth: 1,
              backgroundColor: statusCol.bg,
              borderColor: statusCol.border,
              marginBottom: 16,
            }}
          >
            <Ionicons
              name={statusMeta.iconName}
              size={26}
              color={statusCol.color}
            />
            <View style={{ flex: 1 }}>
              <AppText
                weight="semibold"
                style={{ fontSize: 14, color: c.text }}
              >
                {t(statusMeta.labelKey)}
              </AppText>
              <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
                {isDone
                  ? `${t("reports.status.resolved")} ${fmtDate(report.resolvedAt)}`
                  : `${t("reports.detail.submitted")} ${timeAgo(report.createdAt, t)}`}
              </AppText>
            </View>
          </View>

          {/* Detail grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {[
              {
                label: t("reports.detail.reported"),
                value: typeMeta.labelKey
                  ? t(typeMeta.labelKey)
                  : report.targetType,
                iconName: typeMeta.iconName,
              },
              {
                label: t("reports.detail.reason"),
                value: reasonLabel ? t(reasonLabel) : report.reason,
              },
              {
                label: t("reports.detail.submitted"),
                value: fmtDate(report.createdAt),
              },
              {
                label: t("reports.detail.targetId"),
                value: report.targetId?.slice(-8).toUpperCase(),
                mono: true,
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  width: "47%",
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                }}
              >
                <AppText
                  style={{
                    fontSize: 9,
                    color: c.textMuted,
                    fontWeight: "700",
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  {item.label}
                </AppText>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                >
                  {item.iconName && (
                    <Ionicons name={item.iconName} size={12} color={c.text} />
                  )}
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: c.text,
                      flex: 1,
                      fontFamily: item.mono
                        ? Platform.select({
                            ios: "Courier",
                            android: "monospace",
                          })
                        : undefined,
                    }}
                    numberOfLines={2}
                  >
                    {item.value}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          {report.description ? (
            <View
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                marginBottom: 16,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  color: c.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("reports.detail.yourDescription")}
              </AppText>
              <AppText variant="body" tone="dim" style={{ lineHeight: 20 }}>
                {report.description}
              </AppText>
            </View>
          ) : null}

          {isDone ? (
            <View
              style={{
                padding: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: "rgba(34,197,94,0.25)",
                backgroundColor: "rgba(34,197,94,0.10)",
                marginBottom: 16,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  color: "#22c55e",
                  fontWeight: "700",
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("reports.detail.outcome")}
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 4,
                }}
              >
                {actionMeta.iconName && (
                  <Ionicons
                    name={actionMeta.iconName}
                    size={14}
                    color={c.text}
                  />
                )}
                <AppText
                  weight="semibold"
                  style={{ color: c.text, fontSize: 13, flex: 1 }}
                >
                  {actionMeta.labelKey
                    ? t(actionMeta.labelKey)
                    : report.actionTaken || "—"}
                </AppText>
              </View>
              {report.adminNote ? (
                <AppText
                  variant="small"
                  tone="dim"
                  style={{ fontStyle: "italic", lineHeight: 18 }}
                >
                  "{report.adminNote}"
                </AppText>
              ) : null}
            </View>
          ) : null}

          {/* Timeline */}
          <View style={{ marginBottom: 16 }}>
            <AppText
              style={{
                fontSize: 10,
                color: c.textMuted,
                fontWeight: "700",
                letterSpacing: 0.9,
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              {t("reports.detail.timeline")}
            </AppText>
            {timelineSteps.map((step, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 10,
                  borderBottomWidth:
                    i < timelineSteps.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: step.done
                      ? "#22c55e"
                      : step.active
                        ? "#3b82f6"
                        : c.border,
                    flexShrink: 0,
                  }}
                />
                <AppText variant="body" tone="dim" style={{ flex: 1 }}>
                  {step.label}
                </AppText>
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  {step.date}
                </AppText>
              </View>
            ))}
          </View>

          {canCancel ? (
            <Pressable
              onPress={() => {
                onClose();
                onCancel(report);
              }}
              style={{
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.30)",
                backgroundColor: "rgba(239,68,68,0.08)",
              }}
            >
              <Ionicons name="trash-outline" size={14} color="#ef4444" />
              <AppText
                weight="semibold"
                style={{ color: "#ef4444", fontSize: 13 }}
              >
                {t("reports.detail.cancelBtn")}
              </AppText>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
    </SheetModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL (branded, centered)
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM MODAL (Bottom Sheet — themed)
// ─────────────────────────────────────────────────────────────────────────────
function DeleteConfirmModal({
  report,
  visible,
  onClose,
  onSuccess,
  c, // ← theme colors passed in
  toast,
  t,
}) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await client.delete(`/reports/${report.id}`);
      toast.success(t("reports.cancel.success"));
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || t("reports.cancel.failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!report) return null;

  const reasonLabel = REASON_OPTIONS.find(
    (r) => r.value === report.reason,
  )?.labelKey;

  // Theme-aware destructive color (matches the red used elsewhere in the app)
  const dangerColor = c.red || "#ef4444";
  const dangerBg = c.redDim || "rgba(239,68,68,0.12)";

  return (
    <SheetModal visible={visible} onClose={loading ? undefined : onClose}>
      <View
        style={{ paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 }}
      >
        {/* Icon bubble — themed */}
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: dangerBg,
            alignItems: "center",
            justifyContent: "center",
            alignSelf: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name="trash-outline" size={28} color={dangerColor} />
        </View>

        {/* Title — themed text */}
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 20,
            color: c.text,
            textAlign: "center",
            marginBottom: 8,
          }}
        >
          {t("reports.cancel.title")}
        </AppText>

        {/* Body — themed dim text */}
        <AppText
          variant="small"
          tone="dim"
          style={{ textAlign: "center", lineHeight: 20, marginBottom: 24 }}
        >
          {t("reports.cancel.ref")}{" "}
          <AppText weight="semibold" style={{ color: c.text }}>
            {report.ref}
          </AppText>
          {"\n"}
          {reasonLabel ? t(reasonLabel) : report.reason}
          {"\n\n"}
          <AppText style={{ color: dangerColor, fontWeight: "600" }}>
            {t("reports.cancel.irreversible")}
          </AppText>
        </AppText>

        {/* Actions — stacked, themed */}
        <View style={{ gap: 12 }}>
          {/* Confirm (destructive) */}
          <Pressable
            onPress={handleCancel}
            disabled={loading}
            style={{
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: dangerColor,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <AppText
                weight="semibold"
                style={{ color: "#fff", fontSize: 15 }}
              >
                {t("reports.cancel.confirm")}
              </AppText>
            )}
          </Pressable>

          {/* Cancel — themed ghost button */}
          <Pressable
            onPress={onClose}
            disabled={loading}
            style={{
              paddingVertical: 15,
              borderRadius: 12,
              alignItems: "center",
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <AppText
              weight="semibold"
              style={{ color: c.textDim, fontSize: 15 }}
            >
              {t("reports.cancel.keep")}
            </AppText>
          </Pressable>
        </View>
      </View>
    </SheetModal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function MyReportsScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const navigation = useNavigation();
  const c = th.colors;
  const modalBg = th.effectiveMode === "dark" ? "#111118" : "#ffffff";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewTarget, setViewTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const LIMIT = 10;

  const load = useCallback(
    async (pg = 1, status = tab, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (status !== "ALL") params.status = status;
        const res = await client.get("/reports/my", { params });
        const d = res.data.data;
        setReports(d.reports || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPage(pg);
      } catch {
        toast.error(t("reports.loadFailed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    load(1, tab);
  }, [tab]);

  function handleTabChange(key) {
    setTab(key);
    setPage(1);
  }

  function openSupportHub() {
    // Support hub screens are nested inside the drawer/stack, so routeNames
    // at the root level won't contain them. Try the known candidates first;
    // React Navigation will simply be a no-op if the route doesn't exist,
    // so we guard with `canNavigate`-style usage via a try/catch on navigate.
    const candidates = ["WorkerSupportHub", "SupportHub", "Support", "Help"];

    for (const name of candidates) {
      try {
        // `navigate` throws if the action can't be handled anywhere in the tree.
        navigation.navigate(name);
        return;
      } catch {
        // try next candidate
      }
    }

    // Nothing matched — show a toast instead of dumping to the website.
    toast.error(t("reports.supportUnavailable"));
  }

  const pending = reports.filter((r) => r.status === "PENDING").length;
  const reviewing = reports.filter((r) => r.status === "REVIEWING").length;
  const resolved = reports.filter((r) => r.status === "RESOLVED").length;

  if (loading) {
    return <PageSkeleton c={c} />;
  }

  return (
    <>
      <AppScreen
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(1, tab, true)}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
      >
        {/* ── Page header ── */}
        <View style={{ marginBottom: 16 }}>
          <AppText
            style={{
              fontSize: 10,
              color: c.orange,
              fontWeight: "700",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            {t("reports.trust")}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginTop: 2,
              flexWrap: "wrap",
            }}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 15, color: c.text, lineHeight: 32 }}
            >
              {t("reports.title")}
            </AppText>
            {total > 0 && (
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: c.textMuted,
                  }}
                >
                  {total}
                </AppText>
              </View>
            )}
          </View>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginTop: 4, lineHeight: 17 }}
          >
            {t("reports.subtitle")}
          </AppText>
        </View>

        {/* ── Summary strip ── */}
        {reports.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgPanel,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {[
              {
                iconName: "time-outline",
                value: pending,
                labelKey: "reports.tabs.pending",
              },
              {
                iconName: "search-outline",
                value: reviewing,
                labelKey: "reports.summary.reviewing",
              },
              {
                iconName: "checkmark-circle",
                value: resolved,
                labelKey: "reports.tabs.resolved",
              },
            ].map((item, i) => (
              <React.Fragment key={item.labelKey}>
                {i > 0 && (
                  <View
                    style={{
                      width: StyleSheet.hairlineWidth,
                      backgroundColor: c.border,
                    }}
                  />
                )}
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 14,
                    gap: 3,
                  }}
                >
                  <Ionicons name={item.iconName} size={16} color={c.textDim} />
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 18, color: c.text, lineHeight: 22 }}
                  >
                    {item.value}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 9,
                      color: c.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                    numberOfLines={1}
                  >
                    {t(item.labelKey)}
                  </AppText>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* ── Info banner with support hub link ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            padding: 13,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            borderLeftWidth: 3,
            borderLeftColor: c.orange,
            backgroundColor: c.bgPanel,
            marginBottom: 16,
          }}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color={c.orange}
            style={{ marginTop: 1 }}
          />
          <AppText
            variant="small"
            tone="dim"
            style={{ flex: 1, lineHeight: 17 }}
          >
            {t("reports.infoBannerPrefix")}{" "}
            <AppText
              variant="small"
              weight="semibold"
              style={{
                color: c.orange,
                textDecorationLine: "underline",
              }}
              onPress={openSupportHub}
              suppressHighlighting
            >
              {t("reports.contactSupport")}
            </AppText>
            {t("reports.infoBannerSuffix")}
          </AppText>
        </View>

        {/* ── Filter tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 16 }}
          contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
        >
          {STATUS_TABS.map((tabItem) => {
            const active = tab === tabItem.key;
            return (
              <Pressable
                key={tabItem.key}
                onPress={() => handleTabChange(tabItem.key)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1,
                  backgroundColor: active
                    ? "rgba(249,115,22,0.12)"
                    : "transparent",
                  borderColor: active ? "rgba(249,115,22,0.45)" : c.border,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                  }}
                >
                  {t(tabItem.labelKey)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Cards ── */}
        {reports.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 60, gap: 10 }}>
            <Ionicons
              name="flag-outline"
              size={40}
              color={c.textMuted}
              style={{ opacity: 0.4 }}
            />
            <AppText weight="semibold" style={{ fontSize: 15, color: c.text }}>
              {tab === "ALL"
                ? t("reports.empty.titleAll")
                : t("reports.empty.titleFiltered", {
                    status: t(
                      STATUS_TABS.find((st) => st.key === tab)?.labelKey ||
                        "reports.tabs.all",
                    ).toLowerCase(),
                  })}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", maxWidth: 260, lineHeight: 17 }}
            >
              {tab === "ALL"
                ? t("reports.empty.subAll")
                : t("reports.empty.subFiltered")}
            </AppText>
            {tab !== "ALL" ? (
              <Pressable
                onPress={() => handleTabChange("ALL")}
                style={{
                  marginTop: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
                >
                  {t("reports.empty.viewAll")}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          reports.map((r) => (
            <Pressable
              key={r.id}
              onPress={() => setViewTarget(r)}
              style={{
                backgroundColor: c.bgPanel,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: c.border,
                padding: 16,
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    flex: 1,
                    marginRight: 10,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.bgCard,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons
                      name={
                        (
                          TYPE_META[r.targetType] || {
                            iconName: "document-text-outline",
                          }
                        ).iconName
                      }
                      size={18}
                      color={c.orange}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      weight="semibold"
                      style={{
                        fontSize: 12,
                        color: c.text,
                        letterSpacing: 0.4,
                      }}
                      numberOfLines={1}
                    >
                      {r.ref}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {TYPE_META[r.targetType]
                        ? t(TYPE_META[r.targetType].labelKey)
                        : r.targetType}
                    </AppText>
                  </View>
                </View>
                <StatusBadge status={r.status} t={t} c={c} />
              </View>
              <View style={{ paddingLeft: 50, marginBottom: 8 }}>
                <AppText
                  weight="semibold"
                  style={{ fontSize: 13, color: c.text, marginBottom: 3 }}
                >
                  {REASON_OPTIONS.find((ro) => ro.value === r.reason)?.labelKey
                    ? t(
                        REASON_OPTIONS.find((ro) => ro.value === r.reason)
                          .labelKey,
                      )
                    : r.reason}
                </AppText>
                {r.description ? (
                  <AppText
                    variant="small"
                    tone="dim"
                    numberOfLines={2}
                    style={{ lineHeight: 17 }}
                  >
                    {r.description}
                  </AppText>
                ) : null}
              </View>
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
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  {timeAgo(r.createdAt, t)}
                </AppText>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  {r.status === "PENDING" && (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setDeleteTarget(r);
                      }}
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.bgCard,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={13}
                        color={c.textMuted}
                      />
                    </Pressable>
                  )}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      paddingHorizontal: 11,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.bgCard,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: c.textDim,
                      }}
                    >
                      {t("reports.card.viewDetails")}
                    </AppText>
                    <Ionicons
                      name="arrow-forward"
                      size={11}
                      color={c.textMuted}
                    />
                  </View>
                </View>
              </View>
            </Pressable>
          ))
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginTop: 8,
            }}
          >
            <Pressable
              disabled={page <= 1}
              onPress={() => load(page - 1)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: page <= 1 ? 0.35 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Ionicons name="arrow-back" size={12} color={c.textDim} />
              <AppText
                style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
              >
                {t("common.prev")}
              </AppText>
            </Pressable>
            <AppText style={{ fontSize: 12, color: c.textMuted }}>
              {t("reports.pageOf", { page, pages })}
            </AppText>
            <Pressable
              disabled={page >= pages}
              onPress={() => load(page + 1)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: page >= pages ? 0.35 : 1,
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
              }}
            >
              <AppText
                style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
              >
                {t("common.next")}
              </AppText>
              <Ionicons name="arrow-forward" size={12} color={c.textDim} />
            </Pressable>
          </View>
        )}
      </AppScreen>

      {/* Detail drawer — only mounted when there's a target */}
      {viewTarget && (
        <DetailDrawer
          report={viewTarget}
          visible
          onClose={() => setViewTarget(null)}
          onCancel={(r) => {
            setViewTarget(null);
            setDeleteTarget(r);
          }}
          c={c}
          t={t}
        />
      )}

      {/* Delete confirm — branded centered modal */}
      <DeleteConfirmModal
        report={deleteTarget}
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSuccess={() => load(page, tab)}
        c={c}
        modalBg={modalBg}
        toast={toast}
        t={t}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED FIELD STYLES
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 90,
    marginBottom: 4,
  },
});
