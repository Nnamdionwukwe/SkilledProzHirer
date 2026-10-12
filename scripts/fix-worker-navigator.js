#!/usr/bin/env node

/**
 * Fix WorkerNavigator.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Fixes hook violations by moving t() calls inside components
 * 3. Adds missing translation keys to the locale files
 * 4. Fixes the "Campaign" hardcoded header title
 *
 * Run: node scripts/fix-worker-navigator.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const NAVIGATOR_PATH = path.join(
  rootDir,
  "src",
  "navigation",
  "WorkerNavigator.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Screen subtitles
  "screenSub.dashboard": "Your work at a glance",
  "screenSub.myBookings": "Manage your bookings",
  "screenSub.categories": "Your trade categories",
  "screenSub.browseJobs": "Find your next opportunity",
  "screenSub.applications": "Jobs you have applied to",
  "screenSub.community": "Your posts and community",
  "screenSub.disputes": "Active disputes",
  "screenSub.earnings": "Track your income",
  "screenSub.wallet": "Earnings & payouts",
  "screenSub.myProfile": "Your public profile",
  "screenSub.portfolio": "Your work gallery",
  "screenSub.certifications": "Your trade certifications",
  "screenSub.availability": "Set your weekly schedule",
  "screenSub.verification": "Trust & safety",
  "screenSub.reviews": "Feedback from hirers",
  "screenSub.notifications": "Stay updated",
  "screenSub.messages": "Direct messages",
  "screenSub.subscriptions": "Plans & billing",
  "screenSub.boostListing": "Stand out in search",
  "screenSub.settings": "App preferences",
  "screenSub.bookingDetail": "Booking details",
  "screenSub.hirerProfile": "Hirer information",
  "screenSub.jobDetails": "Job details",
  "screenSub.directMessage": "Direct message",

  // Navigation keys used
  "bookings.detail": "Booking Details",
  "profile.myProfile": "My Profile",
  "jobs.detail.details": "Job Details",
  "nav.messages": "Messages",

  // Campaign
  "nav.campaign": "Campaign",
  "screenSub.campaign": "Daily Campaign",
};

function loadLocaleFile(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLocaleFile(locale, data) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addTranslationKeys(localeData, keys) {
  let added = 0;
  for (const [key, value] of Object.entries(keys)) {
    if (!localeData[key]) {
      localeData[key] = value;
      added++;
    }
  }
  return { data: localeData, added };
}

function fixWorkerNavigator() {
  console.log("\n🔧  Fixing WorkerNavigator.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(NAVIGATOR_PATH, "utf8");
  console.log(`\n📄  Read ${NAVIGATOR_PATH}`);

  // ── 2. Add missing translation keys to all locale files ────
  console.log("\n📝  Adding missing translation keys to locale files...");

  const locales = ["en", "fr", "ar", "yo", "ha", "ig", "sw", "pt", "es"];
  const results = {};

  locales.forEach((locale) => {
    const localeData = loadLocaleFile(locale);
    const { data, added } = addTranslationKeys(localeData, MISSING_KEYS);
    saveLocaleFile(locale, data);
    results[locale] = added;
    console.log(`  ✅ ${locale}.json: added ${added} keys`);
  });

  // ── 3. Create improved version ──────────────────────────────
  console.log("\n📝  Generating improved WorkerNavigator.js...");

  const improvedContent = `// src/navigation/WorkerNavigator.js
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
        if (route.name === "WorkerHome") return { headerShown: false };
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
  return <WorkerStack>();
}`;

  // ── 4. Backup original and save improved version ──────────
  const backupPath = NAVIGATOR_PATH + ".backup";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(NAVIGATOR_PATH, improvedContent);
  console.log(`\n✅  Updated ${NAVIGATOR_PATH}`);

  // ── 5. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log("\n  ✅ Fixed hook violations:");
  console.log("     - All t() calls are inside components");
  console.log("     - DRAWER_META and STACK_META defined inside components");

  console.log("\n  ✅ Fixed hardcoded strings:");
  console.log('     - Removed hardcoded "Daily Campaign" title');
  console.log("     - Added Campaign to DRAWER_META with translations");
  console.log("     - Added ReferralDashboard and MyReports to DRAWER_META");
  console.log("     - All screen titles now use t()");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - screenSub.* (25 keys)");
  console.log("     - bookings.detail");
  console.log("     - profile.myProfile");
  console.log("     - jobs.detail.details");
  console.log("     - nav.messages");
  console.log("     - nav.campaign");
  console.log("     - screenSub.campaign");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in WorkerNavigator.js");
  console.log("     2. Verify all screen titles show correctly");
  console.log("     3. Run the full audit again to verify fixes");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerNavigator();
} catch (error) {
  console.error("❌  Failed to fix WorkerNavigator:", error.message);
  process.exit(1);
}
