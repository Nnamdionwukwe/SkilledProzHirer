// ─── ADD THESE KEYS to every locale file under src/i18n/locales/ ───────────
// Add the "workerReg" namespace to each JSON file.
// English (en.json) — full translations below.
// All other locales — copy the English values as fallback until translated.

// ════════════════════════════════════════════════════════
// ADD THIS BLOCK inside each locale JSON at the top level
// ════════════════════════════════════════════════════════

// "workerReg": {
//   "workerAccount": "Worker Account",
//   "startEarning": "Start earning on your terms",
//   "startEarningSubtitle": "Set up your profile and start getting hired",
//   "createAccount": "Create your account",
//   "min8": "min 8 chars",
//   "yourProfile": "Your professional profile",
//   "professionalTitle": "Professional Title",
//   "professionalTitlePlaceholder": "e.g. Certified Electrician",
//   "description": "Description",
//   "descriptionPlaceholder": "Describe your skills, experience, specializations...",
//   "yearsExperience": "Years of Experience",
//   "serviceRadius": "Service Radius (km)",
//   "yourCategories": "Your service categories",
//   "categoriesHint": "Select up to 5 categories. Star one to mark it as primary.",
//   "searchCategories": "Search categories...",
//   "addCustomCategory": "Add a custom category",
//   "addCategoryLabel": "Custom Category Name",
//   "customCategoryPlaceholder": "e.g. Solar Panel Installation",
//   "addCategory": "Add Category",
//   "maxCategories": "You can select up to 5 categories",
//   "addCategoryFailed": "Failed to add custom category",
//   "setYourRates": "Set your rates",
//   "ratesNote": "Leave blank to hide that option from your profile. Set at least one rate.",
//   "currency": "Currency",
//   "hourlyRate": "Hourly Rate",
//   "dailyRate": "Daily Rate",
//   "weeklyRate": "Weekly Rate",
//   "monthlyRate": "Monthly Rate",
//   "customRate": "Custom Rate",
//   "customRateAmount": "Custom Rate Amount",
//   "customRateLabel": "Custom Label",
//   "customRateLabelPlaceholder": "e.g. per project",
//   "pricingNote": "Pricing Note (optional)",
//   "pricingNotePlaceholder": "Discounts, terms, travel fees...",
//   "ratesPreview": "Your rates preview",
//   "continue": "Continue",
//   "hiringSomeone": "Hiring someone?",
//   "registerAsHirer": "Register as Hirer",
//   "titleRequired": "Professional title is required",
//   "descriptionRequired": "Description is required",
//   "categoriesRequired": "Select at least one category",
//   "rateRequired": "Set at least one rate (hourly, daily, weekly, monthly, or custom)"
// }

// ════════════════════════════════════════════════════════
// QUICK PATCH SCRIPT — run once to add keys to all locales
// Save as scripts/patch-worker-reg-locales.js and run:
//   node scripts/patch-worker-reg-locales.js
// ════════════════════════════════════════════════════════

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LOCALES_DIR = `${ROOT}/src/i18n/locales`;

const LOCALES = ["en", "es", "fr", "pt", "zh", "ha", "yo", "ig", "ar"];

const WORKER_REG = {
  workerAccount: "Worker Account",
  startEarning: "Start earning on your terms",
  startEarningSubtitle: "Set up your profile and start getting hired",
  createAccount: "Create your account",
  min8: "min 8 chars",
  yourProfile: "Your professional profile",
  professionalTitle: "Professional Title",
  professionalTitlePlaceholder: "e.g. Certified Electrician",
  description: "Description",
  descriptionPlaceholder:
    "Describe your skills, experience, specializations...",
  yearsExperience: "Years of Experience",
  serviceRadius: "Service Radius (km)",
  yourCategories: "Your service categories",
  categoriesHint: "Select up to 5 categories. Star one to mark it as primary.",
  searchCategories: "Search categories...",
  addCustomCategory: "Add a custom category",
  addCategoryLabel: "Custom Category Name",
  customCategoryPlaceholder: "e.g. Solar Panel Installation",
  addCategory: "Add Category",
  maxCategories: "You can select up to 5 categories",
  addCategoryFailed: "Failed to add custom category",
  setYourRates: "Set your rates",
  ratesNote:
    "Leave blank to hide that option from your profile. Set at least one rate.",
  currency: "Currency",
  hourlyRate: "Hourly Rate",
  dailyRate: "Daily Rate",
  weeklyRate: "Weekly Rate",
  monthlyRate: "Monthly Rate",
  customRate: "Custom Rate",
  customRateAmount: "Custom Rate Amount",
  customRateLabel: "Custom Label",
  customRateLabelPlaceholder: "e.g. per project",
  pricingNote: "Pricing Note (optional)",
  pricingNotePlaceholder: "Discounts, terms, travel fees...",
  ratesPreview: "Your rates preview",
  continue: "Continue",
  hiringSomeone: "Hiring someone?",
  registerAsHirer: "Register as Hirer",
  titleRequired: "Professional title is required",
  descriptionRequired: "Description is required",
  categoriesRequired: "Select at least one category",
  rateRequired:
    "Set at least one rate (hourly, daily, weekly, monthly, or custom)",
};

let patched = 0;
let skipped = 0;

for (const locale of LOCALES) {
  const path = `${LOCALES_DIR}/${locale}.json`;
  try {
    const json = JSON.parse(readFileSync(path, "utf8"));
    if (json.workerReg) {
      // Merge missing keys only
      const missing = Object.keys(WORKER_REG).filter(
        (k) => !(k in json.workerReg),
      );
      if (missing.length === 0) {
        skipped++;
        continue;
      }
      missing.forEach((k) => {
        json.workerReg[k] = WORKER_REG[k];
      });
    } else {
      json.workerReg = { ...WORKER_REG };
    }
    writeFileSync(path, JSON.stringify(json, null, 2) + "\n", "utf8");
    console.log(`✅  ${locale}.json — patched`);
    patched++;
  } catch (err) {
    console.error(`❌  ${locale}.json — ${err.message}`);
  }
}

console.log(
  `\nDone. Patched: ${patched}  Skipped (already complete): ${skipped}`,
);
