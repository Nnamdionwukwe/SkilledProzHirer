// src/screens/auth/ForgotPasswordScreen.js
//
// Mirrors the website's ForgotPassword.jsx.
// Uses AuthShell + AuthField + AuthButton + AuthStateBox + AuthFooter.

import React, { useState } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import {
  AuthShell,
  AuthHeader,
  AuthField,
  AuthButton,
  AuthAlert,
  AuthStateBox,
  AuthFooter,
} from "../../components/auth/AuthShell";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { isEmail } from "../../utils/validators";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { forgotPassword } = useAuthStore();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!isEmail(email)) {
      setError(t("auth.validEmailRequired"));
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch (err) {
      setError(err?.message || t("toast.unknownError"));
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────
  if (sent) {
    return (
      <AuthShell showBack backTo="Login">
        <AuthStateBox
          icon="checkmark-circle"
          title={t("auth.resetLinkSent")}
          subtitle={
            <>
              If{" "}
              <AppText weight="semibold" style={{ color: c.textDim }}>
                {email}
              </AppText>{" "}
              is registered, check your inbox.
            </>
          }
        />
        <AuthButton
          title={t("auth.backToSignIn", {
            defaultValue: "Back to sign in",
          })}
          variant="outline"
          iconLeft="arrow-back"
          onPress={() => navigation.navigate("Login")}
        />
      </AuthShell>
    );
  }

  // ── Form state ───────────────────────────────────────────────────
  return (
    <AuthShell showBack backTo="Login">
      <AuthHeader
        eyebrow={t("auth.accountRecovery", {
          defaultValue: "Account recovery",
        })}
        title={t("auth.forgotPasswordTitle")}
        subtitle={t("auth.forgotPasswordBody")}
      />

      {error ? <AuthAlert type="error" message={error} /> : null}

      <View style={{ gap: 18 }}>
        <AuthField
          label={t("auth.emailAddress")}
          iconLeft="mail-outline"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setError("");
          }}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          error={error || undefined}
        />

        <AuthButton
          title={
            loading
              ? t("auth.sending", { defaultValue: "Sending…" })
              : t("auth.sendResetLink")
          }
          onPress={handleSubmit}
          loading={loading}
          disabled={!email}
        />
      </View>

      <AuthFooter
        prompt={t("auth.rememberPassword")}
        actionLabel={t("auth.signIn")}
        onPress={() => navigation.navigate("Login")}
      />
    </AuthShell>
  );
}
