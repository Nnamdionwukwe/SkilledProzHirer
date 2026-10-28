// src/navigation/RootNavigator.js
//
// Top-level navigator.
//
// A top-level Stack wraps the four possible "roots" (auth / verify /
// worker / hirer) plus an invisible CallBanners overlay screen mounted
// on top. The banner screen has presentation: "transparentModal" so it
// renders above everything without blocking touches.
//
// Why a Stack: banners use useNavigation(), which throws if the caller
// is not inside a NavigationContainer. Mounting them as siblings of the
// container (in App.js) broke navigation. Putting them in a Stack.Screen
// inside the container fixes that while keeping the four-way auth split.

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
import WorkerNavigator from "./WorkerNavigator";
import CallBannersScreen from "./CallBannersScreen";
import VerifyEmailScreen from "../screens/auth/VerifyEmailScreen";
import { navigationRef } from "./navigationRef";
import { useAuthStore } from "../store/authStore";
import { useTheme } from "../contexts/ThemeContext";

const VerifyStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

function VerifyGate() {
  return (
    <VerifyStack.Navigator screenOptions={{ headerShown: false }}>
      <VerifyStack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
    </VerifyStack.Navigator>
  );
}

// Wraps the current "root branch" as a single RootStack screen so that
// the CallBanners overlay can live as a sibling on top of it.
function RootBranchScreen() {
  const { user } = useAuthStore();

  if (!user) return <AuthNavigator />;
  if (!user.isEmailVerified) return <VerifyGate />;
  if (user.role === "WORKER") return <WorkerNavigator />;
  return <HirerNavigator />;
}

export default function RootNavigator() {
  const { isHydrated, hydrate } = useAuthStore();
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

  return (
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          // Don't animate transitions on the root branch — auth changes
          // (login, verify, role switch) should feel instant, not slide.
          animation: "none",
        }}
      >
        <RootStack.Screen name="RootBranch" component={RootBranchScreen} />
        <RootStack.Screen
          name="CallBanners"
          component={CallBannersScreen}
          options={{
            headerShown: false,
            presentation: "transparentModal",
            animation: "none",
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
});
