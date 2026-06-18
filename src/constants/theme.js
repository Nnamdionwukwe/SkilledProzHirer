// src/constants/theme.js
// Mirrors the website's CSS variables in src/styles/global.css

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
    card: "rgba(255, 255, 255, 0.03)", // = bgCard
    inputBg: "rgba(255, 255, 255, 0.04)", // = bgInput
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
