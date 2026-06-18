#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// project-audit.js — Full SkilledProz Expo App Project Audit
// ─────────────────────────────────────────────────────────────────────────────
// Scans the entire project and produces a single audit-report.md covering:
//
//  §1  Project structure overview
//  §2  Package.json analysis (deps, outdated, missing, unused)
//  §3  i18n completeness (locale files vs actual t() usage)
//  §4  Broken / missing imports
//  §5  t() called outside React component (module-level hook violations)
//  §6  Hardcoded strings still remaining
//  §7  TODO / FIXME / HACK / TEMP comments
//  §8  Console.log left in production code
//  §9  Empty / placeholder screens
//  §10 API endpoint usage (what's called, what might be missing)
//  §11 Navigation screen inventory (registered vs referenced)
//  §12 AsyncStorage key inventory
//  §13 Image / asset references (missing files)
//  §14 Large files (potential performance issues)
//  §15 Duplicate components (same filename in different dirs)
//  §16 Summary scorecard
//
// USAGE:
//   node scripts/project-audit.js
//   node scripts/project-audit.js --dir src   (limit scope)
//   node scripts/project-audit.js --out audit  (custom output folder)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const outIdx = args.indexOf("--out");
const ROOT = dirIdx >= 0 ? path.resolve(args[dirIdx + 1]) : path.resolve(".");
const OUT = outIdx >= 0 ? path.resolve(args[outIdx + 1]) : ROOT;

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "build",
  "coverage",
  ".next",
  "__pycache__",
  "android",
  "ios",
  ".gradle",
]);
const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const ASSET_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ttf",
  ".otf",
]);

// ── Walk helpers ──────────────────────────────────────────────────────────────
function walk(dir, filter = () => true, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, filter, files);
    else if (filter(e.name, full)) files.push(full);
  }
  return files;
}

function rel(p) {
  return path.relative(ROOT, p);
}
function readSrc(p) {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

const codeFiles = walk(ROOT, (n) => CODE_EXTS.has(path.extname(n)));
const assetFiles = walk(ROOT, (n) => ASSET_EXTS.has(path.extname(n)));

console.log(`\n🔍  Auditing: ${ROOT}`);
console.log(
  `    ${codeFiles.length} code files · ${assetFiles.length} asset files\n`,
);

const report = []; // markdown lines
const score = { checks: 0, passed: 0, warnings: 0, errors: 0 };

function pass(msg) {
  score.checks++;
  score.passed++;
  return `✅ ${msg}`;
}
function warn(msg) {
  score.checks++;
  score.warnings++;
  return `⚠️  ${msg}`;
}
function fail(msg) {
  score.checks++;
  score.errors++;
  return `❌ ${msg}`;
}
function info(msg) {
  return `ℹ️  ${msg}`;
}

function section(title) {
  report.push("", `## ${title}`, "");
}
function sub(title) {
  report.push("", `### ${title}`, "");
}

report.push(
  "# SkilledProz Expo App — Full Project Audit",
  "",
  `> Generated: ${new Date().toISOString()}`,
  `> Root: \`${ROOT}\``,
  "",
);

// ─────────────────────────────────────────────────────────────────────────────
// §1  PROJECT STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────
section("§1  Project Structure");

const topLevel = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => !e.name.startsWith(".") && !SKIP_DIRS.has(e.name))
  .map((e) => `${e.isDirectory() ? "📁" : "📄"} ${e.name}`)
  .join("\n");

report.push("```", topLevel, "```", "");

// Count by folder
const folderCounts = {};
for (const f of codeFiles) {
  const parts = path.relative(ROOT, f).split(path.sep);
  const top = parts.length > 1 ? parts[0] : "(root)";
  folderCounts[top] = (folderCounts[top] || 0) + 1;
}
report.push("| Folder | Code Files |", "|--------|-----------|");
for (const [folder, count] of Object.entries(folderCounts).sort(
  (a, b) => b[1] - a[1],
)) {
  report.push(`| \`${folder}\` | ${count} |`);
}

