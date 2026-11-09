// src/navigation/HirerNavigator.js
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  Pressable,
  Animated,
} from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TopBar from "../components/TopBar";
import DrawerContent from "../components/DrawerContent";
import { useTheme } from "../contexts/ThemeContext";
import { navigationRef } from "./navigationRef";
import { ICON } from "../constants/icons";

// Screens
import DashboardScreen from "../screens/main/DashboardScreen";
import BookingsScreen from "../screens/main/BookingsScreen";
import PostJobScreen from "../screens/main/PostJobScreen";
import BrowseWorkersScreen from "../screens/main/BrowseWorkersScreen";
import CommunityFeedScreen from "../screens/main/CommunityFeedScreen";
import JobsManagementScreen from "../screens/main/JobsManagementScreen";
import RetainedStaffScreen from "../screens/main/RetainedStaffScreen";

// Hidden Routes
import SettingsScreen from "../screens/main/SettingsScreen";
import ProfileScreen from "../screens/main/ProfileScreen";
import JobDetailScreen from "../screens/main/JobDetailScreen";
import JobApplicationsScreen from "../screens/main/JobApplicationsScreen";
import BookingDetailScreen from "../screens/main/BookingDetailScreen";
import CreateBookingScreen from "../screens/main/CreateBookingScreen";
import InitiatePaymentScreen from "../screens/main/InitiatePaymentScreen";
import PaymentHistoryScreen from "../screens/main/PaymentHistoryScreen";
import DisputesScreen from "../screens/main/DisputesScreen";
import MyPostsScreen from "../screens/main/MyPostsScreen";
import SavedWorkersScreen from "../screens/main/SavedWorkersScreen";
import ReviewsReceivedScreen from "../screens/main/ReviewsReceivedScreen";
import ReviewsGivenScreen from "../screens/main/ReviewsGivenScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
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
import RefundHistoryScreen from "../screens/main/RefundHistoryScreen";
import RefundDetailScreen from "../screens/main/RefundDetailScreen";
import EditJobScreen from "../screens/main/EditJobScreen";
import MyDisputesScreen from "../screens/main/MyDisputesScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";
import HirerWalletScreen from "../screens/main/HirerWalletScreen";
import WalletTransactionDetailScreen from "../screens/main/WalletTransactionDetailScreen";
import RetainedStaffListScreen from "../screens/main/RetainedStaffListScreen";
import RetainedStaffDetailScreen from "../screens/main/RetainedStaffDetailScreen";
import RetainedStaffCycleDetailScreen from "../screens/main/RetainedStaffCycleDetailScreen";
import PostDetailScreen from "../screens/main/PostDetailScreen";
import SupportChatScreen from "../screens/main/SupportChatScreen";
import SupportHubScreen from "../screens/main/SupportHubScreen";
import SupportTicketThreadScreen from "../screens/main/SupportTicketThreadScreen";
import ReleasePaymentScreen from "../screens/main/ReleasePaymentScreen";

const Drawer = createDrawerNavigator();

// ── Scroll Context (to share scrollY between screen and floating bar) ──
const ScrollContext = React.createContext(null);

