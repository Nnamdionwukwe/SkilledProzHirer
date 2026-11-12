// src/screens/main/CreateBookingFromJobScreen.js
//
// React Native port of components/hirer/CreateBookingFromJob.jsx — i18n'd.
//
// Endpoints:
//   GET  /bookings/from-job/:jobPostId/draft?workerId=…
//   POST /bookings/from-job/:jobPostId
//
// Four states: loading → not-found → form → success.
// Same fee model, same price-option logic, same negotiated override,
// same success card as the website.

import React, { useEffect, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  useNavigation,
  useFocusEffect,
  useRoute,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import { getHirerFeeRate } from "../../utils/pricing";
import { CURRENCY_META } from "../../contexts/CurrencyContext";
import {
  FaArrowLeft,
  FaLock,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaBriefcase,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaDollarSign,
  FaChartLine,
  FaLayers,
  FaCheckCircle as FaSkillCheck,
  FaSearch,
  FaInfoCircle,
  FaGlobe,
  FaHome,
  FaCoffee,
  FaAward,
  FaSyncAlt,
} from "../../icons/fa";

// ── Static lookups (mirror backend enums) — value → i18n key ─────────
const JOB_TYPE_KEY = {
  FULL_TIME: "createBooking.jobType.fullTime",
  PART_TIME: "createBooking.jobType.partTime",
  CONTRACT: "createBooking.jobType.contract",
  TEMPORARY: "createBooking.jobType.temporary",
};

const LOCATION_TYPE_KEY = {
  REMOTE: "createBooking.locationType.remote",
  ON_SITE: "createBooking.locationType.onSite",
  HYBRID: "createBooking.locationType.hybrid",
};

const LOCATION_TYPE_ICON = {
  REMOTE: FaGlobe,
  ON_SITE: FaMapMarkerAlt,
  HYBRID: FaSyncAlt,
};

const BUDGET_TYPE_KEY = {
  FIXED: "createBooking.budgetType.fixed",
  HOURLY: "createBooking.budgetType.hourly",
  DAILY: "createBooking.budgetType.daily",
  WEEKLY: "createBooking.budgetType.weekly",
  MONTHLY: "createBooking.budgetType.monthly",
  YEARLY: "createBooking.budgetType.yearly",
  CUSTOM: "createBooking.budgetType.custom",
};

const BUDGET_TYPE_PERIOD_KEY = {
  HOURLY: "createBooking.budgetPeriod.perHour",
  DAILY: "createBooking.budgetPeriod.perDay",
  WEEKLY: "createBooking.budgetPeriod.perWeek",
  MONTHLY: "createBooking.budgetPeriod.perMonth",
  YEARLY: "createBooking.budgetPeriod.perYear",
};

const RATE_UNIT = {
  HOURLY: "hours",
  DAILY: "days",
  WEEKLY: "weeks",
  MONTHLY: "months",
  YEARLY: "years",
};

const HOURS_PER_UNIT = {
  hours: 1,
  days: 8,
  weeks: 56,
  months: 242.5,
  years: 2910,
};

const DURATION_UNIT_NOUN_KEY = {
  hours: {
    one: "createBooking.duration.hour",
    other: "createBooking.duration.hours",
  },
  days: {
    one: "createBooking.duration.day",
    other: "createBooking.duration.days",
  },
  weeks: {
    one: "createBooking.duration.week",
    other: "createBooking.duration.weeks",
  },
  months: {
    one: "createBooking.duration.month",
    other: "createBooking.duration.months",
  },
  years: {
    one: "createBooking.duration.year",
    other: "createBooking.duration.years",
  },
};

const RATE_OPTION_KEY = {
  budget: "createBooking.rateOptions.budget",
  salaryAmount: "createBooking.rateOptions.salaryAmount",
  salaryMin: "createBooking.rateOptions.salaryMin",
  salaryMax: "createBooking.rateOptions.salaryMax",
  salaryText: "createBooking.rateOptions.salaryText",
};

const EDUCATION_LEVEL_KEY = {
  HIGH_SCHOOL: "createBooking.educationLevel.highSchool",
  DIPLOMA: "createBooking.educationLevel.diploma",
  BACHELOR: "createBooking.educationLevel.bachelor",
  MASTER: "createBooking.educationLevel.master",
  DOCTORATE: "createBooking.educationLevel.doctorate",
  CERTIFICATION: "createBooking.educationLevel.certification",
  OTHER: "createBooking.educationLevel.other",
};

const LANGUAGE_LABEL_KEY = {
  en: "createBooking.languages.en",
  fr: "createBooking.languages.fr",
  ar: "createBooking.languages.ar",
  yo: "createBooking.languages.yo",
  ha: "createBooking.languages.ha",
  ig: "createBooking.languages.ig",
  sw: "createBooking.languages.sw",
  pt: "createBooking.languages.pt",
  es: "createBooking.languages.es",
  de: "createBooking.languages.de",
  zh: "createBooking.languages.zh",
  hi: "createBooking.languages.hi",
  bn: "createBooking.languages.bn",
  ur: "createBooking.languages.ur",
  tr: "createBooking.languages.tr",
  ko: "createBooking.languages.ko",
  ja: "createBooking.languages.ja",
  ru: "createBooking.languages.ru",
  id: "createBooking.languages.id",
  vi: "createBooking.languages.vi",
  it: "createBooking.languages.it",
  nl: "createBooking.languages.nl",
  pl: "createBooking.languages.pl",
  fa: "createBooking.languages.fa",
  am: "createBooking.languages.am",
  zu: "createBooking.languages.zu",
  af: "createBooking.languages.af",
  so: "createBooking.languages.so",
};

const OPTION_ERROR_KEY = {
  MISSING_RATE: "createBooking.optionErrors.missingRate",
  MISSING_DURATION: "createBooking.optionErrors.missingDuration",
  CUSTOM_UNSUPPORTED: "createBooking.optionErrors.customUnsupported",
  SALARY_TEXT_UNSUPPORTED: "createBooking.optionErrors.salaryTextUnsupported",
};

// ── Formatting helpers ───────────────────────────────────────────────
function currencySymbol(code) {
  return CURRENCY_META[code]?.symbol || code || "";
}

function formatMoney(amount, currency = "NGN") {
  if (amount == null || isNaN(amount)) return "—";
  const sym = currencySymbol(currency);
  return `${sym}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatNumber(n) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function pluralize(num, unit, t) {
  const map = DURATION_UNIT_NOUN_KEY[unit];
  if (!map) return `${num} ${unit}`;
  return num === 1 ? `${num} ${t(map.one)}` : `${num} ${t(map.other)}`;
}

function formatDurationLabel(estimatedValue, estimatedUnit, t) {
  if (estimatedValue == null || estimatedValue === "") return null;
  const unit = estimatedUnit || "hours";
  if (unit === "custom") return String(estimatedValue);
  const num = parseFloat(estimatedValue);
  if (!Number.isFinite(num)) return String(estimatedValue);
  return pluralize(num, unit, t);
}

function parseRecurring(notes) {
  if (!notes) return null;
  const m = notes.match(/Recurring:\s*([^.]+)\./i);
  return m ? m[1].trim() : null;
}

function parseRecurringBreakdown(recurringText) {
  if (!recurringText) return null;
  const text = recurringText.toLowerCase();

  const forMatch = text.match(/for\s+(\d+(?:\.\d+)?)\s+(\w+)/i);
  if (forMatch) {
    const count = parseFloat(forMatch[1]);
    let unit = forMatch[2];
    if (unit === "month") unit = "months";
    else if (unit === "week") unit = "weeks";
    else if (unit === "day") unit = "days";
    else if (unit === "year") unit = "years";
    else if (unit === "hour") unit = "hours";
    if (DURATION_UNIT_NOUN_KEY[unit] && Number.isFinite(count) && count > 0) {
      return { count, unit };
    }
  }

  if (text.includes("ongoing")) {
    const interval = text.split(/\s/)[0];
    const unitMap = {
      daily: "days",
      weekly: "weeks",
      "bi-weekly": "weeks",
      biweekly: "weeks",
      monthly: "months",
      yearly: "years",
    };
    const unit = unitMap[interval];
    if (unit) return { count: 1, unit };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════
// SCREEN
// ═══════════════════════════════════════════════════════════════════════
export default function CreateBookingFromJobScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const jobPostId = route.params?.jobPostId;
  const workerId = route.params?.workerId;

  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);

  const [selectedRateOption, setSelectedRateOption] = useState("");
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");
  const [notes, setNotes] = useState("");

  // Reset state on focus — handles the "went back, tapped Create Another Booking"
  // flow so the previous success screen isn't shown again.
  useFocusEffect(
    useCallback(() => {
      setSuccess(null);
      setError("");
      setSubmitting(false);
      setNegotiatedRate("");
      setNegotiationNote("");
      setNotes("");
      if (draft?.priceOptions) {
        const firstComputable = draft.priceOptions.find(
          (o) => o.canAutoCompute !== false && o.estimatedTotal != null,
        );
        setSelectedRateOption(firstComputable?.key || "");
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft]),
  );

  // ── Fetch draft ─────────────────────────────────────────────────
  useEffect(() => {
    if (!jobPostId) {
      setError(t("createBooking.errors.missingJobPost"));
      setLoading(false);
      return;
    }
    let cancelled = false;

    const url = workerId
      ? `/bookings/from-job/${jobPostId}/draft?workerId=${workerId}`
      : `/bookings/from-job/${jobPostId}/draft`;

    client
      .get(url)
      .then((res) => {
        if (cancelled) return;
        const data = res.data.data;
        setDraft(data);
        const firstComputable = data.priceOptions?.find(
          (o) => o.canAutoCompute !== false && o.estimatedTotal != null,
        );
        if (firstComputable) setSelectedRateOption(firstComputable.key);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.data?.message || t("createBooking.errors.loadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobPostId, workerId]);

  const hasNegotiated = negotiatedRate !== "" && parseFloat(negotiatedRate) > 0;

  const selectedPriceOption = draft?.priceOptions?.find(
    (p) => p.key === selectedRateOption,
  );

  const selectedOptionBlocked =
    !hasNegotiated &&
    selectedPriceOption &&
    (selectedPriceOption.canAutoCompute === false ||
      selectedPriceOption.estimatedTotal == null);

  const finalCurrency =
    selectedPriceOption?.currency || draft?.lockedFields?.currency || "NGN";

  // ── Payment breakdown (identical math to web) ───────────────────
  const breakdown = useMemo(() => {
    if (!draft || !selectedPriceOption) return null;

    const lf = draft.lockedFields || {};
    const snap = lf.jobRateSnapshot || {};

    const rate = selectedPriceOption.amount;
    const rateCurrency = selectedPriceOption.currency || finalCurrency;
    const period = selectedPriceOption.period;
    const budgetType = period || snap.budgetType || lf.budgetType || "FIXED";

    const unitForRate = RATE_UNIT[budgetType];

    let rawDurationValue = lf.estimatedValue;
    let rawDurationUnit = lf.estimatedUnit || "hours";
    const estimatedHours = lf.estimatedHours;
    const recurringLabel = parseRecurring(lf.notes);

    let derivedFromNotes = false;
    if (
      (!rawDurationValue || rawDurationValue === "") &&
      budgetType !== "FIXED" &&
      budgetType !== "CUSTOM"
    ) {
      const parsed = parseRecurringBreakdown(recurringLabel);
      if (parsed) {
        rawDurationValue = String(parsed.count);
        rawDurationUnit = parsed.unit;
        derivedFromNotes = true;
      }
    }

    const numericRaw = parseFloat(rawDurationValue);
    let numericInRateUnit = null;
    let durationLabel = null;
    let multiplierLabel = null;

    if (Number.isFinite(numericRaw) && numericRaw > 0) {
      durationLabel = pluralize(numericRaw, rawDurationUnit, t);
      if (unitForRate) {
        const totalHours = numericRaw * (HOURS_PER_UNIT[rawDurationUnit] || 0);
        const unitHours = HOURS_PER_UNIT[unitForRate];
        if (totalHours > 0 && unitHours) {
          const rawInRateUnit = totalHours / unitHours;
          numericInRateUnit =
            unitForRate === "hours"
              ? Math.round(rawInRateUnit)
              : Number(rawInRateUnit.toFixed(2));
          multiplierLabel = pluralize(numericInRateUnit, unitForRate, t);
        }
      }
    }

    let subtotal = 0;
    let calculationText = null;
    const isFixed = budgetType === "FIXED";
    const isCustom = budgetType === "CUSTOM";
    let isRecurring = false;

    const periodLabelForType =
      BUDGET_TYPE_PERIOD_KEY[budgetType] != null
        ? t(BUDGET_TYPE_PERIOD_KEY[budgetType])
        : t(BUDGET_TYPE_KEY[budgetType] || budgetType);

    if (hasNegotiated) {
      subtotal = parseFloat(negotiatedRate);
      calculationText = null;
    } else if (isFixed) {
      subtotal = rate ?? 0;
      calculationText = t("createBooking.calc.fixedPrice", {
        amount: formatMoney(subtotal, rateCurrency),
      });
    } else if (isCustom) {
      subtotal = rate ?? 0;
      calculationText = t("createBooking.calc.customRate", {
        amount: formatMoney(subtotal, rateCurrency),
      });
    } else if (Number.isFinite(numericInRateUnit) && numericInRateUnit > 0) {
      isRecurring = true;
      subtotal = (rate ?? 0) * numericInRateUnit;
      calculationText = t("createBooking.calc.recurring", {
        rate: formatMoney(rate, rateCurrency),
        period: periodLabelForType,
        multiplier: multiplierLabel,
        total: formatMoney(subtotal, rateCurrency),
      });
    } else {
      subtotal = selectedPriceOption.estimatedTotal ?? rate ?? 0;
      calculationText = t("createBooking.calc.estimatedTotal", {
        amount: formatMoney(subtotal, rateCurrency),
      });
    }

    const feeRate = getHirerFeeRate(rateCurrency);
    const feePercent = Math.round(feeRate * 100);
    const platformFee = Math.round(subtotal * feeRate * 100) / 100;
    const grandTotal = subtotal + platformFee;

    return {
      rate,
      rateCurrency,
      budgetType,
      budgetTypeLabel: t(BUDGET_TYPE_KEY[budgetType] || budgetType),
      periodLabel:
        BUDGET_TYPE_PERIOD_KEY[budgetType] != null
          ? t(BUDGET_TYPE_PERIOD_KEY[budgetType])
          : null,
      multiplierLabel,
      durationLabel,
      estimatedHours,
      calculationText,
      subtotal,
      platformFeeRate: feeRate,
      platformFeePercent: feePercent,
      platformFee,
      grandTotal,
      isNegotiated: hasNegotiated,
      isFixed: isFixed && !hasNegotiated,
      isRecurring,
      isCustom,
      derivedFromNotes,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    draft,
    selectedPriceOption,
    hasNegotiated,
    negotiatedRate,
    finalCurrency,
    t,
  ]);

  const canSubmit =
    !submitting &&
    selectedRateOption &&
    !selectedOptionBlocked &&
    (breakdown?.subtotal != null || hasNegotiated);

  // ── Submit ──────────────────────────────────────────────────────
  async function handleSubmit() {
    setError("");

    if (!workerId && !draft?.lockedFields?.workerId) {
      setError(t("createBooking.errors.missingWorker"));
      return;
    }
    if (!selectedRateOption) {
      setError(t("createBooking.errors.selectOption"));
      return;
    }
    if (selectedOptionBlocked && !hasNegotiated) {
      setError(t("createBooking.errors.needsNegotiated"));
      return;
    }

    const resolvedWorkerId = workerId || draft?.lockedFields?.workerId;

    setSubmitting(true);
    try {
      const payload = {
        workerId: resolvedWorkerId,
        selectedRateOption,
        notes: notes.trim() || undefined,
      };
      if (hasNegotiated) {
        payload.negotiatedRate = parseFloat(negotiatedRate);
        if (negotiationNote.trim()) {
          payload.negotiationNote = negotiationNote.trim();
        }
      }

      const res = await client.post(`/bookings/from-job/${jobPostId}`, payload);
      setSuccess(res.data.data.booking);
    } catch (err) {
      setError(
        err.response?.data?.message || t("createBooking.errors.submitFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  const goBackToApplications = () => {
    if (jobPostId) {
      navigation.navigate("JobApplications", { jobId: jobPostId });
      return;
    }
    try {
      navigation.navigate("JobsManagement");
    } catch {
      navigation.goBack();
    }
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <PageSkeleton variant="detail" />
      </View>
    );
  }

  // ── Success ─────────────────────────────────────────────────────
  if (success) {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={styles.page}
      >
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <FaCheckCircle size={56} color={c.green} />
          </View>
          <AppText
            weight="displayBlack"
            style={{ fontSize: 15, letterSpacing: -0.5, marginBottom: 4 }}
          >
            {t("createBooking.success.title")}
          </AppText>
          <AppText
            style={[styles.successText, { color: c.textDim, fontSize: 12 }]}
          >
            {t("createBooking.success.subtitle", {
              name: `${success.worker?.firstName || ""} ${success.worker?.lastName || ""}`.trim(),
            })}
          </AppText>

          <View
            style={[
              styles.successCard,
              {
                backgroundColor: c.orangeDim,
                borderColor: c.orangeGlow,
              },
            ]}
          >
            <AppText style={[styles.successCat, { color: c.orange }]}>
              {success.category?.icon}{" "}
              {success.category?.name ||
                t("createBooking.success.categoryFallback")}
            </AppText>
            <AppText
              weight="displayBlack"
              style={{ fontSize: 15, letterSpacing: -0.5, marginBottom: 4 }}
            >
              {success.title}
            </AppText>

            <SuccessMeta
              icon={<FaMapMarkerAlt size={11} color={c.orange} />}
              text={
                success.locationType === "REMOTE"
                  ? t("createBooking.success.remote")
                  : success.address || "—"
              }
              c={c}
            />
            <SuccessMeta
              icon={<FaDollarSign size={11} color={c.orange} />}
              text={`${formatMoney(success.agreedRate, success.currency)}${
                success.isNegotiated
                  ? ` · ${t("createBooking.success.negotiated")}`
                  : ""
              }`}
              c={c}
            />
            {success.scheduledAt ? (
              <SuccessMeta
                icon={<FaCalendarAlt size={11} color={c.orange} />}
                text={new Date(success.scheduledAt).toLocaleString()}
                c={c}
              />
            ) : null}
          </View>

          <View style={styles.successActions}>
            <Pressable
              onPress={() =>
                navigation.navigate("BookingDetail", {
                  bookingId: success.id,
                })
              }
              style={({ pressed }) => [
                styles.submitBtn,
                { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 14, fontWeight: "700", color: c.bg }}>
                {t("createBooking.success.viewBooking")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("Bookings")}
              style={({ pressed }) => [
                styles.cancelBtn,
                { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AppText
                style={{ fontSize: 14, fontWeight: "700", color: c.textDim }}
              >
                {t("createBooking.success.allBookings")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    );
  }

  // ── Not found ───────────────────────────────────────────────────
  if (!draft) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: c.bg,
          padding: 20,
        }}
      >
        <FaSearch size={48} color={c.textMuted} />
        <AppText
          weight="displayBlack"
          style={{ color: c.text, fontSize: 20, marginTop: 16 }}
        >
          {error || t("createBooking.errors.draftNotFound")}
        </AppText>
        <Pressable
          onPress={goBackToApplications}
          style={({ pressed }) => [
            styles.backLink,
            { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <FaArrowLeft size={11} color={c.textDim} />
          <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
            {t("createBooking.backToApplications")}
          </AppText>
        </Pressable>
      </View>
    );
  }

  // ── Main form ───────────────────────────────────────────────────
  const { worker, category, lockedFields, priceOptions, jobTitle } = draft;
  const LocationIcon = LOCATION_TYPE_ICON[lockedFields.locationType];
  const languageLabel = lockedFields.languageRequirement
    ? LANGUAGE_LABEL_KEY[lockedFields.languageRequirement]
      ? t(LANGUAGE_LABEL_KEY[lockedFields.languageRequirement])
      : lockedFields.languageRequirement.toUpperCase()
    : null;
  const educationLabel = lockedFields.educationLevel
    ? EDUCATION_LEVEL_KEY[lockedFields.educationLevel]
      ? t(EDUCATION_LEVEL_KEY[lockedFields.educationLevel])
      : lockedFields.educationLevel
    : null;

  const recurringLabel = parseRecurring(lockedFields.notes);

  const hasRequirementsBlock = !!(
    lockedFields.minQualification ||
    lockedFields.experienceLevel ||
    lockedFields.experienceLength ||
    educationLabel ||
    lockedFields.workingHours ||
    lockedFields.applicantLocation
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.page}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable
        onPress={goBackToApplications}
        style={({ pressed }) => [
          styles.backLink,
          { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <FaArrowLeft size={11} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
          {t("createBooking.backToApplications")}
        </AppText>
      </Pressable>

      {/* Header */}
      <View style={{ marginBottom: 24 }}>
        <AppText style={[styles.eyebrow, { color: c.orange }]}>
          {t("createBooking.eyebrow")}
        </AppText>
        <AppText
          weight="displayBlack"
          style={{ fontSize: 15, letterSpacing: -0.5, marginBottom: 8 }}
        >
          {t("createBooking.title")}
        </AppText>
        <AppText style={[styles.subtitle, { color: c.textDim, fontSize: 10 }]}>
          {t("createBooking.subtitle", {
            jobTitle,
            workerName:
              `${worker?.firstName || ""} ${worker?.lastName || ""}`.trim(),
            workerTitle: worker?.workerProfile?.title
              ? ` · ${worker.workerProfile.title}`
              : "",
          })}
        </AppText>
      </View>

      {/* Error alert */}
      {error ? (
        <Pressable
          onPress={() => setError("")}
          style={[
            styles.alertError,
            { backgroundColor: c.redDim, borderColor: c.red },
          ]}
        >
          <FaExclamationTriangle size={12} color={c.red} />
          <AppText
            style={{ flex: 1, color: c.red, fontSize: 12, marginLeft: 8 }}
          >
            {error}
          </AppText>
          <FaTimes size={12} color={c.red} />
        </Pressable>
      ) : null}

      {/* Form card */}
      <View
        style={[
          styles.formCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        {/* Locked banner */}
        <View style={styles.lockHeader}>
          <FaLock size={11} color={c.orange} />
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 0.8,
              color: c.orange,
              marginLeft: 6,
            }}
          >
            {t("createBooking.lockedBanner")}
          </AppText>
        </View>

        {/* Locked grid */}
        <View style={styles.lockedGrid}>
          {category ? (
            <LockedCard
              icon={<FaLayers size={13} color={c.orange} />}
              label={t("createBooking.locked.category")}
              value={`${category.icon ? `${category.icon} ` : ""}${category.name}`}
              c={c}
            />
          ) : null}
          {lockedFields.jobType ? (
            <LockedCard
              icon={<FaBriefcase size={13} color={c.orange} />}
              label={t("createBooking.locked.jobType")}
              value={t(
                JOB_TYPE_KEY[lockedFields.jobType] || lockedFields.jobType,
              )}
              c={c}
            />
          ) : null}
          {lockedFields.locationType ? (
            <LockedCard
              icon={<FaMapMarkerAlt size={13} color={c.orange} />}
              label={t("createBooking.locked.workStyle")}
              value={t(
                LOCATION_TYPE_KEY[lockedFields.locationType] ||
                  lockedFields.locationType,
              )}
              c={c}
            />
          ) : null}
          {lockedFields.scheduledAt ? (
            <LockedCard
              icon={<FaCalendarAlt size={13} color={c.orange} />}
              label={t("createBooking.locked.scheduled")}
              value={new Date(lockedFields.scheduledAt).toLocaleString(
                "en-GB",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
              c={c}
            />
          ) : null}
          {lockedFields.estimatedValue ? (
            <LockedCard
              icon={<FaClock size={13} color={c.orange} />}
              label={t("createBooking.locked.estimatedDuration")}
              value={`${formatDurationLabel(
                lockedFields.estimatedValue,
                lockedFields.estimatedUnit,
                t,
              )}${
                lockedFields.estimatedHours &&
                lockedFields.estimatedUnit !== "hours"
                  ? ` · ${t("createBooking.locked.durationApprox", {
                      hours: formatNumber(lockedFields.estimatedHours),
                    })}`
                  : ""
              }`}
              c={c}
            />
          ) : null}
          {!lockedFields.estimatedValue && recurringLabel ? (
            <LockedCard
              icon={<FaSyncAlt size={13} color={c.orange} />}
              label={t("createBooking.locked.recurringSchedule")}
              value={recurringLabel}
              c={c}
            />
          ) : null}
          {lockedFields.locationType !== "REMOTE" && lockedFields.address ? (
            <LockedCard
              icon={<FaMapMarkerAlt size={13} color={c.orange} />}
              label={t("createBooking.locked.address")}
              value={lockedFields.address}
              full
              c={c}
            />
          ) : null}
        </View>

        {/* Job title */}
        <Field label={t("createBooking.fields.jobTitle")} c={c}>
          <LockedValue text={lockedFields.title} c={c} />
        </Field>

        {/* Description */}
        <Field label={t("createBooking.fields.description")} c={c}>
          <LockedValue text={lockedFields.description} multiline c={c} />
        </Field>

        {/* Work conditions */}
        {lockedFields.providesAccommodation || lockedFields.providesMeals ? (
          <Field label={t("createBooking.fields.workConditions")} c={c}>
            <View style={styles.chipsRow}>
              {lockedFields.providesAccommodation ? (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <FaHome size={11} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.orange,
                      marginLeft: 5,
                    }}
                  >
                    {t("createBooking.workConditions.accommodation")}
                  </AppText>
                </View>
              ) : null}
              {lockedFields.providesMeals ? (
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <FaCoffee size={11} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.orange,
                      marginLeft: 5,
                    }}
                  >
                    {t("createBooking.workConditions.meals")}
                  </AppText>
                </View>
              ) : null}
            </View>
          </Field>
        ) : null}

        {/* Skills */}
        {lockedFields.skills?.length > 0 ? (
          <Field label={t("createBooking.fields.requiredSkills")} c={c}>
            <View style={styles.chipsRow}>
              {lockedFields.skills.map((s, i) => (
                <View
                  key={i}
                  style={[
                    styles.chip,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <FaSkillCheck size={10} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.orange,
                      marginLeft: 4,
                    }}
                  >
                    {s}
                  </AppText>
                </View>
              ))}
            </View>
          </Field>
        ) : null}

        {/* Qualifications */}
        {lockedFields.qualifications?.length > 0 ? (
          <Field label={t("createBooking.fields.requiredQualifications")} c={c}>
            <View style={styles.chipsRow}>
              {lockedFields.qualifications.map((q, i) => (
                <View
                  key={i}
                  style={[
                    styles.chip,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <FaAward size={10} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.orange,
                      marginLeft: 4,
                    }}
                  >
                    {q}
                  </AppText>
                </View>
              ))}
            </View>
          </Field>
        ) : null}

        {/* Additional requirements grid */}
        {hasRequirementsBlock ? (
          <Field label={t("createBooking.fields.additionalRequirements")} c={c}>
            <View style={styles.lockedGrid}>
              {lockedFields.minQualification ? (
                <LockedCard
                  icon={<FaAward size={13} color={c.orange} />}
                  label={t("createBooking.locked.minQualification")}
                  value={lockedFields.minQualification}
                  c={c}
                />
              ) : null}
              {lockedFields.experienceLevel ? (
                <LockedCard
                  icon={<FaChartLine size={13} color={c.orange} />}
                  label={t("createBooking.locked.experienceLevel")}
                  value={
                    lockedFields.experienceLength
                      ? `${lockedFields.experienceLevel} · ${lockedFields.experienceLength}`
                      : lockedFields.experienceLevel
                  }
                  c={c}
                />
              ) : null}
              {educationLabel ? (
                <LockedCard
                  icon={<FaAward size={13} color={c.orange} />}
                  label={t("createBooking.locked.educationLevel")}
                  value={educationLabel}
                  c={c}
                />
              ) : null}
              {languageLabel ? (
                <LockedCard
                  icon={<FaGlobe size={13} color={c.orange} />}
                  label={t("createBooking.locked.language")}
                  value={languageLabel}
                  c={c}
                />
              ) : null}
              {lockedFields.workingHours ? (
                <LockedCard
                  icon={<FaClock size={13} color={c.orange} />}
                  label={t("createBooking.locked.workingHours")}
                  value={lockedFields.workingHours}
                  c={c}
                />
              ) : null}
              {lockedFields.applicantLocation ? (
                <LockedCard
                  icon={<FaMapMarkerAlt size={13} color={c.orange} />}
                  label={t("createBooking.locked.applicantLocation")}
                  value={lockedFields.applicantLocation}
                  c={c}
                />
              ) : null}
            </View>
          </Field>
        ) : null}

        {lockedFields.requirements ? (
          <Field label={t("createBooking.fields.requirements")} c={c}>
            <LockedValue text={lockedFields.requirements} multiline c={c} />
          </Field>
        ) : null}
        {lockedFields.responsibilities ? (
          <Field label={t("createBooking.fields.responsibilities")} c={c}>
            <LockedValue text={lockedFields.responsibilities} multiline c={c} />
          </Field>
        ) : null}

        {/* Payment divider */}
        <View style={[styles.sectionDivider, { borderTopColor: c.border }]}>
          <FaDollarSign size={13} color={c.orange} />
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: c.textDim,
              marginLeft: 8,
            }}
          >
            {t("createBooking.sections.payment")}
          </AppText>
        </View>

        {/* Rate options */}
        <Field
          label={t("createBooking.payment.selectOption")}
          hint={t("createBooking.payment.selectOptionHint")}
          c={c}
        >
          <View style={{ gap: 8 }}>
            {priceOptions.map((option) => {
              const blocked =
                option.canAutoCompute === false ||
                option.estimatedTotal == null;
              const isSelected = selectedRateOption === option.key;
              const dimmed = hasNegotiated && !isSelected;

              const optionLabel = RATE_OPTION_KEY[option.key]
                ? t(RATE_OPTION_KEY[option.key])
                : option.label;
              const optionPeriodLabel =
                option.period && option.period !== "FIXED"
                  ? t(BUDGET_TYPE_KEY[option.period] || option.period)
                  : null;
              const optionPeriodShort =
                option.period && option.period !== "FIXED"
                  ? BUDGET_TYPE_PERIOD_KEY[option.period]
                    ? t(BUDGET_TYPE_PERIOD_KEY[option.period])
                    : ""
                  : "";

              return (
                <Pressable
                  key={option.key}
                  onPress={() => setSelectedRateOption(option.key)}
                  style={({ pressed }) => [
                    styles.rateOption,
                    {
                      backgroundColor: isSelected ? c.orangeDim : c.bgCard,
                      borderColor: blocked
                        ? "rgba(239,68,68,0.25)"
                        : isSelected
                          ? c.orange
                          : c.border,
                      opacity: dimmed ? 0.5 : pressed ? 0.9 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 18,
                      color: c.orange,
                      marginRight: 10,
                      marginTop: -2,
                    }}
                  >
                    {isSelected ? "◉" : "○"}
                  </AppText>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <AppText
                        style={{
                          fontSize: 14,
                          fontWeight: "700",
                          color: c.text,
                          flex: 1,
                        }}
                      >
                        {optionLabel}
                      </AppText>
                      {optionPeriodLabel ? (
                        <View
                          style={[
                            styles.miniBadge,
                            {
                              backgroundColor: c.orangeDim,
                              borderColor: c.orangeGlow,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color: c.orange,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {optionPeriodLabel}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                    {option.description ? (
                      <AppText
                        style={{
                          fontSize: 12,
                          color: c.textDim,
                          marginTop: 3,
                        }}
                      >
                        {option.description}
                      </AppText>
                    ) : null}

                    {!blocked ? (
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "800",
                          color: c.orange,
                          marginTop: 6,
                        }}
                      >
                        {option.period && option.period !== "FIXED"
                          ? t("createBooking.payment.rateAndTotal", {
                              rate: formatMoney(option.amount, option.currency),
                              period: optionPeriodShort,
                              total: formatMoney(
                                option.estimatedTotal,
                                option.currency,
                              ),
                            })
                          : t("createBooking.payment.totalOnly", {
                              total: formatMoney(
                                option.estimatedTotal,
                                option.currency,
                              ),
                            })}
                      </AppText>
                    ) : (
                      <View
                        style={[
                          styles.blockedNote,
                          {
                            backgroundColor: "rgba(239,68,68,0.08)",
                            borderColor: "rgba(239,68,68,0.2)",
                          },
                        ]}
                      >
                        <FaInfoCircle size={10} color={c.red} />
                        <AppText
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color: c.red,
                            marginLeft: 5,
                            flex: 1,
                          }}
                        >
                          {OPTION_ERROR_KEY[option.error]
                            ? t(OPTION_ERROR_KEY[option.error])
                            : t("createBooking.optionErrors.fallback")}
                        </AppText>
                      </View>
                    )}

                    {!blocked && option.explanation ? (
                      <AppText
                        style={{
                          fontSize: 10,
                          color: c.textMuted,
                          marginTop: 3,
                        }}
                      >
                        {option.explanation}
                      </AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Field>

        {/* Full payment breakdown */}
        {breakdown && !selectedOptionBlocked ? (
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <View
              style={[
                styles.breakdownHeader,
                {
                  backgroundColor: c.orangeDim,
                  borderBottomColor: c.orangeGlow,
                },
              ]}
            >
              <FaDollarSign size={14} color={c.orange} />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  color: c.orange,
                  marginLeft: 6,
                  flex: 1,
                }}
              >
                {t("createBooking.breakdown.title")}
              </AppText>
              <View
                style={[
                  styles.miniBadge,
                  { backgroundColor: c.bg, borderColor: c.orangeGlow },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 9,
                    fontWeight: "700",
                    color: c.orange,
                  }}
                >
                  {breakdown.isNegotiated
                    ? t("createBooking.breakdown.negotiatedBadge")
                    : breakdown.budgetTypeLabel}
                </AppText>
              </View>
            </View>

            <View style={{ padding: 16, gap: 12 }}>
              <BreakdownRow
                label={
                  breakdown.isFixed
                    ? t("createBooking.breakdown.fixedPrice")
                    : t("createBooking.breakdown.rate")
                }
                value={
                  <>
                    {formatMoney(breakdown.rate, breakdown.rateCurrency)}
                    {!breakdown.isFixed && breakdown.periodLabel ? (
                      <AppText
                        style={{
                          fontSize: 11,
                          color: c.textMuted,
                          fontWeight: "500",
                        }}
                      >
                        {" "}
                        {breakdown.periodLabel}
                      </AppText>
                    ) : null}
                  </>
                }
                c={c}
              />

              {breakdown.isRecurring && breakdown.durationLabel ? (
                <BreakdownRow
                  label={t("createBooking.breakdown.durationLabel", {
                    type: breakdown.budgetTypeLabel,
                  })}
                  value={
                    <>
                      {breakdown.durationLabel}
                      {breakdown.multiplierLabel &&
                      breakdown.multiplierLabel !== breakdown.durationLabel ? (
                        <AppText
                          style={{
                            fontSize: 11,
                            color: c.textMuted,
                            fontWeight: "500",
                          }}
                        >
                          {" "}
                          {t("createBooking.breakdown.approx", {
                            multiplier: breakdown.multiplierLabel,
                          })}
                        </AppText>
                      ) : null}
                    </>
                  }
                  c={c}
                />
              ) : null}

              {breakdown.isCustom &&
              breakdown.durationLabel &&
              !breakdown.isRecurring ? (
                <BreakdownRow
                  label={t("createBooking.breakdown.duration")}
                  value={breakdown.durationLabel}
                  c={c}
                />
              ) : null}

              {breakdown.calculationText ? (
                <View
                  style={[
                    styles.calcBox,
                    { backgroundColor: c.bgInput, borderColor: c.border },
                  ]}
                >
                  <FaInfoCircle size={11} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.textDim,
                      marginLeft: 6,
                      flex: 1,
                      fontFamily: "monospace",
                    }}
                  >
                    {breakdown.calculationText}
                  </AppText>
                </View>
              ) : null}

              {!breakdown.isFixed ? (
                <BreakdownRow
                  label={t("createBooking.breakdown.subtotal")}
                  value={formatMoney(
                    breakdown.subtotal,
                    breakdown.rateCurrency,
                  )}
                  c={c}
                />
              ) : null}

              <BreakdownRow
                label={
                  <>
                    {t("createBooking.breakdown.platformFee", {
                      percent: breakdown.platformFeePercent,
                    })}
                    <AppText
                      style={{
                        fontSize: 10,
                        color: c.textMuted,
                        fontWeight: "400",
                        fontStyle: "italic",
                      }}
                    >
                      {" "}
                      {t("createBooking.breakdown.platformFeeNote")}
                    </AppText>
                  </>
                }
                value={`+ ${formatMoney(breakdown.platformFee, breakdown.rateCurrency)}`}
                c={c}
              />

              <View style={{ height: 1, backgroundColor: c.border }} />

              <View
                style={[
                  styles.totalBox,
                  {
                    backgroundColor: c.orangeDim,
                    borderColor: c.orangeGlow,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 7,
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    color: c.orange,
                  }}
                >
                  {breakdown.isNegotiated
                    ? t("createBooking.breakdown.negotiatedTotal")
                    : t("createBooking.breakdown.youPay")}
                </AppText>
                <AppText
                  weight="displayBlack"
                  style={{
                    fontSize: 13,
                    letterSpacing: -0.5,
                    marginBottom: 4,
                    color: c.orange,
                  }}
                >
                  {formatMoney(breakdown.grandTotal, breakdown.rateCurrency)}
                </AppText>
              </View>

              {/* Contextual notes */}
              <View style={{ gap: 6 }}>
                {breakdown.isFixed ? (
                  <Note text={t("createBooking.notes.fixed")} c={c} />
                ) : null}
                {breakdown.isRecurring ? (
                  <Note
                    text={t("createBooking.notes.recurring", {
                      rate: formatMoney(breakdown.rate, breakdown.rateCurrency),
                      period: breakdown.periodLabel,
                      multiplier:
                        breakdown.multiplierLabel || breakdown.durationLabel,
                      budgetType: breakdown.budgetType.toLowerCase(),
                      duration: breakdown.durationLabel,
                    })}
                    c={c}
                  />
                ) : null}
                {breakdown.isCustom ? (
                  <Note text={t("createBooking.notes.custom")} c={c} />
                ) : null}
                {breakdown.isNegotiated ? (
                  <Note text={t("createBooking.notes.negotiated")} c={c} />
                ) : null}
                <Note text={t("createBooking.notes.referral")} c={c} />
              </View>
            </View>
          </View>
        ) : null}

        {/* Negotiated override */}
        <View
          style={[
            styles.negotiatedBox,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              marginBottom: 6,
            }}
          >
            <FaChartLine size={12} color={c.orange} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                color: c.orange,
              }}
            >
              {t("createBooking.negotiated.title")}
            </AppText>
          </View>
          <AppText
            style={{
              fontSize: 11,
              color: c.textMuted,
              lineHeight: 16,
              marginBottom: 10,
            }}
          >
            {t("createBooking.negotiated.description")}
          </AppText>

          <View style={styles.negotiatedRow}>
            <TextInput
              keyboardType="decimal-pad"
              placeholder={t("createBooking.negotiated.placeholder")}
              placeholderTextColor={c.textMuted}
              value={negotiatedRate}
              onChangeText={setNegotiatedRate}
              style={[
                styles.input,
                {
                  flex: 1,
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            />
            <View
              style={[
                styles.currencyLabel,
                {
                  backgroundColor: c.orangeDim,
                  borderColor: c.orangeGlow,
                },
              ]}
            >
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 13,
                  fontWeight: "800",
                  color: c.orange,
                }}
              >
                {finalCurrency}
              </AppText>
            </View>
          </View>

          {hasNegotiated ? (
            <>
              <TextInput
                placeholder={t("createBooking.negotiated.notePlaceholder")}
                placeholderTextColor={c.textMuted}
                value={negotiationNote}
                onChangeText={setNegotiationNote}
                maxLength={500}
                style={[
                  styles.input,
                  {
                    marginTop: 10,
                    color: c.text,
                    borderColor: c.border,
                    backgroundColor: c.bgInput,
                  },
                ]}
              />
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: c.green,
                  marginTop: 8,
                }}
              >
                {t("createBooking.negotiated.summary", {
                  amount: formatMoney(negotiatedRate, finalCurrency),
                })}
              </AppText>
            </>
          ) : null}
        </View>

        {/* Booking notes */}
        <Field label={t("createBooking.notes.bookingNotesLabel")} c={c}>
          <TextInput
            multiline
            numberOfLines={3}
            placeholder={t("createBooking.notes.bookingNotesPlaceholder")}
            placeholderTextColor={c.textMuted}
            value={notes}
            onChangeText={setNotes}
            maxLength={1000}
            textAlignVertical="top"
            style={[
              styles.textarea,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.bgInput,
              },
            ]}
          />
        </Field>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={goBackToApplications}
            style={({ pressed }) => [
              styles.cancelBtn,
              { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText
              style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
            >
              {t("common.cancel")}
            </AppText>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.submitBtn,
              {
                backgroundColor: canSubmit ? c.orange : c.border,
                opacity: submitting ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {submitting ? (
              <>
                <ActivityIndicator size="small" color={c.bg} />
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.bg,
                    marginLeft: 8,
                  }}
                >
                  {t("createBooking.submit.creating")}
                </AppText>
              </>
            ) : (
              <>
                <FaCheckCircle
                  size={14}
                  color={canSubmit ? c.bg : c.textMuted}
                />
                <AppText
                  weight="displayBlack"
                  style={{
                    fontSize: 14,
                    fontWeight: "800",
                    color: canSubmit ? c.bg : c.textMuted,
                    marginLeft: 8,
                  }}
                >
                  {breakdown
                    ? t("createBooking.submit.withTotal", {
                        amount: formatMoney(
                          breakdown.grandTotal,
                          breakdown.rateCurrency,
                        ),
                      })
                    : t("createBooking.submit.plain")}
                </AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────
function Field({ label, hint, children, c }) {
  return (
    <View style={{ gap: 8 }}>
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.8,
          color: c.textDim,
        }}
      >
        {label}
      </AppText>
      {hint ? (
        <AppText style={{ fontSize: 11, color: c.textMuted }}>{hint}</AppText>
      ) : null}
      {children}
    </View>
  );
}

function LockedCard({ icon, label, value, full, c }) {
  return (
    <View
      style={[
        styles.lockedCard,
        {
          backgroundColor: c.bgCard,
          borderColor: c.border,
          ...(full && { width: "100%", paddingHorizontal: 12 }),
        },
      ]}
    >
      <View style={{ marginTop: 1 }}>{icon}</View>
      <View style={{ flex: 1, minWidth: 0, marginLeft: 10 }}>
        <AppText
          style={{
            fontSize: 9,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: c.textMuted,
            marginBottom: 3,
          }}
        >
          {label}
        </AppText>
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: c.text,
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

function LockedValue({ text, multiline, c }) {
  return (
    <View
      style={{
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.border,
        backgroundColor: c.bgInput,
      }}
    >
      <AppText
        style={{
          fontSize: 13,
          color: c.text,
          lineHeight: multiline ? 20 : 18,
        }}
      >
        {text}
      </AppText>
    </View>
  );
}

function BreakdownRow({ label, value, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 12, color: c.textDim }}>{label}</AppText>
      </View>
      <AppText
        style={{
          fontSize: 13,
          fontWeight: "700",
          color: c.text,
          textAlign: "right",
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function Note({ text, c }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}>
      <FaInfoCircle size={11} color={c.orange} style={{ marginTop: 3 }} />
      <AppText
        style={{ fontSize: 11, color: c.textMuted, flex: 1, lineHeight: 16 }}
      >
        {text}
      </AppText>
    </View>
  );
}

function SuccessMeta({ icon, text, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        marginTop: 4,
      }}
    >
      {icon}
      <AppText style={{ fontSize: 12, color: c.textDim }}>{text}</AppText>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
  },
  alertError: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  formCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 20,
  },
  lockHeader: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
    backgroundColor: "rgba(249,115,22,0.10)",
  },
  lockedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -5,
  },
  lockedCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    width: "50%",
    paddingHorizontal: 17,
    marginBottom: 10,
  },
  sectionDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  rateOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  blockedNote: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
    gap: 5,
  },
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
    marginTop: 4,
  },
  breakdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  calcBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 6,
  },
  totalBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  negotiatedBox: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 16,
  },
  negotiatedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyLabel: {
    paddingHorizontal: 14,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
  input: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
  },
  textarea: {
    minHeight: 80,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  submitBtn: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  successWrap: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 8,
    maxWidth: 520,
    alignSelf: "center",
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
  },
  successText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  successCard: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  successCat: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  successActions: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "center",
  },
});
