// src/components/SkilledProzWordmark.js
import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

export default function SkilledProzWordmark({ size = "md", style }) {
  const { theme } = useTheme();
  const dims = SIZES[size] || SIZES.md;

  return (
    <View style={[styles.row, style]}>
      <AppText
        numberOfLines={1}
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
        numberOfLines={1}
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
  lg: { fontSize: 36, lineHeight: 42 }, // Made larger for the intro
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "nowrap", // Prevents breaking to the next line
    alignSelf: "center", // Centers the whole block
  },
});
