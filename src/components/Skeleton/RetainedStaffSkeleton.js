// src/components/Skeleton/RetainedStaffSkeleton.js
//
// Mirrors the loading block in HirerRetainedStaffDashboard.jsx:
//   header (3 lines) + right button + 4 KPI cards + 1 card (200h) + table (4 rows, 3 cols)
// Uses the app's existing <Skeleton /> primitive (from src/components/Skeleton.js)
// for shimmer — DO NOT rebuild the shimmer here.

import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Skeleton from "../Skeleton";
import { useTheme } from "../../contexts/ThemeContext";

export default function RetainedStaffSkeleton() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const isXWide = width >= 900;

  // KPI grid: 2 cols on mobile, 4 cols on >=768 (mirrors CSS)
  const kpiCols = isWide ? 4 : 2;
  const kpiGap = 12;
  const kpiWidthPct = kpiCols === 4 ? "23%" : "48%";

  // Two-column panels on >=900 (mirrors .twoCol media query)
  const panelWidthPct = isXWide ? "48%" : "100%";

  return (
    <View style={styles.page}>
      {/* Header */}
      <View style={[styles.header, isWide && styles.headerRow]}>
        <View style={styles.headerLeft}>
          <Skeleton width={140} height={12} style={{ marginBottom: 8 }} />
          <Skeleton width={200} height={26} style={{ marginBottom: 6 }} />
          <Skeleton width={160} height={14} />
        </View>
        <Skeleton
          width={160}
          height={40}
          radius={8}
          style={{ marginTop: isWide ? 0 : 12 }}
        />
      </View>

      {/* KPI grid */}
      <View style={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.kpiCell,
              { width: kpiWidthPct, marginBottom: kpiGap },
            ]}
          >
            <Skeleton width="100%" height={82} radius={14} />
          </View>
        ))}
      </View>

      {/* Two-column panels */}
      <View style={[styles.twoCol, isXWide && styles.twoColRow]}>
        <View style={{ width: panelWidthPct, marginBottom: 16 }}>
          <Skeleton width="100%" height={200} radius={12} />
        </View>
        <View style={{ width: panelWidthPct }}>
          <Skeleton width="100%" height={200} radius={12} />
        </View>
      </View>

      {/* Table skeleton */}
      <View style={styles.tableBlock}>
        {Array.from({ length: 4 }).map((_, i) => (
          <View key={i} style={styles.tableRow}>
            <Skeleton width="40%" height={14} />
            <Skeleton width="25%" height={14} />
            <Skeleton width="20%" height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    gap: 16,
  },
  header: {
    gap: 12,
    marginBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexShrink: 1,
  },
  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  kpiCell: {},
  twoCol: {
    flexDirection: "column",
  },
  twoColRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tableBlock: {
    gap: 12,
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
});
