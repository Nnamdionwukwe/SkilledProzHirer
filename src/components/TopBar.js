// src/components/TopBar.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useNavigationState,
  CommonActions,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "./AppText";
import Avatar from "./Avatar";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { FaCommentDots } from "../icons/fa";
import { rem } from "../constants/theme";
import { navigationRef } from "../navigation/navigationRef";
import { useUnread } from "../navigation/WorkerNavigator";

const SCREEN_FALLBACK = {
  Dashboard: { title: "Dashboard", subtitle: "Your work at a glance" },
  Bookings: { title: "My Bookings", subtitle: "Manage your bookings" },
  WorkerBookings: { title: "My Bookings", subtitle: "Jobs assigned to you" },
  WorkerJobs: { title: "Browse Jobs", subtitle: "Find your next opportunity" },
  WorkerProfile: { title: "My Profile", subtitle: "Your public profile" },
  WorkerEarnings: { title: "Earnings", subtitle: "Track your income" },
  WorkerWithdrawals: { title: "Wallet", subtitle: "Earnings & payouts" },
  WorkerApplications: {
    title: "Applications",
    subtitle: "Jobs you've applied to",
  },
  WorkerReviews: { title: "Reviews", subtitle: "Feedback from hirers" },
  WorkerPortfolio: { title: "Portfolio", subtitle: "Your work gallery" },
  WorkerCertifications: {
    title: "Certifications",
    subtitle: "Your trade certifications",
  },
  WorkerCategories: { title: "Categories", subtitle: "Your trade categories" },
  WorkerAvailability: {
    title: "Availability",
    subtitle: "Set your weekly schedule",
  },
  WorkerDisputes: { title: "Disputes", subtitle: "Active disputes" },
  WorkerVerification: { title: "Verification", subtitle: "Trust & Safety" },
  WorkerSubscriptions: { title: "Subscriptions", subtitle: "Plans & billing" },
  WorkerBoost: { title: "Boost Listing", subtitle: "Stand out in search" },
  CreateBooking: { title: "Create Booking", subtitle: "Book a worker" },
  BookingDetail: { title: "Booking Detail", subtitle: "Job details & actions" },
  PaymentHistory: {
    title: "Payment History",
    subtitle: "Your transaction history",
  },
  PostJob: { title: "Post a Job", subtitle: "Find the right worker" },
  JobsManagement: { title: "My Jobs", subtitle: "Manage your job listings" },
  JobDetail: { title: "Job Detail", subtitle: "Job information" },
  JobApplications: { title: "Applications", subtitle: "Workers who applied" },
  MyPosts: { title: "Community", subtitle: "Your posts & updates" },
  Disputes: { title: "Disputes", subtitle: "Active disputes" },
  SavedWorkers: {
    title: "Saved Workers",
    subtitle: "Workers you've bookmarked",
  },
  BrowseWorkers: {
    title: "Browse Workers",
    subtitle: "Find skilled professionals",
  },
  WorkerDetail: { title: "Worker Profile", subtitle: "View worker details" },
  BrowseByCategories: {
    title: "Browse By Categories",
    subtitle: "Search 500+ categories",
  },
  CategoryDetail: { title: "Category", subtitle: "Workers in this category" },
  HirerPublicProfile: {
    title: "Hirer Profile",
    subtitle: "View profile & open jobs",
  },
  WorkerJobDetail: { title: "Job Details", subtitle: "View & apply" },
  Messages: { title: "Messages", subtitle: "Your conversations" },
  Chat: { title: "Messages", subtitle: "Direct message" },
  ReviewsReceived: {
    title: "Reviews Received",
    subtitle: "Feedback from workers",
  },
  ReviewsGiven: { title: "Reviews Given", subtitle: "Feedback you've left" },
  CommunityFeed: { title: "Community", subtitle: "Posts & discussions" },
  Notifications: { title: "Notifications", subtitle: "View & manage alerts" },
  Verification: { title: "Verification", subtitle: "Trust & Safety" },
  Profile: { title: "My Profile", subtitle: "Manage your account" },
  Subscriptions: { title: "Subscriptions", subtitle: "Plans & billing" },
  FeaturedBoost: { title: "Boost Listing", subtitle: "Stand out in search" },
  Settings: { title: "Settings", subtitle: "Preferences & security" },
};