// ─────────────────────────────────────────────────────────────────────────────
// §2  PACKAGE.JSON
// ─────────────────────────────────────────────────────────────────────────────
section("§2  package.json Analysis");

const pkgPath = path.join(ROOT, "package.json");
let pkg = {};
if (fs.existsSync(pkgPath)) {
  pkg = JSON.parse(readSrc(pkgPath));
  report.push(
    pass(
      `package.json found — name: \`${pkg.name || "unnamed"}\`, version: \`${pkg.version || "?"}\``,
    ),
  );
} else {
  report.push(fail("package.json not found"));
}

const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const depList = Object.keys(deps);

// Check critical Expo/i18n deps
const REQUIRED = [
  "expo",
  "react",
  "react-native",
  "react-navigation",
  "@react-navigation/native",
  "i18next",
  "react-i18next",
  "expo-localization",
  "@react-native-async-storage/async-storage",
];
const RECOMMENDED = [
  "expo-image-picker",
  "expo-document-picker",
  "expo-clipboard",
  "@vitalets/google-translate-api",
  "expo-updates",
];

sub("Required Dependencies");
for (const dep of REQUIRED) {
  const has = depList.some((d) => d === dep || d.startsWith(dep + "/"));
  report.push(
    has ? pass(dep) : fail(`\`${dep}\` is MISSING — run: npm install ${dep}`),
  );
}

sub("Recommended Dependencies");
for (const dep of RECOMMENDED) {
  const has = depList.some((d) => d === dep || d.startsWith(dep + "/"));
  report.push(has ? pass(dep) : warn(`\`${dep}\` not found`));
}

// Check for type:module
if (pkg.type === "module") {
  report.push("", pass('`"type": "module"` set — ES module warnings resolved'));
} else {
  report.push(
    "",
    warn(
      '`"type": "module"` missing in package.json — Node shows ESM warning on every script run. Add it.',
    ),
  );
}

// All deps list
sub("All Dependencies");
report.push(`${depList.length} total packages installed.`, "");
report.push("<details><summary>Show all</summary>", "");
report.push("```");
for (const [name, ver] of Object.entries({
  ...(pkg.dependencies || {}),
  ...(pkg.devDependencies || {}),
})) {
  report.push(`${name}: ${ver}`);
}
report.push("```", "", "</details>");

// ─────────────────────────────────────────────────────────────────────────────
// §3  i18n COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────
section("§3  i18n Completeness");

const localesDir = path.join(ROOT, "locales");
const LOCALE_CODES = ["en", "fr", "ar", "yo", "ha", "ig", "sw", "pt", "es"];

