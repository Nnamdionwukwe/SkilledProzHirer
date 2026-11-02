#!/usr/bin/env node
/**
 * scripts/fix-function-styles.js
 *
 * Automatically converts function-valued styles in StyleSheet.create()
 * to static objects + inline theme injection.
 *
 * Handles both patterns:
 *   A) label: (c) => ({ fontSize: 12, color: c.textDim })
 *   B) label: (c) => ({ fontSize: 12 })      // no color; only font/static
 *
 * For each broken key `foo` it:
 *   1. Rewrites  `foo: (c) => ({ ... })`  →  `foo: { ... }`
 *   2. If the body referenced `c.*`, extracts those usages and appends
 *      them as a JSX note comment so you can apply them inline (safer
 *      than blind auto-inline).
 *
 * Usage:
 *   node scripts/fix-function-styles.js --dry-run   (preview)
 *   node scripts/fix-function-styles.js             (apply)
 *   node scripts/fix-function-styles.js --file src/screens/main/ProfileScreen.js
 */

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const ROOT = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FILE_ARG_IDX = args.indexOf("--file");
const SPECIFIC_FILE = FILE_ARG_IDX >= 0 ? args[FILE_ARG_IDX + 1] : null;

const FILES = SPECIFIC_FILE
  ? [path.resolve(ROOT, SPECIFIC_FILE)]
  : [
      "src/screens/main/BrowseWorkersScreen.js",
      "src/screens/main/EditProfileScreen.js",
      "src/screens/main/HirerPublicProfileScreen.js",
      "src/screens/main/JobDetailScreen.js",
      "src/screens/main/ProfileScreen.js",
      "src/screens/main/SettingsScreen.js",
      "src/screens/main/WorkerPublicProfileScreen.js",
    ].map((p) => path.resolve(ROOT, p));

// ─── Format ───────────────────────────────────────────────
const c = {
  red: (s) => (process.stdout.isTTY ? `\x1b[31m${s}\x1b[0m` : s),
  green: (s) => (process.stdout.isTTY ? `\x1b[32m${s}\x1b[0m` : s),
  yellow: (s) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s),
  cyan: (s) => (process.stdout.isTTY ? `\x1b[36m${s}\x1b[0m` : s),
  gray: (s) => (process.stdout.isTTY ? `\x1b[90m${s}\x1b[0m` : s),
  bold: (s) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s),
};

// ─── Find all function-valued styles in StyleSheet.create ─
function findBadStyles(ast) {
  const bad = [];
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (
        callee.type !== "MemberExpression" ||
        callee.object.name !== "StyleSheet" ||
        callee.property.name !== "create"
      )
        return;

      const arg = p.node.arguments[0];
      if (!arg || arg.type !== "ObjectExpression") return;

      arg.properties.forEach((prop, i) => {
        if (prop.type !== "ObjectProperty") return;
        const v = prop.value;
        if (
          v.type === "ArrowFunctionExpression" ||
          v.type === "FunctionExpression"
        ) {
          bad.push({ prop, index: i });
        }
      });
    },
  });
  return bad;
}

