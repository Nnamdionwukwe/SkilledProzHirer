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

import { CommonActions } from "@react-navigation/native";
import { DrawerActions } from "@react-navigation/native";

// Title/subtitle keys per route — translated via t(...) at render.
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
    titleKey: "nav.wallet",
    subtitleKey: "screenSub.wallet",
  },
  WalletTransactionDetail: {
    titleKey: "wallet.transactionDetail",
    subtitleKey: "screenSub.walletTransactionDetail",
  },
  RefundHistory: {
    titleKey: "nav.refundHistory",
    subtitleKey: "screenSub.refundHistory",
  },
  RefundDetail: {
    titleKey: "refundHistory.header.title",
    subtitleKey: "screenSub.refundDetail",
  },
  RetainedStaff: {
    titleKey: "nav.retainedStaff",
    subtitleKey: "screenSub.retainedStaff",
  },
  RetainedStaffList: {
    titleKey: "retainedStaff.title",
    subtitleKey: "screenSub.retainedStaffList",
  },
  RetainedStaffDetail: {
    titleKey: "retainedStaff.title",
    subtitleKey: "screenSub.retainedStaffDetail",
  },
  RetainedStaffCycleDetail: {
    titleKey: "retainedStaff.title",
    subtitleKey: "screenSub.retainedStaffCycleDetail",
  },
  Campaign: {
    titleKey: "nav.campaigns",
    subtitleKey: "screenSub.campaigns",
  },
  ReferralDashboard: {
    titleKey: "nav.referrals",
    subtitleKey: "screenSub.referrals",
  },
  MyReports: {
    titleKey: "nav.reports",
    subtitleKey: "screenSub.myReports",
  },
  SupportChat: {
    titleKey: "nav.liveSupportChat",
    subtitleKey: "screenSub.supportChat",
  },
  SupportHub: {
    titleKey: "nav.supportHub",
    subtitleKey: "screenSub.supportHub",
  },
  SupportTicketDetail: {
    titleKey: "support.ticket",
    subtitleKey: "screenSub.supportTicketDetail",
  },
  PostDetail: {
    titleKey: "posts.myTitle",
    subtitleKey: "screenSub.postDetail",
  },
  EditProfile: {
    titleKey: "profile.myProfile",
    subtitleKey: "screenSub.editProfile",
  },
  EditJob: {
    titleKey: "jobs.detail.details",
    subtitleKey: "screenSub.editJob",
  },
  MyDisputes: {
    titleKey: "disputes.title",
    subtitleKey: "screenSub.myDisputes",
  },
  CreateBookingFromJob: {
    titleKey: "createBooking.submit",
    subtitleKey: "screenSub.createBookingFromJob",
  },
  InitiatePayment: {
    titleKey: "payments.title",
    subtitleKey: "screenSub.initiatePayment",
  },
  ReleasePayment: {
    titleKey: "payments.title",
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

  // ── Hamburger — opens the drawer, never navigates ─────────────────
  //
  // Strategy:
  //   1. Walk up the parent chain and call openDrawer() on the first
  //      ancestor that has it. This handles both the direct-Drawer
  //      case (Dashboard, WorkerHome, etc.) and the Stack-inside-Drawer
  //      case (BookingDetail, JobDetail, etc.).
  //   2. If no ancestor has openDrawer, dispatch OPEN_DRAWER on the
  //      root navigationRef. Both worker and hirer roots are Drawers,
  //      so this succeeds.
  //   3. Never navigate anywhere. The hamburger is a toggle, not a
  //      navigation shortcut — that's why the previous version was
  //      landing users on their home screen instead of opening the
  //      drawer.
  const handleMenu = () => {
    // ── 1. Direct drawer-nav from context, if any ancestor has it ──
    let ancestor = navigation;
    let depth = 0;
    while (ancestor && depth < 10) {
      try {
        if (typeof ancestor.openDrawer === "function") {
          ancestor.openDrawer();
          return;
        }
      } catch (e) {}
      try {
        ancestor = ancestor.getParent?.();
      } catch (e) {
        ancestor = null;
      }
      depth += 1;
    }

    // ── 2. Ask the root to open the drawer WITHOUT navigating first ──
    //    Dispatch the action through navigationRef. If the current active
    //    branch contains a drawer, this succeeds. If we're on a Stack
    //    screen like BookingDetail, the action bubbles but no navigator
    //    handles it — so we detect that and go to step 3.
    if (navigationRef.isReady?.()) {
      try {
        const before = navigationRef.getRootState();
        navigationRef.dispatch(DrawerActions.openDrawer());

        // The dispatch is async; schedule a microtask to check whether
        // the drawer opened. We can't fully detect success, so we use
        // the "did a navigation state change happen in the drawer?" test
        // below as a best-effort fallback.
        setTimeout(() => {
          try {
            const after = navigationRef.getRootState();
            // If the state didn't change at all, the action was ignored.
            if (JSON.stringify(before) === JSON.stringify(after)) {
              fallbackOpenDrawer();
            }
          } catch {
            fallbackOpenDrawer();
          }
        }, 0);
        return;
      } catch (e) {}
    }

    // ── 3. Direct fallback ──
    fallbackOpenDrawer();
  };

  /**
   * The nuclear option: navigate to the drawer root screen and open the
   * drawer in the same tick. Because both actions land on the same
   * navigation state update, the drawer's default screen is rendered
   * first, then the drawer opens — visually it looks like the hamburger
   * just opened the drawer.
   *
   * This DOES pop the current stack screen (BookingDetail → WorkerHome),
   * but that's a known and acceptable tradeoff for "always reachable
   * hamburger". The other option (re-architecting so the drawer is
   * always an ancestor) is a much larger change.
   */
  function fallbackOpenDrawer() {
    if (!navigationRef.isReady?.()) return;
    const role = user?.role;

    const rootName =
      role === "WORKER" ? "WorkerHome" : role === "HIRER" ? "Dashboard" : null;

    if (!rootName) return;

    try {
      navigationRef.dispatch(
        CommonActions.navigate({
          name: rootName,
          params: { screen: "Dashboard" },
        }),
      );
      // Immediately follow with a drawer open. The two dispatches are
      // batched by React Navigation into one state update on most setups.
      setTimeout(() => {
        try {
          navigationRef.dispatch(DrawerActions.openDrawer());
        } catch {}
      }, 0);
    } catch (e) {}
  }

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
