// src/screens/main/PostJobScreen.js
// 3-step job posting wizard — fully i18n'd with useTranslation()

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import DateTimePicker from "@react-native-community/datetimepicker";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppInput from "../../components/AppInput";
import AppButton from "../../components/AppButton";
import Card from "../../components/Card";
import CurrencyPicker from "../../components/CurrencyPicker";
import SectionHeader from "../../components/SectionHeader";
import { useTheme } from "../../contexts/ThemeContext";
import { useCurrency } from "../../contexts/CurrencyContext";
import { useToast } from "../../contexts/ToastContext";
import { hirerApi } from "../../api/hirer";
import { categoriesApi } from "../../api/categories";

// ─── Static constants (labels resolved via t() at render time) ───────────────

const TOTAL_STEPS = 3;

const JOB_TYPE_KEYS = [
  {
    value: "FULL_TIME",
    labelKey: "postJob.jobType.FULL_TIME",
    icon: "briefcase-outline",
  },
  {
    value: "PART_TIME",
    labelKey: "postJob.jobType.PART_TIME",
    icon: "time-outline",
  },
  {
    value: "CONTRACT",
    labelKey: "postJob.jobType.CONTRACT",
    icon: "document-text-outline",
  },
  {
    value: "TEMPORARY",
    labelKey: "postJob.jobType.TEMPORARY",
    icon: "hourglass-outline",
  },
];

const LOCATION_TYPE_KEYS = [
  {
    value: "REMOTE",
    labelKey: "postJob.locationType.REMOTE",
    icon: "globe-outline",
  },
  {
    value: "ON_SITE",
    labelKey: "postJob.locationType.ON_SITE",
    icon: "location-outline",
  },
  {
    value: "HYBRID",
    labelKey: "postJob.locationType.HYBRID",
    icon: "git-merge-outline",
  },
];

const PAYMENT_TYPE_KEYS = [
  {
    value: "FIXED",
    labelKey: "postJob.paymentType.FIXED",
    subKey: "postJob.paymentType.FIXED_sub",
    icon: "cash-outline",
  },
  {
    value: "HOURLY",
    labelKey: "postJob.paymentType.HOURLY",
    subKey: "postJob.paymentType.HOURLY_sub",
    icon: "time-outline",
  },
  {
    value: "DAILY",
    labelKey: "postJob.paymentType.DAILY",
    subKey: "postJob.paymentType.DAILY_sub",
    icon: "sunny-outline",
  },
  {
    value: "WEEKLY",
    labelKey: "postJob.paymentType.WEEKLY",
    subKey: "postJob.paymentType.WEEKLY_sub",
    icon: "calendar-outline",
  },
  {
    value: "MONTHLY",
    labelKey: "postJob.paymentType.MONTHLY",
    subKey: "postJob.paymentType.MONTHLY_sub",
    icon: "calendar-number-outline",
  },
  {
    value: "CUSTOM",
    labelKey: "postJob.paymentType.CUSTOM",
    subKey: "postJob.paymentType.CUSTOM_sub",
    icon: "create-outline",
  },
];

const DURATION_TYPE_KEYS = [
  {
    value: "HOURS",
    labelKey: "postJob.durationType.HOURS",
    icon: "time-outline",
  },
  {
    value: "DAYS",
    labelKey: "postJob.durationType.DAYS",
    icon: "sunny-outline",
  },
  {
    value: "WEEKS",
    labelKey: "postJob.durationType.WEEKS",
    icon: "calendar-outline",
  },
  {
    value: "MONTHS",
    labelKey: "postJob.durationType.MONTHS",
    icon: "calendar-number-outline",
  },
  {
    value: "CUSTOM",
    labelKey: "postJob.durationType.CUSTOM",
    icon: "create-outline",
  },
];

