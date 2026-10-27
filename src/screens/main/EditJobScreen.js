// src/screens/main/EditJobScreen.js
//
// Verbatim port of components/hirer/EditJob.jsx.
//
// Endpoints:
//   GET  /categories?all=true
//   GET  /jobs/:id             (load + pre-fill)
//   POST /categories/suggest   (custom category)
//   PUT  /jobs/:id             (update)
//
// Behaviour:
//   · Loads job, pre-fills ALL fields
//   · Detects RECURRING vs ONE_OFF from job.notes (regex "Recurring:")
//   · stripSystemNotes() removes "Recurring:" and "Duration:" prefix notes
//   · toLocalDatetimeInput() converts ISO scheduledAt → local YYYY-MM-DDTHH:mm
//   · Same recurring-budget preview helpers as PostJob
//   · On success → navigation.replace("JobDetail", { jobId })
//   · Cancel button → navigation.navigate("JobDetail", { jobId })
//   · Full skeleton loader matching form layout
//
// Register in HirerNavigator.js:
//   import EditJobScreen from "../screens/main/EditJobScreen";
//   <Drawer.Screen name="EditJob">
//     {() => <ScreenWithChrome Screen={EditJobScreen} />}
//   </Drawer.Screen>

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation, useRoute } from "@react-navigation/native";
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
  FaCalendarAlt,
  FaRefreshCw,
  FaHome,
  FaCoffee,
  FaAward,
  FaChevronDown,
  FaChevronUp,
  FaArrowLeft,
  FaExclamationTriangle,
} from "../../icons/fa";

// ── Same constants as PostJob ───────────────────────────────────────
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

const DURATION_UNITS = [
  { value: "hours", label: "Hours", hint: "e.g. 3" },
  { value: "days", label: "Days", hint: "e.g. 2" },
  { value: "weeks", label: "Weeks", hint: "e.g. 1" },
  { value: "months", label: "Months", hint: "e.g. 2" },
  { value: "years", label: "Years", hint: "e.g. 1" },
  { value: "custom", label: "Custom", hint: "e.g. Full project" },
];

const RECURRENCE_INTERVALS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Every 2 weeks" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "YEARLY", label: "Yearly" },
];

const RECURRENCE_DURATIONS = [
  { value: "2_WEEKS", label: "For 2 weeks" },
  { value: "1_MONTH", label: "For 1 month" },
  { value: "3_MONTHS", label: "For 3 months" },
  { value: "6_MONTHS", label: "For 6 months" },
  { value: "1_YEAR", label: "For 1 year" },
  { value: "ONGOING", label: "Ongoing" },
];

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time", icon: FaBriefcase },
  { value: "PART_TIME", label: "Part-time", icon: FaClock },
  { value: "CONTRACT", label: "Contract", icon: FaFileAlt },
  { value: "TEMPORARY", label: "Temporary", icon: FaClock },
];

const LOCATION_TYPES = [
  { value: "REMOTE", label: "Remote", icon: FaGlobe },
  { value: "ON_SITE", label: "On-site", icon: FaMapMarkerAlt },
  { value: "HYBRID", label: "Hybrid", icon: FaRandom },
];

const BUDGET_TYPES = [
  { value: "HOURLY", label: "Per Hour" },
  { value: "DAILY", label: "Per Day" },
  { value: "WEEKLY", label: "Per Week" },
  { value: "MONTHLY", label: "Per Month" },
  { value: "YEARLY", label: "Per Year" },
  { value: "CUSTOM", label: "Custom" },
];

const SKILL_SUGGESTIONS = [
  "Communication",
  "Time Management",
  "Problem Solving",
  "Customer Service",
  "Teamwork",
  "Attention to Detail",
  "Physical Stamina",
  "Technical Skills",
  "Safety Awareness",
  "Driving License",
  "Own Tools",
  "Own Transport",
];

