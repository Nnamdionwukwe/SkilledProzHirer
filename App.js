// App.js
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
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
import { PlatformPollerProvider } from "./src/contexts/PlatformPollerContext";
import VoiceCallProviderUI from "./src/components/video/VoiceCallProvider";
import VoiceCallBanner from "./src/components/video/VoiceCallBanner";
import LoadingScreen from "./src/components/LoadingScreen";
import FirstRunGate from "./src/screens/FirstRunGate";

import RootNavigator from "./src/navigation/RootNavigator";
import { initI18n } from "./src/i18n";
import i18n from "./src/i18n";
import useOTAUpdates from "./src/hooks/useOTAUpdates";
import { KeyboardProvider } from "react-native-keyboard-controller";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [langKey, setLangKey] = useState("en");

  useOTAUpdates();

  const [fontsLoaded, fontError] = useFonts({
    Syne_700Bold,
    Syne_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    initI18n()
      .then(() => {
        setI18nReady(true);
        setLangKey(i18n.language || "en");
        i18n.on("languageChanged", (lng) => setLangKey(lng));
      })
      .catch((err) => {
        console.log("❌ initI18n REJECTED:", err?.message || err);
        setI18nReady(true);
      });
  }, []);

  useEffect(() => {
    if (fontsLoaded && i18nReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, i18nReady, fontError]);

  if (!fontsLoaded || !i18nReady) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <ThemeProvider>
            <CurrencyProvider>
              <ToastProvider>
                <SubscriptionProvider>
                  <VoiceCallProvider>
                    <PlatformPollerProvider>
                      <FirstRunGate>
                        <RootNavigator key={langKey} />
                      </FirstRunGate>
                      <VoiceCallProviderUI />
                      {/* ✅ Root-level incoming-call banner */}
                      <VoiceCallBanner />
                    </PlatformPollerProvider>
                  </VoiceCallProvider>
                </SubscriptionProvider>
              </ToastProvider>
            </CurrencyProvider>
          </ThemeProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
