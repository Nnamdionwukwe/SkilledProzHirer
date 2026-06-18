#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// scan-i18n.js — SkilledProz Expo App i18n Scanner
// ─────────────────────────────────────────────────────────────────────────────
// WHAT IT DOES:
//   1. Scans every .js/.jsx/.ts/.tsx file in the project
//   2. Finds all hardcoded English strings (JSX text, props, alerts, etc.)
//   3. Generates a report: which files + which strings need translation
//   4. Writes a base en.json with all discovered strings as translation keys
//   5. Writes skeleton files for all 9 locales with empty values to fill in
//   6. Writes a TODO list of every line that needs `t()` wrapping
//
// USAGE:
//   node scripts/scan-i18n.js
//   node scripts/scan-i18n.js --dir src/screens   (limit to a folder)
//   node scripts/scan-i18n.js --out locales        (custom output dir)
//
// OUTPUT:
//   locales/en.json                  ← base English keys (auto-filled)
//   locales/fr.json                  ← French skeleton (values = "")
//   locales/ar.json                  ← Arabic skeleton
//   locales/yo.json                  ← Yoruba skeleton
//   locales/ha.json                  ← Hausa skeleton
//   locales/ig.json                  ← Igbo skeleton
//   locales/sw.json                  ← Swahili skeleton
//   locales/pt.json                  ← Portuguese skeleton
//   locales/es.json                  ← Spanish skeleton
//   i18n-report.md                   ← full human-readable report
//   i18n-todo.json                   ← machine-readable list for auto-wrapper
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const outIdx = args.indexOf("--out");
const ROOT = dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : path.resolve(".");
const OUT_DIR =
  outIdx >= 0 ? path.resolve(args[outIdx + 1]) : path.resolve("locales");

// ── The 9 target locales ──────────────────────────────────────────────────────
const LOCALES = [
  { code: "en", name: "English" },
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "yo", name: "Yoruba" },
  { code: "ha", name: "Hausa" },
  { code: "ig", name: "Igbo" },
  { code: "sw", name: "Swahili" },
  { code: "pt", name: "Portuguese" },
  { code: "es", name: "Spanish" },
];

// ── Directories and files to skip ─────────────────────────────────────────────
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "build",
  "coverage",
  "locales",
  "assets",
  ".next",
  "scripts",
]);

const SKIP_FILES = new Set([
  "babel.config.js",
  "metro.config.js",
  "jest.config.js",
  "tailwind.config.js",
  "app.config.js",
  "eas.json",
]);

// ── String patterns that look like real UI text ───────────────────────────────

