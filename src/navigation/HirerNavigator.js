// src/navigation/HirerNavigator.js
import { useNavigation, useRoute } from "@react-navigation/native";

import { View, StyleSheet, Dimensions } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";

import TopBar from "../components/TopBar";
import DrawerContent from "../components/DrawerContent";
import { useTheme } from "../contexts/ThemeContext";

import DashboardScreen from "../screens/main/DashboardScreen";
import PostJobScreen from "../screens/main/PostJobScreen";
import SettingsScreen from "../screens/main/SettingsScreen";
import PlaceholderScreen from "../screens/main/PlaceholderScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import JobsManagementScreen from "../screens/main/JobsManagementScreen";
import JobDetailScreen from "../screens/main/JobDetailScreen";
import JobApplicationsScreen from "../screens/main/JobApplicationsScreen";
import BookingDetailScreen from "../screens/main/BookingDetailScreen";
import BookingsScreen from "../screens/main/BookingsScreen";
import CreateBookingScreen from "../screens/main/CreateBookingScreen";
import PaymentHistoryScreen from "../screens/main/PaymentHistoryScreen";
import DisputesScreen from "../screens/main/DisputesScreen";
import MyPostsScreen from "../screens/main/MyPostsScreen";
import CommunityFeedScreen from "../screens/main/CommunityFeedScreen";
import SavedWorkersScreen from "../screens/main/SavedWorkersScreen";
import ReviewsReceivedScreen from "../screens/main/ReviewsReceivedScreen";
import ReviewsGivenScreen from "../screens/main/ReviewsGivenScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import BrowseWorkersScreen from "../screens/main/BrowseWorkersScreen";
import WorkerPublicProfileScreen from "../screens/main/WorkerPublicProfileScreen";
import BrowseByCategoriesScreen from "../screens/main/BrowseByCategoriesScreen";
import CategoryDetailScreen from "../screens/main/CategoryDetailScreen";
import VerificationScreen from "../screens/main/VerificationScreen";
import SubscriptionsScreen from "../screens/main/SubscriptionsScreen";
import FeaturedBoostScreen from "../screens/main/FeaturedBoostScreen";
import MessagesScreen from "../screens/main/MessagesScreen";
import ChatScreen from "../screens/main/ChatScreen";
import HirerPublicProfileScreen from "../screens/main/HirerPublicProfileScreen";
import ReferralDashboardScreen from "../screens/main/ReferralDashboardScreen";
import CampaignDashboardScreen from "../screens/main/CampaignDashboardScreen";
import MyReportsScreen from "../screens/main/MyReportsScreen";
import VideoCallScreen from "../screens/main/VideoCallScreen";

// Near the other imports
import RefundHistoryScreen from "../screens/main/RefundHistoryScreen";
import RefundDetailScreen from "../screens/main/RefundDetailScreen";
import MyDisputesScreen from "../screens/main/MyDisputesScreen";

const Drawer = createDrawerNavigator();

const SCREEN_META = {
  Dashboard: { title: "Dashboard", subtitle: "Your work at a glance" },
  WorkerBookings: { title: "My Bookings", subtitle: "Jobs assigned to you" },
  WorkerJobs: { title: "Browse Jobs", subtitle: "Find your next opportunity" },
  WorkerProfile: {
    title: "My Profile",
    subtitle: "Manage your rates & availability",
  },
  WorkerEarnings: { title: "Earnings", subtitle: "Your payout history" },
  WorkerApplications: {
    title: "Applications",
    subtitle: "Jobs you've applied to",
  },
  WorkerReviews: { title: "Reviews", subtitle: "Feedback from hirers" },
  WorkerPortfolio: {
    title: "Portfolio",
    subtitle: "Your work gallery & video intro",
  },
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
  Settings: { title: "Settings", subtitle: "Preferences & security" },
  Notifications: {
    title: "Notifications",
    subtitle: "View & manage your notification",
  },
  Messages: { title: "Messages", subtitle: null },
};

