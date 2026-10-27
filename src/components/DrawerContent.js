// src/components/DrawerContent.js
//
// Verbatim port of the website HirerLayout.jsx sidebar → RN drawer.
//
// Structure:
//   · Logo           "Skilled" (white) + "Proz" (orange) + "HIRER PORTAL"
//   · User block     avatar + name + green "● Hirer" chip → Profile
//   · Nav (scroll)   grouped exactly as the web NAV const
//   · Footer         "Log out" (red bg on press)
//
// Groups + order (from web HirerLayout.jsx):
//   OVERVIEW            Dashboard / My Bookings / Post a Job / Jobs Management
//   WORKERS             Saved Workers / Browse Workers / Browse By Categories
//   FINANCES            Payment History / My Wallet / Refund History / Disputes
//   PAYROLL             Retained Staffs
//   COMMUNITY           Community Feed / My Posts / Campaigns / Referrals
//   REVIEWS & REPORTS   Reviews Received / Reviews Given / Reports
//   ACCOUNT & SUPPORT   Messages / Live Support Chat / Support Hub /
//                       Notifications / Verification / Subscriptions / Settings
//
// Badges:
//   · notifications       GET /notifications (unreadCount)
//   · messages            GET /messages/conversations (sum unreadCount)
//   · support (both)      from useSupportStore — derives its count from
//                         /support/tickets + /support/chat/my
//
// Sizes (phone root 14px from global.css @media 480):
//   logo text      1.375rem  = 19.25   ·  weight 800, ls -0.04em
//   logo role      0.5625rem =  7.88   ·  weight 700, ls 0.16em, UPPER
//   user name      0.875rem  = 12.25   ·  weight 600
//   user badge     0.5625rem =  7.88   ·  weight 700
//   group label    0.5625rem =  7.88   ·  weight 700, ls 0.18em, UPPER
//   nav item       0.875rem  = 12.25   ·  weight 500 / 600 active
//   nav badge      0.5625rem =  7.88   ·  weight 800
//   logout         0.875rem  = 12.25   ·  weight 500

import React, { useEffect, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAuthStore } from "../store/authStore";
import { useSupportStore } from "../store/supportStore";
import client from "../api/client";
import { getNotifications } from "../api/notifications";

// ─── Icons — FaHome → home-outline, FaBook → book-outline, etc. ─────────────
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

// ─── NAV — verbatim order from web HirerLayout.jsx ─────────────────────────
const NAV = [
  {
    group: "OVERVIEW",
    items: [
      { label: "Dashboard", route: "Dashboard", icon: ICON.dashboard },
      { label: "My Bookings", route: "Bookings", icon: ICON.bookings },
      { label: "Post a Job", route: "PostJob", icon: ICON.postJob },
      {
        label: "Jobs Management",
        route: "JobsManagement",
        icon: ICON.jobsManagement,
      },
    ],
  },
  {
    group: "WORKERS",
    items: [
      {
        label: "Saved Workers",
        route: "SavedWorkers",
        icon: ICON.savedWorkers,
      },
      {
        label: "Browse Workers",
        route: "BrowseWorkers",
        icon: ICON.browseWorkers,
      },
      {
        label: "Browse By Categories",
        route: "BrowseByCategories",
        icon: ICON.browseByCategories,
      },
    ],
  },
  {
    group: "FINANCES",
    items: [
      {
        label: "Payment History",
        route: "PaymentHistory",
        icon: ICON.paymentHistory,
      },
      {
        label: "My Wallet",
        route: "Wallet",
        icon: ICON.wallet,
      },
      {
        label: "Refund History",
        route: "RefundHistory",
        icon: ICON.refundHistory,
      },
      { label: "Disputes", route: "Disputes", icon: ICON.disputes },
    ],
  },
  {
    group: "PAYROLL",
    items: [
      {
        label: "Retained Staffs",
        route: "RetainedStaffs",
        icon: ICON.retainedStaff,
      },
    ],
  },
  {
    group: "COMMUNITY",
    items: [
      {
        label: "Community Feed",
        route: "CommunityFeed",
        icon: ICON.communityFeed,
      },
      { label: "My Posts", route: "MyPosts", icon: ICON.myPosts },
      { label: "Campaigns", route: "Campaign", icon: ICON.campaigns },
      {
        label: "Referrals",
        route: "ReferralDashboard",
        icon: ICON.referrals,
      },
    ],
  },
  {
    group: "REVIEWS & REPORTS",
    items: [
      {
        label: "Reviews Received",
        route: "ReviewsReceived",
        icon: ICON.reviewsReceived,
      },
      {
        label: "Reviews Given",
        route: "ReviewsGiven",
        icon: ICON.reviewsGiven,
      },
      { label: "Reports", route: "MyReports", icon: ICON.reports },
    ],
  },
  {
    group: "ACCOUNT & SUPPORT",
    items: [
      {
        label: "Messages",
        route: "Messages",
        icon: ICON.messages,
        badge: "messages",
      },
      {
        label: "Live Support Chat",
        route: "SupportChat",
        icon: ICON.supportChat,
        badge: "support",
      },
      {
        label: "Support Hub",
        route: "SupportHub",
        icon: ICON.supportHub,
        badge: "support",
      },
      {
        label: "Notifications",
        route: "Notifications",
        icon: ICON.notifications,
        badge: "notifications",
      },
      {
        label: "Verification",
        route: "Verification",
        icon: ICON.verification,
      },
      {
        label: "Subscriptions",
        route: "Subscriptions",
        icon: ICON.subscriptions,
      },
      { label: "Settings", route: "Settings", icon: ICON.settings },
    ],
  },
];