// Strings to IGNORE (technical, not user-facing)
const IGNORE_PATTERNS = [
  /^https?:\/\//, // URLs
  /^#[0-9a-fA-F]{3,8}$/, // hex colors
  /^\d+(\.\d+)?(px|%|rem|em|vh|vw|dp)?$/, // dimensions/numbers
  /^[A-Z_]{2,}$/, // ALL_CAPS_CONSTANTS
  /^\s*$/, // whitespace only
  /^[\W\d]+$/, // no letters at all
  /^(flex|absolute|relative|center|row|column|bold|normal|auto)$/, // style values
  /^(rgba?|rgb)\(/, // color functions
  /^\.(js|ts|jsx|tsx|json|png|jpg|svg|ttf)$/, // file extensions
  /^[a-z_]+\.[a-z_]+$/, // dot.notation (prop paths, field names)
  /^var\(--/, // CSS variables
  /^(true|false|null|undefined)$/, // JS literals
  /^[a-zA-Z0-9_-]+:\/\//, // protocol strings
  /^(PENDING|APPROVED|REJECTED|ACTIVE|INACTIVE|HIRER|WORKER|ADMIN)$/, // DB enums
];

function isIgnored(str) {
  const s = str.trim();
  if (s.length < 2) return true;
  // Already wrapped in t() or i18n.t()
  return IGNORE_PATTERNS.some((r) => r.test(s));
}

// ── Extraction patterns ───────────────────────────────────────────────────────

// Pattern 1: JSX text between tags  >Some text<  or  > Some text {var} more <
const JSX_TEXT = />\s*([A-Za-z][^<>{}\n]{2,}?)\s*</g;

// Pattern 2: Common string props with English values
const STRING_PROPS =
  /(?:placeholder|title|label|message|hint|emptyText|description|accessibilityLabel|accessibilityHint|subtitle|heading|buttonText|text|errorMessage|helperText|noDataText|loadingText)\s*=\s*["'`]([A-Za-z][^"'`\n]{2,})["'`]/g;

// Pattern 3: Alert / Toast / console messages
const ALERTS =
  /(?:Alert\.alert|showToast|Toast\.show|Snackbar\.show|console\.(warn|error|info))\s*\(\s*["'`]([A-Za-z][^"'`\n]{2,})["'`]/g;

// Pattern 4: Bare string assignments that look like UI labels
const STRING_ASSIGNS =
  /(?:headerTitle|tabBarLabel|screenTitle|title|name|label)\s*:\s*["'`]([A-Za-z][^"'`\n]{3,})["'`]/g;

// Pattern 5: String inside t-able functions that AREN'T yet wrapped
// Catches: const msg = "Please enter your email"
const PLAIN_STRINGS =
  /(?:const|let|var)\s+\w+\s*=\s*["'`]([A-Za-z][A-Za-z0-9 ,.'!?:()/-]{5,})["'`]/g;

// Already translated — skip lines with t() or i18n.t()
function isAlreadyTranslated(line) {
  return (
    /\bt\s*\(/.test(line) ||
    /i18n\.t\s*\(/.test(line) ||
    /useTranslation/.test(line)
  );
}

// ── Convert a string to a stable translation key ──────────────────────────────
function toKey(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 60);
}

// ── Walk the directory tree ───────────────────────────────────────────────────
function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(full, files);
    } else if (/\.(js|jsx|ts|tsx)$/.test(e.name) && !SKIP_FILES.has(e.name)) {
      files.push(full);
    }
  }
  return files;
}

// ── Scan a single file ────────────────────────────────────────────────────────
function scanFile(filePath) {
  let src;
  try {
    src = fs.readFileSync(filePath, "utf8");
  } catch {
    return [];
  }

  const hits = [];
  const lines = src.split("\n");

  function addHit(lineNum, pattern, raw) {
    const clean = raw.trim();
    if (isIgnored(clean)) return;
    if (isAlreadyTranslated(lines[lineNum - 1] || "")) return;
    hits.push({ line: lineNum, pattern, raw: clean, key: toKey(clean) });
  }

  lines.forEach((line, i) => {
    if (isAlreadyTranslated(line)) return;
    const ln = i + 1;

    let m;

    // JSX text
    const jsxRe = />\s*([A-Za-z][^<>{}\n]{2,}?)\s*</g;
    while ((m = jsxRe.exec(line)) !== null) addHit(ln, "jsx_text", m[1]);

    // String props
    const propRe =
      /(?:placeholder|title|label|message|hint|emptyText|description|accessibilityLabel|subtitle|heading|buttonText|text|errorMessage|helperText|noDataText|loadingText)\s*=\s*["'`]([A-Za-z][^"'`\n]{2,})["'`]/g;
    while ((m = propRe.exec(line)) !== null) addHit(ln, "prop", m[1]);

    // Alerts
    const alertRe =
      /(?:Alert\.alert|showToast|Toast\.show)\s*\(\s*["'`]([A-Za-z][^"'`\n]{2,})["'`]/g;
    while ((m = alertRe.exec(line)) !== null) addHit(ln, "alert", m[1]);

    // Navigation titles
    const navRe =
      /(?:headerTitle|tabBarLabel|screenTitle|title|name)\s*:\s*["'`]([A-Za-z][^"'`\n]{3,})["'`]/g;
    while ((m = navRe.exec(line)) !== null) addHit(ln, "nav_title", m[1]);

    // Plain string assignments
    const assignRe =
      /(?:const|let|var)\s+\w+\s*=\s*["'`]([A-Za-z][A-Za-z0-9 ,.'!?:()/-]{5,})["'`]/g;
    while ((m = assignRe.exec(line)) !== null) addHit(ln, "assignment", m[1]);
  });

  // Deduplicate by key within this file
  const seen = new Set();
  return hits.filter((h) => {
    if (seen.has(h.key)) return false;
    seen.add(h.key);
    return true;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log(`\n🔍  Scanning: ${ROOT}`);
console.log(`📦  Output:   ${OUT_DIR}\n`);

const files = walk(ROOT);
const allKeys = new Map(); // key → English value
const fileHits = []; // { file, rel, hits[] }
const todoList = []; // machine-readable for auto-wrapper

let totalStrings = 0;
let totalFiles = 0;

for (const file of files) {
  const hits = scanFile(file);
  if (hits.length === 0) continue;

  totalFiles++;
  totalStrings += hits.length;

  const rel = path.relative(ROOT, file);
  fileHits.push({ file, rel, hits });

  for (const h of hits) {
    if (!allKeys.has(h.key)) allKeys.set(h.key, h.raw);
    todoList.push({
      file: rel,
      line: h.line,
      pattern: h.pattern,
      raw: h.raw,
      key: h.key,
    });
  }
}

// ── Sort keys alphabetically ──────────────────────────────────────────────────
const sortedKeys = [...allKeys.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
);

// ── Write locale files ────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

for (const locale of LOCALES) {
  const outPath = path.join(OUT_DIR, `${locale.code}.json`);
  const existing = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, "utf8"))
    : {};

  const obj = {};
  for (const [key, enVal] of sortedKeys) {
    if (locale.code === "en") {
      obj[key] = existing[key] || enVal;
    } else {
      // Preserve already-translated values; leave new ones blank for translator
      obj[key] = existing[key] || "";
    }
  }

  fs.writeFileSync(outPath, JSON.stringify(obj, null, 2), "utf8");
  const filled = Object.values(obj).filter(Boolean).length;
  const total = sortedKeys.length;
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0;
  console.log(
    `  ${locale.code === "en" ? "✅" : "⬜"} ${locale.code}.json  (${filled}/${total} — ${pct}% complete)  ${locale.name}`,
  );
}

// ── Write TODO JSON ───────────────────────────────────────────────────────────
const todoPath = path.join(ROOT, "i18n-todo.json");
fs.writeFileSync(todoPath, JSON.stringify(todoList, null, 2), "utf8");

// ── Write markdown report ─────────────────────────────────────────────────────
const reportPath = path.join(ROOT, "i18n-report.md");

const grouped = {};
for (const item of todoList) {
  if (!grouped[item.file]) grouped[item.file] = [];
  grouped[item.file].push(item);
}

const lines = [
  "# i18n Scan Report",
  "",
  `> Generated: ${new Date().toISOString()}`,
  `> Root: \`${ROOT}\``,
  "",
  "## Summary",
  "",
  `| Metric | Value |`,
  `|--------|-------|`,
  `| Files scanned | ${files.length} |`,
  `| Files with hardcoded strings | ${totalFiles} |`,
  `| Total hardcoded strings found | ${totalStrings} |`,
  `| Unique translation keys | ${sortedKeys.length} |`,
  `| Target locales | ${LOCALES.length} |`,
  "",
  "## Target Locales",
  "",
  LOCALES.map((l) => `- \`${l.code}\` — ${l.name}`).join("\n"),
  "",
  "## Files Requiring i18n Work",
  "",
];

for (const [file, items] of Object.entries(grouped)) {
  lines.push(`### \`${file}\``);
  lines.push("");
  lines.push("| Line | Pattern | String |");
  lines.push("|------|---------|--------|");
  for (const item of items) {
    lines.push(`| ${item.line} | \`${item.pattern}\` | ${item.raw} |`);
  }
  lines.push("");
  lines.push("**Suggested keys:**");
  lines.push("```js");
  for (const item of items) {
    lines.push(`// Line ${item.line}`);
    lines.push(`t('${item.key}')  // "${item.raw}"`);
  }
  lines.push("```");
  lines.push("");
}

lines.push("## All Translation Keys");
lines.push("");
lines.push(
  "These keys were added to `locales/en.json`. Fill in the other locale files.",
);
lines.push("");
lines.push("| Key | English Value |");
lines.push("|-----|--------------|");
for (const [key, val] of sortedKeys) {
  lines.push(`| \`${key}\` | ${val} |`);
}
lines.push("");
lines.push("## Next Steps");
lines.push("");
lines.push("1. Review `locales/en.json` — remove any false positives");
lines.push(
  "2. Fill in translations in `fr.json`, `ar.json`, `yo.json`, `ha.json`, `ig.json`, `sw.json`, `pt.json`, `es.json`",
);
lines.push(
  "3. Install i18n library: `npx expo install expo-localization i18next react-i18next`",
);
lines.push(
  "4. Run `node scripts/wrap-i18n.js` to auto-wrap found strings with `t()`",
);
lines.push("5. Test each locale with `expo start --locale ar`");

fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

// ── Print summary ─────────────────────────────────────────────────────────────
console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊  SCAN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Files scanned:          ${files.length}
  Files needing i18n:     ${totalFiles}
  Hardcoded strings:      ${totalStrings}
  Unique keys generated:  ${sortedKeys.length}
  Locales:                ${LOCALES.length}

📁  Output files:
  ${OUT_DIR}/en.json         ← base English (auto-filled)
  ${OUT_DIR}/fr|ar|yo|ha|ig|sw|pt|es.json  ← fill these in
  ${ROOT}/i18n-report.md     ← human-readable report
  ${ROOT}/i18n-todo.json     ← machine list for wrap script
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
