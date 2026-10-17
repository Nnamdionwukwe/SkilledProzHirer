// src/utils/formatDuration.js
//
// Convert a numeric value in a given unit to hours.
// Mirrors the same math used by PostJob.jsx so the display stays
// consistent with what the hirer typed.
//
// Multipliers (must match PostJob.jsx):
//   1 day   = 8 hours
//   1 week  = 56 hours    (8 × 7)
//   1 month = 242.5 hours (56 × 4.33)
//   1 year  = 2910 hours  (242.5 × 12)

function toHours(n, unit) {
  if (!Number.isFinite(n)) return null;
  if (unit === "hours") return n;
  if (unit === "days") return n * 8;
  if (unit === "weeks") return n * 56;
  if (unit === "months") return n * 242.5;
  if (unit === "years") return n * 2910;
  return null;
}

function fromHours(hours, unit) {
  if (!Number.isFinite(hours)) return null;
  if (unit === "hours") return hours;
  if (unit === "days") return hours / 8;
  if (unit === "weeks") return hours / 56;
  if (unit === "months") return hours / 242.5;
  if (unit === "years") return hours / 2910;
  return hours;
}

/** Trim trailing zeros from decimals — 1.0 → 1, 2.50 → 2.5 */
function tidy(n) {
  if (!Number.isFinite(n)) return n;
  return Number.isInteger(n) ? n : Number(n.toFixed(1));
}

// Icons are represented by react-icons names so the UI layer chooses
// the actual <Fa…/> component. No emoji in the codebase.
const UNIT_CONFIG = {
  hours: { s: "hour", p: "hours", icon: "clock" },
  days: { s: "day", p: "days", icon: "calendar" },
  weeks: { s: "week", p: "weeks", icon: "calendar-week" },
  months: { s: "month", p: "months", icon: "calendar-alt" },
  years: { s: "year", p: "years", icon: "calendar-check" },
};

function resolveCount(job, unit) {
  const value = job?.estimatedValue;
  const hours = job?.estimatedHours;

  const num = value != null && value !== "" ? parseFloat(value) : null;
  if (Number.isFinite(num) && num > 0) return num;

  const h = Number(hours);
  if (Number.isFinite(h) && h > 0) {
    return fromHours(h, unit);
  }

  return null;
}

export function formatJobDuration(job) {
  if (!job) return null;

  const unit = job.estimatedUnit || "hours";

  if (unit === "custom") return job.estimatedValue || null;

  const c = UNIT_CONFIG[unit] || UNIT_CONFIG.hours;
  const count = resolveCount(job, unit);
  if (!count) return null;

  const primary = `${tidy(count)} ${count === 1 ? c.s : c.p}`;

  const equivParts = [];

  if (unit === "years") {
    equivParts.push(`${tidy(count * 12)} mo`);
    equivParts.push(`≈${tidy(count * 2910)}h`);
  } else if (unit === "months") {
    equivParts.push(`${tidy(count * 4.33)} wk`);
    equivParts.push(`≈${tidy(count * 242.5)}h`);
  } else if (unit === "weeks") {
    equivParts.push(`${tidy(count * 7)} day${count * 7 !== 1 ? "s" : ""}`);
    equivParts.push(`≈${tidy(count * 56)}h`);
  } else if (unit === "days") {
    equivParts.push(`≈${tidy(count * 8)}h`);
    if (count >= 7) equivParts.push(`${tidy(count / 7)} wk`);
  } else if (unit === "hours" && count >= 8) {
    equivParts.push(`≈${tidy(count / 8)} day${count / 8 !== 1 ? "s" : ""}`);
  }

  const suffix = equivParts.length > 0 ? ` (${equivParts.join(", ")})` : "";
  return `${primary}${suffix}`;
}

export function formatJobDurationParts(job) {
  if (!job) return null;

  const unit = job.estimatedUnit || "hours";

  if (unit === "custom") {
    return job.estimatedValue
      ? {
          primary: job.estimatedValue,
          icon: "file-alt",
          equivalents: [],
          unit: "custom",
        }
      : null;
  }

  const c = UNIT_CONFIG[unit] || UNIT_CONFIG.hours;
  const count = resolveCount(job, unit);
  if (!count) return null;

  const primary = `${tidy(count)} ${count === 1 ? c.s : c.p}`;
  const equivalents = [];

  if (unit === "years") {
    equivalents.push({ label: `${tidy(count * 12)} months`, unit: "months" });
    equivalents.push({ label: `${tidy(count * 52)} weeks`, unit: "weeks" });
  } else if (unit === "months") {
    equivalents.push({ label: `${tidy(count * 4.33)} weeks`, unit: "weeks" });
    equivalents.push({ label: `${tidy(count * 242.5)} hrs`, unit: "hours" });
  } else if (unit === "weeks") {
    equivalents.push({ label: `${tidy(count * 7)} days`, unit: "days" });
    equivalents.push({ label: `${tidy(count * 56)} hrs`, unit: "hours" });
  } else if (unit === "days") {
    equivalents.push({ label: `${tidy(count * 8)} hrs`, unit: "hours" });
    if (count >= 7) {
      equivalents.push({ label: `${tidy(count / 7)} wks`, unit: "weeks" });
    }
  } else if (unit === "hours" && count >= 8) {
    equivalents.push({ label: `${tidy(count / 8)} days`, unit: "days" });
  }

  return { primary, icon: c.icon, equivalents, unit, count };
}
