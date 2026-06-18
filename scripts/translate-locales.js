#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// translate-locales.js — Auto-translate en.json to all 8 other locales
// Uses the same Google Translate that the app's TranslateButton uses
// (free, no API key, same engine as the web)
//
// INSTALL:  npm install @vitalets/google-translate-api
// RUN:      node scripts/translate-locales.js
//           node scripts/translate-locales.js --locale fr          (one locale)
//           node scripts/translate-locales.js --locale fr,ar,yo    (a few)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";

// ── Config ────────────────────────────────────────────────────────────────────
const LOCALES_DIR = path.resolve("locales");
const EN_FILE = path.join(LOCALES_DIR, "en.json");

// The 8 target locales — same codes the app uses
const ALL_TARGETS = [
  { code: "fr", name: "French" },
  { code: "ar", name: "Arabic" },
  { code: "yo", name: "Yoruba" },
  { code: "ha", name: "Hausa" },
  { code: "ig", name: "Igbo" },
  { code: "sw", name: "Swahili" },
  { code: "pt", name: "Portuguese" },
  { code: "es", name: "Spanish" },
];

// ── CLI: --locale flag ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const localeIdx = args.indexOf("--locale");
const onlyArg = localeIdx >= 0 ? args[localeIdx + 1] : null;
const TARGETS = onlyArg
  ? ALL_TARGETS.filter((l) => onlyArg.split(",").includes(l.code))
  : ALL_TARGETS;

// ── Strings to NOT translate (placeholders, brand names, etc.) ────────────────
const SKIP_TRANSLATE = (val) =>
  !val ||
  typeof val !== "string" ||
  val.trim() === "" ||
  /^{{.*}}$/.test(val.trim()) || // pure template variable: {{name}}
  /^[A-Z_]+$/.test(val.trim()) || // ALL_CAPS constant
  /^https?:\/\//.test(val) || // URL
  /^[+\d\s()-]+$/.test(val); // phone number pattern

// ── Rate limit helper — Google blocks rapid-fire requests ────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Dynamically import the ESM-only google translate package ─────────────────
let translate;
async function getTranslate() {
  if (translate) return translate;
  try {
    const mod = await import("@vitalets/google-translate-api");
    translate = mod.translate;
    return translate;
  } catch {
    console.error(`
❌  Missing dependency.
    Run: npm install @vitalets/google-translate-api
`);
    process.exit(1);
  }
}

// ── Translate a single string ─────────────────────────────────────────────────
async function translateString(text, targetLang, retries = 3) {
  if (SKIP_TRANSLATE(text)) return text;

  const fn = await getTranslate();
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn(text, { to: targetLang });
      return result.text;
    } catch (err) {
      if (attempt === retries) {
        console.warn(
          `    ⚠️  Failed to translate "${text.slice(0, 40)}" → ${targetLang}: ${err.message}`,
        );
        return text; // fall back to English on failure
      }
      await sleep(1000 * attempt); // back-off: 1s, 2s, 3s
    }
  }
}

// ── Recursively translate all string values in an object ──────────────────────
async function translateObject(
  obj,
  targetLang,
  path = "",
  stats = { done: 0, skipped: 0 },
) {
  const result = {};

  for (const [key, val] of Object.entries(obj)) {
    const fullPath = path ? `${path}.${key}` : key;

    if (typeof val === "object" && val !== null) {
      result[key] = await translateObject(val, targetLang, fullPath, stats);
    } else if (typeof val === "string") {
      if (SKIP_TRANSLATE(val)) {
        result[key] = val;
        stats.skipped++;
      } else {
        result[key] = await translateString(val, targetLang);
        stats.done++;
        // Brief pause every 5 strings to avoid rate limiting
        if (stats.done % 5 === 0) await sleep(300);
      }
    } else {
      result[key] = val;
    }
  }

  return result;
}

// ── Count all translatable strings in an object ───────────────────────────────
function countStrings(obj) {
  let count = 0;
  for (const val of Object.values(obj)) {
    if (typeof val === "object" && val !== null) count += countStrings(val);
    else if (typeof val === "string" && !SKIP_TRANSLATE(val)) count++;
  }
  return count;
}

// ── Merge: keep existing translations, only fill missing keys ─────────────────
function mergeTranslations(existing, translated) {
  const result = {};
  for (const key of Object.keys(translated)) {
    if (
      typeof translated[key] === "object" &&
      translated[key] !== null &&
      !Array.isArray(translated[key])
    ) {
      result[key] = mergeTranslations(
        (existing && existing[key]) || {},
        translated[key],
      );
    } else {
      // Keep existing non-empty value; use translated for blanks
      const existingVal = existing && existing[key];
      result[key] =
        existingVal && existingVal !== "" ? existingVal : translated[key];
    }
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (!fs.existsSync(EN_FILE)) {
  console.error(`❌  locales/en.json not found at ${EN_FILE}`);
  console.error(
    "    Run scan-i18n.js first, or place your en.json in the locales/ folder.",
  );
  process.exit(1);
}

const enData = JSON.parse(fs.readFileSync(EN_FILE, "utf8"));
const totalKeys = countStrings(enData);

console.log(`\n🌍  Translating en.json → ${TARGETS.length} locale(s)`);
console.log(
  `    ${totalKeys} translatable strings × ${TARGETS.length} locales\n`,
);

for (const locale of TARGETS) {
  const outFile = path.join(LOCALES_DIR, `${locale.code}.json`);
  const existing = fs.existsSync(outFile)
    ? JSON.parse(fs.readFileSync(outFile, "utf8"))
    : {};

  // Count how many are already filled
  let alreadyFilled = 0;
  function countFilled(obj) {
    for (const val of Object.values(obj)) {
      if (typeof val === "object" && val !== null) countFilled(val);
      else if (typeof val === "string" && val !== "") alreadyFilled++;
    }
  }
  countFilled(existing);

  const remaining = totalKeys - alreadyFilled;

  if (remaining === 0) {
    console.log(
      `✅  ${locale.code} (${locale.name}) — already complete, skipping`,
    );
    continue;
  }

  console.log(
    `\n🔄  ${locale.code} (${locale.name}) — ${alreadyFilled}/${totalKeys} done, translating ${remaining} strings…`,
  );

  const stats = { done: 0, skipped: 0 };
  let translated;
  try {
    translated = await translateObject(enData, locale.code, "", stats);
  } catch (err) {
    console.error(`❌  Fatal error translating ${locale.code}:`, err.message);
    continue;
  }

  // Merge: don't overwrite manually-corrected translations
  const merged = mergeTranslations(existing, translated);
  fs.writeFileSync(outFile, JSON.stringify(merged, null, 2), "utf8");

  const filled = totalKeys - stats.skipped;
  const pct = Math.round((filled / totalKeys) * 100);
  console.log(
    `✅  ${locale.code}.json saved  (${filled}/${totalKeys} — ${pct}% translated)`,
  );
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  ALL DONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Review machine translations — especially:
  • Yoruba (yo) — limited Google support
  • Hausa (ha)  — limited Google support
  • Igbo (ig)   — limited Google support
Native speaker review recommended for these.

To re-run a single locale after manual edits:
  node scripts/translate-locales.js --locale yo
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
