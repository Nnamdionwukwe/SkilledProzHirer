// src/screens/auth/RegisterScreen.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import {
  isEmail,
  isNonEmpty,
  isStrongEnoughPassword,
} from "../../utils/validators";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { register, isLoading } = useAuthStore();

  const role = route.params?.role || "HIRER";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    password: "",
    confirm: "",
  });
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (!isNonEmpty(form.firstName)) e.firstName = t("auth.fillAllFields");
    if (!isNonEmpty(form.lastName)) e.lastName = t("auth.fillAllFields");
    if (!isNonEmpty(form.email)) e.email = t("auth.emailRequired");
    else if (!isEmail(form.email)) e.email = t("auth.validEmailRequired");
    if (!isStrongEnoughPassword(form.password))
      e.password = t("auth.passwordTooShort");
    if (form.password !== form.confirm)
      e.confirm = t("auth.passwordsDontMatch");
    setErrors(e);

    if (!agree) {
      toast.warning(t("auth.mustAgreeTerms"));
      return false;
    }
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
        role, // "HIRER"
      });
      toast.success(t("auth.registerSuccess"));
      // No manual navigation — RootNavigator sees the new (unverified) user
      // and swaps to the VerifyGate automatically.
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backRow}
          hitSlop={6}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          <AppText variant="body" weight="medium" style={{ marginLeft: 8 }}>
            {t("common.back")}
          </AppText>
        </Pressable>

        <AppText variant="label" tone="brand" style={{ marginTop: 8 }}>
          {t("auth.hirerAccount")}
        </AppText>

        <AppText variant="display" weight="displayBlack" style={styles.title}>
          {t("auth.findNextProz")}
        </AppText>

        <View style={styles.form}>
          <View style={styles.row2}>
            <View style={styles.col}>
              <AppInput
                label={t("auth.firstName")}
                iconLeft="person-outline"
                placeholder={t("auth.firstNamePlaceholder")}
                value={form.firstName}
                onChangeText={update("firstName")}
                autoCapitalize="words"
                textContentType="givenName"
                error={errors.firstName}
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label={t("auth.lastName")}
                placeholder={t("auth.lastNamePlaceholder")}
                value={form.lastName}
                onChangeText={update("lastName")}
                autoCapitalize="words"
                textContentType="familyName"
                error={errors.lastName}
              />
            </View>
          </View>

          <AppInput
            label={t("auth.emailAddress")}
            iconLeft="mail-outline"
            placeholder={t("auth.emailPlaceholder")}
            value={form.email}
            onChangeText={update("email")}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
          />

          <AppInput
            label={`${t("auth.phone")} (${t("common.optional")})`}
            iconLeft="call-outline"
            placeholder={t("auth.phonePlaceholder")}
            value={form.phone}
            onChangeText={update("phone")}
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
          />

          <View style={styles.row2}>
            <View style={styles.col}>
              <AppInput
                label={t("auth.country")}
                iconLeft="globe-outline"
                placeholder={t("auth.countryPlaceholder")}
                value={form.country}
                onChangeText={update("country")}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label={t("auth.city")}
                iconLeft="location-outline"
                placeholder={t("auth.cityPlaceholder")}
                value={form.city}
                onChangeText={update("city")}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={styles.col}>
              <AppInput
                label={t("auth.password")}
                iconLeft="lock-closed-outline"
                placeholder={t("auth.passwordMinChars")}
                value={form.password}
                onChangeText={update("password")}
                secureTextEntry
                textContentType="newPassword"
                error={errors.password}
              />
            </View>
            <View style={styles.col}>
              <AppInput
                label={t("auth.confirm")}
                placeholder={t("auth.confirmPlaceholder")}
                value={form.confirm}
                onChangeText={update("confirm")}
                secureTextEntry
                error={errors.confirm}
              />
            </View>
          </View>

          <Pressable
            onPress={() => setAgree((a) => !a)}
            style={styles.agreeRow}
            hitSlop={6}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: agree
                    ? theme.colors.orange
                    : theme.colors.border,
                  backgroundColor: agree ? theme.colors.orange : "transparent",
                },
              ]}
            >
              {agree ? (
                <Ionicons name="checkmark" size={14} color="#0f0f1a" />
              ) : null}
            </View>
            <AppText variant="small" tone="dim" style={{ flex: 1 }}>
              {t("auth.agreeToTerms")}{" "}
              <AppText variant="small" tone="brand" weight="semibold">
                {t("auth.terms")}
              </AppText>
              {"  "}
              {t("auth.and")}{" "}
              <AppText variant="small" tone="brand" weight="semibold">
                {t("auth.privacyPolicy")}
              </AppText>
            </AppText>
          </Pressable>

          <AppButton
            title={
              isLoading ? t("auth.creating") : t("auth.createHirerAccount")
            }
            iconRight={isLoading ? undefined : "arrow-forward"}
            onPress={handleSubmit}
            loading={isLoading}
            style={{ marginTop: 8 }}
          />

          <View style={styles.bottomRow}>
            <AppText variant="body" tone="dim">
              {t("auth.alreadyHaveAccount")}{" "}
            </AppText>
            <Pressable onPress={() => navigation.navigate("Login")} hitSlop={6}>
              <AppText variant="body" tone="brand" weight="semibold">
                {t("auth.signIn")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  backRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  title: { marginTop: 8, marginBottom: 16 },
  form: { gap: 14 },
  row2: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  agreeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
});
