// src/screens/auth/VerifyEmailScreen.js
import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet, AppState } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";

/**
 * Mounted by RootNavigator when user is signed in but isEmailVerified === false.
 *
 *  - "Resend email" calls /auth/resend-verification
 *  - "I've verified" calls /auth/me; once the server flips the flag,
 *    RootNavigator auto-swaps to HirerNavigator (no navigation.navigate needed).
 *  - Also polls every 8s while the screen is focused, and fires fetchMe
 *    whenever the app returns to foreground (typical post-email-tap flow).
 */
export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user, resendVerification, fetchMe, logout } = useAuthStore();

  const email = user?.email || "";
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const pollRef = useRef(null);

  // Poll every 8s while mounted
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchMe().catch(() => {});
    }, 8000);
    return () => clearInterval(pollRef.current);
  }, [fetchMe]);

  // Re-check immediately when the app comes back to foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") fetchMe().catch(() => {});
    });
    return () => sub.remove();
  }, [fetchMe]);

  const handleResend = async () => {
    if (!email) {
      toast.error(t("auth.emailRequired"));
      return;
    }
    setSending(true);
    try {
      await resendVerification(email);
      toast.success(t("auth.verificationResent"));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    try {
      const u = await fetchMe();
      if (!u?.isEmailVerified) {
        toast.info(t("auth.notVerifiedYet"));
      }
      // If verified, RootNavigator unmounts this screen automatically.
    } finally {
      setChecking(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={{ height: 40 }} />

        <View
          style={[
            styles.iconBubble,
            { backgroundColor: theme.colors.orangeDim },
          ]}
        >
          <Ionicons
            name="mail-open-outline"
            size={36}
            color={theme.colors.orange}
          />
        </View>

        <AppText
          variant="displaySm"
          weight="displayBlack"
          style={{ marginTop: 24 }}
        >
          {t("auth.verifyEmailTitle")}
        </AppText>

        <AppText variant="subtitle" tone="dim" style={{ marginTop: 12 }}>
          {t("auth.verifyEmailBody", { email: email || "your inbox" })}
        </AppText>

        <View style={styles.actions}>
          <AppButton
            title={checking ? t("auth.checking") : t("auth.iVerified")}
            iconLeft={checking ? undefined : "checkmark-circle-outline"}
            onPress={handleCheck}
            loading={checking}
          />

          <AppButton
            title={sending ? t("auth.resending") : t("auth.resend")}
            variant="secondary"
            iconLeft={sending ? undefined : "refresh"}
            onPress={handleResend}
            loading={sending}
          />

          <AppButton
            title={t("auth.signOut")}
            variant="ghost"
            onPress={async () => {
              await logout();
              toast.info(t("auth.logoutSuccess"));
            }}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8, alignItems: "flex-start" },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: { width: "100%", gap: 12, marginTop: 32 },
});
