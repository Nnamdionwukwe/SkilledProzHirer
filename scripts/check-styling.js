#!/usr/bin/env node
// scripts/check-styling.js
// Run: node scripts/check-styling.js
//
// Audits every source file for:
//   1. Font usage — raw fontFamily/fontSize/fontWeight vs AppText variants
//   2. Color usage — hardcoded hex/rgba colors vs theme tokens
//   3. Spacing usage — raw pixel values vs SPACING constants
//   4. StyleSheet.create() vs inline styles
//   5. Component inventory — full project tree
//   6. UX consistency score per file

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const SKIP_DIRS = new Set([
  "node_modules",
  ".expo",
  "assets",
  "scripts",
  ".git",
]);

// ── Theme tokens from theme.js ────────────────────────────────────────────────
const THEME_COLORS = new Set([
  "c.orange",
  "c.orangeHover",
  "c.orangeDim",
  "c.orangeGlow",
  "c.red",
  "c.green",
  "c.bg",
  "c.bgPanel",
  "c.bgCard",
  "c.bgInput",
  "c.card",
  "c.inputBg",
  "c.text",
  "c.textDim",
  "c.textMuted",
  "c.border",
  "c.borderHover",
  "c.borderFocus",
  "c.redDim",
  "c.greenDim",
  "c.shadow",
  "th.colors",
  "theme.colors",
  // Also allow these brand constants
  "#f97316",
  "#ef4444",
  "#22c55e", // orange, red, green brand colors
  "#fff",
  "#ffffff",
  "#000",
  "#000000",
  "rgba(0,0,0,0)",
  "transparent",
]);

const FONT_FAMILIES = new Set([
  "Syne_700Bold",
  "Syne_800ExtraBold",
  "DMSans_400Regular",
  "DMSans_500Medium",
  "DMSans_600SemiBold",
  "DMSans_700Bold",
]);

const APPTEXT_VARIANTS = new Set([
  "display",
  "displaySm",
  "title",
  "body",
  "small",
  "label",
]);

const APPTEXT_WEIGHTS = new Set([
  "displayBlack",
  "semibold",
  "medium",
  "regular",
  "bold",
]);

// ── File walker ───────────────────────────────────────────────────────────────
function walkDir(dir, depth = 0, lines = []) {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !SKIP_DIRS.has(e.name))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

  for (const entry of entries) {
    const indent = "  ".repeat(depth);
    const icon = entry.isDirectory() ? "📁" : getFileIcon(entry.name);
    lines.push(`${indent}${icon} ${entry.name}`);
    if (entry.isDirectory()) {
      walkDir(path.join(dir, entry.name), depth + 1, lines);
    }
  }
  return lines;
}

function getFileIcon(name) {
  if (name.endsWith(".js") || name.endsWith(".jsx")) return "📜";
  if (name.endsWith(".json")) return "{}";
  if (name.endsWith(".ts") || name.endsWith(".tsx")) return "📘";
  if (name.endsWith(".md")) return "📝";
  if (name.endsWith(".sh")) return "⚙️";
  if (name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".svg"))
    return "🖼️";
  return "📄";
}

function collectJsFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJsFiles(full, results);
    else if (/\.(js|jsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

// ── Analyzers ─────────────────────────────────────────────────────────────────

function analyzeFile(filepath, src) {
  const rel = path.relative(ROOT, filepath);
  const lines = src.split("\n");
  const issues = [];

  // ── 1. Raw fontFamily ──────────────────────────────────────────────────────
  const fontFamilyRe = /fontFamily\s*:\s*["']([^"']+)["']/g;
  let m;
  while ((m = fontFamilyRe.exec(src)) !== null) {
    const val = m[1];
    if (!FONT_FAMILIES.has(val)) {
      const line = src.slice(0, m.index).split("\n").length;
      issues.push({
        type: "font",
        severity: "high",
        line,
        msg: `fontFamily: "${val}" — use AppText variant instead`,
      });
    } else {
      const line = src.slice(0, m.index).split("\n").length;
      issues.push({
        type: "font",
        severity: "medium",
        line,
        msg: `fontFamily: "${val}" — OK but prefer AppText variant`,
      });
    }
  }

  // ── 2. Raw fontSize outside StyleSheet (inline) ────────────────────────────
  const inlineFontSizeRe = /style=\{[^}]*fontSize\s*:\s*(\d+)/g;
  while ((m = inlineFontSizeRe.exec(src)) !== null) {
    const size = parseInt(m[1]);
    const line = src.slice(0, m.index).split("\n").length;
    if (size < 10 || size > 40) {
      issues.push({
        type: "font",
        severity: "medium",
        line,
        msg: `Unusual fontSize: ${size} in inline style — check against design system`,
      });
    }
  }

  // ── 3. Raw fontWeight outside AppText ─────────────────────────────────────
  const fontWeightRe = /fontWeight\s*:\s*["'](\d{3}|bold|normal)["']/g;
  while ((m = fontWeightRe.exec(src)) !== null) {
    const line = src.slice(0, m.index).split("\n").length;
    issues.push({
      type: "font",
      severity: "low",
      line,
      msg: `fontWeight: "${m[1]}" — prefer AppText weight prop`,
    });
  }

  // ── 4. Hardcoded colors (hex that aren't brand colors) ───────────────────
  const hexRe = /#([0-9a-fA-F]{3,8})\b/g;
  const knownHex = new Set([
    "#fff",
    "#ffffff",
    "#000",
    "#000000",
    "#f97316",
    "#ef4444",
    "#22c55e",
    "#6b7280",
    "#818cf8",
    "#a78bfa",
    "#22d3ee",
    "#f472b6",
    "#6366f1",
    "#374151",
    "#4b5563",
    "#1e1b4b",
    "#111",
    "#111118",
  ]);
  while ((m = hexRe.exec(src)) !== null) {
    const hex = `#${m[1]}`.toLowerCase();
    if (!knownHex.has(hex)) {
      const line = src.slice(0, m.index).split("\n").length;
      // Skip if it's inside a comment
      const lineText = lines[line - 1]?.trim() ?? "";
      if (!lineText.startsWith("//") && !lineText.startsWith("*")) {
        issues.push({
          type: "color",
          severity: "medium",
          line,
          msg: `Unknown color ${hex} — use theme token (c.orange, c.text etc.)`,
        });
      }
    }
  }

  // ── 5. Hardcoded rgba not in theme ────────────────────────────────────────
  const rgbaRe = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  const knownRgba = [
    [249, 115, 22],
    [239, 68, 68],
    [34, 197, 94], // orange, red, green
    [0, 0, 0],
    [255, 255, 255], // black, white
    [107, 114, 128],
    [99, 102, 241],
    [139, 92, 246], // gray, indigo, violet
  ];
  while ((m = rgbaRe.exec(src)) !== null) {
    const r = parseInt(m[1]),
      g = parseInt(m[2]),
      b = parseInt(m[3]);
    const isKnown = knownRgba.some(
      ([kr, kg, kb]) => kr === r && kg === g && kb === b,
    );
    if (!isKnown) {
      const line = src.slice(0, m.index).split("\n").length;
      const lineText = lines[line - 1]?.trim() ?? "";
      if (!lineText.startsWith("//") && !lineText.startsWith("*")) {
        issues.push({
          type: "color",
          severity: "low",
          line,
          msg: `Custom rgba(${r},${g},${b}...) — verify this matches theme`,
        });
      }
    }
  }

  // ── 6. Missing AppText (raw <Text> components) ────────────────────────────
  const rawTextRe = /\bimport\b[^;]*\bText\b[^;]*from\s+['"]react-native['"]/;
  if (rawTextRe.test(src)) {
    const textUsageRe = /<Text[\s>]/g;
    while ((m = textUsageRe.exec(src)) !== null) {
      const line = src.slice(0, m.index).split("\n").length;
      issues.push({
        type: "component",
        severity: "high",
        line,
        msg: `<Text> from react-native — replace with <AppText> for consistent styling`,
      });
    }
  }

  // ── 7. StyleSheet vs inline ────────────────────────────────────────────────
  const hasStyleSheet = src.includes("StyleSheet.create(");
  const inlineStyleCount = (src.match(/style=\{\{/g) || []).length;
  const styleSheetCount = (src.match(/styles\.\w+/g) || []).length;

  if (!hasStyleSheet && inlineStyleCount > 5) {
    issues.push({
      type: "style",
      severity: "medium",
      line: 0,
      msg: `No StyleSheet.create() — ${inlineStyleCount} inline styles. Move to StyleSheet for performance`,
    });
  }
  if (inlineStyleCount > 20) {
    issues.push({
      type: "style",
      severity: "low",
      line: 0,
      msg: `${inlineStyleCount} inline styles. High count — move repeated styles to StyleSheet`,
    });
  }

  // ── 8. Uses AppText correctly ─────────────────────────────────────────────
  const usesAppText = src.includes("AppText");
  const appTextVariantRe = /variant=["']([^"']+)["']/g;
  const variantsUsed = new Set();
  while ((m = appTextVariantRe.exec(src)) !== null) {
    variantsUsed.add(m[1]);
    if (!APPTEXT_VARIANTS.has(m[1])) {
      const line = src.slice(0, m.index).split("\n").length;
      issues.push({
        type: "font",
        severity: "high",
        line,
        msg: `Unknown AppText variant: "${m[1]}" — valid: ${[...APPTEXT_VARIANTS].join(", ")}`,
      });
    }
  }

  // ── 9. Theme usage ────────────────────────────────────────────────────────
  const usesTheme = src.includes("useTheme()");
  const usesToast = src.includes("useToast()");
  const usesI18n = src.includes("useTranslation");

  // ── 10. Magic numbers (suspicious pixel values) ──────────────────────────
  const magicNumRe = /:\s*((?:1[5-9][0-9]|[2-9][0-9]{2,}))\b(?!\s*%)/g;
  const magicNums = [];
  while ((m = magicNumRe.exec(src)) !== null) {
    const val = parseInt(m[1]);
    if (val > 150 && val < 2000) {
      const line = src.slice(0, m.index).split("\n").length;
      const lineText = lines[line - 1]?.trim() ?? "";
      if (
        !lineText.startsWith("//") &&
        !lineText.startsWith("*") &&
        !lineText.includes("fontSize") &&
        !lineText.includes("lineHeight")
      ) {
        magicNums.push({ line, val });
      }
    }
  }
  if (magicNums.length > 3) {
    issues.push({
      type: "spacing",
      severity: "low",
      line: 0,
      msg: `${magicNums.length} magic pixel values (>150px) — verify these are intentional layout values`,
    });
  }

  // ── Score ─────────────────────────────────────────────────────────────────
  const highCount = issues.filter((i) => i.severity === "high").length;
  const medCount = issues.filter((i) => i.severity === "medium").length;
  const lowCount = issues.filter((i) => i.severity === "low").length;
  const score = Math.max(0, 100 - highCount * 15 - medCount * 5 - lowCount * 1);

  return {
    file: rel,
    usesTheme,
    usesAppText,
    usesI18n,
    usesToast,
    hasStyleSheet,
    inlineStyleCount,
    styleSheetCount,
    variantsUsed: [...variantsUsed],
    issues,
    score,
    highCount,
    medCount,
    lowCount,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n🎨  SkilledProzHirer — Styling & Font Consistency Audit\n");
console.log("=".repeat(70));

// ── 1. Project tree ───────────────────────────────────────────────────────────
console.log("\n📁  PROJECT STRUCTURE\n");
const tree = walkDir(ROOT);
tree.forEach((l) => console.log("  " + l));

// ── 2. Analyze files ──────────────────────────────────────────────────────────
const files = collectJsFiles(SRC);
const results = files.map((f) => analyzeFile(f, fs.readFileSync(f, "utf8")));

// Sort by score ascending (worst first)
results.sort((a, b) => a.score - b.score);

console.log("\n" + "=".repeat(70));
console.log(
  "\n📊  CONSISTENCY SCORES  (100 = perfect, 0 = needs full review)\n",
);
console.log("  File".padEnd(54) + "Score  High  Med   Low  Theme i18n");
console.log("  " + "─".repeat(68));

for (const r of results) {
  const bar = scoreBar(r.score);
  const name = r.file.length > 50 ? "..." + r.file.slice(-47) : r.file;
  const themeIcon = r.usesTheme ? "✅" : "⬜";
  const i18nIcon = r.usesI18n ? "✅" : "⬜";
  console.log(
    `  ${name.padEnd(52)} ${String(r.score).padStart(3)}%` +
      `  ${String(r.highCount).padStart(4)}  ${String(r.medCount).padStart(4)}  ${String(r.lowCount).padStart(4)}` +
      `  ${themeIcon}    ${i18nIcon}`,
  );
}

function scoreBar(score) {
  const filled = Math.round(score / 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

// ── 3. Detailed issues ────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(70));
console.log("\n🔍  DETAILED ISSUES BY FILE\n");

for (const r of results) {
  if (r.issues.length === 0) continue;
  console.log(`\n── ${r.file}  (score: ${r.score}%)`);
  console.log(
    `   Theme: ${r.usesTheme ? "✅" : "❌"}  AppText: ${r.usesAppText ? "✅" : "❌"}  i18n: ${r.usesI18n ? "✅" : "❌"}  StyleSheet: ${r.hasStyleSheet ? "✅" : "❌"}`,
  );
  console.log(
    `   Inline styles: ${r.inlineStyleCount}  StyleSheet refs: ${r.styleSheetCount}`,
  );
  if (r.variantsUsed.length > 0)
    console.log(`   AppText variants used: ${r.variantsUsed.join(", ")}`);
  console.log();

  for (const issue of r.issues) {
    const icon =
      issue.severity === "high"
        ? "🔴"
        : issue.severity === "medium"
          ? "🟡"
          : "🔵";
    const lineStr =
      issue.line > 0 ? `Line ${String(issue.line).padStart(4)}` : "      ";
    console.log(`   ${icon} ${lineStr}  ${issue.msg}`);
  }
}

// ── 4. Global summary ────────────────────────────────────────────────────────
console.log("\n" + "=".repeat(70));
console.log("\n📈  GLOBAL SUMMARY\n");

const totalHigh = results.reduce((a, r) => a + r.highCount, 0);
const totalMed = results.reduce((a, r) => a + r.medCount, 0);
const totalLow = results.reduce((a, r) => a + r.lowCount, 0);
const avgScore = Math.round(
  results.reduce((a, r) => a + r.score, 0) / results.length,
);
const filesWithTheme = results.filter((r) => r.usesTheme).length;
const filesWithI18n = results.filter((r) => r.usesI18n).length;
const filesWithAppText = results.filter((r) => r.usesAppText).length;
const filesWithStyleSheet = results.filter((r) => r.hasStyleSheet).length;
const perfectFiles = results.filter((r) => r.score === 100).length;

console.log(`  Files scanned:          ${results.length}`);
console.log(`  Average score:          ${avgScore}%`);
console.log(`  Perfect files (100%):   ${perfectFiles}/${results.length}`);
console.log(`  Files using useTheme:   ${filesWithTheme}/${results.length}`);
console.log(`  Files using AppText:    ${filesWithAppText}/${results.length}`);
console.log(`  Files using i18n:       ${filesWithI18n}/${results.length}`);
console.log(
  `  Files with StyleSheet:  ${filesWithStyleSheet}/${results.length}`,
);
console.log();
console.log(`  🔴 High issues:   ${totalHigh}`);
console.log(`  🟡 Medium issues: ${totalMed}`);
console.log(`  🔵 Low issues:    ${totalLow}`);
console.log(`  Total:            ${totalHigh + totalMed + totalLow}`);

// ── 5. UX recommendations ─────────────────────────────────────────────────────
console.log("\n" + "=".repeat(70));
console.log("\n💡  UX CONSISTENCY RECOMMENDATIONS\n");

const rawTextFiles = results.filter((r) =>
  r.issues.some((i) => i.msg.includes("<Text>")),
);
if (rawTextFiles.length > 0) {
  console.log(
    "  🔴 CRITICAL — Raw <Text> components found (breaks font system):",
  );
  rawTextFiles.forEach((r) => console.log(`       • ${r.file}`));
  console.log();
}

const noThemeFiles = results.filter(
  (r) => !r.usesTheme && r.file.includes("screens"),
);
if (noThemeFiles.length > 0) {
  console.log("  🟡 Screens not using useTheme() (hardcoded colors risk):");
  noThemeFiles.forEach((r) => console.log(`       • ${r.file}`));
  console.log();
}

const noAppTextScreens = results.filter(
  (r) => !r.usesAppText && r.file.includes("screens"),
);
if (noAppTextScreens.length > 0) {
  console.log("  🟡 Screens not using AppText (inconsistent typography):");
  noAppTextScreens.forEach((r) => console.log(`       • ${r.file}`));
  console.log();
}

const highInlineFiles = results.filter((r) => r.inlineStyleCount > 15);
if (highInlineFiles.length > 0) {
  console.log("  🔵 Files with heavy inline styles (performance concern):");
  highInlineFiles.forEach((r) =>
    console.log(`       • ${r.file}  (${r.inlineStyleCount} inline styles)`),
  );
  console.log();
}

const unknownVariantFiles = results.filter((r) =>
  r.issues.some((i) => i.msg.includes("Unknown AppText variant")),
);
if (unknownVariantFiles.length > 0) {
  console.log(
    "  🔴 Unknown AppText variants (will fall back to default styling):",
  );
  unknownVariantFiles.forEach((r) => console.log(`       • ${r.file}`));
  console.log();
}

console.log("  📐 AppText variant reference:");
console.log("       display    — 32px+ hero titles (Syne ExtraBold)");
console.log("       displaySm  — 24–28px section titles");
console.log("       title      — 18–22px card titles");
console.log("       body       — 15–16px standard text");
console.log("       small      — 11–13px labels, captions");
console.log("       label      — 11px uppercase tracking");
console.log();
console.log("  🎨 Theme color token reference:");
console.log("       c.text / c.textMuted / c.textDim  — text hierarchy");
console.log("       c.orange                           — primary brand CTA");
console.log("       c.orangeDim                        — tinted backgrounds");
console.log("       c.bgCard / c.bgInput               — surface colors");
console.log("       c.border / c.borderFocus           — borders");
console.log("       c.bg / c.bgPanel                   — page backgrounds");
console.log("       c.red / c.green                    — status colors");

console.log("\n" + "=".repeat(70));
console.log("\n✅  Audit complete.\n");