// ─── Badge fetchers (notifications + messages) ─────────────────────────────
// Support count lives in useSupportStore — it does its own fetching
// because it depends on two endpoints (tickets + chat threads).
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
    return convos.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  } catch {
    return 0;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────
export default function DrawerContent({ state }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const c = theme.colors;

  // Support badge is a global store value — both Live Support Chat and
  // Support Hub read the same number, matching the website.
  const supportCount = useSupportStore((s) => s.unreadCount);
  const refreshSupport = useSupportStore((s) => s.refresh);

  const activeRouteName = state?.routes?.[state.index]?.name ?? "Dashboard";

  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

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

  const handleLogout = async () => {
    try {
      await logout();
      toast.success(t("auth.logoutSuccess") ?? "Signed out.");
    } catch {
      toast.error(t("toast.unknownError") ?? "Something went wrong.");
    }
  };

  const badgeFor = (key) => {
    if (key === "notifications") return notificationCount;
    if (key === "messages") return messageCount;
    if (key === "support") return supportCount;
    return 0;
  };

  const initials = `${user?.firstName?.[0] ?? ""}${
    user?.lastName?.[0] ?? ""
  }`.toUpperCase();

  return (
    <View style={[styles.root, { backgroundColor: c.bgPanel }]}>
      {/* ─── Logo ─────────────────────────────────────────────────────── */}
      <View style={[styles.logoBlock, { borderBottomColor: c.border }]}>
        <View style={styles.logoTextRow}>
          <AppText style={[styles.logoText, { color: c.text }]}>
            Skilled
          </AppText>
          <AppText style={[styles.logoText, { color: c.orange }]}>Proz</AppText>
        </View>
        <AppText style={[styles.logoRole, { color: c.textMuted }]}>
          Hirer Portal
        </AppText>
      </View>

      {/* ─── User block ───────────────────────────────────────────────── */}
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
              Hirer
            </AppText>
          </View>
        </View>
      </Pressable>

      {/* ─── Nav (scrollable) ─────────────────────────────────────────── */}
      <ScrollView
        style={styles.navScroll}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {NAV.map((group) => (
          <View key={group.group} style={styles.navGroup}>
            <AppText style={[styles.groupLabel, { color: c.textMuted }]}>
              {group.group}
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
                    size={15}
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
                    {item.label}
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

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && { backgroundColor: c.redDim },
          ]}
        >
          <Ionicons
            name={ICON.logout}
            size={15}
            color={c.textMuted}
            style={styles.navIcon}
          />
          <AppText style={[styles.logoutText, { color: c.textMuted }]}>
            Log out
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles — verbatim from HirerLayout.module.css at phone root 14px ───────
const styles = StyleSheet.create({
  root: { flex: 1 },

  // Logo block — padding 1.5rem 1.5rem 1.125rem
  logoBlock: {
    paddingTop: 21,
    paddingHorizontal: 21,
    paddingBottom: 15.75,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoTextRow: { flexDirection: "row" },
  // 1.375rem = 19.25, 800, ls -0.04em = -0.77
  logoText: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 19.25,
    lineHeight: 23,
    fontWeight: "800",
    letterSpacing: -0.77,
  },
  // 0.5625rem = 7.88, 700, ls 0.16em = 1.26, UPPER, mt 3
  logoRole: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7.88,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 1.26,
    textTransform: "uppercase",
    marginTop: 3,
  },

  // User block — padding 1rem 1.5rem, gap 0.75rem = 10.5
  userBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10.5,
    paddingVertical: 14,
    paddingHorizontal: 21,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  userAvatarImg: { width: "100%", height: "100%" },
  userAvatarText: {
    fontFamily: "Syne_700Bold",
    fontSize: 11.375,
    fontWeight: "700",
  },
  userInfo: { flex: 1, minWidth: 0 },
  userName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12.25,
    lineHeight: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  userBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginRight: 4,
  },
  userBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7.88,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 0.47,
  },

  // Nav scroll — padding 1rem 0.75rem = 14 / 10.5
  navScroll: { flex: 1 },
  navScrollContent: {
    paddingVertical: 14,
    paddingHorizontal: 10.5,
  },

  // Nav group — margin-bottom 1.75rem = 24.5
  navGroup: { marginBottom: 24.5 },
  groupLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7.88,
    lineHeight: 10,
    fontWeight: "700",
    letterSpacing: 1.42,
    textTransform: "uppercase",
    paddingHorizontal: 10.5,
    marginBottom: 5.25,
  },

  // Nav item — pad 7.875/10.5, gap 10.5, r 8
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10.5,
    paddingVertical: 7.875,
    paddingHorizontal: 10.5,
    borderRadius: 8,
    position: "relative",
  },
  // Active bar — 2.5px wide, 20%–80% height, orange
  activeBar: {
    position: "absolute",
    left: 0,
    top: "20%",
    height: "60%",
    width: 2.5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  navIcon: { width: 18, textAlign: "center" },
  navLabel: {
    flex: 1,
    fontFamily: "DMSans_500Medium",
    fontSize: 12.25,
    lineHeight: 16,
  },
  navBadge: {
    minWidth: 18,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  navBadgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 7.88,
    lineHeight: 10,
    fontWeight: "800",
  },

  // Footer — pad 12.25/10.5
  footer: {
    paddingVertical: 12.25,
    paddingHorizontal: 10.5,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10.5,
    paddingVertical: 7.875,
    paddingHorizontal: 10.5,
    borderRadius: 8,
  },
  logoutText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12.25,
    lineHeight: 16,
    fontWeight: "500",
  },
});
