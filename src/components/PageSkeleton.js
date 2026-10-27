// src/components/PageSkeleton.js
//
// Pre-composed skeleton layouts. One component, three variants:
//
//   <PageSkeleton variant="list"   rows={6} />
//   <PageSkeleton variant="detail" />
//   <PageSkeleton variant="form"   />
//   <PageSkeleton variant="booking-detail" />
//
// Every variant respects theme colors via useTheme. Drop inside <AppScreen>
// while the screen's `loading` flag is true.

import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton";
import { useTheme } from "../contexts/ThemeContext";

function wrapCard(c, children, style) {
  return (
    <View
      style={[
        {
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 16,
          gap: 10,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function ListSkeleton({ rows = 6, c }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      <Skeleton
        width={180}
        height={32}
        radius={8}
        style={{ marginBottom: 8 }}
      />
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            backgroundColor: c.bgPanel,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: 14,
            padding: 16,
            minHeight: 84,
          }}
        >
          <Skeleton.Circle size={40} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton.Line width="65%" height={12} />
            <Skeleton.Line width="40%" height={10} />
          </View>
          <Skeleton.Line width={70} height={12} />
        </View>
      ))}
    </ScrollView>
  );
}

function DetailSkeleton({ c }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Back link */}
      <Skeleton width={120} height={26} radius={20} />
      {/* Title block */}
      <Skeleton width="100%" height={110} radius={16} />
      {/* Timeline / tab strip */}
      <Skeleton width="100%" height={64} radius={14} />
      {/* Description */}
      {wrapCard(
        c,
        <>
          <Skeleton.Line width={90} height={10} />
          <Skeleton width="100%" height={14} radius={6} />
          <Skeleton width="85%" height={14} radius={6} />
          <Skeleton width="70%" height={14} radius={6} />
        </>,
      )}
      {/* Info grid — two columns of cards */}
      {wrapCard(
        c,
        <>
          <Skeleton.Line width={90} height={10} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Skeleton width="48%" height={60} radius={10} />
            <Skeleton width="48%" height={60} radius={10} />
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Skeleton width="48%" height={60} radius={10} />
            <Skeleton width="48%" height={60} radius={10} />
          </View>
        </>,
      )}
      {/* Action card */}
      <Skeleton width="100%" height={120} radius={14} />
    </ScrollView>
  );
}

function FormSkeleton({ c }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 14 }}
      showsVerticalScrollIndicator={false}
    >
      <Skeleton width={140} height={10} radius={4} />
      <Skeleton width="80%" height={28} radius={8} />
      <Skeleton
        width="60%"
        height={14}
        radius={4}
        style={{ marginBottom: 8 }}
      />
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ gap: 6 }}>
          <Skeleton.Line width={80} height={10} />
          <Skeleton width="100%" height={48} radius={12} />
        </View>
      ))}
      <Skeleton width="100%" height={120} radius={12} />
      <Skeleton width="100%" height={48} radius={12} />
      <Skeleton width="100%" height={48} radius={12} />
    </ScrollView>
  );
}

function BookingDetailSkeleton({ c }) {
  return (
    <ScrollView
      contentContainerStyle={{ padding: 8, paddingBottom: 40, gap: 10 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Back link */}
      <Skeleton width={140} height={26} radius={20} />
      {/* Title block */}
      <Skeleton width="100%" height={110} radius={16} />
      {/* Timeline */}
      <Skeleton width="100%" height={76} radius={14} />
      {/* Description / Job info */}
      <Skeleton width="100%" height={140} radius={14} />
      {/* Job details grid — 4 cells */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 14,
          padding: 14,
          gap: 8,
        }}
      >
        <Skeleton.Line width={90} height={10} />
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 12,
              borderWidth: 1,
              borderRadius: 10,
              borderColor: c.border,
              backgroundColor: c.bgCard,
            }}
          >
            <Skeleton.Circle size={20} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton.Line width="40%" height={9} />
              <Skeleton.Line width="70%" height={12} />
            </View>
          </View>
        ))}
      </View>
      {/* Party card */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 20,
          alignItems: "center",
          gap: 10,
        }}
      >
        <Skeleton.Circle size={56} />
        <Skeleton.Line width={140} height={14} />
        <Skeleton.Line width={100} height={11} />
        <Skeleton width="100%" height={40} radius={8} />
      </View>
      {/* Actions card */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          borderWidth: 1,
          borderRadius: 16,
          padding: 18,
          gap: 10,
        }}
      >
        <Skeleton.Line width={80} height={10} />
        <Skeleton width="100%" height={42} radius={10} />
        <Skeleton width="100%" height={42} radius={10} />
        <Skeleton width="100%" height={42} radius={10} />
      </View>
    </ScrollView>
  );
}

export default function PageSkeleton({ variant = "list", rows, style }) {
  const { theme } = useTheme();
  const c = theme.colors;

  switch (variant) {
    case "detail":
      return (
        <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
          <DetailSkeleton c={c} />
        </View>
      );
    case "form":
      return (
        <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
          <FormSkeleton c={c} />
        </View>
      );
    case "booking-detail":
      return (
        <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
          <BookingDetailSkeleton c={c} />
        </View>
      );
    case "list":
    default:
      return (
        <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
          <ListSkeleton rows={rows ?? 6} c={c} />
        </View>
      );
  }
}
