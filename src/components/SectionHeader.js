// src/components/SectionHeader.js
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { I18nManager } from "react-native";

/**
 * SectionHeader — title + optional "View all →" action.
 *
 *   <SectionHeader title="Recent Bookings" actionLabel="View all" onActionPress={fn} />
 */
export default function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress,
}) {
  const { theme } = useTheme();
  const arrow = I18nManager.isRTL ? "arrow-back" : "arrow-forward";

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <AppText variant="title" weight="bold">
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {onActionPress ? (
        <Pressable onPress={onActionPress} hitSlop={8} style={styles.action}>
          <AppText variant="small" weight="semibold" tone="brand">
            {actionLabel}
          </AppText>
          <Ionicons name={arrow} size={14} color={theme.colors.orange} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  action: { flexDirection: "row", alignItems: "center", gap: 4 },
});
