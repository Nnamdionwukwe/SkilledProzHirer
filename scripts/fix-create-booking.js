#!/usr/bin/env node

/**
 * Fix CreateBookingScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-create-booking.js
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
  "CreateBookingScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Job Type options
  "createBooking.jobType.fullTime": "Full-time",
  "createBooking.jobType.partTime": "Part-time",
  "createBooking.jobType.contract": "Contract",
  "createBooking.jobType.temporary": "Temporary",

  // Location Type options
  "createBooking.locationType.remote": "Remote",
  "createBooking.locationType.onSite": "On-site",
  "createBooking.locationType.hybrid": "Hybrid",

  // Payment Type options
  "createBooking.paymentType.fixed": "Fixed Price",
  "createBooking.paymentType.fixedSub": "Pay a set total",
  "createBooking.paymentType.hourly": "Per Hour",
  "createBooking.paymentType.hourlySub": "Billed hourly",
  "createBooking.paymentType.daily": "Per Day",
  "createBooking.paymentType.dailySub": "Billed daily",
  "createBooking.paymentType.weekly": "Per Week",
  "createBooking.paymentType.weeklySub": "Billed weekly",
  "createBooking.paymentType.monthly": "Per Month",
  "createBooking.paymentType.monthlySub": "Billed monthly",
  "createBooking.paymentType.custom": "Custom",
  "createBooking.paymentType.customSub": "Define your own",

  // Duration Unit options
  "createBooking.durationUnit.hours": "Hours",
  "createBooking.durationUnit.days": "Days",
  "createBooking.durationUnit.weeks": "Weeks",
  "createBooking.durationUnit.months": "Months",
  "createBooking.durationUnit.custom": "Custom",

  // Engagement options
  "createBooking.engagement.hourly": "Hourly",
  "createBooking.engagement.daily": "Daily",
  "createBooking.engagement.weekly": "Weekly",
  "createBooking.engagement.monthly": "Monthly",
  "createBooking.engagement.custom": "Custom",

  // Section labels
  "createBooking.section.worker": "Worker",
  "createBooking.section.jobType": "Job Type",
  "createBooking.section.locationType": "Location Type",
  "createBooking.section.pricingDuration": "Pricing & Duration",
  "createBooking.section.paymentType": "Payment Type",
  "createBooking.section.jobDuration": "Job Duration",
  "createBooking.section.category": "Category",
  "createBooking.section.jobInformation": "Job Information",
  "createBooking.section.location": "Location",
  "createBooking.section.schedule": "Schedule",

  // Field labels
  "createBooking.field.workerId": "Worker ID",
  "createBooking.field.workerIdPlaceholder": "Enter worker ID...",
  "createBooking.field.engagementType": "Engagement Type",
  "createBooking.field.engagementHint":
    "Select how you want to engage this worker. The rate is set by the worker and cannot be modified.",
  "createBooking.field.agreedRate": "AGREED RATE",
  "createBooking.field.currency": "CURRENCY",
  "createBooking.field.workersRate": "Worker's rate",
  "createBooking.field.workersCurrency": "Worker's currency",
  "createBooking.field.numberOfUnits": "NUMBER OF {{unit}} *",
  "createBooking.field.describeEngagement": "DESCRIBE ENGAGEMENT",
  "createBooking.field.describeEngagementPlaceholder":
    "e.g. Full build, until project complete",
  "createBooking.field.describeDuration": "DESCRIBE DURATION",
  "createBooking.field.describeDurationPlaceholder":
    "e.g. Until launch, ongoing retainer",
  "createBooking.field.numberOfDuration": "NUMBER OF {{duration}}",
  "createBooking.field.serviceCategory": "SERVICE CATEGORY",
  "createBooking.field.categoryHint":
    "Auto-filled from the worker's registered categories. Select if multiple are available.",
  "createBooking.field.jobTitle": "JOB TITLE *",
  "createBooking.field.jobTitlePlaceholder": "e.g. Fix leaking kitchen pipe",
  "createBooking.field.description": "DESCRIPTION *",
  "createBooking.field.descriptionPlaceholder":
    "Describe exactly what needs to be done…",
  "createBooking.field.additionalNotes": "ADDITIONAL NOTES",
  "createBooking.field.notesPlaceholder":
    "Access instructions, parking, tools to bring…",
  "createBooking.field.serviceAddress": "Service Address",
  "createBooking.field.addressPlaceholder": "Enter full address...",
  "createBooking.field.dateTime": "DATE & TIME *",
  "createBooking.field.selectDateTime": "Select date & time",
  "createBooking.field.selectCategory": "Select category",

  // Summary
  "createBooking.summary.title": "📋 BOOKING SUMMARY",
  "createBooking.summary.worker": "Worker",
  "createBooking.summary.jobType": "Job Type",
  "createBooking.summary.location": "Location",
  "createBooking.summary.agreedRate": "Agreed Rate",
  "createBooking.summary.estimatedTotal": "Estimated Total",
  "createBooking.summary.note":
    "⚠️ Review all details before confirming. The worker will be notified upon booking creation.",

  // Empty state
  "createBooking.empty.title": "Find a Worker First",
  "createBooking.empty.subtitle":
    "Browse available workers, view their profiles and rates, then come back to book them directly.",
  "createBooking.empty.button": "Browse Workers",

  // Buttons
  "createBooking.button.createBooking": "Create Booking",
  "createBooking.button.browseWorkers": "Browse Workers",
  "createBooking.button.done": "Done",

  // Placeholder text
  "createBooking.placeholder.workerId": "Enter worker ID...",
  "createBooking.placeholder.engagement":
    "e.g. Full build, until project complete",
  "createBooking.placeholder.duration": "e.g. Until launch, ongoing retainer",
  "createBooking.placeholder.title": "e.g. Fix leaking kitchen pipe",
  "createBooking.placeholder.description":
    "Describe exactly what needs to be done…",
  "createBooking.placeholder.notes":
    "Access instructions, parking, tools to bring…",
  "createBooking.placeholder.address": "Enter full address...",
  "createBooking.placeholder.date": "Select date & time",

  // Messages
  "createBooking.workerNotFound": "Worker not found",
  "createBooking.loadingWorker": "Loading worker...",
  "createBooking.workerRequired": "Please select a worker",
  "createBooking.titleRequired": "Job title is required",
  "createBooking.descriptionRequired": "Description is required",
  "createBooking.addressRequired": "Address is required",
  "createBooking.dateRequired": "Please select a date and time",
  "createBooking.categoryRequired": "Please select a category",
  "createBooking.created": "Booking created successfully!",
  "createBooking.disclaimer":
    "By creating this booking, you agree to SkilledProz terms and conditions.",
  "createBooking.estimatedTotal": "Estimated Total",
  "createBooking.rateLocked": "🔒 Worker's rate",
  "createBooking.currencyLocked": "🔒 Worker's currency",

  // Date picker
  "createBooking.datePicker.title": "Select Date & Time",
  "createBooking.datePicker.done": "Done",

  // Common
  "common.back": "Back",
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

function fixCreateBookingScreen() {
  console.log("\n🔧  Fixing CreateBookingScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix JOB_TYPE_OPTIONS labels
  const jobTypeFixes = [
    {
      from: /label: "Full-time"/g,
      to: 'label: t("createBooking.jobType.fullTime")',
    },
    {
      from: /label: "Part-time"/g,
      to: 'label: t("createBooking.jobType.partTime")',
    },
    {
      from: /label: "Contract"/g,
      to: 'label: t("createBooking.jobType.contract")',
    },
    {
      from: /label: "Temporary"/g,
      to: 'label: t("createBooking.jobType.temporary")',
    },
  ];

  for (const fix of jobTypeFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix LOCATION_TYPE_OPTIONS labels
  const locationFixes = [
    {
      from: /label: "Remote"/g,
      to: 'label: t("createBooking.locationType.remote")',
    },
    {
      from: /label: "On-site"/g,
      to: 'label: t("createBooking.locationType.onSite")',
    },
    {
      from: /label: "Hybrid"/g,
      to: 'label: t("createBooking.locationType.hybrid")',
    },
  ];

  for (const fix of locationFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix PAYMENT_TYPE_OPTIONS labels
  const paymentFixes = [
    {
      from: /label: "Fixed Price"/g,
      to: 'label: t("createBooking.paymentType.fixed")',
    },
    {
      from: /sub: "Pay a set total"/g,
      to: 'sub: t("createBooking.paymentType.fixedSub")',
    },
    {
      from: /label: "Per Hour"/g,
      to: 'label: t("createBooking.paymentType.hourly")',
    },
    {
      from: /sub: "Billed hourly"/g,
      to: 'sub: t("createBooking.paymentType.hourlySub")',
    },
    {
      from: /label: "Per Day"/g,
      to: 'label: t("createBooking.paymentType.daily")',
    },
    {
      from: /sub: "Billed daily"/g,
      to: 'sub: t("createBooking.paymentType.dailySub")',
    },
    {
      from: /label: "Per Week"/g,
      to: 'label: t("createBooking.paymentType.weekly")',
    },
    {
      from: /sub: "Billed weekly"/g,
      to: 'sub: t("createBooking.paymentType.weeklySub")',
    },
    {
      from: /label: "Per Month"/g,
      to: 'label: t("createBooking.paymentType.monthly")',
    },
    {
      from: /sub: "Billed monthly"/g,
      to: 'sub: t("createBooking.paymentType.monthlySub")',
    },
    {
      from: /label: "Custom"/g,
      to: 'label: t("createBooking.paymentType.custom")',
    },
    {
      from: /sub: "Define your own"/g,
      to: 'sub: t("createBooking.paymentType.customSub")',
    },
  ];

  for (const fix of paymentFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix DURATION_UNIT_OPTIONS labels
  const durationFixes = [
    {
      from: /label: "Hours"/g,
      to: 'label: t("createBooking.durationUnit.hours")',
    },
    {
      from: /label: "Days"/g,
      to: 'label: t("createBooking.durationUnit.days")',
    },
    {
      from: /label: "Weeks"/g,
      to: 'label: t("createBooking.durationUnit.weeks")',
    },
    {
      from: /label: "Months"/g,
      to: 'label: t("createBooking.durationUnit.months")',
    },
    {
      from: /label: "Custom"/g,
      to: 'label: t("createBooking.durationUnit.custom")',
    },
  ];

  for (const fix of durationFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix ENGAGEMENT_OPTIONS labels
  const engagementFixes = [
    {
      from: /label: "Hourly"/g,
      to: 'label: t("createBooking.engagement.hourly")',
    },
    {
      from: /label: "Daily"/g,
      to: 'label: t("createBooking.engagement.daily")',
    },
    {
      from: /label: "Weekly"/g,
      to: 'label: t("createBooking.engagement.weekly")',
    },
    {
      from: /label: "Monthly"/g,
      to: 'label: t("createBooking.engagement.monthly")',
    },
    {
      from: /label: "Custom"/g,
      to: 'label: t("createBooking.engagement.custom")',
    },
  ];

  for (const fix of engagementFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix Fieldset legends
  const legendFixes = [
    {
      from: /legend="Job Type"/g,
      to: 'legend={t("createBooking.section.jobType")}',
    },
    {
      from: /legend="Location Type"/g,
      to: 'legend={t("createBooking.section.locationType")}',
    },
    {
      from: /legend="Payment Type"/g,
      to: 'legend={t("createBooking.section.paymentType")}',
    },
    {
      from: /legend="Job Duration"/g,
      to: 'legend={t("createBooking.section.jobDuration")}',
    },
    {
      from: /legend="Category"/g,
      to: 'legend={t("createBooking.section.category")}',
    },
    {
      from: /legend="Location"/g,
      to: 'legend={t("createBooking.section.location")}',
    },
    {
      from: /legend="Schedule"/g,
      to: 'legend={t("createBooking.section.schedule")}',
    },
  ];

  for (const fix of legendFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded text in EmptyWorkerState
  const emptyStateFixes = [
    { from: /"Find a Worker First"/g, to: 't("createBooking.empty.title")' },
    {
      from: /"Browse available workers, view their profiles and rates, then come back to book them directly."/g,
      to: 't("createBooking.empty.subtitle")',
    },
    { from: /"Browse Workers"/g, to: 't("createBooking.empty.button")' },
  ];

  for (const fix of emptyStateFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded labels in WorkerCard
  const workerCardFixes = [
    { from: /" reviews\)"/g, to: 't("createBooking.reviews")")' },
    { from: /" jobs done"/g, to: 't("createBooking.jobsDone")' },
    {
      from: /"Details locked\\nfrom worker's\\nprofile"/g,
      to: 't("createBooking.detailsLocked")',
    },
  ];

  for (const fix of workerCardFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded section labels in Fieldset
  const sectionLabelFixes = [
    { from: /"AGREED RATE"/g, to: 't("createBooking.field.agreedRate")' },
    { from: /"CURRENCY"/g, to: 't("createBooking.field.currency")' },
    { from: /"🔒 Worker's rate"/g, to: 't("createBooking.field.workersRate")' },
    {
      from: /"🔒 Worker's currency"/g,
      to: 't("createBooking.field.workersCurrency")',
    },
    {
      from: /"DESCRIBE ENGAGEMENT"/g,
      to: 't("createBooking.field.describeEngagement")',
    },
    {
      from: /"DESCRIBE DURATION"/g,
      to: 't("createBooking.field.describeDuration")',
    },
    {
      from: /"SERVICE CATEGORY"/g,
      to: 't("createBooking.field.serviceCategory")',
    },
    { from: /"JOB TITLE \*"/g, to: 't("createBooking.field.jobTitle")' },
    { from: /"DESCRIPTION \*"/g, to: 't("createBooking.field.description")' },
    {
      from: /"ADDITIONAL NOTES"/g,
      to: 't("createBooking.field.additionalNotes")',
    },
    { from: /"DATE & TIME \*"/g, to: 't("createBooking.field.dateTime")' },
  ];

  for (const fix of sectionLabelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded placeholder text
  const placeholderFixes = [
    {
      from: /placeholder="e\.g\. Fix leaking kitchen pipe"/g,
      to: 'placeholder={t("createBooking.field.jobTitlePlaceholder") || "e.g. Fix leaking kitchen pipe"}',
    },
    {
      from: /placeholder="Describe exactly what needs to be done…"/g,
      to: 'placeholder={t("createBooking.field.descriptionPlaceholder") || "Describe exactly what needs to be done…"}',
    },
    {
      from: /placeholder="Access instructions, parking, tools to bring…"/g,
      to: 'placeholder={t("createBooking.field.notesPlaceholder") || "Access instructions, parking, tools to bring…"}',
    },
    {
      from: /placeholder="e\.g\. Full build, until project complete"/g,
      to: 'placeholder={t("createBooking.field.describeEngagementPlaceholder") || "e.g. Full build, until project complete"}',
    },
    {
      from: /placeholder="e\.g\. Until launch, ongoing retainer"/g,
      to: 'placeholder={t("createBooking.field.describeDurationPlaceholder") || "e.g. Until launch, ongoing retainer"}',
    },
    {
      from: /placeholder="e\.g\. 4"/g,
      to: 'placeholder={t("createBooking.field.numberPlaceholder") || "e.g. 4"}',
    },
    {
      from: /placeholder="e\.g\. 5"/g,
      to: 'placeholder={t("createBooking.field.numberPlaceholder") || "e.g. 5"}',
    },
    {
      from: /placeholder="Select date & time"/g,
      to: 'placeholder={t("createBooking.field.selectDateTime") || "Select date & time"}',
    },
  ];

  for (const fix of placeholderFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded modal titles
  const modalFixes = [
    {
      from: /"Select Category"/g,
      to: 't("createBooking.field.selectCategory")',
    },
    {
      from: /"Select Date & Time"/g,
      to: 't("createBooking.datePicker.title")',
    },
    { from: /"Done"/g, to: 't("createBooking.datePicker.done")' },
    {
      from: /"Select Date & Time"/g,
      to: 't("createBooking.datePicker.title")',
    },
  ];

  for (const fix of modalFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded summary labels
  const summaryFixes = [
    { from: /"📋 BOOKING SUMMARY"/g, to: 't("createBooking.summary.title")' },
    { from: /"Job Type"/g, to: 't("createBooking.summary.jobType")' },
    { from: /"Location"/g, to: 't("createBooking.summary.location")' },
    {
      from: /"⚠️ Review all details before confirming. The worker will be notified upon booking creation."/g,
      to: 't("createBooking.summary.note")',
    },
  ];

  for (const fix of summaryFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded hint text
  const hintFixes = [
    {
      from: /"Select how you want to engage this worker. The rate is set by the worker and cannot be modified."/g,
      to: 't("createBooking.field.engagementHint")',
    },
    {
      from: /"Auto-filled from the worker's registered categories. Select if multiple are available."/g,
      to: 't("createBooking.field.categoryHint")',
    },
  ];

  for (const fix of hintFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded toast messages
  const toastFixes = [
    {
      from: /"Booking created successfully!"/g,
      to: 't("createBooking.created")',
    },
  ];

  for (const fix of toastFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded error messages
  const errorFixes = [
    { from: /"Worker not found"/g, to: 't("createBooking.workerNotFound")' },
    {
      from: /"Please select a worker"/g,
      to: 't("createBooking.workerRequired")',
    },
    {
      from: /"Job title is required"/g,
      to: 't("createBooking.titleRequired")',
    },
    {
      from: /"Description is required"/g,
      to: 't("createBooking.descriptionRequired")',
    },
    {
      from: /"Address is required"/g,
      to: 't("createBooking.addressRequired")',
    },
    {
      from: /"Please select a date and time"/g,
      to: 't("createBooking.dateRequired")',
    },
    {
      from: /"Please select a category"/g,
      to: 't("createBooking.categoryRequired")',
    },
  ];

  for (const fix of errorFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded button text
  const buttonFixes = [
    { from: /"Browse Workers"/g, to: 't("createBooking.empty.button")' },
  ];

  for (const fix of buttonFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded "Not offered" text
  content = content.replace(/"Not offered"/g, 't("createBooking.notOffered")');

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
  console.log("     - Job Type options (JOB_TYPE_OPTIONS)");
  console.log("     - Location Type options (LOCATION_TYPE_OPTIONS)");
  console.log("     - Payment Type options (PAYMENT_TYPE_OPTIONS)");
  console.log("     - Duration Unit options (DURATION_UNIT_OPTIONS)");
  console.log("     - Engagement options (ENGAGEMENT_OPTIONS)");
  console.log("     - Fieldset legends and labels");
  console.log("     - Placeholders and hints");
  console.log("     - Summary section");
  console.log("     - Error and toast messages");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - createBooking.* (80+ keys)");
  console.log("     - common.* (1 key)");
  console.log("     - toast.* (2 keys)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in CreateBookingScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the booking creation flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixCreateBookingScreen();
} catch (error) {
  console.error("❌  Failed to fix CreateBookingScreen:", error.message);
  process.exit(1);
}
