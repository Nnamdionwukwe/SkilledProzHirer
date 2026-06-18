#!/usr/bin/env node
// restore-i18n-backups.js
// Restores every *.i18n.bak file created by wrap-i18n.js --write
// node scripts/restore-i18n-backups.js

import fs from "fs";
import path from "path";

const ROOT = path.resolve(".");

function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else files.push(full); // ← no extension filter — find ALL files
  }
  return files;
}

const all = walk(ROOT);
const i18nBak = all.filter((f) => f.endsWith(".i18n.bak"));
const hookBak = all.filter((f) => f.endsWith(".hook.bak"));

console.log(`\n📦  Found ${i18nBak.length} .i18n.bak files`);
console.log(`📦  Found ${hookBak.length} .hook.bak files\n`);

let restored = 0;

for (const bak of [...i18nBak, ...hookBak]) {
  const original = bak.replace(/\.(i18n|hook)\.bak$/, "");
  fs.copyFileSync(bak, original);
  fs.unlinkSync(bak);
  console.log(`✅  Restored: ${path.relative(ROOT, original)}`);
  restored++;
}

if (restored === 0) {
  console.log("ℹ️  No backup files found.");
} else {
  console.log(`\n✅  ${restored} file(s) restored.`);
  console.log("\nNext: npx expo start --clear\n");
}
