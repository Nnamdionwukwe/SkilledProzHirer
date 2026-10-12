// extract-keys-from-code.js
// Scans all source files for translation keys and generates a complete report.

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

const SRC_DIR = "./src";
const LOCALE_DIR = "./src/i18n/locales";
const REPORT_FILE = "./translation-keys-report.json";

// All languages you want to keep in sync
const LANGUAGES = [
  "en",
  "es",
  "fr",
  "ar",
  "pt",
  "zh",
  "ha",
  "yo",
  "ig",
  "de",
  "it",
  "hi",
];

// Regex to find t("...") or t('...') or i18n.t("...")
// Matches: t("key"), t('key'), i18n.t("key"), useTranslation().t("key")
const KEY_REGEX = /(?:i18n\.)?t\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

async function walk(dir, fileList = []) {
  const files = await readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      await walk(filePath, fileList);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

async function extractKeys() {
  console.log("🔍 Scanning source files for translation keys...");
  const files = await walk(SRC_DIR);
  const allKeys = new Set();

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    let match;
    while ((match = KEY_REGEX.exec(content)) !== null) {
      allKeys.add(match[1]);
    }
  }

  const keysArray = Array.from(allKeys).sort();
  console.log(`✅ Found ${keysArray.length} unique translation keys.`);

  // Save report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(keysArray, null, 2), "utf8");
  console.log(`📄 Report saved to ${REPORT_FILE}`);

  // Optionally, merge these keys into all locale files
  console.log("\n🔄 Merging keys into locale files...");
  LANGUAGES.forEach((lang) => {
    const filePath = path.join(LOCALE_DIR, `${lang}.json`);
    let existing = {};
    if (fs.existsSync(filePath)) {
      try {
        existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        existing = {};
      }
    }

    let added = 0;
    keysArray.forEach((key) => {
      if (!existing.hasOwnProperty(key)) {
        existing[key] = `[TODO: Translate to ${lang}] ${key}`;
        added++;
      }
    });

    const sorted = {};
    Object.keys(existing)
      .sort()
      .forEach((k) => {
        sorted[k] = existing[k];
      });
    fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), "utf8");
    console.log(
      `✅ ${lang}.json → ${Object.keys(sorted).length} keys (${added} added)`,
    );
  });

  console.log("\n🎉 All locale files are now fully synced with the codebase.");
}

extractKeys().catch(console.error);
