// src/screens/auth/ForgotPasswordScreen.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import { isEmail } from "../../utils/validators";

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { forgotPassword } = useAuthStore();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
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
      toast.success(t("auth.resetLinkSent"));
      navigation.navigate("Login");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backRow} hitSlop={6}>
          <Ionicons name="arrow-back" size={20} color={theme.colors.text} />
          <AppText variant="body" weight="medium" style={{ marginLeft: 8 }}>
            {t("common.back")}
          </AppText>
        </Pressable>

        <View style={{ height: 40 }} />

        <AppText variant="display" weight="displayBlack">
          {t("auth.forgotPasswordTitle")}
        </AppText>
        <AppText variant="subtitle" tone="dim" style={{ marginTop: 8, marginBottom: 24 }}>
          {t("auth.forgotPasswordBody")}
        </AppText>

        <AppInput
          label={t("auth.emailAddress")}
          iconLeft="mail-outline"
          placeholder={t("auth.emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
          error={error}
        />

        <AppButton
          title={t("auth.sendResetLink")}
          onPress={handleSubmit}
          loading={loading}
          style={{ marginTop: 16 }}
        />

        <View style={styles.bottomRow}>
          <AppText variant="body" tone="dim">
            {t("auth.rememberPassword")}{" "}
          </AppText>
          <Pressable onPress={() => navigation.navigate("Login")} hitSlop={6}>
            <AppText variant="body" tone="brand" weight="semibold">
              {t("auth.signIn")}
            </AppText>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  backRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
