// src/components/Card.js
import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

/**
 * Card — themed panel used as a container for list sections.
 * Matches the rounded bordered panels on the website dashboard.
 */
export default function Card({ children, padded = true, style }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.bgPanel,
          borderColor: theme.colors.border,
        },
        padded && styles.padded,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
  },
  padded: {
    padding: 16,
  },
});
