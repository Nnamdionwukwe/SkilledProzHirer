// src/screens/main/NotificationsScreen.js
// Endpoint: GET /notifications  |  PATCH /notifications/:id/read
//           PATCH /notifications/read-all  |  DELETE /notifications/clear-all
// Mirrors website: All/Unread tabs, mark-all-read, clear-all, detail modal.
// Full dark/light mode — text always clearly readable on both backgrounds.

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
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
} from "../../api/notifications"; // exported from reviews_notifications_api, rename as needed
import { Ionicons } from "@expo/vector-icons";

// ── Time ago ──────────────────────────────────────────────────────────────────
function timeAgo(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Notification type → emoji ─────────────────────────────────────────────────
function typeEmoji(type) {
  const map = {
    BOOKING_ACCEPTED: "✅",
    BOOKING_CANCELLED: "❌",
    BOOKING_COMPLETED: "🎉",
    BOOKING_IN_PROGRESS: "🔨",
    PAYMENT_RECEIVED: "💳",
    PAYMENT_HELD: "🔒",
    DISPUTE_RAISED: "⚠️",
    DISPUTE_RESOLVED: "⚖️",
    POST_COMMENT: "💬",
    POST_REACTION: "👍",
    POST_REPOST: "🔄",
    NEW_LOGIN: "🔐",
    INSURANCE_PURCHASED: "🛡️",
    WITHDRAWAL_REQUEST: "💸",
    BANK_TRANSFER_PROOF: "🏦",
    CRYPTO_TX_SUBMITTED: "₿",
  };
  return map[type] ?? "🔔";
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
              <AppText style={{ fontSize: 28, lineHeight: 34 }}>
                {typeEmoji(notification.type)}
              </AppText>
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
              <AppText style={{ color: c.text, fontSize: 16 }}>✕</AppText>
            </Pressable>
          </View>

          <View style={[d.divider, { backgroundColor: c.border }]} />

          {/* Body */}
          <AppText
            variant="body"
            style={{ color: c.text, lineHeight: 24, marginBottom: 16 }}
          >
            {notification.body}
          </AppText>

          {/* Details table — for login/security notifications */}
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
  const { theme: th } = useTheme();

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
      {/* Unread dot */}
      {unread && <View style={[n.dot, { backgroundColor: c.orange }]} />}

      {/* Icon */}
      <AppText style={n.emoji}>{typeEmoji(notif.type)}</AppText>
      {/* <Ionicons name="trash-outline" size={18} color={theme.colors.text} /> */}

      {/* Content */}
      <View style={n.content}>
        <View style={n.titleRow}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, flex: 1 }}
            numberOfLines={1}
          >
            {notif.title}
          </AppText>
          <AppText
            variant="small"
            style={{ color: c.textMuted, marginLeft: 8 }}
          >
            {timeAgo(notif.createdAt)}
          </AppText>
        </View>
        <AppText
          variant="small"
          style={{ color: c.textMuted, lineHeight: 18, marginTop: 2 }}
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
        <AppText style={{ color: "#ef4444", fontSize: 14 }}>✕</AppText>
      </Pressable>
    </Pressable>
  );
}

function Skeleton({ c }) {
  return (
    <View style={{ gap: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={[
            n.skRow,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
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
  const [tab, setTab] = useState("all"); // "all" | "unread"
  const [selected, setSelected] = useState(null); // detail modal
  const [confirm, setConfirm] = useState(null); // confirm modal
  const { theme } = useTheme();

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
            {/* Page header */}
            <View style={styles.pageHeader}>
              {unreadCount > 0 && (
                <AppText
                  variant="body"
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
                <AppText style={{ fontSize: 16 }}>✓</AppText>
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
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.text}
                />
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#ef4444", marginLeft: 6 }}
                >
                  {t("notifications.clearAll")}
                </AppText>
              </Pressable>
            </View>

            {/* Tabs: All | Unread */}
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
                      style={{ color: active ? c.orange : c.textMuted }}
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
                            fontSize: 11,
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
                size={40}
                color={theme.colors.text}
              />
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12 }}
              >
                {t("notifications.empty")}
              </AppText>
              <AppText
                variant="small"
                style={{ color: c.textMuted, marginTop: 6 }}
              >
                {t("notifications.emptySub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      {/* Detail modal */}
      <DetailModal
        notification={selected}
        onClose={() => setSelected(null)}
        c={c}
        t={t}
        modalBg={th.mode === "dark" ? "#111118" : "#ffffff"}
      />

      {/* Confirm modal */}
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
  pageHeader: { marginBottom: 16 },
  pageTitle: { fontSize: 30, fontWeight: "900", letterSpacing: -0.5 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
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
    paddingBottom: 12,
    borderBottomWidth: 2,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 20,
    minWidth: 22,
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
  emoji: { fontSize: 24, lineHeight: 44, marginRight: 12, marginTop: 2 },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center" },
  deleteBtn: { marginLeft: 10, padding: 4 },
  skRow: {
    height: 72,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
});

const d = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85 )", // was 0.7, bump it up
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
