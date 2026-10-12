#!/usr/bin/env node

/**
 * Fix CreateBookingScreen.js - Final comprehensive fix v2
 *
 * This script fixes ALL JSX syntax errors by properly wrapping
 * label and legend props with curly braces AND ensuring all t() calls are closed
 *
 * Run: node scripts/fix-create-booking-final-v2.js
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
  console.log("\n🔧  Fixing CreateBookingScreen.js - Final Fix v2\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix ALL label props with t() calls ──────────────────
  console.log("\n📝  Fixing JSX label props...");

  // First, fix the specific error: label={t("...") → label={t("...")}
  // Need to add missing closing paren
  content = content.replace(/label={t\("([^"]+)"\)?/g, (match, key) => {
    // If it already has a closing paren, keep it
    if (match.endsWith(")}")) {
      return match;
    }
    // Otherwise add the closing paren
    return `label={t("${key}")}`;
  });

  // Fix any label={t("key") without the closing }
  content = content.replace(/label={t\("([^"]+)"\s*$/gm, 'label={t("$1")}');

  // Fix specific pattern: label={t("createBooking.field.describeEngagement") with missing )
  content = content.replace(
    /label={t\("createBooking\.field\.describeEngagement"\)?/g,
    'label={t("createBooking.field.describeEngagement")}',
  );

  // Fix any label={t('key') with missing )
  content = content.replace(/label={t\('([^']+)'\)?/g, "label={t('$1')}");

  // Fix label="DESCRIBE ENGAGEMENT" → label={t("createBooking.field.describeEngagement")}
  content = content.replace(
    /label="DESCRIBE ENGAGEMENT"/g,
    'label={t("createBooking.field.describeEngagement")}',
  );

  // Fix label="DESCRIBE DURATION" → label={t("createBooking.field.describeDuration")}
  content = content.replace(
    /label="DESCRIBE DURATION"/g,
    'label={t("createBooking.field.describeDuration")}',
  );

  // Fix label="SERVICE CATEGORY" → label={t("createBooking.field.serviceCategory")}
  content = content.replace(
    /label="SERVICE CATEGORY"/g,
    'label={t("createBooking.field.serviceCategory")}',
  );

  // Fix label="JOB TITLE *" → label={t("createBooking.field.jobTitle")}
  content = content.replace(
    /label="JOB TITLE \*"/g,
    'label={t("createBooking.field.jobTitle")}',
  );

  // Fix label="DESCRIPTION *" → label={t("createBooking.field.description")}
  content = content.replace(
    /label="DESCRIPTION \*"/g,
    'label={t("createBooking.field.description")}',
  );

  // Fix label="ADDITIONAL NOTES" → label={t("createBooking.field.additionalNotes")}
  content = content.replace(
    /label="ADDITIONAL NOTES"/g,
    'label={t("createBooking.field.additionalNotes")}',
  );

  // Fix label="DATE & TIME *" → label={t("createBooking.field.dateTime")}
  content = content.replace(
    /label="DATE & TIME \*"/g,
    'label={t("createBooking.field.dateTime")}',
  );

  // Fix label="AGREED RATE" → label={t("createBooking.field.agreedRate")}
  content = content.replace(
    /label="AGREED RATE"/g,
    'label={t("createBooking.field.agreedRate")}',
  );

  // Fix label="CURRENCY" → label={t("createBooking.field.currency")}
  content = content.replace(
    /label="CURRENCY"/g,
    'label={t("createBooking.field.currency")}',
  );

  // Fix label={`NUMBER OF ${...}`} → label={t("createBooking.field.numberOfUnits", { unit: ... })}
  content = content.replace(
    /label={`NUMBER OF \$\{([^}]+)\}`}/g,
    (match, unit) => {
      return `label={t("createBooking.field.numberOfUnits", { unit: ${unit} })}`;
    },
  );

  // Fix label={`NUMBER OF ${durationType}`} in duration section
  content = content.replace(
    /label={`NUMBER OF \$\{durationType\}`}/g,
    'label={t("createBooking.field.numberOfDuration", { duration: durationType })}',
  );

  // Fix legend props
  content = content.replace(
    /legend="DESCRIBE DURATION"/g,
    'legend={t("createBooking.field.describeDuration")}',
  );

  content = content.replace(
    /legend="DESCRIBE ENGAGEMENT"/g,
    'legend={t("createBooking.field.describeEngagement")}',
  );

  // Fix any remaining label=t( pattern
  content = content.replace(/label=t\(/g, "label={t(");

  // Fix any remaining legend=t( pattern
  content = content.replace(/legend=t\(/g, "legend={t(");

  // Fix any label with missing closing )
  content = content.replace(/label={t\("([^"]+)"\)?/g, 'label={t("$1")}');

  // ── 3. Save the fixed file ─────────────────────────────────
  const backupPath = SCREEN_PATH + ".backup3";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(SCREEN_PATH, content);
  console.log(`\n✅  Updated ${SCREEN_PATH}`);

  // ── 4. Validate the file ───────────────────────────────────
  console.log("\n🔍  Validating fixes...");

  // Check for common patterns
  const issues = [];

  // Check for label={t("...") without closing }
  const labelMatches = content.match(/label={t\("([^"]+)"\)?/g);
  if (labelMatches) {
    for (const match of labelMatches) {
      if (!match.endsWith(")}")) {
        issues.push(`Invalid label: ${match}`);
      }
    }
  }

  // Check for label=t( without {
  const badLabelMatches = content.match(/label=t\(/g);
  if (badLabelMatches) {
    issues.push(
      `Found ${badLabelMatches.length} instances of label=t( without {`,
    );
  }

  // Check for legend=t( without {
  const badLegendMatches = content.match(/legend=t\(/g);
  if (badLegendMatches) {
    issues.push(
      `Found ${badLegendMatches.length} instances of legend=t( without {`,
    );
  }

  // ── 5. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  if (issues.length === 0) {
    console.log("\n  ✅ All JSX syntax errors fixed!");
  } else {
    console.log("\n  ⚠️  Found remaining issues:");
    for (const issue of issues) {
      console.log(`     ${issue}`);
    }
  }

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
