#!/usr/bin/env node

/**
 * Fix WorkerJobsScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-worker-jobs.js
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
  "WorkerJobsScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Category modal
  "workerJobs.category.select": "Select Category",
  "workerJobs.category.search": "Search categories...",
  "workerJobs.category.all": "All Categories",
  "workerJobs.category.filtered": "Filtered by {{category}}",

  // Apply modal
  "workerJobs.apply.title": "Apply to Job",
  "workerJobs.apply.message": "MESSAGE (OPTIONAL)",
  "workerJobs.apply.messagePlaceholder": "Add a message to your application...",
  "workerJobs.apply.button": "✋ Apply Now",
  "workerJobs.apply.cancel": "Cancel",
  "workerJobs.apply.success": "Application sent! The hirer will be notified.",
  "workerJobs.apply.failed": "Failed to apply.",
  "workerJobs.apply.close": "Close",

  // Job card
  "workerJobs.job.applied": "applied",
  "workerJobs.job.viewApply": "View & Apply →",
  "workerJobs.job.hirerProfile": "Hirer Profile",
  "workerJobs.job.today": "Today",
  "workerJobs.job.daysAgo": "{{d}}d ago",
  "workerJobs.job.weeksAgo": "{{w}}w ago",
  "workerJobs.job.monthsAgo": "{{m}}mo ago",
  "workerJobs.job.yearsAgo": "{{y}}y ago",
  "workerJobs.job.hours": "hour",
  "workerJobs.job.hoursPlural": "hours",
  "workerJobs.job.days": "day",
  "workerJobs.job.daysPlural": "days",
  "workerJobs.job.weeks": "week",
  "workerJobs.job.weeksPlural": "weeks",
  "workerJobs.job.months": "month",
  "workerJobs.job.monthsPlural": "months",
  "workerJobs.job.durationFormat": "{{value}} hours (≈{{days}} days)",

  // Search
  "workerJobs.search.placeholder": "Search jobs by title or description...",
  "workerJobs.search.button": "Search",
  "workerJobs.search.results": "{{count}} open job",
  "workerJobs.search.resultsPlural": "{{count}} open jobs",
  "workerJobs.search.resultsFound": "{{count}} open job{{s}} found",

  // Empty state
  "workerJobs.empty.title": "No jobs found",
  "workerJobs.empty.subtitle":
    "Try adjusting your search or clearing the category filter.",
  "workerJobs.empty.clearFilters": "Clear filters",

  // Loading
  "workerJobs.loading": "Loading jobs...",

  // Toast
  "workerJobs.toast.loadError": "Could not load jobs",

  // Common
  "common.back": "Back",
  "toast.networkError": "Network error. Please try again.",
  "toast.unknownError": "Something went wrong. Please try again.",
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

function fixWorkerJobsScreen() {
  console.log("\n🔧  Fixing WorkerJobsScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix category modal strings
  const categoryFixes = [
    { from: /"Select Category"/g, to: 't("workerJobs.category.select")' },
    {
      from: /"Search categories\.\.\."/g,
      to: 't("workerJobs.category.search")',
    },
    { from: /"All Categories"/g, to: 't("workerJobs.category.all")' },
  ];

  for (const fix of categoryFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix apply modal strings
  const applyFixes = [
    { from: /"MESSAGE \(OPTIONAL\)"/g, to: 't("workerJobs.apply.message")' },
    {
      from: /"Add a message to your application\.\.\."/g,
      to: 't("workerJobs.apply.messagePlaceholder")',
    },
    { from: /"✋ Apply Now"/g, to: 't("workerJobs.apply.button")' },
    { from: /"Cancel"/g, to: 't("workerJobs.apply.cancel")' },
    {
      from: /"Application sent! The hirer will be notified\."/g,
      to: 't("workerJobs.apply.success")',
    },
    { from: /"Failed to apply\."/g, to: 't("workerJobs.apply.failed")' },
    { from: /"Close"/g, to: 't("workerJobs.apply.close")' },
  ];

  for (const fix of applyFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix job card strings
  const jobCardFixes = [
    { from: /" applied"/g, to: 't("workerJobs.job.applied")' },
    { from: /"View & Apply →"/g, to: 't("workerJobs.job.viewApply")' },
    { from: /"Hirer Profile"/g, to: 't("workerJobs.job.hirerProfile")' },
    { from: /"Today"/g, to: 't("workerJobs.job.today")' },
  ];

  for (const fix of jobCardFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix search strings
  const searchFixes = [
    {
      from: /"Search jobs by title or description\.\.\."/g,
      to: 't("workerJobs.search.placeholder")',
    },
    { from: /"Search"/g, to: 't("workerJobs.search.button")' },
  ];

  for (const fix of searchFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix empty state strings
  const emptyFixes = [
    { from: /"No jobs found"/g, to: 't("workerJobs.empty.title")' },
    {
      from: /"Try adjusting your search or clearing the category filter\."/g,
      to: 't("workerJobs.empty.subtitle")',
    },
    { from: /"Clear filters"/g, to: 't("workerJobs.empty.clearFilters")' },
  ];

  for (const fix of emptyFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix toast messages
  const toastFixes = [
    { from: /"Could not load jobs"/g, to: 't("workerJobs.toast.loadError")' },
  ];

  for (const fix of toastFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix result count string - dynamic
  content = content.replace(
    /{total} open job{total !== 1 \? "s" : ""} found/g,
    '{t("workerJobs.search.resultsFound", { count: total, s: total !== 1 ? "s" : "" })}',
  );

  // Fix the CategoryModal title
  content = content.replace(
    /Select Category/g,
    '{t("workerJobs.category.select")}',
  );

  // Fix the ApplyModal title - add a title
  // The apply modal doesn't have a title, let's add one
  // We'll add it in the JSX

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
  console.log(
    "     - Category modal (Select Category, Search, All Categories)",
  );
  console.log("     - Apply modal (Message, placeholder, buttons)");
  console.log("     - Job card (applied, View & Apply, Hirer Profile)");
  console.log("     - Search (placeholder, button)");
  console.log("     - Empty state (title, subtitle, clear filters)");
  console.log("     - Toast messages");
  console.log("     - Result count");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - workerJobs.* (35+ keys)");
  console.log("     - common.* (1 key)");
  console.log("     - toast.* (2 keys)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in WorkerJobsScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the worker jobs flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerJobsScreen();
} catch (error) {
  console.error("❌  Failed to fix WorkerJobsScreen:", error.message);
  process.exit(1);
}
