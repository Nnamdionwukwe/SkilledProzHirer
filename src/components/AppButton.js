// src/components/AppButton.js
import React from "react";
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

/**
 * AppButton — primary CTA used everywhere.
 *
 * variant:
 *   - "primary" (default): solid orange, dark text — matches "Sign In", "Continue →"
 *   - "secondary": panel bg with border — matches "← Back"
 *   - "ghost": transparent
 *   - "danger": red
 *
 * size: "md" (default) | "sm" | "lg"
 */
export default function AppButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = true,
  style,
}) {
  const { theme } = useTheme();
  const palette = getPalette(variant, theme, disabled);
  const dims = SIZE[size];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          borderWidth: variant === "secondary" || variant === "ghost" ? 1 : 0,
          paddingVertical: dims.py,
          paddingHorizontal: dims.px,
          borderRadius: dims.radius,
          opacity: pressed ? 0.85 : 1,
          width: fullWidth ? "100%" : undefined,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={palette.fg} />
        ) : (
          <>
            {iconLeft ? (
              <Ionicons
                name={iconLeft}
                size={dims.icon}
                color={palette.fg}
                style={{ marginRight: 8 }}
              />
            ) : null}
            <AppText
              variant={dims.textVariant}
              weight="semibold"
              style={{ color: palette.fg, textAlign: "center" }}
              numberOfLines={1}
            >
              {title}
            </AppText>
            {iconRight ? (
              <Ionicons
                name={iconRight}
                size={dims.icon}
                color={palette.fg}
                style={{ marginLeft: 8 }}
              />
            ) : null}
          </>
        )}
      </View>
    </Pressable>
  );
}

const SIZE = {
  sm: { py: 10, px: 16, radius: 10, icon: 16, textVariant: "small" },
  md: { py: 14, px: 20, radius: 12, icon: 18, textVariant: "subtitle" },
  lg: { py: 16, px: 24, radius: 14, icon: 20, textVariant: "subtitle" },
};

function getPalette(variant, theme, disabled) {
  const base = (() => {
    switch (variant) {
      case "secondary":
        return {
          bg: theme.colors.bgPanel,
          fg: theme.colors.text,
          border: theme.colors.border,
        };
      case "ghost":
        return {
          bg: "transparent",
          fg: theme.colors.text,
          border: theme.colors.border,
        };
      case "danger":
        return {
          bg: theme.colors.red,
          fg: "#ffffff",
          border: "transparent",
        };
      case "primary":
      default:
        return {
          // The website uses pure orange button with near-black text on the
          // "Sign In" CTA; we match that contrast.
          bg: theme.colors.orange,
          fg: "#0f0f1a",
          border: "transparent",
        };
    }
  })();

  if (disabled) {
    return { ...base, bg: theme.colors.orangeDim, fg: theme.colors.textDim };
  }
  return base;
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
