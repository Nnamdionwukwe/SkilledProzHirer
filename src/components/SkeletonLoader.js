// src/components/SkeletonLoader.js
import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}) {
  const { theme, effectiveMode } = useTheme(); // ← FIXED
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const colors = theme.colors; // ← FIXED
  const isDark = effectiveMode === "dark"; // ← FIXED (was mode)

  const base = colors.bgCard;
  const hi = isDark ? colors.bgPanel : "#ffffff";

  const translate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: base,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          width: 140,
          backgroundColor: hi,
          opacity: isDark ? 0.6 : 0.9,
          transform: [{ translateX: translate }],
        }}
      />
    </View>
  );
}

/** Full-screen skeleton shown while authStore hydrates. */
export default function AppLoadingSkeleton() {
  const { theme } = useTheme(); // ← FIXED
  const colors = theme.colors; // ← FIXED

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <View style={styles.headerRow}>
        <SkeletonBlock width={130} height={22} />
        <SkeletonBlock width={36} height={36} radius={18} />
      </View>

      <SkeletonBlock
        width="100%"
        height={140}
        radius={20}
        style={{ marginTop: 28 }}
      />

      <View style={styles.statRow}>
        <SkeletonBlock width="31%" height={76} radius={16} />
        <SkeletonBlock width="31%" height={76} radius={16} />
        <SkeletonBlock width="31%" height={76} radius={16} />
      </View>

      <SkeletonBlock width="42%" height={16} style={{ marginTop: 34 }} />

      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.listRow}>
          <SkeletonBlock width={48} height={48} radius={24} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <SkeletonBlock width="72%" height={14} />
            <SkeletonBlock width="40%" height={12} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20, paddingTop: 64 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  listRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
});
