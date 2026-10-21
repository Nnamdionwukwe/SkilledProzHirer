// src/screens/auth/RegisterScreen.js
import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import {
  AuthShell,
  AuthButton,
  AuthAlert,
} from "../../components/auth/AuthShell";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = () => {
    if (!selected) return;

    if (selected === "HIRER") {
      navigation.navigate("RegisterHirer");
    } else {
      navigation.navigate("WorkerRegister");
    }
  };

  return (
    <AuthShell showBack backTo="Login">
      {/* ── Header ── */}
      <View style={styles.header}>
        <AppText
          variant="small"
          weight="bold"
          style={{
            color: c.orange,
            textTransform: "uppercase",
            letterSpacing: 1.8,
            fontSize: 11,
            marginBottom: 6,
          }}
        >
          {t("auth.getStartedFree", {
            defaultValue: "GET STARTED — IT'S FREE",
          })}
        </AppText>
        <AppText
          variant="display"
          weight="displayBlack"
          style={{
            fontSize: 34,
            letterSpacing: -1.5,
            lineHeight: 38,
            marginBottom: 4,
          }}
        >
          {t("auth.joinTitle", { defaultValue: "Join\nSkilledProz" })}
        </AppText>
        <AppText
          variant="body"
          tone="dim"
          style={{ fontSize: 14, marginTop: 6, lineHeight: 22 }}
        >
          {t("auth.joinSubtitle", {
            defaultValue: "How will you use the platform?",
          })}
        </AppText>
      </View>

      {error ? <AuthAlert type="error" message={error} /> : null}

      {/* ── Role Grid ── */}
      <View style={styles.roleGrid}>
        {/* HIRER CARD */}
        <Pressable
          onPress={() => setSelected("HIRER")}
          disabled={loading}
          style={({ pressed }) => [
            styles.roleCard,
            {
              backgroundColor: selected === "HIRER" ? c.orangeDim : c.bgCard,
              borderColor: selected === "HIRER" ? c.orange : c.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: c.orangeDim }]}>
            <Ionicons name="briefcase-outline" size={20} color={c.orange} />
          </View>
          <AppText
            variant="body"
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.3,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            {t("auth.imAHirer", { defaultValue: "I'm a Hirer" })}
          </AppText>
          <AppText
            variant="small"
            tone="muted"
            style={{ fontSize: 12.5, lineHeight: 18 }}
          >
            {t("auth.hirerDescription", {
              defaultValue: "Find and book skilled professionals for any job.",
            })}
          </AppText>
        </Pressable>

        {/* WORKER CARD */}
        <Pressable
          onPress={() => setSelected("WORKER")}
          disabled={loading}
          style={({ pressed }) => [
            styles.roleCard,
            {
              backgroundColor: selected === "WORKER" ? c.orangeDim : c.bgCard,
              borderColor: selected === "WORKER" ? c.orange : c.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View style={[styles.roleIcon, { backgroundColor: c.orangeDim }]}>
            <Ionicons name="hammer-outline" size={20} color={c.orange} />
          </View>
          <AppText
            variant="body"
            weight="displayBlack"
            style={{
              fontSize: 15,
              letterSpacing: -0.3,
              marginTop: 10,
              marginBottom: 4,
            }}
          >
            {t("auth.imAWorker", { defaultValue: "I'm a Worker" })}
          </AppText>
          <AppText
            variant="small"
            tone="muted"
            style={{ fontSize: 12.5, lineHeight: 18 }}
          >
            {t("auth.workerDescription", {
              defaultValue: "Offer your skills and get booked by clients.",
            })}
          </AppText>
        </Pressable>
      </View>

      {/* ── Continue Button ── */}
      <AuthButton
        title={
          loading
            ? t("auth.creating", { defaultValue: "Creating account…" })
            : `${t("auth.continueAs", { defaultValue: "Continue as" })} ${
                selected === "HIRER"
                  ? t("auth.imAHirer", { defaultValue: "Hirer" })
                  : selected === "WORKER"
                    ? t("auth.imAWorker", { defaultValue: "Worker" })
                    : "…"
              }`
        }
        onPress={handleContinue}
        loading={loading}
        disabled={!selected}
        style={{ marginTop: 24 }}
      />

      {/* ── Footer ── */}
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
  header: {
    marginBottom: 28,
  },
  roleGrid: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 24,
  },
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: "flex-start",
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
    flexWrap: "wrap",
  },
});
