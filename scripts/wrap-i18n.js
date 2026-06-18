#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// wrap-i18n.js — Auto-wrap hardcoded strings with t()
// ─────────────────────────────────────────────────────────────────────────────
// RUN AFTER scan-i18n.js.
// Reads i18n-todo.json and rewrites each file, replacing hardcoded strings
// with t('key') calls. Also injects the useTranslation hook if missing.
//
// USAGE:
//   node scripts/wrap-i18n.js              (dry-run — shows diffs only)
//   node scripts/wrap-i18n.js --write      (actually modifies files)
//   node scripts/wrap-i18n.js --file src/screens/Login.jsx --write
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const WRITE = args.includes("--write");
const fileArg = args.indexOf("--file");
const ONLY = fileArg >= 0 ? path.resolve(args[fileArg + 1]) : null;
const ROOT = path.resolve(".");
const TODO_PATH = path.join(ROOT, "i18n-todo.json");

if (!fs.existsSync(TODO_PATH)) {
  console.error("❌  i18n-todo.json not found. Run scan-i18n.js first.");
  process.exit(1);
}

const todo = JSON.parse(fs.readFileSync(TODO_PATH, "utf8"));

// Group by file
const byFile = {};
for (const item of todo) {
  const abs = path.resolve(ROOT, item.file);
  if (ONLY && abs !== ONLY) continue;
  if (!byFile[abs]) byFile[abs] = [];
  byFile[abs].push(item);
}

let totalReplaced = 0;
let totalFiles = 0;

const T_IMPORT = `import { useTranslation } from 'react-i18next';`;
const T_HOOK = `const { t } = useTranslation();`;

for (const [filePath, items] of Object.entries(byFile)) {
  if (!fs.existsSync(filePath)) continue;

  let src = fs.readFileSync(filePath, "utf8");
  const original = src;
  let replaced = 0;

  // Sort by longest string first to avoid partial-replacement bugs
  const sorted = [...items].sort((a, b) => b.raw.length - a.raw.length);

  for (const item of sorted) {
    const { raw, key, pattern } = item;
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (pattern === "jsx_text") {
      // Replace   >Some text<   with   >{t('key')}<
      const re = new RegExp(`(>\\s*)${escaped}(\\s*<)`, "g");
      const next = src.replace(re, `$1{t('${key}')}$2`);
      if (next !== src) {
        src = next;
        replaced++;
      }
    } else if (pattern === "prop") {
      // Replace   placeholder="Some text"   with   placeholder={t('key')}
      const re = new RegExp(
        `((?:placeholder|title|label|message|hint|description|subtitle|heading|buttonText|text|errorMessage|helperText)\\s*=\\s*)["'\`]${escaped}["'\`]`,
        "g",
      );
      const next = src.replace(re, `$1{t('${key}')}`);
      if (next !== src) {
        src = next;
        replaced++;
      }
    } else if (pattern === "alert") {
      // Replace first string arg in Alert.alert("text", ...)
      const re = new RegExp(
        `(Alert\\.alert|showToast|Toast\\.show)\\s*\\(\\s*["'\`]${escaped}["'\`]`,
        "g",
      );
      const next = src.replace(re, `$1(t('${key}')`);
      if (next !== src) {
        src = next;
        replaced++;
      }
    } else {
      // Generic: replace quoted string
      const re = new RegExp(`["'\`]${escaped}["'\`]`, "g");
      const next = src.replace(re, `t('${key}')`);
      if (next !== src) {
        src = next;
        replaced++;
      }
    }
  }

  if (replaced === 0) continue;

  // Inject useTranslation hook if not already present
  const hasImport = src.includes("useTranslation");
  const hasHook = src.includes("const { t }") || src.includes("const {t}");

  if (!hasImport) {
    // Add import after last existing import line
    src = src.replace(/(import\s[^;]+;?\n)(?!import)/, `$1${T_IMPORT}\n`);
  }
  if (!hasHook) {
    // Add hook after first function/component declaration line
    src = src.replace(
      /(export\s+default\s+function\s+\w+[^{]*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/,
      `$1\n  ${T_HOOK}`,
    );
  }

  if (!WRITE) {
    console.log(
      `\n📄  ${path.relative(ROOT, filePath)}  (${replaced} replacements)`,
    );
    // Show a mini diff of the first 3 changes
    const origLines = original.split("\n");
    const newLines = src.split("\n");
    let shown = 0;
    for (let i = 0; i < origLines.length && shown < 3; i++) {
      if (origLines[i] !== newLines[i]) {
        console.log(`  L${i + 1}  - ${origLines[i].trim()}`);
        console.log(`       + ${newLines[i].trim()}`);
        shown++;
      }
    }
    if (replaced > 3) console.log(`       … and ${replaced - 3} more`);
  } else {
    fs.writeFileSync(filePath + ".i18n.bak", original, "utf8"); // backup
    fs.writeFileSync(filePath, src, "utf8");
    console.log(
      `✅  ${path.relative(ROOT, filePath)}  (${replaced} replacements)`,
    );
  }

  totalReplaced += replaced;
  totalFiles++;
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${WRITE ? "✅  WRITE COMPLETE" : "🔍  DRY RUN (no files changed)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Files modified:   ${totalFiles}
  Strings wrapped:  ${totalReplaced}
${!WRITE ? "\n  Run with --write to apply changes." : "  Backups saved as *.i18n.bak\n  Review changes, then: git diff"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
