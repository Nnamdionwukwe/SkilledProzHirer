// fix-cert-translations.js
const fs = require("fs");
const path = require("path");

const LOCALE_DIR = "./src/i18n/locales";
const LANG = "en"; // or 'fr', 'es', etc.

const newValues = {
  "workerCertifications.add.title": "Add Certification",
  "workerCertifications.add.name": "Certification Name",
  "workerCertifications.add.namePlaceholder": "e.g. AWS Certified Developer",
  "workerCertifications.add.issuedBy": "Issued By",
  "workerCertifications.add.issuedByPlaceholder": "e.g. Amazon Web Services",
  "workerCertifications.add.issueDate": "Issue Date",
  "workerCertifications.add.expiryDate": "Expiry Date",
  "workerCertifications.add.document": "Document (PDF / Image)",
  "workerCertifications.add.documentPlaceholder":
    "Upload certificate document…",
  "workerCertifications.add.button": "Add Certification",
  "workerCertifications.list.title": "My Certifications",
  "workerCertifications.list.emptyTitle": "No certifications yet",
  "workerCertifications.list.emptySub":
    "Add your professional certifications to build trust with hirers.",
  "workerCertifications.cert.issuedBy": "Issued by {{issuer}}",
  "workerCertifications.cert.expires": "Expires {{date}}",
  "workerCertifications.cert.expired": "Expired",
  "workerCertifications.cert.view": "View",
  "workerCertifications.common.done": "Done",
  "workerCertifications.date.placeholder": "Select date",
  "workerCertifications.error.loadFailed": "Failed to load certifications",
  "workerCertifications.error.nameRequired": "Certification name is required",
  "workerCertifications.error.issuerRequired": "Issuer is required",
  "workerCertifications.error.addFailed": "Failed to add certification",
  "workerCertifications.success.added": "Certification added successfully",
};

const filePath = path.join(LOCALE_DIR, `${LANG}.json`);
const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

let updated = 0;
for (const [key, val] of Object.entries(newValues)) {
  if (data.hasOwnProperty(key)) {
    data[key] = val;
    updated++;
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log(`✅ Updated ${updated} keys in ${LANG}.json`);
