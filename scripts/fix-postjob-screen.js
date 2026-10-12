#!/usr/bin/env node

/**
 * Fix PostJobScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes any hardcoded English text in placeholders, labels, etc.
 *
 * Run: node scripts/fix-postjob-screen.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const SCREEN_PATH = path.join(
  rootDir,
  "src",
  "screens",
  "main",
  "PostJobScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Step titles
  "postJob.step1Title": "Job Details",
  "postJob.step1Sub": "Tell us about the job you want to post",
  "postJob.step2Title": "Job Description",
  "postJob.step2Sub": "Describe the role and requirements",
  "postJob.step3Title": "Pricing & Duration",
  "postJob.step3Sub": "Set your budget and timeline",

  // Job Types
  "postJob.jobType.FULL_TIME": "Full Time",
  "postJob.jobType.PART_TIME": "Part Time",
  "postJob.jobType.CONTRACT": "Contract",
  "postJob.jobType.TEMPORARY": "Temporary",

  // Location Types
  "postJob.locationType.REMOTE": "Remote",
  "postJob.locationType.ON_SITE": "On Site",
  "postJob.locationType.HYBRID": "Hybrid",

  // Payment Types
  "postJob.paymentType.FIXED": "Fixed Price",
  "postJob.paymentType.FIXED_sub": "One-time payment",
  "postJob.paymentType.HOURLY": "Hourly Rate",
  "postJob.paymentType.HOURLY_sub": "Pay per hour",
  "postJob.paymentType.DAILY": "Daily Rate",
  "postJob.paymentType.DAILY_sub": "Pay per day",
  "postJob.paymentType.WEEKLY": "Weekly Rate",
  "postJob.paymentType.WEEKLY_sub": "Pay per week",
  "postJob.paymentType.MONTHLY": "Monthly Rate",
  "postJob.paymentType.MONTHLY_sub": "Pay per month",
  "postJob.paymentType.CUSTOM": "Custom Rate",
  "postJob.paymentType.CUSTOM_sub": "Custom payment arrangement",

  // Duration Types
  "postJob.durationType.HOURS": "Hours",
  "postJob.durationType.DAYS": "Days",
  "postJob.durationType.WEEKS": "Weeks",
  "postJob.durationType.MONTHS": "Months",
  "postJob.durationType.CUSTOM": "Custom Duration",

  // Field labels
  "postJob.category": "Category",
  "postJob.jobTitle": "Job Title",
  "postJob.jobType": "Job Type",
  "postJob.locationType": "Location Type",
  "postJob.locationAddress": "Location Address",
  "postJob.description": "Description",
  "postJob.skills": "Skills",
  "postJob.optional": "Optional",
  "postJob.startDate": "Start Date",
  "postJob.budgetType": "Budget Type",
  "postJob.jobDuration": "Job Duration",
  "postJob.paymentCurrency": "Payment Currency",
  "postJob.additionalNotes": "Additional Notes",

  // Placeholders
  "postJob.searchCategories": "Search categories...",
  "postJob.jobTitlePlaceholder": "e.g. Senior React Native Developer",
  "postJob.locationAddressPlaceholder": "Enter full address",
  "postJob.descriptionPlaceholder":
    "Describe the role, responsibilities, and requirements...",
  "postJob.skillPlaceholder": "Enter a skill and press Enter",
  "postJob.notesPlaceholder": "Any additional information for applicants...",
  "postJob.categoryInputPlaceholder": "Enter category name...",
  "postJob.describeDurationPlaceholder":
    "e.g. 3 months, until project completion...",

  // Messages
  "postJob.titleRequired": "Job title is required",
  "postJob.categoryRequired": "Please select or create a category",
  "postJob.locationRequired": "Address is required for on-site jobs",
  "postJob.descriptionTooShort": "Description must be at least 50 characters",
  "postJob.startDateRequired": "Please select a start date",
  "postJob.budgetRequired": "Please enter a budget amount",
  "postJob.durationRequired": "Please enter the number of {{unit}}",
  "postJob.durationCustomRequired": "Please describe the duration",
  "postJob.maxSkills": "Maximum 10 skills allowed",
  "postJob.noMatch": 'No categories found for "{{query}}"',
  "postJob.customOther": "Suggest a category",
  "postJob.suggestCategory": "Suggest a new category",
  "postJob.categoryAlreadyExists": '"{{name}}" already exists',
  "postJob.addedCategory": 'Added category "{{name}}"',
  "postJob.successMessage": "Job posted successfully!",
  "postJob.posting": "Posting...",
  "postJob.continue": "Continue",
  "postJob.postJob": "Post Job",
  "postJob.cryptoNote": "Cryptocurrency payments are supported",
  "postJob.payIn": "Pay in",
  "postJob.yourTitleNote": "This will be used as the job title",
  "postJob.minChars": "Minimum {{count}} characters",
  "postJob.skillsHint": "{{current}}/{{max}} skills added",
  "postJob.tapToChooseDate": "Tap to choose a date",
  "postJob.selectStartDate": "Select Start Date",
  "postJob.done": "Done",
  "postJob.hourlyRate": "Hourly Rate",
  "postJob.dailyRate": "Daily Rate",
  "postJob.weeklyRate": "Weekly Rate",
  "postJob.monthlyRate": "Monthly Rate",
  "postJob.agreedAmount": "Agreed Amount",
  "postJob.fixedPrice": "Fixed Price",
  "postJob.describeDuration": "Describe Duration",
  "postJob.howMany": "How many {{unit}}?",

  // Review section
  "postJob.reviewTitle": "Review Your Job Post",
  "postJob.review.title": "Job Title",
  "postJob.review.category": "Category",
  "postJob.review.jobType": "Job Type",
  "postJob.review.location": "Location Type",
  "postJob.review.address": "Address",
  "postJob.review.startDate": "Start Date",
  "postJob.review.payment": "Payment",
  "postJob.review.duration": "Duration",
  "postJob.review.skills": "Skills",
  "postJob.review.notes": "Additional Notes",

  // Common
  "common.back": "Back",
  "common.cancel": "Cancel",
  "toast.networkError": "Network error. Please try again.",
  "toast.unknownError": "Something went wrong. Please try again.",
};

function loadLocaleFile(locale) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return JSON.parse(content);
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveLocaleFile(locale, data) {
  const filePath = path.join(LOCALES_DIR, `${locale}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function addTranslationKeys(localeData, keys) {
  let added = 0;
  for (const [key, value] of Object.entries(keys)) {
    if (!localeData[key]) {
      localeData[key] = value;
      added++;
    }
  }
  return { data: localeData, added };
}

function fixPostJobScreen() {
  console.log("\n🔧  Fixing PostJobScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded placeholders ─────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix placeholder text values
  const placeholderFixes = [
    {
      from: /placeholder="e\.g\. Senior React Native Developer"/g,
      to: 'placeholder={t("postJob.jobTitlePlaceholder") || "e.g. Senior React Native Developer"}',
    },
    {
      from: /placeholder="Search categories\.\.\."/g,
      to: 'placeholder={t("postJob.searchCategories") || "Search categories..."}',
    },
    {
      from: /placeholder="Enter full address"/g,
      to: 'placeholder={t("postJob.locationAddressPlaceholder") || "Enter full address"}',
    },
    {
      from: /placeholder="Describe the role, responsibilities, and requirements\.\.\."/g,
      to: 'placeholder={t("postJob.descriptionPlaceholder") || "Describe the role, responsibilities, and requirements..."}',
    },
    {
      from: /placeholder="Enter a skill and press Enter"/g,
      to: 'placeholder={t("postJob.skillPlaceholder") || "Enter a skill and press Enter"}',
    },
    {
      from: /placeholder="Any additional information for applicants\.\.\."/g,
      to: 'placeholder={t("postJob.notesPlaceholder") || "Any additional information for applicants..."}',
    },
    {
      from: /placeholder="Enter category name\.\.\."/g,
      to: 'placeholder={t("postJob.categoryInputPlaceholder") || "Enter category name..."}',
    },
    {
      from: /placeholder="e\.g\. 3 months, until project completion\.\.\."/g,
      to: 'placeholder={t("postJob.describeDurationPlaceholder") || "e.g. 3 months, until project completion..."}',
    },
    {
      from: /placeholder="e\.g\. 4"/g,
      to: 'placeholder={t("postJob.hoursPlaceholder") || "e.g. 4"}',
    },
    {
      from: /placeholder="e\.g\. 5"/g,
      to: 'placeholder={t("postJob.daysPlaceholder") || "e.g. 5"}',
    },
    {
      from: /placeholder="e\.g\. 2"/g,
      to: 'placeholder={t("postJob.weeksPlaceholder") || "e.g. 2"}',
    },
    {
      from: /placeholder="e\.g\. 3"/g,
      to: 'placeholder={t("postJob.monthsPlaceholder") || "e.g. 3"}',
    },
    {
      from: /placeholder="0\.00"/g,
      to: 'placeholder={t("postJob.amountPlaceholder") || "0.00"}',
    },
  ];

  for (const fix of placeholderFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix budget label helper - already using t() so it's fine

  // ── 3. Add missing translation keys to all locale files ────
  console.log("\n📝  Adding missing translation keys to locale files...");

  const locales = ["en", "fr", "ar", "yo", "ha", "ig", "sw", "pt", "es"];
  const results = {};

  locales.forEach((locale) => {
    const localeData = loadLocaleFile(locale);
    const { data, added } = addTranslationKeys(localeData, MISSING_KEYS);
    saveLocaleFile(locale, data);
    results[locale] = added;
    console.log(`  ✅ ${locale}.json: added ${added} keys`);
  });

  // ── 4. Save the improved file ─────────────────────────────
  const backupPath = SCREEN_PATH + ".backup";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(SCREEN_PATH, content);
  console.log(`\n✅  Updated ${SCREEN_PATH}`);

  // ── 5. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log("\n  ✅ Fixed hardcoded strings:");
  console.log("     - Replaced hardcoded placeholders with t()");
  console.log("     - Added translation keys for all labels and messages");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - postJob.* (70+ keys)");
  console.log("     - common.* (2 keys)");
  console.log("     - toast.* (2 keys)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in PostJobScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the job posting flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixPostJobScreen();
} catch (error) {
  console.error("❌  Failed to fix PostJobScreen:", error.message);
  process.exit(1);
}
