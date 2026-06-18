#!/usr/bin/env node
// find-syntax-errors.js
// Scans every JS/JSX file and reports ones with syntax errors.
// Tells you exactly which file Babel is choking on.
//
// node scripts/find-syntax-errors.js

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");
const SKIP = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "build",
  "scripts",
]);

function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) files.push(full);
  }
  return files;
}

const files = walk(path.join(ROOT, "src"));
const broken = [];
const bakFiles = walk(ROOT).filter((f) => f.endsWith(".bak"));

console.log(`\n🔍  Checking ${files.length} source files for syntax errors…\n`);

// Use node --check which parses without executing
for (const file of files) {
  try {
    execSync(`node --input-type=module --check < "${file}" 2>&1`, {
      stdio: "pipe",
      timeout: 5000,
    });
  } catch (err) {
    const msg = err.stdout?.toString() || err.stderr?.toString() || "";
    // Filter out React JSX errors (node can't parse JSX — those aren't our bugs)
    if (msg.includes("SyntaxError") && !msg.includes("Unexpected token '<'")) {
      broken.push({
        file: path.relative(ROOT, file),
        error: msg.split("\n")[0].trim(),
      });
    }
  }
}

if (broken.length === 0) {
  console.log("✅  No JS syntax errors found in src/");
  console.log("    The Babel error may be from a cached bundle — run:\n");
  console.log("    npx expo start --clear\n");
} else {
  console.log(`❌  Found ${broken.length} file(s) with syntax errors:\n`);
  for (const { file, error } of broken) {
    console.log(`  🔴  ${file}`);
    console.log(`       ${error}\n`);
  }
  console.log("─".repeat(60));
  console.log("Fix: restore the backup for each broken file:\n");
  for (const { file } of broken) {
    const hookBak = path.join(ROOT, file + ".hook.bak");
    const i18nBak = path.join(ROOT, file + ".i18n.bak");
    if (fs.existsSync(hookBak)) {
      console.log(
        `  node -e "require('fs').copyFileSync('${file}.hook.bak','${file}')"`,
      );
    } else if (fs.existsSync(i18nBak)) {
      console.log(
        `  node -e "require('fs').copyFileSync('${file}.i18n.bak','${file}')"`,
      );
    } else {
      console.log(
        `  ⚠️  No backup found for ${file} — use git checkout or manually fix`,
      );
    }
  }
}

// Report ALL backup files found
if (bakFiles.length > 0) {
  console.log(`\n📦  Backup files on disk (${bakFiles.length}):`);
  bakFiles.forEach((f) => console.log(`    ${path.relative(ROOT, f)}`));
  console.log("");
  console.log("To restore ALL hook.bak backups at once:");
  console.log("  node scripts/restore-backups.js\n");
} else {
  console.log("\nℹ️  No .bak files found on disk.\n");
}
