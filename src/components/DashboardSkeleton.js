// src/components/DashboardSkeleton.js
//
// Verbatim port of HirerDashboard.module.css `.skeletonHeader` / `.skeletonCard`
// / `.skeletonPanel` + `@keyframes shimmer`.
//
// Sizes (phone root = 14):
//   skeletonHeader : h 32, w 180, radius 8, mb 18
//   skeletonCard   : h clamp(60px, 10vw, 90px)
//   skeletonPanel  : h clamp(180px, 25vw, 280px)
//   statCard radius: clamp(8px, 1.2vw, 12px)
//   panel radius   : clamp(10px, 1.2vw, 14px)
//
// Shimmer: 400px band sweeping horizontally at 1.4s. In RN we simulate this
// with an Animated.View that translates across the container.

import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, useWindowDimensions } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

function Shimmer({ height, width, radius, style, c }) {
  const anim = useRef(new Animated.Value(0)).current;
  const { width: screenW } = useWindowDimensions();

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-screenW, screenW],
  });

  return (
    <View
      style={[
        styles.skeletonBase,
        {
          backgroundColor: c.bgCard,
          height,
          width,
          borderRadius: radius,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmerBand,
          {
            transform: [{ translateX }],
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        ]}
      />
    </View>
  );
}

export default function DashboardSkeleton() {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width } = useWindowDimensions();

  // Responsive breakpoints — mirror the real dashboard.
  const statsRowSingle = width >= 768;
  const gridTwoCol = width >= 900;

  // clamp(60px, 10vw, 90px)
  const cardHeight = Math.min(90, Math.max(60, width * 0.1));
  // clamp(180px, 25vw, 280px)
  const panelHeight = Math.min(280, Math.max(180, width * 0.25));
  // clamp(8px, 1.2vw, 12px)
  const cardRadius = Math.min(12, Math.max(8, width * 0.012));
  // clamp(10px, 1.2vw, 14px)
  const panelRadius = Math.min(14, Math.max(10, width * 0.012));

  return (
    <View style={styles.container}>
      {/* skeletonHeader — 32 tall, 180 wide, radius 8, mb 18 */}
      <Shimmer
        c={c}
        height={32}
        width={180}
        radius={8}
        style={{ marginBottom: 18 }}
      />

      {/* Stats grid skeleton — mirrors .statsGrid layout */}
      <View style={styles.statsGrid}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.statCell,
              statsRowSingle ? styles.statCellSingleRow : styles.statCellTwoCol,
            ]}
          >
            <Shimmer c={c} height={cardHeight} radius={cardRadius} />
          </View>
        ))}
      </View>

      {/* Panels skeleton — mirrors .grid2 layout */}
      <View style={[styles.grid2, gridTwoCol && styles.grid2TwoCol]}>
        <View style={styles.grid2Cell}>
          <Shimmer c={c} height={panelHeight} radius={panelRadius} />
        </View>
        <View style={styles.grid2Cell}>
          <Shimmer c={c} height={panelHeight} radius={panelRadius} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  skeletonBase: {
    position: "relative",
  },
  shimmerBand: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "40%",
  },

  // .statsGrid mirrors (mobile 2 cols, ≥768 4 cols)
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    marginHorizontal: -6,
  },
  statCellTwoCol: {
    width: "50%",
    paddingHorizontal: 6,
    paddingBottom: 12,
  },
  statCellSingleRow: {
    width: "25%",
    paddingHorizontal: 7,
    paddingBottom: 0,
  },
  statCell: {},

  // .grid2 mirrors
  grid2: { gap: 16 },
  grid2TwoCol: { flexDirection: "row", gap: 18 },
  grid2Cell: { flex: 1, minWidth: 0 },
});
