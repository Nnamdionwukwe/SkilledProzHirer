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
import { SubscriptionProvider } from "./src/contexts/SubscriptionContext";
import { VoiceCallProvider } from "./src/contexts/VoiceCallContext";
import VoiceCallProviderUI from "./src/components/video/VoiceCallProvider";

import RootNavigator from "./src/navigation/RootNavigator";
import { initI18n } from "./src/i18n";
import i18n from "./src/i18n";
import useOTAUpdates from "./src/hooks/useOTAUpdates";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [langKey, setLangKey] = useState("en");

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
              <SubscriptionProvider>
                <VoiceCallProvider>
                  <RootNavigator key={langKey} />
                  {/*
                    Only VoiceCallProviderUI stays here — it does NOT use
                    useNavigation(), so it's safe outside the NavigationContainer.
                    The two banners use useNavigation(), so they're mounted
                    inside RootNavigator via the CallBanners screen instead.
                  */}
                  <VoiceCallProviderUI />
                </VoiceCallProvider>
              </SubscriptionProvider>
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
