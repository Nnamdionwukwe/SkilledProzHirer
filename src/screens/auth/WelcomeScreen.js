// src/screens/auth/WelcomeScreen.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";

/**
 * Mirrors the website's "Join SkilledProz - How will you use the platform?"
 * card picker. Hirer-only app currently routes only the Hirer role; Worker
 * card shows a friendly notice that this is the Hirer app.
 */
export default function WelcomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [selected, setSelected] = useState("HIRER");

  const handleContinue = () => {
    if (selected === "HIRER") {
      navigation.navigate("Register", { role: "HIRER" });
    } else {
      navigation.navigate("WorkerRegister");
    }
  };

  return (
    <AppScreen>
      <View style={styles.container}>
        <View style={styles.heroSpacer} />

        <AppText variant="label" tone="brand">
          {t("auth.getStartedFree")}
        </AppText>

        <AppText variant="display" weight="displayBlack" style={styles.title}>
          {t("auth.joinTitle")}
        </AppText>

        <AppText variant="subtitle" tone="dim" style={{ marginBottom: 24 }}>
          {t("auth.joinSubtitle")}
        </AppText>

        <View style={styles.cards}>
          <RoleCard
            theme={theme}
            selected={selected === "HIRER"}
            onPress={() => setSelected("HIRER")}
            icon="briefcase-outline"
            title={t("auth.imAHirer")}
            description={t("auth.hirerDescription")}
          />
          <RoleCard
            theme={theme}
            selected={selected === "WORKER"}
            onPress={() => setSelected("WORKER")}
            icon="hammer-outline"
            title={t("auth.imAWorker")}
            description={t("auth.workerDescription")}
          />
        </View>

        <AppButton
          title={`${t("auth.continueAs")} ${
            selected === "HIRER" ? t("auth.imAHirer") : t("auth.imAWorker")
          }`}
          onPress={handleContinue}
          iconRight="arrow-forward"
          style={styles.cta}
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
    </AppScreen>
  );
}

function RoleCard({ theme, selected, onPress, icon, title, description }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.bgPanel,
          borderColor: selected ? theme.colors.orange : theme.colors.border,
          borderWidth: selected ? 1.5 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.cardIconWrap,
          { backgroundColor: theme.colors.orangeDim },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.colors.orange} />
      </View>
      <AppText variant="title" weight="bold" style={{ marginTop: 16 }}>
        {title}
      </AppText>
      <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
        {description}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  heroSpacer: { height: 40 },
  title: { marginTop: 8, marginBottom: 4 },
  cards: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    minHeight: 160,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: { marginTop: 8 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
});
