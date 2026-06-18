// src/components/SkilledProzWordmark.js
import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

/**
 * SkilledProzWordmark — matches the "Skilled" white + "Proz" orange treatment
 * shown at the top of the drawer (and the marketing site). Use this anywhere
 * the brand wordmark needs to appear.
 *
 *   <SkilledProzWordmark size="lg" />
 */
export default function SkilledProzWordmark({ size = "md", style }) {
  const { theme } = useTheme();
  const dims = SIZES[size] || SIZES.md;

  return (
    <View style={[styles.row, style]}>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: dims.fontSize,
          lineHeight: dims.lineHeight,
          color: theme.colors.text,
          letterSpacing: -0.5,
        }}
      >
        Skilled
      </AppText>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: dims.fontSize,
          lineHeight: dims.lineHeight,
          color: theme.colors.orange,
          letterSpacing: -0.5,
        }}
      >
        Proz
      </AppText>
    </View>
  );
}

const SIZES = {
  sm: { fontSize: 18, lineHeight: 22 },
  md: { fontSize: 24, lineHeight: 28 },
  lg: { fontSize: 32, lineHeight: 36 },
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "baseline" },
});
