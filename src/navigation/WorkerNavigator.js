// src/navigation/WorkerNavigator.js
import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { View, StyleSheet, Pressable, Animated } from "react-native";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { useTranslation } from "react-i18next";

import WorkerDrawerContent from "../components/WorkerDrawerContent";
import TopBar from "../components/TopBar";
import { useAuthStore } from "../store/authStore";
import { navigationRef } from "./navigationRef";
import { ICON } from "../constants/icons";
import { useTheme } from "../contexts/ThemeContext";
import { UnreadProvider, useUnread } from "../contexts/UnreadContext";

// ── Import your real screens ──
import WorkerDashboardScreen from "../screens/main/worker/WorkerDashboardScreen";
import WorkerJobsScreen from "../screens/main/worker/WorkerJobsScreen";
import WorkerApplicationsScreen from "../screens/main/worker/WorkerApplicationsScreen";
import WorkerCategoriesScreen from "../screens/main/worker/WorkerCategoriesScreen";
import WorkerEarningsScreen from "../screens/main/worker/WorkerEarningsScreen";
import WorkerWithdrawalsScreen from "../screens/main/worker/WorkerWithdrawalsScreen";
import DisputesScreen from "../screens/main/DisputesScreen";
import RefundHistoryScreen from "../screens/main/RefundHistoryScreen";
import WorkerProfileScreen from "../screens/main/worker/WorkerProfileScreen";
import WorkerPortfolioScreen from "../screens/main/worker/WorkerPortfolioScreen";
import WorkerCertificationsScreen from "../screens/main/worker/WorkerCertificationsScreen";
import WorkerAvailabilityScreen from "../screens/main/worker/WorkerAvailabilityScreen";
import VerificationScreen from "../screens/main/VerificationScreen";
import MyPostsScreen from "../screens/main/MyPostsScreen";
import CampaignDashboardScreen from "../screens/main/CampaignDashboardScreen";
import ReferralDashboardScreen from "../screens/main/ReferralDashboardScreen";
import MyReportsScreen from "../screens/main/MyReportsScreen";
import WorkerReviewsScreen from "../screens/main/worker/WorkerReviewsScreen";
import MessagesScreen from "../screens/main/MessagesScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import SubscriptionsScreen from "../screens/main/SubscriptionsScreen";
import FeaturedBoostScreen from "../screens/main/FeaturedBoostScreen";
import SettingsScreen from "../screens/main/SettingsScreen";

// ── Stack screens ──
import JobDetailScreen from "../screens/main/JobDetailScreen";
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
import BookingsScreen from "../screens/main/BookingsScreen";

import PlaceholderScreen from "../screens/main/PlaceholderScreen";
import WorkerSavedJobsScreen from "../screens/main/worker/WorkerSavedJobsScreen";
import WorkerCompletedJobsScreen from "../screens/main/worker/WorkerCompletedJobsScreen";
import WorkerRetainedEmployersScreen from "../screens/main/worker/WorkerRetainedEmployersScreen";
import WorkerRetainedEmployerDetailScreen from "../screens/main/worker/WorkerRetainedEmployerDetailScreen";
import WorkerRetainedEarningsScreen from "../screens/main/worker/WorkerRetainedEarningsScreen";
import WorkerRetainedCyclesScreen from "../screens/main/worker/WorkerRetainedCyclesScreen";
import CommunityFeedScreen from "../screens/main/CommunityFeedScreen";
import SupportHubScreen from "../screens/main/SupportHubScreen";

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();
const ScrollContext = React.createContext(null);

