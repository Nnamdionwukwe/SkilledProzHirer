// src/components/posts/PostSkeleton.js
//
// Port of PostCardSkeleton.jsx + PostCardSkeleton.module.css.
// Uses the app's existing <Skeleton /> primitive for shimmer — we don't
// rebuild the animation.

import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Skeleton from "../Skeleton";
import { useTheme } from "../../contexts/ThemeContext";

export default function PostSkeleton() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 480;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.bgPanel,
          borderColor: theme.colors.border,
        },
      ]}
      aria-hidden
    >
      {/* Header */}
      <View
        style={[styles.header, { padding: isWide ? 20 : 14, paddingBottom: 0 }]}
      >
        <Skeleton
          width={isWide ? 44 : 40}
          height={isWide ? 44 : 40}
          radius={999}
        />
        <View style={{ flex: 1, gap: 6 }}>
          <Skeleton width="40%" height={12} radius={4} />
          <Skeleton width="30%" height={10} radius={4} />
          <Skeleton width="22%" height={9} radius={4} />
        </View>
        <Skeleton width={60} height={24} radius={6} />
      </View>

      {/* Content */}
      <View style={{ padding: isWide ? 20 : 14, gap: 8 }}>
        <Skeleton width="100%" height={12} radius={4} />
        <Skeleton width="100%" height={12} radius={4} />
        <Skeleton width="65%" height={12} radius={4} />
      </View>

      {/* Image */}
      <View
        style={{
          paddingHorizontal: isWide ? 20 : 14,
          paddingBottom: isWide ? 14 : 12,
        }}
      >
        <Skeleton width="100%" height={isWide ? 240 : 180} radius={10} />
      </View>

      {/* Count row */}
      <View
        style={[
          styles.countRow,
          {
            borderTopColor: theme.colors.border,
            paddingHorizontal: isWide ? 20 : 14,
          },
        ]}
      >
        <Skeleton width={60} height={12} radius={999} />
        <Skeleton width={60} height={12} radius={999} />
      </View>

      {/* Action bar */}
      <View
        style={[
          styles.actionBar,
          {
            borderTopColor: theme.colors.border,
            paddingHorizontal: isWide ? 8 : 4,
          },
        ]}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.actionBtn}>
            <Skeleton
              width={isWide ? 16 : 15}
              height={isWide ? 16 : 15}
              radius={999}
            />
            <Skeleton width={32} height={10} radius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
});
