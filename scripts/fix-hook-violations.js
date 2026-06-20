#!/usr/bin/env node

/**
 * Fix Hook Violations
 *
 * This script identifies and suggests fixes for t() hook violations.
 *
 * Run: node scripts/fix-hook-violations.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// Find all files with hook violations
function findHookViolations() {
  const files = getAllFiles(path.join(rootDir, "src"));
  const violations = [];

  files.forEach((file) => {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (
        line.includes("t(") &&
        !line.includes("const { t } = useTranslation()")
      ) {
        // Check if it's at module level (outside any function)
        let isModuleLevel = true;
        let braceCount = 0;

        for (let i = Math.max(0, index - 50); i < index; i++) {
          if (lines[i].includes("function") || lines[i].includes("=> {")) {
            isModuleLevel = false;
            break;
          }
          if (lines[i].includes("}")) {
            braceCount--;
          }
          if (lines[i].includes("{")) {
            braceCount++;
          }
        }

        if (isModuleLevel && braceCount === 0) {
          violations.push({
            file,
            line: index + 1,
            text: line.trim(),
          });
        }
      }
    });
  });

  return violations;
}

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!["node_modules", ".expo", ".git"].includes(file)) {
        getAllFiles(filePath, fileList);
      }
    } else {
      if ([".js", ".jsx", ".ts", ".tsx"].includes(path.extname(file))) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

function main() {
  console.log("\n🔍  Finding hook violations...\n");

  const violations = findHookViolations();

  if (violations.length === 0) {
    console.log("✅  No hook violations found!");
    return;
  }

  console.log(`⚠️  Found ${violations.length} hook violations:\n`);

  violations.forEach((v) => {
    console.log(`  📄  ${path.relative(rootDir, v.file)}`);
    console.log(`     Line ${v.line}: ${v.text.substring(0, 80)}`);
    console.log("");
  });

  console.log("\n📝  How to fix:");
  console.log("  1. Move t() calls inside React components");
  console.log("  2. Convert module-level objects to functions");
  console.log("  3. Example:");
  console.log("");
  console.log("  // ❌ BAD");
  console.log("  const routes = {");
  console.log('    Dashboard: { title: t("dashboard") }');
  console.log("  };");
  console.log("");
  console.log("  // ✅ GOOD");
  console.log("  const getRoutes = (t) => ({");
  console.log('    Dashboard: { title: t("dashboard") }');
  console.log("  });");
  console.log("");
}

try {
  main();
} catch (error) {
  console.error("❌  Failed:", error.message);
  process.exit(1);
}
