// src/screens/auth/RegisterHirerScreen.js
//
// Mirrors the website's RegisterHirer.jsx.

import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";

import {
  AuthShell,
  AuthField,
  AuthButton,
  AuthAlert,
} from "../../components/auth/AuthShell";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import {
  isEmail,
  isNonEmpty,
  isStrongEnoughPassword,
} from "../../utils/validators";

WebBrowser.maybeCompleteAuthSession();

const extra = Constants.expoConfig?.extra || {};
const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || "";
const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || "";
const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || "";

export default function RegisterHirerScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { register, googleSignIn, isLoading } = useAuthStore();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    password: "",
    confirm: "",
    referralCode: "",
  });

  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});
  const [googleLoading, setGoogleLoading] = useState(false);

  const update = (key) => (value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: "" }));
  };

  // ── Google Auth Setup ──────────────────────────────────────────
  const [request, response, promptAsync] = Google.useAuthRequest(
    GOOGLE_WEB_CLIENT_ID
      ? {
          clientId: GOOGLE_WEB_CLIENT_ID,
          androidClientId: GOOGLE_ANDROID_CLIENT_ID || undefined,
          iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
          scopes: ["openid", "email", "profile"],
          redirectUri: AuthSession.makeRedirectUri({
            scheme: "skilledproz",
            path: "oauth",
          }),
        }
      : { clientId: "disabled" },
  );

  useEffect(() => {
    if (!response) return;
    if (response.type === "success") {
      const accessToken = response.authentication?.accessToken;
      if (accessToken) handleGoogleToken(accessToken);
    } else if (response.type === "error") {
      setErrors({ api: response.error?.message || "Google sign-in failed." });
      setGoogleLoading(false);
    } else if (response.type === "dismiss" || response.type === "cancel") {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (accessToken) => {
    try {
      const result = await googleSignIn({
        accessToken,
        role: "HIRER", // Force Hirer role since they are on this screen
        ref: form.referralCode.trim() || undefined,
      });

      if (result?.needsRole) {
        // Edge case: backend still asks for role despite us sending it
        navigation.navigate("Register", {
          googleProfile: result.googleProfile,
          accessToken,
          refCode: form.referralCode,
          from: "google",
        });
      }
      // If successful, RootNavigator handles the redirect to the dashboard
    } catch (err) {
      setErrors({
        api: err?.response?.data?.message || "Google signup failed.",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGooglePress = async () => {
    setErrors({});
    if (!GOOGLE_WEB_CLIENT_ID) {
      setErrors({ api: "Google Sign-In is not configured yet." });
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
      setErrors({ api: err?.message || "Google signup failed." });
    }
  };

  // ── Validation & Submit ────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!isNonEmpty(form.firstName)) e.firstName = "Required";
    if (!isNonEmpty(form.lastName)) e.lastName = "Required";
    if (!isNonEmpty(form.email)) e.email = "Required";
    else if (!isEmail(form.email)) e.email = t("auth.validEmailRequired");
    if (!isStrongEnoughPassword(form.password)) e.password = "Min 8 characters";
    if (form.password !== form.confirm) e.confirm = "Doesn't match";

    if (!agree) e.agree = "You must accept the terms";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim() || undefined,
        country: form.country.trim() || undefined,
        city: form.city.trim() || undefined,
        password: form.password,
        role: "HIRER",
        ...(form.referralCode?.trim()
          ? { referralCode: form.referralCode.trim().toUpperCase() }
          : {}),
      });
      // No manual navigation needed; RootNavigator handles the redirect.
    } catch (err) {
      setErrors({
        api: err?.response?.data?.message || "Registration failed.",
      });
    }
  };

  return (
    <AuthShell showBack backTo="Register">
      <View style={{ marginBottom: 24 }}>
        <AppText
          variant="small"
          weight="bold"
          style={{ color: c.orange, letterSpacing: 1.8 }}
        >
          {t("auth.hirerAccount", { defaultValue: "HIRER ACCOUNT" })}
        </AppText>
        <AppText
          variant="display"
          weight="displayBlack"
          style={{ marginTop: 4, marginBottom: 4, lineHeight: 34 }}
        >
          {t("auth.findNextProz", {
            defaultValue: "Find your next\nskilled proz",
          })}
        </AppText>
      </View>

      {/* ── Google Sign-Up ─────────────────────────────────────────────── */}
      <Pressable
        onPress={handleGooglePress}
        disabled={googleLoading}
        style={({ pressed }) => [
          styles.googleBtn,
          {
            backgroundColor: pressed ? c.bgCard : c.bgInput,
            borderColor: c.border,
            opacity: googleLoading ? 0.6 : 1,
          },
        ]}
      >
        {googleLoading ? (
          <ActivityIndicator size="small" color={c.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#4285F4" />
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginLeft: 10 }}
            >
              {t("auth.signUpWithGoogle", {
                defaultValue: "Sign up with Google",
              })}
            </AppText>
          </>
        )}
      </Pressable>

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <View style={styles.dividerRow}>
        <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
        <AppText variant="small" tone="muted" style={{ marginHorizontal: 12 }}>
          {t("auth.orContinueWithEmail", {
            defaultValue: "or continue with email",
          })}
        </AppText>
        <View style={[styles.dividerLine, { backgroundColor: c.border }]} />
      </View>

      {errors.api ? <AuthAlert type="error" message={errors.api} /> : null}

      <View style={styles.form}>
        {/* First Name & Last Name */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AuthField
              label={t("auth.firstName", { defaultValue: "First name" })}
              iconLeft="person-outline"
              placeholder={t("auth.firstNamePlaceholder", {
                defaultValue: "John",
              })}
              value={form.firstName}
              onChangeText={update("firstName")}
              autoCapitalize="words"
              textContentType="givenName"
              error={errors.firstName}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AuthField
              label={t("auth.lastName", { defaultValue: "Last name" })}
              placeholder={t("auth.lastNamePlaceholder", {
                defaultValue: "Doe",
              })}
              value={form.lastName}
              onChangeText={update("lastName")}
              autoCapitalize="words"
              textContentType="familyName"
              error={errors.lastName}
            />
          </View>
        </View>

        {/* Email */}
        <AuthField
          label={t("auth.emailAddress", { defaultValue: "Email address" })}
          iconLeft="mail-outline"
          placeholder={t("auth.emailPlaceholder", {
            defaultValue: "you@example.com",
          })}
          value={form.email}
          onChangeText={update("email")}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          error={errors.email}
        />

        {/* Phone */}
        <AuthField
          label={`${t("auth.phone", { defaultValue: "Phone" })} (${t("common.optional", { defaultValue: "optional" })})`}
          iconLeft="call-outline"
          placeholder={t("auth.phonePlaceholder", {
            defaultValue: "+234 801 234 5678",
          })}
          value={form.phone}
          onChangeText={update("phone")}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
        />

        {/* Country & City */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AuthField
              label={t("auth.country", { defaultValue: "Country" })}
              iconLeft="globe-outline"
              placeholder={t("auth.countryPlaceholder", {
                defaultValue: "Nigeria",
              })}
              value={form.country}
              onChangeText={update("country")}
              autoCapitalize="words"
            />
          </View>
          <View style={{ flex: 1 }}>
            <AuthField
              label={t("auth.city", { defaultValue: "City" })}
              iconLeft="location-outline"
              placeholder={t("auth.cityPlaceholder", { defaultValue: "Lagos" })}
              value={form.city}
              onChangeText={update("city")}
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* Referral Code */}
        <AuthField
          label={`${t("auth.referralCode", { defaultValue: "Referral code" })} (${t("common.optional", { defaultValue: "optional" })})`}
          placeholder={t("auth.referralPlaceholder", {
            defaultValue: "e.g. SPTEST01",
          })}
          value={form.referralCode}
          onChangeText={update("referralCode")}
          autoCapitalize="characters"
          maxLength={12}
        />

        {/* Password & Confirm */}
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <AuthField
              label={t("auth.password", { defaultValue: "Password" })}
              iconLeft="lock-closed-outline"
              placeholder={t("auth.passwordMinChars", {
                defaultValue: "Min 8 chars",
              })}
              value={form.password}
              onChangeText={update("password")}
              secureTextEntry={!showPw}
              textContentType="newPassword"
              error={errors.password}
              iconRight={{
                name: showPw ? "eye-off-outline" : "eye-outline",
                onPress: () => setShowPw((v) => !v),
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AuthField
              label={t("auth.confirm", { defaultValue: "Confirm" })}
              placeholder={t("auth.confirmPlaceholder", {
                defaultValue: "Repeat password",
              })}
              value={form.confirm}
              onChangeText={update("confirm")}
              secureTextEntry={!showPw}
              error={errors.confirm}
            />
          </View>
        </View>

        {/* Terms Checkbox */}
        <Pressable
          onPress={() => setAgree((a) => !a)}
          style={styles.checkRow}
          hitSlop={6}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor: agree ? c.orange : c.border,
                backgroundColor: agree ? c.orange : "transparent",
              },
            ]}
          >
            {agree ? (
              <Ionicons name="checkmark" size={14} color="#0f0f1a" />
            ) : null}
          </View>
          <AppText
            variant="small"
            tone="dim"
            style={{ flex: 1, lineHeight: 20 }}
          >
            {t("auth.agreeToTerms", { defaultValue: "I agree to the" })}{" "}
            <AppText
              variant="small"
              style={{ color: c.orange }}
              weight="semibold"
            >
              {t("auth.terms", { defaultValue: "Terms" })}
            </AppText>{" "}
            {t("auth.and", { defaultValue: "and" })}{" "}
            <AppText
              variant="small"
              style={{ color: c.orange }}
              weight="semibold"
            >
              {t("auth.privacyPolicy", { defaultValue: "Privacy Policy" })}
            </AppText>
          </AppText>
        </Pressable>
        {errors.agree ? (
          <AppText variant="small" style={{ color: "#fca5a5", marginTop: -8 }}>
            {errors.agree}
          </AppText>
        ) : null}

        {/* Submit Button */}
        <AuthButton
          title={
            isLoading
              ? t("auth.creating", { defaultValue: "Creating account…" })
              : t("auth.createHirerAccount", {
                  defaultValue: "Create Hirer Account",
                })
          }
          onPress={handleSubmit}
          loading={isLoading}
          style={{ marginTop: 8 }}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <AppText variant="body" tone="dim" style={{ fontSize: 13.5 }}>
          {t("auth.alreadyHaveAccount", {
            defaultValue: "Already have an account?",
          })}{" "}
        </AppText>
        <Pressable onPress={() => navigation.navigate("Login")} hitSlop={6}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.orange, fontSize: 13.5 }}
          >
            {t("auth.signIn", { defaultValue: "Sign in" })}
          </AppText>
        </Pressable>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  form: {
    gap: 18, // Matches .form { gap: 18px; }
  },
  row: {
    flexDirection: "row",
    gap: 14, // Matches .row { gap: 14px; }
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9, // Matches .checkRow { gap: 9px; }
    marginTop: 4,
  },
  checkbox: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    flexWrap: "wrap",
  },
});