// ─── Convert one file ─────────────────────────────────────
function processFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (!fs.existsSync(filePath)) {
    console.log(c.red(`❌ Not found: ${rel}`));
    return;
  }

  const source = fs.readFileSync(filePath, "utf8");
  const ast = parser.parse(source, {
    sourceType: "module",
    plugins: ["jsx", "typescript", "classProperties", "optionalChaining"],
  });

  const badStyles = findBadStyles(ast);
  if (badStyles.length === 0) {
    console.log(c.green(`✅ ${rel} — nothing to fix`));
    return;
  }

  console.log(c.cyan(`\n🔧 ${rel} (${badStyles.length} broken)`));

  // For each broken prop, extract the object body from the arrow function,
  // collect any `c.*` references, and build the static version.
  const appliedFixes = [];
  const themeRefs = []; // { key, refs: ["textDim", ...] }

  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      if (
        callee.type !== "MemberExpression" ||
        callee.object.name !== "StyleSheet" ||
        callee.property.name !== "create"
      )
        return;

      const arg = p.node.arguments[0];
      if (!arg || arg.type !== "ObjectExpression") return;

      arg.properties.forEach((prop) => {
        if (prop.type !== "ObjectProperty") return;
        const v = prop.value;
        if (
          v.type !== "ArrowFunctionExpression" &&
          v.type !== "FunctionExpression"
        )
          return;

        const keyName = prop.key.name || prop.key.value;
        const body = v.body;
        const objExpr =
          body.type === "ObjectExpression"
            ? body
            : body.type === "ParenthesizedExpression" &&
                body.expression.type === "ObjectExpression"
              ? body.expression
              : null;

        if (!objExpr) {
          console.log(
            c.yellow(
              `   ⚠️  ${keyName}: arrow body is not an object literal — skipped`,
            ),
          );
          return;
        }

        // Find all `c.xxx` references inside the object
        const refs = [];
        traverse(
          t.file(t.program([t.expressionStatement(objExpr)])),
          {
            MemberExpression(mp) {
              if (
                mp.node.object.type === "Identifier" &&
                mp.node.object.name === "c" &&
                mp.node.property.type === "Identifier"
              ) {
                refs.push(mp.node.property.name);
              }
            },
          },
          undefined,
          { noScope: true },
        );

        // Replace the arrow function with the raw object literal
        prop.value = objExpr;

        appliedFixes.push(keyName);
        if (refs.length > 0) {
          themeRefs.push({ key: keyName, refs: [...new Set(refs)] });
        }
      });
    },
  });

  if (appliedFixes.length === 0) {
    console.log(c.yellow(`   No fixes applied`));
    return;
  }

  const output = generate(ast, {
    retainLines: false,
    jsescOption: { minimal: true },
    comments: true,
  }).code;

  if (DRY_RUN) {
    console.log(
      c.gray(`   [DRY RUN] Would rewrite ${appliedFixes.length} styles:`),
    );
    appliedFixes.forEach((k) => console.log(c.gray(`     • ${k}`)));
    return;
  }

  // Backup original
  const backup = filePath + ".bak";
  fs.writeFileSync(backup, source, "utf8");

  // Write fixed version
  fs.writeFileSync(filePath, output, "utf8");

  console.log(c.green(`   ✅ Fixed ${appliedFixes.length} style(s)`));
  appliedFixes.forEach((k) => console.log(c.gray(`     • ${k}`)));

  if (themeRefs.length > 0) {
    console.log(
      c.yellow(`\n   ⚠️  These styles referenced \`c.*\` — you must`),
    );
    console.log(c.yellow(`       apply the theme color inline in JSX, e.g.:`));
    themeRefs.forEach(({ key, refs }) => {
      const colorMap = refs.map((r) => `theme.colors.${r}`).join(", ");
      console.log(
        c.gray(`       style={[styles.${key}, { color: ${colorMap} }]}`),
      );
    });
    console.log(c.gray(`\n   Backup saved to: ${path.relative(ROOT, backup)}`));
  }
}

// ─── Run ──────────────────────────────────────────────────
console.log(c.bold(c.cyan("🔧 StyleSheet Function-Value Fixer")));
if (DRY_RUN) console.log(c.yellow("   DRY RUN — no files will be modified\n"));
else
  console.log(c.yellow("   Files will be modified (backup created as .bak)\n"));

FILES.forEach(processFile);

console.log(c.bold("\n" + "─".repeat(60)));
console.log(c.green("Done."));
if (!DRY_RUN) {
  console.log(
    c.gray("Backups saved as *.bak — verify + delete when satisfied."),
  );
  console.log(
    c.gray("Next step: apply inline theme colors in JSX (see warnings above),"),
  );
  console.log(c.gray("then run: npx expo start -c"));
}
