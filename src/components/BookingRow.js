// src/components/BookingRow.js
//
// Verbatim port of HirerDashboard.module.css `.bookingRow`.
//
// Website JSX (verbatim structure):
//   <Link className={styles.bookingRow}>
//     <div className={styles.bookingRowLeft}>
//       <div className={styles.bookingAvatar}>{initials | img}</div>
//       <div className={styles.bookingInfo}>
//         <p className={styles.bookingTitle}>{title}</p>
//         <p className={styles.bookingMeta}>{worker} · {category}</p>
//         <p className={styles.bookingDate}>{scheduledAt formatted}</p>
//       </div>
//     </div>
//     <div className={styles.bookingRowRight}>
//       {agreedRate>0 && <span className={styles.bookingRate}>
//          {symbol}{agreedRate.toLocaleString()}
//        </span>}
//       <span className={styles.badge + styles[`badge_${status}`]}>
//          {status.replace("_"," ")}
//       </span>
//     </div>
//   </Link>
//
// CSS (phone root=14):
//   .bookingRow { padding: 12px 16px; min-height:52; gap:12;
//                 border-bottom: 1px hairline var(--border);
//                 flex-wrap: wrap; }
//   .bookingRowLeft { gap:12; }
//   .bookingAvatar { 36×36, r=50%, bg orange-dim, border 1 orange-glow,
//                    font 0.75rem (10.5) 700, color orange }
//   .bookingTitle { 0.875rem (12.25), 600, lh 1.3 }
//   .bookingMeta  { 0.75rem (10.5), color dim, mt 2, lh 1.3 }
//   .bookingDate  { 0.6875rem (9.63), color muted, mt 2 }
//   .bookingRowRight { col, align-end, gap:4 }
//   .bookingRate  { 0.8125rem (11.38), 700, color orange }
//   .badge        { 0.625rem (8.75), 700, pad 3px 8px, radius 20,
//                   ls 0.04em (→0.35px @8.75), UPPERCASE, lh 1.4, nowrap }
//
// Badge tones (from CSS — these are the website's exact badge colors):
//   pending    bg rgba(251,191,36,0.12)  fg #fbbf24
//   accepted   bg var(--orange-dim)      fg var(--orange)
//   inprogress bg rgba(99,102,241,0.12)  fg #818cf8
//   completed  bg var(--green-dim)       fg var(--green)
//   cancelled  bg var(--red-dim)         fg var(--red)
//   disputed   bg rgba(239,68,68,0.20)   fg #f87171

import React from "react";
import { View, Pressable, StyleSheet, Image } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

const STATUS_MAP = {
  PENDING: { bg: "rgba(251,191,36,0.12)", fg: "#fbbf24" },
  ACCEPTED: { bg: "rgba(249,115,22,0.12)", fg: "#f97316" },
  IN_PROGRESS: { bg: "rgba(99,102,241,0.12)", fg: "#818cf8" },
  COMPLETED: { bg: "rgba(34,197,94,0.10)", fg: "#22c55e" },
  CANCELLED: { bg: "rgba(239,68,68,0.12)", fg: "#ef4444" },
  DISPUTED: { bg: "rgba(239,68,68,0.20)", fg: "#f87171" },
};

const CURRENCY_SYMBOL = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  NGN: "₦",
  GHS: "₵",
  KES: "KSh",
  ZAR: "R",
  INR: "₹",
  CAD: "C$",
  AUD: "A$",
  JPY: "¥",
  CNY: "¥",
  BRL: "R$",
  AED: "د.إ",
  SAR: "﷼",
  USDC: "$",
  USDT: "$",
};

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BookingRow({ booking, onPress, showDivider = true }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const worker = booking.worker ?? {};
  const workerName =
    `${worker.firstName ?? ""} ${worker.lastName ?? ""}`.trim();
  const categoryName = booking.category?.name ?? "";
  const meta = [workerName, categoryName].filter(Boolean).join(" · ");
  const dateLabel = fmtDate(booking.scheduledAt);

  const statusKey = (booking.status ?? "").toUpperCase();
  const palette = STATUS_MAP[statusKey] ?? { bg: c.bgCard, fg: c.textDim };
  const statusLabel = statusKey.replace("_", " ");

  const hasRate = booking.agreedRate != null && Number(booking.agreedRate) > 0;
  const symbol = CURRENCY_SYMBOL[booking.currency] ?? booking.currency ?? "";

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
      {/* Left: avatar + info */}
      <View style={styles.left}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          {worker.avatar ? (
            <Image source={{ uri: worker.avatar }} style={styles.avatarImg} />
          ) : (
            <AppText style={styles.avatarText}>
              {initials(worker.firstName, worker.lastName)}
            </AppText>
          )}
        </View>

        <View style={styles.info}>
          <AppText style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {booking.title || "Untitled booking"}
          </AppText>
          {!!meta && (
            <AppText
              style={[styles.meta, { color: c.textDim }]}
              numberOfLines={1}
            >
              {meta}
            </AppText>
          )}
          {!!dateLabel && (
            <AppText style={[styles.date, { color: c.textMuted }]}>
              {dateLabel}
            </AppText>
          )}
        </View>
      </View>

      {/* Right: rate + badge */}
      <View style={styles.right}>
        {hasRate && (
          <AppText style={[styles.rate, { color: c.orange }]} numberOfLines={1}>
            {symbol}
            {Number(booking.agreedRate).toLocaleString()}
          </AppText>
        )}
        <View style={[styles.badge, { backgroundColor: palette.bg }]}>
          <AppText style={[styles.badgeText, { color: palette.fg }]}>
            {statusLabel}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 52,
    gap: 12,
    flexWrap: "wrap",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
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
    color: "#f97316",
  },
  info: { minWidth: 0, flex: 1 },
  title: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12.25, // 0.875rem @ 14
    lineHeight: 16, // 1.3
    fontWeight: "600",
  },
  meta: {
    fontFamily: "DMSans_400Regular",
    fontSize: 10.5, // 0.75rem @ 14
    lineHeight: 14, // 1.3
    marginTop: 2,
  },
  date: {
    fontFamily: "DMSans_400Regular",
    fontSize: 9.63, // 0.6875rem @ 14
    lineHeight: 12,
    marginTop: 2,
  },
  right: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 4,
    flexShrink: 0,
  },
  rate: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11.38, // 0.8125rem @ 14
    lineHeight: 15,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 8.75, // 0.625rem @ 14
    lineHeight: 12.25, // 1.4 × 8.75
    letterSpacing: 0.35, // 0.04em × 8.75
    textTransform: "uppercase",
    fontWeight: "700",
  },
});
