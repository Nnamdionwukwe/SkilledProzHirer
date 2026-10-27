// src/components/Panel.js
//
// Verbatim port of HirerDashboard.module.css `.panel` + `.panelHeader` +
// `.panelTitle` + `.panelLink`.
//
// Website structure:
//   <section className={styles.panel}>
//     <div className={styles.panelHeader}>
//       <h2 className={styles.panelTitle}>Recent Bookings</h2>
//       <Link className={styles.panelLink}>View all →</Link>
//     </div>
//     <div className={styles.bookingList}>{children}</div>
//   </section>
//
// CSS:
//   .panel { background: var(--bg-panel); border: 1px solid var(--border);
//            border-radius: clamp(10px,1.2vw,14px) → 14;
//            overflow: hidden; }
//   .panelHeader {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: clamp(10px,1.4vw,14px) clamp(10px,1.5vw,16px) → 14px 16px;
//     border-bottom: 1px solid var(--border);
//     gap: 8px; flex-wrap: wrap;
//   }
//   .panelTitle { font-family: var(--font-display);
//                 font-size: 0.9375rem → 13.13 @ 14;
//                 font-weight: 700; color: var(--text); line-height: 1.2; }
//   .panelLink  { font-size: 0.75rem → 10.5 @ 14;
//                 font-weight: 600; color: var(--orange);
//                 white-space: nowrap; }

import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { I18nManager } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

export default function Panel({
  title,
  actionLabel,
  onActionPress,
  children,
  style,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const arrow = I18nManager.isRTL ? "arrow-back" : "arrow-forward";

  return (
    <View
      style={[
        styles.panel,
        { backgroundColor: c.bgPanel, borderColor: c.border },
        style,
      ]}
    >
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <AppText style={[styles.title, { color: c.text }]} numberOfLines={1}>
          {title}
        </AppText>
        {onActionPress && actionLabel ? (
          <Pressable onPress={onActionPress} hitSlop={8} style={styles.link}>
            <AppText style={[styles.linkText, { color: c.orange }]}>
              {actionLabel}
            </AppText>
            <Ionicons name={arrow} size={11} color={c.orange} />
          </Pressable>
        ) : null}
      </View>
      <View>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
    flexWrap: "wrap",
  },
  title: {
    fontFamily: "Syne_700Bold",
    fontSize: 13.13, // 0.9375rem @ 14
    lineHeight: 16, // 1.2
    fontWeight: "700",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 10.5, // 0.75rem @ 14
    lineHeight: 14,
    fontWeight: "600",
  },
});
