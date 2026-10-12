// translate-audit.js
// Scans the project to diagnose missing translations

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Configuration: adjust if your project uses different locations
const LANGUAGE_CODES = ["en", "fr", "es", "de", "it", "pt", "ar", "zh", "hi"];
const I18N_CONFIG_PATTERNS = [
  "i18n.js",
  "i18n.ts",
  "i18n/index.js",
  "i18n/index.ts",
  "src/i18n.js",
  "src/i18n.ts",
  "src/i18n/index.js",
  "src/i18n/index.ts",
  "locales/i18n.js",
  "locales/i18n.ts",
];
const TRANSLATION_DIR_PATTERNS = [
  "locales",
  "public/locales",
  "src/locales",
  "assets/locales",
  "i18n/locales",
];
const TRANSLATION_FILE_NAMES = [
  "common.json",
  "translation.json",
  "index.js",
  "index.ts",
];

// Helper: walk directories recursively
async function walk(dir, fileList = []) {
  const files = await readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stats = await stat(filePath);
    if (stats.isDirectory()) {
      await walk(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Helper: find config files
async function findConfigFiles(rootDir) {
  const allFiles = await walk(rootDir);
  return allFiles.filter((f) =>
    I18N_CONFIG_PATTERNS.some((pattern) => f.includes(pattern)),
  );
}

// Helper: find translation directories and files
async function findTranslationFiles(rootDir) {
  const allFiles = await walk(rootDir);
  const transFiles = allFiles.filter((f) => {
    const dir = path.dirname(f);
    // Check if directory matches any translation dir pattern
    const matchesDir = TRANSLATION_DIR_PATTERNS.some((p) => dir.includes(p));
    // Check if file name matches any translation file name
    const matchesName = TRANSLATION_FILE_NAMES.some((name) => f.endsWith(name));
    return matchesDir && matchesName;
  });
  return transFiles;
}

// Helper: extract i18n config from JavaScript/TypeScript files (basic regex)
function extractI18nConfig(content) {
  const config = {};
  // Look for fallbackLng
  const fallbackMatch = content.match(/fallbackLng\s*:\s*['"]([^'"]+)['"]/);
  if (fallbackMatch) config.fallbackLng = fallbackMatch[1];
  // Look for defaultNS
  const nsMatch = content.match(/defaultNS\s*:\s*['"]([^'"]+)['"]/);
  if (nsMatch) config.defaultNS = nsMatch[1];
  // Look for loadPath (backend)
  const loadPathMatch = content.match(/loadPath\s*:\s*['"]([^'"]+)['"]/);
  if (loadPathMatch) config.loadPath = loadPathMatch[1];
  // Look for resources object (hardcoded)
  const resourcesMatch = content.match(/resources\s*:\s*\{/);
  if (resourcesMatch) config.hasResources = true;
  return config;
}

async function main() {
  const rootDir = process.cwd();
  console.log(`🔍 Scanning project root: ${rootDir}\n`);

  // 1. Find i18n config files
  const configFiles = await findConfigFiles(rootDir);
  console.log("📄 i18n configuration files found:");
  if (configFiles.length === 0) {
    console.log(
      "   ❌ No i18n config files found. Check your project structure.",
    );
  } else {
    for (const file of configFiles) {
      console.log(`   - ${file}`);
      const content = await readFile(file, "utf-8");
      const config = extractI18nConfig(content);
      console.log("      Config extracted:", JSON.stringify(config, null, 2));
    }
  }

  // 2. Find translation files
  const transFiles = await findTranslationFiles(rootDir);
  console.log("\n📂 Translation files found:");
  if (transFiles.length === 0) {
    console.log(
      "   ❌ No translation files found. Create them in a locales/ directory.",
    );
  } else {
    // Group by language
    const byLang = {};
    for (const file of transFiles) {
      const dirParts = file.split(path.sep);
      // Try to determine language from folder name
      let lang = null;
      for (const part of dirParts) {
        if (LANGUAGE_CODES.includes(part)) {
          lang = part;
          break;
        }
      }
      if (!lang) {
        // If not in folder, try to guess from file name (e.g., en.json)
        const basename = path.basename(file);
        const ext = path.extname(basename);
        const nameWithoutExt = basename.slice(0, -ext.length);
        if (LANGUAGE_CODES.includes(nameWithoutExt)) {
          lang = nameWithoutExt;
        }
      }
      if (lang) {
        if (!byLang[lang]) byLang[lang] = [];
        byLang[lang].push(file);
      } else {
        console.log(`   ⚠️  Could not determine language for file: ${file}`);
      }
    }

    // Report per language
    for (const code of LANGUAGE_CODES) {
      const files = byLang[code] || [];
      const exists = files.length > 0;
      console.log(
        `   ${exists ? "✅" : "❌"} ${code}: ${files.length} file(s)`,
      );
      for (const f of files) {
        const stats = await stat(f);
        const content = await readFile(f, "utf-8");
        let keyCount = 0;
        try {
          const json = JSON.parse(content);
          keyCount = Object.keys(json).length;
        } catch (e) {
          // Not JSON, maybe JS module? We'll count lines
          keyCount = content
            .split("\n")
            .filter((line) => line.includes(":")).length;
        }
        console.log(
          `      - ${path.basename(f)} (${stats.size} bytes, ${keyCount} keys)`,
        );
        // Sample keys
        if (keyCount > 0) {
          try {
            const json = JSON.parse(content);
            const sampleKeys = Object.keys(json).slice(0, 3);
            console.log(`        Sample keys: ${sampleKeys.join(", ")}`);
          } catch (e) {}
        }
      }
    }

    // Check if all languages have at least one file
    const missing = LANGUAGE_CODES.filter(
      (code) => !byLang[code] || byLang[code].length === 0,
    );
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing translation files for: ${missing.join(", ")}`);
    }
  }

  // 3. Check if translation keys are present (optional: we can spot check a key)
  console.log(
    '\n🔎 Quick key check (looking for "workerPortfolio.permissionRequired"):',
  );
  // Find any translation file and try to read it
  const anyTransFile = transFiles.find((f) => f.endsWith(".json"));
  if (anyTransFile) {
    try {
      const content = await readFile(anyTransFile, "utf-8");
      const json = JSON.parse(content);
      if (json["workerPortfolio.permissionRequired"]) {
        console.log(
          '   ✅ Key "workerPortfolio.permissionRequired" found in ' +
            path.basename(anyTransFile),
        );
      } else {
        console.log(
          '   ❌ Key "workerPortfolio.permissionRequired" NOT found in ' +
            path.basename(anyTransFile),
        );
      }
    } catch (e) {
      console.log("   ⚠️  Could not parse JSON or no JSON file found.");
    }
  } else {
    console.log("   ❌ No JSON translation file found to check keys.");
  }

  // 4. Summary and recommendations
  console.log("\n📋 SUMMARY");
  console.log("-----------");
  if (configFiles.length === 0) {
    console.log(
      "• No i18n config file detected. You may not have initialized i18n.",
    );
  }
  if (transFiles.length === 0) {
    console.log(
      "• No translation files found. Create a locales/ folder and add JSON files for each language.",
    );
  }
  const missingLangs = LANGUAGE_CODES.filter(
    (code) => !byLang[code] || byLang[code].length === 0,
  );
  if (missingLangs.length > 0) {
    console.log(`• Missing translation files for: ${missingLangs.join(", ")}`);
  }
  console.log(
    "\n💡 Ensure your i18n configuration points to the correct path and namespace.",
  );
  console.log(
    '   Example: backend: { loadPath: "/locales/{{lng}}/{{ns}}.json" }',
  );
  console.log("   Or if using resources, ensure all languages are loaded.");
  console.log(
    '   Also verify defaultNS matches your file name (e.g., "common" or "translation").',
  );
}

main().catch(console.error);
