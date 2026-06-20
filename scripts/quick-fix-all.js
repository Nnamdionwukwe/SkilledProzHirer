#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("\n🔄  Quick Fix All Issues\n");
console.log("═".repeat(65));

// 1. Extract keys
console.log("\n📝  Step 1: Extracting translation keys...");
try {
  execSync("node scripts/extract-keys.js", { stdio: "inherit" });
} catch (e) {
  console.log("⚠️  Extract keys failed, continuing...");
}

// 2. Fix translations
console.log("\n📝  Step 2: Fixing missing translations...");
try {
  execSync("node scripts/fix-translations.js", { stdio: "inherit" });
} catch (e) {
  console.log("⚠️  Fix translations failed, continuing...");
}

console.log("\n✅  Quick fix complete!");
console.log("\n📋  Next steps:");
console.log("  1. Review translation files in src/i18n/locales/");
console.log("  2. Run node scripts/full-audit.js to verify fixes");
console.log("  3. Fix hook violations in components manually");
console.log("\n" + "═".repeat(65) + "\n");
