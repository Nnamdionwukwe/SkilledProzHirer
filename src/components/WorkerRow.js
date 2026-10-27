// src/components/WorkerRow.js
//
// Verbatim port of HirerDashboard.module.css `.workerRow`.
//
// Website JSX:
//   <Link className={styles.workerRow}>
//     <div className={styles.workerAvatar}>{initials | img}</div>
//     <div className={styles.workerInfo}>
//       <p className={styles.workerName}>{firstName} {lastName}</p>
//       <p className={styles.workerTitle}>{workerProfile.title}</p>
//     </div>
//     <div className={styles.workerRating}>
//       <span className={styles.star}><FiStar size={12}/></span>
//       <span>{avgRating?.toFixed(1) || "—"}</span>
//     </div>
//   </Link>
//
// CSS (phone root=14):
//   .workerRow  { padding: 12px 16px; min-height:52; gap:12;
//                 border-bottom: 1px hairline var(--border); }
//   .workerAvatar { 38×38, r=50%,
//                   bg rgba(129,140,248,0.12),
//                   border 1 rgba(129,140,248,0.2),
//                   font 0.75rem (10.5) 700, color #818cf8 }
//   .workerName  { 0.875rem (12.25), 600, lh 1.3 }
//   .workerTitle { 0.75rem (10.5), color dim, mt 2, lh 1.3 }
//   .workerRating { 0.8125rem (11.38), 600, color dim,
//                   gap 4, align center }
//   .star        { color #fbbf24, font-size 0.75rem (10.5), lh 1 }

import React from "react";
import { View, Pressable, StyleSheet, Image } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

export default function WorkerRow({ worker, onPress, showDivider = true }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const wp = worker.workerProfile ?? {};
  const name = `${worker.firstName ?? ""} ${worker.lastName ?? ""}`.trim();
  const title = wp.title ?? "";
  const rating = Number(wp.avgRating ?? 0);
  const ratingLabel = rating > 0 ? rating.toFixed(1) : "—";

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          borderBottomColor: c.border,
          borderBottomWidth: showDivider ? StyleSheet.hairlineWidth : 0,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.avatar}>
        {worker.avatar ? (
          <Image source={{ uri: worker.avatar }} style={styles.avatarImg} />
        ) : (
          <AppText style={styles.avatarText}>
            {initials(worker.firstName, worker.lastName)}
          </AppText>
        )}
      </View>

      <View style={styles.info}>
        <AppText style={[styles.name, { color: c.text }]} numberOfLines={1}>
          {name || "Worker"}
        </AppText>
        {!!title && (
          <AppText
            style={[styles.title, { color: c.textDim }]}
            numberOfLines={1}
          >
            {title}
          </AppText>
        )}
      </View>

      <View style={styles.rating}>
        <AppText style={styles.star}>★</AppText>
        <AppText style={[styles.ratingText, { color: c.textDim }]}>
          {ratingLabel}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(129, 140, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(129, 140, 248, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10.5, // 0.75rem @ 14
    lineHeight: 12,
    color: "#818cf8",
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12.25, // 0.875rem @ 14
    lineHeight: 16, // 1.3
    fontWeight: "600",
  },
  title: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10.5, // 0.75rem @ 14
    lineHeight: 14, // 1.3
    marginTop: 2,
  },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  star: {
    fontSize: 10.5, // 0.75rem @ 14
    lineHeight: 10.5, // 1
    color: "#fbbf24",
  },
  ratingText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11.38, // 0.8125rem @ 14
    lineHeight: 15,
    fontWeight: "600",
  },
});
