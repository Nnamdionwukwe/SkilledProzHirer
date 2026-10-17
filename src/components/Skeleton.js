// src/components/Skeleton.js
//
// Shared skeleton primitive for the whole app.
// Mirrors the web's Refund.module.css shimmer treatment:
//   - 1.4s shimmer sweep, 400px gradient across
//   - pulsing opacity fallback for very small screens
//
// Usage:
//   <Skeleton width={120} height={14} radius={6} />
//   <Skeleton width={40} height={40} radius={20} />  // circle
//   <Skeleton.Block style={{ height: 80 }} />
//
// Or use the higher-order helpers to lay out a whole skeleton screen.

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

// ── Base skeleton block ────────────────────────────────────────────────────
export default function Skeleton({
  width = "100%",
  height = 14,
  radius = 6,
  style,
  animated = true,
}) {
  const { theme: th } = useTheme();
  const c = th.colors;

  const shimmer = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;

    // Two parallel animations: a shimmer sweep across the bar, and a
    // gentle opacity pulse so small blocks (like 40x40 circles) still
    // read as "loading" even when the shimmer isn't visible.
    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1400,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );

    shimmerLoop.start();
    pulseLoop.start();

    return () => {
      shimmerLoop.stop();
      pulseLoop.stop();
    };
  }, [animated]);

  // Interpolate shimmer from -1 → 1 so it can translate across
  const shimmerTranslate = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  const isCircle = radius >= height / 2 && width === height;

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: isCircle ? height / 2 : radius,
          backgroundColor: c.bgCard,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {animated && (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity,
                backgroundColor: c.bgCard,
              },
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [{ translateX: shimmerTranslate }],
              },
            ]}
          >
            <View
              style={{
                flex: 1,
                width: 200,
                backgroundColor: c.bgCard,
                opacity: 0.8,
              }}
            />
          </Animated.View>
          {/* Lighter sweep overlay */}
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                transform: [{ translateX: shimmerTranslate }],
                backgroundColor:
                  th.mode === "dark"
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(0,0,0,0.04)",
                width: 120,
              },
            ]}
          />
        </>
      )}
    </View>
  );
}

// ── Common pre-shaped skeletons ───────────────────────────────────────────
Skeleton.Line = function Line({ width = "100%", height = 12, style }) {
  return <Skeleton width={width} height={height} radius={4} style={style} />;
};

Skeleton.Circle = function Circle({ size = 40, style }) {
  return (
    <Skeleton width={size} height={size} radius={size / 2} style={style} />
  );
};

Skeleton.Card = function Card({ height = 80, style }) {
  return <Skeleton width="100%" height={height} radius={14} style={style} />;
};

// ── Row helper: avatar + two lines ────────────────────────────────────────
Skeleton.ListRow = function ListRow({ style }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          gap: 12,
        },
        style,
      ]}
    >
      <Skeleton.Circle size={40} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton.Line width="70%" height={14} />
        <Skeleton.Line width="40%" height={11} />
      </View>
      <Skeleton.Line width={60} height={20} />
    </View>
  );
};
