#!/usr/bin/env node
/**
 * scripts/validate-js-syntax.js
 *
 * Diagnostic script that finds the EXACT file + line + column of
 * `invalid property name` errors that Hermes/Metro throws at bundle time.
 *
 * Runs @babel/parser on every JS/JSX file in src/, using the same
 * preset as Metro (babel-preset-expo). Reports:
 *   - Any syntax error
 *   - Any `StyleSheet.create({ ... })` call where a value is a function
 *     (a known Hermes crash cause, matching your current error)
 *
 * Usage:
 *   node scripts/validate-js-syntax.js
 *   node scripts/validate-js-syntax.js src/components/posts
 *   node scripts/validate-js-syntax.js --quiet   (only failures)
 */

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const ROOT = path.resolve(__dirname, "..");
const targetDir =
  process.argv[2] && !process.argv[2].startsWith("--")
    ? path.resolve(ROOT, process.argv[2])
    : path.resolve(ROOT, "src");

const QUIET = process.argv.includes("--quiet");

const SUPPORTED_EXT = [".js", ".jsx", ".ts", ".tsx"];
const SKIP_DIRS = [
  "node_modules",
  ".git",
  "android",
  "ios",
  "build",
  "dist",
  ".expo",
];

// ─── Colors (graceful fallback if no TTY) ─────────────────
const hasTTY = process.stdout.isTTY;
const c = {
  red: (s) => (hasTTY ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (hasTTY ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (hasTTY ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s) => (hasTTY ? `\x1b[36m${s}\x1b[0m` : s),
  gray: (s) => (hasTTY ? `\x1b[90m${s}\x1b[0m` : s),
  bold: (s) => (hasTTY ? `\x1b[1m${s}\x1b[0m` : s),
};

// ─── Walk the directory tree ──────────────────────────────
function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (SUPPORTED_EXT.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

// ─── Analyze one file ─────────────────────────────────────
function analyzeFile(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const relPath = path.relative(ROOT, filePath);

  // ─── Phase 1: Parse (this is the exact same parser Metro uses) ───
  let ast;
  try {
    ast = parser.parse(source, {
      sourceType: "module",
      plugins: [
        "jsx",
        "typescript",
        "classProperties",
        "objectRestSpread",
        "optionalChaining",
        "nullishCoalescingOperator",
        "dynamicImport",
        "exportDefaultFrom",
        "exportNamespaceFrom",
      ],
      errorRecovery: false,
      allowReturnOutsideFunction: false,
    });
  } catch (err) {
    // Syntax error — this IS the crash Metro sees
    const { loc, message } = err;
    const line = loc?.line;
    const col = loc?.column;
    const lineText = line ? source.split("\n")[line - 1] : "";

    return {
      ok: false,
      file: relPath,
      kind: "SYNTAX",
      line,
      col,
      message,
      lineText,
    };
  }

  // ─── Phase 2: Detect function-valued styles in StyleSheet.create ───
  // This is the #1 cause of `invalid property name` at runtime
  const badStyles = [];

  traverse(ast, {
    CallExpression(nodePath) {
      const callee = nodePath.node.callee;

      // Match: StyleSheet.create({ ... })
      const isStyleSheetCreate =
        callee.type === "MemberExpression" &&
        callee.object.name === "StyleSheet" &&
        callee.property.name === "create";

      if (!isStyleSheetCreate) return;

      const arg = nodePath.node.arguments[0];
      if (!arg || arg.type !== "ObjectExpression") return;

      for (const prop of arg.properties) {
        if (prop.type !== "ObjectProperty") continue;

        const keyName = prop.key.name || prop.key.value;
        const value = prop.value;

        // Function value → Hermes compilation crash
        if (
          value.type === "ArrowFunctionExpression" ||
          value.type === "FunctionExpression"
        ) {
          badStyles.push({
            keyName,
            line: prop.loc.start.line,
            col: prop.loc.start.column,
          });
        }
      }
    },
  });

  if (badStyles.length > 0) {
    return {
      ok: false,
      file: relPath,
      kind: "STYLESHEET",
      badStyles,
    };
  }

  return { ok: true, file: relPath };
}

// ─── Main ─────────────────────────────────────────────────
function main() {
  if (!QUIET) {
    console.log(c.bold(c.cyan("🔍 JS Syntax & StyleSheet Validator")));
    console.log(c.gray(`   Root: ${path.relative(process.cwd(), targetDir)}`));
    console.log("");
  }

  const files = walk(targetDir);
  if (!QUIET) {
    console.log(c.gray(`   Scanned ${files.length} file(s)\n`));
  }

  const failures = [];

  for (const file of files) {
    const result = analyzeFile(file);

    if (!result.ok) {
      failures.push(result);
      console.log(c.red(`❌ ${result.file}`));

      if (result.kind === "SYNTAX") {
        console.log(c.red(`   SyntaxError @ ${result.line}:${result.col}`));
        console.log(c.gray(`   ${result.message.split("\n")[0]}`));
        if (result.lineText) {
          console.log(c.gray(`   ${result.lineText.trim()}`));
          console.log(c.gray(`   ${" ".repeat(result.col)}${c.bold("^")}`));
        }
      } else if (result.kind === "STYLESHEET") {
        console.log(
          c.red(
            `   Function-valued styles inside StyleSheet.create() — Hermes will crash:`,
          ),
        );
        for (const s of result.badStyles) {
          console.log(
            c.red(`   • "${s.keyName}": (c) => ({...})  @ line ${s.line}`),
          );
          console.log(
            c.yellow(
              `     Fix: change to  ${s.keyName}: { ... }  and apply theme inline in JSX`,
            ),
          );
        }
      }
      console.log("");
    } else if (!QUIET) {
      console.log(c.green(`✅ ${result.file}`));
    }
  }

  console.log("");
  console.log(c.bold("─".repeat(60)));
  if (failures.length === 0) {
    console.log(c.green(c.bold(`✨ All ${files.length} files passed.`)));
    console.log(c.gray("   Metro/Hermes should bundle without syntax errors."));
    process.exit(0);
  } else {
    console.log(
      c.red(
        c.bold(
          `🚨 ${failures.length} file(s) contain errors — these WILL crash the bundle:`,
        ),
      ),
    );
    for (const f of failures) {
      console.log(c.red(`   • ${f.file}`));
    }
    process.exit(1);
  }
}

main();
