// fix-en-placeholders-readable.js
// Replaces placeholder values in en.json (where value === key) with a human‑readable version.
// e.g. "workerPortfolio.add.title" → "Worker Portfolio Add Title"

const fs = require("fs");
const path = require("path");

const EN_PATH = "./src/i18n/locales/en.json";

// Helper: convert camelCase to words
function camelToWords(str) {
  return str.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

// Helper: split key by dots or slashes, clean up
function keyToReadable(key) {
  // Split by '.' or '/'
  const parts = key.split(/[.\/]/).filter(Boolean);
  // For each part, convert camelCase and capitalise first letter
  const words = parts.map((part) => {
    // Handle "auth" -> "Auth"
    let word = camelToWords(part);
    // Capitalise first letter of each word
    return word.replace(/\b\w/g, (c) => c.toUpperCase());
  });
  // Join with spaces
  return words.join(" ");
}

function main() {
  console.log("📖 Reading en.json...");
  const raw = fs.readFileSync(EN_PATH, "utf8");
  const data = JSON.parse(raw);

  let count = 0;
  // Recursively traverse and replace placeholders
  function traverse(obj, parentKey = "") {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = parentKey ? `${parentKey}.${key}` : key;
      if (typeof value === "string" && value === fullKey) {
        // It's a placeholder – replace with readable version
        obj[key] = keyToReadable(fullKey);
        count++;
      } else if (typeof value === "object" && value !== null) {
        traverse(value, fullKey);
      }
    }
  }

  traverse(data);

  // Sort keys and write back
  const sorted = {};
  Object.keys(data)
    .sort()
    .forEach((k) => {
      sorted[k] = data[k];
    });

  fs.writeFileSync(EN_PATH, JSON.stringify(sorted, null, 2), "utf8");
  console.log(
    `✅ Updated ${count} placeholders in en.json with readable English text.`,
  );
  console.log("💡 Please review and polish the generated text manually.");
}

main();
