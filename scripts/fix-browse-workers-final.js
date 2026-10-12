#!/usr/bin/env node

/**
 * Fix BrowseWorkersScreen.js - Final comprehensive fix
 *
 * This script fixes ALL JSX syntax errors by properly wrapping
 * label and other props with curly braces when using t()
 *
 * Run: node scripts/fix-browse-workers-final.js
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

function fixBrowseWorkersScreen() {
  console.log("\n🔧  Fixing BrowseWorkersScreen.js - Final Fix\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix ALL label props with t() calls ──────────────────
  console.log("\n📝  Fixing JSX label props...");

  // Fix pattern: label=t("key") → label={t("key")}
  content = content.replace(/label=t\(/g, "label={t(");

  // Fix pattern: label="TEXT" → label={t("key")} for specific keys
  const labelFixes = [
    {
      from: /label="AVAILABILITY"/g,
      to: 'label={t("browse.filter.availability")}',
    },
    { from: /label="CATEGORY"/g, to: 'label={t("browse.filter.category")}' },
    { from: /label="CITY"/g, to: 'label={t("browse.filter.city")}' },
    {
      from: /label="HOURLY RATE"/g,
      to: 'label={t("browse.filter.hourlyRate")}',
    },
    {
      from: /label="MINIMUM RATING"/g,
      to: 'label={t("browse.filter.minRating")}',
    },
    {
      from: /label="MAX DISTANCE"/g,
      to: 'label={t("browse.filter.maxDistance")}',
    },
    { from: /label="LANGUAGE"/g, to: 'label={t("browse.filter.language")}' },
    {
      from: /label="GENDER PREFERENCE"/g,
      to: 'label={t("browse.filter.gender")}',
    },
    {
      from: /label="VERIFICATION"/g,
      to: 'label={t("browse.filter.verification")}',
    },
  ];

  for (const fix of labelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix pattern: label="Any distance" etc
  const optionFixes = [
    {
      from: /label="Any distance"/g,
      to: 'label={t("browse.filter.anyDistance")}',
    },
    {
      from: /label="Any language"/g,
      to: 'label={t("browse.filter.anyLanguage")}',
    },
    { from: /label="Any"/g, to: 'label={t("browse.filter.any")}' },
    { from: /label="Male"/g, to: 'label={t("browse.filter.male")}' },
    { from: /label="Female"/g, to: 'label={t("browse.filter.female")}' },
    { from: /label="Non-binary"/g, to: 'label={t("browse.filter.nonBinary")}' },
    { from: /label="Verified ✅"/g, to: 'label={t("browse.filter.verified")}' },
    { from: /label="Reset"/g, to: 'label={t("browse.filter.reset")}' },
    { from: /label="Apply Filters"/g, to: 'label={t("browse.filter.apply")}' },
    {
      from: /label="Available only"/g,
      to: 'label={t("browse.filter.availableOnly")}',
    },
    {
      from: /label="All categories"/g,
      to: 'label={t("browse.filter.allCategories")}',
    },
    { from: /label="4★ & above"/g, to: 'label={t("browse.filter.rating4")}' },
    { from: /label="3★ & above"/g, to: 'label={t("browse.filter.rating3")}' },
    { from: /label="Any rating"/g, to: 'label={t("browse.filter.anyRating")}' },
  ];

  for (const fix of optionFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix any remaining label=t( pattern
  content = content.replace(/label=t\(/g, "label={t(");

  // Fix any label without closing }
  content = content.replace(/label={t\("([^"]+)"\)/g, 'label={t("$1")}');

  // Fix any label={t("key") with missing )
  content = content.replace(/label={t\("([^"]+)"$/gm, 'label={t("$1")}');

  // ── 3. Save the fixed file ─────────────────────────────────
  const backupPath = SCREEN_PATH + ".backup2";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(SCREEN_PATH, content);
  console.log(`\n✅  Updated ${SCREEN_PATH}`);

  // ── 4. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log("\n  ✅ Fixed all JSX label props:");
  console.log("     - Section labels (AVAILABILITY, CATEGORY, etc.)");
  console.log("     - Option labels (Any, Male, Female, etc.)");
  console.log("     - Button labels (Reset, Apply Filters)");
  console.log("     - All label props now use label={...} syntax");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Run the app to verify the fix");
  console.log("     2. If there are still errors, run:");
  console.log(
    '        grep -n "label=" src/screens/main/BrowseWorkersScreen.js | grep -v "label={"',
  );
  console.log("     3. This will show any remaining label props without {}");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixBrowseWorkersScreen();
} catch (error) {
  console.error("❌  Failed to fix BrowseWorkersScreen:", error.message);
  process.exit(1);
}
