// src/components/StatCard.js
import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

export default function StatCard({
  icon,
  label,
  value,
  tone = "neutral",
  onPress,
}) {
  const { theme } = useTheme();
  const palette = getPalette(tone, theme);
  const Wrap = onPress ? Pressable : View;

  return (
    <Wrap
      onPress={onPress}
      style={({ pressed } = {}) => [
        styles.card,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: 1.5,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {/* Icon top-left */}
      <AppText style={styles.icon}>{icon}</AppText>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Value */}
      {typeof value === "string" || typeof value === "number" ? (
        <AppText
          weight="displayBlack"
          style={[styles.value, { color: palette.valueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {value}
        </AppText>
      ) : (
        value
      )}

      {/* Label */}
      <AppText
        style={[styles.label, { color: palette.labelColor }]}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Wrap>
  );
}

function getPalette(tone, theme) {
  switch ((tone, theme)) {
    case "warning":
      return {
        bg: "#2c1600", // deep burnt orange-brown
        border: "#b85c00", // vivid orange border
        valueColor: "#f97316", // orange number
        labelColor: "#b87340", // muted orange label
      };
    case "success":
      return {
        bg: "#071a0d", // very dark forest green
        border: "#155a2a", // mid green border
        valueColor: "#22c55e", // bright green number
        labelColor: "#4ade80", // lighter green label
      };
    case "spent":
      return {
        bg: "#12121e", // dark blue-grey — Total Spent tile
        border: "#2e2e4a", // cool blue-grey border
        valueColor: "#ffffff",
        labelColor: "#7878aa",
      };
    case "neutral":
    default:
      return {
        bg: "#1b1b28", // dark charcoal — Total Bookings tile
        border: "#2a2a40", // subtle purple-grey border
        valueColor: "#ffffff",
        labelColor: "#888899",
      };
  }
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 160,
    padding: 16,
    borderRadius: 18,
    overflow: "hidden",
    flexDirection: "column",
  },
  icon: {
    fontSize: 26,
    lineHeight: 32,
  },
  value: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
});
