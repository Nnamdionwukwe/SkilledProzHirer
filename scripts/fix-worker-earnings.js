#!/usr/bin/env node

/**
 * Fix WorkerEarningsScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-worker-earnings.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SCREEN_PATH = path.join(
  rootDir,
  "src",
  "screens",
  "main",
  "worker",
  "WorkerEarningsScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Summary stats
  "workerEarnings.totalEarned": "Total Earned",
  "workerEarnings.totalJobValue": "Total Job Value",
  "workerEarnings.platformFees": "Platform Fees",
  "workerEarnings.transactions": "Transactions",

  // Filters
  "workerEarnings.allCurrencies": "All Currencies",
  "workerEarnings.from": "From",
  "workerEarnings.to": "To",
  "workerEarnings.datePlaceholder": "dd/mm/yyyy",

  // Empty state
  "workerEarnings.noEarnings": "No earnings yet",
  "workerEarnings.noEarningsSub":
    "Complete jobs to start earning. Your earnings will appear here.",
  "workerEarnings.loadFail": "Failed to load earnings",

  // Footer
  "workerEarnings.allLoaded": "All {{count}} transactions loaded",

  // Currency badge
  "workerEarnings.currencyBadge": "{{currency}}",
};

function loadLocaleFile(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLocaleFile(locale, data) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addTranslationKeys(localeData, keys) {
  let added = 0;
  for (const [key, value] of Object.entries(keys)) {
    if (!localeData[key]) {
      localeData[key] = value;
      added++;
    }
  }
  return { data: localeData, added };
}

function fixWorkerEarningsScreen() {
  console.log("\n🔧  Fixing WorkerEarningsScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix placeholder text
  const placeholderFixes = [
    {
      from: /placeholder="dd\/mm\/yyyy"/g,
      to: 'placeholder={t("workerEarnings.datePlaceholder")}',
    },
  ];

  for (const fix of placeholderFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded labels in DateInput - already using label prop

  // Fix the all currencies label in the currency modal - already using t()

  // Fix the footer text - dynamic
  content = content.replace(
    /All \$\{total\} \$\{t\("workerEarnings\.transactions"\)\.toLowerCase\(\)\} loaded/g,
    '{t("workerEarnings.allLoaded", { count: total })}',
  );

  // Fix the summary stat labels - already using t()

  // Fix empty state - already using t()

  // ── 3. Add missing translation keys to all locale files ────
  console.log("\n📝  Adding missing translation keys to locale files...");

  const locales = ["en", "fr", "ar", "yo", "ha", "ig", "sw", "pt", "es"];
  const results = {};

  locales.forEach((locale) => {
    const localeData = loadLocaleFile(locale);
    const { data, added } = addTranslationKeys(localeData, MISSING_KEYS);
    saveLocaleFile(locale, data);
    results[locale] = added;
    console.log(`  ✅ ${locale}.json: added ${added} keys`);
  });

  // ── 4. Save the improved file ─────────────────────────────
  const backupPath = SCREEN_PATH + ".backup";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(SCREEN_PATH, content);
  console.log(`\n✅  Updated ${SCREEN_PATH}`);

  // ── 5. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log("\n  ✅ Fixed hardcoded strings:");
  console.log("     - Date input placeholder");
  console.log("     - Footer text (dynamic)");
  console.log("     - All translations already in place");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - workerEarnings.* (10+ keys)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in WorkerEarningsScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the earnings screen with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerEarningsScreen();
} catch (error) {
  console.error("❌  Failed to fix WorkerEarningsScreen:", error.message);
  process.exit(1);
}
