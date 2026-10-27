// src/screens/main/NotificationsScreen.js
// Endpoint: GET /notifications  |  PATCH /notifications/:id/read
//           PATCH /notifications/read-all  |  DELETE /notifications/clear-all
//
// Changes in this pass:
//   · Replaced all emoji with Ionicons (react-icons analog)
//   · Reduced oversized font sizes (page title, type icon, badge)
//   · Added shimmer skeleton on first load
// Behavior, API, tabs, modals, i18n keys unchanged.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Animated,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import ConfirmModal from "../../components/ConfirmModal";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../api/notifications";

// ── Time ago ──────────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Notification type → Ionicons name + color ─────────────────────────────────
// React-icons replacements (app uses @expo/vector-icons Ionicons throughout).
// Icon size stays 20 — visually balanced with the row's text block.
function typeIcon(type) {
  const map = {
    BOOKING_ACCEPTED: { name: "checkmark-circle", color: "#22c55e" },
    BOOKING_CANCELLED: { name: "close-circle", color: "#ef4444" },
    BOOKING_COMPLETED: { name: "trophy", color: "#f97316" },
    BOOKING_IN_PROGRESS: { name: "construct", color: "#818cf8" },
    PAYMENT_RECEIVED: { name: "card", color: "#22c55e" },
    PAYMENT_HELD: { name: "lock-closed", color: "#f97316" },
    DISPUTE_RAISED: { name: "warning", color: "#f87171" },
    DISPUTE_RESOLVED: { name: "shield-checkmark", color: "#22c55e" },
    POST_COMMENT: { name: "chatbubble-ellipses", color: "#818cf8" },
    POST_REACTION: { name: "thumbs-up", color: "#f97316" },
    POST_REPOST: { name: "repeat", color: "#818cf8" },
    NEW_LOGIN: { name: "shield", color: "#f97316" },
    INSURANCE_PURCHASED: { name: "shield-checkmark", color: "#22c55e" },
    WITHDRAWAL_REQUEST: { name: "cash", color: "#f97316" },
    BANK_TRANSFER_PROOF: { name: "business", color: "#818cf8" },
    CRYPTO_TX_SUBMITTED: { name: "logo-bitcoin", color: "#f97316" },
  };
  return map[type] ?? { name: "notifications", color: "#f97316" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Detail Modal
// ─────────────────────────────────────────────────────────────────────────────
function DetailModal({ notification, onClose, c, t, modalBg }) {
  if (!notification) return null;

  const data = notification.data ?? {};
  const hasIp = !!data.ip || !!data.ipAddress;
  const hasDevice = !!data.device || !!data.userAgent;
  const extraKeys = Object.keys(data).filter(
    (k) => !["ip", "ipAddress", "device", "userAgent"].includes(k),
  );

  const ti = typeIcon(notification.type);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={d.backdrop} onPress={onClose}>
        <Pressable
          style={[d.modal, { backgroundColor: modalBg, borderColor: c.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={d.header}>
            <View style={d.headerLeft}>
              <View
                style={[d.typeIconWrap, { backgroundColor: `${ti.color}22` }]}
              >
                <Ionicons name={ti.name} size={20} color={ti.color} />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  {notification.title}
                </AppText>
                <AppText
                  variant="small"
                  style={{ color: c.textMuted, marginTop: 2 }}
                >
                  {timeAgo(notification.createdAt)}
                </AppText>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={[
                d.closeBtn,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <Ionicons name="close" size={16} color={c.text} />
            </Pressable>
          </View>

          <View style={[d.divider, { backgroundColor: c.border }]} />

          {/* Body */}
          <AppText
            variant="body"
            style={{ color: c.text, lineHeight: 22, marginBottom: 16 }}
          >
            {notification.body}
          </AppText>

          {/* Details table */}
          {(hasIp || hasDevice || extraKeys.length > 0) && (
            <View
              style={[
                d.detailsBox,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{
                  color: c.textMuted,
                  letterSpacing: 1,
                  marginBottom: 10,
                }}
              >
                {t("notifications.details")}
              </AppText>
              {hasIp && (
                <View style={[d.detailRow, { borderBottomColor: c.border }]}>
                  <AppText
                    variant="small"
                    style={{ color: c.textMuted, width: 72 }}
                  >
                    {t("notifications.ip")}
                  </AppText>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.text, flex: 1, textAlign: "right" }}
                  >
                    {data.ip ?? data.ipAddress}
                  </AppText>
                </View>
              )}
              {hasDevice && (
                <View style={[d.detailRow, { borderBottomColor: c.border }]}>
                  <AppText
                    variant="small"
                    style={{ color: c.textMuted, width: 72 }}
                  >
                    {t("notifications.device")}
                  </AppText>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.text, flex: 1, textAlign: "right" }}
                    numberOfLines={3}
                  >
                    {data.device ?? data.userAgent}
                  </AppText>
                </View>
              )}
              {extraKeys.slice(0, 4).map((key) => (
                <View
                  key={key}
                  style={[d.detailRow, { borderBottomColor: c.border }]}
                >
                  <AppText
                    variant="small"
                    style={{ color: c.textMuted, width: 80 }}
                  >
                    {key}
                  </AppText>
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.text, flex: 1, textAlign: "right" }}
                    numberOfLines={2}
                  >
                    {String(data[key])}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification row
// ─────────────────────────────────────────────────────────────────────────────
function NotifRow({ notif, onPress, onDelete, c }) {
  const unread = !notif.isRead;
  const ti = typeIcon(notif.type);

  return (
    <Pressable
      onPress={() => onPress(notif)}
      style={[
        n.row,
        {
          backgroundColor: c.bgCard,
          borderColor: unread ? c.orange : c.border,
          borderLeftColor: unread ? c.orange : c.border,
          borderLeftWidth: unread ? 3 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {unread && <View style={[n.dot, { backgroundColor: c.orange }]} />}

      {/* Type icon */}
      <View style={[n.iconWrap, { backgroundColor: `${ti.color}22` }]}>
        <Ionicons name={ti.name} size={18} color={ti.color} />
      </View>

      {/* Content */}
      <View style={n.content}>
        <View style={n.titleRow}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, flex: 1, fontSize: 14 }}
            numberOfLines={1}
          >
            {notif.title}
          </AppText>
          <AppText
            variant="small"
            style={{ color: c.textMuted, marginLeft: 8, fontSize: 11 }}
          >
            {timeAgo(notif.createdAt)}
          </AppText>
        </View>
        <AppText
          variant="small"
          style={{
            color: c.textMuted,
            lineHeight: 17,
            marginTop: 2,
            fontSize: 12,
          }}
          numberOfLines={2}
        >
          {notif.body}
        </AppText>
      </View>

      {/* Delete */}
      <Pressable
        onPress={() => onDelete(notif.id)}
        style={n.deleteBtn}
        hitSlop={10}
      >
        <Ionicons name="close" size={14} color="#ef4444" />
      </Pressable>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton (shimmer) — matches DashboardSkeleton pattern
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonRow({ c }) {
  const anim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  return (
    <View
      style={[n.skRow, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}
      >
        <View
          style={{
            width: "40%",
            height: "100%",
            backgroundColor: "rgba(255,255,255,0.05)",
          }}
        />
      </Animated.View>
    </View>
  );
}

function Skeleton({ c }) {
  return (
    <View style={{ gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <SkeletonRow key={i} c={c} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();

  const [all, setAll] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("all");
  const [selected, setSelected] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications({ page: 1, limit: 50 });
      setAll(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setTotal(data.total ?? 0);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePress = async (notif) => {
    setSelected(notif);
    if (!notif.isRead) {
      try {
        await markAsRead(notif.id);
        setAll((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((u) => Math.max(0, u - 1));
      } catch {}
    }
  };

  const handleDelete = (id) => {
    setConfirm({
      title: t("notifications.deleteTitle"),
      message: t("notifications.deleteMessage"),
      confirmLabel: t("common.delete"),
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteNotification(id);
          setAll((prev) => prev.filter((n) => n.id !== id));
          setTotal((t) => t - 1);
        } catch {
          toast.error(t("toast.unknownError"));
        }
      },
    });
  };

  const handleMarkAll = async () => {
    try {
      await markAllAsRead();
      setAll((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success(t("notifications.markedAll"));
    } catch {
      toast.error(t("toast.unknownError"));
    }
  };

  const handleClearAll = () => {
    setConfirm({
      title: t("notifications.clearTitle"),
      message: t("notifications.clearMessage"),
      confirmLabel: t("notifications.clearAll"),
      destructive: true,
      onConfirm: async () => {
        try {
          await clearAllNotifications();
          setAll([]);
          setTotal(0);
          setUnreadCount(0);
          toast.success(t("notifications.cleared"));
        } catch {
          toast.error(t("toast.unknownError"));
        }
      },
    });
  };

  const visible = tab === "unread" ? all.filter((n) => !n.isRead) : all;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            <View style={styles.pageHeader}>
              {unreadCount > 0 && (
                <AppText
                  variant="small"
                  style={{ color: c.textMuted, marginTop: 4 }}
                >
                  {t("notifications.unreadCount", { count: unreadCount })}
                </AppText>
              )}
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleMarkAll}
                style={[
                  styles.actionBtn,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <Ionicons name="checkmark-done" size={16} color={c.text} />
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.text, marginLeft: 6 }}
                >
                  {t("notifications.markAllRead")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleClearAll}
                style={[
                  styles.actionBtn,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#ef4444", marginLeft: 6 }}
                >
                  {t("notifications.clearAll")}
                </AppText>
              </Pressable>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRow, { borderBottomColor: c.border }]}>
              {[
                { key: "all", label: t("notifications.all"), count: total },
                {
                  key: "unread",
                  label: t("notifications.unread"),
                  count: unreadCount,
                },
              ].map(({ key, label, count }) => {
                const active = tab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={[
                      styles.tabItem,
                      { borderBottomColor: active ? c.orange : "transparent" },
                    ]}
                  >
                    <AppText
                      variant="body"
                      weight={active ? "semibold" : "regular"}
                      style={{
                        color: active ? c.orange : c.textMuted,
                        fontSize: 14,
                      }}
                    >
                      {label}
                    </AppText>
                    {count > 0 && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: active ? c.orange : c.bgInput },
                        ]}
                      >
                        <AppText
                          style={{
                            fontSize: 10,
                            fontWeight: "700",
                            color: active ? "#fff" : c.textMuted,
                          }}
                        >
                          {count > 99 ? "99+" : count}
                        </AppText>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <NotifRow
            notif={item}
            onPress={handlePress}
            onDelete={handleDelete}
            c={c}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <Ionicons
                name="notifications-outline"
                size={36}
                color={c.textMuted}
              />
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12, fontSize: 14 }}
              >
                {t("notifications.empty")}
              </AppText>
              <AppText
                variant="small"
                style={{ color: c.textMuted, marginTop: 6, fontSize: 12 }}
              >
                {t("notifications.emptySub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      <DetailModal
        notification={selected}
        onClose={() => setSelected(null)}
        c={c}
        t={t}
        modalBg={th.mode === "dark" ? "#111118" : "#ffffff"}
      />

      <ConfirmModal
        visible={!!confirm}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        onConfirm={() => {
          confirm?.onConfirm?.();
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageHeader: { marginBottom: 12 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabRow: {
    flexDirection: "row",
    gap: 24,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
    minWidth: 20,
    alignItems: "center",
  },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});

const n = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  deleteBtn: { marginLeft: 10, padding: 4 },
  skRow: {
    height: 72,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
});

const d = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 12,
  },
  typeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  detailsBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
