#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// fix-t-violations.js
// Fixes every file where t() is called at module level (outside a component).
// Converts module-level objects/arrays that use t() into functions that
// accept t as a parameter, then calls them inside the component body.
//
// RUN:  node scripts/fix-t-violations.js           ← dry run
//       node scripts/fix-t-violations.js --write   ← apply fixes
// ─────────────────────────────────────────────────────────────────────────────

import fs   from "fs";
import path from "path";

const WRITE = process.argv.includes("--write");
const ROOT  = path.resolve(".");

const SKIP_DIRS = new Set(["node_modules",".git",".expo","dist","build","scripts","locales"]);
function walk(dir, files = []) {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const e of entries) {
    if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, files);
    else if (/\.(js|jsx|ts|tsx)$/.test(e.name)) files.push(full);
  }
  return files;
}

function rel(p) { return path.relative(ROOT, p); }

// ─────────────────────────────────────────────────────────────────────────────
// For each file, find module-level const/let/var declarations that contain
// t() calls, and wrap them in a getter function.
//
// Pattern detected:
//   const FOO = { ... t('key') ... }      →  function getFOO(t) { return { ... t('key') ... }; }
//   const FOO = [ ... t('key') ... ]      →  function getFOO(t) { return [ ... t('key') ... ]; }
//
// Then inside the component/function body, add:
//   const FOO = getFOO(t);
// ─────────────────────────────────────────────────────────────────────────────

function fixFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");
  let src = original;

  // ── 1. Find all module-level const/let/var assignments with t() ─────────────
  // We look for declarations at the TOP level (not inside a function body).
  // Heuristic: line starts with "const " / "let " / "var " and is NOT
  // indented (no leading spaces), AND somewhere in the block there's a t(

  const lines   = src.split("\n");
  const patches = []; // { startLine, endLine, varName, kind }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Module-level declaration: starts at col 0 with const/let/var
    const declMatch = /^(const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=/.exec(line);
    if (!declMatch) { i++; continue; }

    const kind    = declMatch[1];
    const varName = declMatch[2];

    // Only care if the block contains t(
    // Find the end of this declaration (balance braces/brackets)
    let depth    = 0;
    let hasT     = false;
    let endLine  = i;
    let inDecl   = false;

    for (let j = i; j < Math.min(i + 200, lines.length); j++) {
      const l = lines[j];
      if (/\bt\s*\(["'`]/.test(l)) hasT = true;
      depth += (l.match(/[\[{(]/g) || []).length;
      depth -= (l.match(/[\]})/g) || []).length;
      if (j === i && depth > 0) inDecl = true;
      if (inDecl && depth === 0) { endLine = j; break; }
      if (!inDecl && l.trim().endsWith(";")) { endLine = j; break; }
    }

    if (hasT) {
      patches.push({ startLine: i, endLine, varName, kind });
    }

    i = endLine + 1;
  }

  if (patches.length === 0) return null;

  // ── 2. Apply patches ─────────────────────────────────────────────────────────
  // Work backwards so line numbers stay valid
  const srcLines = src.split("\n");

  for (const p of [...patches].reverse()) {
    const block    = srcLines.slice(p.startLine, p.endLine + 1).join("\n");
    const fnName   = `get${p.varName.charAt(0).toUpperCase()}${p.varName.slice(1).toLowerCase()}`;

    // Extract the value part (after the "=")
    const firstLine = block.replace(/^(?:const|let|var)\s+\S+\s*=\s*/, "").trimEnd();
    const rest      = srcLines.slice(p.startLine + 1, p.endLine + 1).join("\n");
    const fullValue = (srcLines[p.startLine].replace(/^(?:const|let|var)\s+\S+\s*=\s*/, "") +
      "\n" + srcLines.slice(p.startLine + 1, p.endLine + 1).join("\n")).trimEnd();

    const wrapped = `// ← converted from module-level ${p.kind} (t() hook violation fix)\nfunction ${fnName}(t) {\n  return ${fullValue.trimEnd().replace(/;?\s*$/, "")}\n}\n`;

    srcLines.splice(p.startLine, p.endLine - p.startLine + 1, wrapped);
  }

  src = srcLines.join("\n");

  // ── 3. Inside the component body, add const X = getX(t); ─────────────────────
  // Find the first exported function/component and insert after the t hook
  for (const p of patches) {
    const fnName   = `get${p.varName.charAt(0).toUpperCase()}${p.varName.slice(1).toLowerCase()}`;
    const callLine = `  const ${p.varName} = ${fnName}(t); // ← moved inside component`;

    // Only add if not already present
    if (src.includes(callLine)) continue;

    // Find where { t } = useTranslation() appears
    const hookRe   = /const\s*\{\s*t\s*(?:,[^}]*)?\}\s*=\s*useTranslation\s*\(\s*\)/;
    const hookMatch = hookRe.exec(src);
    if (hookMatch) {
      const insertPos = src.indexOf("\n", hookMatch.index) + 1;
      src = src.slice(0, insertPos) + callLine + "\n" + src.slice(insertPos);
    }
  }

  if (src === original) return null;
  return src;
}

// ─────────────────────────────────────────────────────────────────────────────
const files    = walk(path.join(ROOT, "src"));
let   modified = 0;

// Known violation files from the audit
const PRIORITY = [
  "src/components/TopBar.js",
  "src/components/DrawerContent.js",
  "src/components/WorkerDrawerContent.js",
  "src/components/ConfirmModal.js",
  "src/navigation/HirerNavigator.js",
  "src/navigation/WorkerNavigator.js",
];

// Check priority files first
const allFiles = [
  ...PRIORITY.map(p => path.resolve(ROOT, p)).filter(fs.existsSync),
  ...files.filter(f => !PRIORITY.some(p => f.endsWith(p.replace(/\//g, path.sep)))),
];

for (const file of allFiles) {
  const result = fixFile(file);
  if (!result) continue;

  modified++;
  const r = rel(file);

  if (!WRITE) {
    // Show diff summary
    const origLines = fs.readFileSync(file,"utf8").split("\n");
    const newLines  = result.split("\n");
    console.log(`\n📄  ${r}`);
    let shown = 0;
    for (let i = 0; i < Math.min(origLines.length, newLines.length) && shown < 4; i++) {
      if (origLines[i] !== newLines[i]) {
        console.log(`   L${i+1} - ${origLines[i].trim().slice(0,80)}`);
        console.log(`        + ${newLines[i].trim().slice(0,80)}`);
        shown++;
      }
    }
  } else {
    fs.writeFileSync(file + ".hook.bak", fs.readFileSync(file,"utf8"), "utf8");
    fs.writeFileSync(file, result, "utf8");
    console.log(`✅  ${r}`);
  }
}

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${WRITE ? "✅  WRITE COMPLETE" : "🔍  DRY RUN (no files changed)"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Files with t() violations fixed: ${modified}
${!WRITE ? "\n  Run with --write to apply changes." : "  Backups: *.hook.bak\n  Run: npx expo start to verify"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);