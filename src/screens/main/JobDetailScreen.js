// src/screens/main/JobDetailScreen.js
//
// Verbatim port of pages/jobs/JobDetail.jsx.
//
// Endpoints:
//   GET   /jobs/:id
//   POST  /jobs/:id/apply
//   PATCH /jobs/:id/status   (FILLED / CANCELLED / OPEN)
//   POST  /jobs/:id/save
//   DELETE /jobs/:id/save
//
// Renders (mirrors web):
//   · Back link → role-aware destination
//   · Alerts (error/success, dismissible)
//   · Header card: category chip + status badge + save button,
//     company line, title, type pill row, meta row, budget block
//   · Description + notes
//   · Responsibilities (if present)
//   · Requirements (if present)
//   · Skills chips
//   · Qualifications chips
//   · Work conditions (accommodation/meals)
//   · Details grid (15+ conditional cards, including coordinates link)
//   · Payment breakdown card (rate × duration + platform fee + total)
//   · Requirements & Qualifications grouped block
//   · How to Apply (external channels)
//   · Worker apply flow (rejected/accepted/already-applied banners + form)
//   · Job closed banner (filled/cancelled)
//   · Manage actions (owner/admin)
//   · Sidebar: hirer card + quick facts list + guest CTA
//   · Not-found and skeleton states
//
// i18n:
//   · Every visible string uses t() under the `jobs.detail.*` namespace
//     (and `common.*` where applicable).

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import { getHirerFeeRate } from "../../utils/pricing";
import {
  FaBriefcase,
  FaClock,
  FaFileAlt,
  FaCalendarAlt,
  FaGlobe,
  FaMapMarkerAlt,
  FaUsers,
  FaDollarSign,
  FaCreditCard,
  FaTag,
  FaEdit,
  FaBookmark,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaSearch,
  FaChevronLeft,
  FaArrowRight,
  FaSend,
  FaSun,
  FaRandom,
  FaAward,
  FaBookOpen,
  FaLink,
  FaEnvelope,
  FaPhone,
  FaCommentDots,
  FaChartLine,
  FaAlignLeft,
  FaExternalLinkAlt,
  FaLayers,
  FaUserCheck,
  FaHome,
  FaCoffee,
  FaSyncAlt,
  FaLocationArrow,
  FaInfoCircle,
  FaSpinner,
} from "../../icons/fa";

// ── Language map (mirrors PostJob.jsx) ────────────────────────────
const ALL_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ur", label: "Urdu" },
  { code: "tr", label: "Turkish" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
  { code: "it", label: "Italian" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
  { code: "fa", label: "Persian" },
  { code: "am", label: "Amharic" },
  { code: "zu", label: "Zulu" },
  { code: "af", label: "Afrikaans" },
  { code: "so", label: "Somali" },
];

// ── Label maps (verbatim from web) ─────────────────────────────────
const BUDGET_TYPE_LABELS = {
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
  CUSTOM: "Custom",
  FIXED: "Fixed Price",
};

const BUDGET_TYPE_PERIOD_LABELS = {
  HOURLY: "per hour",
  DAILY: "per day",
  WEEKLY: "per week",
  MONTHLY: "per month",
  YEARLY: "per year",
};

const SALARY_PERIOD_LABELS = {
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
};

const EDUCATION_LEVEL_LABELS = {
  HIGH_SCHOOL: "High School",
  DIPLOMA: "Diploma",
  BACHELOR: "Bachelor's Degree",
  MASTER: "Master's Degree",
  DOCTORATE: "Doctorate",
  CERTIFICATION: "Certification",
  OTHER: "Other",
};

function parseRecurring(notes) {
  if (!notes) return null;
  const match = notes.match(/Recurring:\s*([^.]+)\./i);
  return match ? match[1].trim() : null;
}

function parseCustomDuration(notes) {
  if (!notes) return null;
  const match = notes.match(/Duration:\s*([^.]+)\./i);
  return match ? match[1].trim() : null;
}

function stripSystemNotes(notes) {
  if (!notes) return notes;
  return notes
    .replace(/Recurring:\s*[^.]+\.\s*/i, "")
    .replace(/Duration:\s*[^.]+\.\s*/i, "")
    .trim();
}

function formatJobDurationParts(job) {
  if (!job) return null;
  const value = job.estimatedValue;
  const hours = job.estimatedHours;
  const unit = job.estimatedUnit || "hours";
  if (unit === "custom") {
    return value ? { primary: value, equivalents: [] } : null;
  }
  if (!value && !hours) return null;
  const UNIT_MAP = {
    hours: "hour",
    days: "day",
    weeks: "week",
    months: "month",
    years: "year",
  };
  if (value) {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0) {
      const noun = UNIT_MAP[unit] || unit;
      const label = noun + (num !== 1 ? "s" : "");
      const eqs = [];
      if (unit !== "hours" && hours) {
        eqs.push({ label: `≈ ${hours}h` });
      }
      return { primary: `${num} ${label}`, equivalents: eqs };
    }
    return { primary: String(value), equivalents: [] };
  }
  if (hours) {
    return { primary: `${parseFloat(hours)} hours`, equivalents: [] };
  }
  return null;
}

