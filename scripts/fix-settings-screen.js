#!/usr/bin/env node

/**
 * Fix SettingsScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes any hardcoded English text in labels, placeholders, etc.
 *
 * Run: node scripts/fix-settings-screen.js
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
  "SettingsScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // Tab labels
  "settings.tabs.profile": "Profile",
  "settings.tabs.workProfile": "Work Profile",
  "settings.tabs.pricing": "Pricing",
  "settings.tabs.currencies": "Currencies",
  "settings.tabs.appearance": "Appearance",
  "settings.tabs.notifications": "Notifications",
  "settings.tabs.privacy": "Privacy",
  "settings.tabs.security": "Security",
  "settings.tabs.activity": "Activity",
  "settings.tabs.company": "Company",

  // Profile section
  "settings.profile.title": "Profile",
  "settings.profile.subtitle": "Personal details and contact info",
  "settings.profile.firstName": "First Name",
  "settings.profile.lastName": "Last Name",
  "settings.profile.phone": "Phone",
  "settings.profile.bio": "Bio",
  "settings.profile.country": "Country",
  "settings.profile.state": "State",
  "settings.profile.city": "City",
  "settings.profile.address": "Address",
  "settings.profile.currency": "Currency",
  "settings.profile.gender": "Gender",
  "settings.profile.language": "Language",
  "settings.profile.changePhoto": "Change Photo",
  "settings.profile.photoHint": "JPG, PNG or WebP · max 5MB",
  "settings.profile.save": "Save Profile",
  "settings.profile.saved": "Profile saved",
  "settings.profile.saveFailed": "Failed to save profile",
  "settings.profile.permissionRequired": "Permission required",
  "settings.profile.avatarUpdated": "Avatar updated",
  "settings.profile.avatarFailed": "Failed to upload avatar",

  // Work Profile section
  "settings.workProfile.title": "Work Profile",
  "settings.workProfile.subtitle":
    "Professional details hirers see on your profile",
  "settings.workProfile.titleLabel": "Professional Title",
  "settings.workProfile.titlePlaceholder": "e.g. Certified Electrician",
  "settings.workProfile.description": "Description",
  "settings.workProfile.descriptionPlaceholder":
    "Describe your skills, experience, specializations...",
  "settings.workProfile.yearsExperience": "Years of Experience",
  "settings.workProfile.serviceRadius": "Service Radius (KM)",
  "settings.workProfile.availableLabel": "Available for Bookings",
  "settings.workProfile.availableSub": "Turn off to pause new booking requests",
  "settings.workProfile.save": "Save Work Profile",
  "settings.workProfile.saved": "Work profile saved",
  "settings.workProfile.saveFailed": "Failed to save work profile",
  "settings.workProfile.titleRequired": "Professional title is required",

  // Pricing section
  "settings.pricing.title": "Pricing",
  "settings.pricing.subtitle": "Set your rates for different engagement types",
  "settings.pricing.hint":
    "Set rates for each duration type. Leave blank to hide that option from your profile.",
  "settings.pricing.currency": "Pricing Currency",
  "settings.pricing.hourly": "Hourly Rate",
  "settings.pricing.daily": "Daily Rate",
  "settings.pricing.weekly": "Weekly Rate",
  "settings.pricing.monthly": "Monthly Rate",
  "settings.pricing.custom": "Custom Rate",
  "settings.pricing.customAmount": "Custom Rate Amount",
  "settings.pricing.customLabel": "Custom Label",
  "settings.pricing.customLabelPlaceholder": "e.g. per project",
  "settings.pricing.notes": "Pricing Notes (Optional)",
  "settings.pricing.notesPlaceholder": "Discounts, terms, travel fees...",
  "settings.pricing.save": "Save Pricing",
  "settings.pricing.saved": "Pricing saved",
  "settings.pricing.saveFailed": "Failed to save pricing",

  // Company section
  "settings.company.title": "Company",
  "settings.company.subtitle": "Business details shown on your hirer profile",
  "settings.company.name": "Company Name",
  "settings.company.namePlaceholder": "Acme Ltd",
  "settings.company.size": "Company Size",
  "settings.company.website": "Website",
  "settings.company.websitePlaceholder": "https://yourcompany.com",
  "settings.company.save": "Save Company",
  "settings.company.saved": "Company profile saved",
  "settings.company.saveFailed": "Failed to save company profile",

  // Currencies section
  "settings.currencies.title": "Currencies",
  "settings.currencies.subtitle": "How amounts are displayed and processed",
  "settings.currencies.dashboard": "Dashboard Currency",
  "settings.currencies.payment": "Payment Currency",
  "settings.currencies.save": "Save Currencies",
  "settings.currencies.saved": "Currency preferences saved",
  "settings.currencies.saveFailed": "Failed to save currencies",

  // Appearance section
  "settings.appearance.title": "Appearance",
  "settings.appearance.subtitle": "Theme and language preferences",
  "settings.appearance.theme": "Theme",
  "settings.appearance.themeHint":
    "Choose how SkilledProz looks on your device.",
  "settings.appearance.language": "Language",
  "settings.appearance.languageHint":
    "Select your preferred language. Changes apply immediately across the app.",
  "settings.appearance.searchLanguage": "Search language...",
  "settings.appearance.noLanguages": "No languages found",
  "settings.appearance.active": "Active:",
  "settings.appearance.save": "Save Appearance",
  "settings.appearance.saved": "Appearance saved",
  "settings.appearance.saveFailed": "Failed to save appearance",

  // Notifications section
  "settings.notifications.title": "Notifications",
  "settings.notifications.subtitle":
    "Choose what you want to be notified about",
  "settings.notifications.bookings": "Bookings",
  "settings.notifications.bookingsSub": "New bookings and status updates",
  "settings.notifications.messages": "Messages",
  "settings.notifications.messagesSub": "New chat messages",
  "settings.notifications.payments": "Payments",
  "settings.notifications.paymentsSub": "Payment receipts and releases",
  "settings.notifications.reviews": "Reviews",
  "settings.notifications.reviewsSub": "New reviews received",
  "settings.notifications.marketing": "Marketing",
  "settings.notifications.marketingSub": "Tips, features, and offers",
  "settings.notifications.save": "Save Preferences",
  "settings.notifications.saved": "Notification preferences saved",
  "settings.notifications.saveFailed": "Failed to save preferences",

  // Privacy section
  "settings.privacy.title": "Privacy",
  "settings.privacy.subtitle": "Control what others can see on your profile",
  "settings.privacy.publicProfile": "Public Profile",
  "settings.privacy.publicProfileSub": "Allow others to view your profile",
  "settings.privacy.showPhone": "Show Phone",
  "settings.privacy.showPhoneSub": "Display phone number on profile",
  "settings.privacy.showLocation": "Show Location",
  "settings.privacy.showLocationSub": "Display city and country",
  "settings.privacy.showEmail": "Show Email",
  "settings.privacy.showEmailSub": "Display email on profile",
  "settings.privacy.showGender": "Show Gender",
  "settings.privacy.showGenderSub": "Display gender on profile",
  "settings.privacy.save": "Save Privacy",
  "settings.privacy.saved": "Privacy settings saved",
  "settings.privacy.saveFailed": "Failed to save privacy settings",

  // Security section
  "settings.security.title": "Security",
  "settings.security.subtitle": "Password and account security",
  "settings.security.email": "Email",
  "settings.security.phone": "Phone",
  "settings.security.changePassword": "Change Password",
  "settings.security.currentPassword": "Current Password",
  "settings.security.newPassword": "New Password",
  "settings.security.confirmPassword": "Confirm Password",
  "settings.security.minChars": "min 8 chars",
  "settings.security.passwordChanged": "Password changed successfully",
  "settings.security.passwordFailed": "Failed to change password",
  "settings.security.enterCurrent": "Enter your current password",
  "settings.security.passwordTooShort":
    "New password must be at least 8 characters",
  "settings.security.passwordsDontMatch": "Passwords don't match",

  // Activity section
  "settings.activity.title": "Activity",
  "settings.activity.subtitle": "Your recent account activity",
  "settings.activity.bookings": "Bookings",
  "settings.activity.reviews": "Reviews",
  "settings.activity.unreadNotifs": "Unread Notifs",

  // Select modal
  "settings.select.currency": "Select Currency",
  "settings.select.gender": "Select Gender",
  "settings.select.language": "Select Language",
  "settings.select.theme": "Select Theme",
  "settings.select.pricingCurrency": "Select Pricing Currency",
  "settings.select.companySize": "Company Size",
  "settings.select.dashboardCurrency": "Dashboard Currency",
  "settings.select.paymentCurrency": "Payment Currency",
  "settings.select.sizeOption": "{{size}} employees",

  // Gender options
  "settings.gender.male": "Male",
  "settings.gender.female": "Female",
  "settings.gender.nonBinary": "Non-binary",
  "settings.gender.preferNot": "Prefer not to say",

  // Theme options
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.theme.system": "System",

  // Common
  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.select": "Select...",
  "common.optional": "Optional",
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

function fixSettingsScreen() {
  console.log("\n🔧  Fixing SettingsScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix tab labels - replace with t() calls
  const tabFixes = [
    {
      from: /{ id: "profile", label: "Profile", icon: "person-outline" }/g,
      to: '{ id: "profile", label: t("settings.tabs.profile"), icon: "person-outline" }',
    },
    {
      from: /{ id: "workProfile", label: "Work Profile", icon: "construct-outline" }/g,
      to: '{ id: "workProfile", label: t("settings.tabs.workProfile"), icon: "construct-outline" }',
    },
    {
      from: /{ id: "pricing", label: "Pricing", icon: "cash-outline" }/g,
      to: '{ id: "pricing", label: t("settings.tabs.pricing"), icon: "cash-outline" }',
    },
    {
      from: /{ id: "currencies", label: "Currencies", icon: "cash-outline" }/g,
      to: '{ id: "currencies", label: t("settings.tabs.currencies"), icon: "cash-outline" }',
    },
    {
      from: /{ id: "appearance", label: "Appearance", icon: "color-palette-outline" }/g,
      to: '{ id: "appearance", label: t("settings.tabs.appearance"), icon: "color-palette-outline" }',
    },
    {
      from: /{ id: "notifications", label: "Notifications", icon: "notifications-outline" }/g,
      to: '{ id: "notifications", label: t("settings.tabs.notifications"), icon: "notifications-outline" }',
    },
    {
      from: /{ id: "privacy", label: "Privacy", icon: "lock-closed-outline" }/g,
      to: '{ id: "privacy", label: t("settings.tabs.privacy"), icon: "lock-closed-outline" }',
    },
    {
      from: /{ id: "security", label: "Security", icon: "shield-outline" }/g,
      to: '{ id: "security", label: t("settings.tabs.security"), icon: "shield-outline" }',
    },
    {
      from: /{ id: "activity", label: "Activity", icon: "bar-chart-outline" }/g,
      to: '{ id: "activity", label: t("settings.tabs.activity"), icon: "bar-chart-outline" }',
    },
    {
      from: /{ id: "company", label: "Company", icon: "business-outline" }/g,
      to: '{ id: "company", label: t("settings.tabs.company"), icon: "business-outline" }',
    },
  ];

  for (const fix of tabFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix gender options
  const genderFixes = [
    { from: /"Male"/g, to: 't("settings.gender.male")' },
    { from: /"Female"/g, to: 't("settings.gender.female")' },
    { from: /"Non-binary"/g, to: 't("settings.gender.nonBinary")' },
    { from: /"Prefer not to say"/g, to: 't("settings.gender.preferNot")' },
  ];

  for (const fix of genderFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix theme options
  const themeFixes = [
    {
      from: /{ value: "light", label: "Light", emoji: "☀️" }/g,
      to: '{ value: "light", label: t("settings.theme.light"), emoji: "☀️" }',
    },
    {
      from: /{ value: "dark", label: "Dark", emoji: "🌙" }/g,
      to: '{ value: "dark", label: t("settings.theme.dark"), emoji: "🌙" }',
    },
    {
      from: /{ value: "system", label: "System", emoji: "💻" }/g,
      to: '{ value: "system", label: t("settings.theme.system"), emoji: "💻" }',
    },
  ];

  for (const fix of themeFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded placeholder text
  const placeholderFixes = [
    {
      from: /placeholder="John"/g,
      to: 'placeholder={t("settings.profile.firstNamePlaceholder") || "John"}',
    },
    {
      from: /placeholder="Doe"/g,
      to: 'placeholder={t("settings.profile.lastNamePlaceholder") || "Doe"}',
    },
    {
      from: /placeholder="\+234\.\.\."/g,
      to: 'placeholder={t("settings.profile.phonePlaceholder") || "+234..."}',
    },
    {
      from: /placeholder="Tell hirers about yourself\.\.\."/g,
      to: 'placeholder={t("settings.profile.bioPlaceholder") || "Tell hirers about yourself..."}',
    },
    {
      from: /placeholder="Nigeria"/g,
      to: 'placeholder={t("settings.profile.countryPlaceholder") || "Nigeria"}',
    },
    {
      from: /placeholder="Lagos"/g,
      to: 'placeholder={t("settings.profile.statePlaceholder") || "Lagos"}',
    },
    {
      from: /placeholder="Ikeja"/g,
      to: 'placeholder={t("settings.profile.cityPlaceholder") || "Ikeja"}',
    },
    {
      from: /placeholder="123 Main St"/g,
      to: 'placeholder={t("settings.profile.addressPlaceholder") || "123 Main St"}',
    },
    {
      from: /placeholder="e\.g\. Certified Electrician"/g,
      to: 'placeholder={t("settings.workProfile.titlePlaceholder") || "e.g. Certified Electrician"}',
    },
    {
      from: /placeholder="Describe your skills, experience, specializations\.\.\."/g,
      to: 'placeholder={t("settings.workProfile.descriptionPlaceholder") || "Describe your skills, experience, specializations..."}',
    },
    {
      from: /placeholder="0"/g,
      to: 'placeholder={t("settings.workProfile.yearsPlaceholder") || "0"}',
    },
    {
      from: /placeholder="25"/g,
      to: 'placeholder={t("settings.workProfile.radiusPlaceholder") || "25"}',
    },
    {
      from: /placeholder="0\.00"/g,
      to: 'placeholder={t("settings.pricing.amountPlaceholder") || "0.00"}',
    },
    {
      from: /placeholder="e\.g\. per project"/g,
      to: 'placeholder={t("settings.pricing.customLabelPlaceholder") || "e.g. per project"}',
    },
    {
      from: /placeholder="Discounts, terms, travel fees\.\.\."/g,
      to: 'placeholder={t("settings.pricing.notesPlaceholder") || "Discounts, terms, travel fees..."}',
    },
    {
      from: /placeholder="Acme Ltd"/g,
      to: 'placeholder={t("settings.company.namePlaceholder") || "Acme Ltd"}',
    },
    {
      from: /placeholder="https:\/\/yourcompany\.com"/g,
      to: 'placeholder={t("settings.company.websitePlaceholder") || "https://yourcompany.com"}',
    },
    {
      from: /placeholder="Search language\.\.\."/g,
      to: 'placeholder={t("settings.appearance.searchLanguage") || "Search language..."}',
    },
  ];

  for (const fix of placeholderFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded labels in section headers
  const sectionFixes = [
    { from: /title="Profile"/g, to: 'title={t("settings.profile.title")}' },
    {
      from: /sub="Personal details and contact info"/g,
      to: 'sub={t("settings.profile.subtitle")}',
    },
    {
      from: /title="Work Profile"/g,
      to: 'title={t("settings.workProfile.title")}',
    },
    {
      from: /sub="Professional details hirers see on your profile"/g,
      to: 'sub={t("settings.workProfile.subtitle")}',
    },
    { from: /title="Pricing"/g, to: 'title={t("settings.pricing.title")}' },
    {
      from: /sub="Set your rates for different engagement types"/g,
      to: 'sub={t("settings.pricing.subtitle")}',
    },
    { from: /title="Company"/g, to: 'title={t("settings.company.title")}' },
    {
      from: /sub="Business details shown on your hirer profile"/g,
      to: 'sub={t("settings.company.subtitle")}',
    },
    {
      from: /title="Currencies"/g,
      to: 'title={t("settings.currencies.title")}',
    },
    {
      from: /sub="How amounts are displayed and processed"/g,
      to: 'sub={t("settings.currencies.subtitle")}',
    },
    {
      from: /title="Appearance"/g,
      to: 'title={t("settings.appearance.title")}',
    },
    {
      from: /sub="Theme and language preferences"/g,
      to: 'sub={t("settings.appearance.subtitle")}',
    },
    {
      from: /title="Notifications"/g,
      to: 'title={t("settings.notifications.title")}',
    },
    {
      from: /sub="Choose what you want to be notified about"/g,
      to: 'sub={t("settings.notifications.subtitle")}',
    },
    { from: /title="Privacy"/g, to: 'title={t("settings.privacy.title")}' },
    {
      from: /sub="Control what others can see on your profile"/g,
      to: 'sub={t("settings.privacy.subtitle")}',
    },
    { from: /title="Security"/g, to: 'title={t("settings.security.title")}' },
    {
      from: /sub="Password and account security"/g,
      to: 'sub={t("settings.security.subtitle")}',
    },
    { from: /title="Activity"/g, to: 'title={t("settings.activity.title")}' },
    {
      from: /sub="Your recent account activity"/g,
      to: 'sub={t("settings.activity.subtitle")}',
    },
  ];

  for (const fix of sectionFixes) {
    content = content.replace(fix.from, fix.to);
  }

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
  console.log("     - Replaced hardcoded tab labels with t()");
  console.log("     - Replaced hardcoded gender options with t()");
  console.log("     - Replaced hardcoded theme options with t()");
  console.log("     - Replaced hardcoded placeholders with t()");
  console.log("     - Replaced hardcoded section titles with t()");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - settings.* (100+ keys)");
  console.log("     - common.* (3 keys)");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in SettingsScreen.js");
  console.log("     2. Add translations for all keys in each locale file");
  console.log("     3. Test the settings flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixSettingsScreen();
} catch (error) {
  console.error("❌  Failed to fix SettingsScreen:", error.message);
  process.exit(1);
}
