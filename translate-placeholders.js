// fix-en-placeholders.js
// Replaces "[TODO: Translate to en] key" with the key itself (or a cleaned version).
const fs = require("fs");
const path = require("path");

const EN_PATH = "./src/i18n/locales/en.json";
const data = JSON.parse(fs.readFileSync(EN_PATH, "utf8"));
const placeholderRegex = /^\[TODO: Translate to en\]\s*(.+)$/;

let count = 0;
for (const [key, value] of Object.entries(data)) {
  if (typeof value === "string" && placeholderRegex.test(value)) {
    // Use the key itself as the English value (you can later polish it)
    data[key] = key;
    count++;
  }
}

fs.writeFileSync(EN_PATH, JSON.stringify(data, null, 2));
console.log(
  `✅ Updated ${count} placeholders in en.json with the key as text.`,
);
console.log("💡 Now review en.json and polish the English text manually.");
