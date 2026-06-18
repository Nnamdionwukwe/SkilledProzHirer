// src/navigation/RootNavigator.js
import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthNavigator from "./AuthNavigator";
import HirerNavigator from "./HirerNavigator";
import WorkerNavigator from "./WorkerNavigator"; // ← ADD THIS
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../contexts/ThemeContext";

const VerifyStack = createNativeStackNavigator();

function VerifyGate() {
  return (
    <VerifyStack.Navigator screenOptions={{ headerShown: false }}>
      <VerifyStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </VerifyStack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isHydrated, hydrate } = useAuthStore();
  const { theme, effectiveMode } = useTheme();

  useEffect(() => {
    hydrate();
  }, []);

  if (!isHydrated) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator size="large" color={theme.colors.orange} />
      </View>
    );
  }

  const navTheme = {
    ...(effectiveMode === "light" ? DefaultTheme : DarkTheme),
    colors: {
      ...(effectiveMode === "light" ? DefaultTheme.colors : DarkTheme.colors),
      background: theme.colors.bg,
      card: theme.colors.bgPanel,
      text: theme.colors.text,
      border: theme.colors.border,
      primary: theme.colors.orange,
    },
  };

  // ── Four-way routing ────────────────────────────────────────────────────────
  // Not logged in       → AuthNavigator   (Login, Register, WorkerRegister…)
  // Logged in, unverified → VerifyGate   (VerifyEmail)
  // Logged in, HIRER    → HirerNavigator
  // Logged in, WORKER   → WorkerNavigator            ← NEW
  // ---------------------------------------------------------------------------
  let stack;
  if (!user) {
    stack = <AuthNavigator />;
  } else if (!user.isEmailVerified) {
    stack = <VerifyGate />;
  } else if (user.role === "WORKER") {
    // ← ADD THIS BRANCH
    stack = <WorkerNavigator />;
  } else {
    stack = <HirerNavigator />; // default — role === "HIRER"
  }

  return <NavigationContainer theme={navTheme}>{stack}</NavigationContainer>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