function computeJobPaymentBreakdown(jobPost) {
  if (!jobPost) return null;

  const rate = Number(jobPost.budget || 0);
  const currency = jobPost.currency || "NGN";
  const budgetType = jobPost.budgetType || "FIXED";

  const RATE_UNIT = {
    HOURLY: "hours",
    DAILY: "days",
    WEEKLY: "weeks",
    MONTHLY: "months",
    YEARLY: "years",
  };
  const rateUnit = RATE_UNIT[budgetType];

  const NOUNS = {
    hours: ["hour", "hours"],
    days: ["day", "days"],
    weeks: ["week", "weeks"],
    months: ["month", "months"],
    years: ["year", "years"],
  };
  const pluralize = (num, unit) => {
    const [s, p] = NOUNS[unit] || [unit, unit];
    return num === 1 ? `${num} ${s}` : `${num} ${p}`;
  };

  let rawDurationValue = jobPost.estimatedValue;
  let rawDurationUnit = jobPost.estimatedUnit || "hours";

  if (
    (!rawDurationValue || rawDurationValue === "") &&
    budgetType !== "FIXED" &&
    budgetType !== "CUSTOM"
  ) {
    const recurring = parseRecurring(jobPost.notes);
    if (recurring) {
      const forMatch = recurring
        .toLowerCase()
        .match(/for\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
      if (forMatch) {
        const count = parseFloat(forMatch[1]);
        let unit = forMatch[2];
        if (unit === "month") unit = "months";
        else if (unit === "week") unit = "weeks";
        else if (unit === "day") unit = "days";
        else if (unit === "year") unit = "years";
        else if (unit === "hour") unit = "hours";
        if (Number.isFinite(count) && count > 0) {
          rawDurationValue = String(count);
          rawDurationUnit = unit;
        }
      }
    }
  }

  const HOURS_PER_UNIT = {
    hours: 1,
    days: 8,
    weeks: 56,
    months: 242.5,
    years: 2910,
  };
  const toHours = (val, unit) => {
    const factor = HOURS_PER_UNIT[unit];
    return factor ? val * factor : null;
  };

  const numericRaw = parseFloat(rawDurationValue);
  let numericInRateUnit = null;
  let durationLabel = null;
  let multiplierLabel = null;

  if (Number.isFinite(numericRaw) && numericRaw > 0) {
    durationLabel = pluralize(numericRaw, rawDurationUnit);

    if (rateUnit) {
      const totalHours = toHours(numericRaw, rawDurationUnit);
      const unitHours = HOURS_PER_UNIT[rateUnit];
      if (totalHours != null && unitHours) {
        const rawInRateUnit = totalHours / unitHours;
        numericInRateUnit =
          rateUnit === "hours"
            ? Math.round(rawInRateUnit)
            : Number(rawInRateUnit.toFixed(2));
        multiplierLabel = pluralize(numericInRateUnit, rateUnit);
      }
    }
  }

  let subtotal = 0;
  let calculationText = null;
  const isFixed = budgetType === "FIXED";
  const isCustom = budgetType === "CUSTOM";
  let isRecurring = false;

  if (isFixed) {
    subtotal = rate;
    calculationText = `Fixed price · ${currency} ${rate.toLocaleString()}`;
  } else if (isCustom) {
    subtotal = rate;
    calculationText = `Custom rate · ${currency} ${rate.toLocaleString()}`;
  } else if (Number.isFinite(numericInRateUnit) && numericInRateUnit > 0) {
    isRecurring = true;
    subtotal = rate * numericInRateUnit;
    calculationText =
      `${currency} ${rate.toLocaleString()} ` +
      `${BUDGET_TYPE_PERIOD_LABELS[budgetType] || BUDGET_TYPE_LABELS[budgetType]} ` +
      `× ${multiplierLabel} = ${currency} ${Math.round(subtotal).toLocaleString()}`;
  } else {
    subtotal = rate;
    calculationText = `${currency} ${rate.toLocaleString()} ${
      BUDGET_TYPE_PERIOD_LABELS[budgetType] || ""
    }`;
  }

  const feeRate = getHirerFeeRate(currency);
  const platformFeePercent = Math.round(feeRate * 100);
  const platformFee = Math.round(subtotal * feeRate * 100) / 100;
  const grandTotal = subtotal + platformFee;

  return {
    rate,
    currency,
    budgetType,
    budgetTypeLabel: BUDGET_TYPE_LABELS[budgetType] || budgetType,
    periodLabel: BUDGET_TYPE_PERIOD_LABELS[budgetType] || null,
    durationLabel,
    multiplierLabel,
    subtotal,
    platformFee,
    platformFeePct: feeRate,
    platformFeePercent,
    grandTotal,
    calculationText,
    isFixed,
    isCustom,
    isRecurring,
  };
}

function timeAgo(date, t) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 3600)
    return t("jobs.detail.timeMinutesAgo", { count: Math.floor(diff / 60) });
  if (diff < 86400)
    return t("jobs.detail.timeHoursAgo", { count: Math.floor(diff / 3600) });
  return t("jobs.detail.timeDaysAgo", { count: Math.floor(diff / 86400) });
}

