// src/constants/theme.js
// Mirrors the website's CSS variables in src/styles/global.css
//
// Also exports fontScaleFor() — the RN equivalent of the website's
// `html { font-size }` breakpoints. The website uses rem and drops root
// font-size to 14px on phones. RN has no rem, so we express the same
// ratio as a multiplier applied by AppText.

import { Dimensions, PixelRatio } from "react-native";

export const COLORS = {
  // Brand
  orange: "#f97316",
  orangeHover: "#fb923c",
  orangeDim: "rgba(249, 115, 22, 0.12)",
  orangeGlow: "rgba(249, 115, 22, 0.25)",
  red: "#ef4444",
  green: "#22c55e",
};

export const FONTS = {
  display: "Syne_700Bold",
  displayBlack: "Syne_800ExtraBold",
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodySemiBold: "DMSans_600SemiBold",
  bodyBold: "DMSans_700Bold",
};

export const RADII = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
};

const dark = {
  mode: "dark",
  colors: {
    ...COLORS,
    bg: "#080810",
    bgPanel: "#0c0c18",
    bgCard: "rgba(255, 255, 255, 0.03)",
    bgInput: "rgba(255, 255, 255, 0.04)",
    // ── Aliases used by PostJobScreen / SettingsScreen ──
    card: "rgba(255, 255, 255, 0.03)",
    inputBg: "rgba(255, 255, 255, 0.04)",
    // ────────────────────────────────────────────────────
    text: "#ffffff",
    textDim: "rgba(255, 255, 255, 0.55)",
    textMuted: "rgba(255, 255, 255, 0.28)",
    border: "rgba(255, 255, 255, 0.08)",
    borderHover: "rgba(255, 255, 255, 0.16)",
    borderFocus: COLORS.orange,
    redDim: "rgba(239, 68, 68, 0.12)",
    greenDim: "rgba(34, 197, 94, 0.10)",
    shadow: "rgba(0, 0, 0, 0.40)",
  },
};

const light = {
  mode: "light",
  colors: {
    ...COLORS,
    bg: "#f8f8fc",
    bgPanel: "#ffffff",
    bgCard: "rgba(0, 0, 0, 0.02)",
    bgInput: "rgba(0, 0, 0, 0.03)",
    // ── Aliases ──
    card: "rgba(0, 0, 0, 0.02)",
    inputBg: "rgba(0, 0, 0, 0.03)",
    // ─────────────
    text: "#0f0f1a",
    textDim: "rgba(15, 15, 26, 0.60)",
    textMuted: "rgba(15, 15, 26, 0.35)",
    border: "rgba(0, 0, 0, 0.08)",
    borderHover: "rgba(0, 0, 0, 0.16)",
    borderFocus: COLORS.orange,
    redDim: "rgba(239, 68, 68, 0.08)",
    greenDim: "rgba(34, 197, 94, 0.08)",
    shadow: "rgba(0, 0, 0, 0.08)",
  },
};

export const THEMES = { dark, light };

// ── Font scale (mirrors the website's html { font-size } breakpoints) ──
// Website breakpoints:
//   > 860px  → 16px  (1.00×)
//   ≤ 860px  → 15px  (0.9375×)
//   ≤ 480px  → 14px  (0.875×)
//   ≤ 360px  → 13.5px (0.8437×)
//
// RN equivalent: multiply every fontSize by fontScaleFor(width).

export function fontScaleFor(width) {
  if (width <= 320) return 0.78;
  if (width <= 360) return 0.84; // ↔ 13.5px on 16px root
  if (width <= 400) return 0.88;
  if (width <= 480) return 0.9; // ↔ 14px on 16px root
  if (width <= 860) return 0.96; // ↔ 15px on 16px root
  return 1.0;
}

// Convenience: scale a base font size (in "web rem-like" px)
export const sfs = (base, factor = 1) => Math.round(base * factor);

// A React-free resolver — safe to call anywhere
export const getCurrentFontScale = () =>
  fontScaleFor(Dimensions.get("window").width);

// Respect the OS's accessibility font-size setting too
export const getSystemFontScale = () => PixelRatio.getFontScale() || 1.0;
