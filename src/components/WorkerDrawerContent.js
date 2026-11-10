// src/components/WorkerDrawerContent.js
// Verbatim port of WorkerLayout.module.css sidebar + ConfirmationModal.
// Receives unreadNotifications + unreadMessages from WorkerNavigator.

import React, { useState, useEffect } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useAuthStore } from "../store/authStore";
import client from "../api/client";
import { rem, FONTS } from "../constants/theme";

// ── Menu item ────────────────────────────────────────────────────────────
function MenuItem({ icon, label, active, badge, c, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.navItem,
        active && { backgroundColor: c.orangeDim },
        pressed && !active && { backgroundColor: "rgba(255,255,255,0.04)" },
      ]}
    >
      {active && <View style={[s.activeBar, { backgroundColor: c.orange }]} />}
      <Ionicons
        name={icon}
        size={rem(0.9375)}
        color={active ? c.orange : c.textDim}
        style={{ width: 18, textAlign: "center" }}
      />
      <AppText
        style={{
          fontFamily: active ? FONTS.bodySemiBold : FONTS.bodyMedium,
          fontSize: rem(0.875),
          color: active ? c.orange : c.textDim,
          marginLeft: rem(0.75),
          flex: 1,
        }}
      >
        {label}
      </AppText>
      {badge > 0 && (
        <View style={[s.navBadge, { backgroundColor: c.orange }]}>
          <AppText
            style={{
              fontFamily: FONTS.body,
              fontSize: 10,
              fontWeight: "800",
              color: "#000",
              lineHeight: 11,
              includeFontPadding: false,
              textAlign: "center",
            }}
          >
            {badge > 99 ? "99+" : badge}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// ── Group label ──────────────────────────────────────────────────────────
function SectionLabel({ label, c }) {
  return (
    <AppText
      style={{
        fontFamily: FONTS.bodyBold,
        fontSize: rem(0.5625),
        letterSpacing: rem(0.5625) * 0.18,
        textTransform: "uppercase",
        color: c.textMuted,
        paddingHorizontal: rem(0.75),
        paddingTop: rem(0.5),
        paddingBottom: rem(0.375),
        marginBottom: rem(0.375),
      }}
    >
      {label}
    </AppText>
  );
}

// ── ConfirmationModal ────────────────────────────────────────────────────
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  c,
}) {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: rem(1),
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: c.bgPanel,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: rem(20 / 14),
            width: "100%",
            maxWidth: 420,
            padding: rem(1.8),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.3,
            shadowRadius: 32,
            elevation: 24,
          }}
        >
          <AppText
            style={{
              fontFamily: FONTS.displayBlack,
              fontSize: rem(1.25),
              fontWeight: "800",
              color: c.text,
              marginBottom: rem(0.5),
            }}
          >
            {title}
          </AppText>

          <AppText
            style={{
              fontFamily: FONTS.body,
              fontSize: rem(0.95),
              color: c.textDim,
              lineHeight: rem(0.95) * 1.6,
              marginBottom: rem(1.5),
            }}
          >
            {message}
          </AppText>

          <View style={{ flexDirection: "row", gap: rem(0.75) }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: rem(0.7),
                paddingHorizontal: rem(1),
                borderRadius: rem(10 / 14),
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.bgCard : "transparent",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <AppText
                style={{
                  fontFamily: FONTS.body,
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: c.textDim,
                }}
              >
                {cancelLabel}
              </AppText>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: rem(0.7),
                paddingHorizontal: rem(1),
                borderRadius: rem(10 / 14),
                backgroundColor: pressed ? (c.redHover ?? "#dc2626") : c.red,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <AppText
                style={{
                  fontFamily: FONTS.body,
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
export default function WorkerDrawerContent(props) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user, logout, updateUser } = useAuthStore();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const unreadNotifications = props.unreadNotifications ?? 0;
  const unreadMessages = props.unreadMessages ?? 0;

  const [togglingAvail, setTogglingAvail] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const activeRoute =
    props.state?.routes?.[props.state.index]?.name ?? "Dashboard";

  const goTo = (screen) => {
    props.navigation.navigate(screen);
    props.navigation.closeDrawer();
  };

  const handleToggleAvailability = async (value) => {
    // Instantly update the global store so both Drawer and Dashboard sync
    if (updateUser) updateUser({ isAvailable: value });

    setTogglingAvail(true);
    try {
      await client.put("/workers/profile", { isAvailable: value });
    } catch {
      // Revert on failure
      if (updateUser) updateUser({ isAvailable: !value });
      toast.error(t("nav.failedAvailability"));
    } finally {
      setTogglingAvail(false);
    }
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logout();
    } catch {
      /* authStore clears local state regardless */
    }
  };

  return (
    <View style={[s.root, { backgroundColor: c.bgPanel }]}>
      {/* ── .sidebarLogo ── */}
      <View
        style={[
          s.logoWrap,
          {
            borderBottomColor: c.border,
            paddingTop: insets.top + rem(1.5),
          },
        ]}
      >
        <View style={{ flexDirection: "row" }}>
          <AppText
            style={{
              fontFamily: FONTS.displayBlack,
              fontSize: rem(1.375),
              fontWeight: "800",
              letterSpacing: rem(1.375) * -0.04,
              color: c.text,
            }}
          >
            Skilled
          </AppText>
          <AppText
            style={{
              fontFamily: FONTS.displayBlack,
              fontSize: rem(1.375),
              fontWeight: "800",
              letterSpacing: rem(1.375) * -0.04,
              color: c.orange,
            }}
          >
            Proz
          </AppText>
        </View>
        <AppText
          style={{
            fontFamily: FONTS.bodyBold,
            fontSize: rem(0.5625),
            fontWeight: "700",
            letterSpacing: rem(0.5625) * 0.16,
            textTransform: "uppercase",
            color: c.textMuted,
            marginTop: 3,
          }}
        >
          {t("nav.workerPortal")}
        </AppText>
      </View>

      {/* ── .sidebarUser ── */}
      <View style={[s.userWrap, { borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => goTo("WorkerProfile")}
          style={[
            s.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <AppText
              style={{
                fontFamily: FONTS.displayBlack,
                fontSize: rem(0.8125),
                fontWeight: "700",
                color: c.orange,
              }}
            >
              {user?.firstName?.[0]?.toUpperCase()}
              {user?.lastName?.[0]?.toUpperCase()}
            </AppText>
          )}
        </Pressable>
        <View style={{ marginLeft: rem(0.75), flex: 1 }}>
          <AppText
            numberOfLines={1}
            style={{
              fontFamily: FONTS.bodySemiBold,
              fontSize: rem(0.875),
              fontWeight: "600",
              color: c.text,
              marginBottom: 3,
            }}
          >
            {user?.firstName} {user?.lastName}
          </AppText>
          <View style={[s.userBadge, { backgroundColor: c.greenDim }]}>
            <AppText
              style={{
                fontFamily: FONTS.bodyBold,
                fontSize: rem(0.5625),
                fontWeight: "700",
                letterSpacing: rem(0.5625) * 0.06,
                color: c.green,
              }}
            >
              {t("nav.activeWorker")}
            </AppText>
          </View>
        </View>
      </View>

      {/* ── .sidebarNav ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.navScroll}
      >
        <SectionLabel label={t("nav.overview")} c={c} />
        <MenuItem
          icon="home-outline"
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
          icon="search-outline"
          label={t("nav.browseJobs")}
          active={activeRoute === "WorkerJobs"}
          c={c}
          onPress={() => goTo("WorkerJobs")}
        />
        <MenuItem
          icon="bookmark-outline"
          label={t("nav.savedJobs", { defaultValue: "Saved Jobs" })}
          active={activeRoute === "WorkerSavedJobs"}
          c={c}
          onPress={() => goTo("WorkerSavedJobs")}
        />
        <MenuItem
          icon="document-text-outline"
          label={t("nav.myApplications")}
          active={activeRoute === "WorkerApplications"}
          c={c}
          onPress={() => goTo("WorkerApplications")}
        />
        <MenuItem
          icon="grid-outline"
          label={t("nav.categories")}
          active={activeRoute === "WorkerCategories"}
          c={c}
          onPress={() => goTo("WorkerCategories")}
        />

        <SectionLabel label={t("nav.payouts")} c={c} />
        <MenuItem
          icon="cash-outline"
          label={t("nav.earnings")}
          active={activeRoute === "WorkerEarnings"}
          c={c}
          onPress={() => goTo("WorkerEarnings")}
        />
        <MenuItem
          icon="wallet-outline"
          label={t("nav.wallet")}
          active={activeRoute === "WorkerWithdrawals"}
          c={c}
          onPress={() => goTo("WorkerWithdrawals")}
        />
        <MenuItem
          icon="refresh-outline"
          label={t("nav.refunds", { defaultValue: "Refunds" })}
          active={activeRoute === "RefundHistory"}
          c={c}
          onPress={() => goTo("RefundHistory")}
        />
        <MenuItem
          icon="ribbon-outline"
          label={t("nav.completedJobs", { defaultValue: "Completed Jobs" })}
          active={activeRoute === "WorkerCompletedJobs"}
          c={c}
          onPress={() => goTo("WorkerCompletedJobs")}
        />
        <MenuItem
          icon="briefcase-outline"
          label={t("nav.myEmployers", { defaultValue: "My Employers" })}
          active={activeRoute === "WorkerEmployers"}
          c={c}
          onPress={() => goTo("WorkerEmployers")}
        />
        <MenuItem
          icon="cash-outline"
          label={t("nav.retainedEarnings", {
            defaultValue: "Retained Earnings",
          })}
          active={activeRoute === "WorkerRetainedEarnings"}
          c={c}
          onPress={() => goTo("WorkerRetainedEarnings")}
        />
        <MenuItem
          icon="time-outline"
          label={t("nav.retainedCycles", { defaultValue: "Retained Cycles" })}
          active={activeRoute === "WorkerRetainedCycles"}
          c={c}
          onPress={() => goTo("WorkerRetainedCycles")}
        />
        <MenuItem
          icon="alert-circle-outline"
          label={t("nav.disputes")}
          active={activeRoute === "WorkerDisputes"}
          c={c}
          onPress={() => goTo("WorkerDisputes")}
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

        <SectionLabel label={t("nav.community")} c={c} />
        <MenuItem
          icon="newspaper-outline"
          label={t("nav.communityFeed", { defaultValue: "Community Feed" })}
          active={activeRoute === "WorkerCommunityFeed"}
          c={c}
          onPress={() => goTo("WorkerCommunityFeed")}
        />
        <MenuItem
          icon="create-outline"
          label={t("nav.myPosts")}
          active={activeRoute === "MyPosts"}
          c={c}
          onPress={() => goTo("MyPosts")}
        />
        <MenuItem
          icon="megaphone-outline"
          label={t("nav.campaign")}
          active={activeRoute === "Campaign"}
          c={c}
          onPress={() => goTo("Campaign")}
        />
        <MenuItem
          icon="people-outline"
          label={t("nav.referralDashboard")}
          active={activeRoute === "ReferralDashboard"}
          c={c}
          onPress={() => goTo("ReferralDashboard")}
        />
        <MenuItem
          icon="flag-outline"
          label={t("nav.myreports")}
          active={activeRoute === "MyReports"}
          c={c}
          onPress={() => goTo("MyReports")}
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
          icon="mail-outline"
          label={t("nav.messages")}
          active={activeRoute === "Messages"}
          c={c}
          badge={unreadMessages}
          onPress={() => goTo("Messages")}
        />
        <MenuItem
          icon="chatbubble-ellipses-outline"
          label={t("nav.liveSupportChat", {
            defaultValue: "Live Support Chat",
          })}
          active={activeRoute === "WorkerSupportChat"}
          c={c}
          onPress={() => goTo("WorkerSupportChat")}
        />
        <MenuItem
          icon="help-buoy-outline"
          label={t("nav.supportHub", { defaultValue: "Support Hub" })}
          active={activeRoute === "WorkerSupportHub"}
          c={c}
          onPress={() => goTo("WorkerSupportHub")}
        />
        <MenuItem
          icon="notifications-outline"
          label={t("nav.notifications")}
          active={activeRoute === "Notifications"}
          c={c}
          badge={unreadNotifications}
          onPress={() => goTo("Notifications")}
        />
        <MenuItem
          icon="cube-outline"
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

        <View style={{ height: rem(1) }} />
      </ScrollView>

      {/* ── .sidebarFooter ── */}
      <View
        style={[
          s.footer,
          {
            borderTopColor: c.border,
            backgroundColor: c.bgPanel,
            paddingBottom: insets.bottom + rem(0.875),
          },
        ]}
      >
        <View
          style={[
            s.availRow,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontFamily: FONTS.bodySemiBold,
              fontSize: rem(0.8125),
              fontWeight: "600",
              color: c.textDim,
            }}
          >
            {(user?.isAvailable ?? true)
              ? t("nav.available")
              : t("nav.offline")}
          </AppText>
          <Switch
            value={user?.isAvailable ?? true}
            onValueChange={handleToggleAvailability}
            disabled={togglingAvail}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: c.green }}
            thumbColor={c.text}
            ios_backgroundColor="rgba(255,255,255,0.1)"
            style={{ transform: [{ scale: 0.7 }] }}
          />
        </View>

        <Pressable onPress={() => setShowLogoutModal(true)} style={s.logoutBtn}>
          <Ionicons
            name="log-out-outline"
            size={rem(0.9375)}
            color={c.textMuted}
            style={{ width: 18, textAlign: "center" }}
          />
          <AppText
            style={{
              fontFamily: FONTS.bodyMedium,
              fontSize: rem(0.875),
              fontWeight: "500",
              color: c.textMuted,
              marginLeft: rem(0.75),
            }}
          >
            {t("nav.logout")}
          </AppText>
        </Pressable>
      </View>

      {/* ── Logout confirmation modal ── */}
      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleConfirmLogout}
        title={t("settings.logoutTitle", {
          defaultValue: "Log out of SkilledProz?",
        })}
        message={t("settings.logoutMessage", {
          defaultValue:
            "You will need to sign in again to access your account.",
        })}
        confirmLabel={t("nav.logout")}
        cancelLabel={t("common.cancel", { defaultValue: "Cancel" })}
        c={c}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  logoWrap: {
    paddingBottom: rem(1.125),
    paddingHorizontal: rem(1.5),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  userWrap: {
    paddingVertical: rem(1),
    paddingHorizontal: rem(1.5),
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: rem(40 / 14),
    height: rem(40 / 14),
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  userBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    alignSelf: "flex-start",
  },
  navScroll: {
    paddingVertical: rem(1),
    paddingHorizontal: rem(0.75),
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rem(0.5625),
    paddingHorizontal: rem(0.75),
    borderRadius: 8,
    position: "relative",
  },
  activeBar: {
    position: "absolute",
    left: 0,
    top: "20%",
    height: "60%",
    width: 2.5,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  navBadge: {
    marginLeft: "auto",
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  footer: {
    paddingTop: rem(0.875),
    paddingHorizontal: rem(0.75),
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: rem(0.25),
  },
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: rem(0.5),
    paddingHorizontal: rem(0.75),
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: rem(0.25),
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: rem(0.5625),
    paddingHorizontal: rem(0.75),
    borderRadius: 8,
  },
});
