#!/usr/bin/env node
// scripts/check-hardcoded.js
// Run from project root: node scripts/check-hardcoded.js
//
// Finds all hardcoded English strings in .js/.jsx files that should
// be using t() translations instead. Groups by file and severity.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "..", "src");

// ── Config ────────────────────────────────────────────────────────────────────

// Patterns that indicate a hardcoded UI string
// Each has: pattern (regex), description, severity (high/medium/low)
const PATTERNS = [
  // JSX text content — most common case
  // Catches: <AppText>Some text</AppText>  <Text>Hello</Text>
  {
    re: />\s*([A-Z][a-zA-Z\s]{3,}[a-zA-Z])\s*</g,
    desc: "JSX text content",
    severity: "high",
    filter: (m) => !isLikelyCode(m[1]),
  },

  // String props that are human-visible
  // Catches: title="Post a Job"  label="Submit"  placeholder="Search..."
  {
    re: /(?:title|label|placeholder|hint|subtitle|message|text|description|header|heading|emptyText|errorText)\s*=\s*["']([A-Za-z][a-zA-Z\s'.,!?-]{3,})["']/g,
    desc: "String prop (title/label/placeholder etc.)",
    severity: "high",
    filter: (m) => !isLikelyCode(m[1]),
  },

  // toast.* calls with hardcoded strings
  // Catches: toast.error("Something went wrong")
  {
    re: /toast\.\w+\(\s*["']([A-Za-z][a-zA-Z\s'.,!?-]{4,})["']/g,
    desc: "Hardcoded toast message",
    severity: "high",
    filter: (m) => !isLikelyCode(m[1]),
  },

  // Alert.alert with hardcoded strings
  {
    re: /Alert\.alert\(\s*["']([A-Za-z][a-zA-Z\s'.,!?-]{3,})["']/g,
    desc: "Hardcoded Alert title",
    severity: "high",
    filter: (m) => !isLikelyCode(m[1]),
  },

  // console-visible but not UI — lower severity
  // Catches standalone string args that look like messages
  {
    re: /(?:onPress|onConfirm|message)\s*=\s*["']([A-Za-z][a-zA-Z\s'.,!?-]{6,})["']/g,
    desc: "Hardcoded message prop",
    severity: "medium",
    filter: (m) => !isLikelyCode(m[1]),
  },
];

// Strings that look like code/values, not UI text — skip these
const CODE_PATTERNS = [
  /^[a-z]/, // starts lowercase — likely a key or variable name
  /^\d/, // starts with number
  /^https?:\/\//, // URL
  /^#/, // color
  /\.(js|jsx|ts|tsx|json|png|jpg|svg)$/, // file extension
  /^[A-Z_]{3,}$/, // ALL_CAPS constant
  /^rgba?\(/, // CSS color
  /navigation|screen|route|params|props|state|store|context|hook|util|helper|config|api|client|axios|fetch|promise|async|await|import|export|from|const|let|var|function|return|class|extends|null|undefined|true|false/i,
];

const ALWAYS_SKIP = new Set([
  "SkilledPro",
  "SkilledProz",
  "SP",
  "USD",
  "GBP",
  "EUR",
  "NGN",
  "PRO",
  "FREE",
  "ENTERPRISE",
  "VERIFIED",
  "PENDING",
  "REJECTED",
  "FIXED",
  "HOURLY",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "CUSTOM",
  "GET",
  "POST",
  "PATCH",
  "DELETE",
  "PUT",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "iOS",
  "Android",
  "React",
  "Expo",
  "Node",
]);

function isLikelyCode(str) {
  if (!str || str.length < 3) return true;
  if (ALWAYS_SKIP.has(str.trim())) return true;
  for (const p of CODE_PATTERNS) {
    if (p.test(str.trim())) return true;
  }
  return false;
}

// Files/dirs to skip entirely
const SKIP_DIRS = new Set(["node_modules", ".expo", "assets", "scripts"]);
const SKIP_FILES = new Set([
  "theme.js",
  "currencies.js",
  "languages.js",
  "client.js",
  "authStore.js",
]);

// ── File collection ───────────────────────────────────────────────────────────
function collectFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(full, results);
    } else if (/\.(js|jsx)$/.test(entry.name) && !SKIP_FILES.has(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

// ── Already translated check ──────────────────────────────────────────────────
// Check if a file already uses useTranslation
function usesI18n(src) {
  return src.includes("useTranslation") || src.includes("i18next");
}

// ── Main scan ─────────────────────────────────────────────────────────────────
const files = collectFiles(SRC_DIR);
const results = []; // { file, usesI18n, hits: [{line, col, text, desc, severity}] }
let totalHits = 0;

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const lines = src.split("\n");
  const hasI18n = usesI18n(src);
  const hits = [];

  for (const { re, desc, severity, filter } of PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const text = m[1]?.trim();
      if (!text || text.length < 3) continue;
      if (filter && !filter(m)) continue;

      // Find line number
      const upTo = src.slice(0, m.index);
      const lineNum = upTo.split("\n").length;
      const lineText = lines[lineNum - 1]?.trim() ?? "";

      // Skip if this match is already inside a t() call
      if (/\bt\(/.test(lineText)) continue;
      // Skip comments
      if (lineText.startsWith("//") || lineText.startsWith("*")) continue;
      // Skip import/export lines
      if (/^(import|export)\s/.test(lineText)) continue;
      // Skip console.log
      if (lineText.includes("console.")) continue;

      hits.push({ line: lineNum, text, desc, severity, lineText });
      totalHits++;
    }
  }

  // Dedupe by line number (multiple patterns can match same line)
  const seen = new Set();
  const deduped = hits.filter((h) => {
    const key = `${h.line}:${h.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length > 0) {
    results.push({ file, hasI18n, hits: deduped });
  }
}

// ── Sort by severity and hit count ───────────────────────────────────────────
results.sort((a, b) => {
  const aHigh = a.hits.filter((h) => h.severity === "high").length;
  const bHigh = b.hits.filter((h) => h.severity === "high").length;
  return bHigh - aHigh || b.hits.length - a.hits.length;
});

// ── Output ────────────────────────────────────────────────────────────────────
console.log("\n🔍  SkilledProzHirer — Hardcoded String Audit\n");
console.log("=".repeat(65));
console.log(`\n📁  Scanned ${files.length} source files`);
console.log(
  `⚠️   Found ${totalHits} potential hardcoded strings in ${results.length} files\n`,
);
console.log("=".repeat(65));

// Summary table first
console.log("\n📊  Files ranked by hardcoded string count:\n");
console.log("  File".padEnd(52) + "i18n?  High  Med  Total");
console.log("  " + "─".repeat(62));

for (const { file, hasI18n, hits } of results) {
  const rel = path.relative(path.join(__dirname, ".."), file);
  const high = hits.filter((h) => h.severity === "high").length;
  const med = hits.filter((h) => h.severity === "medium").length;
  const i18nIcon = hasI18n ? "✅" : "❌";
  const name = rel.length > 48 ? "..." + rel.slice(-45) : rel;
  console.log(
    `  ${name.padEnd(50)} ${i18nIcon}    ${String(high).padStart(3)}  ${String(med).padStart(3)}  ${String(hits.length).padStart(5)}`,
  );
}

// Detailed breakdown
console.log("\n" + "=".repeat(65));
console.log("\n📋  Detailed findings:\n");

for (const { file, hasI18n, hits } of results) {
  const rel = path.relative(path.join(__dirname, ".."), file);
  const highCount = hits.filter((h) => h.severity === "high").length;

  console.log(`\n── ${rel}`);
  console.log(
    `   i18n: ${hasI18n ? "✅ uses useTranslation" : "❌ NO useTranslation imported"}`,
  );
  console.log(
    `   Hardcoded strings: ${hits.length} (${highCount} high priority)\n`,
  );

  for (const { line, text, desc, severity, lineText } of hits) {
    const icon = severity === "high" ? "🔴" : "🟡";
    console.log(`   ${icon} Line ${String(line).padStart(4)}  [${desc}]`);
    console.log(`          Text: "${text}"`);
    console.log(`          Code: ${lineText.slice(0, 80)}`);
    console.log();
  }
}

// ── Action plan ───────────────────────────────────────────────────────────────
console.log("=".repeat(65));
console.log("\n✍️   Priority rewrite list (files with NO i18n + high hits):\n");

const noI18nFiles = results.filter(
  (r) => !r.hasI18n && r.hits.some((h) => h.severity === "high"),
);
if (noI18nFiles.length === 0) {
  console.log("  🎉 All files already import useTranslation!");
} else {
  for (const { file, hits } of noI18nFiles) {
    const rel = path.relative(path.join(__dirname, ".."), file);
    const high = hits.filter((h) => h.severity === "high").length;
    console.log(`  🔴 ${rel}  (${high} high-priority strings)`);
    for (const h of hits.filter((hh) => hh.severity === "high").slice(0, 5)) {
      console.log(`       • "${h.text}"`);
    }
  }
}

console.log("\n" + "=".repeat(65));
console.log("\n✍️   Already using i18n but still has hardcoded strings:\n");

const hasI18nButHardcoded = results.filter(
  (r) => r.hasI18n && r.hits.some((h) => h.severity === "high"),
);
if (hasI18nButHardcoded.length === 0) {
  console.log("  🎉 No partially-translated files found!");
} else {
  for (const { file, hits } of hasI18nButHardcoded) {
    const rel = path.relative(path.join(__dirname, ".."), file);
    const high = hits.filter((h) => h.severity === "high").length;
    console.log(`  🟡 ${rel}  (${high} strings still hardcoded)`);
    for (const h of hits.filter((hh) => hh.severity === "high").slice(0, 5)) {
      console.log(`       Line ${h.line}: "${h.text}"`);
    }
  }
}

console.log("\n" + "=".repeat(65));
console.log("\n✅  Audit complete.\n");
