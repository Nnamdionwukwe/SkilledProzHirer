// src/components/AppScreen.js
import React from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar as RNStatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useTheme } from "../contexts/ThemeContext";

/**
 * AppScreen — every screen mounts inside this wrapper. It handles:
 *  - safe areas (notches, gesture bars)
 *  - themed background
 *  - keyboard avoidance
 *  - optional scroll
 *  - status bar style synced with the active theme
 *  - pull-to-refresh (pass a <RefreshControl /> via `refreshControl` prop)
 */
export default function AppScreen({
  children,
  scroll = true,
  keyboard = true,
  padded = true,
  edges = ["left", "right", "bottom"],
  contentContainerStyle,
  refreshControl,
  style,
}) {
  const { theme, effectiveMode } = useTheme();

  const body = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={refreshControl}
      contentContainerStyle={[
        styles.scrollContent,
        padded && styles.padded,
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.viewContent,
        padded && styles.padded,
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safe, { backgroundColor: theme.colors.bg }, style]}
    >
      <StatusBar style={effectiveMode === "light" ? "dark" : "light"} />
      {keyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.flex}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? 0 : RNStatusBar.currentHeight || 0
          }
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  viewContent: { flex: 1 },
  padded: { paddingHorizontal: 20, paddingVertical: 16 },
});
