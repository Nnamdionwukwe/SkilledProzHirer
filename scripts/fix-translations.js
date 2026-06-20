#!/usr/bin/env node

/**
 * Fix Missing Translations
 *
 * This script finds all missing translation keys and adds them to all locale files.
 * It preserves existing translations and only adds missing keys with placeholder text.
 *
 * Run: node scripts/fix-translations.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const CONFIG = {
  localesDir: path.join(rootDir, "src", "i18n", "locales"),
  srcDir: path.join(rootDir, "src"),
  supportedLocales: ["en", "fr", "ar", "yo", "ha", "ig", "sw", "pt", "es"],
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

function extractTranslationKeys(content) {
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

function getAllTranslationKeysFromCode() {
  const allKeys = new Set();
  const files = getAllFiles(CONFIG.srcDir);

  console.log(`📁  Scanning ${files.length} files for translation keys...`);

  files.forEach((file) => {
    try {
      const content = fs.readFileSync(file, "utf8");
      const keys = extractTranslationKeys(content);
      keys.forEach((key) => allKeys.add(key));
    } catch (e) {
      // Skip files that can't be read
    }
  });

  return allKeys;
}

function loadLocaleFile(locale) {
  const filePath = path.join(CONFIG.localesDir, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      console.warn(`⚠️  Could not parse ${locale}.json, creating new file`);
      return {};
    }
  }
  return {};
}

function getNestedKeys(obj, prefix = "") {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      keys.push(...getNestedKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function setNestedValue(obj, key, value) {
  const parts = key.split(".");
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!current[part] || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }

  current[parts[parts.length - 1]] = value;
}

function getNestedValue(obj, key) {
  const parts = key.split(".");
  let current = obj;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function generateTranslationValue(key, locale) {
  // For the base language (en), use the key as the value
  if (locale === "en") {
    // Convert key to a readable string
    return key
      .split(".")
      .pop()
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // For other languages, use the English value with a note
  return `[TODO: Translate to ${locale}] ${key}`;
}

function addMissingKeys(localeData, allKeys, locale) {
  const existingKeys = new Set(getNestedKeys(localeData));
  const missingKeys = Array.from(allKeys).filter(
    (key) => !existingKeys.has(key),
  );

  if (missingKeys.length === 0) {
    return { localeData, added: 0 };
  }

  // Sort keys alphabetically
  missingKeys.sort();

  // Add each missing key
  missingKeys.forEach((key) => {
    const value = generateTranslationValue(key, locale);
    setNestedValue(localeData, key, value);
  });

  return { localeData, added: missingKeys.length, keys: missingKeys };
}

function main() {
  console.log("\n🔄  SkilledProz Hirer App — Translation Fixer\n");
  console.log("═".repeat(65));

  // ── 1. Get all translation keys from code ────────────────
  const allKeys = getAllTranslationKeysFromCode();
  console.log(`\n📝  Found ${allKeys.size} translation keys in code`);

  // ── 2. Process each locale ────────────────────────────────
  const results = {};
  let totalAdded = 0;

  CONFIG.supportedLocales.forEach((locale) => {
    console.log(`\n📄  Processing ${locale}.json...`);

    const localeData = loadLocaleFile(locale);
    const {
      localeData: updatedData,
      added,
      keys,
    } = addMissingKeys(localeData, allKeys, locale);

    if (added > 0) {
      // Sort the object keys for better readability
      const sortedData = sortObjectKeys(updatedData);

      // Write back to file
      const filePath = path.join(CONFIG.localesDir, `${locale}.json`);
      fs.writeFileSync(filePath, JSON.stringify(sortedData, null, 2));

      results[locale] = { added, keys };
      totalAdded += added;
      console.log(`  ✅ Added ${added} missing keys to ${locale}.json`);
    } else {
      results[locale] = { added: 0, keys: [] };
      console.log(`  ✅ No missing keys found for ${locale}.json`);
    }
  });

  // ── 3. Summary ─────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log(`\n  Total missing keys added: ${totalAdded}`);

  if (totalAdded > 0) {
    console.log("\n  Added keys by locale:");
    CONFIG.supportedLocales.forEach((locale) => {
      if (results[locale].added > 0) {
        console.log(`    ${locale}: ${results[locale].added} keys`);
      }
    });

    console.log(
      "\n  ⚠️  Placeholder text added. You should review and translate:",
    );
    CONFIG.supportedLocales.forEach((locale) => {
      if (results[locale].added > 0 && locale !== "en") {
        console.log(`    📄  src/i18n/locales/${locale}.json`);
      }
    });
  } else {
    console.log("\n  🎉  All translation keys are complete!");
  }

  console.log("\n" + "═".repeat(65) + "\n");
}

function sortObjectKeys(obj) {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sortObjectKeys(item));
  }

  const sorted = {};
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
  return sorted;
}

// ── Run ─────────────────────────────────────────────────────
try {
  main();
} catch (error) {
  console.error("❌  Failed to fix translations:", error.message);
  process.exit(1);
}