const WORK_CONDITION_OPTIONS = [
  {
    key: "providesAccommodation",
    label: "Accommodation provided",
    icon: FaHome,
  },
  { key: "providesMeals", label: "Meals provided", icon: FaCoffee },
];

const QUALIFICATION_PRESETS = [
  "High School Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "Doctorate (PhD)",
  "Trade Certification",
  "Professional License",
  "Vocational Training",
  "Driving License",
  "Food Handling Certificate",
  "Safety Certification",
  "First Aid / CPR",
  "Teaching Certificate",
];

// ── Recurring helpers (same as PostJob) ────────────────────────────
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

// ── EditJob-specific helpers ───────────────────────────────────────
function stripSystemNotes(notes) {
  if (!notes) return "";
  return notes
    .replace(/Recurring:\s*[^.]+\.\s*/i, "")
    .replace(/Duration:\s*[^.]+\.\s*/i, "")
    .trim();
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

function toLocalDatetimeInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function EditJobScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const jobId = route.params?.jobId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");

  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);

  const [skillInput, setSkillInput] = useState("");
  const [qualificationInput, setQualificationInput] = useState("");
  const [showQualificationPresets, setShowQualificationPresets] =
    useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [form, setForm] = useState(null);
  const [originalJob, setOriginalJob] = useState(null);

  // ── Load categories ──────────────────────────────────────────────
  useEffect(() => {
    client
      .get("/categories", { params: { all: true } })
      .then((res) => {
        const data = res?.data?.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {});
  }, []);

  // ── Load job ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) {
      setLoadError("Invalid job id.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    client
      .get(`/jobs/${jobId}`)
      .then((res) => {
        if (cancelled) return;
        const job = res?.data?.data?.jobPost || res?.data?.data;

        setOriginalJob(job);

        const hasRecurringNote = /Recurring:/i.test(job.notes || "");
        const inferredScheduleMode =
          job.scheduleMode || (hasRecurringNote ? "RECURRING" : "ONE_OFF");

        setForm({
          categoryId: job.categoryId || job.category?.id || "",
          title: job.title || "",
          description: job.description || "",
          locationType: job.locationType || "REMOTE",
          address: job.address || "",
          latitude: job.latitude != null ? String(job.latitude) : "",
          longitude: job.longitude != null ? String(job.longitude) : "",
          jobType: job.jobType || "FULL_TIME",
          scheduledAt: toLocalDatetimeInput(job.scheduledAt),
          languageRequirement: job.languageRequirement || "en",
          scheduleMode: inferredScheduleMode,
          durationUnit: job.estimatedUnit || "hours",
          durationCustomLabel: "",
          estimatedValue:
            job.estimatedUnit === "custom"
              ? job.estimatedValue || ""
              : job.estimatedValue != null
                ? String(job.estimatedValue)
                : "",
          recurrenceInterval: job.recurrenceInterval || "WEEKLY",
          recurrenceDuration: job.recurrenceDuration || "1_MONTH",
          budget: job.budget != null ? String(parseFloat(job.budget)) : "",
          currency: job.currency || "NGN",
          showRateOptions: job.budgetType && job.budgetType !== "FIXED",
          budgetType:
            job.budgetType && job.budgetType !== "FIXED"
              ? job.budgetType
              : "HOURLY",
          budgetCustomLabel: job.budgetCustomLabel || "",
          providesAccommodation: !!job.providesAccommodation,
          providesMeals: !!job.providesMeals,
          qualifications: Array.isArray(job.qualifications)
            ? job.qualifications
            : [],
          skills: Array.isArray(job.skills) ? job.skills : [],
          notes: stripSystemNotes(job.notes || ""),
        });

        if (job.category && job.category.id) {
          setCategories((prev) =>
            prev.some((cat) => cat.id === job.category.id)
              ? prev
              : [...prev, job.category],
          );
        }

        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err?.response?.data?.message || "Failed to load job.");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // ── Derived ──────────────────────────────────────────────────────
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

  const selectedCat = form
    ? categories.find((cat) => cat.id === form.categoryId)
    : null;
  const isSearching = normalizedSearch.length > 0;
  const showSearchResults = isSearching && !selectedCat;

  const selectedLanguageLabel = form
    ? ALL_LANGUAGES.find((l) => l.code === form.languageRequirement)?.label ||
      "English"
    : "English";

  const currencySymbol = form
    ? CURRENCIES.find((cu) => cu.code === form.currency)?.symbol ||
      form.currency
    : "";

  // ── Form helpers ─────────────────────────────────────────────────
  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  }

  function clearCategory() {
    set("categoryId", "");
    setCatSearch("");
  }

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
      setError(err?.response?.data?.message || "Failed to add custom category");
    } finally {
      setAddingCat(false);
    }
  }

  function addSkill(skill) {
    const trimmed = skill.trim();
    if (!trimmed) return;
    if (form.skills.includes(trimmed)) {
      setSkillInput("");
      return;
    }
    if (form.skills.length >= 20) {
      setError("Maximum 20 skills");
      return;
    }
    setForm((f) => ({ ...f, skills: [...f.skills, trimmed] }));
    setSkillInput("");
    setError("");
  }

  function removeSkill(skill) {
    setForm((f) => ({ ...f, skills: f.skills.filter((s) => s !== skill) }));
  }

  function addQualification(qual) {
    const trimmed = qual.trim();
    if (!trimmed) return;
    if (form.qualifications.includes(trimmed)) {
      setQualificationInput("");
      return;
    }
    if (form.qualifications.length >= 10) {
      setError("Maximum 10 qualifications");
      return;
    }
    setForm((f) => ({ ...f, qualifications: [...f.qualifications, trimmed] }));
    setQualificationInput("");
    setError("");
  }

  function removeQualification(qual) {
    setForm((f) => ({
      ...f,
      qualifications: f.qualifications.filter((q) => q !== qual),
    }));
  }

  // ── Submit ───────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!form.categoryId) return setError("Please select a category.");
    if (!form.title) return setError("Job title is required.");
    if (!form.description) return setError("Description is required.");
    if (form.locationType !== "REMOTE" && !form.address)
      return setError(
        "Please enter a service address for on-site or hybrid jobs.",
      );
    if (!form.scheduledAt)
      return setError("Please choose a scheduled date and time.");

    if (form.scheduleMode === "ONE_OFF" && !form.estimatedValue) {
      const originalHasEstimated =
        originalJob?.estimatedHours != null ||
        (originalJob?.estimatedValue != null &&
          originalJob?.estimatedValue !== "");
      if (!originalHasEstimated) {
        return setError(
          form.durationUnit === "custom"
            ? "Please describe the duration."
            : "Please estimate how long the job will take.",
        );
      }
    }

    if (!form.budget) return setError("Please enter a budget.");
    if (
      form.showRateOptions &&
      form.budgetType === "CUSTOM" &&
      !form.budgetCustomLabel.trim()
    )
      return setError("Please describe your custom pay rate.");

    const finalSkills = skillInput.trim()
      ? [...form.skills, skillInput.trim()].slice(0, 20)
      : form.skills;
    const finalQualifications = qualificationInput.trim()
      ? [...form.qualifications, qualificationInput.trim()].slice(0, 10)
      : form.qualifications;

    setSaving(true);
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
        const intervalLabel =
          RECURRENCE_INTERVALS.find((i) => i.value === form.recurrenceInterval)
            ?.label || form.recurrenceInterval;
        const durationLabel =
          RECURRENCE_DURATIONS.find(
            (d) => d.value === form.recurrenceDuration,
          )?.label?.toLowerCase() || form.recurrenceDuration;
        noteParts.push(`Recurring: ${intervalLabel} ${durationLabel}.`);
      } else if (form.durationUnit === "custom" && form.estimatedValue) {
        noteParts.push(`Duration: ${form.estimatedValue.trim()}.`);
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

      await client.put(`/jobs/${jobId}`, payload);
      toast.success("Job updated successfully.");
      navigation.replace("JobDetail", { jobId });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update job.");
    } finally {
      setSaving(false);
    }
  }

  // ── Loading / error guards ───────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="form" />
      </AppScreen>
    );
  }

  if (loadError) {
    return (
      <AppScreen scroll={false}>
        <View style={styles.center}>
          <FaExclamationTriangle size={40} color={c.orange} />
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              marginTop: 12,
            }}
          >
            {loadError}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("JobsManagement")}
            style={({ pressed }) => [
              styles.backBtn,
              {
                borderColor: c.border,
                marginTop: 16,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
              Back to My Jobs
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  if (!form) return null;

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
        Editing
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
        Edit Job
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
        Update the details of your job posting.
      </AppText>

      {/* ── Category ────────────────────────────────────────────── */}
      <Field label="Category" required c={c}>
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
              Selected:{" "}
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
            <TextInput
              value={catSearch}
              onChangeText={setCatSearch}
              placeholder="Search categories..."
              placeholderTextColor={c.textMuted}
              style={[
                styles.input,
                {
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                  marginBottom: 6,
                },
              ]}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingRight: 8 }}
            >
              {filteredCats.slice(0, 20).map((cat) => (
                <Pressable
                  key={cat.id}
                  onPress={() => {
                    setForm((f) => ({ ...f, categoryId: cat.id }));
                    setCatSearch("");
                  }}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 11, color: c.text }}
                    numberOfLines={1}
                  >
                    {cat.icon ? `${cat.icon} ` : ""}
                    {cat.name}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
            {showSearchResults && filteredCats.length === 0 ? (
              <AppText
                style={{ fontSize: 11, color: c.textMuted, marginTop: 6 }}
              >
                No categories match "{catSearch.trim()}"
              </AppText>
            ) : null}
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
                  Can't find your category? Add a custom one
                </AppText>
              </Pressable>
            ) : (
              <View style={{ marginTop: 8, gap: 6 }}>
                <TextInput
                  value={customCatName}
                  onChangeText={setCustomCatName}
                  placeholder="Category name e.g. Solar Panel Installation"
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
                      style={{ fontSize: 12, fontWeight: "700", color: c.bg }}
                    >
                      {addingCat ? "Adding…" : "Add Category"}
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
                      Cancel
                    </AppText>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        ) : null}
      </Field>

      {/* ── Title ───────────────────────────────────────────────── */}
      <Field label="Job Title" required c={c}>
        <TextInput
          value={form.title}
          onChangeText={(v) => set("title", v)}
          placeholder="e.g. Fix leaking bathroom pipe"
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
      <Field label="Description" required c={c}>
        <TextInput
          value={form.description}
          onChangeText={(v) => set("description", v)}
          placeholder="Describe the job in detail..."
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
      <Field label="Job Type" c={c}>
        <OptionGrid
          options={JOB_TYPES}
          value={form.jobType}
          onChange={(v) => set("jobType", v)}
          c={c}
        />
      </Field>

      {/* ── Location Type ───────────────────────────────────────── */}
      <Field label="Work Location" c={c}>
        <OptionGrid
          options={LOCATION_TYPES}
          value={form.locationType}
          onChange={(v) => set("locationType", v)}
          c={c}
        />
      </Field>

      {/* ── Address ─────────────────────────────────────────────── */}
      {form.locationType !== "REMOTE" ? (
        <Field label="Service Address" required c={c}>
          <TextInput
            value={form.address}
            onChangeText={(v) => set("address", v)}
            placeholder="Full address where work will be done"
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
              placeholder="Latitude (optional)"
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
              placeholder="Longitude (optional)"
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
      <Field label="Scheduled Date & Time" required c={c}>
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
              : "Tap to choose a date and time"}
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
      <Field label="Language Requirement" c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          What language should the worker speak fluently?
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
                  {l.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
        <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
          ✓ Workers must speak{" "}
          <AppText style={{ fontWeight: "700", color: c.text }}>
            {selectedLanguageLabel}
          </AppText>
        </AppText>
      </Field>

      {/* ── Schedule Mode ───────────────────────────────────────── */}
      <Field label="Schedule" c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          Is this a one-off job, or something that repeats?
        </AppText>
        <OptionGrid
          options={[
            { value: "ONE_OFF", label: "One-off job", icon: FaTarget },
            { value: "RECURRING", label: "Recurring", icon: FaRefreshCw },
          ]}
          value={form.scheduleMode}
          onChange={(v) => set("scheduleMode", v)}
          c={c}
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
              Roughly how long will it take?
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
                      {u.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={form.estimatedValue}
              onChangeText={(v) => set("estimatedValue", v)}
              placeholder={
                DURATION_UNITS.find((u) => u.value === form.durationUnit)
                  ?.hint || ""
              }
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
                ✓ Est. {form.estimatedValue} {form.durationUnit} = approx.{" "}
                {toEstimatedHours(form.durationUnit, form.estimatedValue)}h of
                work
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
              How often, and for how long?
            </AppText>
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "600",
                color: c.textMuted,
                marginBottom: 4,
              }}
            >
              FREQUENCY
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
                      {i.label}
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
              FOR HOW LONG
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
                      {d.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        )}
      </Field>

      {/* ── Budget ──────────────────────────────────────────────── */}
      <Field label="Budget" required c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          How much are you offering for this job?
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
              Pay by the hour / day instead
            </AppText>
          </Pressable>
        ) : (
          <View style={{ marginTop: 8 }}>
            <AppText
              style={{ fontSize: 11, color: c.textMuted, marginBottom: 6 }}
            >
              Pay rate:
            </AppText>
            <View style={styles.unitPills}>
              {BUDGET_TYPES.map((t) => {
                const active = form.budgetType === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => set("budgetType", t.value)}
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
                      {t.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {form.budgetType === "CUSTOM" ? (
              <TextInput
                value={form.budgetCustomLabel}
                onChangeText={(v) => set("budgetCustomLabel", v)}
                placeholder="Describe your rate (e.g. 'Per session')"
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
                Back to total budget
              </AppText>
            </Pressable>
          </View>
        )}

        {/* Total preview */}
        {form.budget && form.showRateOptions && form.budgetType !== "CUSTOM" ? (
          <BudgetPreview form={form} c={c} />
        ) : null}
      </Field>

      {/* ── Work Conditions ─────────────────────────────────────── */}
      <Field label="Work Conditions" c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          Does this job come with accommodation or meals?
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {WORK_CONDITION_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = form[opt.key];
            return (
              <Pressable
                key={opt.key}
                onPress={() => set(opt.key, !active)}
                style={({ pressed }) => [
                  styles.optionCard,
                  {
                    backgroundColor: active ? c.orangeDim : c.bgCard,
                    borderColor: active ? c.orange : c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Icon size={15} color={active ? c.orange : c.textDim} />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                    marginLeft: 6,
                  }}
                  numberOfLines={1}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </Field>

      {/* ── Qualifications ──────────────────────────────────────── */}
      <Field label="Required Qualifications" c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          Add any specific qualifications this job requires. Optional.
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
              form.qualifications.length === 0 ? "Type a qualification…" : ""
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
                    Hide common qualifications
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
                    Show common qualifications
                  </AppText>
                </>
              )}
            </Pressable>

            {showQualificationPresets ? (
              <View style={styles.skillSuggestions}>
                {QUALIFICATION_PRESETS.filter(
                  (q) => !form.qualifications.includes(q),
                )
                  .slice(0, 12)
                  .map((q) => (
                    <Pressable
                      key={q}
                      onPress={() => addQualification(q)}
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
                        {q}
                      </AppText>
                    </Pressable>
                  ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Field>

      {/* ── Skills ──────────────────────────────────────────────── */}
      <Field label="Required Skills" c={c}>
        <AppText style={{ fontSize: 11, color: c.textMuted, marginBottom: 8 }}>
          Add skills the worker should have.
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
            placeholder={form.skills.length === 0 ? "Type a skill…" : ""}
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
            {SKILL_SUGGESTIONS.filter((s) => !form.skills.includes(s))
              .slice(0, 8)
              .map((s) => (
                <Pressable
                  key={s}
                  onPress={() => addSkill(s)}
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
                    {s}
                  </AppText>
                </Pressable>
              ))}
          </View>
        ) : null}
      </Field>

      {/* ── Notes ───────────────────────────────────────────────── */}
      <Field label="Additional Notes" c={c}>
        <TextInput
          value={form.notes}
          onChangeText={(v) => set("notes", v)}
          placeholder="Access instructions, tools needed, preferences..."
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

      {/* ── Save button ─────────────────────────────────────────── */}
      <Pressable
        onPress={handleSubmit}
        disabled={saving}
        style={({ pressed }) => [
          styles.submitBtn,
          {
            backgroundColor: saving ? c.bgInput : c.orange,
            opacity: saving ? 0.6 : pressed ? 0.9 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color={c.bg} size="small" />
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <FaBolt size={14} color={c.bg} />
            <AppText style={{ fontSize: 14, fontWeight: "700", color: c.bg }}>
              Save Changes
            </AppText>
          </View>
        )}
      </Pressable>

      {/* ── Cancel button ───────────────────────────────────────── */}
      <Pressable
        onPress={() => navigation.replace("JobDetail", { jobId })}
        style={({ pressed }) => [
          styles.cancelBtn,
          { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <FaArrowLeft size={12} color={c.textDim} />
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: c.textDim,
            marginLeft: 6,
          }}
        >
          Cancel and go back
        </AppText>
      </Pressable>
    </AppScreen>
  );
}

// ── Reused sub-components (same as PostJob) ─────────────────────────
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

function OptionGrid({ options, value, onChange, c }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {options.map((opt) => {
        const active = value === opt.value;
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
              {opt.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function BudgetPreview({ form, c }) {
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
      HOURLY: ["hour", "hours"],
      DAILY: ["day", "days"],
      WEEKLY: ["week", "weeks"],
      MONTHLY: ["month", "months"],
      YEARLY: ["year", "years"],
    };
    const [sing, plur] = unitNounMap[form.budgetType] || ["unit", "units"];
    const rounded = Number(periods.toFixed(2));
    const periodsLabel = `${rounded} ${rounded === 1 ? sing : plur}`;
    const periodLabel =
      {
        HOURLY: "per hour",
        DAILY: "per day",
        WEEKLY: "per week",
        MONTHLY: "per month",
        YEARLY: "per year",
      }[form.budgetType] || `per ${form.budgetType.toLowerCase()}`;

    return (
      <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
        ✓ Total:{" "}
        <AppText style={{ fontWeight: "700", color: c.text }}>
          {form.currency} {Math.round(total).toLocaleString()}
        </AppText>{" "}
        ({form.currency} {rate.toLocaleString()} {periodLabel} × {periodsLabel})
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
  const unitLabel =
    recurring.unit === "hours"
      ? `${recurring.count} hours`
      : `${recurring.count} ${recurring.unit}`;
  const periodLabel =
    {
      HOURLY: "per hour",
      DAILY: "per day",
      WEEKLY: "per week",
      MONTHLY: "per month",
      YEARLY: "per year",
    }[form.budgetType] || `per ${form.budgetType.toLowerCase()}`;

  return (
    <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 8 }}>
      ✓ Total:{" "}
      <AppText style={{ fontWeight: "700", color: c.text }}>
        {form.currency} {Math.round(total).toLocaleString()}
      </AppText>{" "}
      ({form.currency} {rate.toLocaleString()} {periodLabel} × {unitLabel})
    </AppText>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
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
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
});
