// src/navigation/WorkerNavigator.js
//
// Rewritten to mirror src/components/layout/WorkerLayout.jsx 1:1:
//   • Same 5 nav groups, same order, same items.
//   • Same route names (Dashboard, WorkerBookings, WorkerJobs, …).
//   • Same icons via Ionicons in WorkerDrawerContent.
//   • Every screen WorkerLayout.jsx navigates to is registered.
//   • Drawer = sidebar. Stack = detail screens opened from the drawer.

import React from "react";
import { View } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import WorkerDrawerContent from "../components/WorkerDrawerContent";
import TopBar from "../components/TopBar";

// ── Overview ──────────────────────────────────────────────────────────────
import WorkerDashboardScreen from "../screens/main/worker/WorkerDashboardScreen";
import WorkerJobsScreen from "../screens/main/worker/WorkerJobsScreen";
import WorkerApplicationsScreen from "../screens/main/worker/WorkerApplicationsScreen";
import WorkerCategoriesScreen from "../screens/main/worker/WorkerCategoriesScreen";
import WorkerBookingsScreen from "../screens/main/worker/WorkerBookingsScreen";

// ── Finances & History ────────────────────────────────────────────────────
import WorkerEarningsScreen from "../screens/main/worker/WorkerEarningsScreen";
import WorkerWithdrawalsScreen from "../screens/main/worker/WorkerWithdrawalsScreen";
import DisputesScreen from "../screens/main/DisputesScreen";
import RefundHistoryScreen from "../screens/main/RefundHistoryScreen";

// ── Profile ───────────────────────────────────────────────────────────────
import WorkerProfileScreen from "../screens/main/worker/WorkerProfileScreen";
import WorkerPortfolioScreen from "../screens/main/worker/WorkerPortfolioScreen";
import WorkerCertificationsScreen from "../screens/main/worker/WorkerCertificationsScreen";
import WorkerAvailabilityScreen from "../screens/main/worker/WorkerAvailabilityScreen";
import VerificationScreen from "../screens/main/VerificationScreen";

// ── Community & Growth ────────────────────────────────────────────────────
import MyPostsScreen from "../screens/main/MyPostsScreen";
import CampaignDashboardScreen from "../screens/main/CampaignDashboardScreen";
import ReferralDashboardScreen from "../screens/main/ReferralDashboardScreen";
import MyReportsScreen from "../screens/main/MyReportsScreen";

// ── Account & Support ─────────────────────────────────────────────────────
import WorkerReviewsScreen from "../screens/main/worker/WorkerReviewsScreen";
import MessagesScreen from "../screens/main/MessagesScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import SubscriptionsScreen from "../screens/main/SubscriptionsScreen";
import FeaturedBoostScreen from "../screens/main/FeaturedBoostScreen";
import SettingsScreen from "../screens/main/SettingsScreen";

