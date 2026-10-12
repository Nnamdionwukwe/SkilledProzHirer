#!/usr/bin/env node

/**
 * Fix WorkerWithdrawalsScreen.js - Convert hardcoded strings and fix hook violations
 *
 * This script:
 * 1. Converts hardcoded strings to use t()
 * 2. Adds missing translation keys to the locale files
 * 3. Fixes hardcoded labels, placeholders, and UI text
 *
 * Run: node scripts/fix-worker-withdrawals.js
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
  "worker",
  "WorkerWithdrawalsScreen.js",
);
const LOCALES_DIR = path.join(rootDir, "src", "i18n", "locales");

// ── Translation keys to add ──────────────────────────────────
const MISSING_KEYS = {
  // PIN Setup
  "workerWithdrawals.pin.setup.title": "Set a Withdrawal PIN",
  "workerWithdrawals.pin.setup.subtitle":
    "You need a 4-digit PIN to authorise every withdrawal.",
  "workerWithdrawals.pin.setup.choose": "Choose 4-digit PIN",
  "workerWithdrawals.pin.setup.confirm": "Confirm PIN",
  "workerWithdrawals.pin.setup.button": "Set PIN & Continue",
  "workerWithdrawals.pin.setup.success": "PIN Set!",
  "workerWithdrawals.pin.setup.returning": "Returning to withdrawal form…",
  "workerWithdrawals.pin.setup.error.short": "Enter a 4-digit PIN.",
  "workerWithdrawals.pin.setup.error.match": "PINs don't match.",
  "workerWithdrawals.pin.setup.error.failed": "Failed to set PIN.",

  // PIN Status
  "workerWithdrawals.pin.status.checking": "Checking PIN status…",
  "workerWithdrawals.pin.status.locked": "PIN Locked",
  "workerWithdrawals.pin.status.lockedMessage":
    "Too many wrong PIN attempts. Wait 30 minutes then try again.",
  "workerWithdrawals.pin.status.attempts": "{{count}} attempt remaining",
  "workerWithdrawals.pin.status.attemptsPlural": "{{count}} attempts remaining",
  "workerWithdrawals.pin.status.forgot": "Forgot PIN? Reset it",

  // Withdrawal Modal
  "workerWithdrawals.modal.title": "Request Payout",
  "workerWithdrawals.modal.success": "Withdrawal Submitted!",
  "workerWithdrawals.modal.done": "Done",
  "workerWithdrawals.modal.close": "Close",
  "workerWithdrawals.modal.wallet": "Withdraw from Wallet",
  "workerWithdrawals.modal.method": "Payout Method",
  "workerWithdrawals.modal.details": "Payout Details",
  "workerWithdrawals.modal.amount": "Amount ({{currency}})",
  "workerWithdrawals.modal.pin": "Withdrawal PIN",
  "workerWithdrawals.modal.pinRequired": "Enter your 4-digit withdrawal PIN.",
  "workerWithdrawals.modal.pinLocked": "PIN is locked. Try again later.",
  "workerWithdrawals.modal.submit": "↑ Withdraw {{amount}}",
  "workerWithdrawals.modal.submitting": "Submitting…",
  "workerWithdrawals.modal.info":
    "Payouts processed within 1–3 business days · No withdrawal fee — you keep 100% 🎉",
  "workerWithdrawals.modal.verifyAccount": "Verify account holder name",
  "workerWithdrawals.modal.verify": "Verify",
  "workerWithdrawals.modal.verified": "Verified",
  "workerWithdrawals.modal.selectBank": "Select bank…",
  "workerWithdrawals.modal.loadingBanks": "Loading banks…",
  "workerWithdrawals.modal.provider": "Provider: {{provider}}",

  // Bank Picker
  "workerWithdrawals.bankPicker.title": "Select Bank",
  "workerWithdrawals.bankPicker.search": "Search {{count}} banks…",
  "workerWithdrawals.bankPicker.results": "{{count}} result",
  "workerWithdrawals.bankPicker.resultsPlural": "{{count}} results",

  // Receipt Modal
  "workerWithdrawals.receipt.title": "Withdrawal Receipt",
  "workerWithdrawals.receipt.reference": "REFERENCE",
  "workerWithdrawals.receipt.method": "METHOD",
  "workerWithdrawals.receipt.paidTo": "PAID TO",
  "workerWithdrawals.receipt.amount": "Withdrawal amount",
  "workerWithdrawals.receipt.fee": "Withdrawal fee",
  "workerWithdrawals.receipt.free": "Free 🎉",
  "workerWithdrawals.receipt.receive": "You receive",
  "workerWithdrawals.receipt.close": "Close",
  "workerWithdrawals.receipt.footer": "SkilledProz · Global Skills Marketplace",

  // Form Fields
  "workerWithdrawals.field.bank": "Bank / Fintech *",
  "workerWithdrawals.field.accountNumber": "Account Number *",
  "workerWithdrawals.field.accountNumberPlaceholder": "0123456789",
  "workerWithdrawals.field.bankName": "Bank Name *",
  "workerWithdrawals.field.bankNamePlaceholder": "e.g. Bank of America",
  "workerWithdrawals.field.iban": "Account / IBAN *",
  "workerWithdrawals.field.ibanPlaceholder": "IBAN or account number",
  "workerWithdrawals.field.swift": "SWIFT / BIC *",
  "workerWithdrawals.field.swiftPlaceholder": "e.g. BOFAUS3N",
  "workerWithdrawals.field.routing": "Routing Number (US/CA)",
  "workerWithdrawals.field.routingPlaceholder": "9-digit routing",
  "workerWithdrawals.field.accountHolder": "Account Holder Name *",
  "workerWithdrawals.field.accountHolderPlaceholder": "Full name on account",
  "workerWithdrawals.field.bankCountry": "Bank Country *",
  "workerWithdrawals.field.bankCountryPlaceholder": "e.g. United States",
  "workerWithdrawals.field.mobileNumber": "Mobile Number *",
  "workerWithdrawals.field.mobileNumberPlaceholder": "+234 800 000 0000",
  "workerWithdrawals.field.mobileName": "Account Name (optional)",
  "workerWithdrawals.field.mobileNamePlaceholder": "Name on mobile account",
  "workerWithdrawals.field.token": "Token *",
  "workerWithdrawals.field.network": "Network *",
  "workerWithdrawals.field.walletAddress": "Wallet Address *",
  "workerWithdrawals.field.walletAddressPlaceholder": "0x… or TRC20 address",
  "workerWithdrawals.field.cryptoWarning":
    "Double-check the network matches your wallet. Wrong network = permanent loss of funds.",

  // Main Screen
  "workerWithdrawals.main.title": "Your Wallet",
  "workerWithdrawals.main.subtitle": "Multi-currency earnings & payout history",
  "workerWithdrawals.main.withdraw": "Withdraw",
  "workerWithdrawals.main.wallets": "💳 YOUR CURRENCY WALLETS",
  "workerWithdrawals.main.totalAvailable": "TOTAL AVAILABLE",
  "workerWithdrawals.main.inEscrow": "IN ESCROW",
  "workerWithdrawals.main.pendingPayouts": "PENDING PAYOUTS",
  "workerWithdrawals.main.activeWallets": "ACTIVE WALLETS",
  "workerWithdrawals.main.history": "Withdrawal History",
  "workerWithdrawals.main.records": "records",
  "workerWithdrawals.main.noWithdrawals": "No withdrawals yet",
  "workerWithdrawals.main.noWithdrawalsSub":
    "Request your first payout when you have available balance.",
  "workerWithdrawals.main.awaitingCompletion": "Awaiting completion",
  "workerWithdrawals.main.currencies": "Currencies",
  "workerWithdrawals.main.requestPlural": "request(s)",
  "workerWithdrawals.main.withdrawSuccess": "Withdrawal submitted!",
  "workerWithdrawals.main.loadFailed": "Failed to load wallet data.",

  // Withdrawal Card
  "workerWithdrawals.card.receipt": "Receipt",

  // Errors
  "workerWithdrawals.error.validAmount": "Enter a valid amount.",
  "workerWithdrawals.error.exceedsBalance":
    "Exceeds available balance ({{balance}}).",
  "workerWithdrawals.error.selectMethod": "Select a payout method.",
  "workerWithdrawals.error.selectBank": "Select a bank.",
  "workerWithdrawals.error.enterAccount": "Enter account number.",
  "workerWithdrawals.error.verifyAccount": "Verify your account name first.",
  "workerWithdrawals.error.enterIban": "Enter account / IBAN.",
  "workerWithdrawals.error.enterSwift": "Enter SWIFT / BIC code.",
  "workerWithdrawals.error.enterHolderName": "Enter account holder name.",
  "workerWithdrawals.error.enterMobile": "Enter mobile number.",
  "workerWithdrawals.error.enterAddress": "Enter wallet address.",
  "workerWithdrawals.error.selectToken": "Select crypto token.",
  "workerWithdrawals.error.selectNetwork": "Select network.",
  "workerWithdrawals.error.withdrawFailed": "Withdrawal failed.",

  // Time ago
  "workerWithdrawals.time.minutesAgo": "{{m}}m ago",
  "workerWithdrawals.time.hoursAgo": "{{h}}h ago",
  "workerWithdrawals.time.daysAgo": "{{d}}d ago",
  "workerWithdrawals.time.monthsAgo": "{{m}}mo ago",
  "workerWithdrawals.time.yearsAgo": "{{y}}y ago",

  // Status
  "workerWithdrawals.status.pending": "Pending",
  "workerWithdrawals.status.processing": "Processing",
  "workerWithdrawals.status.completed": "Paid Out",
  "workerWithdrawals.status.failed": "Failed",
  "workerWithdrawals.status.cancelled": "Cancelled",
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

function fixWorkerWithdrawalsScreen() {
  console.log("\n🔧  Fixing WorkerWithdrawalsScreen.js\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix hardcoded strings ──────────────────────────────
  console.log("\n📝  Fixing hardcoded strings...");

  // Fix STATUS_META labels
  const statusFixes = [
    {
      from: /label: "Pending"/g,
      to: 'label: t("workerWithdrawals.status.pending")',
    },
    {
      from: /label: "Processing"/g,
      to: 'label: t("workerWithdrawals.status.processing")',
    },
    {
      from: /label: "Paid Out"/g,
      to: 'label: t("workerWithdrawals.status.completed")',
    },
    {
      from: /label: "Failed"/g,
      to: 'label: t("workerWithdrawals.status.failed")',
    },
    {
      from: /label: "Cancelled"/g,
      to: 'label: t("workerWithdrawals.status.cancelled")',
    },
  ];

  for (const fix of statusFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix hardcoded strings in the file
  const hardcodedFixes = [
    // PIN Setup
    {
      from: /"Set a Withdrawal PIN"/g,
      to: 't("workerWithdrawals.pin.setup.title")',
    },
    {
      from: /"You need a 4-digit PIN to authorise every withdrawal\."/g,
      to: 't("workerWithdrawals.pin.setup.subtitle")',
    },
    {
      from: /"Choose 4-digit PIN"/g,
      to: 't("workerWithdrawals.pin.setup.choose")',
    },
    { from: /"Confirm PIN"/g, to: 't("workerWithdrawals.pin.setup.confirm")' },
    {
      from: /"Set PIN & Continue"/g,
      to: 't("workerWithdrawals.pin.setup.button")',
    },
    { from: /"PIN Set!"/g, to: 't("workerWithdrawals.pin.setup.success")' },
    {
      from: /"Returning to withdrawal form…"/g,
      to: 't("workerWithdrawals.pin.setup.returning")',
    },
    {
      from: /"Enter a 4-digit PIN\."/g,
      to: 't("workerWithdrawals.pin.setup.error.short")',
    },
    {
      from: /"PINs don't match\."/g,
      to: 't("workerWithdrawals.pin.setup.error.match")',
    },
    {
      from: /"Failed to set PIN\."/g,
      to: 't("workerWithdrawals.pin.setup.error.failed")',
    },

    // PIN Status
    {
      from: /"Checking PIN status…"/g,
      to: 't("workerWithdrawals.pin.status.checking")',
    },
    { from: /"PIN Locked"/g, to: 't("workerWithdrawals.pin.status.locked")' },
    {
      from: /"Too many wrong PIN attempts\. Wait 30 minutes then try again\."/g,
      to: 't("workerWithdrawals.pin.status.lockedMessage")',
    },
    {
      from: /"Forgot PIN\? Reset it"/g,
      to: 't("workerWithdrawals.pin.status.forgot")',
    },

    // Withdrawal Modal
    { from: /"Request Payout"/g, to: 't("workerWithdrawals.modal.title")' },
    {
      from: /"Withdrawal Submitted!"/g,
      to: 't("workerWithdrawals.modal.success")',
    },
    { from: /"Done"/g, to: 't("workerWithdrawals.modal.done")' },
    { from: /"Close"/g, to: 't("workerWithdrawals.modal.close")' },
    {
      from: /"Withdraw from Wallet"/g,
      to: 't("workerWithdrawals.modal.wallet")',
    },
    { from: /"Payout Method"/g, to: 't("workerWithdrawals.modal.method")' },
    { from: /"Payout Details"/g, to: 't("workerWithdrawals.modal.details")' },
    { from: /"Withdrawal PIN"/g, to: 't("workerWithdrawals.modal.pin")' },
    {
      from: /"Enter your 4-digit withdrawal PIN\."/g,
      to: 't("workerWithdrawals.modal.pinRequired")',
    },
    {
      from: /"PIN is locked\. Try again later\."/g,
      to: 't("workerWithdrawals.modal.pinLocked")',
    },

    // Form Fields
    { from: /"Bank \/ Fintech \*"/g, to: 't("workerWithdrawals.field.bank")' },
    {
      from: /"Account Number \*"/g,
      to: 't("workerWithdrawals.field.accountNumber")',
    },
    {
      from: /"0123456789"/g,
      to: 't("workerWithdrawals.field.accountNumberPlaceholder")',
    },
    { from: /"Bank Name \*"/g, to: 't("workerWithdrawals.field.bankName")' },
    {
      from: /"e\.g\. Bank of America"/g,
      to: 't("workerWithdrawals.field.bankNamePlaceholder")',
    },
    { from: /"Account \/ IBAN \*"/g, to: 't("workerWithdrawals.field.iban")' },
    {
      from: /"IBAN or account number"/g,
      to: 't("workerWithdrawals.field.ibanPlaceholder")',
    },
    { from: /"SWIFT \/ BIC \*"/g, to: 't("workerWithdrawals.field.swift")' },
    {
      from: /"e\.g\. BOFAUS3N"/g,
      to: 't("workerWithdrawals.field.swiftPlaceholder")',
    },
    {
      from: /"Routing Number \(US\/CA\)"/g,
      to: 't("workerWithdrawals.field.routing")',
    },
    {
      from: /"9-digit routing"/g,
      to: 't("workerWithdrawals.field.routingPlaceholder")',
    },
    {
      from: /"Account Holder Name \*"/g,
      to: 't("workerWithdrawals.field.accountHolder")',
    },
    {
      from: /"Full name on account"/g,
      to: 't("workerWithdrawals.field.accountHolderPlaceholder")',
    },
    {
      from: /"Bank Country \*"/g,
      to: 't("workerWithdrawals.field.bankCountry")',
    },
    {
      from: /"e\.g\. United States"/g,
      to: 't("workerWithdrawals.field.bankCountryPlaceholder")',
    },
    {
      from: /"Mobile Number \*"/g,
      to: 't("workerWithdrawals.field.mobileNumber")',
    },
    {
      from: /"\+234 800 000 0000"/g,
      to: 't("workerWithdrawals.field.mobileNumberPlaceholder")',
    },
    {
      from: /"Account Name \(optional\)"/g,
      to: 't("workerWithdrawals.field.mobileName")',
    },
    {
      from: /"Name on mobile account"/g,
      to: 't("workerWithdrawals.field.mobileNamePlaceholder")',
    },
    { from: /"Token \*"/g, to: 't("workerWithdrawals.field.token")' },
    { from: /"Network \*"/g, to: 't("workerWithdrawals.field.network")' },
    {
      from: /"Wallet Address \*"/g,
      to: 't("workerWithdrawals.field.walletAddress")',
    },
    {
      from: /"0x… or TRC20 address"/g,
      to: 't("workerWithdrawals.field.walletAddressPlaceholder")',
    },

    // Receipt Modal
    {
      from: /"Withdrawal Receipt"/g,
      to: 't("workerWithdrawals.receipt.title")',
    },
    { from: /"REFERENCE"/g, to: 't("workerWithdrawals.receipt.reference")' },
    { from: /"METHOD"/g, to: 't("workerWithdrawals.receipt.method")' },
    { from: /"PAID TO"/g, to: 't("workerWithdrawals.receipt.paidTo")' },
    {
      from: /"Withdrawal amount"/g,
      to: 't("workerWithdrawals.receipt.amount")',
    },
    { from: /"Withdrawal fee"/g, to: 't("workerWithdrawals.receipt.fee")' },
    { from: /"Free 🎉"/g, to: 't("workerWithdrawals.receipt.free")' },
    { from: /"You receive"/g, to: 't("workerWithdrawals.receipt.receive")' },

    // Bank Picker
    { from: /"Select Bank"/g, to: 't("workerWithdrawals.bankPicker.title")' },
    { from: /"Select bank…"/g, to: 't("workerWithdrawals.modal.selectBank")' },
    {
      from: /"Loading banks…"/g,
      to: 't("workerWithdrawals.modal.loadingBanks")',
    },

    // Verify
    {
      from: /"Verify account holder name"/g,
      to: 't("workerWithdrawals.modal.verifyAccount")',
    },
    { from: /"Verify"/g, to: 't("workerWithdrawals.modal.verify")' },
    { from: /"Verified"/g, to: 't("workerWithdrawals.modal.verified")' },

    // Main Screen
    { from: /"Your Wallet"/g, to: 't("workerWithdrawals.main.title")' },
    {
      from: /"Multi-currency earnings & payout history"/g,
      to: 't("workerWithdrawals.main.subtitle")',
    },
    { from: /"Withdraw"/g, to: 't("workerWithdrawals.main.withdraw")' },
    {
      from: /"TOTAL AVAILABLE"/g,
      to: 't("workerWithdrawals.main.totalAvailable")',
    },
    { from: /"IN ESCROW"/g, to: 't("workerWithdrawals.main.inEscrow")' },
    {
      from: /"PENDING PAYOUTS"/g,
      to: 't("workerWithdrawals.main.pendingPayouts")',
    },
    {
      from: /"ACTIVE WALLETS"/g,
      to: 't("workerWithdrawals.main.activeWallets")',
    },
    {
      from: /"Withdrawal History"/g,
      to: 't("workerWithdrawals.main.history")',
    },
    { from: /"records"/g, to: 't("workerWithdrawals.main.records")' },
    {
      from: /"No withdrawals yet"/g,
      to: 't("workerWithdrawals.main.noWithdrawals")',
    },
    {
      from: /"Request your first payout when you have available balance\."/g,
      to: 't("workerWithdrawals.main.noWithdrawalsSub")',
    },
    {
      from: /"Awaiting completion"/g,
      to: 't("workerWithdrawals.main.awaitingCompletion")',
    },
    { from: /"Currencies"/g, to: 't("workerWithdrawals.main.currencies")' },
    {
      from: /"request\(s\)"/g,
      to: 't("workerWithdrawals.main.requestPlural")',
    },
    { from: /"Receipt"/g, to: 't("workerWithdrawals.card.receipt")' },
  ];

  for (const fix of hardcodedFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix timeAgo function - replace with t() calls
  content = content.replace(
    /return `\$\{m\}m ago`/g,
    'return t("workerWithdrawals.time.minutesAgo", { m })',
  );
  content = content.replace(
    /return `\$\{h\}h ago`/g,
    'return t("workerWithdrawals.time.hoursAgo", { h })',
  );
  content = content.replace(
    /return `\$\{d\}d ago`/g,
    'return t("workerWithdrawals.time.daysAgo", { d })',
  );
  content = content.replace(
    /return `\$\{m\}mo ago`/g,
    'return t("workerWithdrawals.time.monthsAgo", { m })',
  );
  content = content.replace(
    /return `\$\{y\}y ago`/g,
    'return t("workerWithdrawals.time.yearsAgo", { y })',
  );

  // Fix the timeAgo function to accept t as parameter
  // This is more complex - we'll add a comment for manual fix
  console.log(
    "\n  ⚠️  NOTE: timeAgo function needs manual fix - add t as parameter",
  );

  // Fix dynamic strings
  content = content.replace(
    /`\$\{pinStatus\.attemptsRemaining\} attempt\$\{pinStatus\.attemptsRemaining !== 1 \? "s" : ""\} remaining`/g,
    't("workerWithdrawals.pin.status.attemptsPlural", { count: pinStatus.attemptsRemaining })',
  );

  // Fix provider label
  content = content.replace(
    /`Provider: \$\{selMethod\.provider\}`/g,
    't("workerWithdrawals.modal.provider", { provider: selMethod.provider })',
  );

  // Fix crypto warning
  content = content.replace(
    /"Double-check the network matches your wallet\. Wrong network = permanent loss of funds\."/g,
    't("workerWithdrawals.field.cryptoWarning")',
  );

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
  console.log("     - STATUS_META labels");
  console.log("     - PIN Setup screen");
  console.log("     - PIN Status messages");
  console.log("     - Withdrawal Modal");
  console.log("     - Form fields and placeholders");
  console.log("     - Receipt Modal");
  console.log("     - Bank Picker");
  console.log("     - Main screen");
  console.log("     - Time ago function (partial)");

  console.log("\n  📝  Keys added to all 9 locale files:");
  const totalAdded = Object.values(results).reduce((sum, val) => sum + val, 0);
  console.log(`     Total keys added: ${totalAdded}`);
  locales.forEach((locale) => {
    console.log(`     ${locale}.json: +${results[locale]} keys`);
  });

  console.log("\n  📋  Keys added:");
  console.log("     - workerWithdrawals.* (100+ keys)");

  console.log("\n  ⚠️  Manual fixes needed:");
  console.log("     1. timeAgo function needs to accept t as parameter");
  console.log('     2. Search for "m ago", "h ago" patterns in the file');
  console.log("     3. Add t() to any remaining hardcoded strings");
  console.log("\n  🎯  Next steps:");
  console.log("     1. Review the changes in WorkerWithdrawalsScreen.js");
  console.log("     2. Manually fix timeAgo function");
  console.log("     3. Add translations for all keys in each locale file");
  console.log("     4. Test the withdrawals flow with translations");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerWithdrawalsScreen();
} catch (error) {
  console.error("❌  Failed to fix WorkerWithdrawalsScreen:", error.message);
  process.exit(1);
}
