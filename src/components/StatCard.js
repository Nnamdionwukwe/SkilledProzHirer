// src/components/StatCard.js
//
// Verbatim port of HirerDashboard.module.css `.statCard` classes.
//
// CSS reference (desktop / phone=14px root):
//   .statCard {
//     background: var(--bg-card);
//     border: 1px solid var(--border);
//     border-radius: clamp(8px,1.2vw,12px);  → 12
//     padding: clamp(8px,1.5vw,16px);        → 16
//     position: relative; overflow: hidden;
//     min-width: 0;
//   }
//   .statCard::before { radial-gradient overlay — decorative, skip on RN }
//   .statCard_orange { border-color: rgba(249,115,22,0.2);
//                      background: var(--orange-dim); }
//   .statCard_orange .statValue { color: var(--orange); }
//   .statCard_green  { border-color: rgba(34,197,94,0.15);
//                      background: var(--green-dim); }
//   .statCard_green  .statValue { color: var(--green); }
//   .statIcon {
//     font-size: clamp(16px,2.2vw,24px);     → 24
//     display: block;
//     margin-bottom: clamp(2px,0.5vw,6px);   → 6
//     line-height: 1;
//   }
//   .statValue {
//     font-family: var(--font-display);
//     font-size: clamp(16px,3vw,28px);       → 28
//     font-weight: 700;
//     color: var(--text);
//     letter-spacing: -0.5px;
//     line-height: 1.2;                       → 33.6
//     margin-bottom: 2px;
//     word-break: break-all;
//   }
//   .statLabel {
//     font-size: clamp(9px,1vw,12px);        → 12
//     color: var(--text-dim);
//     font-weight: 500;
//   }
//   .statFooter {
//     font-size: 0.65rem;                    → 9.1 (at 14px root)
//     color: var(--text-muted);
//     margin: 4px 0 0;
//     line-height: 1.35;                      → 12.3
//     font-weight: 500;
//   }

import React from "react";
import { View, StyleSheet } from "react-native";
import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";

export default function StatCard({ icon, label, value, accent, footer }) {
  const { theme } = useTheme();
  const c = theme.colors;

  const isOrange = accent === "orange";
  const isGreen = accent === "green";

  const backgroundColor = isOrange
    ? c.orangeDim // rgba(249,115,22,0.12) dark / 0.08 light — matches var(--orange-dim) per theme
    : isGreen
      ? c.greenDim // rgba(34,197,94,0.10) dark / 0.08 light — matches var(--green-dim)
      : c.bgCard; // rgba(255,255,255,0.03) dark / rgba(0,0,0,0.02) light

  const borderColor = isOrange
    ? "rgba(249, 115, 22, 0.20)"
    : isGreen
      ? "rgba(34, 197, 94, 0.15)"
      : c.border;

  const valueColor = isOrange ? "#f97316" : isGreen ? "#22c55e" : c.text;

  return (
    <View style={[styles.card, { backgroundColor, borderColor }]}>
      <AppText style={styles.icon}>{icon}</AppText>

      {typeof value === "string" || typeof value === "number" ? (
        <AppText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          style={[styles.value, { color: valueColor }]}
        >
          {value}
        </AppText>
      ) : (
        value
      )}

      <AppText style={[styles.label, { color: c.textDim }]} numberOfLines={1}>
        {label}
      </AppText>

      {footer ? (
        <AppText
          style={[styles.footer, { color: c.textMuted }]}
          numberOfLines={2}
        >
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    minWidth: 0,
    overflow: "hidden",
  },
  icon: {
    fontSize: 24,
    lineHeight: 24, // line-height: 1 (website)
    marginBottom: 6,
  },
  value: {
    fontFamily: "Syne_700Bold",
    fontSize: 28,
    lineHeight: 34, // 1.2 × 28
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  label: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
  footer: {
    fontFamily: "DMSans_500Medium",
    fontSize: 9.1, // 0.65rem @ 14px
    lineHeight: 12.3, // 1.35
    marginTop: 4,
    fontWeight: "500",
  },
});
