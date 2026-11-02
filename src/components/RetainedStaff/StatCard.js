// src/components/RetainedStaff/StatCard.js
//
// Ported from .statCard / .statIcon / .statLabel / .statValue
// in HirerRetainedStaff.module.css.
//
// Icons (web FiUsers / FiDollarSign / FiClock / FiCheckCircle) are
// passed in as Ionicons names by the parent screen.
//
// Renders the top gradient bar (::before pseudo) as a real <View>.

import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";

const ACCENT = {
  default: (t) => ({ bg: t.colors.bgCard, fg: t.colors.textDim }),
  orange: (t) => ({ bg: t.colors.orangeDim, fg: t.colors.orange }),
  green: (t) => ({ bg: t.colors.greenDim, fg: t.colors.green }),
  yellow: () => ({ bg: "rgba(251, 191, 36, 0.15)", fg: "#fbbf24" }),
};

export default function StatCard({ icon, label, value, accent = "default" }) {
  const { theme, fontScale } = useTheme();
  const { width } = useWindowDimensions();
  const palette = (ACCENT[accent] || ACCENT.default)(theme);

  // rem → px (Option B): px = rem × 16 × fontScale
  const isCompact = width <= 640;
  const statIconSize = isCompact ? 36 : 42;
  const statIconInner = isCompact ? 16 : 20;

  const labelFs = isCompact ? 0.6 * 16 * fontScale : 0.65 * 16 * fontScale;
  const labelLs = (isCompact ? 0.08 : 0.1) * labelFs;

  const valueRaw = Math.min(1.5 * 16, Math.max(1.125 * 16, width * 0.035));
  const valueFs = (isCompact ? 1.05 * 16 : valueRaw) * fontScale;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.bgPanel,
          borderColor: theme.colors.border,
          paddingVertical: isCompact ? 14 : 18,
          paddingHorizontal: isCompact ? 10 : 16,
          borderRadius: isCompact ? 12 : 14,
        },
      ]}
    >
      {/* Top gradient bar (::before) */}
      <View
        pointerEvents="none"
        style={[
          styles.topBar,
          {
            backgroundColor: theme.colors.orange,
            opacity: 0.5,
          },
        ]}
      />

      <View style={styles.row}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: palette.bg,
              width: statIconSize,
              height: statIconSize,
              borderRadius: 10,
            },
          ]}
        >
          <Ionicons name={icon} size={statIconInner} color={palette.fg} />
        </View>
        <View style={styles.info}>
          <AppText
            numberOfLines={1}
            style={{
              fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
              fontSize: labelFs,
              lineHeight: labelFs * 1.3,
              letterSpacing: labelLs,
              textTransform: "uppercase",
              color: theme.colors.textMuted,
              fontWeight: "700",
            }}
          >
            {label}
          </AppText>
          <AppText
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={{
              fontFamily: theme.fonts?.displayBlack || "Syne_800ExtraBold",
              fontSize: valueFs,
              lineHeight: valueFs * 1.1,
              letterSpacing: -0.03 * valueFs,
              color: theme.colors.text,
              fontWeight: "800",
              marginTop: 2,
            }}
          >
            {value}
          </AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: "hidden",
    minHeight: 82,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
});
