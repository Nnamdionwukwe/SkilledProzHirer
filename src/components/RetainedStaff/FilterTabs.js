// src/components/RetainedStaff/FilterTabs.js
//
// Ported from .filterTabs / .filterTab / .filterTabActive
// in HirerRetainedStaff.module.css.
// Horizontally scrollable on mobile (mirrors the ≤640px CSS rule).

import React from "react";
import {
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

export default function FilterTabs({ options, value, onChange }) {
  const { theme, fontScale } = useTheme();
  const { width } = useWindowDimensions();
  const isCompact = width <= 640;

  const fs = (isCompact ? 0.7 : 0.78) * 16 * fontScale;
  const padV = isCompact ? 0.3 * 16 : 0.4 * 16;
  const padH = isCompact ? 0.65 * 16 : 0.875 * 16;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((opt) => {
        const active = opt === value;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: active
                  ? theme.colors.orangeDim
                  : theme.colors.bgCard,
                borderColor: active ? theme.colors.orange : theme.colors.border,
                paddingVertical: padV,
                paddingHorizontal: padH,
                borderRadius: 999,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                fontSize: fs,
                lineHeight: fs * 1.3,
                fontWeight: "600",
                color: active ? theme.colors.orange : theme.colors.textDim,
              }}
            >
              {opt}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 6,
    paddingBottom: 4,
  },
  tab: {
    borderWidth: 1,
    flexShrink: 0,
  },
});
