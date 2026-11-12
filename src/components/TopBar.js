// src/components/TopBar.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import Avatar from "./Avatar";
import { useTheme } from "../contexts/ThemeContext";
import { useAuthStore } from "../store/authStore";
import { FaCommentDots } from "../icons/fa";
import { rem } from "../constants/theme";
import { navigationRef, hasRoute } from "../navigation/navigationRef";
import { useUnread } from "../contexts/UnreadContext";

// Title/subtitle keys per route — translated via t(...) at render.
// Keys use the existing `screenTitles.*` and `screenSub.*` namespaces in
// en.json. Where `screenTitles.*` doesn't exist for a route, we fall back
// to `screenSub.*` which already has a broad set of Hirer + Worker routes.
const SCREEN_FALLBACK_KEYS = {
  Dashboard: {
    titleKey: "screenTitles.dashboard.title",
    subtitleKey: "screenTitles.dashboard.subtitle",
  },
  Bookings: {
    titleKey: "bookings.title",
    subtitleKey: "screenSub.myBookings",
  },
  WorkerBookings: {
    titleKey: "screenTitles.workerBookings.title",
    subtitleKey: "screenTitles.workerBookings.subtitle",
  },
  WorkerJobs: {
    titleKey: "screenTitles.workerJobs.title",
    subtitleKey: "screenTitles.workerJobs.subtitle",
  },
  WorkerProfile: {
    titleKey: "screenTitles.workerProfile.title",
    subtitleKey: "screenTitles.workerProfile.subtitle",
  },
  WorkerEarnings: {
    titleKey: "screenTitles.workerEarnings.title",
    subtitleKey: "screenTitles.workerEarnings.subtitle",
  },
  WorkerWithdrawals: {
    titleKey: "screenTitles.workerWithdrawals.title",
    subtitleKey: "screenTitles.workerWithdrawals.subtitle",
  },
  WorkerApplications: {
    titleKey: "screenTitles.workerApplications.title",
    subtitleKey: "screenTitles.workerApplications.subtitle",
  },
  WorkerReviews: {
    titleKey: "screenTitles.workerReviews.title",
    subtitleKey: "screenTitles.workerReviews.subtitle",
  },
  WorkerPortfolio: {
    titleKey: "screenTitles.workerPortfolio.title",
    subtitleKey: "screenTitles.workerPortfolio.subtitle",
  },
  WorkerCertifications: {
    titleKey: "screenTitles.workerCertifications.title",
    subtitleKey: "screenTitles.workerCertifications.subtitle",
  },
  WorkerCategories: {
    titleKey: "screenTitles.workerCategories.title",
    subtitleKey: "screenTitles.workerCategories.subtitle",
  },
  WorkerAvailability: {
    titleKey: "screenTitles.workerAvailability.title",
    subtitleKey: "screenTitles.workerAvailability.subtitle",
  },
  WorkerDisputes: {
    titleKey: "screenTitles.workerDisputes.title",
    subtitleKey: "screenTitles.workerDisputes.subtitle",
  },
  WorkerVerification: {
    titleKey: "screenTitles.workerVerification.title",
    subtitleKey: "screenTitles.workerVerification.subtitle",
  },
  WorkerSubscriptions: {
    titleKey: "screenTitles.workerSubscriptions.title",
    subtitleKey: "screenTitles.workerSubscriptions.subtitle",
  },
  WorkerBoost: {
    titleKey: "screenTitles.workerBoost.title",
    subtitleKey: "screenTitles.workerBoost.subtitle",
  },
  CreateBooking: {
    titleKey: "createBooking.submit",
    subtitleKey: "createBooking.subtitle",
  },
  BookingDetail: {
    titleKey: "booking.section.jobDetails",
    subtitleKey: "screenSub.bookingDetail",
  },
  PaymentHistory: {
    titleKey: "payments.title",
    subtitleKey: "payments.subtitle",
  },
  PostJob: {
    titleKey: "postJob.screenTitle",
    subtitleKey: "postJob.screenSubtitle",
  },
  JobsManagement: {
    titleKey: "jobsManagement.title",
    subtitleKey: "jobsManagement.eyebrow",
  },
  JobDetail: {
    titleKey: "jobs.detail.details",
    subtitleKey: "screenSub.jobDetails",
  },
  JobApplications: {
    titleKey: "jobApplications.card.viewProfile",
    subtitleKey: "jobApplications.empty.subtitle",
  },
  MyPosts: {
    titleKey: "posts.myTitle",
    subtitleKey: "posts.mySubtitle",
  },
  Disputes: {
    titleKey: "disputes.title",
    subtitleKey: "disputes.subtitle",
  },
  SavedWorkers: {
    titleKey: "savedWorkers.title",
    subtitleKey: "savedWorkers.subtitle",
  },
  BrowseWorkers: {
    titleKey: "browse.title",
    subtitleKey: "browse.noResultsSub",
  },
  WorkerDetail: {
    titleKey: "workerProfile.about",
    subtitleKey: "profile.yourPublicProfile",
  },
  BrowseByCategories: {
    titleKey: "categories.title",
    subtitleKey: "categories.subtitleCounts",
  },
  CategoryDetail: {
    titleKey: "categoryDetail.backToCategories",
    subtitleKey: "categoryDetail.workersAvailable",
  },
  HirerPublicProfile: {
    titleKey: "profile.hirer",
    subtitleKey: "screenSub.hirerProfile",
  },
  WorkerJobDetail: {
    titleKey: "jobs.detail.details",
    subtitleKey: "screenSub.jobDetails",
  },
  Messages: {
    titleKey: "messages.title",
    subtitleKey: "messages.directMessage",
  },
  Chat: {
    titleKey: "messages.title",
    subtitleKey: "messages.directMessage",
  },
  ReviewsReceived: {
    titleKey: "reviews.receivedTitle",
    subtitleKey: "reviews.receivedSubtitle",
  },
  ReviewsGiven: {
    titleKey: "reviews.givenTitle",
    subtitleKey: "reviews.givenSubtitle",
  },
  CommunityFeed: {
    titleKey: "nav.community",
    subtitleKey: "screenSub.community",
  },
  Notifications: {
    titleKey: "notifications.title",
    subtitleKey: "screenSub.notifications",
  },
  Verification: {
    titleKey: "verification.heroTitle",
    subtitleKey: "verification.statusHeading",
  },
  Profile: {
    titleKey: "profile.myProfile",
    subtitleKey: "profile.yourPublicProfile",
  },
  Subscriptions: {
    titleKey: "subscription.title",
    subtitleKey: "subscription.subtitleHirer",
  },
  FeaturedBoost: {
    titleKey: "featured.title",
    subtitleKey: "featured.subtitle",
  },
  Settings: {
    titleKey: "settings.title",
    subtitleKey: "settings.subtitle",
  },

  // ── Added: Hirer routes that previously had no subtitle ────────────────
  Wallet: {
    titleKey: "nav.wallet", // verify — or "wallet.title" if that exists
    subtitleKey: "screenSub.wallet",
  },
  WalletTransactionDetail: {
    titleKey: "wallet.transactionDetail", // verify
    subtitleKey: "screenSub.walletTransactionDetail",
  },
  RefundHistory: {
    titleKey: "nav.refundHistory", // verify — or "refundHistory.header.title"
    subtitleKey: "screenSub.refundHistory",
  },
  RefundDetail: {
    titleKey: "refundHistory.header.title", // verify
    subtitleKey: "screenSub.refundDetail",
  },
  RetainedStaff: {
    titleKey: "nav.retainedStaff", // verify — or "retainedStaff.title"
    subtitleKey: "screenSub.retainedStaff",
  },
  RetainedStaffList: {
    titleKey: "retainedStaff.title", // verify
    subtitleKey: "screenSub.retainedStaffList",
  },
  RetainedStaffDetail: {
    titleKey: "retainedStaff.title", // verify
    subtitleKey: "screenSub.retainedStaffDetail",
  },
  RetainedStaffCycleDetail: {
    titleKey: "retainedStaff.title", // verify
    subtitleKey: "screenSub.retainedStaffCycleDetail",
  },
  Campaign: {
    titleKey: "nav.campaigns", // verify — or "nav.campaign"
    subtitleKey: "screenSub.campaigns",
  },
  ReferralDashboard: {
    titleKey: "nav.referrals", // verify — or "nav.referralDashboard"
    subtitleKey: "screenSub.referrals",
  },
  MyReports: {
    titleKey: "nav.reports", // verify — or "nav.MyReports"
    subtitleKey: "screenSub.myReports",
  },
  SupportChat: {
    titleKey: "nav.liveSupportChat", // verify
    subtitleKey: "screenSub.supportChat",
  },
  SupportHub: {
    titleKey: "nav.supportHub", // verify
    subtitleKey: "screenSub.supportHub",
  },
  SupportTicketDetail: {
    titleKey: "support.ticket", // verify
    subtitleKey: "screenSub.supportTicketDetail",
  },
  PostDetail: {
    titleKey: "posts.myTitle", // verify — or a dedicated postDetail key
    subtitleKey: "screenSub.postDetail",
  },
  EditProfile: {
    titleKey: "profile.myProfile", // verify — or "profile.editProfile"
    subtitleKey: "screenSub.editProfile",
  },
  EditJob: {
    titleKey: "jobs.detail.details", // verify — or "jobs.edit.title"
    subtitleKey: "screenSub.editJob",
  },
  MyDisputes: {
    titleKey: "disputes.title", // verify — or "disputes.myDisputes"
    subtitleKey: "screenSub.myDisputes",
  },
  CreateBookingFromJob: {
    titleKey: "createBooking.submit", // verify
    subtitleKey: "screenSub.createBookingFromJob",
  },
  InitiatePayment: {
    titleKey: "payments.title", // verify — or "payment.initiate"
    subtitleKey: "screenSub.initiatePayment",
  },
  ReleasePayment: {
    titleKey: "payments.title", // verify — or "payments.releasePayment"
    subtitleKey: "screenSub.releasePayment",
  },
};

