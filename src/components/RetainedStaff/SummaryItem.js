// src/components/RetainedStaff/SummaryItem.js
//
// Ported from .summaryItem / .summaryLabel / .summaryValue
// in HirerRetainedStaff.module.css.

import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

export default function SummaryItem({ label, value, isLast = false }) {
  const { theme, fontScale } = useTheme();
  const labelFs = 0.85 * 16 * fontScale;
  const valueFs = 0.95 * 16 * fontScale;

  return (
    <View
      style={[
        styles.row,
        {
          borderBottomColor: theme.colors.border,
          borderBottomWidth: isLast ? 0 : 1,
        },
      ]}
    >
      <AppText
        style={{
          fontFamily: theme.fonts?.body || "DMSans_400Regular",
          fontSize: labelFs,
          lineHeight: labelFs * 1.35,
          fontWeight: "500",
          color: theme.colors.textDim,
        }}
      >
        {label}
      </AppText>
      <AppText
        weight="displayBlack"
        style={{
          fontSize: 13,
          letterSpacing: -0.5,
          marginBottom: 4,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
});
