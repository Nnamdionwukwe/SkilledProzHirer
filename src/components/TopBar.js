// src/components/TopBar.js
//
// Verbatim port of the website's HirerLayout.jsx header block.
// Rounded icon buttons + avatars match .headerIconBtn / .headerAvatar from CSS.

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
import { FaCommentDots } from "../icons/fa";
import { rem } from "../constants/theme";
import {
  openDrawer,
  navigate as globalNavigate,
} from "../navigation/navigationRef";

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
  const [unreadMessages, setUnreadMessages] = useState(0);

  const routeName = useNavigationState(
    (state) => state?.routes?.[state.index]?.name,
  );
  const fallback = SCREEN_FALLBACK[routeName] ?? {};
  const title = titleProp ?? fallback.title ?? prettyTitle(routeName);
  const resolvedSub = subtitleProp ?? fallback.subtitle ?? null;

  // ── Notification unread count ────────────────────────────────────────
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
          count =
            res.data?.data?.unreadCount ??
            res.data?.unreadCount ??
            res.data?.data?.unread ??
            0;
        } else {
          const res = await client.get("/hirers/me/notifications", {
            params: { limit: 1 },
          });
          count =
            res.data?.data?.unreadCount ??
            res.data?.unreadCount ??
            res.data?.data?.unread ??
            res.data?.unread ??
            0;
        }
        console.log("🔔 unread count:", count, "from /notifications");
        if (!cancelled) setUnread(count);
      } catch (err) {
        console.log("⚠️ notification fetch failed:", err?.message);
      }
    };
    fetchUnread();
    timer = setInterval(fetchUnread, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [user?.role]);

  // ── Messages unread count ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let timer;
    const fetchMessages = async () => {
      try {
        const { data } = await client.get("/messages/conversations");
        const convos = data?.data?.conversations ?? data?.conversations ?? [];
        const total = convos.reduce((s, c) => s + (c.unreadCount || 0), 0);
        if (!cancelled) setUnreadMessages(total);
      } catch {}
    };
    fetchMessages();
    timer = setInterval(fetchMessages, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const handleLeft = () => {
    if (showBack) {
      if (navigation.canGoBack()) navigation.goBack();
      else openDrawer();
    } else {
      openDrawer();
    }
  };

  const openNotifications = () => {
    try {
      navigation.navigate("Notifications");
    } catch {
      globalNavigate("Notifications");
    }
  };

  const openMessages = () => {
    try {
      navigation.navigate("Messages");
    } catch {
      globalNavigate("Messages");
    }
  };

  const openProfile = () => {
    const target = user?.role === "WORKER" ? "WorkerProfile" : "Profile";
    try {
      navigation.navigate(target);
    } catch {
      globalNavigate(target);
    }
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
        {/* Menu / back button */}
        <Pressable
          onPress={handleLeft}
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
          <Ionicons
            name={showBack ? "arrow-back" : "menu"}
            size={18}
            color={theme.colors.textDim}
          />
        </Pressable>

        {/* Title block */}
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
            {unread > 0 && (
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
                  {unread > 9 ? "9+" : String(unread)}
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

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: {
    height: rem(60 / 14), // 60px / 14
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rem(20 / 14), // 20px / 14
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
  // ⬇⬇  Changed: borderRadius from RADII.base (8) → 14 for rounder look
  //      Website's 8px border-radius on a 34px button = 23.5% roundness
  //      We want the same visual proportion: 34 × 0.24 ≈ 8, but at raw px
  //      For a truly "rounded" look, 14px on 34px looks closer to the web
  //      After matching the web at 14px root: border-radius 8px = 8 × (14/16) = 7
  //      To feel rounder, use 14 (nearly half-height, becomes circle-ish)
  iconBtn: {
    width: rem(34 / 14),
    height: rem(34 / 14),
    borderRadius: 14, // ← was RADII.base (8), now 14 (rounder)
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
    top: rem(-4 / 14),
    right: rem(-4 / 14),
    minWidth: rem(16 / 14),
    height: rem(16 / 14),
    paddingHorizontal: rem(4 / 14),
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  bellBadgeText: {
    fontSize: rem(0.625),
    fontWeight: "800",
    lineHeight: rem(0.625) * 1.1,
  },
  // ⬇⬇ Avatar keeps full circle + explicit 1.5px border, non-scaled
  avatarWrap: {
    width: rem(28 / 14),
    height: rem(28 / 14),
    borderRadius: 999, // perfect circle
    borderWidth: 1.5, // stays visible at all DPIs
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // No `padding` — border hugs the image directly
  },
});