// ════════════════════════════════════════════════════════════════════════
// Floating Tab Bar
// ════════════════════════════════════════════════════════════════════════
function FloatingTabBar() {
  const { theme, effectiveMode } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const [activeRoute, setActiveRoute] = useState("Dashboard");
  const scrollY = React.useContext(ScrollContext);
  const translateY = useRef(new Animated.Value(0)).current;
  const scrollState = useRef({
    lastOffset: 0,
    lastTime: Date.now(),
    isHidden: false,
  });

  // ── Tab layout measurements ────────────────────────────────────────────
  // Each tab records its x position (in the parent row) and width, so the
  // sliding highlight can animate to the correct slot. Measured via
  // onLayout on the row-level View — no extra wrapper needed per tab.
  const tabLayouts = useRef({}); // { [tab.name]: { x, width } }

  // Animated value that drives the highlight's translateX.
  const highlightX = useRef(new Animated.Value(0)).current;
  // Same value as a plain number, so we can read it synchronously when
  // computing target offsets without depending on async listeners.
  const highlightXNum = useRef(0);
  useEffect(() => {
    const id = highlightX.addListener(({ value }) => {
      highlightXNum.current = value;
    });
    return () => highlightX.removeListener(id);
  }, [highlightX]);

  // Animated value for the highlight width (some tabs may have a
  // different icon size and hence different widths).
  const highlightW = useRef(new Animated.Value(40)).current;

  // How far the highlight has to travel each time the active route
  // changes. Recomputed whenever either the active route or the tab
  // layouts change.
  const animateTo = useCallback(
    (routeName, animated = true) => {
      const layout = tabLayouts.current[routeName];
      if (!layout) return;
      const targetX = layout.x;
      const targetW = layout.width;
      if (animated) {
        Animated.parallel([
          Animated.spring(highlightX, {
            toValue: targetX,
            useNativeDriver: false,
            friction: 12,
            tension: 90,
          }),
          Animated.spring(highlightW, {
            toValue: targetW,
            useNativeDriver: false,
            friction: 12,
            tension: 90,
          }),
        ]).start();
      } else {
        highlightX.setValue(targetX);
        highlightW.setValue(targetW);
      }
    },
    [highlightX, highlightW],
  );

  // ── Scroll hide-on-scroll effect (unchanged) ───────────────────────────
  useEffect(() => {
    if (!scrollY) return;
    const listener = scrollY.addListener(({ value }) => {
      const now = Date.now();
      const timeDelta = now - scrollState.current.lastTime;
      const scrollDelta = value - scrollState.current.lastOffset;
      if (scrollDelta === 0 || timeDelta < 8) {
        scrollState.current.lastOffset = value;
        return;
      }
      const velocity = scrollDelta / timeDelta;
      if (value <= 15) {
        if (scrollState.current.isHidden) {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 180,
            useNativeDriver: true,
          }).start();
          scrollState.current.isHidden = false;
        }
      } else if (scrollDelta > 0 && value > 20) {
        if (!scrollState.current.isHidden) {
          Animated.timing(translateY, {
            toValue: 120,
            duration: 180,
            useNativeDriver: true,
          }).start();
          scrollState.current.isHidden = true;
        }
      } else if (
        scrollDelta < 0 &&
        scrollState.current.isHidden &&
        Math.abs(velocity) >= 1.2
      ) {
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
        scrollState.current.isHidden = false;
      }
      scrollState.current.lastOffset = value;
      scrollState.current.lastTime = now;
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY, translateY]);

  // ── Route tracking effect (unchanged) ──────────────────────────────────
  useEffect(() => {
    const getTopmostRouteName = (state) => {
      if (!state) return null;
      const route = state.routes?.[state.index ?? state.routes.length - 1];
      if (!route) return null;
      if (route.state) {
        const inner = getTopmostRouteName(route.state);
        if (inner) return inner;
      }
      return route.name;
    };

    const unsub = navigationRef.addListener("state", () => {
      const state = navigationRef.getRootState();
      const top = getTopmostRouteName(state);
      setActiveRoute(top || "Dashboard");
      scrollState.current.isHidden = false;
      scrollState.current.lastOffset = 0;
      translateY.setValue(0);
    });
    return unsub;
  }, [translateY]);

  // ── Slide the highlight whenever activeRoute or layouts change ─────────
  const isTabRoute = (name) =>
    name === "Dashboard" ||
    name === "WorkerBookings" ||
    name === "WorkerJobs" ||
    name === "WorkerApplications" ||
    name === "WorkerWithdrawals" ||
    name === "WorkerEmployers";

  const [layoutsReady, setLayoutsReady] = useState(0);

  useEffect(() => {
    if (!isTabRoute(activeRoute)) return;
    // animateTo returns early if the layout hasn't been measured yet;
    // layoutsReady in the deps ensures we retry once they land.
    animateTo(activeRoute, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoute, layoutsReady]);

  const tabs = [
    { name: "Dashboard", icon: "home-outline" },
    { name: "WorkerBookings", icon: "calendar-outline" },
    { name: "WorkerJobs", icon: "search-outline" },
    { name: "WorkerApplications", icon: "document-text-outline" },
    { name: "WorkerWithdrawals", icon: "wallet-outline" },
    { name: "WorkerEmployers", icon: "briefcase-outline" },
  ];

  const isDark = effectiveMode !== "light";
  const highlightVisible = isTabRoute(activeRoute);

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
      <BlurView
        intensity={isDark ? 30 : 45}
        tint={isDark ? "dark" : "light"}
        experimentalBlurMethod="dimezisBlurView"
        style={[
          styles.glassBar,
          {
            backgroundColor: isDark
              ? "rgba(20,20,30,0.35)"
              : "rgba(255,255,255,0.35)",
            borderColor: isDark
              ? "rgba(255,255,255,0.18)"
              : "rgba(255,255,255,0.6)",
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.glassHighlight,
            {
              backgroundColor: isDark
                ? "rgba(255,255,255,0.15)"
                : "rgba(255,255,255,0.75)",
            },
          ]}
        />
        <View style={styles.tabRow}>
          {/* Sliding highlight — a single animated pill positioned
              absolutely behind the tab icons. It follows the current
              active tab by animating translateX and width. Hidden when
              the current top-of-stack route isn't one of the six tabs. */}
          {highlightVisible && (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.activePill,
                {
                  position: "absolute",
                  top: "50%",
                  marginTop: -14,
                  left: 0,
                  backgroundColor: c.orangeDim,
                  borderColor: "rgba(249, 115, 22, 0.5)",
                  transform: [{ translateX: highlightX }],
                  width: highlightW,
                },
              ]}
            />
          )}
          {tabs.map((tab) => {
            const isFocused = activeRoute === tab.name;
            const activeIcon = tab.icon.replace("-outline", "");
            return (
              <Pressable
                key={tab.name}
                onPress={() => {
                  try {
                    navigationRef.navigate("WorkerHome", {
                      screen: tab.name,
                    });
                  } catch {
                    navigationRef.navigate(tab.name);
                  }
                }}
                onLayout={(e) => {
                  const { x, width } = e.nativeEvent.layout;
                  tabLayouts.current[tab.name] = { x, width };
                  // Force the highlight effect to retry once all layouts
                  // are measured.
                  setLayoutsReady((n) => n + 1);
                  // If this is the initially active tab and its layout
                  // just landed, snap the highlight into place without
                  // animation so it doesn't fly in from x=0.
                  if (
                    tab.name === activeRoute &&
                    highlightXNum.current === 0 &&
                    highlightW._value === 40
                  ) {
                    highlightX.setValue(x);
                    highlightW.setValue(width);
                  }
                }}
                style={({ pressed }) => [
                  styles.tabItem,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Ionicons
                  name={isFocused ? activeIcon : tab.icon}
                  size={18}
                  color={
                    isFocused
                      ? c.orange
                      : isDark
                        ? "rgba(255,255,255,0.85)"
                        : "rgba(20,20,30,0.75)"
                  }
                />
              </Pressable>
            );
          })}
        </View>
      </BlurView>
    </Animated.View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Screen With Chrome Wrapper
// ════════════════════════════════════════════════════════════════════════
function ScreenWithChrome({ Screen, title, subtitle }) {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const scrollY = useRef(new Animated.Value(0)).current;

  return (
    <ScrollContext.Provider value={scrollY}>
      <View style={[styles.shell, { backgroundColor: theme.colors.bg }]}>
        <TopBar navigation={navigation} title={title} subtitle={subtitle} />
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

// ════════════════════════════════════════════════════════════════════════
// Screen With Stack Chrome
// Used by Stack screens (BookingDetail, HirerPublicProfile, etc.) so they
// render the FloatingTabBar at the bottom — matching the hirer side where
// every non-chat screen shows the pill. The TopBar is rendered by the
// Stack.Navigator via the `header` option, so this wrapper only adds the
// floating bar over the screen content.
// ════════════════════════════════════════════════════════════════════════
function ScreenWithStackChrome({ Screen }) {
  const navigation = useNavigation();
  const route = useRoute();
  return (
    <View style={{ flex: 1 }}>
      <Screen navigation={navigation} route={route} />
      <FloatingTabBar />
    </View>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Drawer
// ════════════════════════════════════════════════════════════════════════
function WorkerDrawer() {
  const { unreadNotifs, unreadMessages } = useUnread();
  const { t } = useTranslation();

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <WorkerDrawerContent
          {...props}
          unreadNotifications={unreadNotifs}
          unreadMessages={unreadMessages}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerType: "front",
        overlayColor: "rgba(0,0,0,0.7)",
        drawerStyle: { width: "80%", backgroundColor: "transparent" },
      }}
    >
      {/* 1. Overview */}
      <Drawer.Screen name="Dashboard">
        {() => (
          <ScreenWithChrome
            Screen={WorkerDashboardScreen}
            title={t("screenTitles.dashboard.title")}
            subtitle={t("screenTitles.dashboard.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerBookings">
        {() => (
          <ScreenWithChrome
            Screen={BookingsScreen}
            title={t("screenTitles.workerBookings.title")}
            subtitle={t("screenTitles.workerBookings.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerJobs">
        {() => (
          <ScreenWithChrome
            Screen={WorkerJobsScreen}
            title={t("screenTitles.workerJobs.title")}
            subtitle={t("screenTitles.workerJobs.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerSavedJobs">
        {() => (
          <ScreenWithChrome
            Screen={WorkerSavedJobsScreen}
            title={t("screenTitles.workerSavedJobs.title")}
            subtitle={t("screenTitles.workerSavedJobs.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerApplications">
        {() => (
          <ScreenWithChrome
            Screen={WorkerApplicationsScreen}
            title={t("screenTitles.workerApplications.title")}
            subtitle={t("screenTitles.workerApplications.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerCategories">
        {() => (
          <ScreenWithChrome
            Screen={WorkerCategoriesScreen}
            title={t("screenTitles.workerCategories.title")}
            subtitle={t("screenTitles.workerCategories.subtitle")}
          />
        )}
      </Drawer.Screen>

      {/* 2. Finances & History */}
      <Drawer.Screen name="WorkerEarnings">
        {() => (
          <ScreenWithChrome
            Screen={WorkerEarningsScreen}
            title={t("screenTitles.workerEarnings.title")}
            subtitle={t("screenTitles.workerEarnings.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerWithdrawals">
        {() => (
          <ScreenWithChrome
            Screen={WorkerWithdrawalsScreen}
            title={t("screenTitles.workerWithdrawals.title")}
            subtitle={t("screenTitles.workerWithdrawals.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="RefundHistory">
        {() => (
          <ScreenWithChrome
            Screen={RefundHistoryScreen}
            title={t("screenTitles.refundHistory.title")}
            subtitle={t("screenTitles.refundHistory.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerCompletedJobs">
        {() => (
          <ScreenWithChrome
            Screen={WorkerCompletedJobsScreen}
            title={t("screenTitles.workerCompletedJobs.title")}
            subtitle={t("screenTitles.workerCompletedJobs.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerEmployers">
        {() => (
          <ScreenWithChrome
            Screen={WorkerRetainedEmployersScreen}
            title={t("screenTitles.workerEmployers.title")}
            subtitle={t("screenTitles.workerEmployers.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerRetainedEarnings">
        {() => (
          <ScreenWithChrome
            Screen={WorkerRetainedEarningsScreen}
            title={t("screenTitles.workerRetainedEarnings.title")}
            subtitle={t("screenTitles.workerRetainedEarnings.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerRetainedCycles">
        {() => (
          <ScreenWithChrome
            Screen={WorkerRetainedCyclesScreen}
            title={t("screenTitles.workerRetainedCycles.title")}
            subtitle={t("screenTitles.workerRetainedCycles.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerDisputes">
        {() => (
          <ScreenWithChrome
            Screen={DisputesScreen}
            title={t("screenTitles.workerDisputes.title")}
            subtitle={t("screenTitles.workerDisputes.subtitle")}
          />
        )}
      </Drawer.Screen>

      {/* 3. Profile */}
      <Drawer.Screen name="WorkerPortfolio">
        {() => (
          <ScreenWithChrome
            Screen={WorkerPortfolioScreen}
            title={t("screenTitles.workerPortfolio.title")}
            subtitle={t("screenTitles.workerPortfolio.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerCertifications">
        {() => (
          <ScreenWithChrome
            Screen={WorkerCertificationsScreen}
            title={t("screenTitles.workerCertifications.title")}
            subtitle={t("screenTitles.workerCertifications.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerAvailability">
        {() => (
          <ScreenWithChrome
            Screen={WorkerAvailabilityScreen}
            title={t("screenTitles.workerAvailability.title")}
            subtitle={t("screenTitles.workerAvailability.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerVerification">
        {() => (
          <ScreenWithChrome
            Screen={VerificationScreen}
            title={t("screenTitles.workerVerification.title")}
            subtitle={t("screenTitles.workerVerification.subtitle")}
          />
        )}
      </Drawer.Screen>

      {/* 4. Community & Growth */}
      <Drawer.Screen name="WorkerCommunityFeed">
        {() => (
          <ScreenWithChrome
            Screen={CommunityFeedScreen}
            title={t("screenTitles.workerCommunityFeed.title")}
            subtitle={t("screenTitles.workerCommunityFeed.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="MyPosts">
        {() => (
          <ScreenWithChrome
            Screen={MyPostsScreen}
            title={t("screenTitles.myPosts.title")}
            subtitle={t("screenTitles.myPosts.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Campaign">
        {() => (
          <ScreenWithChrome
            Screen={CampaignDashboardScreen}
            title={t("screenTitles.campaign.title")}
            subtitle={t("screenTitles.campaign.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="ReferralDashboard">
        {() => (
          <ScreenWithChrome
            Screen={ReferralDashboardScreen}
            title={t("screenTitles.referralDashboard.title")}
            subtitle={t("screenTitles.referralDashboard.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="MyReports">
        {() => (
          <ScreenWithChrome
            Screen={MyReportsScreen}
            title={t("screenTitles.myReports.title")}
            subtitle={t("screenTitles.myReports.subtitle")}
          />
        )}
      </Drawer.Screen>

      {/* 5. Account & Support */}
      <Drawer.Screen name="WorkerReviews">
        {() => (
          <ScreenWithChrome
            Screen={WorkerReviewsScreen}
            title={t("screenTitles.workerReviews.title")}
            subtitle={t("screenTitles.workerReviews.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Messages">
        {() => (
          <ScreenWithChrome
            Screen={MessagesScreen}
            title={t("screenTitles.messages.title")}
            subtitle={t("screenTitles.messages.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerSupportChat">
        {() => (
          <ScreenWithChrome
            Screen={SupportChatScreen}
            title={t("screenTitles.workerSupportChat.title")}
            subtitle={t("screenTitles.workerSupportChat.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerSupportHub">
        {() => (
          <ScreenWithChrome
            Screen={SupportHubScreen}
            title={t("screenTitles.workerSupportHub.title")}
            subtitle={t("screenTitles.workerSupportHub.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Notifications">
        {() => (
          <ScreenWithChrome
            Screen={NotificationsScreen}
            title={t("screenTitles.notifications.title")}
            subtitle={t("screenTitles.notifications.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerSubscriptions">
        {() => (
          <ScreenWithChrome
            Screen={SubscriptionsScreen}
            title={t("screenTitles.workerSubscriptions.title")}
            subtitle={t("screenTitles.workerSubscriptions.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="Settings">
        {() => (
          <ScreenWithChrome
            Screen={SettingsScreen}
            title={t("screenTitles.settings.title")}
            subtitle={t("screenTitles.settings.subtitle")}
          />
        )}
      </Drawer.Screen>

      {/* Extra screens not in drawer but used elsewhere */}
      <Drawer.Screen name="WorkerProfile">
        {() => (
          <ScreenWithChrome
            Screen={WorkerProfileScreen}
            title={t("screenTitles.workerProfile.title")}
            subtitle={t("screenTitles.workerProfile.subtitle")}
          />
        )}
      </Drawer.Screen>
      <Drawer.Screen name="WorkerBoost">
        {() => (
          <ScreenWithChrome
            Screen={FeaturedBoostScreen}
            title={t("screenTitles.workerBoost.title")}
            subtitle={t("screenTitles.workerBoost.subtitle")}
          />
        )}
      </Drawer.Screen>
    </Drawer.Navigator>
  );
}

// ════════════════════════════════════════════════════════════════════════
// Stack
// ════════════════════════════════════════════════════════════════════════
function WorkerStack() {
  const { t } = useTranslation();
  const { unreadNotifs, unreadMessages } = useUnread();

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
    PostDetail: { title: t("nav.myPosts"), subtitle: t("screenSub.community") },
    RefundDetail: { title: t("nav.refunds"), subtitle: t("screenSub.refunds") },
    MyDisputes: { title: t("nav.disputes"), subtitle: t("screenSub.disputes") },
    EditProfile: {
      title: t("profile.editProfile"),
      subtitle: t("screenSub.myProfile"),
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator
        screenOptions={({ route }) => {
          if (route.name === "WorkerHome") return { headerShown: false };

          // Chat surfaces: chrome-free — no TopBar. Matches the hirer side.
          if (
            route.name === "Chat" ||
            route.name === "SupportChat" ||
            route.name === "SupportTicketThread"
          ) {
            return { headerShown: false };
          }

          // VideoCall: chrome-free, full-screen modal. Matches the hirer side.
          if (route.name === "VideoCall") {
            return { headerShown: false, presentation: "fullScreenModal" };
          }

          // All other stack screens: TopBar header (this is the worker-only
          // difference from the hirer drawer — the worker has real pushed
          // stack screens with a back button). The FloatingTabBar is added
          // by ScreenWithStackChrome inside each Screen registration below.
          const m = STACK_META[route.name] ?? { title: route.name };
          return {
            headerShown: true,
            header: () => (
              <TopBar
                title={m.title}
                subtitle={m.subtitle}
                showBack
                unreadCount={unreadNotifs}
                unreadMessages={unreadMessages}
              />
            ),
          };
        }}
      >
        <Stack.Screen name="WorkerHome" component={WorkerDrawer} />

        {/* Non-chat stack screens — TopBar + FloatingTabBar. */}
        <Stack.Screen name="BookingDetail">
          {() => <ScreenWithStackChrome Screen={BookingDetailScreen} />}
        </Stack.Screen>
        <Stack.Screen name="HirerPublicProfile">
          {() => <ScreenWithStackChrome Screen={HirerPublicProfileScreen} />}
        </Stack.Screen>
        <Stack.Screen name="WorkerJobDetail">
          {() => <ScreenWithStackChrome Screen={JobDetailScreen} />}
        </Stack.Screen>
        <Stack.Screen name="PostDetail">
          {() => <ScreenWithStackChrome Screen={PostDetailScreen} />}
        </Stack.Screen>
        <Stack.Screen name="RefundDetail">
          {() => <ScreenWithStackChrome Screen={RefundDetailScreen} />}
        </Stack.Screen>
        <Stack.Screen name="MyDisputes">
          {() => <ScreenWithStackChrome Screen={MyDisputesScreen} />}
        </Stack.Screen>
        <Stack.Screen name="EditProfile">
          {() => <ScreenWithStackChrome Screen={EditProfileScreen} />}
        </Stack.Screen>
        <Stack.Screen
          name="WorkerRetainedEmployerDetail"
          options={{ headerShown: false }}
        >
          {() => (
            <ScreenWithStackChrome
              Screen={WorkerRetainedEmployerDetailScreen}
            />
          )}
        </Stack.Screen>

        {/* Chat surfaces — chrome-free, exactly like the hirer side. */}
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SupportChat"
          component={SupportChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="SupportTicketThread"
          component={SupportTicketThreadScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VideoCall"
          component={VideoCallScreen}
          options={{ headerShown: false, presentation: "fullScreenModal" }}
        />
      </Stack.Navigator>
    </View>
  );
}

export default function WorkerNavigator() {
  return (
    <UnreadProvider>
      <WorkerStack />
    </UnreadProvider>
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
  glassBar: {
    width: "92%",
    maxWidth: 420,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  glassHighlight: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    paddingHorizontal: 16,
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
