// src/components/WorkerDrawerContent.js
// All strings via t() — no hardcoded English.

import React, { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAuthStore } from "../store/authStore";
import client from "../api/client";

// ─── Menu item ────────────────────────────────────────────────────────────────
function MenuItem({ icon, label, active, badge, c, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.menuItem,
        active && {
          backgroundColor: c.orangeDim,
          borderLeftColor: c.orange,
          borderLeftWidth: 3,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={active ? c.orange : c.textMuted}
        style={{ width: 24 }}
      />
      <AppText
        variant="body"
        weight={active ? "semibold" : "regular"}
        style={[s.menuLabel, { color: active ? c.orange : c.text }]}
      >
        {label}
      </AppText>
      {badge > 0 && (
        <View style={[s.badge, { backgroundColor: c.orange }]}>
          <AppText style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
            {badge > 99 ? "99+" : badge}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionLabel({ label, c }) {
  return (
    <AppText
      variant="small"
      weight="semibold"
      style={[s.sectionLabel, { color: c.textMuted }]}
    >
      {label}
    </AppText>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WorkerDrawerContent(props) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const c = theme.colors;

  const [isAvailable, setIsAvailable] = useState(true);
  const [togglingAvail, setTogglingAvail] = useState(false);

  const activeRoute =
    props.state?.routes?.[props.state.index]?.name ?? "Dashboard";

  const goTo = (screen) => {
    props.navigation.navigate(screen);
    props.navigation.closeDrawer();
  };

  const handleToggleAvailability = async (value) => {
    setIsAvailable(value);
    setTogglingAvail(true);
    try {
      await client.put("/workers/profile", { isAvailable: value });
    } catch {
      setIsAvailable(!value);
      toast.error(t("nav.failedAvailability"));
    } finally {
      setTogglingAvail(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      /* authStore clears local state regardless */
    }
  };

  const notifCount = props.unreadNotifications ?? 0;

  return (
    <View style={[s.root, { backgroundColor: c.bgPanel }]}>
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <View style={[s.header, { borderBottomColor: c.border }]}>
        <View style={s.logoRow}>
          <AppText weight="displayBlack" style={s.logoSkilled}>
            Skilled
          </AppText>
          <AppText
            weight="displayBlack"
            style={[s.logoProz, { color: c.orange }]}
          >
            Proz
          </AppText>
        </View>
        <AppText
          variant="small"
          weight="semibold"
          style={[s.portalLabel, { color: c.textMuted }]}
        >
          {t("nav.workerPortal")}
        </AppText>

        <View style={s.userCard}>
          <Pressable onPress={() => goTo("WorkerProfile")}>
            <View
              style={[
                s.avatar,
                { backgroundColor: c.bgCard, borderColor: c.orange },
              ]}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={s.avatarImg} />
              ) : (
                <AppText
                  variant="title"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AppText>
              )}
            </View>
          </Pressable>
          <View style={{ marginLeft: 12 }}>
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              {user?.firstName} {user?.lastName}
            </AppText>
            <View
              style={[
                s.activeBadge,
                {
                  backgroundColor: "rgba(34,197,94,0.15)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              <View style={s.activeDot} />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: "#22c55e" }}
              >
                {t("nav.activeWorker")}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      {/* ── MENU ──────────────────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.menu}
      >
        <SectionLabel label={t("nav.overview")} c={c} />
        <MenuItem
          icon="diamond-outline"
          label={t("nav.dashboard")}
          active={activeRoute === "Dashboard"}
          c={c}
          onPress={() => goTo("Dashboard")}
        />
        <MenuItem
          icon="calendar-outline"
          label={t("nav.myBookings")}
          active={activeRoute === "WorkerBookings"}
          c={c}
          onPress={() => goTo("WorkerBookings")}
        />
        <MenuItem
          icon="construct-outline"
          label={t("nav.categories")}
          active={activeRoute === "WorkerCategories"}
          c={c}
          onPress={() => goTo("WorkerCategories")}
        />
        <MenuItem
          icon="search-outline"
          label={t("nav.browseJobs")}
          active={activeRoute === "WorkerJobs"}
          c={c}
          onPress={() => goTo("WorkerJobs")}
        />
        <MenuItem
          icon="document-text-outline"
          label={t("nav.myApplications")}
          active={activeRoute === "WorkerApplications"}
          c={c}
          onPress={() => goTo("WorkerApplications")}
        />
        <MenuItem
          icon="newspaper-outline"
          label={t("nav.myPosts")}
          active={activeRoute === "MyPosts"}
          c={c}
          onPress={() => goTo("MyPosts")}
        />
        <MenuItem
          icon="scale-outline"
          label={t("nav.disputes")}
          active={activeRoute === "WorkerDisputes"}
          c={c}
          onPress={() => goTo("WorkerDisputes")}
        />

        <SectionLabel label={t("nav.payouts")} c={c} />
        <MenuItem
          icon="card-outline"
          label={t("nav.earnings")}
          active={activeRoute === "WorkerEarnings"}
          c={c}
          onPress={() => goTo("WorkerEarnings")}
        />
        <MenuItem
          icon="arrow-up-outline"
          label={t("nav.wallet")}
          active={activeRoute === "WorkerWithdrawals"}
          c={c}
          onPress={() => goTo("WorkerWithdrawals")}
        />
        <MenuItem
          icon="people-outline"
          label={t("nav.referralDashboard")}
          active={activeRoute === "ReferralDashboard"}
          c={c}
          onPress={() => goTo("ReferralDashboard")}
        />
        <MenuItem
          icon="ribbon-outline"
          label={t("nav.campaign")}
          active={activeRoute === "Campaign"}
          c={c}
          onPress={() => goTo("Campaign")}
        />
        <MenuItem
          icon="document-text-outline"
          label={t("nav.myreports")}
          active={activeRoute === "MyReports"}
          c={c}
          onPress={() => goTo("MyReports")}
        />

        <SectionLabel label={t("nav.profileSection")} c={c} />
        <MenuItem
          icon="person-outline"
          label={t("profile.myProfile")}
          active={activeRoute === "WorkerProfile"}
          c={c}
          onPress={() => goTo("WorkerProfile")}
        />
        <MenuItem
          icon="images-outline"
          label={t("workerProfile.portfolio")}
          active={activeRoute === "WorkerPortfolio"}
          c={c}
          onPress={() => goTo("WorkerPortfolio")}
        />
        <MenuItem
          icon="ribbon-outline"
          label={t("workerProfile.certifications")}
          active={activeRoute === "WorkerCertifications"}
          c={c}
          onPress={() => goTo("WorkerCertifications")}
        />
        <MenuItem
          icon="calendar-number-outline"
          label={t("workerProfile.availability")}
          active={activeRoute === "WorkerAvailability"}
          c={c}
          onPress={() => goTo("WorkerAvailability")}
        />
        <MenuItem
          icon="shield-half-outline"
          label={t("nav.verification")}
          active={activeRoute === "WorkerVerification"}
          c={c}
          onPress={() => goTo("WorkerVerification")}
        />

        <SectionLabel label={t("nav.inbox")} c={c} />
        <MenuItem
          icon="star-outline"
          label={t("workerReviews.title")}
          active={activeRoute === "WorkerReviews"}
          c={c}
          onPress={() => goTo("WorkerReviews")}
        />
        <MenuItem
          icon="notifications-outline"
          label={t("nav.notifications")}
          active={activeRoute === "Notifications"}
          c={c}
          badge={notifCount}
          onPress={() => goTo("Notifications")}
        />
        <MenuItem
          icon="chatbubble-outline"
          label={t("nav.messages")}
          active={activeRoute === "Messages"}
          c={c}
          onPress={() => goTo("Messages")}
        />

        <SectionLabel label={t("nav.subscriptionsFeatures")} c={c} />
        <MenuItem
          icon="diamond-outline"
          label={t("nav.subscriptions")}
          active={activeRoute === "WorkerSubscriptions"}
          c={c}
          onPress={() => goTo("WorkerSubscriptions")}
        />
        <MenuItem
          icon="rocket-outline"
          label={t("nav.boostListing")}
          active={activeRoute === "WorkerBoost"}
          c={c}
          onPress={() => goTo("WorkerBoost")}
        />
        <MenuItem
          icon="settings-outline"
          label={t("nav.settings")}
          active={activeRoute === "Settings"}
          c={c}
          onPress={() => goTo("Settings")}
        />

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── BOTTOM ────────────────────────────────────────────────────────── */}
      <View style={[s.bottom, { borderTopColor: c.border }]}>
        <View
          style={[
            s.availRow,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={[
                s.availDot,
                { backgroundColor: isAvailable ? "#22c55e" : "#ef4444" },
              ]}
            />
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginLeft: 8 }}
            >
              {t("nav.available")}
            </AppText>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={handleToggleAvailability}
            disabled={togglingAvail}
            trackColor={{ false: "#3a3a3a", true: "#22c55e" }}
            thumbColor="#fff"
            ios_backgroundColor="#3a3a3a"
          />
        </View>

        <Pressable onPress={handleLogout} style={s.logoutRow}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: "#ef4444", marginLeft: 12 }}
          >
            {t("nav.logout")}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  logoRow: { flexDirection: "row", alignItems: "center" },
  logoSkilled: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "900",
    color: "#fff",
  },
  logoProz: { fontSize: 26, lineHeight: 30, fontWeight: "900" },
  portalLabel: { letterSpacing: 1.5, marginTop: 2, marginBottom: 16 },
  userCard: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 5,
  },
  menu: { paddingVertical: 12, paddingHorizontal: 12 },
  sectionLabel: {
    letterSpacing: 1.4,
    fontSize: 10,
    marginTop: 20,
    marginBottom: 4,
    marginLeft: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 1,
  },
  menuLabel: { flex: 1, marginLeft: 12 },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  bottom: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  availDot: { width: 10, height: 10, borderRadius: 5 },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
