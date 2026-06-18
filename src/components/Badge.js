// src/components/Badge.js
import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Badge — themed status pill.
 *
 *   <Badge tone="success">Accepted</Badge>
 *   <Badge tone="danger">Disputed</Badge>
 *
 * Tones: "success" | "warning" | "danger" | "info" | "neutral"
 * Or pass `status` directly (PENDING / ACCEPTED / COMPLETED / etc.) and it
 * auto-picks the right tone.
 */
export default function Badge({ children, tone, status, size = "sm" }) {
  const { theme } = useTheme();
  const effectiveTone = tone || toneFromStatus(status);
  const palette = getPalette(effectiveTone, theme);
  const label = String(children ?? status ?? "").toUpperCase();

  return (
    <View
      style={[
        styles.base,
        size === "sm" ? styles.sm : styles.md,
        { backgroundColor: palette.bg, borderColor: palette.border },
      ]}
    >
      <AppText
        weight="bold"
        style={{
          color: palette.fg,
          fontSize: size === "sm" ? 10 : 11,
          letterSpacing: 0.8,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

function toneFromStatus(status) {
  switch ((status || "").toUpperCase()) {
    case "ACCEPTED":
    case "COMPLETED":
    case "RELEASED":
    case "VERIFIED":
    case "ACTIVE":
      return "success";
    case "PENDING":
    case "IN_PROGRESS":
    case "HELD":
    case "PROCESSING":
      return "warning";
    case "REJECTED":
    case "CANCELLED":
    case "DISPUTED":
    case "FAILED":
    case "REFUNDED":
      return "danger";
    case "OPEN":
      return "info";
    default:
      return "neutral";
  }
}

function getPalette(tone, theme) {
  switch (tone) {
    case "success":
      return {
        fg: theme.colors.green,
        bg: theme.colors.greenDim,
        border: theme.colors.greenDim,
      };
    case "warning":
      return {
        fg: theme.colors.orange,
        bg: theme.colors.orangeDim,
        border: theme.colors.orangeDim,
      };
    case "danger":
      return {
        fg: theme.colors.red,
        bg: theme.colors.redDim,
        border: theme.colors.redDim,
      };
    case "info":
      return {
        fg: theme.colors.orange,
        bg: theme.colors.orangeDim,
        border: theme.colors.orangeDim,
      };
    case "neutral":
    default:
      return {
        fg: theme.colors.textDim,
        bg: theme.colors.bgCard,
        border: theme.colors.border,
      };
  }
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: 6,
    borderWidth: 1,
  },
  sm: { paddingHorizontal: 8, paddingVertical: 4 },
  md: { paddingHorizontal: 10, paddingVertical: 6 },
});
