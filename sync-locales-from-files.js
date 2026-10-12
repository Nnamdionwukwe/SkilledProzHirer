// sync-locales-from-files.js
// Collects all translation keys from all locale files,
// then ensures every language file contains every key.

const fs = require("fs");
const path = require("path");

const LOCALE_DIR = "./src/i18n/locales";

// All languages you want to support
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

const placeholder = (key, lang) => `[TODO: Translate to ${lang}] ${key}`;

// -------- Read all existing files and collect the union of keys --------
const allData = {};
const allKeysSet = new Set();

LANGUAGES.forEach((lang) => {
  const filePath = path.join(LOCALE_DIR, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
      allData[lang] = content;
      Object.keys(content).forEach((key) => allKeysSet.add(key));
      console.log(
        `📖 Loaded ${lang}.json (${Object.keys(content).length} keys)`,
      );
    } catch (e) {
      console.warn(`⚠️  Could not parse ${lang}.json – starting empty.`);
      allData[lang] = {};
    }
  } else {
    console.log(`🆕 Creating new file for ${lang}.`);
    allData[lang] = {};
  }
});

const allKeys = Array.from(allKeysSet).sort();
console.log(`\n✅ Collected ${allKeys.length} unique keys from all files.\n`);

// -------- For each language, add missing keys and write back --------
LANGUAGES.forEach((lang) => {
  const existing = allData[lang] || {};
  let addedCount = 0;

  allKeys.forEach((key) => {
    if (!existing.hasOwnProperty(key)) {
      existing[key] = placeholder(key, lang);
      addedCount++;
    }
  });

  // Sort alphabetically
  const sorted = {};
  Object.keys(existing)
    .sort()
    .forEach((k) => {
      sorted[k] = existing[k];
    });

  const filePath = path.join(LOCALE_DIR, `${lang}.json`);
  fs.writeFileSync(filePath, JSON.stringify(sorted, null, 2), "utf8");
  console.log(
    `✅ ${lang}.json → ${Object.keys(sorted).length} keys (${addedCount} added)`,
  );
});

console.log(
  "\n🎉 All locale files are now in sync with the union of all keys.",
);
console.log("💡 Replace the placeholders with real translations.");