export default function HirerNavigator() {
  const { theme } = useTheme();
  const screenWidth = Dimensions.get("window").width;

  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ route }) => {
        const meta = SCREEN_META[route.name] ?? {
          title: route.name.replace(/([A-Z])/g, " $1").trim(),
          subtitle: null,
        };
        return {
          headerShown: false,
          drawerType: "front",
          drawerStyle: {
            width: Math.min(320, screenWidth * 0.85),
            backgroundColor: theme.colors.bgPanel,
            borderRightColor: theme.colors.border,
            borderRightWidth: StyleSheet.hairlineWidth,
          },
          sceneContainerStyle: { backgroundColor: theme.colors.bg },
          overlayColor: "rgba(0,0,0,0.5)",
          swipeEdgeWidth: 60,
        };
      }}
    >
      {/* ── Main ─────────────────────────────────────────────────────── */}
      <Drawer.Screen name="Dashboard">
        {() => <ScreenWithChrome Screen={DashboardScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Bookings">
        {() => <ScreenWithChrome Screen={BookingsScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="CreateBooking">
        {() => <ScreenWithChrome Screen={CreateBookingScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="BookingDetail">
        {() => <ScreenWithChrome Screen={BookingDetailScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="PaymentHistory">
        {() => <ScreenWithChrome Screen={PaymentHistoryScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="PostJob">
        {() => <ScreenWithChrome Screen={PostJobScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="JobsManagement">
        {() => <ScreenWithChrome Screen={JobsManagementScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="JobDetail">
        {() => <ScreenWithChrome Screen={JobDetailScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="JobApplications">
        {() => <ScreenWithChrome Screen={JobApplicationsScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="MyPosts">
        {() => <ScreenWithChrome Screen={MyPostsScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Disputes">
        {() => <ScreenWithChrome Screen={DisputesScreen} />}
      </Drawer.Screen>

      {/* ── Workers ──────────────────────────────────────────────────── */}
      <Drawer.Screen name="SavedWorkers">
        {() => <ScreenWithChrome Screen={SavedWorkersScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="BrowseWorkers">
        {() => <ScreenWithChrome Screen={BrowseWorkersScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="WorkerProfile">
        {(props) => (
          <ScreenWithChrome {...props} Screen={WorkerPublicProfileScreen} />
        )}
      </Drawer.Screen>

      <Drawer.Screen name="BrowseByCategories">
        {() => <ScreenWithChrome Screen={BrowseByCategoriesScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="CategoryDetail">
        {() => <ScreenWithChrome Screen={CategoryDetailScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Messages">
        {() => <ScreenWithChrome Screen={MessagesScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Chat">
        {() => <ScreenWithChrome Screen={ChatScreen} />}
      </Drawer.Screen>

      {/* ── Reviews ──────────────────────────────────────────────────── */}
      <Drawer.Screen name="ReviewsReceived">
        {() => <ScreenWithChrome Screen={ReviewsReceivedScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="ReviewsGiven">
        {() => <ScreenWithChrome Screen={ReviewsGivenScreen} />}
      </Drawer.Screen>

      {/* ── Community ────────────────────────────────────────────────── */}
      <Drawer.Screen name="CommunityFeed">
        {() => <ScreenWithChrome Screen={CommunityFeedScreen} />}
      </Drawer.Screen>

      {/* ── Account ──────────────────────────────────────────────────── */}
      <Drawer.Screen name="Notifications">
        {() => <ScreenWithChrome Screen={NotificationsScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Verification">
        {() => <ScreenWithChrome Screen={VerificationScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Profile">
        {() => <ScreenWithChrome Screen={ProfileScreen} />}
      </Drawer.Screen>

      {/* ── Subscriptions & Features ─────────────────────────────────── */}
      <Drawer.Screen name="Subscriptions">
        {() => <ScreenWithChrome Screen={SubscriptionsScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="FeaturedBoost">
        {() => <ScreenWithChrome Screen={FeaturedBoostScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="ReferralDashboard">
        {() => <ScreenWithChrome Screen={ReferralDashboardScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="MyReports">
        {() => <ScreenWithChrome Screen={MyReportsScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="Campaign">
        {() => <ScreenWithChrome Screen={CampaignDashboardScreen} />}
      </Drawer.Screen>

      {/* ── Settings ─────────────────────────────────────────────────── */}
      <Drawer.Screen name="Settings">
        {() => <ScreenWithChrome Screen={SettingsScreen} />}
      </Drawer.Screen>

      {/* ── Detail screens (no drawer entry) ─────────────────────────── */}

      <Drawer.Screen name="WorkerDetail">
        {() => <ScreenWithChrome Screen={WorkerPublicProfileScreen} />}
      </Drawer.Screen>
      <Drawer.Screen name="HirerDetail">
        {() => <ScreenWithChrome Screen={HirerPublicProfileScreen} />}
      </Drawer.Screen>

      <Drawer.Screen name="RefundHistory">
        {() => <ScreenWithChrome Screen={RefundHistoryScreen} />}
      </Drawer.Screen>
      <Drawer.Screen name="RefundDetail">
        {() => <ScreenWithChrome Screen={RefundDetailScreen} />}
      </Drawer.Screen>
      <Drawer.Screen name="MyDisputes">
        {() => <ScreenWithChrome Screen={MyDisputesScreen} />}
      </Drawer.Screen>
      <Drawer.Screen
        name="VideoCall"
        component={VideoCallScreen}
        options={{ headerShown: false, swipeEnabled: false }}
      />
    </Drawer.Navigator>
  );
}

function ScreenWithChrome({ Screen }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  return (
    <View style={[styles.shell, { backgroundColor: theme.colors.bg }]}>
      <TopBar navigation={navigation} />
      <View style={styles.body}>
        <Screen navigation={navigation} route={route} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  body: { flex: 1 },
});
