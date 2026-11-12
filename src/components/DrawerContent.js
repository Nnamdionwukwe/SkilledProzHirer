// src/components/DrawerContent.js
//
// Verbatim port of HirerLayout.module.css sidebar + logout modal.
// The modal buttons now use a 5px radius for a subtle rounded look.
// Logo + user name use Syne (bold display) to match the app's header treatment.

import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAuthStore } from "../store/authStore";
import { useSupportStore } from "../store/supportStore";
import client from "../api/client";
import { getNotifications } from "../api/notifications";
import { rem, RADII } from "../constants/theme";

const ICON = {
  dashboard: "home-outline",
  bookings: "book-outline",
  postJob: "add-circle-outline",
  jobsManagement: "clipboard-outline",
  savedWorkers: "bookmark-outline",
  browseWorkers: "search-outline",
  browseByCategories: "construct-outline",
  paymentHistory: "card-outline",
  wallet: "wallet-outline",
  refundHistory: "cash-outline",
  disputes: "hammer-outline",
  retainedStaff: "people-outline",
  communityFeed: "newspaper-outline",
  myPosts: "create-outline",
  campaigns: "megaphone-outline",
  referrals: "person-add-outline",
  reviewsReceived: "star-outline",
  reviewsGiven: "pencil-outline",
  reports: "flag-outline",
  messages: "chatbubbles-outline",
  supportChat: "chatbox-ellipses-outline",
  supportHub: "help-circle-outline",
  notifications: "notifications-outline",
  verification: "shield-checkmark-outline",
  subscriptions: "diamond-outline",
  settings: "settings-outline",
  logout: "log-out-outline",
};

// `label` values are i18n keys — translated at render via t(label).
// The group names are keys as well — translated at render.
const NAV = [
  {
    group: "nav.groupOverview",
    items: [
      { label: "nav.dashboard", route: "Dashboard", icon: ICON.dashboard },
      { label: "nav.myBookings", route: "Bookings", icon: ICON.bookings },
      { label: "nav.postJob", route: "PostJob", icon: ICON.postJob },
      {
        label: "nav.jobsManagement",
        route: "JobsManagement",
        icon: ICON.jobsManagement,
      },
    ],
  },
  {
    group: "nav.groupWorkers",
    items: [
      {
        label: "nav.savedWorkers",
        route: "SavedWorkers",
        icon: ICON.savedWorkers,
      },
      {
        label: "nav.browseWorkers",
        route: "BrowseWorkers",
        icon: ICON.browseWorkers,
      },
      {
        label: "nav.browseByCategories",
        route: "BrowseByCategories",
        icon: ICON.browseByCategories,
      },
    ],
  },
  {
    group: "nav.groupFinances",
    items: [
      {
        label: "nav.paymentHistory",
        route: "PaymentHistory",
        icon: ICON.paymentHistory,
      },
      { label: "nav.wallet", route: "Wallet", icon: ICON.wallet },
      {
        label: "nav.refundHistory",
        route: "RefundHistory",
        icon: ICON.refundHistory,
      },
      { label: "nav.disputes", route: "Disputes", icon: ICON.disputes },
    ],
  },
  {
    group: "nav.groupPayroll",
    items: [
      {
        label: "nav.retainedStaff",
        route: "RetainedStaff",
        icon: ICON.retainedStaff,
      },
    ],
  },
  {
    group: "nav.groupCommunity",
    items: [
      {
        label: "nav.communityFeed",
        route: "CommunityFeed",
        icon: ICON.communityFeed,
      },
      { label: "nav.myPosts", route: "MyPosts", icon: ICON.myPosts },
      { label: "nav.campaigns", route: "Campaign", icon: ICON.campaigns },
      {
        label: "nav.referrals",
        route: "ReferralDashboard",
        icon: ICON.referrals,
      },
    ],
  },
  {
    group: "nav.groupReviewsReports",
    items: [
      {
        label: "nav.reviewsReceived",
        route: "ReviewsReceived",
        icon: ICON.reviewsReceived,
      },
      {
        label: "nav.reviewsGiven",
        route: "ReviewsGiven",
        icon: ICON.reviewsGiven,
      },
      { label: "nav.reports", route: "MyReports", icon: ICON.reports },
    ],
  },
  {
    group: "nav.groupAccountSupport",
    items: [
      {
        label: "nav.messages",
        route: "Messages",
        icon: ICON.messages,
        badge: "messages",
      },
      {
        label: "nav.liveSupportChat",
        route: "SupportChat",
        icon: ICON.supportChat,
        badge: "support",
      },
      {
        label: "nav.supportHub",
        route: "SupportHub",
        icon: ICON.supportHub,
        badge: "support",
      },
      {
        label: "nav.notifications",
        route: "Notifications",
        icon: ICON.notifications,
        badge: "notifications",
      },
      {
        label: "nav.verification",
        route: "Verification",
        icon: ICON.verification,
      },
      {
        label: "nav.subscriptions",
        route: "Subscriptions",
        icon: ICON.subscriptions,
      },
      { label: "nav.settings", route: "Settings", icon: ICON.settings },
    ],
  },
];

