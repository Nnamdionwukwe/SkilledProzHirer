// src/components/AppText.js
import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

/**
 * AppText — every piece of text in the app should use this component.
 *
 * Variants map to the website's typographic system:
 *   - "display" / "displaySm" → Syne (the bold "Sign in to SkilledProz" headlines)
 *   - "title"   → DM Sans 600, larger
 *   - "body"    → DM Sans 400 (default)
 *   - "label"   → uppercase tracking, used for form labels and "WELCOME BACK"
 *   - "muted"   → for hints and helper text
 *
 * `tone` overrides color: "default" | "dim" | "muted" | "brand" | "danger" | "success"
 *
 * Because text is sized in `sp` and we don't allow OS-level font scaling beyond a
 * cap, layouts hold up across long languages (German, Russian) without breaking.
 */
export default function AppText({
  children,
  variant = "body",
  tone = "default",
  weight,
  align,
  style,
  numberOfLines,
  selectable,
  ...rest
}) {
  const { theme, fonts } = useTheme();

  const variantStyle = VARIANTS[variant] || VARIANTS.body;
  const fontFamily = weight
    ? FAMILY_BY_WEIGHT[weight] || fonts.body
    : variantStyle.fontFamily(fonts);

  const color = TONE_COLOR(tone, theme);

  return (
    <Text
      maxFontSizeMultiplier={1.3}
      numberOfLines={numberOfLines}
      selectable={selectable}
      style={[
        styles.base,
        { fontFamily, color },
        variantStyle.style,
        align && { textAlign: align },
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
}

const VARIANTS = {
  display: {
    fontFamily: (f) => f.displayBlack,
    style: { fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  },
  displaySm: {
    fontFamily: (f) => f.display,
    style: { fontSize: 28, lineHeight: 34, letterSpacing: -0.3 },
  },
  title: {
    fontFamily: (f) => f.bodySemiBold,
    style: { fontSize: 20, lineHeight: 26 },
  },
  subtitle: {
    fontFamily: (f) => f.bodyMedium,
    style: { fontSize: 16, lineHeight: 22 },
  },
  body: {
    fontFamily: (f) => f.body,
    style: { fontSize: 15, lineHeight: 21 },
  },
  small: {
    fontFamily: (f) => f.body,
    style: { fontSize: 13, lineHeight: 18 },
  },
  label: {
    fontFamily: (f) => f.bodySemiBold,
    style: {
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
  },
  muted: {
    fontFamily: (f) => f.body,
    style: { fontSize: 13, lineHeight: 18 },
  },
};

const FAMILY_BY_WEIGHT = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semibold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  display: "Syne_700Bold",
  displayBlack: "Syne_800ExtraBold",
};

const TONE_COLOR = (tone, theme) => {
  switch (tone) {
    case "dim":
      return theme.colors.textDim;
    case "muted":
      return theme.colors.textMuted;
    case "brand":
      return theme.colors.orange;
    case "danger":
      return theme.colors.red;
    case "success":
      return theme.colors.green;
    default:
      return theme.colors.text;
  }
};

const styles = StyleSheet.create({
  base: {
    // RN's default includeFontPadding on Android adds extra vertical space —
    // disabling gives us pixel-accurate alignment with the web design.
    includeFontPadding: false,
  },
});
