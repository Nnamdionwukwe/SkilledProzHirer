// src/components/TopBar.js
// Shared between Hirer and Worker navigators.
// Props:
//   title      – screen title (translated string from navigator)
//   subtitle   – screen subtitle (optional)
//   showBack   – true = back arrow ←, false/omitted = hamburger ☰

import React, { useEffect, useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "./AppText";
import Avatar from "./Avatar";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { hirerApi } from "../api/hirer";
import client from "../api/client";

// ─── English fallback map (used when navigator doesn't pass title prop) ───────
// These are intentionally plain strings — TopBar is not translated itself;
// translating title/subtitle is the navigator's responsibility.
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
  showBack,
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  // Fallback: derive title from route name if no prop passed
  const routeName = useNavigationState(
    (state) => state?.routes?.[state.index]?.name,
  );
  const fallback = SCREEN_FALLBACK[routeName] ?? {};
  const title = titleProp ?? fallback.title ?? prettyTitle(routeName);
  const resolvedSub = subtitleProp ?? fallback.subtitle ?? null;

  // Role-aware notification polling — 30 s
  useEffect(() => {
    let cancelled = false;
    let timer;
    const fetchUnread = async () => {
      try {
        let count = 0;
        if (user?.role === "WORKER") {
          const res = await client.get("/workers/dashboard/notifications", {
            params: { limit: 1, page: 1 },
          });
          count = res.data.data?.unreadCount ?? 0;
        } else {
          const data = await hirerApi.getNotifications();
          count = data?.unread ?? 0;
        }
        if (!cancelled) setUnread(count);
      } catch {
        /* silent */
      }
    };
    fetchUnread();
    timer = setInterval(fetchUnread, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user?.role]);

  // ── Left button ─────────────────────────────────────────────────────────────
  const handleLeft = () => {
    if (showBack) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.getParent()?.openDrawer?.();
    } else {
      if (navigation.openDrawer) navigation.openDrawer();
      else navigation.getParent()?.openDrawer?.();
    }
  };

  const openNotifications = () => navigation.navigate("Notifications");
  const openProfile = () =>
    user?.role === "WORKER"
      ? navigation.navigate("WorkerProfile")
      : navigation.navigate("Profile");

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.bg,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        {/* Left button: ← back OR ☰ hamburger */}
        <Pressable
          onPress={handleLeft}
          hitSlop={10}
          style={({ pressed }) => [
            styles.iconBtn,
            {
              backgroundColor: theme.colors.bgPanel,
              borderColor: theme.colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name={showBack ? "arrow-back" : "menu"}
            size={20}
            color={theme.colors.text}
          />
        </Pressable>

        {/* Title + optional subtitle */}
        <View style={{ flex: 1, marginLeft: 4 }}>
          <AppText variant="title" weight="bold" numberOfLines={1}>
            {title}
          </AppText>
          {resolvedSub ? (
            <AppText variant="small" tone="dim" numberOfLines={1}>
              {resolvedSub}
            </AppText>
          ) : null}
        </View>

        {/* Notification bell + avatar */}
        <View style={styles.rightCluster}>
          <Pressable
            onPress={openNotifications}
            hitSlop={6}
            style={({ pressed }) => [
              styles.iconBtn,
              {
                backgroundColor: theme.colors.bgPanel,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={theme.colors.text}
            />
            {unread > 0 && (
              <View
                style={[styles.badge, { backgroundColor: theme.colors.orange }]}
              >
                <AppText
                  weight="bold"
                  style={{ color: "#0f0f1a", fontSize: 10, lineHeight: 12 }}
                >
                  {unread > 9 ? "9+" : String(unread)}
                </AppText>
              </View>
            )}
          </Pressable>

          <Pressable
            onPress={openProfile}
            hitSlop={6}
            style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          >
            <Avatar
              uri={user?.avatar}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size={40}
            />
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
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  rightCluster: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
});
