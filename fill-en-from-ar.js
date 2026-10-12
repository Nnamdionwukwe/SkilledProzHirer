// fill-en-from-ar.js
// Translates Arabic values to English for all placeholder keys in en.json.
// Uses Google Translate (no API key, but rate-limited).

const fs = require("fs");
const path = require("path");
const translate = require("translate");

const LOCALE_DIR = "./src/i18n/locales";
const EN_PATH = path.join(LOCALE_DIR, "en.json");
const AR_PATH = path.join(LOCALE_DIR, "ar.json");

const DELAY_MS = 500; // avoid rate limits

async function main() {
  console.log("📖 Loading Arabic and English files...");
  const enData = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
  const arData = JSON.parse(fs.readFileSync(AR_PATH, "utf8"));

  // Get all keys that are placeholders (value === key)
  const placeholderKeys = Object.keys(enData).filter(
    (key) => enData[key] === key,
  );

  console.log(
    `🔍 Found ${placeholderKeys.length} placeholder keys in en.json.`,
  );

  let translatedCount = 0;
  for (const key of placeholderKeys) {
    const arValue = arData[key];
    if (!arValue || typeof arValue !== "string") {
      console.log(`⚠️  No Arabic value for key: ${key}, skipping.`);
      continue;
    }
    try {
      // Translate Arabic to English
      const enTranslation = await translate(arValue, { from: "ar", to: "en" });
      enData[key] = enTranslation;
      translatedCount++;
      process.stdout.write(`.`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    } catch (err) {
      console.error(`\n❌ Failed to translate key "${key}":`, err.message);
    }
  }

  // Sort and write back
  const sorted = {};
  Object.keys(enData)
    .sort()
    .forEach((k) => {
      sorted[k] = enData[k];
    });
  fs.writeFileSync(EN_PATH, JSON.stringify(sorted, null, 2), "utf8");

  console.log(
    `\n✅ Updated en.json – ${translatedCount} placeholders translated from Arabic.`,
  );
  console.log("💡 Review and polish the English text manually.");
}

main().catch(console.error);