// ── Stack (detail screens — same set the web links out to) ───────────────
import WorkerJobDetailScreen from "../screens/main/worker/WorkerJobDetailScreen";
import BookingDetailScreen from "../screens/main/BookingDetailScreen";
import HirerPublicProfileScreen from "../screens/main/HirerPublicProfileScreen";
import ChatScreen from "../screens/main/ChatScreen";
import PostDetailScreen from "../screens/main/PostDetailScreen";
import RefundDetailScreen from "../screens/main/RefundDetailScreen";
import MyDisputesScreen from "../screens/main/MyDisputesScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";
import VideoCallScreen from "../screens/main/VideoCallScreen";
import SupportChatScreen from "../screens/main/SupportChatScreen";
import SupportTicketThreadScreen from "../screens/main/SupportTicketThreadScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// ════════════════════════════════════════════════════════════════════════
// Drawer — mirrors WorkerLayout.jsx's 5 NAV groups verbatim.
// Header title/subtitle per screen taken from WorkerLayout.jsx PAGE_TITLES.
// ════════════════════════════════════════════════════════════════════════
function WorkerDrawer() {
  const { t } = useTranslation();

  // Names + i18n keys match WorkerLayout.jsx one-to-one.
  const DRAWER_META = {
    // Overview
    Dashboard: {
      title: t("nav.dashboard"),
      subtitle: t("screenSub.dashboard"),
    },
    WorkerBookings: {
      title: t("nav.myBookings"),
      subtitle: t("screenSub.myBookings"),
    },
    WorkerJobs: {
      title: t("nav.browseJobs"),
      subtitle: t("screenSub.browseJobs"),
    },
    WorkerApplications: {
      title: t("nav.myApplications"),
      subtitle: t("screenSub.applications"),
    },
    WorkerCategories: {
      title: t("nav.categories"),
      subtitle: t("screenSub.categories"),
    },

    // Finances & History
    WorkerEarnings: {
      title: t("nav.earnings"),
      subtitle: t("screenSub.earnings"),
    },
    WorkerWithdrawals: {
      title: t("nav.wallet"),
      subtitle: t("screenSub.wallet"),
    },
    WorkerDisputes: {
      title: t("nav.disputes"),
      subtitle: t("screenSub.disputes"),
    },
    RefundHistory: {
      title: t("nav.refunds"),
      subtitle: t("screenSub.refunds"),
    },

    // Profile
    WorkerProfile: {
      title: t("profile.myProfile"),
      subtitle: t("screenSub.myProfile"),
    },
    WorkerPortfolio: {
      title: t("workerProfile.portfolio"),
      subtitle: t("screenSub.portfolio"),
    },
    WorkerCertifications: {
      title: t("workerProfile.certifications"),
      subtitle: t("screenSub.certifications"),
    },
    WorkerAvailability: {
      title: t("workerProfile.availability"),
      subtitle: t("screenSub.availability"),
    },
    WorkerVerification: {
      title: t("nav.verification"),
      subtitle: t("screenSub.verification"),
    },

    // Community & Growth
    MyPosts: { title: t("nav.myPosts"), subtitle: t("screenSub.community") },
    Campaign: { title: t("nav.campaign"), subtitle: t("screenSub.campaign") },
    ReferralDashboard: {
      title: t("nav.referralDashboard"),
      subtitle: t("screenSub.referralDashboard"),
    },
    MyReports: {
      title: t("nav.myreports"),
      subtitle: t("screenSub.myreports"),
    },

    // Account & Support
    WorkerReviews: {
      title: t("workerReviews.title"),
      subtitle: t("screenSub.reviews"),
    },
    Messages: { title: t("nav.messages"), subtitle: t("screenSub.messages") },
    Notifications: {
      title: t("nav.notifications"),
      subtitle: t("screenSub.notifications"),
    },
    WorkerSubscriptions: {
      title: t("nav.subscriptions"),
      subtitle: t("screenSub.subscriptions"),
    },
    WorkerBoost: {
      title: t("nav.boostListing"),
      subtitle: t("screenSub.boostListing"),
    },
    Settings: { title: t("nav.settings"), subtitle: t("screenSub.settings") },
  };

  const drawerMeta = (name) =>
    DRAWER_META[name] ?? {
      title: name.replace(/([A-Z])/g, " $1").trim(),
      subtitle: null,
    };

  return (
    <Drawer.Navigator
      drawerContent={(props) => <WorkerDrawerContent {...props} />}
      screenOptions={({ route }) => {
        const m = drawerMeta(route.name);
        return {
          headerShown: true,
          header: () => <TopBar title={m.title} subtitle={m.subtitle} />,
          drawerType: "front",
          overlayColor: "rgba(0,0,0,0.7)",
          drawerStyle: { width: "80%", backgroundColor: "transparent" },
        };
      }}
    >
      {/* ── Overview ─────────────────────────────────────────────── */}
      <Drawer.Screen name="Dashboard" component={WorkerDashboardScreen} />
      <Drawer.Screen name="WorkerBookings" component={WorkerBookingsScreen} />
      <Drawer.Screen name="WorkerJobs" component={WorkerJobsScreen} />
      <Drawer.Screen
        name="WorkerApplications"
        component={WorkerApplicationsScreen}
      />
      <Drawer.Screen
        name="WorkerCategories"
        component={WorkerCategoriesScreen}
      />

      {/* ── Finances & History ───────────────────────────────────── */}
      <Drawer.Screen name="WorkerEarnings" component={WorkerEarningsScreen} />
      <Drawer.Screen
        name="WorkerWithdrawals"
        component={WorkerWithdrawalsScreen}
      />
      <Drawer.Screen name="WorkerDisputes" component={DisputesScreen} />
      <Drawer.Screen name="RefundHistory" component={RefundHistoryScreen} />

      {/* ── Profile ──────────────────────────────────────────────── */}
      <Drawer.Screen name="WorkerProfile" component={WorkerProfileScreen} />
      <Drawer.Screen name="WorkerPortfolio" component={WorkerPortfolioScreen} />
      <Drawer.Screen
        name="WorkerCertifications"
        component={WorkerCertificationsScreen}
      />
      <Drawer.Screen
        name="WorkerAvailability"
        component={WorkerAvailabilityScreen}
      />
      <Drawer.Screen name="WorkerVerification" component={VerificationScreen} />

      {/* ── Community & Growth ───────────────────────────────────── */}
      <Drawer.Screen name="MyPosts" component={MyPostsScreen} />
      <Drawer.Screen name="Campaign" component={CampaignDashboardScreen} />
      <Drawer.Screen
        name="ReferralDashboard"
        component={ReferralDashboardScreen}
      />
      <Drawer.Screen name="MyReports" component={MyReportsScreen} />

      {/* ── Account & Support ────────────────────────────────────── */}
      <Drawer.Screen name="WorkerReviews" component={WorkerReviewsScreen} />
      <Drawer.Screen name="Messages" component={MessagesScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen
        name="WorkerSubscriptions"
        component={SubscriptionsScreen}
      />
      <Drawer.Screen name="WorkerBoost" component={FeaturedBoostScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Stack — detail screens the web navigates to (not in the sidebar).
// Same set the audit lists under SCREEN:HIRER + SCREEN:WORKER.
// ════════════════════════════════════════════════════════════════════════
function WorkerStack() {
  const { t } = useTranslation();

  const STACK_META = {
    BookingDetail: {
      title: t("bookings.detail"),
      subtitle: t("screenSub.bookingDetail"),
    },
    HirerPublicProfile: {
      title: t("profile.myProfile"),
      subtitle: t("screenSub.hirerProfile"),
    },
    WorkerJobDetail: {
      title: t("jobs.detail.details"),
      subtitle: t("screenSub.jobDetails"),
    },
    Chat: { title: t("nav.messages"), subtitle: t("screenSub.directMessage") },
    PostDetail: { title: t("nav.myPosts"), subtitle: t("screenSub.community") },
    RefundDetail: { title: t("nav.refunds"), subtitle: t("screenSub.refunds") },
    MyDisputes: { title: t("nav.disputes"), subtitle: t("screenSub.disputes") },
    EditProfile: {
      title: t("profile.editProfile"),
      subtitle: t("screenSub.myProfile"),
    },
    SupportChat: {
      title: t("nav.liveSupport"),
      subtitle: t("screenSub.supportChat"),
    },
    SupportTicketThread: {
      title: t("nav.supportTicket"),
      subtitle: t("screenSub.supportTicket"),
    },
  };

  const stackMeta = (name) =>
    STACK_META[name] ?? {
      title: name.replace(/([A-Z])/g, " $1").trim(),
      subtitle: null,
    };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={({ route }) => {
          if (route.name === "WorkerHome") return { headerShown: false };
          if (route.name === "VideoCall")
            return { headerShown: false, presentation: "fullScreenModal" };
          const m = stackMeta(route.name);
          return {
            headerShown: true,
            header: () => (
              <TopBar title={m.title} subtitle={m.subtitle} showBack />
            ),
          };
        }}
      >
        <Stack.Screen name="WorkerHome" component={WorkerDrawer} />

        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        <Stack.Screen
          name="HirerPublicProfile"
          component={HirerPublicProfileScreen}
        />
        <Stack.Screen
          name="WorkerJobDetail"
          component={WorkerJobDetailScreen}
        />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        <Stack.Screen name="RefundDetail" component={RefundDetailScreen} />
        <Stack.Screen name="MyDisputes" component={MyDisputesScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} />
        <Stack.Screen name="SupportChat" component={SupportChatScreen} />
        <Stack.Screen
          name="SupportTicketThread"
          component={SupportTicketThreadScreen}
        />
      </Stack.Navigator>
    </View>
  );
}

export default function WorkerNavigator() {
  return <WorkerStack />;
}