async function fetchNotificationCount() {
  try {
    const data = await getNotifications({ limit: 1 });
    return data?.unreadCount ?? 0;
  } catch {
    return 0;
  }
}

async function fetchMessageCount() {
  try {
    const { data } = await client.get("/messages/conversations");
    const convos = data?.data?.conversations ?? data?.conversations ?? [];
    return convos.reduce((s, c) => s + (c.unreadCount || 0), 0);
  } catch {
    return 0;
  }
}

export default function DrawerContent({ state }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const supportCount = useSupportStore((s) => s.unreadCount);
  const refreshSupport = useSupportStore((s) => s.refresh);
  const activeRouteName = state?.routes?.[state.index]?.name ?? "Dashboard";

  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const refreshBadges = async () => {
      const [n, m] = await Promise.all([
        fetchNotificationCount(),
        fetchMessageCount(),
      ]);
      if (cancelled) return;
      setNotificationCount(n);
      setMessageCount(m);
    };
    refreshBadges();
    refreshSupport();
    const id = setInterval(() => {
      refreshBadges();
      refreshSupport();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (route) => {
    navigation.navigate(route);
    navigation.closeDrawer?.();
  };

  const openLogoutModal = () => setShowLogoutModal(true);
  const closeLogoutModal = () => {
    if (!loggingOut) setShowLogoutModal(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success(t("auth.logoutSuccess") ?? "Signed out.");
    } catch {
      toast.error(t("toast.unknownError") ?? "Something went wrong.");
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const badgeFor = (key) => {
    if (key === "notifications") return notificationCount;
    if (key === "messages") return messageCount;
    if (key === "support") return supportCount;
    return 0;
  };

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: c.bgPanel, paddingBottom: insets.bottom },
      ]}
    >
      {/* Logo — Syne ExtraBold (bold display, matches other screen headers) */}
      <View
        style={[
          styles.logoBlock,
          {
            borderBottomColor: c.border,
            paddingTop: insets.top + rem(1.5),
          },
        ]}
      >
        <View style={styles.logoTextRow}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 20,
              letterSpacing: -0.5,
            }}
          >
            Skilled
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 20,
              letterSpacing: -0.5,
              color: c.orange,
            }}
          >
            Proz
          </AppText>
        </View>
        <AppText style={[styles.logoRole, { color: c.textMuted }]}>
          {t("nav.hirerPortal")}
        </AppText>
      </View>

      {/* User block */}
      <Pressable
        onPress={() => goTo("Profile")}
        style={[styles.userBlock, { borderBottomColor: c.border }]}
      >
        <View
          style={[
            styles.userAvatar,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.userAvatarImg} />
          ) : (
            <AppText style={[styles.userAvatarText, { color: c.orange }]}>
              {initials || "H"}
            </AppText>
          )}
        </View>
        <View style={styles.userInfo}>
          <AppText
            style={[styles.userName, { color: c.text }]}
            numberOfLines={1}
          >
            {user?.firstName} {user?.lastName}
          </AppText>
          <View style={[styles.userBadge, { backgroundColor: c.greenDim }]}>
            <View style={[styles.userBadgeDot, { backgroundColor: c.green }]} />
            <AppText style={[styles.userBadgeText, { color: c.green }]}>
              {t("common.hirer")}
            </AppText>
          </View>
        </View>
      </Pressable>

      {/* Nav */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NAV.map((group) => (
          <View key={group.group} style={styles.navGroup}>
            <AppText style={[styles.groupLabel, { color: c.textMuted }]}>
              {t(group.group)}
            </AppText>

            {group.items.map((item) => {
              const active = activeRouteName === item.route;
              const count = item.badge ? badgeFor(item.badge) : 0;

              return (
                <Pressable
                  key={item.route}
                  onPress={() => goTo(item.route)}
                  style={({ pressed }) => [
                    styles.navItem,
                    active && { backgroundColor: c.orangeDim },
                    pressed &&
                      !active && { backgroundColor: "rgba(255,255,255,0.04)" },
                  ]}
                >
                  {active && (
                    <View
                      style={[styles.activeBar, { backgroundColor: c.orange }]}
                    />
                  )}
                  <Ionicons
                    name={item.icon}
                    size={rem(0.9375)}
                    color={active ? c.orange : c.textDim}
                    style={styles.navIcon}
                  />
                  <AppText
                    style={[
                      styles.navLabel,
                      {
                        color: active ? c.orange : c.textDim,
                        fontWeight: active ? "600" : "500",
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {t(item.label)}
                  </AppText>

                  {count > 0 && (
                    <View
                      style={[styles.navBadge, { backgroundColor: c.orange }]}
                    >
                      <AppText style={[styles.navBadgeText, { color: c.bg }]}>
                        {count > 99 ? "99+" : count}
                      </AppText>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Footer */}
      <View
        style={[
          styles.footer,
          { borderTopColor: c.border, backgroundColor: c.bgPanel },
        ]}
      >
        <Pressable
          onPress={openLogoutModal}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { backgroundColor: c.redDim },
          ]}
        >
          <Ionicons
            name={ICON.logout}
            size={rem(0.9375)}
            color={c.textMuted}
            style={styles.navIcon}
          />
          <AppText style={[styles.logoutText, { color: c.textMuted }]}>
            {t("nav.logout")}
          </AppText>
        </Pressable>
      </View>

      {/* ─── Logout modal ─────────────────────────────────────────────── */}
      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeLogoutModal}
      >
        <View style={styles.modalOverlay}>
          <BlurView
            intensity={20}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "rgba(0,0,0,0.6)" },
            ]}
            onPress={closeLogoutModal}
          />
          <View
            style={[
              styles.modalBox,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.modalTitle, { color: c.text }]}>
              {t("drawer.logoutTitle")}
            </AppText>
            <AppText style={[styles.modalMessage, { color: c.textDim }]}>
              {t("drawer.logoutMessage")}
            </AppText>

            <View style={styles.modalActions}>
              {/* Cancel — 5px radius, thin border, transparent fill */}
              <Pressable
                onPress={closeLogoutModal}
                disabled={loggingOut}
                style={({ pressed }) => [
                  styles.modalCancelBtn,
                  {
                    borderColor: c.border,
                    backgroundColor: pressed
                      ? (c.bgHover ?? "transparent")
                      : "transparent",
                  },
                ]}
              >
                <AppText style={[styles.modalBtnLabel, { color: c.textDim }]}>
                  {t("common.cancel")}
                </AppText>
              </Pressable>

              {/* Log out — 5px radius, solid red fill */}
              <Pressable
                onPress={handleLogout}
                disabled={loggingOut}
                style={({ pressed }) => [
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: pressed ? (c.redHover ?? c.red) : c.red,
                    opacity: loggingOut ? 0.6 : 1,
                  },
                ]}
              >
                <AppText style={[styles.modalBtnLabel, { color: "#fff" }]}>
                  {loggingOut
                    ? t("drawer.loggingOut")
                    : t("drawer.logoutConfirm")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Logo block — Syne 800 (bold display, matches all screen headers)
  logoBlock: {
    paddingHorizontal: rem(1.5),
    paddingBottom: rem(1.125),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoTextRow: { flexDirection: "row" },
  logoText: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: rem(1.375),
    fontWeight: "800",
    letterSpacing: rem(1.375) * -0.04,
    lineHeight: rem(1.375) * 1.2,
  },
  logoRole: {
    fontFamily: "DMSans_700Bold",
    fontSize: rem(0.5625),
    fontWeight: "700",
    letterSpacing: rem(0.5625) * 0.16,
    textTransform: "uppercase",
    lineHeight: rem(0.5625) * 1.3,
    marginTop: rem(3 / 14),
  },

  // User block
  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(0.75),
    paddingVertical: rem(1),
    paddingHorizontal: rem(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userAvatar: {
    width: rem(40 / 14),
    height: rem(40 / 14),
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  userAvatarImg: { width: "100%", height: "100%" },
  userAvatarText: {
    fontFamily: "Syne_700Bold",
    fontSize: rem(0.8125),
    fontWeight: "700",
  },
  userInfo: { flex: 1, minWidth: 0 },
  // ⬇ Name now uses Syne_700Bold (bold header family) like other screen titles
  userName: {
    fontFamily: "Syne_700Bold",
    fontSize: rem(0.9375),
    fontWeight: "700",
    lineHeight: rem(0.9375) * 1.3,
    marginBottom: rem(3 / 14),
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: rem(7 / 14),
    paddingVertical: rem(2 / 14),
    borderRadius: 999,
  },
  userBadgeDot: {
    width: rem(4 / 14),
    height: rem(4 / 14),
    borderRadius: 2,
    marginRight: rem(4 / 14),
  },
  userBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: rem(0.5625),
    fontWeight: "700",
    letterSpacing: rem(0.5625) * 0.06,
    lineHeight: rem(0.5625) * 1.3,
  },

  // Nav
  navScroll: { flex: 1 },
  navScrollContent: {
    paddingVertical: rem(1),
    paddingHorizontal: rem(0.75),
  },
  navGroup: { marginBottom: rem(1.75) },
  groupLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: rem(0.5625),
    fontWeight: "700",
    letterSpacing: rem(0.5625) * 0.18,
    textTransform: "uppercase",
    lineHeight: rem(0.5625) * 1.3,
    paddingHorizontal: rem(0.75),
    marginBottom: rem(0.375),
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(0.75),
    paddingVertical: rem(0.5625),
    paddingHorizontal: rem(0.75),
    borderRadius: RADII.base,
    position: "relative",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: "20%",
    height: "60%",
    width: 2.5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  navIcon: { width: rem(18 / 14), textAlign: "center" },
  navLabel: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: rem(0.875),
    lineHeight: rem(0.875) * 1.3,
  },
  navBadge: {
    minWidth: rem(18 / 14),
    paddingHorizontal: rem(6 / 14),
    paddingVertical: rem(2 / 14),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: rem(0.5625),
    fontWeight: "800",
    lineHeight: rem(0.5625) * 1.3,
  },

  // Footer
  footer: {
    paddingVertical: rem(0.875),
    paddingHorizontal: rem(0.75),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(0.75),
    paddingVertical: rem(0.5625),
    paddingHorizontal: rem(0.75),
    borderRadius: RADII.base,
  },
  logoutText: {
    fontFamily: "DMSans_500Medium",
    fontSize: rem(0.875),
    fontWeight: "500",
    lineHeight: rem(0.875) * 1.3,
  },

  // ─── Modal ──────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: rem(1),
  },
  modalBox: {
    width: "100%",
    maxWidth: 420,
    borderRadius: RADII.modal,
    borderWidth: 1,
    padding: rem(1.8),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 16,
  },
  modalTitle: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: rem(1.25),
    fontWeight: "800",
    lineHeight: rem(1.25) * 1.2,
    marginBottom: rem(0.5),
  },
  modalMessage: {
    fontFamily: "DMSans_400Regular",
    fontSize: rem(0.95),
    lineHeight: rem(0.95) * 1.6,
    marginBottom: rem(1.5),
  },
  modalActions: {
    flexDirection: "row",
    gap: rem(0.75),
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: rem(0.7),
    paddingHorizontal: rem(1),
    borderRadius: 5,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: rem(0.7),
    paddingHorizontal: rem(1),
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: rem(0.9),
    lineHeight: rem(0.9) * 1.3,
    fontWeight: "700",
  },
});
