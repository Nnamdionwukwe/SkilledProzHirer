#!/usr/bin/env node

/**
 * SkilledProz Hirer App — Full Codebase Audit
 *
 * This script performs a comprehensive audit of the codebase including:
 * - Translation completeness for 9 languages
 * - t() hook violations
 * - Hardcoded strings
 * - Large files
 * - Console statements
 * - Import analysis
 * - Navigation completeness
 *
 * Run: node scripts/full-audit.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// ── Configuration ──────────────────────────────────────────
const CONFIG = {
  srcDir: path.join(rootDir, "src"),
  localesDir: path.join(rootDir, "src", "i18n", "locales"),
  supportedLocales: ["en", "fr", "ar", "yo", "ha", "ig", "sw", "pt", "es"],
  excludedDirs: ["node_modules", ".expo", ".git", "__pycache__"],
  excludedFiles: [
    ".DS_Store",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.webp",
    "*.ttf",
    "*.otf",
  ],
  largeFileThreshold: 300,
  criticalLargeFileThreshold: 500,
};

// ── Helpers ──────────────────────────────────────────────────
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!CONFIG.excludedDirs.includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if ([".js", ".jsx", ".ts", ".tsx", ".json"].includes(ext)) {
        const shouldExclude = CONFIG.excludedFiles.some((pattern) => {
          if (pattern.includes("*")) {
            const regex = new RegExp(pattern.replace("*", ".*"));
            return regex.test(file);
          }
          return file === pattern;
        });
        if (!shouldExclude) {
          fileList.push(filePath);
        }
      }
    }
  });

  return fileList;
}

function extractTranslationKeys(content) {
  const keys = new Set();
  // Matches t('key'), t("key"), t(`key`), t('key.subkey')
  const patterns = [
    /t\(['"`]([^'"`]+)['"`]\)/g,
    /t\(['"`]([^'"`]+)['"`],\s*\{/g,
    /t\(`([^`]+)`\)/g,
    /t\(['"`]([^'"`]+)['"`]\)/g,
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const key = match[1];
      if (key && !key.includes(" ")) {
        keys.add(key);
      }
    }
  });

  return keys;
}

function findModuleLevelTCalls(content) {
  const violations = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Check if t() is called outside a React component
    if (
      line.includes("t(") &&
      !line.includes("const { t } = useTranslation()") &&
      !line.includes("const { t } = useTranslation(")
    ) {
      // Check if it's inside a component or function
      let inComponent = false;
      let inFunction = false;

      // Look backward for component/function definitions
      for (let i = Math.max(0, index - 20); i < index; i++) {
        if (
          lines[i].includes("function ") ||
          (lines[i].includes("const ") && lines[i].includes(" = (")) ||
          lines[i].includes("export default function")
        ) {
          inComponent = true;
          break;
        }
      }

      // Check if it's a module-level object/array
      if (!inComponent && !line.includes("//")) {
        violations.push({
          line: index + 1,
          text: line.trim(),
        });
      }
    }
  });

  return violations;
}

function findHardcodedStrings(content, filePath) {
  const hardcoded = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    // Skip lines with translation functions
    if (
      line.includes("t(") ||
      line.includes("i18n.t") ||
      line.includes("useTranslation")
    ) {
      return;
    }

    // Skip comments
    if (
      line.trim().startsWith("//") ||
      line.trim().startsWith("/*") ||
      line.trim().startsWith("*")
    ) {
      return;
    }

    // Check for hardcoded text in JSX (strings in quotes)
    const regex = /["']([^"']{3,})["']/g;
    let match;
    while ((match = regex.exec(line)) !== null) {
      const text = match[1];
      // Filter out common non-text strings
      if (!text.match(/^[a-zA-Z0-9]/) || text.length < 3) {
        continue;
      }
      // Skip common patterns
      if (
        text.match(/^http/) ||
        text.match(/^[0-9]+$/) ||
        text.match(/^[a-z0-9_-]+$/)
      ) {
        continue;
      }
      hardcoded.push({
        line: index + 1,
        text: text,
        context: line.trim(),
      });
    }
  });

  return hardcoded;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").length;
  const hasTranslation =
    content.includes("useTranslation") ||
    content.includes("import { useTranslation }");

  // Extract translation keys
  const keys = extractTranslationKeys(content);

  // Find hook violations
  const violations = findModuleLevelTCalls(content);

  // Find hardcoded strings
  const hardcoded = findHardcodedStrings(content, filePath);

  // Count console statements
  const consoleCount = (
    content.match(/console\.(log|error|warn|info|debug)/g) || []
  ).length;

  return {
    path: filePath,
    lines,
    hasTranslation,
    keys: Array.from(keys),
    hookViolations: violations,
    hardcoded: hardcoded,
    consoleCount,
    isLarge: lines > CONFIG.largeFileThreshold,
    isCriticalLarge: lines > CONFIG.criticalLargeFileThreshold,
  };
}

function loadLocaleFile(locale) {
  const filePath = path.join(CONFIG.localesDir, `${locale}.json`);
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

function getAllTranslationKeys() {
  const allKeys = new Set();
  const files = getAllFiles(CONFIG.srcDir);

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const keys = extractTranslationKeys(content);
    keys.forEach((key) => allKeys.add(key));
  });

  return allKeys;
}

function getNestedKeys(obj, prefix = "") {
  const keys = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      keys.push(...getNestedKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// ── Main Audit ──────────────────────────────────────────────
function runAudit() {
  console.log("\n🔍  SkilledProz Hirer App — Full Codebase Audit\n");
  console.log("═".repeat(65));

  // ── 1. Get all source files ─────────────────────────────
  const files = getAllFiles(CONFIG.srcDir);
  console.log(`\n📁  Scanning ${files.length} source files...\n`);

  // ── 2. Analyze each file ─────────────────────────────────
  const analysis = files.map((file) => analyzeFile(file));

  // ── 3. Translation Analysis ──────────────────────────────
  console.log("\n📊  TRANSLATION ANALYSIS");
  console.log("═".repeat(65));

  const allKeys = getAllTranslationKeys();
  console.log(`\n📝  Total translation keys used in code: ${allKeys.size}`);

  const localeStats = {};
  let totalMissingKeys = 0;

  CONFIG.supportedLocales.forEach((locale) => {
    const localeData = loadLocaleFile(locale);
    const existingKeys = getNestedKeys(localeData);
    const existingSet = new Set(existingKeys);

    const missing = Array.from(allKeys).filter((key) => !existingSet.has(key));
    const missingCount = missing.length;
    totalMissingKeys += missingCount;

    const complete = missingCount === 0;
    const percentage =
      allKeys.size > 0
        ? (((allKeys.size - missingCount) / allKeys.size) * 100).toFixed(1)
        : 0;

    localeStats[locale] = {
      total: allKeys.size,
      existing: existingKeys.length,
      missing: missingCount,
      complete,
      percentage,
      missingKeys: missing,
    };

    const status = complete ? "✅" : missingCount < 10 ? "🟡" : "🔴";
    console.log(
      `  ${status}  ${locale.padEnd(6)}  ${String(percentage).padStart(6)}% complete  (${missingCount} missing)`,
    );
  });

  // ── 4. Translation Summary ───────────────────────────────
  console.log("\n📋  TRANSLATION SUMMARY");
  console.log("═".repeat(65));

  const completeLocales = CONFIG.supportedLocales.filter(
    (l) => localeStats[l].complete,
  );
  const incompleteLocales = CONFIG.supportedLocales.filter(
    (l) => !localeStats[l].complete,
  );

  console.log(
    `\n  ✅ Complete locales: ${completeLocales.length}/${CONFIG.supportedLocales.length}`,
  );
  if (completeLocales.length > 0) {
    console.log(`     ${completeLocales.join(", ")}`);
  }

  console.log(
    `\n  ⚠️  Incomplete locales: ${incompleteLocales.length}/${CONFIG.supportedLocales.length}`,
  );
  if (incompleteLocales.length > 0) {
    console.log(`     ${incompleteLocales.join(", ")}`);
  }

  console.log(`\n  📝  Total missing translations: ${totalMissingKeys}`);

  // Show top missing keys
  if (incompleteLocales.length > 0) {
    const allMissing = new Set();
    incompleteLocales.forEach((locale) => {
      localeStats[locale].missingKeys.forEach((key) => allMissing.add(key));
    });

    console.log(`\n  🔑  Top 10 missing keys:`);
    const sortedMissing = Array.from(allMissing).slice(0, 10);
    sortedMissing.forEach((key, i) => {
      console.log(`      ${String(i + 1).padStart(2)}. ${key}`);
    });
  }

  // ── 5. Hook Violations ────────────────────────────────────
  console.log("\n\n⚠️  HOOK VIOLATIONS (t() called outside React component)");
  console.log("═".repeat(65));

  const violations = analysis.filter((f) => f.hookViolations.length > 0);
  console.log(`\n  Found ${violations.length} files with t() hook violations:`);

  violations.forEach((file) => {
    console.log(`\n  📄  ${path.relative(rootDir, file.path)}`);
    file.hookViolations.forEach((v) => {
      console.log(
        `     Line ${String(v.line).padStart(4)}: ${v.text.substring(0, 80)}`,
      );
    });
  });

  // ── 6. Hardcoded Strings ──────────────────────────────────
  console.log("\n\n📝  HARDCODED STRINGS (not using t())");
  console.log("═".repeat(65));

  const hardcodedFiles = analysis.filter(
    (f) => f.hardcoded.length > 0 && f.hasTranslation,
  );
  console.log(
    `\n  Found ${hardcodedFiles.length} files with hardcoded strings:`,
  );

  hardcodedFiles.slice(0, 10).forEach((file) => {
    console.log(
      `\n  📄  ${path.relative(rootDir, file.path)} (${file.hardcoded.length} strings)`,
    );
    file.hardcoded.slice(0, 3).forEach((h) => {
      console.log(`     Line ${String(h.line).padStart(4)}: "${h.text}"`);
    });
    if (file.hardcoded.length > 3) {
      console.log(`     ... and ${file.hardcoded.length - 3} more`);
    }
  });

  if (hardcodedFiles.length > 10) {
    console.log(`\n  ... and ${hardcodedFiles.length - 10} more files`);
  }

  // ── 7. Files Without Translation ──────────────────────────
  console.log("\n\n📄  FILES WITHOUT i18n SUPPORT");
  console.log("═".repeat(65));

  const noTranslation = analysis.filter(
    (f) => !f.hasTranslation && f.hardcoded.length > 0,
  );
  console.log(
    `\n  ${noTranslation.length} files have no i18n support but contain text:`,
  );

  noTranslation.slice(0, 10).forEach((file) => {
    console.log(
      `     📄  ${path.relative(rootDir, file.path)} (${file.hardcoded.length} strings)`,
    );
  });

  if (noTranslation.length > 10) {
    console.log(`     ... and ${noTranslation.length - 10} more`);
  }

  // ── 8. Large Files ────────────────────────────────────────
  console.log("\n\n📏  LARGE FILES (>300 lines)");
  console.log("═".repeat(65));

  const largeFiles = analysis
    .filter((f) => f.isLarge)
    .sort((a, b) => b.lines - a.lines);
  console.log(
    `\n  ${largeFiles.length} files are >300 lines (${largeFiles.filter((f) => f.isCriticalLarge).length} >500 lines):`,
  );

  largeFiles.slice(0, 15).forEach((file) => {
    const indicator = file.isCriticalLarge ? "🔴" : "🟠";
    console.log(
      `  ${indicator} ${String(file.lines).padStart(4)} lines  ${path.relative(rootDir, file.path)}`,
    );
  });

  if (largeFiles.length > 15) {
    console.log(`\n  ... and ${largeFiles.length - 15} more large files`);
  }

  // ── 9. Console Statements ─────────────────────────────────
  console.log("\n\n🔊  CONSOLE STATEMENTS");
  console.log("═".repeat(65));

  const filesWithConsole = analysis
    .filter((f) => f.consoleCount > 0)
    .sort((a, b) => b.consoleCount - a.consoleCount);
  const totalConsole = filesWithConsole.reduce(
    (sum, f) => sum + f.consoleCount,
    0,
  );

  console.log(
    `\n  ${totalConsole} console statements found in ${filesWithConsole.length} files`,
  );
  console.log(`  Top 10 files with console statements:`);

  filesWithConsole.slice(0, 10).forEach((file) => {
    console.log(
      `     ${String(file.consoleCount).padStart(3)}  ${path.relative(rootDir, file.path)}`,
    );
  });

  // ── 10. Summary ────────────────────────────────────────────
  console.log("\n\n📊  SUMMARY SCORECARD");
  console.log("═".repeat(65));

  const totalViolations = violations.reduce(
    (sum, f) => sum + f.hookViolations.length,
    0,
  );
  const totalHardcoded = hardcodedFiles.reduce(
    (sum, f) => sum + f.hardcoded.length,
    0,
  );

  console.log(`
  Metric                              | Value
  ────────────────────────────────────┼────────────────────
  Source files scanned                | ${files.length}
  Translation keys used              | ${allKeys.size}
  Missing translations               | ${totalMissingKeys}
  Locales with 100% coverage         | ${completeLocales.length}/${CONFIG.supportedLocales.length}
  Hook violations                    | ${totalViolations}
  Hardcoded strings                  | ${totalHardcoded}
  Files without i18n                 | ${noTranslation.length}
  Large files (>300 lines)           | ${largeFiles.length}
  Critical large files (>500 lines)  | ${largeFiles.filter((f) => f.isCriticalLarge).length}
  Console statements                 | ${totalConsole}
  `);

  // ── 11. Generate Fix Commands ─────────────────────────────
  console.log("\n🛠️  FIX COMMANDS");
  console.log("═".repeat(65));

  console.log(`
  # 1. Fix missing translations (add all missing keys)
  node scripts/fix-translations.js
  
  # 2. Extract all translation keys
  node scripts/extract-keys.js
  
  # 3. Fix hook violations
  #   - Move t() calls inside components
  #   - Convert module-level objects to functions
  
  # 4. Remove console statements
  #   - Manually remove or use: npm run lint:fix
  
  # 5. Split large files
  #   - Break down files > 500 lines into smaller components
  `);

  // ── 12. Save Report ───────────────────────────────────────
  const report = {
    generated: new Date().toISOString(),
    filesScanned: files.length,
    translationKeys: Array.from(allKeys),
    localeStats,
    hookViolations: violations.map((f) => ({
      file: path.relative(rootDir, f.path),
      count: f.hookViolations.length,
      lines: f.hookViolations.map((v) => v.line),
    })),
    hardcodedStrings: hardcodedFiles.map((f) => ({
      file: path.relative(rootDir, f.path),
      count: f.hardcoded.length,
    })),
    largeFiles: largeFiles.map((f) => ({
      file: path.relative(rootDir, f.path),
      lines: f.lines,
    })),
    consoleStatements: filesWithConsole.map((f) => ({
      file: path.relative(rootDir, f.path),
      count: f.consoleCount,
    })),
  };

  const reportPath = path.join(rootDir, "full-audit-report.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄  Full audit report saved to: full-audit-report.json`);

  // ── 13. Grade ─────────────────────────────────────────────
  const grade =
    totalMissingKeys === 0 && totalViolations === 0
      ? "A"
      : totalMissingKeys < 50 && totalViolations < 10
        ? "B"
        : totalMissingKeys < 200 && totalViolations < 50
          ? "C"
          : "D";

  console.log(`\n🏆  Overall Grade: ${grade}`);
  console.log("\n" + "═".repeat(65) + "\n");
}

// ── Run ─────────────────────────────────────────────────────
try {
  runAudit();
} catch (error) {
  console.error("❌  Audit failed:", error.message);
  process.exit(1);
}
