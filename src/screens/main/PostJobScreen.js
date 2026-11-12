// src/screens/main/PostJobScreen.js
//
// Verbatim port of components/hirer/PostJob.jsx.
//
// Endpoints:
//   GET  /categories?all=true
//   POST /categories/suggest  (custom category)
//   POST /jobs
//
// Form fields (verbatim from web):
//   · Category (search + custom add)
//   · Title, Description
//   · Job type (FULL_TIME / PART_TIME / CONTRACT / TEMPORARY)
//   · Location type (REMOTE / ON_SITE / HYBRID) + address + lat/lng
//   · Scheduled date & time
//   · Language requirement
//   · Schedule mode: ONE_OFF vs RECURRING
//   · Budget: amount + currency + rate type + live total preview
//   · Work conditions (accommodation, meals)
//   · Qualifications (with presets)
//   · Skills (with suggestions)
//   · Notes
//
// Success screen mirrors web's successCard.

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import { CURRENCIES } from "../../constants/currencies";
import {
  FaBriefcase,
  FaClock,
  FaFileAlt,
  FaMapMarkerAlt,
  FaGlobe,
  FaRandom,
  FaDollarSign,
  FaCheckCircle,
  FaPlus,
  FaX,
  FaTarget,
  FaBolt,
  FaTag,
  FaUser,
  FaUsers,
  FaCalendarAlt,
  FaAlignLeft,
  FaRefreshCw,
  FaHome,
  FaCoffee,
  FaAward,
  FaChevronDown,
  FaChevronUp,
} from "../../icons/fa";

// ── Constants — verbatim from web ────────────────────────────────────
// `label` values are i18n keys. They are translated at render time
// via `t(label)` — the array shape itself is unchanged.
const ALL_LANGUAGES = [
  { code: "en", label: "postJob.languages.en" },
  { code: "fr", label: "postJob.languages.fr" },
  { code: "ar", label: "postJob.languages.ar" },
  { code: "yo", label: "postJob.languages.yo" },
  { code: "ha", label: "postJob.languages.ha" },
  { code: "ig", label: "postJob.languages.ig" },
  { code: "sw", label: "postJob.languages.sw" },
  { code: "pt", label: "postJob.languages.pt" },
  { code: "es", label: "postJob.languages.es" },
  { code: "de", label: "postJob.languages.de" },
  { code: "zh", label: "postJob.languages.zh" },
  { code: "hi", label: "postJob.languages.hi" },
  { code: "bn", label: "postJob.languages.bn" },
  { code: "ur", label: "postJob.languages.ur" },
  { code: "tr", label: "postJob.languages.tr" },
  { code: "ko", label: "postJob.languages.ko" },
  { code: "ja", label: "postJob.languages.ja" },
  { code: "ru", label: "postJob.languages.ru" },
  { code: "id", label: "postJob.languages.id" },
  { code: "vi", label: "postJob.languages.vi" },
  { code: "it", label: "postJob.languages.it" },
  { code: "nl", label: "postJob.languages.nl" },
  { code: "pl", label: "postJob.languages.pl" },
  { code: "fa", label: "postJob.languages.fa" },
  { code: "am", label: "postJob.languages.am" },
  { code: "zu", label: "postJob.languages.zu" },
  { code: "af", label: "postJob.languages.af" },
  { code: "so", label: "postJob.languages.so" },
];

const DURATION_UNITS = [
  {
    value: "hours",
    label: "postJob.durationType.HOURS",
    hint: "postJob.durationHint.hours",
  },
  {
    value: "days",
    label: "postJob.durationType.DAYS",
    hint: "postJob.durationHint.days",
  },
  {
    value: "weeks",
    label: "postJob.durationType.WEEKS",
    hint: "postJob.durationHint.weeks",
  },
  {
    value: "months",
    label: "postJob.durationType.MONTHS",
    hint: "postJob.durationHint.months",
  },
  {
    value: "years",
    label: "postJob.durationType.YEARS",
    hint: "postJob.durationHint.years",
  },
  {
    value: "custom",
    label: "postJob.durationType.CUSTOM",
    hint: "postJob.durationHint.custom",
  },
];

const RECURRENCE_INTERVALS = [
  { value: "DAILY", label: "postJob.recurrenceInterval.DAILY" },
  { value: "WEEKLY", label: "postJob.recurrenceInterval.WEEKLY" },
  { value: "BIWEEKLY", label: "postJob.recurrenceInterval.BIWEEKLY" },
  { value: "MONTHLY", label: "postJob.recurrenceInterval.MONTHLY" },
  { value: "YEARLY", label: "postJob.recurrenceInterval.YEARLY" },
];

const RECURRENCE_DURATIONS = [
  { value: "2_WEEKS", label: "postJob.recurrenceDuration.TWO_WEEKS" },
  { value: "1_MONTH", label: "postJob.recurrenceDuration.ONE_MONTH" },
  { value: "3_MONTHS", label: "postJob.recurrenceDuration.THREE_MONTHS" },
  { value: "6_MONTHS", label: "postJob.recurrenceDuration.SIX_MONTHS" },
  { value: "1_YEAR", label: "postJob.recurrenceDuration.ONE_YEAR" },
  { value: "ONGOING", label: "postJob.recurrenceDuration.ONGOING" },
];

const JOB_TYPES = [
  { value: "FULL_TIME", label: "postJob.jobType.FULL_TIME", icon: FaBriefcase },
  { value: "PART_TIME", label: "postJob.jobType.PART_TIME", icon: FaClock },
  { value: "CONTRACT", label: "postJob.jobType.CONTRACT", icon: FaFileAlt },
  { value: "TEMPORARY", label: "postJob.jobType.TEMPORARY", icon: FaClock },
];

const LOCATION_TYPES = [
  { value: "REMOTE", label: "postJob.locationType.REMOTE", icon: FaGlobe },
  {
    value: "ON_SITE",
    label: "postJob.locationType.ON_SITE",
    icon: FaMapMarkerAlt,
  },
  { value: "HYBRID", label: "postJob.locationType.HYBRID", icon: FaRandom },
];

const BUDGET_TYPES = [
  { value: "HOURLY", label: "postJob.paymentType.HOURLY" },
  { value: "DAILY", label: "postJob.paymentType.DAILY" },
  { value: "WEEKLY", label: "postJob.paymentType.WEEKLY" },
  { value: "MONTHLY", label: "postJob.paymentType.MONTHLY" },
  { value: "YEARLY", label: "postJob.paymentType.YEARLY" },
  { value: "CUSTOM", label: "postJob.paymentType.CUSTOM" },
];

const SKILL_SUGGESTIONS = [
  "postJob.skillsSuggestions.communication",
  "postJob.skillsSuggestions.timeManagement",
  "postJob.skillsSuggestions.problemSolving",
  "postJob.skillsSuggestions.customerService",
  "postJob.skillsSuggestions.teamwork",
  "postJob.skillsSuggestions.attentionToDetail",
  "postJob.skillsSuggestions.physicalStamina",
  "postJob.skillsSuggestions.technicalSkills",
  "postJob.skillsSuggestions.safetyAwareness",
  "postJob.skillsSuggestions.drivingLicense",
  "postJob.skillsSuggestions.ownTools",
  "postJob.skillsSuggestions.ownTransport",
];

