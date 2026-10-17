// App.js
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Syne_700Bold,
  Syne_800ExtraBold,
} from "@expo-google-fonts/syne";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";

import { ThemeProvider } from "./src/contexts/ThemeContext";
import { CurrencyProvider } from "./src/contexts/CurrencyContext";
import { ToastProvider } from "./src/contexts/ToastContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { initI18n } from "./src/i18n";
import i18n from "./src/i18n"; // same configured singleton
import useOTAUpdates from "./src/hooks/useOTAUpdates";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [langKey, setLangKey] = useState("en");

  // ── Silent OTA update check ─────────────────────────────────────────────
  // Runs on every cold start. If a new JS bundle is available on the
  // production channel, it downloads in the background and applies on the
  // next launch. Never blocks UI, never throws.
  useOTAUpdates();

  const [fontsLoaded] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    initI18n().then(() => {
      setI18nReady(true);
      setLangKey(i18n.language || "en");

      // Your i18n/index.js exports i18n as default (same singleton that
      // initI18n configures). Listening here guarantees langKey updates
      // every time changeLanguage() is called anywhere in the app.
      i18n.on("languageChanged", (lng) => setLangKey(lng));
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, i18nReady]);

  if (!fontsLoaded || !i18nReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <ThemeProvider>
          <CurrencyProvider>
            <ToastProvider>
              {/*
               * key={langKey} — when language changes, React unmounts and
               * remounts the entire navigator tree. Every screen calls
               * useTranslation() fresh with the new language.
               * Contexts above this line survive — user stays logged in.
               */}
              <RootNavigator key={langKey} />
            </ToastProvider>
          </CurrencyProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#080810",
  },
});
