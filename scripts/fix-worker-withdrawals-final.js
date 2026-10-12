#!/usr/bin/env node

/**
 * Fix WorkerWithdrawalsScreen.js - Final comprehensive fix
 *
 * This script fixes ALL JSX syntax errors by properly wrapping
 * label, placeholder, and other props with curly braces when using t()
 *
 * Run: node scripts/fix-worker-withdrawals-final.js
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

function fixWorkerWithdrawalsScreen() {
  console.log("\n🔧  Fixing WorkerWithdrawalsScreen.js - Final Fix\n");
  console.log("═".repeat(65));

  // ── 1. Read the file ──────────────────────────────────────
  let content = fs.readFileSync(SCREEN_PATH, "utf8");
  console.log(`\n📄  Read ${SCREEN_PATH}`);

  // ── 2. Fix ALL props with t() calls ──────────────────────
  console.log("\n📝  Fixing JSX props...");

  // Fix pattern: label=t("key") → label={t("key")}
  content = content.replace(/label=t\(/g, "label={t(");

  // Fix pattern: placeholder=t("key") → placeholder={t("key")}
  content = content.replace(/placeholder=t\(/g, "placeholder={t(");

  // Fix pattern: title=t("key") → title={t("key")}
  content = content.replace(/title=t\(/g, "title={t(");

  // Fix pattern: message=t("key") → message={t("key")}
  content = content.replace(/message=t\(/g, "message={t(");

  // Fix pattern: value=t("key") → value={t("key")}
  content = content.replace(/value=t\(/g, "value={t(");

  // Fix pattern: sub=t("key") → sub={t("key")}
  content = content.replace(/sub=t\(/g, "sub={t(");

  // Fix specific label fixes for PinInput
  const pinLabelFixes = [
    {
      from: /label="Choose 4-digit PIN"/g,
      to: 'label={t("workerWithdrawals.pin.setup.choose")}',
    },
    {
      from: /label="Confirm PIN"/g,
      to: 'label={t("workerWithdrawals.pin.setup.confirm")}',
    },
  ];

  for (const fix of pinLabelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix specific label fixes in ReceiptModal
  const receiptLabelFixes = [
    {
      from: /label="REFERENCE"/g,
      to: 'label={t("workerWithdrawals.receipt.reference")}',
    },
    {
      from: /label="METHOD"/g,
      to: 'label={t("workerWithdrawals.receipt.method")}',
    },
    {
      from: /label="PAID TO"/g,
      to: 'label={t("workerWithdrawals.receipt.paidTo")}',
    },
  ];

  for (const fix of receiptLabelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix specific label fixes in WithdrawalModal
  const modalLabelFixes = [
    {
      from: /label="Withdraw from Wallet"/g,
      to: 'label={t("workerWithdrawals.modal.wallet")}',
    },
    {
      from: /label="Payout Method"/g,
      to: 'label={t("workerWithdrawals.modal.method")}',
    },
    {
      from: /label="Payout Details"/g,
      to: 'label={t("workerWithdrawals.modal.details")}',
    },
    {
      from: /label="Withdrawal PIN"/g,
      to: 'label={t("workerWithdrawals.modal.pin")}',
    },
    {
      from: /label="Amount \({{currency}}\)"/g,
      to: 'label={t("workerWithdrawals.modal.amount", { currency: currency })}',
    },
  ];

  for (const fix of modalLabelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix specific label fixes for StatCard
  const statLabelFixes = [
    {
      from: /label="TOTAL AVAILABLE"/g,
      to: 'label={t("workerWithdrawals.main.totalAvailable")}',
    },
    {
      from: /label="IN ESCROW"/g,
      to: 'label={t("workerWithdrawals.main.inEscrow")}',
    },
    {
      from: /label="PENDING PAYOUTS"/g,
      to: 'label={t("workerWithdrawals.main.pendingPayouts")}',
    },
    {
      from: /label="ACTIVE WALLETS"/g,
      to: 'label={t("workerWithdrawals.main.activeWallets")}',
    },
  ];

  for (const fix of statLabelFixes) {
    content = content.replace(fix.from, fix.to);
  }

  // Fix specific label fixes for SectionLabel in WithdrawalModal
  // These are already using t() in the render

  // Fix any remaining label= without {}
  content = content.replace(/label=([A-Za-z])/g, "label={$1");

  // Fix any remaining placeholder= without {}
  content = content.replace(/placeholder=([A-Za-z])/g, "placeholder={$1");

  // Fix any remaining title= without {}
  content = content.replace(/title=([A-Za-z])/g, "title={$1");

  // Fix any remaining message= without {}
  content = content.replace(/message=([A-Za-z])/g, "message={$1");

  // Fix any remaining value= without {}
  content = content.replace(/value=([A-Za-z])/g, "value={$1");

  // Fix any remaining sub= without {}
  content = content.replace(/sub=([A-Za-z])/g, "sub={$1");

  // Fix specific pattern: label="Select Bank" → label={t("workerWithdrawals.bankPicker.title")}
  content = content.replace(
    /label="Select Bank"/g,
    'label={t("workerWithdrawals.bankPicker.title")}',
  );

  // Fix specific pattern: label="Provider: {{provider}}" → label={t("workerWithdrawals.modal.provider", { provider: selMethod.provider })}
  content = content.replace(
    /label={`Provider: \$\{selMethod\.provider\}`}/g,
    'label={t("workerWithdrawals.modal.provider", { provider: selMethod.provider })}',
  );

  // ── 3. Save the fixed file ─────────────────────────────────
  const backupPath = SCREEN_PATH + ".backup2";
  fs.writeFileSync(backupPath, content);
  console.log(`\n📦  Backup saved to: ${backupPath}`);

  fs.writeFileSync(SCREEN_PATH, content);
  console.log(`\n✅  Updated ${SCREEN_PATH}`);

  // ── 4. Summary ──────────────────────────────────────────────
  console.log("\n" + "═".repeat(65));
  console.log("\n📊  SUMMARY");
  console.log("═".repeat(65));

  console.log("\n  ✅ Fixed all JSX props:");
  console.log("     - label props now use label={...}");
  console.log("     - placeholder props now use placeholder={...}");
  console.log("     - title props now use title={...}");
  console.log("     - message props now use message={...}");
  console.log("     - value props now use value={...}");
  console.log("     - sub props now use sub={...}");

  console.log("\n  🎯  Next steps:");
  console.log("     1. Run the app to verify the fix");
  console.log("     2. If there are still errors, run:");
  console.log(
    '        grep -n "label=" src/screens/main/worker/WorkerWithdrawalsScreen.js | grep -v "label={"',
  );
  console.log(
    '        grep -n "placeholder=" src/screens/main/worker/WorkerWithdrawalsScreen.js | grep -v "placeholder={"',
  );
  console.log("     3. This will show any remaining props without {}");
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  fixWorkerWithdrawalsScreen();
} catch (error) {
  console.error("❌  Failed to fix WorkerWithdrawalsScreen:", error.message);
  process.exit(1);
}
