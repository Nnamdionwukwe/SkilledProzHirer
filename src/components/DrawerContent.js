// src/components/DrawerContent.js
import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import SkilledProzWordmark from "./SkilledProzWordmark";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAuthStore } from "../store/authStore";

// ─── Nav groups (label keys reference t("nav.*")) ────────────────────────────
const NAV_GROUPS = [
  {
    labelKey: "nav.main",
    items: [
      { name: "Dashboard", labelKey: "nav.dashboard", icon: "grid-outline" },
      { name: "Bookings", labelKey: "nav.bookings", icon: "briefcase-outline" },
      {
        name: "PostJob",
        labelKey: "Post Job",
        icon: "add-circle-outline",
      },
      {
        name: "JobsManagement",
        labelKey: "nav.jobsManagement",
        icon: "document-text-outline",
      },
      { name: "MyPosts", labelKey: "nav.myPosts", icon: "newspaper-outline" },
      {
        name: "PaymentHistory",
        labelKey: "nav.paymentHistory",
        icon: "card-outline",
      },
      {
        name: "Disputes",
        labelKey: "nav.disputes",
        icon: "shield-half-outline",
      },
    ],
  },
  {
    labelKey: "nav.workers",
    items: [
      {
        name: "SavedWorkers",
        labelKey: "nav.savedWorkers",
        icon: "bookmark-outline",
      },
      {
        name: "BrowseWorkers",
        labelKey: "nav.browseWorkers",
        icon: "search-outline",
      },
      {
        name: "BrowseByCategories",
        labelKey: "nav.browseByCategories",
        icon: "construct-outline",
      },
      {
        name: "Messages",
        labelKey: "nav.messages",
        icon: "chatbubbles-outline",
      },
    ],
  },
  {
    labelKey: "nav.reviews",
    items: [
      {
        name: "ReviewsReceived",
        labelKey: "nav.reviewsReceived",
        icon: "star-outline",
      },
      {
        name: "ReviewsGiven",
        labelKey: "nav.reviewsGiven",
        icon: "pencil-outline",
      },
    ],
  },
  {
    labelKey: "nav.community",
    items: [
      {
        name: "CommunityFeed",
        labelKey: "nav.communityFeed",
        icon: "people-outline",
      },
    ],
  },
  {
    labelKey: "nav.account",
    items: [
      {
        name: "Notifications",
        labelKey: "nav.notifications",
        icon: "notifications-outline",
      },
      {
        name: "Verification",
        labelKey: "nav.verification",
        icon: "shield-checkmark-outline",
      },
      {
        name: "ReferralDashboard",
        labelKey: "nav.referralDashboard",
        icon: "share-outline",
      },
      {
        name: "Campaign",
        labelKey: "nav.Campaign",
        icon: "ribbon-outline",
      },
      {
        name: "MyReports",
        labelKey: "nav.MyReports",
        icon: "document-text-outline",
      },
    ],
  },
  {
    labelKey: "nav.subscriptionsFeatures",
    items: [
      {
        name: "Subscriptions",
        labelKey: "nav.subscriptions",
        icon: "diamond-outline",
      },
      {
        name: "FeaturedBoost",
        labelKey: "nav.boostListing",
        icon: "rocket-outline",
      },
    ],
  },
];

export default function DrawerContent({ state }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const c = th.colors;
  const activeRouteName = state?.routes?.[state.index]?.name;

  const goTo = (name) => navigation.navigate(name);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast.error(t("toast.unknownError"));
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bgPanel }]}>
      {/* ── STATIC: Logo ─────────────────────────────────────────── */}
      <View style={[styles.logoRow, { borderBottomColor: c.border }]}>
        <SkilledProzWordmark width={120} height={20} />
        <AppText variant="small" tone="dim" style={styles.portalLabel}>
          {t("nav.hirerPortal")}
        </AppText>
      </View>

      {/* ── STATIC: User card ────────────────────────────────────── */}
      <Pressable
        onPress={() => goTo("Profile")}
        style={[styles.userCard, { borderBottomColor: c.border }]}
      >
        <View style={[styles.avatarWrap, { borderColor: c.orange }]}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <Ionicons name="person" size={28} color={c.textMuted} />
          )}
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {user?.firstName} {user?.lastName}
          </AppText>
          <View style={[styles.roleBadge, { backgroundColor: c.orange }]}>
            <View style={styles.roleDot} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: "#fff" }}
            >
              Hirer
            </AppText>
          </View>
        </View>
      </Pressable>

      {/* ── SCROLLABLE: Nav groups ────────────────────────────────── */}
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {NAV_GROUPS.map((group) => (
          <View key={group.labelKey} style={styles.group}>
            <AppText
              variant="small"
              weight="semibold"
              tone="dim"
              style={styles.groupLabel}
            >
              {t(group.labelKey)}
            </AppText>
            {group.items.map((item) => {
              const active = activeRouteName === item.name;
              return (
                <Pressable
                  key={item.name}
                  onPress={() => goTo(item.name)}
                  style={({ pressed }) => [
                    styles.navItem,
                    active && { backgroundColor: c.orangeDim },
                    pressed && !active && { backgroundColor: c.bgCard },
                  ]}
                >
                  {active && (
                    <View
                      style={[
                        styles.activeAccent,
                        { backgroundColor: c.orange },
                      ]}
                    />
                  )}
                  <Ionicons
                    name={item.icon}
                    size={18}
                    color={active ? c.orange : c.textMuted}
                    style={{ marginRight: 12 }}
                  />
                  <AppText
                    variant="body"
                    weight={active ? "semibold" : "regular"}
                    style={{ color: active ? c.orange : c.text }}
                  >
                    {t(item.labelKey)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ))}

        {/* Settings */}
        <View style={[styles.group, { marginTop: 4 }]}>
          {(() => {
            const active = activeRouteName === "Settings";
            return (
              <Pressable
                onPress={() => goTo("Settings")}
                style={({ pressed }) => [
                  styles.navItem,
                  active && { backgroundColor: c.orangeDim },
                  pressed && !active && { backgroundColor: c.bgCard },
                ]}
              >
                {active && (
                  <View
                    style={[styles.activeAccent, { backgroundColor: c.orange }]}
                  />
                )}
                <Ionicons
                  name="settings-outline"
                  size={18}
                  color={active ? c.orange : c.textMuted}
                  style={{ marginRight: 12 }}
                />
                <AppText
                  variant="body"
                  weight={active ? "semibold" : "regular"}
                  style={{ color: active ? c.orange : c.text }}
                >
                  {t("nav.settings")}
                </AppText>
              </Pressable>
            );
          })()}
        </View>
      </ScrollView>

      {/* ── STATIC: Log out ──────────────────────────────────────── */}
      <Pressable
        onPress={handleLogout}
        style={[styles.logoutBtn, { borderTopColor: c.border }]}
      >
        <Ionicons
          name="log-out-outline"
          size={18}
          color={c.textMuted}
          style={{ marginRight: 12 }}
        />
        <AppText variant="body" tone="dim">
          {t("nav.logout")}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  logoRow: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  portalLabel: { marginTop: 4, letterSpacing: 0.8 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: { width: "100%", height: "100%" },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 4,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
    marginRight: 5,
  },
  scroll: { paddingBottom: 16 },
  group: { marginTop: 16, paddingHorizontal: 12 },
  groupLabel: { paddingHorizontal: 8, marginBottom: 4, letterSpacing: 0.8 },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 10,
    position: "relative",
  },
  activeAccent: {
    position: "absolute",
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
