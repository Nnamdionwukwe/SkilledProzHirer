// src/components/booking/JobPostBookingDetails.js
//
// Renders the job-post payload on a booking that originated from a job post.
// Mirrors JobDetail.jsx field-for-field and label-for-label.

import React, { useState, useEffect } from "react";
import { View, Pressable, Linking, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import {
  FaBriefcase,
  FaClock,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaGlobe,
  FaRandom,
  FaDollarSign,
  FaCreditCard,
  FaTag,
  FaAward,
  FaHome,
  FaCoffee,
  FaLink,
  FaEnvelope,
  FaWhatsapp,
  FaPhone,
  FaFileAlt,
  FaClipboardCheck,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaLocationArrow,
  FaBookOpen,
  FaChartLine,
  FaAlignLeft,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import { formatJobDurationParts } from "../../utils/formatDuration";

// ── Lookup maps (identical to JobDetail.jsx) ──────────────────────────
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

const BUDGET_TYPE_LABELS = {
  HOURLY: "Per Hour",
  DAILY: "Per Day",
  WEEKLY: "Per Week",
  MONTHLY: "Per Month",
  YEARLY: "Per Year",
  CUSTOM: "Custom",
  FIXED: "Fixed Price",
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

const JOB_TYPE_LABEL = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
};

const LOCATION_TYPE_LABEL = {
  REMOTE: "Remote",
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
};

const LOCATION_TYPE_ICON = {
  REMOTE: FaGlobe,
  ON_SITE: FaMapMarkerAlt,
  HYBRID: FaRandom,
};

// ── Notes parsing (identical to JobDetail.jsx) ────────────────────────
function parseRecurring(notes) {
  if (!notes) return null;
  const m = notes.match(/Recurring:\s*([^.]+)\./i);
  return m ? m[1].trim() : null;
}
function parseCustomDuration(notes) {
  if (!notes) return null;
  const m = notes.match(/Duration:\s*([^.]+)\./i);
  return m ? m[1].trim() : null;
}
function stripSystemNotes(notes) {
  if (!notes) return notes;
  return notes
    .replace(/Recurring:\s*[^.]+\.\s*/i, "")
    .replace(/Duration:\s*[^.]+\.\s*/i, "")
    .trim();
}

// ── Small detail card ─────────────────────────────────────────────────
function DetailCard({ icon, label, value, accent, full }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  return (
    <View
      style={[
        styles.detailCard,
        full && styles.detailCardFull,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View style={styles.detailCardIcon}>{icon}</View>
      <View style={styles.detailCardBody}>
        <AppText variant="small" tone="dim" style={styles.detailCardLabel}>
          {label}
        </AppText>
        <AppText
          variant="body"
          weight="semibold"
          style={[styles.detailCardValue, accent && { color: c.orange }]}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default function JobPostBookingDetails({ booking }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [jobPost, setJobPost] = useState(booking?.jobPost || null);
  const [loadingJob, setLoadingJob] = useState(!booking?.jobPost);

  useEffect(() => {
    if (!booking?.jobPostId) return;
    if (booking.jobPost) {
      setJobPost(booking.jobPost);
      setLoadingJob(false);
      return;
    }
    let cancelled = false;
    setLoadingJob(true);
    client
      .get(`/jobs/${booking.jobPostId}`)
      .then((res) => {
        if (cancelled) return;
        const payload = res.data?.data;
        setJobPost(payload?.jobPost ?? payload);
      })
      .catch(() => {
        if (!cancelled) setJobPost(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingJob(false);
      });
    return () => {
      cancelled = true;
    };
  }, [booking?.jobPostId, booking?.jobPost]);

  if (!booking) return null;

  // Merge: booking wins, jobPost fills gaps
  const jp = jobPost || {};
  const merged = {
    title: booking.title || jp.title,
    description: booking.description || jp.description,

    locationType: booking.locationType || jp.locationType,
    address: booking.address || jp.address,
    latitude: booking.latitude ?? jp.latitude,
    longitude: booking.longitude ?? jp.longitude,

    jobType: booking.jobType || jp.jobType,
    scheduledAt: booking.scheduledAt || jp.scheduledAt,

    estimatedHours: booking.estimatedHours ?? jp.estimatedHours,
    estimatedUnit: booking.estimatedUnit || jp.estimatedUnit || "hours",
    estimatedValue: booking.estimatedValue || jp.estimatedValue,
    durationValue: booking.durationValue || jp.durationValue,
    durationType: booking.durationType || jp.durationType,

    skills:
      Array.isArray(booking.skills) && booking.skills.length
        ? booking.skills
        : Array.isArray(jp.skills)
          ? jp.skills
          : [],
    qualifications:
      Array.isArray(booking.qualifications) && booking.qualifications.length
        ? booking.qualifications
        : Array.isArray(jp.qualifications)
          ? jp.qualifications
          : [],
    requirements: booking.requirements || jp.requirements,
    responsibilities: booking.responsibilities || jp.responsibilities,
    notes: booking.notes || jp.notes,

    providesAccommodation:
      booking.providesAccommodation ?? jp.providesAccommodation ?? false,
    providesMeals: booking.providesMeals ?? jp.providesMeals ?? false,

    languageRequirement: booking.languageRequirement || jp.languageRequirement,

    currency: booking.currency || jp.currency,
    budgetType: booking.jobRateSnapshot?.budgetType || jp.budgetType || "FIXED",
    budget: jp.budget,
    salaryText: jp.salaryText,
    salaryAmount: jp.salaryAmount,
    salaryMin: jp.salaryMin,
    salaryMax: jp.salaryMax,
    salaryCurrency: jp.salaryCurrency,
    salaryPeriod: jp.salaryPeriod,
    budgetCustomLabel: jp.budgetCustomLabel,

    category: jp.category,

    minQualification: jp.minQualification,
    experienceLevel: jp.experienceLevel,
    experienceLength: jp.experienceLength,
    educationLevel: jp.educationLevel,
    workingHours: jp.workingHours,
    applicantLocation: jp.applicantLocation,

    applicationUrl: jp.applicationUrl,
    applicationEmail: jp.applicationEmail,
    applicationWhatsApp: jp.applicationWhatsApp,
    applicationPhone: jp.applicationPhone,
    sourcePlatform: jp.sourcePlatform,
    companyName: jp.companyName,

    expiryDate: jp.expiryDate,
    createdAt: jp.createdAt,
  };

  // Derived
  const LocationIcon = LOCATION_TYPE_ICON[merged.locationType];

  const languageLabel = merged.languageRequirement
    ? ALL_LANGUAGES.find((l) => l.code === merged.languageRequirement)?.label ||
      merged.languageRequirement.toUpperCase()
    : null;

  const recurringLabel = parseRecurring(merged.notes);
  const customDurationLabel = parseCustomDuration(merged.notes);
  const cleanNotes = stripSystemNotes(merged.notes);

  const durationParts = formatJobDurationParts({
    estimatedUnit: merged.estimatedUnit,
    estimatedValue: merged.estimatedValue,
    estimatedHours: merged.estimatedHours,
  });
  const hasEstimatedDuration = !!(durationParts || merged.estimatedHours);
  const hasProjectDuration = !!(merged.durationValue && merged.durationType);
  const hasRecurring = !!recurringLabel;
  const hasCustomDuration = !!customDurationLabel;

  const salaryPeriodLabel = SALARY_PERIOD_LABELS[merged.salaryPeriod];
  const educationLevelLabel = EDUCATION_LEVEL_LABELS[merged.educationLevel];
  const budgetTypeLabel = BUDGET_TYPE_LABELS[merged.budgetType];

  const hasSalaryText = !!merged.salaryText;
  const hasSalaryRange = !!(
    merged.salaryAmount ||
    merged.salaryMin ||
    merged.salaryMax
  );
  const hasBudget = merged.budget !== null && merged.budget !== undefined;

  let salaryRangeText = null;
  if (merged.salaryMin && merged.salaryMax) {
    const cur = merged.salaryCurrency || merged.currency || "";
    salaryRangeText = `${cur} ${Number(merged.salaryMin).toLocaleString()} – ${Number(merged.salaryMax).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  } else if (merged.salaryAmount) {
    const cur = merged.salaryCurrency || merged.currency || "";
    salaryRangeText = `${cur} ${Number(merged.salaryAmount).toLocaleString()}${salaryPeriodLabel ? ` · ${salaryPeriodLabel}` : ""}`;
  }

  const mainPaymentText = hasSalaryText
    ? merged.salaryText
    : hasSalaryRange
      ? salaryRangeText
      : hasBudget
        ? `${merged.currency} ${parseFloat(merged.budget).toLocaleString()}`
        : "—";

  const mainPaymentLabel = hasSalaryText
    ? "Salary"
    : hasSalaryRange
      ? "Salary Range"
      : t("booking.jobPost.budget", { defaultValue: "Budget" });

  const budgetSuffix =
    merged.budgetType && merged.budgetType !== "FIXED"
      ? merged.budgetType === "CUSTOM"
        ? merged.budgetCustomLabel
          ? ` · ${merged.budgetCustomLabel}`
          : " · Custom"
        : ` · ${BUDGET_TYPE_LABELS[merged.budgetType] || merged.budgetType}`
      : " total";

  const hasCoordinates =
    merged.latitude != null &&
    merged.longitude != null &&
    merged.locationType !== "REMOTE";

  const hasWorkConditions =
    merged.providesAccommodation || merged.providesMeals;

  const qualificationsList = Array.isArray(merged.qualifications)
    ? merged.qualifications.filter(
        (q) => typeof q === "string" && q.trim().length > 0,
      )
    : [];

  const requirementItems = [
    merged.minQualification && {
      icon: <FaAward size={14} color={c.orange} />,
      label: t("booking.jobPost.minQualification", {
        defaultValue: "Minimum Qualification",
      }),
      value: merged.minQualification,
    },
    merged.experienceLevel && {
      icon: <FaChartLine size={14} color={c.orange} />,
      label: t("booking.jobPost.experienceLevel", {
        defaultValue: "Experience Level",
      }),
      value: merged.experienceLength
        ? `${merged.experienceLevel} · ${merged.experienceLength}`
        : merged.experienceLevel,
    },
    merged.experienceLength &&
      !merged.experienceLevel && {
        icon: <FaChartLine size={14} color={c.orange} />,
        label: t("booking.jobPost.experienceLength", {
          defaultValue: "Experience Length",
        }),
        value: merged.experienceLength,
      },
    educationLevelLabel && {
      icon: <FaBookOpen size={14} color={c.orange} />,
      label: t("booking.jobPost.educationLevel", {
        defaultValue: "Education Level",
      }),
      value: educationLevelLabel,
    },
    languageLabel && {
      icon: <FaGlobe size={14} color={c.orange} />,
      label: t("booking.jobPost.language", { defaultValue: "Language" }),
      value: languageLabel,
    },
    merged.workingHours && {
      icon: <FaClock size={14} color={c.orange} />,
      label: t("booking.jobPost.workingHours", {
        defaultValue: "Working Hours",
      }),
      value: merged.workingHours,
    },
    merged.applicantLocation && {
      icon: <FaMapMarkerAlt size={14} color={c.orange} />,
      label: t("booking.jobPost.applicantLocation", {
        defaultValue: "Preferred Applicant Location",
      }),
      value: merged.applicantLocation,
    },
  ].filter(Boolean);

  const hasRequirementsBlock = requirementItems.length > 0;

  const hasExternalApplyChannels = !!(
    merged.applicationUrl ||
    merged.applicationEmail ||
    merged.applicationWhatsApp ||
    merged.applicationPhone
  );

  return (
    <>
      {/* DESCRIPTION */}
      {merged.description && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            tone="dim"
            style={styles.sectionTitle}
          >
            {t("booking.jobPost.jobDesc")}
          </AppText>
          <AppText variant="body" style={styles.description}>
            {merged.description}
          </AppText>
          {cleanNotes && (
            <View
              style={[
                styles.notes,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaFileAlt size={12} color={c.textMuted} />
              <AppText
                variant="small"
                tone="dim"
                style={{ flex: 1, marginLeft: 8 }}
              >
                {cleanNotes}
              </AppText>
            </View>
          )}
        </View>
      )}

      {/* RESPONSIBILITIES */}
      {merged.responsibilities && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <FaAlignLeft size={14} color={c.orange} />
            <AppText
              variant="small"
              weight="bold"
              tone="dim"
              style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}
            >
              {t("booking.jobPost.responsibilities")}
            </AppText>
          </View>
          <AppText variant="body" style={styles.description}>
            {merged.responsibilities}
          </AppText>
        </View>
      )}

      {/* REQUIREMENTS */}
      {merged.requirements && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <FaClipboardCheck size={14} color={c.orange} />
            <AppText
              variant="small"
              weight="bold"
              tone="dim"
              style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}
            >
              {t("booking.jobPost.requirements")}
            </AppText>
          </View>
          <AppText variant="body" style={styles.description}>
            {merged.requirements}
          </AppText>
        </View>
      )}

      {/* REQUIRED SKILLS */}
      {merged.skills?.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            tone="dim"
            style={styles.sectionTitle}
          >
            {t("booking.jobPost.skills")}
          </AppText>
          <View style={styles.pillRow}>
            {merged.skills.map((skill, i) => (
              <View
                key={i}
                style={[
                  styles.skillChip,
                  { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                ]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: c.orange }}
                >
                  {skill}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* REQUIRED QUALIFICATIONS */}
      {qualificationsList.length > 0 && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <FaAward size={14} color={c.orange} />
            <AppText
              variant="small"
              weight="bold"
              tone="dim"
              style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}
            >
              {t("booking.jobPost.qualifications")}
            </AppText>
          </View>
          <View style={styles.pillRow}>
            {qualificationsList.map((qual, i) => (
              <View
                key={i}
                style={[
                  styles.skillChip,
                  { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                ]}
              >
                <FaAward
                  size={10}
                  color={c.orange}
                  style={{ marginRight: 4 }}
                />
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: c.orange }}
                >
                  {qual}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* WORK CONDITIONS */}
      {hasWorkConditions && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <FaHome size={14} color={c.orange} />
            <AppText
              variant="small"
              weight="bold"
              tone="dim"
              style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}
            >
              {t("booking.jobPost.workConditions")}
            </AppText>
          </View>
          <View style={styles.detailGrid}>
            {merged.providesAccommodation && (
              <DetailCard
                icon={<FaHome size={14} color={c.orange} />}
                label={t("booking.jobPost.accommodation")}
                value={t("booking.jobPost.provided")}
              />
            )}
            {merged.providesMeals && (
              <DetailCard
                icon={<FaCoffee size={14} color={c.orange} />}
                label={t("booking.jobPost.meals")}
                value={t("booking.jobPost.provided")}
              />
            )}
          </View>
        </View>
      )}

      {/* DETAILS GRID */}
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText
          variant="small"
          weight="bold"
          tone="dim"
          style={styles.sectionTitle}
        >
          {t("booking.jobPost.details")}
        </AppText>
        <View style={styles.detailGrid}>
          {merged.category?.name && (
            <DetailCard
              icon={<FaFileAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.category", {
                defaultValue: "Category",
              })}
              value={`${merged.category.icon || ""} ${merged.category.name}`.trim()}
            />
          )}

          {mainPaymentText !== "—" && (
            <DetailCard
              icon={<FaDollarSign size={14} color={c.orange} />}
              label={mainPaymentLabel}
              value={
                <>
                  {mainPaymentText}
                  {hasBudget && !hasSalaryRange && !hasSalaryText && (
                    <AppText variant="small" tone="dim">
                      {" "}
                      {budgetSuffix}
                    </AppText>
                  )}
                </>
              }
              accent
            />
          )}

          {hasSalaryText && hasSalaryRange && (
            <DetailCard
              icon={<FaDollarSign size={14} color={c.orange} />}
              label={t("booking.jobPost.salaryRange", {
                defaultValue: "Salary Range (numeric)",
              })}
              value={salaryRangeText}
            />
          )}

          {merged.scheduledAt && (
            <DetailCard
              icon={<FaCalendarAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.scheduled", {
                defaultValue: "Scheduled",
              })}
              value={new Date(merged.scheduledAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}

          {hasEstimatedDuration && durationParts && (
            <DetailCard
              icon={<FaClock size={14} color={c.orange} />}
              label={t("booking.jobPost.estimatedDuration")}
              value={
                <>
                  {durationParts.primary}
                  {durationParts.equivalents.length > 0 && (
                    <AppText variant="small" tone="dim">
                      {" "}
                      (
                      {durationParts.equivalents.map((e) => e.label).join(", ")}
                      )
                    </AppText>
                  )}
                </>
              }
            />
          )}

          {hasCustomDuration && (
            <DetailCard
              icon={<FaClock size={14} color={c.orange} />}
              label={t("booking.jobPost.customDuration")}
              value={customDurationLabel}
            />
          )}

          {hasRecurring && (
            <DetailCard
              icon={<FaSyncAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.recurring")}
              value={recurringLabel}
            />
          )}

          {hasProjectDuration && (
            <DetailCard
              icon={<FaClock size={14} color={c.orange} />}
              label={t("booking.jobPost.projectDuration")}
              value={`${merged.durationValue} ${String(merged.durationType).toLowerCase()}`}
            />
          )}

          {merged.locationType && merged.address && (
            <DetailCard
              icon={<FaMapMarkerAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.location", {
                defaultValue: "Location",
              })}
              value={merged.address}
            />
          )}

          {hasCoordinates && (
            <DetailCard
              icon={<FaLocationArrow size={14} color={c.orange} />}
              label={t("booking.jobPost.coordinates")}
              value={
                <Pressable
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps?q=${merged.latitude},${merged.longitude}`,
                    )
                  }
                >
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.orange }}
                  >
                    {Number(merged.latitude).toFixed(5)},{" "}
                    {Number(merged.longitude).toFixed(5)}
                    <FaExternalLinkAlt
                      size={9}
                      color={c.orange}
                      style={{ marginLeft: 4 }}
                    />
                  </AppText>
                </Pressable>
              }
            />
          )}

          <DetailCard
            icon={<FaTag size={14} color={c.orange} />}
            label={t("booking.jobPost.status", { defaultValue: "Status" })}
            value={t("booking.jobPost.booked", { defaultValue: "Booked" })}
          />

          {merged.jobType && (
            <DetailCard
              icon={<FaBriefcase size={14} color={c.orange} />}
              label={t("booking.jobPost.jobType", {
                defaultValue: "Job Type",
              })}
              value={JOB_TYPE_LABEL[merged.jobType] || merged.jobType}
            />
          )}

          {merged.locationType && LocationIcon && (
            <DetailCard
              icon={<LocationIcon size={14} color={c.orange} />}
              label={t("booking.jobPost.workStyle")}
              value={
                LOCATION_TYPE_LABEL[merged.locationType] || merged.locationType
              }
            />
          )}

          {languageLabel && (
            <DetailCard
              icon={<FaGlobe size={14} color={c.orange} />}
              label={t("booking.jobPost.languageRequired")}
              value={languageLabel}
            />
          )}

          {merged.budgetType && budgetTypeLabel && (
            <DetailCard
              icon={<FaCreditCard size={14} color={c.orange} />}
              label={t("booking.jobPost.paymentType")}
              value={
                <>
                  {budgetTypeLabel}
                  {merged.budgetType === "CUSTOM" &&
                    merged.budgetCustomLabel && (
                      <AppText variant="small" tone="dim">
                        {" "}
                        ({merged.budgetCustomLabel})
                      </AppText>
                    )}
                </>
              }
            />
          )}

          {merged.currency && (
            <DetailCard
              icon={<FaDollarSign size={14} color={c.orange} />}
              label={t("booking.jobPost.currency", {
                defaultValue: "Currency",
              })}
              value={merged.currency}
            />
          )}

          {merged.sourcePlatform && (
            <DetailCard
              icon={<FaExternalLinkAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.sourcePlatform", {
                defaultValue: "Source Platform",
              })}
              value={merged.sourcePlatform}
            />
          )}

          {merged.expiryDate && (
            <DetailCard
              icon={<FaCalendarAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.expires", { defaultValue: "Expires" })}
              value={new Date(merged.expiryDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}

          {merged.createdAt && (
            <DetailCard
              icon={<FaCalendarAlt size={14} color={c.orange} />}
              label={t("booking.jobPost.posted", { defaultValue: "Posted" })}
              value={new Date(merged.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}
        </View>
      </View>

      {/* REQUIREMENTS & QUALIFICATIONS BLOCK */}
      {hasRequirementsBlock && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.sectionTitleRow}>
            <FaClipboardCheck size={14} color={c.orange} />
            <AppText
              variant="small"
              weight="bold"
              tone="dim"
              style={[styles.sectionTitle, { marginLeft: 6, marginBottom: 0 }]}
            >
              {t("booking.jobPost.requirements")}
            </AppText>
          </View>
          <View style={styles.detailGrid}>
            {requirementItems.map((item, i) => (
              <DetailCard
                key={i}
                icon={item.icon}
                label={item.label}
                value={item.value}
              />
            ))}
          </View>
        </View>
      )}

      {/* HOW TO APPLY */}
      {hasExternalApplyChannels && (
        <View
          style={[
            styles.section,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="bold"
            tone="dim"
            style={styles.sectionTitle}
          >
            {t("booking.jobPost.howToApply")}
          </AppText>
          <View style={styles.pillRow}>
            {merged.applicationUrl && (
              <Pressable
                onPress={() => Linking.openURL(merged.applicationUrl)}
                style={[
                  styles.channelPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaLink size={11} color={c.textDim} />
                <AppText variant="small" style={{ marginLeft: 6 }}>
                  {t("booking.jobPost.applyLink")}
                </AppText>
              </Pressable>
            )}
            {merged.applicationEmail && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`mailto:${merged.applicationEmail}`)
                }
                style={[
                  styles.channelPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaEnvelope size={11} color={c.textDim} />
                <AppText variant="small" style={{ marginLeft: 6 }}>
                  {merged.applicationEmail}
                </AppText>
              </Pressable>
            )}
            {merged.applicationWhatsApp && (
              <Pressable
                onPress={() =>
                  Linking.openURL(
                    `https://wa.me/${String(merged.applicationWhatsApp).replace(/[^0-9]/g, "")}`,
                  )
                }
                style={[
                  styles.channelPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaWhatsapp size={11} color={c.textDim} />
                <AppText variant="small" style={{ marginLeft: 6 }}>
                  {merged.applicationWhatsApp}
                </AppText>
              </Pressable>
            )}
            {merged.applicationPhone && (
              <Pressable
                onPress={() =>
                  Linking.openURL(`tel:${merged.applicationPhone}`)
                }
                style={[
                  styles.channelPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaPhone size={11} color={c.textDim} />
                <AppText variant="small" style={{ marginLeft: 6 }}>
                  {merged.applicationPhone}
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  description: { lineHeight: 22 },
  notes: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    alignItems: "flex-start",
  },
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  detailGrid: { gap: 10 },
  detailCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    alignItems: "flex-start",
  },
  detailCardFull: { width: "100%" },
  detailCardIcon: { paddingTop: 1 },
  detailCardBody: { flex: 1, minWidth: 0 },
  detailCardLabel: {
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 10,
    marginBottom: 2,
  },
  detailCardValue: { lineHeight: 20 },
  channelPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
});
