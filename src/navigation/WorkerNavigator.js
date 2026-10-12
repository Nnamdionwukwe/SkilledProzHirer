// src/navigation/WorkerNavigator.js
// TopBar applied at navigator level — no screen needs its own TopBar.
// SCREEN_META defined INSIDE the component functions so t() can be called.
// Drawer screens → showBack omitted (hamburger ☰)
// Stack screens  → showBack prop   (back arrow ←)

import React from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import WorkerDrawerContent from "../components/WorkerDrawerContent";
import TopBar from "../components/TopBar";

// ── Worker screens ─────────────────────────────────────────────────────────────
import WorkerDashboardScreen from "../screens/main/worker/WorkerDashboardScreen";
import WorkerJobsScreen from "../screens/main/worker/WorkerJobsScreen";
import WorkerJobDetailScreen from "../screens/main/worker/WorkerJobDetailScreen";
import WorkerApplicationsScreen from "../screens/main/worker/WorkerApplicationsScreen";
import WorkerBookingsScreen from "../screens/main/worker/WorkerBookingsScreen";
import WorkerProfileScreen from "../screens/main/worker/WorkerProfileScreen";
import WorkerEarningsScreen from "../screens/main/worker/WorkerEarningsScreen";
import WorkerWithdrawalsScreen from "../screens/main/worker/WorkerWithdrawalsScreen";
import WorkerReviewsScreen from "../screens/main/worker/WorkerReviewsScreen";
import WorkerPortfolioScreen from "../screens/main/worker/WorkerPortfolioScreen";
import WorkerCertificationsScreen from "../screens/main/worker/WorkerCertificationsScreen";
import WorkerCategoriesScreen from "../screens/main/worker/WorkerCategoriesScreen";
import WorkerAvailabilityScreen from "../screens/main/worker/WorkerAvailabilityScreen";

// ── Shared screens ─────────────────────────────────────────────────────────────
import BookingDetailScreen from "../screens/main/BookingDetailScreen";
import HirerPublicProfileScreen from "../screens/main/HirerPublicProfileScreen";
import MessagesScreen from "../screens/main/MessagesScreen";
import ChatScreen from "../screens/main/ChatScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import SettingsScreen from "../screens/main/SettingsScreen";
import MyPostsScreen from "../screens/main/MyPostsScreen";
import DisputesScreen from "../screens/main/DisputesScreen";
import VerificationScreen from "../screens/main/VerificationScreen";
import SubscriptionsScreen from "../screens/main/SubscriptionsScreen";
import FeaturedBoostScreen from "../screens/main/FeaturedBoostScreen";
import ReferralDashboardScreen from "../screens/main/ReferralDashboardScreen";
import CampaignDashboardScreen from "../screens/main/CampaignDashboardScreen";
import MyReportsScreen from "../screens/main/MyReportsScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