const CAT_PALETTE = [
  "#FF6B35",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#C7B8EA",
  "#F4A261",
  "#2EC4B6",
  "#E76F51",
  "#A8DADC",
  "#F1C40F",
  "#E91E8C",
  "#06D6A0",
];
const catColor = (name = "") =>
  CAT_PALETTE[(name.charCodeAt(0) || 0) % CAT_PALETTE.length];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PostJobScreen() {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { currency } = useCurrency();
  const { toast } = useToast();
  const c = th.colors;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Step 1
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [jobType, setJobType] = useState("FULL_TIME");
  const [locationType, setLocationType] = useState("REMOTE");
  const [locationAddress, setLocationAddress] = useState("");

  // Step 2
  const [description, setDescription] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Step 3
  const [paymentType, setPaymentType] = useState("FIXED");
  const [durationType, setDurationType] = useState("DAYS");
  const [durationValue, setDurationValue] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Categories
  const [categories, setCategories] = useState([]);
  const [catLoading, setCatLoading] = useState(true);

  // Progress animation
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;
  useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: step / TOTAL_STEPS,
      useNativeDriver: false,
      damping: 20,
    }).start();
  }, [step, progressAnim]);

  useEffect(() => {
    categoriesApi
      .getAll({ limit: 1000 })
      .then(setCategories)
      .catch(() => toast.error(t("toast.networkError")))
      .finally(() => setCatLoading(false));
  }, []);

  const filteredCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    const q = catSearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) =>
      (cat?.name ?? "").toLowerCase().includes(q),
    );
  }, [categories, catSearch]);

  const selectCategory = (cat) => {
    const safeName = cat?.name ?? "";
    setCategoryId(cat?.id ?? null);
    setCategoryName(safeName);
    setTitle(safeName);
    setShowCustom(false);
    setErrors((e) => ({ ...e, category: null, title: null }));
  };

  const clearCategory = () => {
    setCategoryId(null);
    setCategoryName("");
    setTitle("");
  };

  const handleAddCustom = async () => {
    const name = customCatName.trim();
    if (!name) return;
    setAddingCustom(true);
    try {
      const newCat = await categoriesApi.suggest(name);

      if (newCat.alreadyExists) {
        // Find it in the current list and select it
        const existing = categories.find(
          (c) =>
            c.id === newCat.id || c.name?.toLowerCase() === name.toLowerCase(),
        );
        if (existing) {
          selectCategory(existing);
          toast.info(t("postJob.categoryAlreadyExists", { name }));
        } else {
          // Not in loaded list yet — add it then select
          setCategories((prev) => [...prev, newCat]);
          selectCategory(newCat);
          toast.info(t("postJob.categoryAlreadyExists", { name }));
        }
      } else {
        setCategories((prev) => {
          const exists = prev.some(
            (c) => c.id === newCat.id || c.name === newCat.name,
          );
          return exists ? prev : [...prev, newCat];
        });
        selectCategory(newCat);
        toast.success(t("postJob.addedCategory", { name }));
      }
    } catch (err) {
      toast.error(err?.response?.data?.message ?? t("toast.unknownError"));
    } finally {
      setCustomCatName("");
      setShowCustom(false);
      setAddingCustom(false);
    }
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s) return;
    if (skills.includes(s)) {
      setSkillInput("");
      return;
    }
    if (skills.length >= 10) {
      toast.info(t("postJob.maxSkills"));
      return;
    }
    setSkills((prev) => [...prev, s]);
    setSkillInput("");
  };
  const removeSkill = (s) => setSkills((prev) => prev.filter((x) => x !== s));

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) {
      setStartDateObj(selectedDate);
      const iso = selectedDate.toISOString().split("T")[0];
      setStartDate(iso);
      setErrors((e) => ({ ...e, startDate: null }));
    }
  };

  const formattedDate = startDate
    ? new Date(startDate + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!title.trim()) e.title = t("postJob.titleRequired");
      if (!categoryId && !title.trim())
        e.category = t("postJob.categoryRequired");
      if (locationType !== "REMOTE" && !locationAddress.trim())
        e.locationAddress = t("postJob.locationRequired");
    }
    if (step === 2) {
      if (!description.trim() || description.trim().length < 50)
        e.description = t("postJob.descriptionTooShort");
      if (!startDate.trim()) e.startDate = t("postJob.startDateRequired");
    }
    if (step === 3) {
      const n = parseFloat(budgetAmount);
      if (!budgetAmount || isNaN(n) || n <= 0)
        e.budgetAmount = t("postJob.budgetRequired");
      if (
        durationType !== "CUSTOM" &&
        (!durationValue || isNaN(parseInt(durationValue, 10)))
      )
        e.durationValue = t("postJob.durationRequired", {
          unit: t(`postJob.durationType.${durationType}`).toLowerCase(),
        });
      if (durationType === "CUSTOM" && !durationValue.trim())
        e.durationValue = t("postJob.durationCustomRequired");
    }
    return e;
  };

  const handleNext = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setErrors({});
    if (step < TOTAL_STEPS) {
      setStep((s) => s + 1);
      return;
    }
    handleSubmit();
  };

  const handleBack = () => {
    if (step > 1) setStep((s) => s - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      let resolvedCategoryId = categoryId;
      if (!resolvedCategoryId && title.trim()) {
        try {
          const newCat = await categoriesApi.suggest(title.trim());
          resolvedCategoryId = newCat.id;
          setCategories((prev) => [...prev, newCat]);
          setCategoryId(newCat.id);
          setCategoryName(newCat.name);
        } catch {}
      }
      await hirerApi.createJobPost({
        title: title.trim(),
        categoryId: resolvedCategoryId,
        jobType,
        locationType,
        address: locationType !== "REMOTE" ? locationAddress.trim() : null,
        description: description.trim(),
        skills,
        scheduledAt: startDate.trim(),
        startDate: startDate.trim(),
        budgetType: paymentType,
        budget: parseFloat(budgetAmount),
        currency: currency?.code || "USD",
        durationType,
        durationValue: durationValue.trim(),
        ...(additionalNotes.trim() && { notes: additionalNotes.trim() }),
      });
      toast.success(t("postJob.successMessage"));
      navigation.navigate("MyPosts");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("toast.networkError"));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = Array.isArray(categories)
    ? categories.find((cat) => cat.id === categoryId)
    : undefined;

  const selectedPayment = PAYMENT_TYPE_KEYS.find(
    (p) => p.value === paymentType,
  );

  // ── Budget label helper ──────────────────────────────────────────────────
  const budgetLabel = () => {
    switch (paymentType) {
      case "HOURLY":
        return t("postJob.hourlyRate");
      case "DAILY":
        return t("postJob.dailyRate");
      case "WEEKLY":
        return t("postJob.weeklyRate");
      case "MONTHLY":
        return t("postJob.monthlyRate");
      case "CUSTOM":
        return t("postJob.agreedAmount");
      default:
        return t("postJob.fixedPrice");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <AppScreen>
      {/* ── Top bar ── */}
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <AppText variant="small" tone="dim">
          {step}/{TOTAL_STEPS}
        </AppText>
      </View>

      {/* ── Progress bar ── */}
      <View style={[styles.progressTrack, { backgroundColor: c.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: c.orange,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* ── Step header ── */}
      <View style={styles.stepHeader}>
        <AppText variant="displaySm" weight="displayBlack">
          {t(`postJob.step${step}Title`)}
        </AppText>
        <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
          {t(`postJob.step${step}Sub`)}
        </AppText>
      </View>

      {/* ════════ STEP 1 ════════ */}
      {step === 1 && (
        <View style={styles.form}>
          {/* Category */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.category")}
            </AppText>
            <View
              style={[
                styles.searchRow,
                { borderColor: c.border, backgroundColor: c.inputBg },
              ]}
            >
              <Ionicons
                name="search"
                size={16}
                color={c.textMuted}
                style={{ marginRight: 8 }}
              />
              <TextInput
                value={catSearch}
                onChangeText={setCatSearch}
                placeholder={t("postJob.searchCategories")}
                placeholderTextColor={c.textMuted}
                style={[styles.searchInput, { color: c.text }]}
                autoCapitalize="words"
              />
              {catSearch.length > 0 && (
                <Pressable onPress={() => setCatSearch("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={c.textMuted} />
                </Pressable>
              )}
            </View>
            {errors.category && (
              <AppText variant="small" tone="danger" style={{ marginTop: 4 }}>
                {errors.category}
              </AppText>
            )}
            <View
              style={[
                styles.catListWrap,
                { borderColor: c.border, backgroundColor: c.bgCard },
              ]}
            >
              {catLoading ? (
                <View style={styles.catLoading}>
                  <ActivityIndicator color={c.orange} />
                </View>
              ) : (
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ maxHeight: 280 }}
                >
                  {filteredCategories.length === 0 && catSearch.trim() ? (
                    <View style={styles.catEmpty}>
                      <AppText variant="small" tone="dim">
                        {t("postJob.noMatch", { query: catSearch })}
                      </AppText>
                    </View>
                  ) : (
                    filteredCategories.map((cat, idx) => {
                      const selected = categoryId === cat.id;
                      const bg = catColor(cat.name);
                      const initial = (cat.name || "?").charAt(0).toUpperCase();
                      const rowKey =
                        cat.id ?? cat.slug ?? cat.name ?? String(idx);
                      return (
                        <Pressable
                          key={rowKey}
                          onPress={() => selectCategory(cat)}
                          style={({ pressed }) => [
                            styles.catRow,
                            {
                              borderBottomColor: c.border,
                              borderBottomWidth:
                                idx < filteredCategories.length - 1
                                  ? StyleSheet.hairlineWidth
                                  : 0,
                              backgroundColor: pressed
                                ? c.orangeDim
                                : selected
                                  ? c.orangeDim
                                  : "transparent",
                            },
                          ]}
                        >
                          <View
                            style={[styles.catCircle, { backgroundColor: bg }]}
                          >
                            <AppText
                              variant="small"
                              weight="semibold"
                              style={{ color: "#fff", fontSize: 13 }}
                            >
                              {initial}
                            </AppText>
                          </View>
                          <View style={{ flex: 1, marginLeft: 12 }}>
                            <AppText
                              variant="body"
                              weight={selected ? "semibold" : "regular"}
                              style={{ color: selected ? c.orange : c.text }}
                            >
                              {cat.name}
                            </AppText>
                          </View>
                          {selected && (
                            <View style={styles.catSelectedActions}>
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={c.orange}
                              />
                              <Pressable
                                onPress={(e) => {
                                  e.stopPropagation();
                                  clearCategory();
                                }}
                                hitSlop={10}
                                style={[
                                  styles.catRemoveBtn,
                                  { backgroundColor: c.orange },
                                ]}
                              >
                                <Ionicons name="close" size={12} color="#fff" />
                              </Pressable>
                            </View>
                          )}
                        </Pressable>
                      );
                    })
                  )}
                  {!showCustom && (
                    <Pressable
                      onPress={() => setShowCustom(true)}
                      style={[
                        styles.catRow,
                        {
                          borderTopColor: c.border,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.catCircle,
                          { backgroundColor: c.orange },
                        ]}
                      >
                        <Ionicons name="add" size={16} color="#fff" />
                      </View>
                      <AppText
                        variant="body"
                        weight="semibold"
                        style={{ marginLeft: 12, color: c.orange }}
                      >
                        {t("postJob.customOther")}
                      </AppText>
                    </Pressable>
                  )}
                </ScrollView>
              )}
            </View>
            {showCustom && (
              <View
                style={[
                  styles.customBox,
                  { borderColor: c.orange, backgroundColor: c.orangeDim },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ marginBottom: 8, color: c.orange }}
                >
                  {t("postJob.suggestCategory")}
                </AppText>
                <View
                  style={[
                    styles.skillInputRow,
                    { borderColor: c.border, backgroundColor: c.bgInput },
                  ]}
                >
                  <TextInput
                    value={customCatName}
                    onChangeText={setCustomCatName}
                    placeholder={t("postJob.categoryInputPlaceholder")}
                    placeholderTextColor={c.textMuted}
                    style={[styles.skillTextInput, { color: c.text }]}
                    returnKeyType="done"
                    onSubmitEditing={handleAddCustom}
                    autoFocus
                  />
                  {addingCustom ? (
                    <ActivityIndicator
                      color={c.orange}
                      style={{ marginRight: 14 }}
                    />
                  ) : (
                    <Pressable
                      onPress={handleAddCustom}
                      style={[styles.addBtn, { backgroundColor: c.orange }]}
                    >
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={() => {
                    setShowCustom(false);
                    setCustomCatName("");
                  }}
                  hitSlop={8}
                  style={{ marginTop: 10, alignSelf: "flex-start" }}
                >
                  <AppText variant="small" tone="dim">
                    {t("common.cancel")}
                  </AppText>
                </Pressable>
              </View>
            )}
          </View>

          {/* Job Title */}
          <View>
            <AppInput
              label={t("postJob.jobTitle")}
              placeholder={t("postJob.jobTitlePlaceholder")}
              iconLeft="create-outline"
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (categoryId && v !== categoryName) {
                  setCategoryId(null);
                  setCategoryName("");
                }
                setErrors((e) => ({ ...e, title: null, category: null }));
              }}
              error={errors.title}
              returnKeyType="next"
            />
            {!categoryId && title.trim().length > 0 && (
              <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
                {t("postJob.yourTitleNote")}
              </AppText>
            )}
          </View>

          {/* Job Type */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.jobType")}
            </AppText>
            <View style={styles.twoColWrap}>
              {JOB_TYPE_KEYS.map((jt) => {
                const sel = jobType === jt.value;
                return (
                  <Pressable
                    key={jt.value}
                    onPress={() => setJobType(jt.value)}
                    style={[
                      styles.twoColCell,
                      {
                        borderColor: sel ? c.orange : c.border,
                        backgroundColor: sel ? c.orangeDim : c.bgCard,
                      },
                    ]}
                  >
                    {sel && (
                      <View
                        style={[styles.selDot, { backgroundColor: c.orange }]}
                      />
                    )}
                    <Ionicons
                      name={jt.icon}
                      size={20}
                      color={sel ? c.orange : c.textMuted}
                    />
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{
                        marginTop: 8,
                        color: sel ? c.orange : c.text,
                        textAlign: "center",
                      }}
                    >
                      {t(jt.labelKey)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Location Type */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.locationType")}
            </AppText>
            <View style={styles.threeColWrap}>
              {LOCATION_TYPE_KEYS.map((lt) => {
                const sel = locationType === lt.value;
                return (
                  <Pressable
                    key={lt.value}
                    onPress={() => {
                      setLocationType(lt.value);
                      setErrors((e) => ({ ...e, locationAddress: null }));
                    }}
                    style={[
                      styles.threeColCell,
                      {
                        borderColor: sel ? c.orange : c.border,
                        backgroundColor: sel ? c.orangeDim : c.bgCard,
                      },
                    ]}
                  >
                    {sel && (
                      <View
                        style={[styles.selDot, { backgroundColor: c.orange }]}
                      />
                    )}
                    <Ionicons
                      name={lt.icon}
                      size={18}
                      color={sel ? c.orange : c.textMuted}
                    />
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{
                        marginTop: 6,
                        color: sel ? c.orange : c.text,
                        textAlign: "center",
                      }}
                    >
                      {t(lt.labelKey)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {locationType !== "REMOTE" && (
            <AppInput
              label={t("postJob.locationAddress")}
              placeholder={t("postJob.locationAddressPlaceholder")}
              iconLeft="location-outline"
              value={locationAddress}
              onChangeText={(v) => {
                setLocationAddress(v);
                setErrors((e) => ({ ...e, locationAddress: null }));
              }}
              error={errors.locationAddress}
            />
          )}
        </View>
      )}

      {/* ════════ STEP 2 ════════ */}
      {step === 2 && (
        <View style={styles.form}>
          {/* Description */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.description")}
            </AppText>
            <View
              style={[
                styles.textArea,
                {
                  borderColor: errors.description ? c.red : c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            >
              <TextInput
                multiline
                numberOfLines={7}
                textAlignVertical="top"
                placeholder={t("postJob.descriptionPlaceholder")}
                placeholderTextColor={c.textMuted}
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  setErrors((e) => ({ ...e, description: null }));
                }}
                style={[styles.textAreaInput, { color: c.text }]}
              />
            </View>
            <View style={styles.charRow}>
              {errors.description ? (
                <AppText variant="small" tone="danger">
                  {errors.description}
                </AppText>
              ) : (
                <AppText variant="small" tone="dim">
                  {t("postJob.minChars", { count: 50 })}
                </AppText>
              )}
              <AppText variant="small" tone="dim">
                {description.length}
              </AppText>
            </View>
          </View>

          {/* Skills */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.skills")}{" "}
              <AppText variant="small" tone="dim">
                ({t("postJob.optional")})
              </AppText>
            </AppText>
            <View
              style={[
                styles.skillInputRow,
                { borderColor: c.border, backgroundColor: c.bgInput },
              ]}
            >
              <TextInput
                value={skillInput}
                onChangeText={setSkillInput}
                onSubmitEditing={addSkill}
                placeholder={t("postJob.skillPlaceholder")}
                placeholderTextColor={c.textMuted}
                style={[styles.skillTextInput, { color: c.text }]}
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <Pressable
                onPress={addSkill}
                style={[styles.addBtn, { backgroundColor: c.orange }]}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </Pressable>
            </View>
            {skills.length > 0 && (
              <View style={styles.skillTags}>
                {skills.map((sk) => (
                  <View
                    key={sk}
                    style={[
                      styles.skillTag,
                      { backgroundColor: c.orangeDim, borderColor: c.orange },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      {sk}
                    </AppText>
                    <Pressable
                      onPress={() => removeSkill(sk)}
                      hitSlop={6}
                      style={{ marginLeft: 6 }}
                    >
                      <Ionicons
                        name="close-circle"
                        size={16}
                        color={c.orange}
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
              {t("postJob.skillsHint", { current: skills.length, max: 10 })}
            </AppText>
          </View>

          {/* Start Date */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.startDate")}
            </AppText>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.dateBtn,
                {
                  borderColor: errors.startDate ? c.red : c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            >
              <Ionicons name="calendar-outline" size={18} color={c.orange} />
              <AppText
                variant="body"
                style={{
                  flex: 1,
                  marginLeft: 10,
                  color: formattedDate ? c.text : c.textMuted,
                }}
              >
                {formattedDate || t("postJob.tapToChooseDate")}
              </AppText>
              <Ionicons name="chevron-down" size={16} color={c.textMuted} />
            </Pressable>
            {errors.startDate && (
              <AppText variant="small" tone="danger" style={{ marginTop: 4 }}>
                {errors.startDate}
              </AppText>
            )}
            {showDatePicker && Platform.OS === "android" && (
              <DateTimePicker
                value={startDateObj}
                mode="date"
                display="default"
                minimumDate={new Date()}
                onChange={onDateChange}
              />
            )}
            {Platform.OS === "ios" && (
              <Modal
                visible={showDatePicker}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDatePicker(false)}
              >
                <Pressable
                  style={styles.dateBackdrop}
                  onPress={() => setShowDatePicker(false)}
                />
                <View
                  style={[
                    styles.dateSheet,
                    { backgroundColor: c.bgPanel, borderTopColor: c.border },
                  ]}
                >
                  <View
                    style={[
                      styles.dateSheetHeader,
                      { borderBottomColor: c.border },
                    ]}
                  >
                    <AppText variant="body" weight="semibold">
                      {t("postJob.selectStartDate")}
                    </AppText>
                    <Pressable
                      onPress={() => setShowDatePicker(false)}
                      hitSlop={10}
                    >
                      <AppText
                        variant="body"
                        weight="semibold"
                        style={{ color: c.orange }}
                      >
                        {t("postJob.done")}
                      </AppText>
                    </Pressable>
                  </View>
                  <DateTimePicker
                    value={startDateObj}
                    mode="date"
                    display="spinner"
                    minimumDate={new Date()}
                    onChange={onDateChange}
                    style={{ height: 200, width: "100%" }}
                    themeVariant="dark"
                  />
                </View>
              </Modal>
            )}
          </View>
        </View>
      )}

      {/* ════════ STEP 3 ════════ */}
      {step === 3 && (
        <View style={styles.form}>
          {/* Payment Type */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.budgetType")}
            </AppText>
            <View
              style={[
                styles.catListWrap,
                { borderColor: c.border, backgroundColor: c.bgCard },
              ]}
            >
              {PAYMENT_TYPE_KEYS.map((pt, idx) => {
                const sel = paymentType === pt.value;
                return (
                  <Pressable
                    key={pt.value}
                    onPress={() => setPaymentType(pt.value)}
                    style={({ pressed }) => [
                      styles.catRow,
                      {
                        borderBottomColor: c.border,
                        borderBottomWidth:
                          idx < PAYMENT_TYPE_KEYS.length - 1
                            ? StyleSheet.hairlineWidth
                            : 0,
                        backgroundColor: pressed
                          ? c.orangeDim
                          : sel
                            ? c.orangeDim
                            : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.catCircle,
                        { backgroundColor: sel ? c.orange : c.border },
                      ]}
                    >
                      <Ionicons
                        name={pt.icon}
                        size={16}
                        color={sel ? "#fff" : c.textMuted}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <AppText
                        variant="body"
                        weight={sel ? "semibold" : "regular"}
                        style={{ color: sel ? c.orange : c.text }}
                      >
                        {t(pt.labelKey)}
                      </AppText>
                      <AppText variant="small" tone="dim">
                        {t(pt.subKey)}
                      </AppText>
                    </View>
                    {sel && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={c.orange}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Job Duration */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.jobDuration")}
            </AppText>
            <View
              style={[
                styles.catListWrap,
                { borderColor: c.border, backgroundColor: c.bgCard },
              ]}
            >
              {DURATION_TYPE_KEYS.map((dt, idx) => {
                const sel = durationType === dt.value;
                return (
                  <Pressable
                    key={dt.value}
                    onPress={() => {
                      setDurationType(dt.value);
                      setDurationValue("");
                      setErrors((e) => ({ ...e, durationValue: null }));
                    }}
                    style={({ pressed }) => [
                      styles.catRow,
                      {
                        borderBottomColor: c.border,
                        borderBottomWidth:
                          idx < DURATION_TYPE_KEYS.length - 1
                            ? StyleSheet.hairlineWidth
                            : 0,
                        backgroundColor: pressed
                          ? c.orangeDim
                          : sel
                            ? c.orangeDim
                            : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.catCircle,
                        { backgroundColor: sel ? c.orange : c.border },
                      ]}
                    >
                      <Ionicons
                        name={dt.icon}
                        size={16}
                        color={sel ? "#fff" : c.textMuted}
                      />
                    </View>
                    <AppText
                      variant="body"
                      weight={sel ? "semibold" : "regular"}
                      style={{
                        flex: 1,
                        marginLeft: 12,
                        color: sel ? c.orange : c.text,
                      }}
                    >
                      {t(dt.labelKey)}
                    </AppText>
                    {sel && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={c.orange}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
            {durationType === "CUSTOM" ? (
              <AppInput
                label={t("postJob.describeDuration")}
                placeholder={t("postJob.describeDurationPlaceholder")}
                iconLeft="time-outline"
                value={durationValue}
                onChangeText={(v) => {
                  setDurationValue(v);
                  setErrors((e) => ({ ...e, durationValue: null }));
                }}
                error={errors.durationValue}
                style={{ marginTop: 10 }}
              />
            ) : (
              <AppInput
                label={t("postJob.howMany", {
                  unit: t(`postJob.durationType.${durationType}`).toLowerCase(),
                })}
                placeholder={
                  durationType === "HOURS"
                    ? "e.g. 4"
                    : durationType === "DAYS"
                      ? "e.g. 5"
                      : durationType === "WEEKS"
                        ? "e.g. 2"
                        : "e.g. 3"
                }
                iconLeft="hourglass-outline"
                value={durationValue}
                onChangeText={(v) => {
                  setDurationValue(v.replace(/[^0-9]/g, ""));
                  setErrors((e) => ({ ...e, durationValue: null }));
                }}
                keyboardType="number-pad"
                error={errors.durationValue}
                style={{ marginTop: 10 }}
              />
            )}
          </View>

          {/* Currency */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.paymentCurrency")}
            </AppText>
            <CurrencyPicker label={t("postJob.payIn")} />
            <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
              {t("postJob.cryptoNote")}
            </AppText>
          </View>

          {/* Budget Amount */}
          <AppInput
            label={budgetLabel()}
            placeholder="0.00"
            iconLeft="cash-outline"
            value={budgetAmount}
            onChangeText={(v) => {
              setBudgetAmount(v.replace(/[^0-9.]/g, ""));
              setErrors((e) => ({ ...e, budgetAmount: null }));
            }}
            keyboardType="decimal-pad"
            error={errors.budgetAmount}
          />

          {/* Additional Notes */}
          <View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginBottom: 8 }}
            >
              {t("postJob.additionalNotes")}{" "}
              <AppText variant="small" tone="dim">
                ({t("postJob.optional")})
              </AppText>
            </AppText>
            <View
              style={[
                styles.textArea,
                {
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                  minHeight: 100,
                },
              ]}
            >
              <TextInput
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholder={t("postJob.notesPlaceholder")}
                placeholderTextColor={c.textMuted}
                value={additionalNotes}
                onChangeText={setAdditionalNotes}
                style={[styles.textAreaInput, { color: c.text }]}
              />
            </View>
          </View>

          {/* Review Summary */}
          <View>
            <SectionHeader title={t("postJob.reviewTitle")} />
            <Card padded style={{ marginTop: 8 }}>
              <RRow
                icon="create-outline"
                label={t("postJob.review.title")}
                value={title}
                c={c}
              />
              <RDiv c={c} />
              <RRow
                icon="grid-outline"
                label={t("postJob.review.category")}
                value={selectedCategoryObj?.name || "—"}
                c={c}
              />
              <RDiv c={c} />
              <RRow
                icon="briefcase-outline"
                label={t("postJob.review.jobType")}
                value={t(
                  JOB_TYPE_KEYS.find((j) => j.value === jobType)?.labelKey ||
                    "",
                )}
                c={c}
              />
              <RDiv c={c} />
              <RRow
                icon="location-outline"
                label={t("postJob.review.location")}
                value={t(
                  LOCATION_TYPE_KEYS.find((l) => l.value === locationType)
                    ?.labelKey || "",
                )}
                c={c}
              />
              {locationType !== "REMOTE" && locationAddress ? (
                <>
                  <RDiv c={c} />
                  <RRow
                    icon="map-outline"
                    label={t("postJob.review.address")}
                    value={locationAddress}
                    c={c}
                  />
                </>
              ) : null}
              <RDiv c={c} />
              <RRow
                icon="calendar-outline"
                label={t("postJob.review.startDate")}
                value={startDate}
                c={c}
              />
              <RDiv c={c} />
              <RRow
                icon="cash-outline"
                label={t("postJob.review.payment")}
                value={`${currency?.symbol || "$"}${budgetAmount || "0"} ${t(selectedPayment?.labelKey || "")}`}
                c={c}
              />
              <RDiv c={c} />
              <RRow
                icon="time-outline"
                label={t("postJob.review.duration")}
                value={
                  durationType === "CUSTOM"
                    ? durationValue
                    : `${durationValue} ${t(`postJob.durationType.${durationType}`).toLowerCase()}`
                }
                c={c}
              />
              {skills.length > 0 && (
                <>
                  <RDiv c={c} />
                  <RRow
                    icon="code-slash-outline"
                    label={t("postJob.review.skills")}
                    value={skills.join(", ")}
                    c={c}
                  />
                </>
              )}
              {additionalNotes.trim() && (
                <>
                  <RDiv c={c} />
                  <RRow
                    icon="document-text-outline"
                    label={t("postJob.review.notes")}
                    value={additionalNotes.trim()}
                    c={c}
                  />
                </>
              )}
            </Card>
          </View>
        </View>
      )}

      {/* CTAs */}
      <View style={styles.ctaWrap}>
        <AppButton
          title={
            submitting
              ? t("postJob.posting")
              : step < TOTAL_STEPS
                ? t("postJob.continue")
                : t("postJob.postJob")
          }
          iconLeft={
            submitting
              ? undefined
              : step < TOTAL_STEPS
                ? "arrow-forward"
                : "checkmark-circle-outline"
          }
          onPress={handleNext}
          loading={submitting}
        />
        <AppButton
          title={t("common.back")}
          variant="ghost"
          onPress={handleBack}
        />
      </View>
    </AppScreen>
  );
}

function RRow({ icon, label, value, c }) {
  return (
    <View style={styles.reviewRow}>
      <Ionicons
        name={icon}
        size={16}
        color={c.orange}
        style={{ marginTop: 2 }}
      />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <AppText variant="small" tone="dim">
          {label}
        </AppText>
        <AppText variant="body" weight="medium" style={{ marginTop: 2 }}>
          {value || "—"}
        </AppText>
      </View>
    </View>
  );
}
function RDiv({ c }) {
  return <View style={[styles.divider, { backgroundColor: c.border }]} />;
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: { height: "100%", borderRadius: 2 },
  stepHeader: { marginBottom: 20 },
  form: { gap: 20 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  catListWrap: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  catLoading: { paddingVertical: 24, alignItems: "center" },
  catEmpty: { padding: 16 },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  catCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  catSelectedActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  catRemoveBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  customBox: { marginTop: 10, borderWidth: 1.5, borderRadius: 12, padding: 14 },
  twoColWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  twoColCell: {
    width: "48.5%",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  threeColWrap: { flexDirection: "row", gap: 8 },
  threeColCell: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  selDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  skillInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: "hidden",
    paddingLeft: 12,
  },
  skillTextInput: { flex: 1, height: 48, fontSize: 15 },
  addBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  skillTags: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  skillTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  textArea: { borderWidth: 1.5, borderRadius: 12, padding: 14, minHeight: 140 },
  textAreaInput: { fontSize: 15, lineHeight: 22, flex: 1 },
  charRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  dateBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)" },
  dateSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    paddingBottom: 40,
  },
  dateSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reviewRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  divider: { height: 1 },
  ctaWrap: { marginTop: 24, gap: 8 },
});
