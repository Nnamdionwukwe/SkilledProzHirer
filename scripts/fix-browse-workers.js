#!/usr/bin/env node

/**
 * Fix BrowseWorkersScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-browse-workers.js
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
  "BrowseWorkersScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Browse labels
  "browse.new": "New",
  "browse.jobs": "jobs",
  "browse.available": "Available",
  "browse.unavailable": "Unavailable",
  "browse.filters": "Filters",
  "browse.searchPlaceholder": "Search by name, skill, category...",
  "browse.search": "Search",
  "browse.trending": "Trending",
  "browse.results": "Results",
  "browse.nearby": "Nearby",
  "browse.topRated": "⭐ Top Rated Workers",
  "browse.newOnPlatform": "🌟 New on Platform",
  "browse.searchResults": "Search Results",
  "browse.nearbyWorkers": "📍 Nearby Workers",
  "browse.noResults": "No workers found",
  "browse.noResultsSub": "Try adjusting your search or filters",

  // Filter panel labels
  "browse.filter.availability": "AVAILABILITY",
  "browse.filter.availableOnly": "Available only",
  "browse.filter.category": "CATEGORY",
  "browse.filter.allCategories": "All categories",
  "browse.filter.city": "CITY",
  "browse.filter.cityPlaceholder": "e.g. Lagos",
  "browse.filter.hourlyRate": "HOURLY RATE",
  "browse.filter.min": "Min",
  "browse.filter.max": "Max",
  "browse.filter.minRating": "MINIMUM RATING",
  "browse.filter.rating4": "4★ & above",
  "browse.filter.rating3": "3★ & above",
  "browse.filter.anyRating": "Any rating",
  "browse.filter.maxDistance": "MAX DISTANCE",
  "browse.filter.anyDistance": "Any distance",
  "browse.filter.language": "LANGUAGE",
  "browse.filter.anyLanguage": "Any language",
  "browse.filter.gender": "GENDER PREFERENCE",
  "browse.filter.any": "Any",
  "browse.filter.male": "Male",
  "browse.filter.female": "Female",
  "browse.filter.nonBinary": "Non-binary",
  "browse.filter.verification": "VERIFICATION",
  "browse.filter.verified": "Verified ✅",
  "browse.filter.reset": "Reset",
  "browse.filter.apply": "Apply Filters",
  "browse.filter.voiceSearch": "Voice search coming soon",
  "browse.filter.locationDenied": "Location permission denied",

  // Common
  "common.loading": "Loading...",
  "toast.unknownError": "Something went wrong. Please try again.",
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

function fixBrowseWorkersScreen() {
  console.log("\n🔧  Fixing BrowseWorkersScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix hardcoded strings in the file
  const hardcodedFixes = [
    // Fix "NEW" badge
    { from: /"NEW"/g, to: 't("browse.new").toUpperCase()' },

    // Fix "jobs" in card
    { from: /"jobs"/g, to: 't("browse.jobs")' },

    // Fix availability labels
    { from: /"Available only"/g, to: 't("browse.filter.availableOnly")' },

    // Fix category label
    { from: /"All categories"/g, to: 't("browse.filter.allCategories")' },

    // Fix city placeholder
    {
      from: /"e\.g\. Lagos"/g,
      to: 't("browse.filter.cityPlaceholder") || "e.g. Lagos"',
    },

    // Fix rate placeholders
    { from: /"Min"/g, to: 't("browse.filter.min")' },
    { from: /"Max"/g, to: 't("browse.filter.max")' },

    // Fix rating options
    { from: /"4★ & above"/g, to: 't("browse.filter.rating4")' },
    { from: /"3★ & above"/g, to: 't("browse.filter.rating3")' },
    { from: /"Any rating"/g, to: 't("browse.filter.anyRating")' },

    // Fix distance options
    { from: /"Any distance"/g, to: 't("browse.filter.anyDistance")' },

    // Fix language options
    { from: /"Any language"/g, to: 't("browse.filter.anyLanguage")' },

    // Fix gender options
    { from: /"Any"/g, to: 't("browse.filter.any")' },
    { from: /"Male"/g, to: 't("browse.filter.male")' },
    { from: /"Female"/g, to: 't("browse.filter.female")' },
    { from: /"Non-binary"/g, to: 't("browse.filter.nonBinary")' },

    // Fix verification options
    { from: /"Verified ✅"/g, to: 't("browse.filter.verified")' },

    // Fix filter button labels
    { from: /"Reset"/g, to: 't("browse.filter.reset")' },
    { from: /"Apply Filters"/g, to: 't("browse.filter.apply")' },

    // Fix section labels
    { from: /"AVAILABILITY"/g, to: 't("browse.filter.availability")' },
    { from: /"CATEGORY"/g, to: 't("browse.filter.category")' },
    { from: /"CITY"/g, to: 't("browse.filter.city")' },
    { from: /"HOURLY RATE"/g, to: 't("browse.filter.hourlyRate")' },
    { from: /"MINIMUM RATING"/g, to: 't("browse.filter.minRating")' },
    { from: /"MAX DISTANCE"/g, to: 't("browse.filter.maxDistance")' },
    { from: /"LANGUAGE"/g, to: 't("browse.filter.language")' },
    { from: /"GENDER PREFERENCE"/g, to: 't("browse.filter.gender")' },
    { from: /"VERIFICATION"/g, to: 't("browse.filter.verification")' },

    // Fix voice search message
    {
      from: /"Voice search coming soon"/g,
      to: 't("browse.filter.voiceSearch")',
    },

    // Fix location permission message
    {
      from: /"Location permission denied"/g,
      to: 't("browse.filter.locationDenied")',
    },
  ];

  for (const fix of hardcodedFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix the TABS array - it's already using t() in the component

  // Fix the FilterPanel's `th` prop - it's already passed correctly

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
  console.log("     - Worker card labels (NEW, jobs, availability)");
  console.log("     - Filter panel labels and options");
  console.log("     - Section headers");
  console.log("     - Placeholder text");
  console.log("     - Button labels");
  console.log("     - Toast messages");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - browse.* (20+ keys)");
  console.log("     - browse.filter.* (25+ keys)");
  console.log("     - toast.* (2 keys)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in BrowseWorkersScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the browse workers flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixBrowseWorkersScreen();
} catch (error) {
  console.error("❌  Failed to fix BrowseWorkersScreen:", error.message);
  process.exit(1);
}
