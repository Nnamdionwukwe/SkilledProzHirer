// src/navigation/WorkerNavigator.js
//
// Fixed: <Stack.Screen> elements were previously inside <Drawer.Navigator>,
// which is invalid. Moved them to <Stack.Navigator>.
// CallBannersOverlay is a sibling of the Stack.Navigator (wrapped in a View)
// so incoming call banners render above every screen.

import React from "react";
import { View } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTranslation } from "react-i18next";

import WorkerDrawerContent from "../components/WorkerDrawerContent";
import TopBar from "../components/TopBar";
import CallBannersOverlay from "./CallBannersOverlay";

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
import RefundHistoryScreen from "../screens/main/RefundHistoryScreen";
import RefundDetailScreen from "../screens/main/RefundDetailScreen";
import MyDisputesScreen from "../screens/main/MyDisputesScreen";
import VideoCallScreen from "../screens/main/VideoCallScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function WorkerDrawer() {
  const { t } = useTranslation();

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
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={({ route }) => {
          if (route.name === "WorkerHome") {
            return { headerShown: false };
          }
          if (route.name === "VideoCall") {
            return { headerShown: false, presentation: "fullScreenModal" };
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
        <Stack.Screen
          name="WorkerJobDetail"
          component={WorkerJobDetailScreen}
        />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="RefundHistory" component={RefundHistoryScreen} />
        <Stack.Screen name="RefundDetail" component={RefundDetailScreen} />
        <Stack.Screen name="MyDisputes" component={MyDisputesScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="VideoCall" component={VideoCallScreen} />
      </Stack.Navigator>
      <CallBannersOverlay />
    </View>
  );
}

export default function WorkerNavigator() {
  return <WorkerStack />;
}
