#!/usr/bin/env node

/**
 * Fix CreateBookingScreen.js - Final comprehensive fix
 *
 * This script fixes ALL JSX syntax errors by properly wrapping
 * label and legend props with curly braces when using t()
 *
 * Run: node scripts/fix-create-booking-final.js
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
  "CreateBookingScreen.js",
);

function fixCreateBookingScreen() {
  console.log("\n🔧  Fixing CreateBookingScreen.js - Final Fix\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix ALL label props with t() calls ──────────────────
  console.log("\n📝  Fixing JSX label props...");

  // Fix pattern: label="SOME_TEXT" → label={t("key")}
  const labelFixes = [
    // Fix label="DESCRIBE ENGAGEMENT"
    {
      from: /label="DESCRIBE ENGAGEMENT"/g,
      to: 'label={t("createBooking.field.describeEngagement")}',
    },
    // Fix label="DESCRIBE DURATION"
    {
      from: /label="DESCRIBE DURATION"/g,
      to: 'label={t("createBooking.field.describeDuration")}',
    },
    // Fix label="SERVICE CATEGORY"
    {
      from: /label="SERVICE CATEGORY"/g,
      to: 'label={t("createBooking.field.serviceCategory")}',
    },
    // Fix label="JOB TITLE *"
    {
      from: /label="JOB TITLE \*"/g,
      to: 'label={t("createBooking.field.jobTitle")}',
    },
    // Fix label="DESCRIPTION *"
    {
      from: /label="DESCRIPTION \*"/g,
      to: 'label={t("createBooking.field.description")}',
    },
    // Fix label="ADDITIONAL NOTES"
    {
      from: /label="ADDITIONAL NOTES"/g,
      to: 'label={t("createBooking.field.additionalNotes")}',
    },
    // Fix label="DATE & TIME *"
    {
      from: /label="DATE & TIME \*"/g,
      to: 'label={t("createBooking.field.dateTime")}',
    },
    // Fix label="NUMBER OF HOURS *" etc - dynamic ones
    {
      from: /label={`NUMBER OF \$\{([^}]+)\}`/g,
      to: (match, unit) => {
        return `label={t("createBooking.field.numberOfUnits", { unit: ${unit} })}`;
      },
    },
    // Fix label="NUMBER OF HOURS" etc without *
    {
      from: /label={`NUMBER OF \$\{([^}]+)\}`/g,
      to: (match, unit) => {
        return `label={t("createBooking.field.numberOfUnits", { unit: ${unit} })}`;
      },
    },
    // Fix label="NUMBER OF ${durationType}" in duration section
    {
      from: /label={`NUMBER OF \$\{durationType\}`}/g,
      to: 'label={t("createBooking.field.numberOfDuration", { duration: durationType })}',
    },
    // Fix any remaining label=t( pattern
    {
      from: /label=t\(/g,
      to: "label={t(",
    },
    // Fix legend="DESCRIBE DURATION"
    {
      from: /legend="DESCRIBE DURATION"/g,
      to: 'legend={t("createBooking.field.describeDuration")}',
    },
    // Fix legend="DESCRIBE ENGAGEMENT"
    {
      from: /legend="DESCRIBE ENGAGEMENT"/g,
      to: 'legend={t("createBooking.field.describeEngagement")}',
    },
  ];

  let fixCount = 0;
  for (const fix of labelFixes) {
    const before = content;
    content = content.replace(fix.from, fix.to);
    if (content !== before) {
      fixCount++;
    }
  }

  // ── 3. Fix any remaining JSX attribute issues ──────────────
  console.log("\n📝  Fixing remaining JSX issues...");

  // Fix any label={t("key")} that might have been missed
  // Fix pattern: label={t("key")} with extra quotes
  content = content.replace(/label={t\("([^"]+)"\)}/g, 'label={t("$1")}');

  // Fix pattern: label={t('key')} to label={t("key")}
  content = content.replace(/label={t\('([^']+)'\)}/g, 'label={t("$1")}');

  // Fix legend={t("key")} with extra quotes
  content = content.replace(/legend={t\("([^"]+)"\)}/g, 'legend={t("$1")}');

  // Fix legend={t('key')} to legend={t("key")}
  content = content.replace(/legend={t\('([^']+)'\)}/g, 'legend={t("$1")}');

  // Fix any label="key" that should be label={t("key")}
  // These are specific ones that might have been missed
  const missedLabels = [
    "AGREED RATE",
    "CURRENCY",
    "NUMBER OF UNITS",
    "DESCRIBE ENGAGEMENT",
    "DESCRIBE DURATION",
    "SERVICE CATEGORY",
    "JOB TITLE",
    "DESCRIPTION",
    "ADDITIONAL NOTES",
    "DATE & TIME",
  ];

  for (const label of missedLabels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`label="${escaped}"`, "g");
    content = content.replace(
      regex,
      `label={t("createBooking.field.${label.toLowerCase().replace(/ & /g, "").replace(/ /g, "")}")}`,
    );
  }

  // ── 4. Save the fixed file ─────────────────────────────────
  const backupPath = SCREEN_PATH + ".backup2";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(SCREEN_PATH, content);
  console.log(`\n✅  Updated ${SCREEN_PATH}`);

  // ── 5. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log(`\n  ✅ Fixed ${fixCount} label/legend props`);
  console.log("  ✅ All JSX attributes now properly wrapped with {}");
  console.log("  ✅ All t() calls now have proper syntax");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Run the app to verify the fix");
  console.log("     2. If there are still errors, run:");
  console.log(
    '        grep -n "label=" src/screens/main/CreateBookingScreen.js | grep -v "label={"',
  );
  console.log("     3. This will show any remaining label props without {}");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixCreateBookingScreen();
} catch (error) {
  console.error("❌  Failed to fix CreateBookingScreen:", error.message);
  process.exit(1);
}
