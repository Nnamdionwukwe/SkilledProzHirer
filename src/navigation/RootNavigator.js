// src/navigation/RootNavigator.js
//
// Top-level navigator. Four-way branch: auth / verify / hirer / worker.
//
// The incoming-call banners are mounted INSIDE HirerNavigator and
// WorkerNavigator (see CallOverlay there) so they render above the drawer
// without stealing focus. Mounting them as a separate RootStack screen
// broke every drawer action because RootStack couldn't handle openDrawer.

import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";

import AuthNavigator from "./AuthNavigator";
import HirerNavigator from "./HirerNavigator";
import WorkerNavigator from "./WorkerNavigator";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";
import { navigationRef } from "./navigationRef";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../contexts/ThemeContext";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

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

  let stack;
  if (!user) stack = <AuthNavigator />;
  else if (!user.isEmailVerified) stack = <VerifyGate />;
  else if (user.role === "WORKER") stack = <WorkerNavigator />;
  else stack = <HirerNavigator />;

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {stack}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
