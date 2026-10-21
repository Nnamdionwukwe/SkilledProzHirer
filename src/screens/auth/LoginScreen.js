// src/screens/auth/LoginScreen.js
//
// Mirrors the website's Login.jsx 1:1.

import React, { useEffect, useState } from "react";
import { View, Pressable, ActivityIndicator, Linking } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session"; // <-- IMPORT MOVED HERE

import {
  AuthShell,
  AuthHeader,
  AuthField,
  AuthButton,
  AuthAlert,
  AuthFooter,
} from "../../components/auth/AuthShell";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { isEmail, isNonEmpty } from "../../utils/validators";
import { Ionicons } from "@expo/vector-icons";

WebBrowser.maybeCompleteAuthSession();

// ── Google client IDs ────────────────────────────────────────────
const extra = Constants.expoConfig?.extra || {};
const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || "";
const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || "";
const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || "";

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { login, googleSignIn } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [block, setBlock] = useState(null);
  const [refCode, setRefCode] = useState("");

  // ── Referral code from storage ─────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(
          "@skilledproz:pendingRefCode",
        );
        if (stored) setRefCode(stored);
      } catch {}
    })();
  }, []);

  // ── Google auth request ───────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest(
    GOOGLE_WEB_CLIENT_ID
      ? {
          clientId: GOOGLE_WEB_CLIENT_ID,
          androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
          iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
          scopes: ["openid", "email", "profile"],
          // THIS IS THE KEY FIX FOR REDIRECTING:
          redirectUri: AuthSession.makeRedirectUri({
            scheme: "skilledproz",
            path: "oauth",
          }),
        }
      : { clientId: "disabled" },
  );

  // ── Handle the OAuth response ──────────────────────────────────
  useEffect(() => {
    if (!response) return;

    if (response.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (!accessToken) {
        setError(
          t("auth.googleNoToken", {
            defaultValue: "Google sign-in did not return a token.",
          }),
        );
        setGoogleLoading(false);
        return;
      }
      handleGoogleToken(accessToken);
    } else if (response.type === "error") {
      setError(
        response.error?.message ||
          t("auth.googleFailed", { defaultValue: "Google sign-in failed." }),
      );
      setGoogleLoading(false);
    } else if (response.type === "dismiss" || response.type === "cancel") {
      setGoogleLoading(false);
    }
  }, [response]);

  // ── Send token to backend ──────────────────────────────────────
  const handleGoogleToken = async (accessToken) => {
    try {
      const result = await googleSignIn({
        accessToken,
        ref: refCode || undefined,
      });

      if (result?.needsRole) {
        navigation.navigate("Register", {
          googleProfile: result.googleProfile,
          accessToken,
          refCode,
          from: "google",
        });
        return;
      }
    } catch (err) {
      const res = err?.response?.data;
      const code = res?.code;

      if (
        code === "ACCOUNT_BANNED" ||
        code === "ACCOUNT_DELETED" ||
        code === "ACCOUNT_NOT_FOUND"
      ) {
        setBlock(
          code === "ACCOUNT_BANNED"
            ? "banned"
            : code === "ACCOUNT_DELETED"
              ? "deleted"
              : "not_found",
        );
      } else {
        setError(
          res?.message ||
            err?.message ||
            t("auth.googleFailed", {
              defaultValue: "Google sign-in failed. Please try again.",
            }),
        );
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // ── Trigger the OAuth flow ─────────────────────────────────────
  const handleGooglePress = async () => {
    setError("");
    setBlock(null);

    if (!GOOGLE_WEB_CLIENT_ID) {
      setError(
        t("auth.googleNotConfigured", {
          defaultValue:
            "Google Sign-In is not configured yet. Use email + password to continue.",
        }),
      );
      return;
    }

    setGoogleLoading(true);
    try {
      const result = await promptAsync();
      if (result?.type === "cancel" || result?.type === "dismiss") {
        setGoogleLoading(false);
      }
    } catch (err) {
      setGoogleLoading(false);
      setError(
        err?.message ||
          t("auth.googleFailed", { defaultValue: "Google sign-in failed." }),
      );
    }
  };

  // ── Email/password submit ──────────────────────────────────────
  const handleSubmit = async () => {
    setError("");
    setBlock(null);

    if (!isNonEmpty(email)) return setError(t("auth.emailRequired"));
    if (!isEmail(email)) return setError(t("auth.validEmailRequired"));
    if (!isNonEmpty(password)) return setError(t("auth.fillAllFields"));

    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
    } catch (err) {
      const res = err?.response?.data;
      const code = res?.code;

      if (
        code === "ACCOUNT_BANNED" ||
        code === "ACCOUNT_DELETED" ||
        code === "ACCOUNT_NOT_FOUND"
      ) {
        setBlock(
          code === "ACCOUNT_BANNED"
            ? "banned"
            : code === "ACCOUNT_DELETED"
              ? "deleted"
              : "not_found",
        );
        return;
      }

      if (
        code === "GOOGLE_ACCOUNT_NO_PASSWORD" ||
        code === "GOOGLE_ONLY_ACCOUNT"
      ) {
        setError(
          res?.message ||
            t("auth.googleOnlyAccount", {
              defaultValue:
                "This account was created with Google. Please sign in with Google.",
            }),
        );
        return;
      }

      setError(res?.message || err?.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  const blockContent =
    block === "banned"
      ? {
          title: t("auth.accountSuspended", {
            defaultValue: "Account suspended",
          }),
          body: t("auth.accountSuspendedBody", {
            defaultValue:
              "Your account has been suspended by an administrator. Contact support if you believe this is a mistake.",
          }),
        }
      : block === "deleted"
        ? {
            title: t("auth.accountDeactivated", {
              defaultValue: "Account deactivated",
            }),
            body: t("auth.accountDeactivatedBody", {
              defaultValue:
                "This account has been deactivated. Contact support to restore access.",
            }),
          }
        : block === "not_found"
          ? {
              title: t("auth.accountNotFound", {
                defaultValue: "Account not found",
              }),
              body: t("auth.accountNotFoundBody", {
                defaultValue:
                  "This account no longer exists. Contact support if this is unexpected.",
              }),
            }
          : null;

  return (
    <AuthShell showBack={false}>
      <AuthHeader
        eyebrow={t("auth.welcomeBack", { defaultValue: "Welcome back" })}
        title={t("auth.signInTitle")}
        subtitle={
          <>
            {t("auth.noAccountYet")}{" "}
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
              onPress={() => navigation.navigate("Register")}
            >
              {t("auth.createOneFree")} →
            </AppText>
          </>
        }
      />

      {block && blockContent ? (
        <View style={{ marginBottom: 16 }}>
          <AuthAlert
            type="error"
            message={`${blockContent.title}. ${blockContent.body}`}
          />
          <Pressable
            onPress={() => Linking.openURL("mailto:support@skilledproz.com")}
            style={{
              marginTop: 8,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: "center",
            }}
          >
            <AppText variant="small" weight="semibold" tone="dim">
              {t("auth.contactSupport", { defaultValue: "Contact support" })}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      <GoogleSignInButton loading={googleLoading} onPress={handleGooglePress} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          marginVertical: 18,
        }}
      >
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
        <AppText variant="small" tone="muted">
          {t("auth.or", { defaultValue: "or" })}
        </AppText>
        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
      </View>

      {error && !block ? <AuthAlert type="error" message={error} /> : null}

      <View style={{ gap: 14 }}>
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
          editable={!loading}
        />

        <AuthField
          label={t("auth.password")}
          iconLeft="lock-closed-outline"
          placeholder={t("auth.passwordMinChars")}
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            setError("");
          }}
          secureTextEntry={!showPassword}
          autoComplete="password"
          textContentType="password"
          editable={!loading}
          iconRight={{
            name: showPassword ? "eye-off-outline" : "eye-outline",
            onPress: () => setShowPassword((v) => !v),
          }}
        />

        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
          <Pressable
            onPress={() => navigation.navigate("ForgotPassword")}
            hitSlop={6}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {t("auth.forgot")}
            </AppText>
          </Pressable>
        </View>

        <AuthButton
          title={loading ? t("auth.signingIn") : t("auth.signIn")}
          onPress={handleSubmit}
          loading={loading}
          disabled={!email || !password}
        />
      </View>

      <AuthFooter
        prompt={t("auth.noAccountYet")}
        actionLabel={t("auth.createOneFree")}
        onPress={() => navigation.navigate("Register")}
      />
    </AuthShell>
  );
}

function GoogleSignInButton({ loading, onPress }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          height: 50,
          borderRadius: 10,
          backgroundColor: pressed ? c.bgCard : c.bgInput,
          borderColor: c.border,
          borderWidth: 1.5,
          opacity: loading ? 0.6 : 1,
          gap: 10,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={c.text} />
      ) : (
        <>
          <GoogleGlyph />
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {t("auth.continueWithGoogle", {
              defaultValue: "Continue with Google",
            })}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

function GoogleGlyph() {
  return (
    <View
      style={{
        width: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name="logo-google" size={18} color="#4285F4" />
    </View>
  );
}