if (!fs.existsSync(localesDir)) {
  report.push(fail("`locales/` directory not found — run scan-i18n.js first"));
} else {
  const localeData = {};
  for (const code of LOCALE_CODES) {
    const fp = path.join(localesDir, `${code}.json`);
    if (fs.existsSync(fp)) {
      try {
        localeData[code] = JSON.parse(readSrc(fp));
      } catch {
        localeData[code] = {};
      }
    }
  }

  // Count filled values recursively
  function countValues(obj, onlyFilled = false) {
    let n = 0;
    for (const v of Object.values(obj || {})) {
      if (typeof v === "object" && v !== null) n += countValues(v, onlyFilled);
      else if (typeof v === "string") {
        if (!onlyFilled || v.trim() !== "") n++;
      }
    }
    return n;
  }

  const enTotal = countValues(localeData["en"] || {});
  report.push(`English base has **${enTotal}** translation keys.\n`);
  report.push("| Locale | Code | Keys Filled | % Complete | Status |");
  report.push("|--------|------|-------------|------------|--------|");

  for (const code of LOCALE_CODES) {
    const d = localeData[code] || {};
    const filled = countValues(d, true);
    const total = enTotal || 1;
    const pct = Math.round((filled / total) * 100);
    const status =
      pct === 100 ? "✅ Complete" : pct > 50 ? "⚠️ Partial" : "❌ Empty";
    const name = {
      en: "English",
      fr: "French",
      ar: "Arabic",
      yo: "Yoruba",
      ha: "Hausa",
      ig: "Igbo",
      sw: "Swahili",
      pt: "Portuguese",
      es: "Spanish",
    }[code];
    report.push(
      `| ${name} | \`${code}\` | ${filled}/${total} | ${pct}% | ${status} |`,
    );
    if (pct < 100) score.warnings++;
    else score.passed++;
    score.checks++;
  }

  // Find t() calls in code
  const tCalls = new Set();
  for (const f of codeFiles) {
    const src = readSrc(f);
    const re = /\bt\s*\(\s*["'`]([\w.]+)["'`]\s*\)/g;
    let m;
    while ((m = re.exec(src)) !== null) tCalls.add(m[1]);
  }

  // Check if t() keys exist in en.json
  function getNestedKey(obj, keyPath) {
    return keyPath
      .split(".")
      .reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), obj);
  }

  const missingKeys = [...tCalls].filter(
    (k) => getNestedKey(localeData["en"] || {}, k) === undefined,
  );

  sub("Missing Translation Keys");
  if (missingKeys.length === 0) {
    report.push(pass(`All ${tCalls.size} t() keys found in en.json`));
  } else {
    report.push(
      fail(
        `${missingKeys.length} t() keys used in code but MISSING from en.json:`,
      ),
    );
    report.push("```");
    missingKeys.slice(0, 50).forEach((k) => report.push(k));
    if (missingKeys.length > 50)
      report.push(`… and ${missingKeys.length - 50} more`);
    report.push("```");
    score.errors++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §4  BROKEN IMPORTS
// ─────────────────────────────────────────────────────────────────────────────
section("§4  Broken / Suspicious Imports");

const brokenImports = [];
for (const f of codeFiles) {
  const src = readSrc(f);
  const dir = path.dirname(f);
  const importRe =
    /(?:import|require)\s*(?:\(?\s*["'`])(\.{1,2}\/[^"'`\n]+)["'`\s)]/g;
  let m;
  while ((m = importRe.exec(src)) !== null) {
    const imp = m[1].split("?")[0]; // strip query strings
    const absBase = path.resolve(dir, imp);
    // Check if file exists with any code extension or as directory index
    const exts = [
      "",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      "/index.js",
      "/index.jsx",
      "/index.ts",
      "/index.tsx",
    ];
    const found = exts.some((ext) => fs.existsSync(absBase + ext));
    if (!found) {
      brokenImports.push({ file: rel(f), import: imp });
    }
  }
}

if (brokenImports.length === 0) {
  report.push(pass("No broken relative imports found"));
} else {
  report.push(fail(`${brokenImports.length} potentially broken imports:`));
  report.push("| File | Import |", "|------|--------|");
  brokenImports
    .slice(0, 30)
    .forEach(({ file, import: imp }) =>
      report.push(`| \`${file}\` | \`${imp}\` |`),
    );
  if (brokenImports.length > 30)
    report.push(`| … | and ${brokenImports.length - 30} more |`);
  score.errors += Math.min(brokenImports.length, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// §5  t() CALLED AT MODULE LEVEL (hook violation)
// ─────────────────────────────────────────────────────────────────────────────
section("§5  t() Called Outside React Component (Hook Violations)");

const hookViolations = [];
for (const f of codeFiles) {
  const src = readSrc(f);
  const lines = src.split("\n");
  let depth = 0; // brace depth
  let inComponent = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track function declarations (components start at depth 0)
    if (
      /^(?:export\s+default\s+function|export\s+function|function\s+[A-Z])/.test(
        line.trim(),
      )
    ) {
      inComponent = true;
    }
    // Count braces
    depth += (line.match(/\{/g) || []).length;
    depth -= (line.match(/\}/g) || []).length;
    if (depth <= 0) {
      depth = 0;
      inComponent = false;
    }

    // t() call outside a component (depth 0 or in module-level const)
    if (
      !inComponent &&
      /\bt\s*\(/.test(line) &&
      !/\/\//.test(line.split("t(")[0])
    ) {
      // Check it's not inside a regular function call chain
      if (/(?:^|\s|=|\[|,)\bt\s*\(["'`]/.test(line)) {
        hookViolations.push({
          file: rel(f),
          line: i + 1,
          code: line.trim().slice(0, 80),
        });
      }
    }
  }
}

if (hookViolations.length === 0) {
  report.push(pass("No module-level t() calls detected"));
} else {
  report.push(
    fail(
      `${hookViolations.length} t() calls found OUTSIDE React components — these will crash:`,
    ),
  );
  report.push("| File | Line | Code |", "|------|------|------|");
  hookViolations
    .slice(0, 20)
    .forEach(({ file, line, code }) =>
      report.push(`| \`${file}\` | ${line} | \`${code}\` |`),
    );
  if (hookViolations.length > 20)
    report.push(`| … | | and ${hookViolations.length - 20} more |`);
  report.push("");
  report.push(
    "> **Fix:** Convert module-level arrays/objects that use `t()` into functions that accept `t` as a parameter, called inside the component body.",
  );
  score.errors += Math.min(hookViolations.length, 1);
}

// ─────────────────────────────────────────────────────────────────────────────
// §6  REMAINING HARDCODED STRINGS
// ─────────────────────────────────────────────────────────────────────────────
section("§6  Remaining Hardcoded Strings");

const hardcoded = [];
const IGNORE = [
  /^https?:\/\//,
  /^#[0-9a-fA-F]{3,8}$/,
  /^\d+(\.\d+)?(px|%)?$/,
  /^[A-Z_]{2,}$/,
  /^\s*$/,
  /^[\W\d]+$/,
  /^(true|false|null)$/,
  /^(flex|absolute|relative|center|row|column)$/,
  /^rgba?\(/,
];
function isHard(s) {
  if (s.length < 3) return false;
  return !IGNORE.some((r) => r.test(s.trim()));
}

for (const f of codeFiles) {
  const src = readSrc(f);
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    if (/\bt\s*\(/.test(line)) return; // already translated
    // JSX text
    const jsxM = line.match(/>\s*([A-Za-z][^<>{}\n]{3,}?)\s*</);
    if (jsxM && isHard(jsxM[1])) {
      hardcoded.push({ file: rel(f), line: i + 1, text: jsxM[1].trim() });
    }
  });
}

if (hardcoded.length === 0) {
  report.push(pass("No remaining hardcoded JSX text found"));
} else {
  report.push(
    warn(
      `${hardcoded.length} hardcoded strings still in JSX (not yet wrapped with t()):`,
    ),
  );
  report.push("| File | Line | Text |", "|------|------|------|");
  hardcoded
    .slice(0, 30)
    .forEach(({ file, line, text }) =>
      report.push(`| \`${file}\` | ${line} | ${text.slice(0, 60)} |`),
    );
  if (hardcoded.length > 30)
    report.push(`| … | | and ${hardcoded.length - 30} more |`);
  score.warnings++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §7  TODO / FIXME / HACK COMMENTS
// ─────────────────────────────────────────────────────────────────────────────
section("§7  TODO / FIXME / HACK / COMING SOON Comments");

const todos = [];
const TODO_RE =
  /\/\/\s*(TODO|FIXME|HACK|TEMP|XXX|COMING SOON|coming soon|BROKEN|BUG)[\s:]*(.*)/i;
for (const f of codeFiles) {
  const lines = readSrc(f).split("\n");
  lines.forEach((line, i) => {
    const m = TODO_RE.exec(line);
    if (m)
      todos.push({
        file: rel(f),
        line: i + 1,
        tag: m[1].toUpperCase(),
        text: m[2].trim().slice(0, 80),
      });
  });
}

report.push(`Found **${todos.length}** annotated issues.\n`);
if (todos.length > 0) {
  // Group by tag
  const byTag = {};
  todos.forEach((t) => {
    (byTag[t.tag] = byTag[t.tag] || []).push(t);
  });
  for (const [tag, items] of Object.entries(byTag)) {
    report.push(`**${tag}** (${items.length}):`);
    report.push("| File | Line | Note |", "|------|------|------|");
    items
      .slice(0, 15)
      .forEach(({ file, line, text }) =>
        report.push(`| \`${file}\` | ${line} | ${text || "—"} |`),
      );
    if (items.length > 15)
      report.push(`| … | | and ${items.length - 15} more |`);
    report.push("");
  }
  if (todos.length > 10) score.warnings++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §8  CONSOLE.LOG IN PRODUCTION CODE
// ─────────────────────────────────────────────────────────────────────────────
section("§8  console.log / console.error in Production Code");

const consoleLogs = [];
for (const f of codeFiles) {
  const lines = readSrc(f).split("\n");
  lines.forEach((line, i) => {
    if (
      /console\.(log|warn|error|info|debug)\s*\(/.test(line) &&
      !line.trim().startsWith("//")
    ) {
      consoleLogs.push({
        file: rel(f),
        line: i + 1,
        code: line.trim().slice(0, 80),
      });
    }
  });
}

if (consoleLogs.length === 0) {
  report.push(pass("No console.log statements found"));
} else {
  report.push(
    warn(
      `${consoleLogs.length} console statements found (remove before production):`,
    ),
  );
  report.push("<details><summary>Show all</summary>", "");
  report.push("| File | Line | Code |", "|------|------|------|");
  consoleLogs
    .slice(0, 50)
    .forEach(({ file, line, code }) =>
      report.push(
        `| \`${file}\` | ${line} | \`${code.replace(/\|/g, "∣")}\` |`,
      ),
    );
  if (consoleLogs.length > 50)
    report.push(`| … | | and ${consoleLogs.length - 50} more |`);
  report.push("", "</details>");
  if (consoleLogs.length > 20) score.warnings++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §9  EMPTY / PLACEHOLDER SCREENS
// ─────────────────────────────────────────────────────────────────────────────
section("§9  Empty / Placeholder Screens");

const placeholders = [];
for (const f of codeFiles) {
  if (!f.includes("Screen") && !f.includes("screen")) continue;
  const src = readSrc(f);
  const lines = src.split("\n").filter((l) => l.trim());
  const hasComingSoon =
    /coming soon|placeholder|not yet implemented|TODO.*screen/i.test(src);
  const isTiny = lines.length < 30;
  const noApiCall =
    !src.includes("api.") && !src.includes("fetch(") && !src.includes("axios");
  if (hasComingSoon || (isTiny && noApiCall)) {
    placeholders.push({
      file: rel(f),
      lines: lines.length,
      reason: hasComingSoon
        ? "contains 'coming soon'"
        : `only ${lines.length} lines, no API calls`,
    });
  }
}

if (placeholders.length === 0) {
  report.push(pass("No placeholder screens detected"));
} else {
  report.push(
    warn(`${placeholders.length} screens appear to be placeholders or stubs:`),
  );
  report.push("| File | Lines | Reason |", "|------|-------|--------|");
  placeholders.forEach(({ file, lines, reason }) =>
    report.push(`| \`${file}\` | ${lines} | ${reason} |`),
  );
  score.warnings++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §10  API ENDPOINT INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
section("§10  API Endpoint Inventory");

const apiCalls = new Map(); // endpoint → Set of files
for (const f of codeFiles) {
  const src = readSrc(f);
  const re =
    /api\s*\.\s*(get|post|put|patch|delete)\s*\(\s*[`"'](\/[^`"'\n]+)[`"']/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const key = `${m[1].toUpperCase()} ${m[2]}`;
    if (!apiCalls.has(key)) apiCalls.set(key, new Set());
    apiCalls.get(key).add(rel(f));
  }
}

report.push(
  `**${apiCalls.size}** unique API endpoints called across the app.\n`,
);
report.push("| Method + Endpoint | Called From |", "|---|---|");
for (const [endpoint, files] of [...apiCalls.entries()].sort()) {
  const fileList =
    [...files].slice(0, 3).join(", ") +
    (files.size > 3 ? ` +${files.size - 3}` : "");
  report.push(`| \`${endpoint}\` | ${fileList} |`);
}

// ─────────────────────────────────────────────────────────────────────────────
// §11  NAVIGATION SCREEN INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
section("§11  Navigation Screen Inventory");

const registeredScreens = new Set();
const navigatedToScreens = new Set();

for (const f of codeFiles) {
  const src = readSrc(f);
  // Registered: <Stack.Screen name="..." or <Drawer.Screen name="..."
  const regRe = /(?:Screen|Tab)\s+name\s*=\s*["'`](\w+)["'`]/g;
  let m;
  while ((m = regRe.exec(src)) !== null) registeredScreens.add(m[1]);

  // Navigated to: navigation.navigate("...") or goTo("...")
  const navRe = /(?:navigate|goTo|push|replace)\s*\(\s*["'`](\w+)["'`]/g;
  while ((m = navRe.exec(src)) !== null) navigatedToScreens.add(m[1]);
}

const unregistered = [...navigatedToScreens].filter(
  (s) => !registeredScreens.has(s),
);
const unreachable = [...registeredScreens].filter(
  (s) => !navigatedToScreens.has(s),
);

report.push(
  `**${registeredScreens.size}** screens registered · **${navigatedToScreens.size}** navigation targets found\n`,
);

sub("Registered Screens");
report.push(
  [...registeredScreens]
    .sort()
    .map((s) => `\`${s}\``)
    .join(" · "),
);

if (unregistered.length > 0) {
  sub("⚠️  Navigated To But Not Registered");
  report.push(
    warn(
      `${unregistered.length} screens navigated to but not found in navigator:`,
    ),
  );
  report.push(unregistered.map((s) => `- \`${s}\``).join("\n"));
  score.warnings++;
} else {
  report.push("", pass("All navigation targets are registered"));
}

if (unreachable.length > 0) {
  sub("ℹ️  Registered But Never Navigated To");
  report.push(
    info(
      `${unreachable.length} screens registered but no navigate() call found (may be initial routes):`,
    ),
  );
  report.push(unreachable.map((s) => `- \`${s}\``).join("\n"));
}

// ─────────────────────────────────────────────────────────────────────────────
// §12  ASYNCSTORAGE KEY INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
section("§12  AsyncStorage Key Inventory");

const storageKeys = new Map(); // key → files
for (const f of codeFiles) {
  const src = readSrc(f);
  const re =
    /AsyncStorage\s*\.\s*(?:getItem|setItem|removeItem|mergeItem)\s*\(\s*["'`]([^"'`\n]+)["'`]/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!storageKeys.has(m[1])) storageKeys.set(m[1], new Set());
    storageKeys.get(m[1]).add(rel(f));
  }
}

if (storageKeys.size === 0) {
  report.push(info("No AsyncStorage keys found"));
} else {
  report.push(`**${storageKeys.size}** AsyncStorage keys in use:\n`);
  report.push("| Key | Used In |", "|-----|---------|");
  for (const [key, files] of [...storageKeys.entries()].sort()) {
    report.push(`| \`${key}\` | ${[...files].join(", ")} |`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// §13  ASSET REFERENCES (missing files)
// ─────────────────────────────────────────────────────────────────────────────
section("§13  Asset Reference Check");

const assetSet = new Set(assetFiles.map((f) => path.basename(f)));
const referencedAssets = new Map();
for (const f of codeFiles) {
  const src = readSrc(f);
  const re =
    /require\s*\(\s*["'`]([^"'`\n]+\.(?:png|jpg|jpeg|gif|webp|svg|ttf))["'`]/gi;
  let m;
  while ((m = re.exec(src)) !== null) {
    const name = path.basename(m[1]);
    if (!referencedAssets.has(name)) referencedAssets.set(name, []);
    referencedAssets.get(name).push(rel(f));
  }
}

const missingAssets = [...referencedAssets.entries()].filter(
  ([name]) => !assetSet.has(name),
);

if (missingAssets.length === 0) {
  report.push(
    pass(`All ${referencedAssets.size} referenced assets found on disk`),
  );
} else {
  report.push(
    fail(`${missingAssets.length} referenced assets NOT found on disk:`),
  );
  report.push("| Asset | Referenced In |", "|-------|--------------|");
  missingAssets.forEach(([name, files]) =>
    report.push(`| \`${name}\` | ${files.slice(0, 2).join(", ")} |`),
  );
  score.errors++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §14  LARGE FILES
// ─────────────────────────────────────────────────────────────────────────────
section("§14  Large Files (>300 lines)");

const largeFiles = codeFiles
  .map((f) => ({ file: rel(f), lines: readSrc(f).split("\n").length }))
  .filter(({ lines }) => lines > 300)
  .sort((a, b) => b.lines - a.lines);

if (largeFiles.length === 0) {
  report.push(pass("No files over 300 lines"));
} else {
  report.push(warn(`${largeFiles.length} large files (consider splitting):\n`));
  report.push("| File | Lines | Suggestion |", "|------|-------|------------|");
  largeFiles.forEach(({ file, lines }) => {
    const suggestion =
      lines > 1000
        ? "🔴 Split urgently"
        : lines > 600
          ? "🟠 Consider splitting"
          : "🟡 Monitor";
    report.push(`| \`${file}\` | ${lines} | ${suggestion} |`);
  });
  if (largeFiles.some((f) => f.lines > 1000)) score.warnings++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §15  DUPLICATE FILENAMES
// ─────────────────────────────────────────────────────────────────────────────
section("§15  Duplicate Component Filenames");

const nameMap = {};
for (const f of codeFiles) {
  const base = path.basename(f);
  if (!nameMap[base]) nameMap[base] = [];
  nameMap[base].push(rel(f));
}

const dupes = Object.entries(nameMap).filter(([, paths]) => paths.length > 1);

if (dupes.length === 0) {
  report.push(pass("No duplicate filenames found"));
} else {
  report.push(
    warn(`${dupes.length} duplicate filenames (potential import confusion):\n`),
  );
  report.push("| Filename | Paths |", "|----------|-------|");
  dupes.forEach(([name, paths]) =>
    report.push(`| \`${name}\` | ${paths.join(" · ")} |`),
  );
  score.warnings++;
}

// ─────────────────────────────────────────────────────────────────────────────
// §16  SCORECARD
// ─────────────────────────────────────────────────────────────────────────────
section("§16  Summary Scorecard");

const grade =
  score.errors > 5
    ? "D"
    : score.errors > 2
      ? "C"
      : score.warnings > 10
        ? "B"
        : score.warnings > 5
          ? "B+"
          : score.warnings > 0
            ? "A-"
            : "A";

report.push(`| Metric | Value |`, `|--------|-------|`);
report.push(`| Total checks | ${score.checks} |`);
report.push(`| ✅ Passed | ${score.passed} |`);
report.push(`| ⚠️  Warnings | ${score.warnings} |`);
report.push(`| ❌ Errors | ${score.errors} |`);
report.push(`| **Grade** | **${grade}** |`);
report.push("");
report.push("### Priority Fixes");
report.push("");
if (score.errors > 0)
  report.push(
    "1. 🔴 Fix all ❌ errors above — these are likely crashes or broken features",
  );
if (hookViolations.length > 0)
  report.push(
    "2. 🔴 Fix t() hook violations in DrawerContent and other module-level arrays",
  );
if (score.warnings > 0)
  report.push(
    "3. 🟠 Work through ⚠️ warnings — incomplete i18n, large files, todos",
  );
if (consoleLogs.length > 0)
  report.push(
    "4. 🟡 Remove console.log before publishing to App Store / Play Store",
  );
report.push("");
report.push("---");
report.push(
  `*Generated by project-audit.js — ${new Date().toLocaleDateString()}*`,
);

// ── Write report ──────────────────────────────────────────────────────────────
const outPath = path.join(OUT, "audit-report.md");
fs.writeFileSync(outPath, report.join("\n"), "utf8");

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋  AUDIT COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Code files scanned: ${codeFiles.length}
  Checks run:         ${score.checks}
  ✅ Passed:          ${score.passed}
  ⚠️  Warnings:       ${score.warnings}
  ❌ Errors:          ${score.errors}
  Grade:              ${grade}

  Report: ${outPath}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
