#!/usr/bin/env node
// scripts/check-locales.js
// Run from project root: node scripts/check-locales.js
//
// What it does:
//   1. Scans every .js / .jsx file in src/ for t("key") / t('key') calls
//   2. Loads all 9 locale JSON files
//   3. Reports which keys are missing from which locales
//   4. Shows a per-locale summary so you know exactly what to write

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ── Config ────────────────────────────────────────────────────────────────────
const SRC_DIR = path.join(ROOT, "src");
const LOCALES_DIR = path.join(ROOT, "src", "i18n", "locales");

const LOCALES = ["en", "es", "fr", "pt", "zh", "ha", "yo", "ig", "ar"];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recursively collect all .js / .jsx files */
function collectFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, results);
    else if (/\.(js|jsx)$/.test(entry.name)) results.push(full);
  }
  return results;
}

/** Flatten a nested JSON object into dot-notation keys */
function flattenKeys(obj, prefix = "", out = new Set()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      flattenKeys(v, key, out);
    } else {
      out.add(key);
    }
  }
  return out;
}

/** Extract all t("...") / t('...') / t(`...`) keys from source */
function extractKeys(src) {
  const keys = new Set();
  // Matches: t("some.key") t('some.key') — static strings only
  const re = /\bt\(\s*["'`]([^"'`\s{}()]+)["'`]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    keys.add(m[1]);
  }
  return keys;
}

/** Load a locale file, return flat key set (empty set if file missing) */
function loadLocale(locale) {
  const file = path.join(LOCALES_DIR, `${locale}.json`);
  if (!fs.existsSync(file)) return { keys: new Set(), missing: true };
  try {
    const json = JSON.parse(fs.readFileSync(file, "utf8"));
    return { keys: flattenKeys(json), missing: false };
  } catch {
    return { keys: new Set(), missing: true };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log("\n🔍  SkilledProzHirer — Locale Completeness Check\n");
console.log("=".repeat(60));

// 1. Collect all translation keys used in source
const files = collectFiles(SRC_DIR);
const allUsedKeys = new Set();
const keyToFiles = {};

for (const file of files) {
  const src = fs.readFileSync(file, "utf8");
  const keys = extractKeys(src);
  for (const k of keys) {
    allUsedKeys.add(k);
    if (!keyToFiles[k]) keyToFiles[k] = [];
    keyToFiles[k].push(path.relative(ROOT, file));
  }
}

console.log(`\n📁  Scanned ${files.length} source files`);
console.log(
  `🔑  Found ${allUsedKeys.size} unique translation keys used in code\n`,
);
console.log("=".repeat(60));

// 2. Load all locales
const localeData = {};
for (const locale of LOCALES) {
  localeData[locale] = loadLocale(locale);
}

// 3. Compute missing keys per locale
const missingByLocale = {};
const allMissingKeys = new Set();

for (const locale of LOCALES) {
  const { keys, missing: fileMissing } = localeData[locale];
  const missing = [];
  for (const key of allUsedKeys) {
    // Skip interpolation placeholders like "toast.{{type}}"
    if (
      key.includes("{{") ||
      (key.includes("postJob.durationType.") && key.endsWith("."))
    )
      continue;
    if (!keys.has(key)) {
      missing.push(key);
      allMissingKeys.add(key);
    }
  }
  missingByLocale[locale] = { missing, fileMissing };
}

// 4. Print per-locale summary
console.log("\n📊  Per-locale status:\n");

for (const locale of LOCALES) {
  const { missing, fileMissing } = missingByLocale[locale];
  const { keys } = localeData[locale];
  const total = allUsedKeys.size;
  const present = total - missing.length;
  const pct = total > 0 ? Math.round((present / total) * 100) : 100;
  const bar =
    "█".repeat(Math.round(pct / 5)) + "░".repeat(20 - Math.round(pct / 5));
  const status = fileMissing
    ? "❌ FILE MISSING"
    : missing.length === 0
      ? "✅ Complete"
      : `⚠️  ${missing.length} missing`;

  console.log(
    `  ${locale.toUpperCase().padEnd(4)} [${bar}] ${pct}%  ${status}`,
  );
}

// 5. Print detailed missing keys grouped by namespace
console.log("\n" + "=".repeat(60));
console.log("\n📋  Missing keys by locale:\n");

for (const locale of LOCALES) {
  const { missing, fileMissing } = missingByLocale[locale];
  if (missing.length === 0 && !fileMissing) continue;

  console.log(
    `\n── ${locale.toUpperCase()} ──────────────────────────────────`,
  );

  if (fileMissing) {
    console.log(`  ⚠️  Locale file not found: src/i18n/locales/${locale}.json`);
    console.log(`  All ${allUsedKeys.size} keys need to be added.\n`);
  }

  if (missing.length === 0) {
    console.log("  ✅ No missing keys");
    continue;
  }

  // Group by namespace (first segment of dot-notation key)
  const grouped = {};
  for (const key of missing) {
    const ns = key.split(".")[0];
    if (!grouped[ns]) grouped[ns] = [];
    grouped[ns].push(key);
  }

  for (const [ns, keys] of Object.entries(grouped).sort()) {
    console.log(`\n  [${ns}]  (${keys.length} missing)`);
    for (const key of keys.sort()) {
      console.log(`    • ${key}`);
    }
  }
}

// 6. Print keys that ARE in locales but NOT used in code (orphaned)
console.log("\n" + "=".repeat(60));
console.log("\n🗑️   Orphaned keys in EN (defined but never used in code):\n");

const { keys: enKeys } = localeData["en"];
const orphaned = [...enKeys].filter((k) => !allUsedKeys.has(k));
if (orphaned.length === 0) {
  console.log("  ✅ No orphaned keys found");
} else {
  console.log(`  Found ${orphaned.length} orphaned keys:`);
  for (const k of orphaned.sort()) {
    console.log(`    • ${k}`);
  }
}

// 7. Generate a TODO list of namespaces to write
console.log("\n" + "=".repeat(60));
console.log("\n✍️   Namespaces that need translation work:\n");

const namespacesNeeded = new Set();
for (const locale of LOCALES) {
  const { missing } = missingByLocale[locale];
  for (const key of missing) {
    namespacesNeeded.add(key.split(".")[0]);
  }
}

if (namespacesNeeded.size === 0) {
  console.log("  🎉 All namespaces complete across all locales!");
} else {
  console.log("  Namespaces with missing translations:\n");
  for (const ns of [...namespacesNeeded].sort()) {
    const localesNeeding = LOCALES.filter((l) =>
      missingByLocale[l].missing.some((k) => k.startsWith(`${ns}.`)),
    );
    console.log(`  📦 "${ns}"  →  needs work in: ${localesNeeding.join(", ")}`);
  }
}

console.log("\n" + "=".repeat(60));
console.log("\n✅  Check complete.\n");
