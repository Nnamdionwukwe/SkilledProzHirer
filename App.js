// App.js
import "react-native-gesture-handler";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
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
import VideoCallBanner from "./src/components/video/VideoCallBanner";

// ✅ NEW — push + native call UI
import { useAuthStore } from "./src/store/authStore";
import { registerPushToken } from "./src/services/pushRegistration";
import { initCallKeep } from "./src/services/callKeepBridge";
import { BACKGROUND_CALL_TASK } from "./src/services/pushHandler";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);
  const [langKey, setLangKey] = useState("en");

  useOTAUpdates();

  // ✅ NEW — read the current user so we can re-register the token per login
  const { user, isHydrated } = useAuthStore();

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

  // ✅ NEW — initialise CallKeep once at app start
  useEffect(() => {
    try {
      initCallKeep();
    } catch (err) {
      console.warn("CallKeep init failed:", err?.message);
    }
  }, []);

  // ✅ NEW — re-register the background push task on every launch
  useEffect(() => {
    Notifications.registerTaskAsync(BACKGROUND_CALL_TASK).catch(() => {});
  }, []);

  // ✅ NEW — register the device's push token once the user is hydrated
  // and logged in. Runs every time the user changes (login/logout/switch
  // account) so the backend always has the correct token for the current
  // session.
  useEffect(() => {
    if (isHydrated && user?.id) {
      registerPushToken().catch((err) =>
        console.warn("Push token registration failed:", err?.message),
      );
    }
  }, [isHydrated, user?.id]);

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
                      <VideoCallBanner />
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