const WORK_CONDITION_OPTIONS = [
  {
    key: "providesAccommodation",
    label: "postJob.workConditions.accommodation",
    icon: FaHome,
  },
  {
    key: "providesMeals",
    label: "postJob.workConditions.meals",
    icon: FaCoffee,
  },
];

const QUALIFICATION_PRESETS = [
  "postJob.qualificationPresets.highSchoolDiploma",
  "postJob.qualificationPresets.bachelorsDegree",
  "postJob.qualificationPresets.mastersDegree",
  "postJob.qualificationPresets.doctorate",
  "postJob.qualificationPresets.tradeCertification",
  "postJob.qualificationPresets.professionalLicense",
  "postJob.qualificationPresets.vocationalTraining",
  "postJob.qualificationPresets.drivingLicense",
  "postJob.qualificationPresets.foodHandlingCertificate",
  "postJob.qualificationPresets.safetyCertification",
  "postJob.qualificationPresets.firstAid",
  "postJob.qualificationPresets.teachingCertificate",
];

// ── Recurring pricing helpers (verbatim) ─────────────────────────────
const PERIODS_PER_RECURRENCE = {
  "2_WEEKS": {
    HOURLY: 14 * 8,
    DAILY: 14,
    WEEKLY: 2,
    MONTHLY: 14 / 30.44,
    YEARLY: 14 / 365,
  },
  "1_MONTH": {
    HOURLY: 30.44 * 8,
    DAILY: 30.44,
    WEEKLY: 4.33,
    MONTHLY: 1,
    YEARLY: 1 / 12,
  },
  "3_MONTHS": {
    HOURLY: 91.31 * 8,
    DAILY: 91.31,
    WEEKLY: 13,
    MONTHLY: 3,
    YEARLY: 0.25,
  },
  "6_MONTHS": {
    HOURLY: 182.62 * 8,
    DAILY: 182.62,
    WEEKLY: 26,
    MONTHLY: 6,
    YEARLY: 0.5,
  },
  "1_YEAR": { HOURLY: 365 * 8, DAILY: 365, WEEKLY: 52, MONTHLY: 12, YEARLY: 1 },
};

const DURATION_UNIT_FOR_BUDGET_TYPE = {
  HOURLY: "hours",
  DAILY: "days",
  WEEKLY: "weeks",
  MONTHLY: "months",
  YEARLY: "years",
};

function computeRecurringEstimated(recurrenceDuration, budgetType) {
  const table = PERIODS_PER_RECURRENCE[recurrenceDuration];
  const unit = DURATION_UNIT_FOR_BUDGET_TYPE[budgetType];
  if (!table || !unit) return null;
  const count = table[budgetType];
  if (!Number.isFinite(count) || count <= 0) return null;
  const rounded =
    unit === "hours" ? Math.round(count) : Number(count.toFixed(2));
  return { count: rounded, unit };
}