export default function TopBar({
  title: titleProp,
  subtitle: subtitleProp,
  unreadCount: propUnread = null,
  unreadMessages: propMessages = null,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  // Pull live counts from context (falls back to props if provided)
  let ctx = { unreadNotifs: 0, unreadMessages: 0 };
  try {
    ctx = useUnread() || ctx;
  } catch (e) {
    // If TopBar is used outside WorkerNavigator (e.g. Hirer), it falls back to props.
  }
  const unreadCount = propUnread ?? ctx.unreadNotifs ?? 0;
  const unreadMessages = propMessages ?? ctx.unreadMessages ?? 0;

  const routeName = useNavigationState(
    (state) => state?.routes?.[state.index]?.name,
  );
  const fallback = SCREEN_FALLBACK[routeName] ?? {};
  const title = titleProp ?? fallback.title ?? prettyTitle(routeName);
  const resolvedSub = subtitleProp ?? fallback.subtitle ?? null;

  // ── Smart hamburger ─────────────────────────────────────────────
  const handleMenu = () => {
    const parent = navigation.getParent();
    if (parent) {
      try {
        parent.openDrawer();
        return;
      } catch (e) {}
    }
    try {
      navigation.dispatch(CommonActions.navigate({ name: "WorkerHome" }));
      setTimeout(() => {
        try {
          navigationRef.dispatch({ type: "OPEN_DRAWER" });
        } catch (e3) {}
      }, 80);
    } catch (e) {}
  };

  // ── Role-aware navigation ───────────────────────────────────────
  // Worker Drawer screens (Notifications, Messages, WorkerProfile) live
  // nested inside WorkerHome. From a Stack screen we must go through
  // WorkerHome with the `screen` param so React Navigation can resolve
  // the child drawer's routes.
  const safeNavigate = (screen) => {
    if (user?.role === "WORKER") {
      try {
        navigation.navigate("WorkerHome", { screen });
        return;
      } catch (e1) {}
    }
    try {
      navigation.navigate(screen);
      return;
    } catch (e2) {}
    try {
      navigationRef.navigate(screen);
    } catch (e3) {}
  };

  const openNotifications = () => safeNavigate("Notifications");
  const openMessages = () => safeNavigate("Messages");
  const openProfile = () => {
    const target = user?.role === "WORKER" ? "WorkerProfile" : "Profile";
    safeNavigate(target);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.bgPanel,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Hamburger */}
        <Pressable
          onPress={handleMenu}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: theme.colors.bgCard,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="menu" size={18} color={theme.colors.textDim} />
        </Pressable>

        {/* Title */}
        <View style={{ flex: 1, marginLeft: rem(0.75) }}>
          <AppText
            numberOfLines={1}
            style={[styles.title, { color: theme.colors.text }]}
          >
            {title}
          </AppText>
          {resolvedSub ? (
            <AppText
              numberOfLines={1}
              style={[styles.sub, { color: theme.colors.textMuted }]}
            >
              {resolvedSub}
            </AppText>
          ) : null}
        </View>

        {/* Right cluster */}
        <View style={styles.rightCluster}>
          {/* Notifications bell */}
          <Pressable
            onPress={openNotifications}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: theme.colors.bgCard,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={theme.colors.textDim}
            />
            {unreadCount > 0 && (
              <View
                style={[
                  styles.bellBadge,
                  {
                    backgroundColor: theme.colors.orange,
                    borderColor: theme.colors.bgPanel,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 10,
                    fontWeight: "800",
                    color: "#000",
                    lineHeight: 11,
                    includeFontPadding: false,
                    textAlign: "center",
                  }}
                >
                  {unreadCount > 99 ? "99+" : String(unreadCount)}
                </AppText>
              </View>
            )}
          </Pressable>

          {/* Messages icon */}
          <Pressable
            onPress={openMessages}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: theme.colors.bgCard,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <FaCommentDots size={18} color={theme.colors.textDim} />
            {unreadMessages > 0 && (
              <View
                style={[
                  styles.bellBadge,
                  {
                    backgroundColor: theme.colors.orange,
                    borderColor: theme.colors.bg,
                  },
                ]}
              >
                <AppText style={[styles.bellBadgeText, { color: "#000" }]}>
                  {unreadMessages > 9 ? "9+" : String(unreadMessages)}
                </AppText>
              </View>
            )}
          </Pressable>

          {/* Avatar */}
          <Pressable
            onPress={openProfile}
            hitSlop={6}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <View
              style={[
                styles.avatarWrap,
                {
                  backgroundColor: theme.colors.orangeDim,
                  borderColor: theme.colors.orangeGlow,
                },
              ]}
            >
              <Avatar
                uri={user?.avatar}
                firstName={user?.firstName}
                lastName={user?.lastName}
                size={25}
              />
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function prettyTitle(route) {
  if (!route) return "";
  return route.replace(/([A-Z])/g, " $1").trim();
}

const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    height: rem(60 / 14),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rem(20 / 14),
    gap: rem(0.75),
  },
  title: {
    fontFamily: "Syne_700Bold",
    fontSize: rem(1),
    fontWeight: "700",
    lineHeight: rem(1) * 1.2,
  },
  sub: {
    fontSize: rem(0.6875),
    lineHeight: rem(0.6875) * 1.3,
  },
  iconBtn: {
    width: rem(34 / 14),
    height: rem(34 / 14),
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: rem(0.625),
  },
  bellBadge: {
    position: "absolute",
    top: rem(-6 / 14),
    right: rem(-6 / 14),
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  bellBadgeText: {
    fontSize: rem(0.625),
    fontWeight: "800",
    lineHeight: rem(0.625) * 1.1,
  },
  avatarWrap: {
    width: rem(28 / 14),
    height: rem(28 / 14),
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
