// src/screens/auth/LoginScreen.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import { isEmail, isNonEmpty } from "../../utils/validators";

export default function LoginScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { toast } = useToast();
  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!isNonEmpty(email)) e.email = t("auth.emailRequired");
    else if (!isEmail(email)) e.email = t("auth.validEmailRequired");
    if (!isNonEmpty(password)) e.password = t("auth.fillAllFields");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const user = await login(email.trim().toLowerCase(), password);
      toast.success(t("auth.loginSuccess"));
      // Navigation is driven by RootNavigator listening to auth state
      // No manual navigation needed.
    } catch (err) {
      toast.error(err.message || t("auth.invalidCredentials"));
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.heroSpacer} />

        <AppText variant="label" tone="brand">
          {t("auth.welcomeBack")}
        </AppText>

        <AppText variant="display" weight="displayBlack" style={styles.title}>
          {t("auth.signInTitle")}
        </AppText>

        <View style={styles.subRow}>
          <AppText variant="body" tone="dim">
            {t("auth.noAccountYet")}{" "}
          </AppText>
          <Pressable onPress={() => navigation.navigate("Welcome")} hitSlop={6}>
            <AppText variant="body" tone="brand" weight="semibold">
              {t("auth.createOneFree")} →
            </AppText>
          </Pressable>
        </View>

        <View style={styles.form}>
          <AppInput
            label={t("auth.emailAddress")}
            iconLeft="mail-outline"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            error={errors.email}
          />

          <AppInput
            label={t("auth.password")}
            iconLeft="lock-closed-outline"
            placeholder={t("auth.passwordMinChars")}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            rightActionLabel={t("auth.forgot")}
            onRightActionPress={() => navigation.navigate("ForgotPassword")}
            error={errors.password}
          />

          <AppButton
            title={isLoading ? t("auth.signingIn") : t("auth.signIn")}
            onPress={handleSubmit}
            loading={isLoading}
            style={styles.cta}
          />
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingTop: 8 },
  heroSpacer: { height: 60 },
  title: { marginTop: 8, marginBottom: 4 },
  subRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 24 },
  form: { gap: 16 },
  cta: { marginTop: 8 },
});
