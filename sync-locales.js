// sync-locales.js
// Extracts ALL translation keys from the audit file, regardless of structure,
// and ensures every locale file contains every key.

const fs = require("fs");
const path = require("path");

// -------- CONFIGURATION --------
const LOCALE_DIR = "./src/i18n/locales";
const AUDIT_FILE = "./full-audit-report.json";

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

const makePlaceholder = (key, lang) => `[TODO: Translate to ${lang}] ${key}`;

// -------- EXTRACT ALL KEYS FROM AUDIT (FLEXIBLE) --------
function extractAllKeys(audit) {
  // If it's an array, use it directly
  if (Array.isArray(audit)) return audit;

  // If it has a details.en.missingKeys, use that
  if (audit.details?.en?.missingKeys) {
    return audit.details.en.missingKeys;
  }

  // If it's a plain object (keys are the translation keys), return Object.keys
  if (typeof audit === "object" && audit !== null) {
    // Check if it looks like a key-value store (no nested "details")
    const sampleKey = Object.keys(audit)[0];
    if (sampleKey && typeof audit[sampleKey] === "string") {
      return Object.keys(audit);
    }
  }

  // Fallback: traverse and collect all string keys recursively (deep)
  const keys = [];
  function traverse(obj, prefix = "") {
    if (Array.isArray(obj)) {
      // Not expected, but skip arrays
      return;
    }
    if (obj && typeof obj === "object") {
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (typeof v === "string") {
          keys.push(fullKey);
        } else if (typeof v === "object" && v !== null) {
          traverse(v, fullKey);
        }
      }
    }
  }
  traverse(audit);
  return keys;
}

// -------- MAIN --------
let allKeys = [];
try {
  const raw = fs.readFileSync(AUDIT_FILE, "utf8");
  const audit = JSON.parse(raw);
  allKeys = extractAllKeys(audit);
  console.log(`✅ Extracted ${allKeys.length} keys from audit.`);
} catch (err) {
  console.error("❌ Failed to read or parse audit file:", err.message);
  process.exit(1);
}

if (allKeys.length === 0) {
  console.error("❌ No keys found in audit. Check the file format.");
  process.exit(1);
}

// -------- PROCESS EACH LANGUAGE --------
LANGUAGES.forEach((lang) => {
  const filePath = path.join(LOCALE_DIR, `${lang}.json`);
  let existing = {};

  if (fs.existsSync(filePath)) {
    try {
      existing = JSON.parse(fs.readFileSync(filePath, "utf8"));
      console.log(
        `📖 Loaded ${lang}.json (${Object.keys(existing).length} keys)`,
      );
    } catch (e) {
      console.warn(`⚠️  Could not parse ${lang}.json – starting fresh.`);
      existing = {};
    }
  } else {
    console.log(`🆕 Creating new file for ${lang}.`);
  }

  let addedCount = 0;
  allKeys.forEach((key) => {
    if (!existing.hasOwnProperty(key)) {
      existing[key] = makePlaceholder(key, lang);
      addedCount++;
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
    `✅ ${lang}.json updated → ${Object.keys(sorted).length} keys (${addedCount} added)`,
  );
});

console.log("\n🎉 All locale files are now complete.");
console.log("💡 Replace placeholders with real translations as needed.");
