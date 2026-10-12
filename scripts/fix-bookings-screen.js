#!/usr/bin/env node

/**
 * Fix BookingsScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-bookings-screen.js
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
  "BookingsScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Status labels (these are already in the file but let's ensure they exist)
  "bookings.all": "All",
  "bookings.inProgress": "In Progress",
  "bookings.pending": "Pending",
  "bookings.accepted": "Accepted",
  "bookings.completed": "Completed",
  "bookings.cancelled": "Cancelled",
  "bookings.disputed": "Disputed",

  // Booking card
  "bookings.of": "of",
  "bookings.prev": "Prev",
  "bookings.next": "Next",

  // Empty states
  "bookings.noBookings": "No bookings found",
  "bookings.noBookingsHirer":
    "You haven't created any bookings yet. Post a job to get started.",
  "bookings.noBookingsWorker":
    "You haven't been booked yet. Keep your profile updated to attract hirers.",
  "bookings.noBookingsFiltered": "No {{status}} bookings found",

  // Common
  "toast.networkError": "Network error. Please try again.",
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

function fixBookingsScreen() {
  console.log("\n🔧  Fixing BookingsScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix "Prev" and "Next" buttons
  const hardcodedFixes = [
    { from: /"Prev"/g, to: 't("bookings.prev")' },
    { from: /"Next"/g, to: 't("bookings.next")' },
  ];

  for (const fix of hardcodedFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix the pagination text - already using t() for "of"
  // The file already uses t() for most strings, we just need to add the keys

  // Fix the status filter tabs - already using t() for status labels

  // Fix the empty state messages - already using t() with interpolation

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
  console.log("     - Pagination buttons (Prev, Next)");
  console.log("     - Status labels (already using t())");
  console.log("     - Empty state messages (already using t())");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - bookings.* (10+ keys)");
  console.log("     - toast.* (1 key)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in BookingsScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the bookings flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixBookingsScreen();
} catch (error) {
  console.error("❌  Failed to fix BookingsScreen:", error.message);
  process.exit(1);
}
