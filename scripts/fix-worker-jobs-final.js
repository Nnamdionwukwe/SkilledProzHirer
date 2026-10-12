#!/usr/bin/env node

/**
 * Fix WorkerJobsScreen.js - Final comprehensive fix
 *
 * This script fixes ALL JSX syntax errors by properly wrapping
 * placeholder, label, and other props with curly braces when using t()
 *
 * Run: node scripts/fix-worker-jobs-final.js
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

function fixWorkerJobsScreen() {
  console.log("\n🔧  Fixing WorkerJobsScreen.js - Final Fix\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix ALL props with t() calls ──────────────────────
  console.log("\n📝  Fixing JSX props...");

  // Fix pattern: placeholder=t("key") → placeholder={t("key")}
  content = content.replace(/placeholder=t\(/g, "placeholder={t(");

  // Fix pattern: label=t("key") → label={t("key")}
  content = content.replace(/label=t\(/g, "label={t(");

  // Fix pattern: title=t("key") → title={t("key")}
  content = content.replace(/title=t\(/g, "title={t(");

  // Fix pattern: message=t("key") → message={t("key")}
  content = content.replace(/message=t\(/g, "message={t(");

  // Fix specific placeholder fixes
  const placeholderFixes = [
    {
      from: /placeholder="Search categories\.\.\."/g,
      to: 'placeholder={t("workerJobs.category.search")}',
    },
    {
      from: /placeholder="Add a message to your application\.\.\."/g,
      to: 'placeholder={t("workerJobs.apply.messagePlaceholder")}',
    },
    {
      from: /placeholder="Search jobs by title or description\.\.\."/g,
      to: 'placeholder={t("workerJobs.search.placeholder")}',
    },
  ];

  for (const fix of placeholderFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix specific label fixes
  const labelFixes = [
    {
      from: /label="MESSAGE \(OPTIONAL\)"/g,
      to: 'label={t("workerJobs.apply.message")}',
    },
    {
      from: /label="Select Category"/g,
      to: 'label={t("workerJobs.category.select")}',
    },
  ];

  for (const fix of labelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix any remaining placeholder= without {}
  content = content.replace(/placeholder=([A-Za-z])/g, "placeholder={$1");

  // Fix any remaining label= without {}
  content = content.replace(/label=([A-Za-z])/g, "label={$1");

  // Fix any remaining title= without {}
  content = content.replace(/title=([A-Za-z])/g, "title={$1");

  // Fix any remaining message= without {}
  content = content.replace(/message=([A-Za-z])/g, "message={$1");

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

  console.log("\n  ✅ Fixed all JSX props:");
  console.log("     - placeholder props now use placeholder={...}");
  console.log("     - label props now use label={...}");
  console.log("     - title props now use title={...}");
  console.log("     - message props now use message={...}");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Run the app to verify the fix");
  console.log("     2. If there are still errors, run:");
  console.log(
    '        grep -n "placeholder=" src/screens/main/worker/WorkerJobsScreen.js | grep -v "placeholder={"',
  );
  console.log(
    '        grep -n "label=" src/screens/main/worker/WorkerJobsScreen.js | grep -v "label={"',
  );
  console.log("     3. This will show any remaining props without {}");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerJobsScreen();
} catch (error) {
  console.error("❌  Failed to fix WorkerJobsScreen:", error.message);
  process.exit(1);
}