// ═══════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════
export default function JobDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const jobId = route.params?.jobId;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const isWorker = user?.role === "WORKER";
  const isHirer = user?.role === "HIRER";
  const isAdmin = user?.role === "ADMIN";

  const jobHirerId = job?.hirer?.id ?? job?.hirerId;
  const isOwner =
    user?.id != null &&
    jobHirerId != null &&
    String(user.id) === String(jobHirerId);
  const canManage = isOwner || isAdmin;

  const backDestination = isWorker
    ? "Jobs"
    : isHirer
      ? "JobsManagement"
      : "Landing";

  // ── Fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) {
      setError(t("jobs.notFound"));
      setLoading(false);
      return;
    }
    let cancelled = false;
    client
      .get(`/jobs/${jobId}`)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data.data;
        const jobData = payload?.jobPost ?? payload;
        const savedFlag = payload?.isSaved ?? jobData?.isSaved ?? false;
        const appliedFlag = payload?.hasApplied ?? jobData?.hasApplied ?? false;
        const appStatus = payload?.applicationStatus ?? null;
        setJob({
          ...jobData,
          hasApplied: appliedFlag,
          applicationStatus: appStatus,
        });
        setIsSaved(savedFlag);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.response?.data?.message || t("jobs.notFound"));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // ── Apply ─────────────────────────────────────────────────────
  async function handleApply() {
    if (!message.trim() && !showForm) {
      setShowForm(true);
      return;
    }
    setApplying(true);
    setError("");
    setSuccess("");
    try {
      await client.post(`/jobs/${jobId}/apply`, { message });
      setJob((j) => ({ ...j, hasApplied: true, applicationStatus: "PENDING" }));
      setSuccess(t("jobs.apply.success"));
      setShowForm(false);
      setMessage("");
    } catch (err) {
      setError(err?.response?.data?.message || t("jobs.apply.failed"));
    } finally {
      setApplying(false);
    }
  }

  // ── Status update ─────────────────────────────────────────────
  async function handleStatusUpdate(status) {
    try {
      await client.patch(`/jobs/${jobId}/status`, { status });
      setJob((j) => ({ ...j, status }));
      setSuccess(t("jobs.jobUpdated", { status: status.toLowerCase() }));
    } catch {
      setError(t("jobs.detail.statusUpdateFailed"));
    }
  }

  // ── Save toggle ───────────────────────────────────────────────
  async function handleSave() {
    try {
      if (isSaved) {
        await client.delete(`/jobs/${jobId}/save`);
        setIsSaved(false);
        setSuccess(t("jobs.detail.savedRemoved"));
      } else {
        await client.post(`/jobs/${jobId}/save`);
        setIsSaved(true);
        setSuccess(t("jobs.detail.savedAdded"));
      }
    } catch (err) {
      setError(err?.response?.data?.message || t("jobs.detail.savedFailed"));
    }
  }

  // ── Derived labels ────────────────────────────────────────────
  const scheduled = job ? new Date(job.scheduledAt) : null;

  const statusMeta = job
    ? {
        OPEN: { label: t("jobs.open"), color: c.green },
        FILLED: { label: t("jobs.filled"), color: "#818cf8" },
        CANCELLED: { label: t("jobs.cancelled"), color: c.red },
      }
    : null;
  const sm = job ? statusMeta[job.status] || statusMeta.OPEN : null;

  const jobTypeMeta = job
    ? {
        FULL_TIME: {
          icon: FaBriefcase,
          label: t("jobs.detail.jobTypeFullTime"),
        },
        PART_TIME: { icon: FaClock, label: t("jobs.detail.jobTypePartTime") },
        CONTRACT: { icon: FaFileAlt, label: t("jobs.detail.jobTypeContract") },
        TEMPORARY: { icon: FaClock, label: t("jobs.detail.jobTypeTemporary") },
      }[job.jobType]
    : null;

  const locationTypeMeta = job
    ? {
        REMOTE: { icon: FaGlobe, label: t("jobs.detail.workStyleRemote") },
        ON_SITE: {
          icon: FaMapMarkerAlt,
          label: t("jobs.detail.workStyleOnSite"),
        },
        HYBRID: { icon: FaRandom, label: t("jobs.detail.workStyleHybrid") },
      }[job.locationType]
    : null;

  const budgetTypeMeta = job
    ? {
        FIXED: { icon: FaDollarSign, label: t("jobs.detail.paymentFixed") },
        HOURLY: { icon: FaClock, label: t("jobs.detail.paymentHourly") },
        DAILY: { icon: FaSun, label: t("jobs.detail.paymentDaily") },
        WEEKLY: { icon: FaCalendarAlt, label: t("jobs.detail.paymentWeekly") },
        MONTHLY: {
          icon: FaCalendarAlt,
          label: t("jobs.detail.paymentMonthly"),
        },
        YEARLY: { icon: FaCalendarAlt, label: t("jobs.detail.paymentYearly") },
        CUSTOM: { icon: FaEdit, label: t("jobs.detail.paymentCustom") },
      }[job.budgetType]
    : null;

  const JobTypeIcon = jobTypeMeta?.icon;
  const LocationTypeIcon = locationTypeMeta?.icon;
  const BudgetTypeIcon = budgetTypeMeta?.icon;

  const languageLabel = job
    ? ALL_LANGUAGES.find((l) => l.code === job.languageRequirement)?.label ||
      job.languageRequirement
    : null;

  const recurringLabel = parseRecurring(job?.notes);
  const customDurationLabel = parseCustomDuration(job?.notes);
  const cleanNotes = stripSystemNotes(job?.notes);

  const hasSalaryText = !!job?.salaryText;
  const hasSalaryRange = !!(
    job?.salaryAmount ||
    job?.salaryMin ||
    job?.salaryMax
  );
  const hasBudget = job?.budget !== null && job?.budget !== undefined;

  const salaryPeriodLabel = SALARY_PERIOD_LABELS[job?.salaryPeriod];
  const educationLevelLabel = EDUCATION_LEVEL_LABELS[job?.educationLevel];
  const budgetTypeLabel = BUDGET_TYPE_LABELS[job?.budgetType];

  let salaryRangeText = null;
  if (job?.salaryMin && job?.salaryMax) {
    const cur = job.salaryCurrency || job.currency || "";
    salaryRangeText = `${cur} ${Number(job.salaryMin).toLocaleString()} – ${Number(job.salaryMax).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  } else if (job?.salaryAmount) {
    const cur = job.salaryCurrency || job.currency || "";
    salaryRangeText = `${cur} ${Number(job.salaryAmount).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  }

  const mainPaymentText = hasSalaryText
    ? job.salaryText
    : hasSalaryRange
      ? salaryRangeText
      : hasBudget
        ? `${job.currency} ${parseFloat(job.budget).toLocaleString()}`
        : t("jobs.detail.noAmount");

  const mainPaymentLabel = hasSalaryText
    ? t("jobs.detail.labelSalary")
    : hasSalaryRange
      ? t("jobs.detail.labelSalaryRange")
      : t("jobs.detail.budget");

  const budgetSuffix =
    job?.budgetType && job.budgetType !== "FIXED"
      ? job.budgetType === "CUSTOM"
        ? job.budgetCustomLabel
          ? ` · ${job.budgetCustomLabel}`
          : ` · ${t("jobs.detail.paymentCustom")}`
        : ` · ${BUDGET_TYPE_LABELS[job.budgetType] || job.budgetType}`
      : ` ${t("jobs.detail.budgetSuffixTotal")}`;

  const durationParts = job ? formatJobDurationParts(job) : null;
  const hasEstimatedDuration = !!(durationParts || job?.estimatedHours);
  const hasProjectDuration = !!(job?.durationValue && job?.durationType);
  const hasRecurring = !!recurringLabel;
  const hasCustomDuration = !!customDurationLabel;

  const hasExternalApplyChannels = !!(
    job?.applicationUrl ||
    job?.applicationEmail ||
    job?.applicationWhatsApp ||
    job?.applicationPhone
  );

  const companyDisplay =
    job?.companyName || job?.hirer?.hirerProfile?.companyName || null;

  const hasCoordinates = job?.latitude != null && job?.longitude != null;

  const hasWorkConditions = job?.providesAccommodation || job?.providesMeals;

  const qualificationsList = Array.isArray(job?.qualifications)
    ? job.qualifications.filter(
        (q) => typeof q === "string" && q.trim().length > 0,
      )
    : [];

  const requirementItems = job
    ? [
        job.minQualification && {
          icon: <FaAward size={14} color={c.orange} />,
          label: t("jobs.detail.requirementMinQualification"),
          value: job.minQualification,
        },
        job.experienceLevel && {
          icon: <FaChartLine size={14} color={c.orange} />,
          label: t("jobs.detail.requirementExperienceLevel"),
          value: job.experienceLength
            ? `${job.experienceLevel} · ${job.experienceLength}`
            : job.experienceLevel,
        },
        job.experienceLength &&
          !job.experienceLevel && {
            icon: <FaChartLine size={14} color={c.orange} />,
            label: t("jobs.detail.requirementExperienceLength"),
            value: job.experienceLength,
          },
        educationLevelLabel && {
          icon: <FaBookOpen size={14} color={c.orange} />,
          label: t("jobs.detail.requirementEducationLevel"),
          value: educationLevelLabel,
        },
        languageLabel && {
          icon: <FaGlobe size={14} color={c.orange} />,
          label: t("jobs.detail.requirementLanguage"),
          value: languageLabel,
        },
        job.workingHours && {
          icon: <FaClock size={14} color={c.orange} />,
          label: t("jobs.detail.requirementWorkingHours"),
          value: job.workingHours,
        },
        job.applicantLocation && {
          icon: <FaMapMarkerAlt size={14} color={c.orange} />,
          label: t("jobs.detail.requirementPreferredLocation"),
          value: job.applicantLocation,
        },
      ].filter(Boolean)
    : [];

  const hasRequirementsBlock = requirementItems.length > 0;
  const paymentBreakdown = job ? computeJobPaymentBreakdown(job) : null;

  const hasApplied = job?.hasApplied;
  const wasRejected = job?.applicationStatus === "REJECTED";
  const wasAccepted = job?.applicationStatus === "ACCEPTED";
  const isOpen = job?.status === "OPEN";
  const isFilled = job?.status === "FILLED";
  const isCancelled = job?.status === "CANCELLED";

  // ── Loading / not-found guards ────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  if (error && !job) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <FaSearch size={48} color={c.textMuted} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 22,
              fontWeight: "800",
              color: c.text,
              marginTop: 16,
            }}
          >
            {t("jobs.detail.notFoundTitle")}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate(backDestination)}
            style={({ pressed }) => [
              styles.backLinkBtn,
              {
                borderColor: c.border,
                marginTop: 16,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaChevronLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 6 }}>
              {t("jobs.detail.backToJobs")}
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (!job) return null;

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Back link */}
      <Pressable
        onPress={() => navigation.navigate(backDestination)}
        style={({ pressed }) => [
          styles.backLinkBtn,
          { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <FaChevronLeft size={12} color={c.textDim} />
        <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 6 }}>
          {t("jobs.detail.backToJobs")}
        </AppText>
      </Pressable>

      {/* Alerts */}
      {error ? (
        <Pressable
          onPress={() => setError("")}
          style={[
            styles.alertBox,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={13} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, flex: 1, marginLeft: 6 }}
          >
            {error}
          </AppText>
          <FaTimes size={12} color={c.red} />
        </Pressable>
      ) : null}
      {success ? (
        <Pressable
          onPress={() => setSuccess("")}
          style={[
            styles.alertBox,
            { backgroundColor: c.greenDim, borderColor: "rgba(34,197,94,0.2)" },
          ]}
        >
          <FaCheckCircle size={13} color={c.green} />
          <AppText
            style={{ fontSize: 12, color: c.green, flex: 1, marginLeft: 6 }}
          >
            {success}
          </AppText>
          <FaTimes size={12} color={c.green} />
        </Pressable>
      ) : null}

      {/* HEADER CARD */}
      <View
        style={[
          styles.headerCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.headerTop}>
          {job.category?.name ? (
            <View
              style={[
                styles.categoryChip,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              {job.category.icon ? (
                <AppText style={{ fontSize: 11 }}>{job.category.icon}</AppText>
              ) : null}
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: c.orange,
                  marginLeft: job.category.icon ? 4 : 0,
                }}
                numberOfLines={1}
              >
                {job.category.name}
                {job.category.isUserSubmitted
                  ? ` ${t("jobs.detail.customSuffix")}`
                  : ""}
              </AppText>
            </View>
          ) : null}

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  sm.color === c.green
                    ? c.greenDim
                    : sm.color === c.red
                      ? c.redDim
                      : "rgba(129,140,248,0.12)",
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: sm.color,
                textTransform: "uppercase",
                letterSpacing: 0.4,
              }}
            >
              {sm.label}
            </AppText>
          </View>

          {isWorker && !canManage ? (
            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: isSaved ? c.orangeDim : c.bgCard,
                  borderColor: isSaved ? c.orangeGlow : c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaBookmark size={11} color={isSaved ? c.orange : c.textDim} />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: isSaved ? c.orange : c.textDim,
                  marginLeft: 4,
                }}
              >
                {isSaved ? t("jobs.detail.saved") : t("jobs.detail.saveJob")}
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {companyDisplay ? (
          <AppText
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: c.orange,
              marginBottom: 4,
            }}
          >
            {companyDisplay}
          </AppText>
        ) : null}

        <AppText
          style={{
            fontFamily: "Syne_800ExtraBold",
            fontSize: 22,
            fontWeight: "800",
            color: c.text,
            lineHeight: 28,
            marginBottom: 12,
          }}
        >
          {job.title}
        </AppText>

        {(jobTypeMeta ||
          locationTypeMeta ||
          job.budgetType ||
          job.experienceLevel ||
          job.sourcePlatform) && (
          <View style={styles.typePillRow}>
            {jobTypeMeta ? (
              <TypePill
                icon={<JobTypeIcon size={11} color={c.orange} />}
                label={jobTypeMeta.label}
                c={c}
              />
            ) : null}
            {locationTypeMeta ? (
              <TypePill
                icon={<LocationTypeIcon size={11} color={c.orange} />}
                label={locationTypeMeta.label}
                c={c}
              />
            ) : null}
            {job.budgetType && job.budgetType !== "FIXED" && budgetTypeMeta ? (
              <TypePill
                icon={<BudgetTypeIcon size={11} color={c.orange} />}
                label={budgetTypeMeta.label}
                c={c}
              />
            ) : null}
            {job.experienceLevel ? (
              <TypePill
                icon={<FaChartLine size={11} color={c.orange} />}
                label={job.experienceLevel}
                c={c}
              />
            ) : null}
            {hasRecurring ? (
              <TypePill
                icon={<FaSyncAlt size={11} color={c.orange} />}
                label={t("jobs.detail.recurring")}
                c={c}
              />
            ) : null}
            {job.sourcePlatform ? (
              <TypePill
                icon={<FaExternalLinkAlt size={11} color={c.orange} />}
                label={t("jobs.detail.viaPlatform", {
                  platform: job.sourcePlatform,
                })}
                c={c}
              />
            ) : null}
          </View>
        )}

        <View style={styles.metaRow}>
          {scheduled ? (
            <MetaItem
              icon={<FaCalendarAlt size={12} color={c.orange} />}
              text={`${scheduled.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} ${t("jobs.apply.at")} ${scheduled.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              c={c}
            />
          ) : null}
          {job.address ? (
            <MetaItem
              icon={<FaMapMarkerAlt size={12} color={c.orange} />}
              text={job.address}
              c={c}
            />
          ) : null}
          {durationParts ? (
            <MetaItem
              icon={<FaClock size={12} color={c.orange} />}
              text={durationParts.primary}
              c={c}
            />
          ) : null}
          <MetaItem
            icon={<FaCalendarAlt size={12} color={c.orange} />}
            text={t("jobs.detail.postedAgo", {
              time: timeAgo(new Date(job.createdAt), t),
            })}
            c={c}
          />
        </View>

        <View
          style={[
            styles.budgetBlock,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 26,
              fontWeight: "800",
              color: c.orange,
              lineHeight: 30,
            }}
          >
            {mainPaymentText}
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim, flex: 1 }}>
            {mainPaymentLabel}
          </AppText>
          <View
            style={[
              styles.applicantCount,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <FaUsers size={11} color={c.textDim} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 4,
              }}
            >
              {t("jobs.detail.applicantsCount", {
                count: job._count?.applications || 0,
              })}
            </AppText>
          </View>
        </View>
      </View>

      {/* DESCRIPTION */}
      <Section title={t("jobs.detail.jobDesc")} c={c}>
        <AppText style={styles.description}>{job.description}</AppText>
        {cleanNotes ? (
          <View
            style={[
              styles.notesBox,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaFileAlt size={13} color={c.orange} />
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                flex: 1,
                marginLeft: 8,
                lineHeight: 18,
              }}
            >
              {cleanNotes}
            </AppText>
          </View>
        ) : null}
      </Section>

      {/* RESPONSIBILITIES */}
      {job.responsibilities ? (
        <Section
          title={t("jobs.detail.responsibilities")}
          icon={<FaAlignLeft size={13} color={c.textDim} />}
          c={c}
        >
          <AppText style={styles.description}>{job.responsibilities}</AppText>
        </Section>
      ) : null}

      {/* REQUIREMENTS (free text) */}
      {job.requirements ? (
        <Section
          title={t("jobs.detail.requirements")}
          icon={<FaCheckCircle size={13} color={c.textDim} />}
          c={c}
        >
          <AppText style={styles.description}>{job.requirements}</AppText>
        </Section>
      ) : null}

      {/* SKILLS */}
      {job.skills?.length > 0 ? (
        <Section title={t("jobs.detail.skills")} c={c}>
          <View style={styles.chipsWrap}>
            {job.skills.map((skill, i) => (
              <View
                key={i}
                style={[
                  styles.skillChip,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
                >
                  {skill}
                </AppText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* QUALIFICATIONS */}
      {qualificationsList.length > 0 ? (
        <Section
          title={t("jobs.detail.qualifications")}
          icon={<FaAward size={13} color={c.textDim} />}
          c={c}
        >
          <View style={styles.chipsWrap}>
            {qualificationsList.map((qual, i) => (
              <View
                key={i}
                style={[
                  styles.skillChip,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaAward
                  size={10}
                  color={c.orange}
                  style={{ marginRight: 4 }}
                />
                <AppText
                  style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
                >
                  {qual}
                </AppText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {/* WORK CONDITIONS */}
      {hasWorkConditions ? (
        <Section
          title={t("jobs.detail.workConditions")}
          icon={<FaHome size={13} color={c.textDim} />}
          c={c}
        >
          <View style={styles.detailGrid}>
            {job.providesAccommodation ? (
              <DetailCard
                icon={<FaHome size={13} color={c.orange} />}
                label={t("jobs.detail.accommodation")}
                value={t("jobs.detail.provided")}
                c={c}
              />
            ) : null}
            {job.providesMeals ? (
              <DetailCard
                icon={<FaCoffee size={13} color={c.orange} />}
                label={t("jobs.detail.meals")}
                value={t("jobs.detail.provided")}
                c={c}
              />
            ) : null}
          </View>
        </Section>
      ) : null}

      {/* DETAILS GRID */}
      <Section title={t("jobs.detail.details")} c={c}>
        <View style={styles.detailGrid}>
          {job.category?.name ? (
            <DetailCard
              icon={<FaFileAlt size={13} color={c.orange} />}
              label={t("jobs.detail.category")}
              value={`${job.category.icon ? `${job.category.icon} ` : ""}${job.category.name}${job.category.isUserSubmitted ? ` ${t("jobs.detail.customSuffix")}` : ""}`}
              c={c}
            />
          ) : null}

          {mainPaymentText !== t("jobs.detail.noAmount") ? (
            <DetailCard
              icon={<FaDollarSign size={13} color={c.orange} />}
              label={mainPaymentLabel}
              value={`${mainPaymentText}${hasBudget && !hasSalaryRange && !hasSalaryText ? budgetSuffix : ""}`}
              accent
              c={c}
            />
          ) : null}

          {hasSalaryText && hasSalaryRange ? (
            <DetailCard
              icon={<FaDollarSign size={13} color={c.orange} />}
              label={t("jobs.detail.labelSalaryRangeNumeric")}
              value={salaryRangeText}
              c={c}
            />
          ) : null}

          {scheduled ? (
            <DetailCard
              icon={<FaCalendarAlt size={13} color={c.orange} />}
              label={t("jobs.detail.scheduled")}
              value={scheduled.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              c={c}
            />
          ) : null}

          {hasEstimatedDuration && durationParts ? (
            <DetailCard
              icon={<FaClock size={13} color={c.orange} />}
              label={t("jobs.detail.estimatedDuration")}
              value={`${durationParts.primary}${
                durationParts.equivalents?.length > 0
                  ? ` (${durationParts.equivalents.map((e) => e.label).join(", ")})`
                  : ""
              }`}
              c={c}
            />
          ) : null}

          {hasCustomDuration ? (
            <DetailCard
              icon={<FaClock size={13} color={c.orange} />}
              label={t("jobs.detail.customDuration")}
              value={customDurationLabel}
              c={c}
            />
          ) : null}

          {hasRecurring ? (
            <DetailCard
              icon={<FaSyncAlt size={13} color={c.orange} />}
              label={t("jobs.detail.recurringSchedule")}
              value={recurringLabel}
              c={c}
            />
          ) : null}

          {hasProjectDuration ? (
            <DetailCard
              icon={<FaClock size={13} color={c.orange} />}
              label={t("jobs.detail.projectDuration")}
              value={`${job.durationValue} ${job.durationType.toLowerCase()}`}
              c={c}
            />
          ) : null}

          {job.locationType && job.address ? (
            <DetailCard
              icon={<FaMapMarkerAlt size={13} color={c.orange} />}
              label={t("jobs.detail.location")}
              value={job.address}
              c={c}
            />
          ) : null}

          {hasCoordinates ? (
            <Pressable
              onPress={() =>
                Linking.openURL(
                  `https://www.google.com/maps?q=${job.latitude},${job.longitude}`,
                )
              }
              style={[
                styles.detailCard,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaLocationArrow size={13} color={c.orange} />
              <View style={{ flex: 1, marginLeft: 8, minWidth: 0 }}>
                <AppText style={styles.detailLabel}>
                  {t("jobs.detail.coordinates")}
                </AppText>
                <AppText
                  style={{ fontSize: 12, fontWeight: "600", color: c.orange }}
                  numberOfLines={1}
                >
                  {Number(job.latitude).toFixed(5)},{" "}
                  {Number(job.longitude).toFixed(5)} ↗
                </AppText>
              </View>
            </Pressable>
          ) : null}

          <DetailCard
            icon={<FaTag size={13} color={c.orange} />}
            label={t("jobs.detail.status")}
            value={sm.label}
            c={c}
          />

          {jobTypeMeta ? (
            <DetailCard
              icon={<JobTypeIcon size={13} color={c.orange} />}
              label={t("jobs.detail.jobType")}
              value={jobTypeMeta.label}
              c={c}
            />
          ) : null}

          {locationTypeMeta ? (
            <DetailCard
              icon={<LocationTypeIcon size={13} color={c.orange} />}
              label={t("jobs.detail.workStyle")}
              value={locationTypeMeta.label}
              c={c}
            />
          ) : null}

          {job.languageRequirement ? (
            <DetailCard
              icon={<FaGlobe size={13} color={c.orange} />}
              label={t("jobs.detail.languageRequired")}
              value={languageLabel}
              c={c}
            />
          ) : null}

          {job.budgetType && budgetTypeLabel ? (
            <DetailCard
              icon={<FaCreditCard size={13} color={c.orange} />}
              label={t("jobs.detail.paymentType")}
              value={`${budgetTypeLabel}${job.budgetType === "CUSTOM" && job.budgetCustomLabel ? ` (${job.budgetCustomLabel})` : ""}`}
              c={c}
            />
          ) : null}

          {job.currency ? (
            <DetailCard
              icon={<FaDollarSign size={13} color={c.orange} />}
              label={t("jobs.detail.currency")}
              value={job.currency}
              c={c}
            />
          ) : null}

          {job.sourcePlatform ? (
            <DetailCard
              icon={<FaExternalLinkAlt size={13} color={c.orange} />}
              label={t("jobs.detail.sourcePlatform")}
              value={job.sourcePlatform}
              c={c}
            />
          ) : null}

          {job.expiryDate ? (
            <DetailCard
              icon={<FaCalendarAlt size={13} color={c.orange} />}
              label={t("jobs.detail.expires")}
              value={new Date(job.expiryDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              c={c}
            />
          ) : null}

          {job.createdAt ? (
            <DetailCard
              icon={<FaCalendarAlt size={13} color={c.orange} />}
              label={t("jobs.detail.posted")}
              value={new Date(job.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              c={c}
            />
          ) : null}
        </View>
      </Section>

      {/* PAYMENT BREAKDOWN */}
      {paymentBreakdown ? (
        <Section
          title={t("jobs.detail.paymentBreakdown")}
          icon={<FaDollarSign size={13} color={c.textDim} />}
          c={c}
        >
          <View
            style={[
              styles.paymentBreakdownCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <View
              style={[
                styles.paymentBreakdownHeader,
                {
                  backgroundColor: c.orangeDim,
                  borderBottomColor: c.orangeGlow,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "800",
                  color: c.orange,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  flex: 1,
                }}
              >
                {t("jobs.detail.whatWorkerWillBePaid")}
              </AppText>
              <View
                style={[
                  styles.paymentBreakdownBadge,
                  { backgroundColor: c.bg, borderColor: c.orangeGlow },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: c.orange,
                    textTransform: "uppercase",
                  }}
                >
                  {paymentBreakdown.budgetTypeLabel}
                </AppText>
              </View>
            </View>

            <View style={styles.paymentBreakdownBody}>
              <View style={styles.paymentBreakdownRow}>
                <AppText style={styles.paymentBreakdownLabel}>
                  {paymentBreakdown.isFixed
                    ? t("jobs.detail.fixedPrice")
                    : t("jobs.detail.rate")}
                </AppText>
                <AppText style={styles.paymentBreakdownValue}>
                  {paymentBreakdown.currency}{" "}
                  {paymentBreakdown.rate.toLocaleString()}
                  {!paymentBreakdown.isFixed && paymentBreakdown.periodLabel ? (
                    <AppText
                      style={{
                        color: c.textMuted,
                        fontWeight: "500",
                        fontSize: 11,
                      }}
                    >
                      {" "}
                      {paymentBreakdown.periodLabel}
                    </AppText>
                  ) : null}
                </AppText>
              </View>

              {paymentBreakdown.isRecurring &&
              paymentBreakdown.durationLabel ? (
                <View style={styles.paymentBreakdownRow}>
                  <AppText style={styles.paymentBreakdownLabel}>
                    {t("jobs.detail.durationBracket", {
                      type: paymentBreakdown.budgetTypeLabel,
                    })}
                  </AppText>
                  <AppText style={styles.paymentBreakdownValue}>
                    {paymentBreakdown.durationLabel}
                    {paymentBreakdown.multiplierLabel &&
                    paymentBreakdown.multiplierLabel !==
                      paymentBreakdown.durationLabel ? (
                      <AppText
                        style={{
                          color: c.textMuted,
                          fontWeight: "500",
                          fontSize: 11,
                        }}
                      >
                        {" "}
                        ≈ {paymentBreakdown.multiplierLabel}
                      </AppText>
                    ) : null}
                  </AppText>
                </View>
              ) : null}

              {paymentBreakdown.calculationText ? (
                <View
                  style={[
                    styles.paymentBreakdownCalc,
                    { backgroundColor: c.bgInput, borderColor: c.border },
                  ]}
                >
                  <FaInfoCircle size={11} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textDim,
                      fontWeight: "600",
                      flex: 1,
                      marginLeft: 6,
                      fontFamily: "monospace",
                    }}
                  >
                    {paymentBreakdown.calculationText}
                  </AppText>
                </View>
              ) : null}

              {!paymentBreakdown.isFixed ? (
                <View style={styles.paymentBreakdownRow}>
                  <AppText style={styles.paymentBreakdownLabel}>
                    {t("jobs.detail.subtotal")}
                  </AppText>
                  <AppText style={styles.paymentBreakdownValue}>
                    {paymentBreakdown.currency}{" "}
                    {paymentBreakdown.subtotal.toLocaleString()}
                  </AppText>
                </View>
              ) : null}

              <View style={styles.paymentBreakdownRow}>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.paymentBreakdownLabel}>
                    {t("jobs.detail.platformFeePct", {
                      percent: paymentBreakdown.platformFeePercent,
                    })}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 10,
                      color: c.textMuted,
                      fontStyle: "italic",
                      marginTop: 2,
                    }}
                  >
                    {t("jobs.detail.platformFeeNote")}
                  </AppText>
                </View>
                <AppText style={styles.paymentBreakdownValue}>
                  + {paymentBreakdown.currency}{" "}
                  {paymentBreakdown.platformFee.toLocaleString()}
                </AppText>
              </View>

              <View
                style={{
                  height: 1,
                  backgroundColor: c.border,
                  marginVertical: 4,
                }}
              />

              <View
                style={[
                  styles.paymentBreakdownTotal,
                  { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "800",
                    color: c.orange,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
                  }}
                >
                  {t("jobs.detail.totalToHire")}
                </AppText>
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 20,
                    fontWeight: "800",
                    color: c.orange,
                  }}
                >
                  {paymentBreakdown.currency}{" "}
                  {paymentBreakdown.grandTotal.toLocaleString()}
                </AppText>
              </View>

              {paymentBreakdown.isFixed ? (
                <PaymentNote text={t("jobs.detail.noteFixed")} c={c} />
              ) : null}
              {paymentBreakdown.isCustom ? (
                <PaymentNote text={t("jobs.detail.noteCustom")} c={c} />
              ) : null}
              {paymentBreakdown.isRecurring ? (
                <PaymentNote
                  text={t("jobs.detail.noteRecurring", {
                    currency: paymentBreakdown.currency,
                    rate: paymentBreakdown.rate.toLocaleString(),
                    period: paymentBreakdown.periodLabel,
                    multiplier:
                      paymentBreakdown.multiplierLabel ||
                      paymentBreakdown.durationLabel,
                    budgetType: paymentBreakdown.budgetType.toLowerCase(),
                    duration: paymentBreakdown.durationLabel,
                  })}
                  c={c}
                />
              ) : null}
            </View>
          </View>
        </Section>
      ) : null}

      {/* REQUIREMENTS & QUALIFICATIONS grouped */}
      {hasRequirementsBlock ? (
        <Section
          title={t("jobs.detail.requirements")}
          icon={<FaCheckCircle size={13} color={c.textDim} />}
          c={c}
        >
          <View style={styles.detailGrid}>
            {requirementItems.map((item, i) => (
              <DetailCard
                key={i}
                icon={item.icon}
                label={item.label}
                value={item.value}
                c={c}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {/* HOW TO APPLY */}
      {hasExternalApplyChannels ? (
        <Section title={t("jobs.detail.howToApply")} c={c}>
          <View style={styles.chipsWrap}>
            {job.applicationUrl ? (
              <Pressable
                onPress={() => Linking.openURL(job.applicationUrl)}
                style={({ pressed }) => [
                  styles.applyChannel,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaLink size={12} color={c.orange} />
                <AppText style={styles.applyChannelText}>
                  {t("jobs.detail.applyViaLink")}
                </AppText>
              </Pressable>
            ) : null}
            {job.applicationEmail ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(`mailto:${job.applicationEmail}`)
                }
                style={({ pressed }) => [
                  styles.applyChannel,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaEnvelope size={12} color={c.orange} />
                <AppText style={styles.applyChannelText} numberOfLines={1}>
                  {job.applicationEmail}
                </AppText>
              </Pressable>
            ) : null}
            {job.applicationWhatsApp ? (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${job.applicationWhatsApp.replace(/[^0-9]/g, "")}`,
                  )
                }
                style={({ pressed }) => [
                  styles.applyChannel,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaCommentDots size={12} color={c.orange} />
                <AppText style={styles.applyChannelText} numberOfLines={1}>
                  {job.applicationWhatsApp}
                </AppText>
              </Pressable>
            ) : null}
            {job.applicationPhone ? (
              <Pressable
                onPress={() => Linking.openURL(`tel:${job.applicationPhone}`)}
                style={({ pressed }) => [
                  styles.applyChannel,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaPhone size={12} color={c.orange} />
                <AppText style={styles.applyChannelText} numberOfLines={1}>
                  {job.applicationPhone}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Section>
      ) : null}

      {/* APPLY (worker, job open) */}
      {isWorker && !canManage && isOpen ? (
        <Section title={t("jobs.detail.applyForJob")} c={c}>
          {wasRejected ? (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.2)",
                },
              ]}
            >
              <FaExclamationTriangle size={15} color={c.red} />
              <AppText
                style={{
                  fontSize: 12,
                  color: c.red,
                  flex: 1,
                  marginLeft: 8,
                  lineHeight: 18,
                }}
              >
                {t("jobs.detail.wasRejectedBanner")}
              </AppText>
            </View>
          ) : null}

          {wasAccepted ? (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: c.greenDim,
                  borderColor: "rgba(34,197,94,0.35)",
                },
              ]}
            >
              <FaCheckCircle size={15} color={c.green} />
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textDim,
                  flex: 1,
                  marginLeft: 8,
                  lineHeight: 18,
                }}
              >
                <AppText style={{ fontWeight: "700", color: c.green }}>
                  {t("jobs.detail.congratulations")}
                </AppText>{" "}
                {t("jobs.detail.wasAcceptedBody")}
              </AppText>
            </View>
          ) : null}

          {hasApplied && !wasAccepted ? (
            <View
              style={[
                styles.banner,
                {
                  backgroundColor: c.greenDim,
                  borderColor: "rgba(34,197,94,0.2)",
                },
              ]}
            >
              <FaCheckCircle size={15} color={c.green} />
              <AppText
                style={{
                  fontSize: 12,
                  color: c.green,
                  flex: 1,
                  marginLeft: 8,
                  lineHeight: 18,
                }}
              >
                {t("jobs.detail.alreadyAppliedBanner")}
              </AppText>
            </View>
          ) : showForm ? (
            <View style={{ gap: 10 }}>
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: c.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {t("jobs.apply.message")}{" "}
                <AppText style={{ color: c.textMuted, textTransform: "none" }}>
                  {t("common.optional")}
                </AppText>
              </AppText>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder={t("jobs.apply.messagePlaceholder")}
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                style={[
                  styles.applyTextarea,
                  {
                    color: c.text,
                    borderColor: c.border,
                    backgroundColor: c.bgInput,
                  },
                ]}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={handleApply}
                  disabled={applying}
                  style={({ pressed }) => [
                    styles.applyBtn,
                    {
                      backgroundColor: c.orange,
                      opacity: applying ? 0.5 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  {applying ? (
                    <ActivityIndicator size="small" color={c.bg} />
                  ) : (
                    <AppText
                      style={{ fontSize: 13, fontWeight: "700", color: c.bg }}
                    >
                      {t("jobs.detail.submitApplication")}
                    </AppText>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => setShowForm(false)}
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: c.textDim,
                    }}
                  >
                    {t("common.cancel")}
                  </AppText>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowForm(true)}
              style={({ pressed }) => [
                styles.applyTrigger,
                { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <FaSend size={14} color={c.bg} />
              <AppText
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: c.bg,
                  marginLeft: 8,
                }}
              >
                {wasRejected
                  ? t("jobs.detail.applyAgain")
                  : t("jobs.detail.applyNow")}
              </AppText>
            </Pressable>
          )}
        </Section>
      ) : null}

      {/* Job closed banner */}
      {isWorker && !canManage && !isOpen ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: c.bgCard, borderColor: c.border, marginTop: 12 },
          ]}
        >
          <FaExclamationTriangle size={15} color={c.orange} />
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              flex: 1,
              marginLeft: 8,
              lineHeight: 18,
            }}
          >
            {isFilled
              ? t("jobs.detail.filledBanner")
              : t("jobs.detail.cancelledBanner")}
          </AppText>
        </View>
      ) : null}

      {/* MANAGE (owner / admin) */}
      {canManage ? (
        <Section title={t("jobs.detail.manageJob")} c={c}>
          <View style={styles.manageActions}>
            <Pressable
              onPress={() => navigation.navigate("JobApplications", { jobId })}
              style={({ pressed }) => [
                styles.manageBtn,
                {
                  backgroundColor: c.orangeDim,
                  borderColor: "rgba(249,115,22,0.3)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaUsers size={13} color={c.orange} />
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: c.orange,
                  marginLeft: 6,
                }}
              >
                {t("jobs.detail.viewApplicationsCount", {
                  count: job._count?.applications || 0,
                })}
              </AppText>
            </Pressable>

            {isOpen ? (
              <>
                <Pressable
                  onPress={() => navigation.navigate("EditJob", { jobId })}
                  style={({ pressed }) => [
                    styles.manageBtn,
                    {
                      backgroundColor: c.orangeDim,
                      borderColor: "rgba(249,115,22,0.3)",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <FaEdit size={13} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: c.orange,
                      marginLeft: 6,
                    }}
                  >
                    {t("jobs.detail.editJob")}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => handleStatusUpdate("FILLED")}
                  style={({ pressed }) => [
                    styles.manageBtn,
                    {
                      backgroundColor: "rgba(129,140,248,0.1)",
                      borderColor: "rgba(129,140,248,0.3)",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: "#818cf8",
                    }}
                  >
                    {t("jobs.detail.markFilled")}
                  </AppText>
                </Pressable>
                <Pressable
                  onPress={() => handleStatusUpdate("CANCELLED")}
                  style={({ pressed }) => [
                    styles.manageBtn,
                    {
                      backgroundColor: c.redDim,
                      borderColor: "rgba(239,68,68,0.25)",
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: c.red,
                    }}
                  >
                    {t("jobs.detail.cancelJob")}
                  </AppText>
                </Pressable>
              </>
            ) : null}

            {isFilled || isCancelled ? (
              <Pressable
                onPress={() => handleStatusUpdate("OPEN")}
                style={({ pressed }) => [
                  styles.manageBtn,
                  {
                    backgroundColor: c.greenDim,
                    borderColor: "rgba(34,197,94,0.25)",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.green }}
                >
                  {t("jobs.detail.reopenJob")}
                </AppText>
              </Pressable>
            ) : null}
          </View>
        </Section>
      ) : null}

      {/* Hirer card */}
      {job.hirer ? (
        <View
          style={[
            styles.hirerCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.orange,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            {t("jobs.detail.postedBy")}
          </AppText>
          <View
            style={[
              styles.hirerAvatar,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            {job.hirer.avatar ? (
              <Image
                source={{ uri: job.hirer.avatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AppText
                style={{ fontSize: 20, fontWeight: "700", color: c.orange }}
              >
                {job.hirer.firstName?.[0]}
                {job.hirer.lastName?.[0]}
              </AppText>
            )}
          </View>
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              marginTop: 8,
            }}
          >
            {job.hirer.firstName} {job.hirer.lastName}
          </AppText>
          {companyDisplay ? (
            <AppText style={{ fontSize: 12, color: c.textDim }}>
              {companyDisplay}
            </AppText>
          ) : null}
          {job.hirer.city || job.hirer.country ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
            >
              <FaMapMarkerAlt size={10} color={c.textMuted} />
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {[job.hirer.city, job.hirer.country].filter(Boolean).join(", ")}
              </AppText>
            </View>
          ) : null}
          <View style={{ flexDirection: "row", gap: 12, marginTop: 6 }}>
            {job.hirer.hirerProfile?.totalHires > 0 ? (
              <AppText
                style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
              >
                {t("jobs.detail.hiresCount", {
                  count: job.hirer.hirerProfile.totalHires,
                })}
              </AppText>
            ) : null}
            {job.hirer.hirerProfile?.avgRating > 0 ? (
              <AppText
                style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
              >
                ★ {job.hirer.hirerProfile.avgRating.toFixed(1)}
              </AppText>
            ) : null}
          </View>
          <Pressable
            onPress={() =>
              navigation.navigate("HirerDetail", { userId: job.hirer.id })
            }
            style={({ pressed }) => [
              styles.viewHirerBtn,
              {
                backgroundColor: c.orangeDim,
                borderColor: "rgba(249,115,22,0.3)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: c.orange,
              }}
            >
              {t("jobs.detail.viewProfile")}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {/* Quick facts */}
      <Section title={t("jobs.detail.quickFacts")} c={c}>
        {mainPaymentText !== t("jobs.detail.noAmount") ? (
          <FactRow
            label={mainPaymentLabel}
            value={mainPaymentText}
            valueColor={c.orange}
            c={c}
          />
        ) : null}
        {job.category?.name ? (
          <FactRow
            label={t("jobs.detail.category")}
            value={job.category.name}
            c={c}
          />
        ) : null}
        <FactRow
          label={t("jobs.detail.applicants")}
          value={String(job._count?.applications || 0)}
          c={c}
        />
        <FactRow
          label={t("jobs.detail.status")}
          value={sm.label}
          valueColor={sm.color}
          c={c}
        />
        {jobTypeMeta ? (
          <FactRow
            label={t("jobs.detail.jobType")}
            value={jobTypeMeta.label}
            c={c}
          />
        ) : null}
        {locationTypeMeta ? (
          <FactRow
            label={t("jobs.detail.workStyle")}
            value={locationTypeMeta.label}
            c={c}
          />
        ) : null}
        {job.skills?.length > 0 ? (
          <FactRow
            label={t("jobs.detail.skills")}
            value={t("jobs.detail.skillsRequiredCount", {
              count: job.skills.length,
            })}
            c={c}
          />
        ) : null}
        {qualificationsList.length > 0 ? (
          <FactRow
            label={t("jobs.detail.qualifications")}
            value={t("jobs.detail.qualificationsRequiredCount", {
              count: qualificationsList.length,
            })}
            c={c}
          />
        ) : null}
        {job.languageRequirement ? (
          <FactRow
            label={t("jobs.detail.language")}
            value={languageLabel}
            c={c}
          />
        ) : null}
        {hasWorkConditions ? (
          <FactRow
            label={t("jobs.detail.includes")}
            value={[
              job.providesAccommodation && t("jobs.detail.accommodation"),
              job.providesMeals && t("jobs.detail.meals"),
            ]
              .filter(Boolean)
              .join(", ")}
            c={c}
          />
        ) : null}
        {hasProjectDuration ? (
          <FactRow
            label={t("jobs.detail.projectDuration")}
            value={`${job.durationValue} ${job.durationType.toLowerCase()}`}
            c={c}
          />
        ) : null}
        {hasEstimatedDuration && durationParts ? (
          <FactRow
            label={t("jobs.detail.estDuration")}
            value={`${durationParts.primary}${
              durationParts.equivalents?.[0]
                ? ` (${durationParts.equivalents[0].label})`
                : ""
            }`}
            c={c}
          />
        ) : null}
        {hasRecurring ? (
          <FactRow
            label={t("jobs.detail.recurring")}
            value={recurringLabel}
            c={c}
          />
        ) : null}
        {hasCustomDuration ? (
          <FactRow
            label={t("jobs.detail.duration")}
            value={customDurationLabel}
            c={c}
          />
        ) : null}
        {job.experienceLevel ? (
          <FactRow
            label={t("jobs.detail.experience")}
            value={job.experienceLevel}
            c={c}
          />
        ) : null}
        {educationLevelLabel ? (
          <FactRow
            label={t("jobs.detail.education")}
            value={educationLevelLabel}
            c={c}
          />
        ) : null}
        {job.applicantLocation ? (
          <FactRow
            label={t("jobs.detail.preferredLocation")}
            value={job.applicantLocation}
            c={c}
          />
        ) : null}
        {job.expiryDate ? (
          <FactRow
            label={t("jobs.detail.expires")}
            value={new Date(job.expiryDate).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
        ) : null}
      </Section>

      {/* Guest CTA */}
      {!user ? (
        <View
          style={[
            styles.guestCta,
            {
              backgroundColor: c.orangeDim,
              borderColor: "rgba(249,115,22,0.2)",
            },
          ]}
        >
          <AppText
            style={{ fontSize: 12, color: c.textDim, textAlign: "center" }}
          >
            {t("jobs.detail.guestSignInBody")}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={({ pressed }) => [
              styles.guestCtaBtn,
              { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
              {t("jobs.detail.guestSignInBtn")}
            </AppText>
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function Section({ title, icon, children, c }) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 12,
        }}
      >
        {icon}
        <AppText
          style={{
            fontFamily: "Syne_700Bold",
            fontSize: 11,
            fontWeight: "700",
            color: c.textDim,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function TypePill({ icon, label, c }) {
  return (
    <View
      style={[
        styles.typePill,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {icon}
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: c.textDim,
          marginLeft: 4,
        }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

function MetaItem({ icon, text, c }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      {icon}
      <AppText style={{ fontSize: 11, color: c.textDim }} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}

function DetailCard({ icon, label, value, accent, c }) {
  return (
    <View
      style={[
        styles.detailCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {icon}
      <View style={{ flex: 1, marginLeft: 8, minWidth: 0 }}>
        <AppText style={[styles.detailLabel, { color: c.textMuted }]}>
          {label}
        </AppText>
        <AppText
          style={{
            fontSize: accent ? 14 : 12,
            fontWeight: "600",
            color: accent ? c.orange : c.text,
            lineHeight: 17,
          }}
          numberOfLines={3}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

function FactRow({ label, value, valueColor, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 7,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
        gap: 8,
      }}
    >
      <AppText style={{ fontSize: 11, color: c.textDim, flexShrink: 1 }}>
        {label}
      </AppText>
      <AppText
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: valueColor || c.text,
          textAlign: "right",
          flex: 1,
        }}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}

function PaymentNote({ text, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 6,
        marginTop: 4,
      }}
    >
      <FaInfoCircle size={10} color={c.orange} style={{ marginTop: 3 }} />
      <AppText
        style={{ fontSize: 10, color: c.textMuted, flex: 1, lineHeight: 15 }}
      >
        {text}
      </AppText>
    </View>
  );
}

// ── Styles (mirroring JobDetail.module.css) ──────────────────────
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  headerCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
    flexWrap: "wrap",
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "70%",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  typePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "100%",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
  },
  budgetBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  applicantCount: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    marginBottom: 12,
  },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "48.5%",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  paymentBreakdownCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  paymentBreakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 8,
  },
  paymentBreakdownBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  paymentBreakdownBody: {
    padding: 16,
    gap: 12,
  },
  paymentBreakdownRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  paymentBreakdownCalc: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  paymentBreakdownTotal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  applyTextarea: {
    minHeight: 90,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  applyTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 50,
  },
  applyChannel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "100%",
  },
  manageActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  hirerCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    alignItems: "center",
    marginBottom: 12,
  },
  hirerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginTop: 4,
  },
  viewHirerBtn: {
    width: "100%",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    marginTop: 8,
  },
  guestCta: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 12,
  },
  guestCtaBtn: {
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: "center",
  },
  // Plain object styles (color set inline at each usage)
  applyChannelText: {
    fontSize: 11,
    fontWeight: "600",
  },
  description: {
    fontSize: 13,
    lineHeight: 22,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  paymentBreakdownLabel: {
    fontSize: 12,
    flex: 1,
  },
  paymentBreakdownValue: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
});
