#!/usr/bin/env node
// restore-backups.js
// Restores every file the fix-t-violations script corrupted.
// Run this first — it fixes the Babel/Metro compile error.
//
// node scripts/restore-backups.js

import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");

function walk(dir, found = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, found);
    else if (e.name.endsWith(".hook.bak")) found.push(full);
  }
  return found;
}

const backups = walk(ROOT);

if (backups.length === 0) {
  console.log("ℹ️  No .hook.bak files found.");
  process.exit(0);
}

for (const bak of backups) {
  const original = bak.replace(/\.hook\.bak$/, "");
  fs.copyFileSync(bak, original);
  fs.unlinkSync(bak);
  console.log(`✅  Restored: ${path.relative(ROOT, original)}`);
}

console.log(`\n✅  ${backups.length} file(s) restored from backup.`);
console.log("    Run: npx expo start   ← should compile cleanly now.\n");