function toEstimatedHours(unit, value) {
  if (unit === "custom") return null;
  const v = parseFloat(value) || 0;
  if (unit === "hours") return v;
  if (unit === "days") return v * 8;
  if (unit === "weeks") return v * 56;
  if (unit === "months") return v * 242.5;
  if (unit === "years") return v * 2910;
  return null;
}

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function PostJobScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [catSearch, setCatSearch] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [postedJob, setPostedJob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const [skillInput, setSkillInput] = useState("");
  const [qualificationInput, setQualificationInput] = useState("");
  const [showQualificationPresets, setShowQualificationPresets] =
    useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [form, setForm] = useState({
    categoryId: "",
    title: "",
    description: "",
    locationType: "REMOTE",
    address: "",
    latitude: "",
    longitude: "",
    jobType: "FULL_TIME",
    scheduledAt: "",
    languageRequirement: "en",
    scheduleMode: "ONE_OFF",
    durationUnit: "hours",
    durationCustomLabel: "",
    estimatedValue: "",
    recurrenceInterval: "WEEKLY",
    recurrenceDuration: "1_MONTH",
    budget: "",
    currency: "NGN",
    showRateOptions: false,
    budgetType: "HOURLY",
    budgetCustomLabel: "",
    providesAccommodation: false,
    providesMeals: false,
    qualifications: [],
    skills: [],
    notes: "",
  });

  // ── Load categories ──────────────────────────────────────────────
  useEffect(() => {
    client
      .get("/categories", { params: { all: true } })
      .then((res) => {
        const data = res?.data?.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {})
      .finally(() => setCategoriesLoading(false));
  }, []);

  // ── Search filter ────────────────────────────────────────────────
  const normalizedSearch = catSearch.trim().toLowerCase();
  const filteredCats = useMemo(
    () =>
      categories.filter(
        (cat) =>
          !normalizedSearch ||
          cat.name.toLowerCase().includes(normalizedSearch),
      ),
    [categories, normalizedSearch],
  );

  const selectedCat = categories.find((cat) => cat.id === form.categoryId);
  const isSearching = normalizedSearch.length > 0;
  const showSearchResults = isSearching && !selectedCat;

  const selectedLanguageLabel = t(
    ALL_LANGUAGES.find((l) => l.code === form.languageRequirement)?.label ||
      "postJob.languages.en",
  );

  const currencySymbol =
    CURRENCIES.find((cu) => cu.code === form.currency)?.symbol || form.currency;

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  // ── Custom category ──────────────────────────────────────────────
  async function handleAddCustomCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await client.post("/categories/suggest", {
        name: customCatName.trim(),
      });
      const newCat = res?.data?.data?.category;
      if (!newCat) throw new Error("No category returned");
      setCategories((prev) =>
        prev.some((cat) => cat.id === newCat.id) ? prev : [...prev, newCat],
      );
      setForm((f) => ({ ...f, categoryId: newCat.id }));
      setCustomCatName("");
      setShowCustomCat(false);
      setCatSearch("");
    } catch (err) {
      setError(err?.response?.data?.message || t("postJob.categoryAddFailed"));
    } finally {
      setAddingCat(false);
    }
  }

  function clearCategory() {
    set("categoryId", "");
    setCatSearch("");
  }

  // ── Skills ────────────────────────────────────────────────────────
  function addSkill(skill) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    if (form.skills.length >= 20) {
      setError(t("postJob.maxSkills"));
      return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
    setSkillInput("");
    setError("");
  }

  function removeSkill(skill) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  }

  // ── Qualifications ────────────────────────────────────────────────
  function addQualification(qual) {
    const trimmed = qual.trim();
    if (!trimmed) return;
    if (form.qualifications.includes(trimmed)) {
      setQualificationInput("");
      return;
    }
    if (form.qualifications.length >= 10) {
      setError(t("postJob.maxQualifications"));
      return;
    }
    setForm((f) => ({
      ...f,
      qualifications: [...f.qualifications, trimmed],
    }));
    setQualificationInput("");
    setError("");
  }

  function removeQualification(qual) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.filter((q) => q !== qual),
    }));
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.categoryId) return setError(t("postJob.categoryRequired"));
    if (!form.title) return setError(t("postJob.titleRequired"));
    if (!form.description) return setError(t("postJob.descriptionRequired"));
    if (form.locationType !== "REMOTE" && !form.address)
      return setError(t("postJob.locationRequired"));
    if (!form.scheduledAt) return setError(t("postJob.startDateRequired"));
    if (form.scheduleMode === "ONE_OFF" && !form.estimatedValue) {
      return setError(
        form.durationUnit === "custom"
          ? t("postJob.durationCustomRequired")
          : t("postJob.durationRequired"),
      );
    }
    if (!form.budget) return setError(t("postJob.budgetRequired"));
    if (
      form.showRateOptions &&
      form.budgetType === "CUSTOM" &&
      !form.budgetCustomLabel.trim()
    )
      return setError(t("postJob.customRateLabelRequired"));

    const finalSkills = skillInput.trim()
      ? [...form.skills, skillInput.trim()].slice(0, 20)
      : form.skills;
    const finalQualifications = qualificationInput.trim()
      ? [...form.qualifications, qualificationInput.trim()].slice(0, 10)
      : form.qualifications;

    setLoading(true);
    setError("");

    try {
      const clean = (v) =>
        v === "" || v === null || v === undefined ? undefined : v;

      let estimatedHours = null;
      let resolvedEstimatedUnit;
      let resolvedEstimatedValue;

      if (form.scheduleMode === "ONE_OFF") {
        estimatedHours = toEstimatedHours(
          form.durationUnit,
          form.estimatedValue,
        );
        resolvedEstimatedUnit =
          form.durationUnit === "custom" ? "custom" : form.durationUnit;
        resolvedEstimatedValue =
          form.durationUnit === "custom"
            ? form.estimatedValue.trim()
            : clean(form.estimatedValue);
      } else {
        const effectiveBudgetType = form.showRateOptions
          ? form.budgetType
          : "FIXED";
        const recurring = computeRecurringEstimated(
          form.recurrenceDuration,
          effectiveBudgetType,
        );
        if (recurring) {
          estimatedHours = recurring.unit === "hours" ? recurring.count : null;
          resolvedEstimatedUnit = recurring.unit;
          resolvedEstimatedValue = String(recurring.count);
        }
      }

      const noteParts = [];
      if (form.scheduleMode === "RECURRING") {
        const intervalLabel = t(
          RECURRENCE_INTERVALS.find((i) => i.value === form.recurrenceInterval)
            ?.label || "postJob.recurrenceInterval.WEEKLY",
        );
        const durationLabel = t(
          RECURRENCE_DURATIONS.find((d) => d.value === form.recurrenceDuration)
            ?.label || "postJob.recurrenceDuration.ONE_MONTH",
        ).toLowerCase();
        noteParts.push(
          t("postJob.notes.recurring", {
            interval: intervalLabel,
            duration: durationLabel,
          }),
        );
      } else if (form.durationUnit === "custom" && form.estimatedValue) {
        noteParts.push(
          t("postJob.notes.duration", { value: form.estimatedValue.trim() }),
        );
      }
      if (form.notes) noteParts.push(form.notes);
      const finalNotes = noteParts.join(" ");

      const payload = {
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        locationType: form.locationType,
        address: form.locationType !== "REMOTE" ? form.address : undefined,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        jobType: form.jobType,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        estimatedHours: estimatedHours ?? undefined,
        estimatedUnit: resolvedEstimatedUnit,
        estimatedValue: resolvedEstimatedValue,
        budget: parseFloat(form.budget),
        currency: clean(form.currency),
        budgetType: form.showRateOptions ? form.budgetType : "FIXED",
        skills: finalSkills,
        notes: clean(finalNotes),
        languageRequirement: form.languageRequirement || "en",
        qualifications: finalQualifications,
        providesAccommodation: form.providesAccommodation,
        providesMeals: form.providesMeals,
      };

      const res = await client.post("/jobs", payload);
      const job = res?.data?.data?.jobPost;
      setPostedJob(job);
      setSubmitted(true);
    } catch (err) {
      setError(err?.response?.data?.message || t("postJob.submitFailed"));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setPostedJob(null);
    setError("");
    setForm({
      categoryId: "",
      title: "",
      description: "",
      locationType: "REMOTE",
      address: "",
      latitude: "",
      longitude: "",
      jobType: "FULL_TIME",
      scheduledAt: "",
      languageRequirement: "en",
      scheduleMode: "ONE_OFF",
      durationUnit: "hours",
      durationCustomLabel: "",
      estimatedValue: "",
      recurrenceInterval: "WEEKLY",
      recurrenceDuration: "1_MONTH",
      budget: "",
      currency: "NGN",
      showRateOptions: false,
      budgetType: "HOURLY",
      budgetCustomLabel: "",
      providesAccommodation: false,
      providesMeals: false,
      qualifications: [],
      skills: [],
      notes: "",
    });
    setSkillInput("");
    setQualificationInput("");
    setCatSearch("");
    setShowQualificationPresets(false);
    setShowCustomCat(false);
    setCustomCatName("");
  }

  // ── Categories loading ────────────────────────────────────────────
  if (categoriesLoading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="form" />
      </AppScreen>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // SUCCESS STATE
  // ═════════════════════════════════════════════════════════════════════
  if (submitted && postedJob) {
    const hirer = postedJob.hirer;
    const applicationsCount = postedJob._count?.applications ?? 0;

    return (
      <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.successState}>
          <FaTarget size={52} color={c.orange} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 24,
              fontWeight: "800",
              color: c.text,
              marginTop: 14,
              textAlign: "center",
            }}
          >
            {t("postJob.successTitle")}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              marginTop: 8,
              textAlign: "center",
              lineHeight: 19,
            }}
          >
            {t("postJob.successBodyPrefix")}{" "}
            <AppText style={{ fontWeight: "700", color: c.text }}>
              "{postedJob.title}"
            </AppText>{" "}
            {t("postJob.successBodySuffix")}
          </AppText>

          {/* Success card */}
          <View
            style={[
              styles.successCard,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: c.orange,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 4,
              }}
            >
              {postedJob.category?.icon} {postedJob.category?.name}
            </AppText>
            <AppText style={{ fontSize: 14, fontWeight: "600", color: c.text }}>
              {postedJob.title}
            </AppText>

            {hirer ? (
              <SuccessMeta
                icon={<FaUser size={11} color={c.orange} />}
                text={`${hirer.firstName} ${hirer.lastName}`}
                c={c}
              />
            ) : null}

            <SuccessMeta
              icon={<FaMapMarkerAlt size={11} color={c.orange} />}
              text={
                postedJob.locationType === "REMOTE"
                  ? t("postJob.locationType.REMOTE")
                  : postedJob.address || "—"
              }
              c={c}
            />

            <SuccessMeta
              icon={<FaDollarSign size={11} color={c.orange} />}
              text={`${postedJob.currency} ${Number(postedJob.budget).toLocaleString()}${
                postedJob.budgetType === "FIXED" || !postedJob.budgetType
                  ? ` ${t("postJob.budgetSuffixTotal")}`
                  : ` · ${t(
                      BUDGET_TYPES.find(
                        (bt) => bt.value === postedJob.budgetType,
                      )?.label || "postJob.paymentType.CUSTOM",
                    )}`
              }`}
              c={c}
            />

            {postedJob.estimatedValue ? (
              <SuccessMeta
                icon={<FaClock size={11} color={c.orange} />}
                text={`${t("postJob.estimatedPrefix")} ${postedJob.estimatedValue} ${postedJob.estimatedUnit || ""}`}
                c={c}
              />
            ) : null}

            {postedJob.jobType ? (
              <SuccessMeta
                icon={<FaBriefcase size={11} color={c.orange} />}
                text={t(
                  JOB_TYPES.find((jt) => jt.value === postedJob.jobType)
                    ?.label || "postJob.jobType.FULL_TIME",
                )}
                c={c}
              />
            ) : null}

            {postedJob.scheduledAt ? (
              <SuccessMeta
                icon={<FaCalendarAlt size={11} color={c.orange} />}
                text={new Date(postedJob.scheduledAt).toLocaleString()}
                c={c}
              />
            ) : null}

            {postedJob.languageRequirement ? (
              <SuccessMeta
                icon={<FaGlobe size={11} color={c.orange} />}
                text={t(
                  ALL_LANGUAGES.find(
                    (l) => l.code === postedJob.languageRequirement,
                  )?.label || "postJob.languages.en",
                )}
                c={c}
              />
            ) : null}

            {postedJob.qualifications?.length > 0 ? (
              <SuccessMeta
                icon={<FaAward size={11} color={c.orange} />}
                text={t("postJob.qualificationsCount", {
                  count: postedJob.qualifications.length,
                })}
                c={c}
              />
            ) : null}

            {postedJob.skills?.length > 0 ? (
              <SuccessMeta
                icon={<FaTag size={11} color={c.orange} />}
                text={t("postJob.skillsCount", {
                  count: postedJob.skills.length,
                })}
                c={c}
              />
            ) : null}

            {postedJob.providesAccommodation ? (
              <SuccessMeta
                icon={<FaHome size={11} color={c.orange} />}
                text={t("postJob.workConditions.accommodationProvided")}
                c={c}
              />
            ) : null}
            {postedJob.providesMeals ? (
              <SuccessMeta
                icon={<FaCoffee size={11} color={c.orange} />}
                text={t("postJob.workConditions.mealsProvided")}
                c={c}
              />
            ) : null}

            <SuccessMeta
              icon={<FaUsers size={11} color={c.orange} />}
              text={t("postJob.applicantsSoFar", {
                count: applicationsCount,
              })}
              c={c}
            />

            {postedJob.notes ? (
              <SuccessMeta
                icon={<FaAlignLeft size={11} color={c.orange} />}
                text={postedJob.notes}
                c={c}
              />
            ) : null}
          </View>

          <View style={styles.successActions}>
            <Pressable
              onPress={() => navigation.navigate("JobsManagement")}
              style={({ pressed }) => [
                styles.successPrimaryBtn,
                { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 13, fontWeight: "700", color: c.bg }}>
                {t("postJob.viewMyJobs")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={resetForm}
              style={({ pressed }) => [
                styles.successSecondaryBtn,
                { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                {t("postJob.postAnotherJob")}
              </AppText>
            </Pressable>
          </View>
        </View>
      </AppScreen>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // FORM
  // ═════════════════════════════════════════════════════════════════════
  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ── Header ──────────────────────────────────────────────── */}
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: c.orange,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {t("postJob.headerEyebrow")}
      </AppText>
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 24,
          fontWeight: "800",
          color: c.text,
          letterSpacing: -0.4,
        }}
      >
        {t("postJob.screenTitle")}
      </AppText>
      <AppText
        style={{
          fontSize: 13,
          color: c.textDim,
          marginTop: 6,
          marginBottom: 20,
          lineHeight: 19,
        }}
      >
        {t("postJob.screenSubtitle")}
      </AppText>

      {/* ── Category ────────────────────────────────────────────── */}
      <Field label={t("postJob.category")} required c={c}>
        {selectedCat ? (
          <View
            style={[
              styles.selectedCat,
              {
                backgroundColor: c.greenDim,
                borderColor: "rgba(34,197,94,0.2)",
              },
            ]}
          >
            <FaCheckCircle size={12} color={c.green} />
            <AppText
              style={{
                fontSize: 12,
                color: c.green,
                marginLeft: 6,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {t("postJob.selected")}{" "}
              <AppText style={{ fontWeight: "700" }}>
                {selectedCat.icon} {selectedCat.name}
              </AppText>
            </AppText>
            <Pressable onPress={clearCategory} hitSlop={6}>
              <FaX size={12} color={c.green} />
            </Pressable>
          </View>
        ) : (
          <>
            {/* Picker button — opens the full-screen category modal.
                All 1000+ categories + custom ones are shown there. */}
            <Pressable
              onPress={() => setShowCategoryPicker(true)}
              style={({ pressed }) => [
                styles.input,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{ fontSize: 13, color: c.textMuted }}
                numberOfLines={1}
              >
                {catSearch.trim() || t("postJob.selectCategory")}
              </AppText>
              <FaChevronDown size={10} color={c.textDim} />
            </Pressable>

            {/* Count line */}
            <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 6 }}>
              {t("postJob.categoriesTotalCount", {
                count: categories.length,
              })}
            </AppText>
          </>
        )}

        {!selectedCat ? (
          <>
            {!showCustomCat ? (
              <Pressable
                onPress={() => setShowCustomCat(true)}
                style={({ pressed }) => [
                  styles.addCatBtn,
                  { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <FaPlus size={10} color={c.textDim} />
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: c.textDim,
                    marginLeft: 4,
                  }}
                >
                  {t("postJob.cantFindCategory")}
                </AppText>
              </Pressable>
            ) : (
              <View style={{ marginTop: 8, gap: 6 }}>
                <TextInput
                  value={customCatName}
                  onChangeText={setCustomCatName}
                  placeholder={t("postJob.categoryInputPlaceholder")}
                  placeholderTextColor={c.textMuted}
                  autoFocus
                  style={[
                    styles.input,
                    {
                      color: c.text,
                      borderColor: c.border,
                      backgroundColor: c.bgInput,
                    },
                  ]}
                />
                <View style={{ flexDirection: "row", gap: 6 }}>
                  <Pressable
                    onPress={handleAddCustomCategory}
                    disabled={addingCat || !customCatName.trim()}
                    style={({ pressed }) => [
                      styles.smallPrimaryBtn,
                      {
                        backgroundColor: c.orange,
                        opacity:
                          addingCat || !customCatName.trim()
                            ? 0.5
                            : pressed
                              ? 0.9
                              : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "700",
                        color: c.bg,
                      }}
                    >
                      {addingCat
                        ? t("postJob.adding")
                        : t("postJob.addCategory")}
                    </AppText>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowCustomCat(false);
                      setCustomCatName("");
                    }}
                    style={({ pressed }) => [
                      styles.smallSecondaryBtn,
                      { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: c.textDim,
                      }}
                    >
                      {t("common.cancel")}
                    </AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        ) : null}
      </Field>

      {/* ── Title ───────────────────────────────────────────────── */}
      <Field label={t("postJob.jobTitle")} required c={c}>
        <TextInput
          value={form.title}
          onChangeText={(v) => set("title", v)}
          placeholder={t("postJob.jobTitlePlaceholder")}
          placeholderTextColor={c.textMuted}
          style={[
            styles.input,
            {
              color: c.text,
              borderColor: c.border,
              backgroundColor: c.bgInput,
            },
          ]}
        />
      </Field>

      {/* ── Description ─────────────────────────────────────────── */}
      <Field label={t("postJob.description")} required c={c}>
        <TextInput
          value={form.description}
          onChangeText={(v) => set("description", v)}
          placeholder={t("postJob.descriptionPlaceholder")}
          placeholderTextColor={c.textMuted}
          multiline
          numberOfLines={4}
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

      {/* ── Job Type ────────────────────────────────────────────── */}
      <Field label={t("postJob.jobType")} c={c}>
        <OptionGrid
          options={JOB_TYPES}
          value={form.jobType}
          onChange={(v) => set("jobType", v)}
          c={c}
          t={t}
        />
      </Field>

      {/* ── Location Type ───────────────────────────────────────── */}
      <Field label={t("postJob.workLocation")} c={c}>
        <OptionGrid
          options={LOCATION_TYPES}
          value={form.locationType}
          onChange={(v) => set("locationType", v)}
          c={c}
          t={t}
        />
      </Field>

      {/* ── Address (if not remote) ─────────────────────────────── */}
      {form.locationType !== "REMOTE" ? (
        <Field label={t("postJob.serviceAddress")} required c={c}>
          <TextInput
            value={form.address}
            onChangeText={(v) => set("address", v)}
            placeholder={t("postJob.locationAddressPlaceholder")}
            placeholderTextColor={c.textMuted}
            style={[
              styles.input,
              {
                color: c.text,
                borderColor: c.border,
                backgroundColor: c.bgInput,
              },
            ]}
          />
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
            <TextInput
              value={form.latitude}
              onChangeText={(v) => set("latitude", v.replace(/[^0-9.-]/g, ""))}
              placeholder={t("postJob.latitudePlaceholder")}
              placeholderTextColor={c.textMuted}
              keyboardType="decimal-pad"
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
            <TextInput
              value={form.longitude}
              onChangeText={(v) => set("longitude", v.replace(/[^0-9.-]/g, ""))}
              placeholder={t("postJob.longitudePlaceholder")}
              placeholderTextColor={c.textMuted}
              keyboardType="decimal-pad"
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
          </View>
        </Field>
      ) : null}

      {/* ── Scheduled Date ──────────────────────────────────────── */}
      <Field label={t("postJob.scheduledDateTime")} required c={c}>
        <Pressable
          onPress={() => setShowDatePicker(true)}
          style={({ pressed }) => [
            styles.input,
            {
              justifyContent: "center",
              borderColor: c.border,
              backgroundColor: c.bgInput,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText
            style={{
              fontSize: 13,
              color: form.scheduledAt ? c.text : c.textMuted,
            }}
          >
            {form.scheduledAt
              ? new Date(form.scheduledAt).toLocaleString()
              : t("postJob.tapToChooseDate")}
          </AppText>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={form.scheduledAt ? new Date(form.scheduledAt) : new Date()}
            mode="datetime"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (event.type === "dismissed") return;
              if (selectedDate) {
                set("scheduledAt", selectedDate.toISOString());
              }
            }}
          />
        ) : null}
      </Field>

      {/* ── Language ────────────────────────────────────────────── */}
      <Field label={t("postJob.languageRequirement")} c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          {t("postJob.languageHint")}
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: 8 }}
        >
          {ALL_LANGUAGES.map((l) => {
            const active = form.languageRequirement === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => set("languageRequirement", l.code)}
                style={({ pressed }) => [
                  styles.pill,
                  {
                    backgroundColor: active ? c.orangeDim : c.bgCard,
                    borderColor: active ? c.orange : c.border,
                    opacity: pressed && !active ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                  }}
                >
                  {t(l.label)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
          {t("postJob.languageMustSpeakPrefix")}{" "}
          <AppText style={{ fontWeight: "700", color: c.text, fontSize: 11 }}>
            {selectedLanguageLabel}
          </AppText>
        </AppText>
      </Field>

      {/* ── Schedule Mode ───────────────────────────────────────── */}
      <Field label={t("postJob.schedule")} c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          {t("postJob.scheduleHint")}
        </AppText>
        <OptionGrid
          options={[
            {
              value: "ONE_OFF",
              label: "postJob.scheduleMode.oneOff",
              icon: FaTarget,
            },
            {
              value: "RECURRING",
              label: "postJob.scheduleMode.recurring",
              icon: FaRefreshCw,
            },
          ]}
          value={form.scheduleMode}
          onChange={(v) => set("scheduleMode", v)}
          c={c}
          t={t}
        />

        {form.scheduleMode === "ONE_OFF" ? (
          <>
            <AppText
              style={{
                fontSize: 11,
                color: c.textMuted,
                marginTop: 10,
                marginBottom: 8,
              }}
            >
              {t("postJob.durationHint")}
            </AppText>
            <View style={styles.unitPills}>
              {DURATION_UNITS.map((u) => {
                const active = form.durationUnit === u.value;
                return (
                  <Pressable
                    key={u.value}
                    onPress={() => set("durationUnit", u.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                        opacity: pressed && !active ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {t(u.label)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={form.estimatedValue}
              onChangeText={(v) => set("estimatedValue", v)}
              placeholder={t(
                DURATION_UNITS.find((u) => u.value === form.durationUnit)
                  ?.hint || "postJob.durationHint",
              )}
              placeholderTextColor={c.textMuted}
              keyboardType={
                form.durationUnit === "custom" ? "default" : "numeric"
              }
              style={[
                styles.input,
                {
                  marginTop: 8,
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            />

            {form.estimatedValue && form.durationUnit !== "custom" ? (
              <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 6 }}>
                {t("postJob.durationSummary", {
                  value: form.estimatedValue,
                  unit: form.durationUnit,
                  hours: toEstimatedHours(
                    form.durationUnit,
                    form.estimatedValue,
                  ),
                })}
              </AppText>
            ) : null}
            {form.estimatedValue && form.durationUnit === "custom" ? (
              <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 6 }}>
                {t("postJob.durationCustomSummary", {
                  value: form.estimatedValue,
                })}
              </AppText>
            ) : null}
          </>
        ) : (
          <>
            <AppText
              style={{
                fontSize: 11,
                color: c.textMuted,
                marginTop: 10,
                marginBottom: 8,
              }}
            >
              {t("postJob.recurrenceHint")}
            </AppText>
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: c.textMuted,
                marginBottom: 4,
              }}
            >
              {t("postJob.frequencyLabel")}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingRight: 8 }}
            >
              {RECURRENCE_INTERVALS.map((i) => {
                const active = form.recurrenceInterval === i.value;
                return (
                  <Pressable
                    key={i.value}
                    onPress={() => set("recurrenceInterval", i.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                        opacity: pressed && !active ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {t(i.label)}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <AppText
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: c.textMuted,
                marginTop: 10,
                marginBottom: 4,
              }}
            >
              {t("postJob.forHowLongLabel")}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingRight: 8 }}
            >
              {RECURRENCE_DURATIONS.map((d) => {
                const active = form.recurrenceDuration === d.value;
                return (
                  <Pressable
                    key={d.value}
                    onPress={() => set("recurrenceDuration", d.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                        opacity: pressed && !active ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {t(d.label)}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
              {t("postJob.recurringSummary", {
                interval: t(
                  RECURRENCE_INTERVALS.find(
                    (i) => i.value === form.recurrenceInterval,
                  )?.label || "postJob.recurrenceInterval.WEEKLY",
                ).toLowerCase(),
                duration: t(
                  RECURRENCE_DURATIONS.find(
                    (d) => d.value === form.recurrenceDuration,
                  )?.label || "postJob.recurrenceDuration.ONE_MONTH",
                ).toLowerCase(),
              })}
            </AppText>
          </>
        )}
      </Field>

      {/* ── Budget ──────────────────────────────────────────────── */}
      <Field label={t("postJob.budget")} required c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          {t("postJob.budgetHint")}
        </AppText>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput
            value={form.budget}
            onChangeText={(v) => set("budget", v.replace(/[^0-9.]/g, ""))}
            placeholder="0.00"
            placeholderTextColor={c.textMuted}
            keyboardType="decimal-pad"
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
          <Pressable
            onPress={() => setShowCurrencyPicker((v) => !v)}
            style={({ pressed }) => [
              styles.currencyBtn,
              {
                borderColor: c.border,
                backgroundColor: c.bgInput,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{ fontSize: 12, fontWeight: "700", color: c.orange }}
            >
              {currencySymbol} {form.currency}
            </AppText>
            <FaChevronDown size={9} color={c.textDim} />
          </Pressable>
        </View>

        {showCurrencyPicker ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            contentContainerStyle={{ gap: 6, paddingRight: 8 }}
          >
            {CURRENCIES.map((cu) => {
              const active = form.currency === cu.code;
              return (
                <Pressable
                  key={cu.code}
                  onPress={() => {
                    set("currency", cu.code);
                    setShowCurrencyPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.pill,
                    {
                      backgroundColor: active ? c.orangeDim : c.bgCard,
                      borderColor: active ? c.orange : c.border,
                      opacity: pressed && !active ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: active ? c.orange : c.textDim,
                    }}
                  >
                    {cu.symbol} {cu.code}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {!form.showRateOptions ? (
          <Pressable
            onPress={() => set("showRateOptions", true)}
            style={({ pressed }) => [
              styles.addCatBtn,
              { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <FaPlus size={10} color={c.textDim} />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 4,
              }}
            >
              {t("postJob.payByRate")}
            </AppText>
          </Pressable>
        ) : (
          <View style={{ marginTop: 8 }}>
            <AppText
              style={{ fontSize: 11, color: c.textMuted, marginBottom: 6 }}
            >
              {t("postJob.payRateLabel")}
            </AppText>
            <View style={styles.unitPills}>
              {BUDGET_TYPES.map((bt) => {
                const active = form.budgetType === bt.value;
                return (
                  <Pressable
                    key={bt.value}
                    onPress={() => set("budgetType", bt.value)}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? c.orangeDim : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                        opacity: pressed && !active ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {t(bt.label)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {form.budgetType === "CUSTOM" ? (
              <TextInput
                value={form.budgetCustomLabel}
                onChangeText={(v) => set("budgetCustomLabel", v)}
                placeholder={t("postJob.customRateLabelPlaceholder")}
                placeholderTextColor={c.textMuted}
                style={[
                  styles.input,
                  {
                    marginTop: 8,
                    color: c.text,
                    borderColor: c.border,
                    backgroundColor: c.bgInput,
                  },
                ]}
              />
            ) : null}

            <Pressable
              onPress={() => {
                set("showRateOptions", false);
                set("budgetType", "HOURLY");
                set("budgetCustomLabel", "");
              }}
              style={({ pressed }) => [
                styles.addCatBtn,
                { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <FaX size={10} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 4,
                }}
              >
                {t("postJob.backToTotal")}
              </AppText>
            </Pressable>
          </View>
        )}

        {/* Total preview */}
        {form.budget && form.showRateOptions && form.budgetType !== "CUSTOM" ? (
          <BudgetPreview form={form} c={c} t={t} />
        ) : null}

        {form.budget && !form.showRateOptions ? (
          <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
            {t("postJob.totalBudgetSummary", {
              currency: form.currency,
              amount: parseFloat(form.budget || 0).toLocaleString(),
            })}
          </AppText>
        ) : null}
      </Field>

      {/* ── Work Conditions ─────────────────────────────────────── */}
      <Field label={t("postJob.workConditionsTitle")} c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          {t("postJob.workConditionsHint")}
        </AppText>
        <OptionGrid
          options={WORK_CONDITION_OPTIONS.map((opt) => ({
            value: opt.key,
            label: opt.label,
            icon: opt.icon,
          }))}
          value={
            form.providesAccommodation
              ? "providesAccommodation"
              : form.providesMeals
                ? "providesMeals"
                : null
          }
          multiValue={[
            form.providesAccommodation ? "providesAccommodation" : null,
            form.providesMeals ? "providesMeals" : null,
          ].filter(Boolean)}
          onChange={(v) => {
            set(v, !form[v]);
          }}
          c={c}
          t={t}
        />
        {form.providesAccommodation || form.providesMeals ? (
          <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
            {t("postJob.workConditionsSummary", {
              items: [
                form.providesAccommodation
                  ? t("postJob.workConditions.accommodationLower")
                  : null,
                form.providesMeals
                  ? t("postJob.workConditions.mealsLower")
                  : null,
              ]
                .filter(Boolean)
                .join(` ${t("common.and")} `),
            })}
          </AppText>
        ) : null}
      </Field>

      {/* ── Qualifications ──────────────────────────────────────── */}
      <Field label={t("postJob.requiredQualifications")} c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          {t("postJob.qualificationsHint")}
        </AppText>
        <View
          style={[
            styles.skillBox,
            { borderColor: c.border, backgroundColor: c.bgInput },
          ]}
        >
          {form.qualifications.map((qual) => (
            <View
              key={qual}
              style={[
                styles.skillTag,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaAward size={9} color={c.orange} />
              <AppText style={{ fontSize: 11, color: c.orange, marginLeft: 4 }}>
                {qual}
              </AppText>
              <Pressable onPress={() => removeQualification(qual)} hitSlop={6}>
                <FaX size={10} color={c.orange} style={{ marginLeft: 4 }} />
              </Pressable>
            </View>
          ))}
          <TextInput
            value={qualificationInput}
            onChangeText={setQualificationInput}
            onSubmitEditing={() => addQualification(qualificationInput)}
            onBlur={() => {
              if (qualificationInput.trim())
                addQualification(qualificationInput);
            }}
            placeholder={
              form.qualifications.length === 0
                ? t("postJob.qualificationPlaceholder")
                : ""
            }
            placeholderTextColor={c.textMuted}
            style={{
              flex: 1,
              minWidth: 120,
              color: c.text,
              fontSize: 12,
              paddingVertical: 4,
            }}
          />
        </View>

        {form.qualifications.length < 10 ? (
          <>
            <Pressable
              onPress={() => setShowQualificationPresets((v) => !v)}
              style={({ pressed }) => [
                styles.addCatBtn,
                { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              {showQualificationPresets ? (
                <>
                  <FaChevronUp size={10} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.textDim,
                      marginLeft: 4,
                    }}
                  >
                    {t("postJob.hidePresets")}
                  </AppText>
                </>
              ) : (
                <>
                  <FaChevronDown size={10} color={c.textDim} />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: c.textDim,
                      marginLeft: 4,
                    }}
                  >
                    {t("postJob.showPresets")}
                  </AppText>
                </>
              )}
            </Pressable>

            {showQualificationPresets ? (
              <View style={styles.skillSuggestions}>
                {QUALIFICATION_PRESETS.filter(
                  (key) => !form.qualifications.includes(t(key)),
                )
                  .slice(0, 12)
                  .map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => addQualification(t(key))}
                      style={({ pressed }) => [
                        styles.suggestionPill,
                        { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <FaPlus size={8} color={c.textMuted} />
                      <AppText
                        style={{
                          fontSize: 10,
                          fontWeight: "600",
                          color: c.textMuted,
                          marginLeft: 3,
                        }}
                      >
                        {t(key)}
                      </AppText>
                    </Pressable>
                  ))}
              </View>
            ) : null}
          </>
        ) : null}

        {form.qualifications.length > 0 ? (
          <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 6 }}>
            {t("postJob.qualificationsAdded", {
              count: form.qualifications.length,
            })}
          </AppText>
        ) : null}
      </Field>

      {/* ── Skills ──────────────────────────────────────────────── */}
      <Field label={t("postJob.skills")} c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          {t("postJob.skillsHint")}
        </AppText>
        <View
          style={[
            styles.skillBox,
            { borderColor: c.border, backgroundColor: c.bgInput },
          ]}
        >
          {form.skills.map((skill) => (
            <View
              key={skill}
              style={[
                styles.skillTag,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <AppText style={{ fontSize: 11, color: c.orange, marginLeft: 2 }}>
                {skill}
              </AppText>
              <Pressable onPress={() => removeSkill(skill)} hitSlop={6}>
                <FaX size={10} color={c.orange} style={{ marginLeft: 4 }} />
              </Pressable>
            </View>
          ))}
          <TextInput
            value={skillInput}
            onChangeText={setSkillInput}
            onSubmitEditing={() => addSkill(skillInput)}
            onBlur={() => {
              if (skillInput.trim()) addSkill(skillInput);
            }}
            placeholder={
              form.skills.length === 0 ? t("postJob.skillPlaceholder") : ""
            }
            placeholderTextColor={c.textMuted}
            style={{
              flex: 1,
              minWidth: 120,
              color: c.text,
              fontSize: 12,
              paddingVertical: 4,
            }}
          />
        </View>

        {form.skills.length < 20 ? (
          <View style={styles.skillSuggestions}>
            {SKILL_SUGGESTIONS.filter((key) => !form.skills.includes(t(key)))
              .slice(0, 8)
              .map((key) => (
                <Pressable
                  key={key}
                  onPress={() => addSkill(t(key))}
                  style={({ pressed }) => [
                    styles.suggestionPill,
                    { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <FaPlus size={8} color={c.textMuted} />
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: "600",
                      color: c.textMuted,
                      marginLeft: 3,
                    }}
                  >
                    {t(key)}
                  </AppText>
                </Pressable>
              ))}
          </View>
        ) : null}
      </Field>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <Field label={t("postJob.additionalNotes")} c={c}>
        <TextInput
          value={form.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder={t("postJob.notesPlaceholder")}
          placeholderTextColor={c.textMuted}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={[
            styles.textarea,
            {
              color: c.text,
              borderColor: c.border,
              backgroundColor: c.bgInput,
              minHeight: 80,
            },
          ]}
        />
      </Field>

      {/* ── Error ───────────────────────────────────────────────── */}
      {error ? (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: c.redDim,
              borderColor: "rgba(239,68,68,0.2)",
            },
          ]}
        >
          <AppText style={{ fontSize: 12, color: c.red }}>{error}</AppText>
        </View>
      ) : null}

      {/* ── Submit ──────────────────────────────────────────────── */}
      <Pressable
        onPress={handleSubmit}
        disabled={loading}
        style={({ pressed }) => [
          styles.submitBtn,
          {
            backgroundColor: loading ? c.bgInput : c.orange,
            opacity: loading ? 0.6 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={c.bg} size="small" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FaBolt size={14} color={c.bg} />
            <AppText style={{ fontSize: 14, fontWeight: "700", color: c.bg }}>
              {t("postJob.postJob")}
            </AppText>
          </View>
        )}
      </Pressable>

      {/* ── Category picker modal ─────────────────────────────── */}
      <Modal
        visible={showCategoryPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: c.bg,
            paddingTop: 12,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: c.border,
            }}
          >
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 16,
                fontWeight: "700",
                color: c.text,
                flex: 1,
              }}
            >
              {t("postJob.category")}
            </AppText>
            <Pressable
              onPress={() => setShowCategoryPicker(false)}
              hitSlop={10}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <FaX size={18} color={c.textDim} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <TextInput
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder={t("postJob.searchCategories")}
              placeholderTextColor={c.textMuted}
              autoFocus={false}
              style={[
                styles.input,
                {
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            />
            <AppText style={{ fontSize: 10, color: c.textMuted, marginTop: 6 }}>
              {normalizedSearch
                ? t("postJob.categoriesFilteredCount", {
                    count: filteredCats.length,
                  })
                : t("postJob.categoriesTotalCount", {
                    count: categories.length,
                  })}
            </AppText>
          </View>

          {/* Full list — 1000+ items, virtualized */}
          <FlatList
            data={filteredCats}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={30}
            maxToRenderPerBatch={50}
            windowSize={15}
            removeClippedSubviews
            ListEmptyComponent={
              <View style={{ padding: 20, alignItems: "center" }}>
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    textAlign: "center",
                  }}
                >
                  {t("postJob.noMatch", { query: catSearch.trim() })}
                </AppText>
              </View>
            }
            renderItem={({ item: cat }) => (
              <Pressable
                onPress={() => {
                  setForm((f) => ({ ...f, categoryId: cat.id }));
                  setCatSearch("");
                  setShowCategoryPicker(false);
                }}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, color: c.text, flex: 1 }}
                  numberOfLines={1}
                >
                  {cat.icon ? `${cat.icon} ` : ""}
                  {cat.name}
                </AppText>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </AppScreen>
  );
}

// ── Shared field wrapper ────────────────────────────────────────────
function Field({ label, required, children, c }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "600",
          color: c.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 6,
        }}
      >
        {label}
        {required ? <AppText style={{ color: c.orange }}> *</AppText> : null}
      </AppText>
      {children}
    </View>
  );
}

// ── Option grid ────────────────────────────────────────────────────
function OptionGrid({ options, value, multiValue, onChange, c, t }) {
  const isMulti = Array.isArray(multiValue);

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = isMulti
          ? multiValue.includes(opt.value)
          : value === opt.value;
        const Icon = opt.icon;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: active ? c.orangeDim : c.bgCard,
                borderColor: active ? c.orange : c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            {Icon ? (
              <Icon size={15} color={active ? c.orange : c.textDim} />
            ) : null}
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: active ? c.orange : c.textDim,
                marginLeft: Icon ? 6 : 0,
              }}
              numberOfLines={1}
            >
              {t(opt.label)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Budget preview ─────────────────────────────────────────────────
function BudgetPreview({ form, c, t }) {
  if (form.scheduleMode === "ONE_OFF") {
    const rate = parseFloat(form.budget);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    const valueNum = parseFloat(form.estimatedValue);
    if (!Number.isFinite(valueNum) || valueNum <= 0) return null;

    const MONTHS_PER_UNIT = {
      hours: 1 / (30.44 * 8),
      days: 1 / 30.44,
      weeks: 1 / 4.33,
      months: 1,
      years: 12,
    };
    const MONTHS_PER_RATE_PERIOD = {
      HOURLY: 1 / (30.44 * 8),
      DAILY: 1 / 30.44,
      WEEKLY: 1 / 4.33,
      MONTHLY: 1,
      YEARLY: 12,
    };

    const durationInMonths =
      valueNum * (MONTHS_PER_UNIT[form.durationUnit] || 0);
    const ratePeriodMonths = MONTHS_PER_RATE_PERIOD[form.budgetType];
    if (!ratePeriodMonths) return null;
    const periods = durationInMonths / ratePeriodMonths;
    if (!Number.isFinite(periods) || periods <= 0) return null;
    const total = rate * periods;

    const unitNounMap = {
      HOURLY: [t("postJob.units.hourSingular"), t("postJob.units.hourPlural")],
      DAILY: [t("postJob.units.daySingular"), t("postJob.units.dayPlural")],
      WEEKLY: [t("postJob.units.weekSingular"), t("postJob.units.weekPlural")],
      MONTHLY: [
        t("postJob.units.monthSingular"),
        t("postJob.units.monthPlural"),
      ],
      YEARLY: [t("postJob.units.yearSingular"), t("postJob.units.yearPlural")],
    };
    const [sing, plur] = unitNounMap[form.budgetType] || [
      t("postJob.units.unitSingular"),
      t("postJob.units.unitPlural"),
    ];
    const rounded = Number(periods.toFixed(2));
    const periodsLabel = `${rounded} ${rounded === 1 ? sing : plur}`;
    const periodLabel = t(
      {
        HOURLY: "postJob.budgetPeriod.perHour",
        DAILY: "postJob.budgetPeriod.perDay",
        WEEKLY: "postJob.budgetPeriod.perWeek",
        MONTHLY: "postJob.budgetPeriod.perMonth",
        YEARLY: "postJob.budgetPeriod.perYear",
      }[form.budgetType] || "postJob.budgetPeriod.perHour",
    );

    return (
      <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
        {t("postJob.totalPrefix")}{" "}
        <AppText style={{ fontWeight: "700", color: c.text }}>
          {form.currency} {Math.round(total).toLocaleString()}
        </AppText>{" "}
        {t("postJob.budgetPreviewSuffix", {
          currency: form.currency,
          rate: rate.toLocaleString(),
          period: periodLabel,
          periods: periodsLabel,
        })}
      </AppText>
    );
  }

  const recurring = computeRecurringEstimated(
    form.recurrenceDuration,
    form.budgetType,
  );
  if (!recurring) return null;
  const rate = parseFloat(form.budget);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  const total = rate * recurring.count;
  const unitLabel = t("postJob.hoursCount", { count: recurring.count });
  const periodLabel = t(
    {
      HOURLY: "postJob.budgetPeriod.perHour",
      DAILY: "postJob.budgetPeriod.perDay",
      WEEKLY: "postJob.budgetPeriod.perWeek",
      MONTHLY: "postJob.budgetPeriod.perMonth",
      YEARLY: "postJob.budgetPeriod.perYear",
    }[form.budgetType] || "postJob.budgetPeriod.perHour",
  );

  return (
    <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
      {t("postJob.totalPrefix")}{" "}
      <AppText style={{ fontWeight: "700", color: c.text }}>
        {form.currency} {Math.round(total).toLocaleString()}
      </AppText>{" "}
      {t("postJob.budgetPreviewSuffix", {
        currency: form.currency,
        rate: rate.toLocaleString(),
        period: periodLabel,
        periods: unitLabel,
      })}
    </AppText>
  );
}

// ── Success meta row ───────────────────────────────────────────────
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
      <AppText
        style={{ fontSize: 12, color: c.textDim, flex: 1 }}
        numberOfLines={2}
      >
        {text}
      </AppText>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 13,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    lineHeight: 19,
    minHeight: 100,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  unitPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    minHeight: 42,
  },
  selectedCat: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addCatBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 8,
  },
  smallPrimaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  smallSecondaryBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  currencyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
  },
  skillBox: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
  },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillSuggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
  },
  suggestionPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  errorBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  successState: {
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  successCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginTop: 20,
    width: "100%",
    maxWidth: 460,
  },
  successActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 24,
    justifyContent: "center",
    width: "100%",
    maxWidth: 460,
  },
  successPrimaryBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  successSecondaryBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
