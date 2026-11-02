// src/components/EmptyState.js
//
// Generic empty-state used by retained-staff dashboard panels + future screens.
// Matches the web's .emptyPanel / .emptyState rules from
// HirerRetainedStaff.module.css (dashed border variant uses `bordered`).

import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

export default function EmptyState({
  icon = "information-circle-outline",
  iconSize = 32,
  title,
  text,
  bordered = false,
  compact = false,
  children,
  style,
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        compact && styles.wrapCompact,
        bordered && {
          backgroundColor: theme.colors.bgPanel,
          borderColor: theme.colors.border,
          borderWidth: 1.5,
          borderStyle: "dashed",
          borderRadius: 14,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={theme.colors.textMuted} />
      {title ? (
        <AppText variant="title" weight="bold" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {text ? (
        <AppText
          variant="small"
          tone="dim"
          align="center"
          style={[styles.text, { color: theme.colors.textDim }]}
        >
          {text}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    paddingHorizontal: 24,
    gap: 12,
  },
  wrapCompact: {
    paddingVertical: 24,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center",
    marginTop: 4,
  },
  text: {
    maxWidth: 380,
    marginTop: 2,
  },
});
