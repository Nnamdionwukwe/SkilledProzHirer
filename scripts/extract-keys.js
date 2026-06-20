#!/usr/bin/env node

/**
 * Extract All Translation Keys
 *
 * This script extracts all translation keys from the codebase
 * and saves them to a file for review.
 *
 * Run: node scripts/extract-keys.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const CONFIG = {
  srcDir: path.join(rootDir, "src"),
  outputFile: path.join(rootDir, "translation-keys.json"),
  excludedDirs: ["node_modules", ".expo", ".git", "__pycache__"],
};

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!CONFIG.excludedDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if ([".js", ".jsx", ".ts", ".tsx"].includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function extractTranslationKeys(content, filePath) {
  const keys = new Set();
  const patterns = [
    /t\(['"`]([^'"`]+)['"`]\)/g,
    /t\(['"`]([^'"`]+)['"`],\s*\{/g,
    /t\(`([^`]+)`\)/g,
    /useTranslation\(['"`]([^'"`]+)['"`]\)/g,
    /i18n\.t\(['"`]([^'"`]+)['"`]\)/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (
        key &&
        !key.includes(" ") &&
        !key.includes("{") &&
        !key.includes("}")
      ) {
        keys.add(key);
      }
    }
  });

  return keys;
}

function main() {
  console.log("\n🔑  Extracting translation keys...\n");

  const files = getAllFiles(CONFIG.srcDir);
  console.log(`📁  Scanning ${files.length} files...`);

  const allKeys = new Set();
  const keySources = {};

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf8");
      const keys = extractTranslationKeys(content, file);
      const relativePath = path.relative(rootDir, file);

      keys.forEach((key) => {
        allKeys.add(key);
        if (!keySources[key]) {
          keySources[key] = [];
        }
        keySources[key].push(relativePath);
      });
    } catch (e) {
      // Skip files that can't be read
    }
  });

  // Sort keys alphabetically
  const sortedKeys = Array.from(allKeys).sort();

  // Create output data
  const output = {
    generated: new Date().toISOString(),
    totalKeys: sortedKeys.length,
    keys: sortedKeys,
    sources: keySources,
  };

  // Save to file
  fs.writeFileSync(CONFIG.outputFile, JSON.stringify(output, null, 2));

  console.log(`\n✅  Found ${sortedKeys.length} unique translation keys`);
  console.log(`📄  Saved to: ${CONFIG.outputFile}`);

  // Show sample
  console.log("\n📝  Sample keys:");
  sortedKeys.slice(0, 20).forEach((key, i) => {
    console.log(`  ${String(i + 1).padStart(3)}. ${key}`);
  });

  if (sortedKeys.length > 20) {
    console.log(`  ... and ${sortedKeys.length - 20} more`);
  }

  console.log("\n");
}

try {
  main();
} catch (error) {
  console.error("❌  Failed to extract keys:", error.message);
  process.exit(1);
}
