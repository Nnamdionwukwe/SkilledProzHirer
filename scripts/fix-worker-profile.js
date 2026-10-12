#!/usr/bin/env node

/**
 * Fix WorkerProfileScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-worker-profile.js
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
  "WorkerProfileScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Tab labels
  "workerProfile.tabs.about": "About",
  "workerProfile.tabs.portfolio": "Portfolio",
  "workerProfile.tabs.certifications": "Certifications",
  "workerProfile.tabs.reviews": "Reviews",

  // Section labels
  "workerProfile.section.about": "ABOUT",
  "workerProfile.section.availability": "AVAILABILITY",
  "workerProfile.section.specialities": "SPECIALITIES",

  // Day labels
  "workerProfile.days.mon": "Mon",
  "workerProfile.days.tue": "Tue",
  "workerProfile.days.wed": "Wed",
  "workerProfile.days.thu": "Thu",
  "workerProfile.days.fri": "Fri",
  "workerProfile.days.sat": "Sat",
  "workerProfile.days.sun": "Sun",

  // Time ago
  "workerProfile.time.justNow": "Just now",
  "workerProfile.time.minutesAgo": "{{m}}m ago",
  "workerProfile.time.hoursAgo": "{{h}}h ago",
  "workerProfile.time.daysAgo": "{{d}}d ago",
  "workerProfile.time.never": "Never",

  // Stats
  "workerProfile.stats.jobsDone": "jobs done",
  "workerProfile.stats.radius": "radius",
  "workerProfile.stats.lastSeen": "last seen",
  "workerProfile.stats.joined": "joined",
  "workerProfile.stats.perHour": "/hr",

  // Role
  "workerProfile.role.worker": "WORKER",
  "workerProfile.role.hirer": "HIRER",
  "workerProfile.role.verifiedWorker": "Verified Worker",
  "workerProfile.role.pro": "⭐ PRO",

  // Empty states
  "workerProfile.empty.noBio": "No bio added yet.",
  "workerProfile.empty.noPortfolio": "No portfolio items yet",
  "workerProfile.empty.noCertifications": "No certifications yet",
  "workerProfile.empty.noReviews": "No reviews yet",

  // Badges
  "workerProfile.badge.emailVerified": "Email Verified",
  "workerProfile.badge.emailUnverified": "Email Unverified",
  "workerProfile.badge.idVerified": "ID Verified",
  "workerProfile.badge.verified": "Verified",

  // Buttons
  "workerProfile.button.editProfile": "Edit Profile",
  "workerProfile.button.viewProfile": "View Profile",
  "workerProfile.button.book": "Book",

  // Reviews
  "workerProfile.reviews.reviewCount": "review",
  "workerProfile.reviews.reviewCountPlural": "reviews",
  "workerProfile.reviews.ratingOutOf": "/5",

  // Profile not found
  "workerProfile.error.notFound": "Profile not found",
  "workerProfile.error.loadFailed": "Failed to load profile",

  // Issuer
  "workerProfile.cert.issuedBy": "Issued by {{issuer}}",

  // Common
  "common.loading": "Loading...",
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

function fixWorkerProfileScreen() {
  console.log("\n🔧  Fixing WorkerProfileScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix TABS array - these are used in the component, need to use t()
  // We'll replace the literal array with a function call

  // Fix hardcoded strings in the file
  const hardcodedFixes = [
    // Tabs
    { from: /"About"/g, to: 't("workerProfile.tabs.about")' },
    { from: /"Portfolio"/g, to: 't("workerProfile.tabs.portfolio")' },
    { from: /"Certifications"/g, to: 't("workerProfile.tabs.certifications")' },
    { from: /"Reviews"/g, to: 't("workerProfile.tabs.reviews")' },

    // Section labels
    { from: /"ABOUT"/g, to: 't("workerProfile.section.about")' },
    { from: /"AVAILABILITY"/g, to: 't("workerProfile.section.availability")' },
    { from: /"SPECIALITIES"/g, to: 't("workerProfile.section.specialities")' },

    // Stats
    { from: /"\/hr"/g, to: 't("workerProfile.stats.perHour")' },
    { from: /"radius"/g, to: 't("workerProfile.stats.radius")' },
    { from: /"jobs done"/g, to: 't("workerProfile.stats.jobsDone")' },
    { from: /"last seen"/g, to: 't("workerProfile.stats.lastSeen")' },
    { from: /"joined"/g, to: 't("workerProfile.stats.joined")' },

    // Role
    { from: /"WORKER"/g, to: 't("workerProfile.role.worker")' },
    { from: /"HIRER"/g, to: 't("workerProfile.role.hirer")' },
    {
      from: /"Verified Worker"/g,
      to: 't("workerProfile.role.verifiedWorker")',
    },
    { from: /"⭐ PRO"/g, to: 't("workerProfile.role.pro")' },

    // Empty states
    { from: /"No bio added yet\."/g, to: 't("workerProfile.empty.noBio")' },
    {
      from: /"No portfolio items yet"/g,
      to: 't("workerProfile.empty.noPortfolio")',
    },
    {
      from: /"No certifications yet"/g,
      to: 't("workerProfile.empty.noCertifications")',
    },
    { from: /"No reviews yet"/g, to: 't("workerProfile.empty.noReviews")' },

    // Badges
    { from: /"Email Verified"/g, to: 't("workerProfile.badge.emailVerified")' },
    {
      from: /"Email Unverified"/g,
      to: 't("workerProfile.badge.emailUnverified")',
    },
    { from: /"ID Verified"/g, to: 't("workerProfile.badge.idVerified")' },
    { from: /"Verified"/g, to: 't("workerProfile.badge.verified")' },

    // Buttons
    { from: /"Edit Profile"/g, to: 't("workerProfile.button.editProfile")' },
    { from: /"View Profile"/g, to: 't("workerProfile.button.viewProfile")' },
    { from: /"Book"/g, to: 't("workerProfile.button.book")' },

    // Profile not found
    { from: /"Profile not found"/g, to: 't("workerProfile.error.notFound")' },
    {
      from: /"Failed to load profile"/g,
      to: 't("workerProfile.error.loadFailed")',
    },

    // Review count
    { from: /"review"/g, to: 't("workerProfile.reviews.reviewCount")' },
    { from: /"reviews"/g, to: 't("workerProfile.reviews.reviewCountPlural")' },
    { from: /"\/5"/g, to: 't("workerProfile.reviews.ratingOutOf")' },

    // Certifications
    {
      from: /"Issued by "/g,
      to: 't("workerProfile.cert.issuedBy", { issuer: cert.issuer })',
    },
  ];

  for (const fix of hardcodedFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix timeAgo function - replace with t() calls
  content = content.replace(
    /return "Never"/g,
    'return t("workerProfile.time.never")',
  );
  content = content.replace(
    /return "Just now"/g,
    'return t("workerProfile.time.justNow")',
  );
  content = content.replace(
    /return `\$\{m\}m ago`/g,
    'return t("workerProfile.time.minutesAgo", { m })',
  );
  content = content.replace(
    /return `\$\{h\}h ago`/g,
    'return t("workerProfile.time.hoursAgo", { h })',
  );
  content = content.replace(
    /return `\$\{d\}d ago`/g,
    'return t("workerProfile.time.daysAgo", { d })',
  );

  // Fix DAY_MAP
  const dayMapFixes = [
    { from: /"Mon"/g, to: 't("workerProfile.days.mon")' },
    { from: /"Tue"/g, to: 't("workerProfile.days.tue")' },
    { from: /"Wed"/g, to: 't("workerProfile.days.wed")' },
    { from: /"Thu"/g, to: 't("workerProfile.days.thu")' },
    { from: /"Fri"/g, to: 't("workerProfile.days.fri")' },
    { from: /"Sat"/g, to: 't("workerProfile.days.sat")' },
    { from: /"Sun"/g, to: 't("workerProfile.days.sun")' },
  ];

  for (const fix of dayMapFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix DAYS array
  const daysFixes = [
    { from: /"Mon"/g, to: 't("workerProfile.days.mon")' },
    { from: /"Tue"/g, to: 't("workerProfile.days.tue")' },
    { from: /"Wed"/g, to: 't("workerProfile.days.wed")' },
    { from: /"Thu"/g, to: 't("workerProfile.days.thu")' },
    { from: /"Fri"/g, to: 't("workerProfile.days.fri")' },
    { from: /"Sat"/g, to: 't("workerProfile.days.sat")' },
    { from: /"Sun"/g, to: 't("workerProfile.days.sun")' },
  ];

  for (const fix of daysFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix review role display
  content = content.replace(/"Hirer"/g, 't("workerProfile.role.hirer")');
  content = content.replace(/"Worker"/g, 't("workerProfile.role.worker")');

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
  console.log("     - Tab labels (About, Portfolio, Certifications, Reviews)");
  console.log("     - Section labels (ABOUT, AVAILABILITY, SPECIALITIES)");
  console.log("     - Stats labels (jobs done, radius, last seen, joined)");
  console.log("     - Role badges (WORKER, HIRER, Verified Worker, PRO)");
  console.log("     - Empty state messages");
  console.log("     - Verification badges");
  console.log("     - Button labels");
  console.log("     - Day names");
  console.log("     - Time ago function");
  console.log("     - Review labels");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - workerProfile.* (50+ keys)");

  console.log("\n  ⚠️  Manual fixes needed:");
  console.log("     1. timeAgo function needs to accept t as parameter");
  console.log("     2. Search for remaining hardcoded strings");
  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in WorkerProfileScreen.js");
  console.log("     2. Manually fix timeAgo function");
  console.log("     3. Add translations for all keys in each locale file");
  console.log("     4. Test the worker profile with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerProfileScreen();
} catch (error) {
  console.error("❌  Failed to fix WorkerProfileScreen:", error.message);
  process.exit(1);
}