// ── Floating Bar ──
function FloatingTabBar() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [activeRoute, setActiveRoute] = useState("Dashboard");
  const scrollY = React.useContext(ScrollContext);

  const translateY = useRef(new Animated.Value(0)).current;

  const scrollState = useRef({
    lastOffset: 0,
    lastTime: Date.now(),
    isHidden: false,
    velocityAccumulator: 0,
  });

  useEffect(() => {
    if (!scrollY) return;

    const listener = scrollY.addListener(({ value }) => {
      const now = Date.now();
      const timeDelta = now - scrollState.current.lastTime;
      const scrollDelta = value - scrollState.current.lastOffset;

      if (scrollDelta === 0) return;
      if (timeDelta < 8) {
        scrollState.current.lastOffset = value;
        return;
      }

      const velocity = scrollDelta / timeDelta;
      const isScrollingDown = scrollDelta > 0;
      const isScrollingUp = scrollDelta < 0;
      const absVelocity = Math.abs(velocity);

      if (value <= 15) {
        if (scrollState.current.isHidden) {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
          scrollState.current.isHidden = false;
        }
        scrollState.current.lastOffset = value;
        scrollState.current.lastTime = now;
        return;
      }

      if (isScrollingDown && value > 20) {
        if (!scrollState.current.isHidden) {
          Animated.timing(translateY, {
            toValue: 120,
            duration: 180,
            useNativeDriver: true,
          }).start();
          scrollState.current.isHidden = true;
        }
      } else if (isScrollingUp && scrollState.current.isHidden) {
        const FAST_THRESHOLD = 1.2;
        if (absVelocity >= FAST_THRESHOLD) {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
          scrollState.current.isHidden = false;
        }
      }

      scrollState.current.lastOffset = value;
      scrollState.current.lastTime = now;
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY, translateY]);

  useEffect(() => {
    const unsubscribe = navigationRef.addListener("state", () => {
      const state = navigationRef.getRootState();
      if (!state) return;
      const findActiveRoute = (s) => {
        if (!s) return null;
        if (s.type === "drawer") return s.routes[s.index]?.name;
        for (const route of s.routes) {
          const found = findActiveRoute(route.state);
          if (found) return found;
        }
        return null;
      };
      const current = findActiveRoute(state);
      if (current) {
        setActiveRoute(current);
        scrollState.current.isHidden = false;
        scrollState.current.lastOffset = 0;
        translateY.setValue(0);
      }
    });
    return unsubscribe;
  }, [translateY]);

  const tabs = [
    { name: "Dashboard", icon: ICON.dashboard },
    { name: "Bookings", icon: ICON.bookings },
    { name: "BrowseWorkers", icon: ICON.browseWorkers },
    { name: "CommunityFeed", icon: ICON.communityFeed },
    { name: "JobsManagement", icon: ICON.jobsManagement },
    { name: "RetainedStaff", icon: ICON.retainedStaff },
  ];

  return (
    <Animated.View
      style={[
        styles.floatingContainer,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: c.bgPanel,
            borderColor: c.border,
            shadowColor: "#000",
          },
        ]}
      >
        {tabs.map((tab) => {
          const isFocused = activeRoute === tab.name;
          const activeIcon = tab.icon.replace("-outline", "");
          return (
            <Pressable
              key={tab.name}
              onPress={() => navigationRef.navigate(tab.name)}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && { opacity: 0.7 },
              ]}
            >
              {isFocused ? (
                <View
                  style={[
                    styles.activePill,
                    {
                      backgroundColor:
                        c.orangeDim || "rgba(249, 115, 22, 0.15)",
                    },
                  ]}
                >
                  <Ionicons name={activeIcon} size={18} color={c.orange} />
                </View>
              ) : (
                <Ionicons name={tab.icon} size={18} color={c.text} />
              )}
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

export default function HirerNavigator() {
  const { theme } = useTheme();
  const screenWidth = Dimensions.get("window").width;

  return (
    <View style={{ flex: 1 }}>
      <Drawer.Navigator
        initialRouteName="Dashboard"
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
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
        }}
      >
        <Drawer.Screen name="Dashboard">
          {() => <ScreenWithChrome Screen={DashboardScreen} />}
        </Drawer.Screen>
        <Drawer.Screen name="Bookings">
          {() => <ScreenWithChrome Screen={BookingsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen name="PostJob">
          {() => <ScreenWithChrome Screen={PostJobScreen} />}
        </Drawer.Screen>
        <Drawer.Screen name="BrowseWorkers">
          {() => <ScreenWithChrome Screen={BrowseWorkersScreen} />}
        </Drawer.Screen>
        <Drawer.Screen name="CommunityFeed">
          {() => <ScreenWithChrome Screen={CommunityFeedScreen} />}
        </Drawer.Screen>
        <Drawer.Screen name="JobsManagement">
          {() => <ScreenWithChrome Screen={JobsManagementScreen} />}
        </Drawer.Screen>
        <Drawer.Screen name="RetainedStaff">
          {() => <ScreenWithChrome Screen={RetainedStaffScreen} />}
        </Drawer.Screen>

        {/* Hidden Routes */}
        <Drawer.Screen
          name="CreateBooking"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={CreateBookingScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="BookingDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={BookingDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="InitiatePayment"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={InitiatePaymentScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="PaymentHistory"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={PaymentHistoryScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="JobDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={JobDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="JobApplications"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={JobApplicationsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="MyPosts"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={MyPostsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Disputes"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={DisputesScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="SavedWorkers"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={SavedWorkersScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="WorkerProfile"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={WorkerPublicProfileScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="BrowseByCategories"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={BrowseByCategoriesScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="CategoryDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={CategoryDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Messages"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={MessagesScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Chat"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={ChatScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="ReviewsReceived"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={ReviewsReceivedScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="ReviewsGiven"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={ReviewsGivenScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Notifications"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={NotificationsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Verification"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={VerificationScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Profile"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={ProfileScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Subscriptions"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={SubscriptionsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="FeaturedBoost"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={FeaturedBoostScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="ReferralDashboard"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={ReferralDashboardScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="MyReports"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={MyReportsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Campaign"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={CampaignDashboardScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Settings"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={SettingsScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="WorkerDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={WorkerPublicProfileScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="HirerDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={HirerPublicProfileScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="RefundHistory"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={RefundHistoryScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="RefundDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={RefundDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="MyDisputes"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={MyDisputesScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="EditJob"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={EditJobScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="EditProfile"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={EditProfileScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="Wallet"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={HirerWalletScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="WalletTransactionDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={WalletTransactionDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="RetainedStaffList"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={RetainedStaffListScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="RetainedStaffDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={RetainedStaffDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="RetainedStaffCycleDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={RetainedStaffCycleDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="PostDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={PostDetailScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="SupportChat"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={SupportChatScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="SupportHub"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={SupportHubScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="SupportTicketDetail"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={SupportTicketThreadScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="ReleasePayment"
          options={{ drawerItemStyle: { display: "none" } }}
        >
          {() => <ScreenWithChrome Screen={ReleasePaymentScreen} />}
        </Drawer.Screen>
        <Drawer.Screen
          name="VideoCall"
          component={VideoCallScreen}
          options={{
            headerShown: false,
            swipeEnabled: false,
            drawerItemStyle: { display: "none" },
          }}
        />
      </Drawer.Navigator>
    </View>
  );
}

// Wrapper that provides the ScrollContext
function ScreenWithChrome({ Screen }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const scrollY = useRef(new Animated.Value(0)).current;

  return (
    <ScrollContext.Provider value={scrollY}>
      <View style={[styles.shell, { backgroundColor: theme.colors.bg }]}>
        <TopBar navigation={navigation} />

        <Animated.ScrollView
          style={styles.body}
          contentContainerStyle={{ paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
        >
          <Screen navigation={navigation} route={route} />
        </Animated.ScrollView>

        <FloatingTabBar />
      </View>
    </ScrollContext.Provider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  body: { flex: 1 },
  floatingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "92%",
    maxWidth: 420,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    flex: 1,
  },
  activePill: {
    width: 40,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