export default function TopBar({
  title: titleProp,
  subtitle: subtitleProp,
  unreadCount: propUnread = null,
  unreadMessages: propMessages = null,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuthStore();

  // Pull live counts from context (falls back to props if provided)
  let ctx = { unreadNotifs: 0, unreadMessages: 0 };
  try {
    ctx = useUnread() || ctx;
  } catch (e) {
    // If TopBar is used outside a UnreadProvider, it falls back to props.
  }
  const unreadCount = propUnread ?? ctx.unreadNotifs ?? 0;
  const unreadMessages = propMessages ?? ctx.unreadMessages ?? 0;

  const routeName = useNavigationState(
    (state) => state?.routes?.[state.index]?.name,
  );
  const keys = SCREEN_FALLBACK_KEYS[routeName] ?? {};
  const title =
    titleProp ?? (keys.titleKey ? t(keys.titleKey) : prettyTitle(routeName));
  const resolvedSub =
    subtitleProp ?? (keys.subtitleKey ? t(keys.subtitleKey) : null);

  // ── Smart hamburger ─────────────────────────────────────────────
  const handleMenu = () => {
    const parent = navigation.getParent();
    if (parent) {
      try {
        parent.openDrawer();
        return;
      } catch (e) {}
    }

    if (hasRoute(navigation, "WorkerHome")) {
      try {
        navigation.navigate("WorkerHome", { screen: "Dashboard" });
        setTimeout(() => {
          try {
            navigationRef.dispatch({ type: "OPEN_DRAWER" });
          } catch (e3) {}
        }, 80);
        return;
      } catch (e) {}
    }

    try {
      if (navigationRef.isReady?.()) {
        navigationRef.dispatch({ type: "OPEN_DRAWER" });
      }
    } catch (e) {}
  };

  // ── Role-aware navigation ───────────────────────────────────────
  const navToWorkerScreen = (screen) => {
    if (user?.role === "WORKER" && hasRoute(navigation, "WorkerHome")) {
      try {
        navigation.navigate("WorkerHome", { screen });
        return true;
      } catch (e1) {}
    }
    return false;
  };

  const safeNavigate = (screen) => {
    if (navToWorkerScreen(screen)) return;
    try {
      if (hasRoute(navigation, screen)) {
        navigation.navigate(screen);
        return;
      }
    } catch (e2) {}
    try {
      if (hasRoute(null, screen)) {
        navigationRef.navigate(screen);
      }
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
            weight="displayBlack"
            style={{
              fontSize: 9,
              letterSpacing: -0.5,
            }}
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
                  {unreadCount > 9 ? "9+" : String(unreadCount)}
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
