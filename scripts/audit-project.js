#!/usr/bin/env node
// scripts/audit-project.js
// Run from the project root:  node scripts/audit-project.js
// Outputs a full map of every file in src/ with its exports,
// imports, and whether it's a screen, component, navigator, api, store, etc.
// Paste the output into Claude for a complete project scope analysis.

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { extname, join, relative } from "path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "project-audit.txt");

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  "dist",
  "build",
  "__tests__",
]);
const CODE_EXTS = new Set([".js", ".jsx", ".ts", ".tsx"]);

// ─── Walk directory ───────────────────────────────────────────────────────────
function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (CODE_EXTS.has(extname(entry))) {
      files.push(full);
    }
  }
  return files;
}

// ─── Extract metadata from a file ────────────────────────────────────────────
function analyze(filePath) {
  const rel = relative(ROOT, filePath);
  let code;
  try {
    code = readFileSync(filePath, "utf8");
  } catch {
    return { rel, error: "unreadable" };
  }

  const lines = code.split("\n");

  // Imports
  const imports = [];
  for (const line of lines) {
    const m = line.match(/^import\s+.+\s+from\s+['"](.+)['"]/);
    if (m) imports.push(m[1]);
  }

  // Named exports
  const namedExports = [];
  for (const line of lines) {
    const m = line.match(
      /^export\s+(?:const|function|class|async function)\s+(\w+)/,
    );
    if (m) namedExports.push(m[1]);
  }

  // Default export
  let defaultExport = null;
  const defMatch = code.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defMatch) defaultExport = defMatch[1];

  // API calls — GET/POST/PUT/PATCH/DELETE
  const apiCalls = [];
  for (const line of lines) {
    const m = line.match(/\.(get|post|put|patch|delete)\(['"`]([^'"`]+)/i);
    if (m) apiCalls.push(`${m[1].toUpperCase()} ${m[2]}`);
  }

  // Navigation calls
  const navCalls = [];
  for (const line of lines) {
    const m = line.match(/navigate\(['"`](\w+)['"`]/);
    if (m) navCalls.push(m[1]);
  }

  // Classify
  let type = "unknown";
  if (rel.includes("/screens/auth/")) type = "screen:auth";
  else if (rel.includes("/screens/main/worker/")) type = "screen:worker";
  else if (rel.includes("/screens/main/")) type = "screen:hirer";
  else if (rel.includes("/navigation/")) type = "navigator";
  else if (rel.includes("/components/")) type = "component";
  else if (rel.includes("/api/")) type = "api";
  else if (rel.includes("/store/")) type = "store";
  else if (rel.includes("/contexts/")) type = "context";
  else if (rel.includes("/i18n/")) type = "locale";
  else if (rel.includes("/utils/")) type = "util";
  else if (rel.includes("/constants/")) type = "constant";
  else if (rel.includes("/hooks/")) type = "hook";

  const lineCount = lines.length;

  return {
    rel,
    type,
    lineCount,
    defaultExport,
    namedExports: namedExports.length ? namedExports : undefined,
    imports: imports.filter(
      (i) =>
        !i.startsWith("react") &&
        !i.startsWith("@expo") &&
        !i.startsWith("react-native"),
    ),
    apiCalls: apiCalls.length ? apiCalls : undefined,
    navCalls: navCalls.length ? [...new Set(navCalls)] : undefined,
  };
}

// ─── Group and format ─────────────────────────────────────────────────────────
function format(files) {
  const groups = {};
  for (const f of files) {
    const g = f.type;
    if (!groups[g]) groups[g] = [];
    groups[g].push(f);
  }

  const ORDER = [
    "navigator",
    "screen:auth",
    "screen:hirer",
    "screen:worker",
    "component",
    "api",
    "store",
    "context",
    "hook",
    "util",
    "constant",
    "locale",
    "unknown",
  ];

  const lines = [
    "═══════════════════════════════════════════════════════════",
    "  SKILLEDPROZHIRER — PROJECT AUDIT",
    `  Generated: ${new Date().toISOString()}`,
    `  Root: ${ROOT}`,
    "═══════════════════════════════════════════════════════════",
    "",
  ];

  for (const group of ORDER) {
    if (!groups[group]) continue;
    lines.push(`${"─".repeat(60)}`);
    lines.push(`  ${group.toUpperCase()}`);
    lines.push(`${"─".repeat(60)}`);
    for (const f of groups[group].sort((a, b) => a.rel.localeCompare(b.rel))) {
      lines.push(`\n  📄 ${f.rel}  (${f.lineCount} lines)`);
      if (f.defaultExport)
        lines.push(`     default export : ${f.defaultExport}`);
      if (f.namedExports?.length)
        lines.push(`     named exports  : ${f.namedExports.join(", ")}`);
      if (f.apiCalls?.length)
        lines.push(`     API calls      : ${f.apiCalls.join(" | ")}`);
      if (f.navCalls?.length)
        lines.push(`     navigates to   : ${f.navCalls.join(", ")}`);
      const localImports = f.imports?.filter(
        (i) =>
          i.startsWith(".") || i.startsWith("../") || i.startsWith("../../"),
      );
      if (localImports?.length)
        lines.push(`     local imports  : ${localImports.join(", ")}`);
    }
    lines.push("");
  }

  // Summary counts
  lines.push("═══════════════════════════════════════════════════════════");
  lines.push("  SUMMARY");
  lines.push("═══════════════════════════════════════════════════════════");
  for (const group of ORDER) {
    if (groups[group]) {
      lines.push(`  ${group.padEnd(22)} ${groups[group].length} files`);
    }
  }
  lines.push(`\n  TOTAL: ${files.length} files`);
  lines.push("═══════════════════════════════════════════════════════════");

  return lines.join("\n");
}

// ─── Also check package.json for installed packages ──────────────────────────
function auditPackageJson() {
  try {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const deps = Object.keys(pkg.dependencies ?? {});
    const devDeps = Object.keys(pkg.devDependencies ?? {});
    return [
      "",
      "─".repeat(60),
      "  INSTALLED PACKAGES",
      "─".repeat(60),
      `  dependencies (${deps.length}):`,
      ...deps.map((d) => `    • ${d}`),
      `\n  devDependencies (${devDeps.length}):`,
      ...devDeps.map((d) => `    • ${d}`),
    ].join("\n");
  } catch {
    return "\n  (package.json not found or unreadable)";
  }
}

// ─── Check which navigator screens are registered vs missing ─────────────────
function auditNavigators(files) {
  const navigatorFiles = files.filter((f) => f.type === "navigator");
  const allScreenNames = new Set();
  const registeredRoutes = new Set();

  for (const nav of navigatorFiles) {
    const code = readFileSync(join(ROOT, nav.rel), "utf8");
    // Extract Screen name= values
    const matches = [...code.matchAll(/name=["'](\w+)["']/g)];
    for (const m of matches) registeredRoutes.add(m[1]);
  }

  // All navigation.navigate() calls
  const navTargets = new Set();
  for (const f of files) {
    for (const target of f.navCalls ?? []) {
      navTargets.add(target);
    }
  }

  // Targets that aren't registered
  const missing = [...navTargets].filter((t) => !registeredRoutes.has(t));

  const lines = [
    "",
    "─".repeat(60),
    "  NAVIGATOR AUDIT",
    "─".repeat(60),
    `  Registered routes (${registeredRoutes.size}):`,
    ...[...registeredRoutes].sort().map((r) => `    ✓ ${r}`),
    `\n  Navigate() calls that have NO registered screen (${missing.length}):`,
    ...(missing.length
      ? missing.sort().map((r) => `    ✗ ${r}  ← MISSING`)
      : ["    (none — all navigation targets are registered)"]),
  ];

  return lines.join("\n");
}

// ─── Run ──────────────────────────────────────────────────────────────────────
console.log("🔍  Scanning project...");

const allFiles = walk(SRC);
const analyzed = allFiles.map(analyze).filter((f) => !f.error);

const report = [
  format(analyzed),
  auditPackageJson(),
  auditNavigators(analyzed),
].join("\n");

writeFileSync(OUT, report, "utf8");
console.log(`✅  Audit complete — ${analyzed.length} files analyzed`);
console.log(`📋  Report saved to: ${OUT}`);
console.log("\nPaste the contents of project-audit.txt into Claude.\n");