// ── Drawer navigator ───────────────────────────────────────────────────────────
function WorkerDrawer() {
  const { t } = useTranslation();

  // Translated screen titles & subtitles for drawer screens.
  // Defined INSIDE the component so t() is valid.
  const DRAWER_META = {
    Dashboard: {
      title: t("nav.dashboard"),
      subtitle: t("screenSub.dashboard"),
    },
    WorkerBookings: {
      title: t("nav.myBookings"),
      subtitle: t("screenSub.myBookings"),
    },
    WorkerCategories: {
      title: t("nav.categories"),
      subtitle: t("screenSub.categories"),
    },
    WorkerJobs: {
      title: t("nav.browseJobs"),
      subtitle: t("screenSub.browseJobs"),
    },
    WorkerApplications: {
      title: t("nav.myApplications"),
      subtitle: t("screenSub.applications"),
    },
    MyPosts: { title: t("nav.myPosts"), subtitle: t("screenSub.community") },
    WorkerDisputes: {
      title: t("nav.disputes"),
      subtitle: t("screenSub.disputes"),
    },
    WorkerEarnings: {
      title: t("nav.earnings"),
      subtitle: t("screenSub.earnings"),
    },
    WorkerWithdrawals: {
      title: t("nav.wallet"),
      subtitle: t("screenSub.wallet"),
    },
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
    WorkerReviews: {
      title: t("workerReviews.title"),
      subtitle: t("screenSub.reviews"),
    },
    Notifications: {
      title: t("nav.notifications"),
      subtitle: t("screenSub.notifications"),
    },
    Messages: { title: t("nav.messages"), subtitle: t("screenSub.messages") },
    WorkerSubscriptions: {
      title: t("nav.subscriptions"),
      subtitle: t("screenSub.subscriptions"),
    },
    WorkerBoost: {
      title: t("nav.boostListing"),
      subtitle: t("screenSub.boostListing"),
    },
    Settings: { title: t("nav.settings"), subtitle: t("screenSub.settings") },
    ReferralDashboard: {
      title: t("nav.referralDashboard"),
      subtitle: t("screenSub.referralDashboard"),
    },
    Campaign: {
      title: t("nav.campaign"),
      subtitle: t("screenSub.campaign"),
    },
    MyReports: {
      title: t("nav.myreports"),
      subtitle: t("screenSub.myreports"),
    },
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
          overlayColor: "rgba(0,0,0,0.5)",
          drawerStyle: { width: "80%" },
        };
      }}
    >
      <Drawer.Screen name="Dashboard" component={WorkerDashboardScreen} />
      <Drawer.Screen name="WorkerBookings" component={WorkerBookingsScreen} />
      <Drawer.Screen name="WorkerJobs" component={WorkerJobsScreen} />
      <Drawer.Screen name="WorkerProfile" component={WorkerProfileScreen} />
      <Drawer.Screen name="WorkerEarnings" component={WorkerEarningsScreen} />
      <Drawer.Screen
        name="WorkerWithdrawals"
        component={WorkerWithdrawalsScreen}
      />
      <Drawer.Screen
        name="WorkerApplications"
        component={WorkerApplicationsScreen}
      />
      <Drawer.Screen name="WorkerReviews" component={WorkerReviewsScreen} />
      <Drawer.Screen name="WorkerPortfolio" component={WorkerPortfolioScreen} />
      <Drawer.Screen
        name="WorkerCertifications"
        component={WorkerCertificationsScreen}
      />
      <Drawer.Screen
        name="WorkerCategories"
        component={WorkerCategoriesScreen}
      />
      <Drawer.Screen
        name="WorkerAvailability"
        component={WorkerAvailabilityScreen}
      />
      <Drawer.Screen name="MyPosts" component={MyPostsScreen} />
      <Drawer.Screen name="WorkerDisputes" component={DisputesScreen} />
      <Drawer.Screen name="WorkerVerification" component={VerificationScreen} />
      <Drawer.Screen
        name="WorkerSubscriptions"
        component={SubscriptionsScreen}
      />
      <Drawer.Screen name="WorkerBoost" component={FeaturedBoostScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Messages" component={MessagesScreen} />
      <Drawer.Screen
        name="ReferralDashboard"
        component={ReferralDashboardScreen}
      />
      <Drawer.Screen name="Campaign" component={CampaignDashboardScreen} />
      <Drawer.Screen name="MyReports" component={MyReportsScreen} />
    </Drawer.Navigator>
  );
}

// ── Stack navigator ────────────────────────────────────────────────────────────
// WorkerHome = the entire Drawer (header hidden — drawer owns it).
// Every push screen gets a TopBar with showBack=true.
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
  };

  const stackMeta = (name) =>
    STACK_META[name] ?? {
      title: name.replace(/([A-Z])/g, " $1").trim(),
      subtitle: null,
    };

  return (
    <Stack.Navigator
      screenOptions={({ route }) => {
        if (route.name === "WorkerHome") {
          return { headerShown: false };
        }
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
      <Stack.Screen name="WorkerJobDetail" component={WorkerJobDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
    </Stack.Navigator>
  );
}

export default function WorkerNavigator() {
  return <WorkerStack />;
}
