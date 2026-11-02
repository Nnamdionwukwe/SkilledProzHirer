// src/components/RetainedStaff/EditStaffModal.js
//
// Ported verbatim from src/pages/hirer/retained-staff/EditRetainedStaffModal.jsx
// + AddStaffModal.module.css (which it reuses).
//
// Key detail: rate change detection. If payRate !== member.payRate,
// show the "Rate Change Detected" panel with "applyToPending" checkbox.

import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";

const PAY_FREQUENCIES = [
  { value: "WEEKLY", key: "weekly" },
  { value: "BIWEEKLY", key: "biweekly" },
  { value: "SEMI_MONTHLY", key: "semiMonthly" },
  { value: "MONTHLY", key: "monthly" },
  { value: "QUARTERLY", key: "quarterly" },
  { value: "ON_DEMAND", key: "onDemand" },
];
const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", key: "fullTime" },
  { value: "PART_TIME", key: "partTime" },
  { value: "CONTRACT", key: "contract" },
  { value: "CASUAL", key: "casual" },
];
const LOCATION_TYPES = [
  { value: "ON_SITE", key: "onSite" },
  { value: "REMOTE", key: "remote" },
  { value: "HYBRID", key: "hybrid" },
];
const WORK_DAYS = [
  { value: "MON", key: "mon" },
  { value: "TUE", key: "tue" },
  { value: "WED", key: "wed" },
  { value: "THU", key: "thu" },
  { value: "FRI", key: "fri" },
  { value: "SAT", key: "sat" },
  { value: "SUN", key: "sun" },
];
const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

export default function EditStaffModal({ isOpen, onClose, onSuccess, member }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { width } = useWindowDimensions();
  const isNarrow = width <= 560;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState(empty());

  useEffect(() => {
    if (isOpen && member) {
      setForm({
        jobTitle: member.jobTitle || "",
        department: member.department || "",
        employmentType: member.employmentType || "FULL_TIME",
        locationType: member.locationType || "ON_SITE",
        location: member.location || "",
        latitude: member.latitude ?? null,
        longitude: member.longitude ?? null,
        description: member.description || "",
        payRate: member.payRate ?? "",
        currency: member.currency || "NGN",
        payFrequency: member.payFrequency || "MONTHLY",
        overtimeRate: member.overtimeRate ?? "",
        workDays: member.workDays || [],
        workStart: member.workStart || "09:00",
        workEnd: member.workEnd || "17:00",
        timezone: member.timezone || "Africa/Lagos",
        employeeNumber: member.employeeNumber || "",
        managerName: member.managerName || "",
        emergencyContact: member.emergencyContact || "",
        notes: member.notes || "",
        applyToPending: false,
        rateChangeReason: "",
      });
      setError("");
      setLocating(false);
    }
  }, [isOpen, member]);

  function empty() {
    return {
      jobTitle: "",
      department: "",
      employmentType: "FULL_TIME",
      locationType: "ON_SITE",
      location: "",
      latitude: null,
      longitude: null,
      description: "",
      payRate: "",
      currency: "NGN",
      payFrequency: "MONTHLY",
      overtimeRate: "",
      workDays: [],
      workStart: "09:00",
      workEnd: "17:00",
      timezone: "Africa/Lagos",
      employeeNumber: "",
      managerName: "",
      emergencyContact: "",
      notes: "",
      applyToPending: false,
      rateChangeReason: "",
    };
  }

  const toggleWorkDay = (day) => {
    setForm((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const handleAutoLocate = async () => {
    setError("");
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError(t("retainedStaff.locationPermissionDenied"));
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = pos.coords;
      let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
          { headers: { "User-Agent": "SkilledProz/1.0" } },
        );
        const data = await res.json();
        if (data?.display_name) address = data.display_name;
      } catch {}
      setForm((prev) => ({
        ...prev,
        location: address,
        latitude,
        longitude,
      }));
    } catch {
      setError(t("retainedStaff.couldNotGetLocation"));
    } finally {
      setLocating(false);
    }
  };

  const rateChanged =
    parseFloat(form.payRate) !== parseFloat(member?.payRate || 0);

  const handleSubmit = async () => {
    setError("");
    if (!form.jobTitle.trim()) {
      setError(t("retainedStaff.jobTitleRequired"));
      return;
    }
    if (!form.payRate || parseFloat(form.payRate) <= 0) {
      setError(t("retainedStaff.payRateRequired"));
      return;
    }
    if (
      ["ON_SITE", "HYBRID"].includes(form.locationType) &&
      !form.location.trim()
    ) {
      setError(t("retainedStaff.locationRequired"));
      return;
    }
    if (rateChanged && form.applyToPending && !form.rateChangeReason.trim()) {
      setError(t("retainedStaff.rateChangeReasonRequired"));
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jobTitle: form.jobTitle.trim(),
        department: form.department.trim() || undefined,
        employmentType: form.employmentType,
        locationType: form.locationType,
        location: form.location.trim() || undefined,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
        description: form.description.trim() || undefined,
        payRate: parseFloat(form.payRate),
        currency: form.currency,
        payFrequency: form.payFrequency,
        overtimeRate: form.overtimeRate
          ? parseFloat(form.overtimeRate)
          : undefined,
        workDays: form.workDays,
        workStart: form.workStart,
        workEnd: form.workEnd,
        timezone: form.timezone,
        employeeNumber: form.employeeNumber.trim() || undefined,
        managerName: form.managerName.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        notes: form.notes.trim() || undefined,
        applyToPending: form.applyToPending,
        rateChangeReason: form.rateChangeReason.trim() || undefined,
      };
      const res = await retainedStaffApi.updateStaff(member.id, payload);
      toast.success(t("retainedStaff.staffUpdated"));
      onSuccess?.(res.data?.data?.member);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || t("retainedStaff.staffUpdateFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const showLocationField = ["ON_SITE", "HYBRID"].includes(form.locationType);
  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlayRoot}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "rgba(0,0,0,0.7)" },
          ]}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <View
            style={[
              styles.modal,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={[styles.header, { borderBottomColor: c.border }]}>
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.displayBlack || "Syne_800ExtraBold",
                    fontSize: rem(1.25),
                    lineHeight: rem(1.25) * 1.15,
                    fontWeight: "800",
                    color: c.text,
                  }}
                >
                  {t("retainedStaff.editStaffTitle")}
                </AppText>
                <AppText
                  numberOfLines={1}
                  style={{
                    fontFamily: theme.fonts?.body || "DMSans_400Regular",
                    fontSize: rem(0.8),
                    lineHeight: rem(0.8) * 1.35,
                    color: c.textDim,
                    marginTop: 4,
                  }}
                >
                  {member?.worker?.firstName} {member?.worker?.lastName}
                </AppText>
              </View>
              <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={c.textDim} />
              </Pressable>
            </View>

            {error ? (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: c.redDim,
                    borderColor: "rgba(239,68,68,0.3)",
                  },
                ]}
              >
                <Ionicons name="alert-circle-outline" size={16} color={c.red} />
                <AppText
                  style={{
                    flex: 1,
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.85),
                    fontWeight: "600",
                    color: c.red,
                    marginLeft: 6,
                  }}
                >
                  {error}
                </AppText>
              </View>
            ) : null}

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <SectionTitle
                text={t("retainedStaff.roleAndPosition")}
                theme={theme}
                rem={rem}
              />
              <View
                style={[styles.formGrid, isNarrow && styles.formGridSingle]}
              >
                <Field
                  label={t("retainedStaff.jobTitle")}
                  required
                  value={form.jobTitle}
                  onChangeText={(v) => setForm({ ...form, jobTitle: v })}
                  placeholder="e.g. Senior Developer"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.department")}
                  value={form.department}
                  onChangeText={(v) => setForm({ ...form, department: v })}
                  placeholder="e.g. Engineering"
                  theme={theme}
                  rem={rem}
                />
                <SelectField
                  label={t("retainedStaff.employmentType")}
                  value={form.employmentType}
                  options={EMPLOYMENT_TYPES.map((o) => ({
                    value: o.value,
                    label: t(`retainedStaff.${o.key}`),
                  }))}
                  onChange={(v) => setForm({ ...form, employmentType: v })}
                  theme={theme}
                  rem={rem}
                />
                <SelectField
                  label={t("retainedStaff.locationType")}
                  value={form.locationType}
                  options={LOCATION_TYPES.map((o) => ({
                    value: o.value,
                    label: t(`retainedStaff.${o.key}`),
                  }))}
                  onChange={(v) => setForm({ ...form, locationType: v })}
                  theme={theme}
                  rem={rem}
                />

                {showLocationField ? (
                  <View style={{ width: "100%", marginBottom: 8 }}>
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                        fontSize: rem(0.75),
                        fontWeight: "600",
                        color: c.textDim,
                        textTransform: "uppercase",
                        letterSpacing: 0.05 * rem(0.75),
                        marginBottom: 6,
                      }}
                    >
                      {t("retainedStaff.workLocation")}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                        alignItems: "stretch",
                      }}
                    >
                      <View style={{ flex: 1, position: "relative" }}>
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color={c.textMuted}
                          style={{
                            position: "absolute",
                            left: 12,
                            top: 14,
                            zIndex: 1,
                          }}
                        />
                        <TextInput
                          value={form.location}
                          onChangeText={(v) =>
                            setForm({
                              ...form,
                              location: v,
                              latitude: null,
                              longitude: null,
                            })
                          }
                          placeholder={t(
                            "retainedStaff.workLocationPlaceholder",
                          )}
                          placeholderTextColor={c.textMuted}
                          style={{
                            backgroundColor: c.bgInput,
                            borderColor: c.border,
                            borderWidth: 1,
                            borderRadius: 8,
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                            paddingLeft: 36,
                            color: c.text,
                            fontFamily:
                              theme.fonts?.body || "DMSans_400Regular",
                            fontSize: rem(0.9),
                          }}
                        />
                      </View>
                      <Pressable
                        onPress={handleAutoLocate}
                        disabled={locating}
                        style={{
                          backgroundColor: c.orangeDim,
                          borderColor: c.orange,
                          borderWidth: 1,
                          opacity: locating ? 0.7 : 1,
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 14,
                          paddingVertical: 10,
                          borderRadius: 8,
                        }}
                      >
                        {locating ? (
                          <ActivityIndicator size="small" color={c.orange} />
                        ) : (
                          <Ionicons
                            name="navigate-outline"
                            size={16}
                            color={c.orange}
                          />
                        )}
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                            fontSize: rem(0.8),
                            fontWeight: "600",
                            color: c.orange,
                            marginLeft: 6,
                          }}
                        >
                          {locating
                            ? t("retainedStaff.locating")
                            : t("retainedStaff.autoDetect")}
                        </AppText>
                      </Pressable>
                    </View>
                    {form.latitude && form.longitude ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 8,
                        }}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={12}
                          color={c.green}
                        />
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.body || "DMSans_400Regular",
                            fontSize: rem(0.7),
                            color: c.green,
                          }}
                        >
                          {t("retainedStaff.gpsCaptured", {
                            lat: form.latitude.toFixed(5),
                            lng: form.longitude.toFixed(5),
                          })}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Field
                  label={t("retainedStaff.employeeNumber")}
                  value={form.employeeNumber}
                  onChangeText={(v) => setForm({ ...form, employeeNumber: v })}
                  placeholder="EMP-001"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.roleDescription")}
                  value={form.description}
                  onChangeText={(v) => setForm({ ...form, description: v })}
                  placeholder={t("retainedStaff.roleDescriptionPlaceholder")}
                  multiline
                  full
                  theme={theme}
                  rem={rem}
                />
              </View>

              <SectionTitle
                text={t("retainedStaff.compensation")}
                theme={theme}
                rem={rem}
              />
              <View
                style={[styles.formGrid, isNarrow && styles.formGridSingle]}
              >
                <Field
                  label={t("retainedStaff.payRate")}
                  required
                  keyboardType="decimal-pad"
                  value={String(form.payRate)}
                  onChangeText={(v) => setForm({ ...form, payRate: v })}
                  placeholder="0.00"
                  theme={theme}
                  rem={rem}
                />
                <SelectField
                  label={t("retainedStaff.currency")}
                  value={form.currency}
                  options={CURRENCIES.map((cur) => ({
                    value: cur,
                    label: cur,
                  }))}
                  onChange={(v) => setForm({ ...form, currency: v })}
                  theme={theme}
                  rem={rem}
                />
                <SelectField
                  label={t("retainedStaff.payFrequency")}
                  value={form.payFrequency}
                  options={PAY_FREQUENCIES.map((o) => ({
                    value: o.value,
                    label: t(`retainedStaff.${o.key}`),
                  }))}
                  onChange={(v) => setForm({ ...form, payFrequency: v })}
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.overtimeRate")}
                  keyboardType="decimal-pad"
                  value={String(form.overtimeRate)}
                  onChangeText={(v) => setForm({ ...form, overtimeRate: v })}
                  placeholder="0.00"
                  theme={theme}
                  rem={rem}
                />
              </View>

              {/* Rate change detection */}
              {rateChanged ? (
                <View
                  style={[
                    styles.rateChangeBox,
                    { backgroundColor: c.orangeDim, borderColor: c.orange },
                  ]}
                >
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                      fontSize: rem(0.9),
                      fontWeight: "700",
                      color: c.orange,
                      marginBottom: 6,
                    }}
                  >
                    {t("retainedStaff.rateChangeDetected")}
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: theme.fonts?.body || "DMSans_400Regular",
                      fontSize: rem(0.85),
                      lineHeight: rem(0.85) * 1.5,
                      color: c.textDim,
                      marginBottom: 10,
                    }}
                  >
                    {t("retainedStaff.rateChangeDesc", {
                      oldCurrency: member?.currency,
                      oldRate: member?.payRate?.toLocaleString?.() || "0",
                      newCurrency: form.currency,
                      newRate: parseFloat(form.payRate || 0).toLocaleString(),
                    })}
                  </AppText>

                  <Pressable
                    onPress={() =>
                      setForm({
                        ...form,
                        applyToPending: !form.applyToPending,
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        borderWidth: 1.5,
                        borderColor: c.orange,
                        backgroundColor: form.applyToPending
                          ? c.orange
                          : "transparent",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {form.applyToPending ? (
                        <Ionicons name="checkmark" size={14} color="#fff" />
                      ) : null}
                    </View>
                    <AppText
                      style={{
                        flex: 1,
                        fontFamily: theme.fonts?.body || "DMSans_400Regular",
                        fontSize: rem(0.85),
                        color: c.text,
                      }}
                    >
                      {t("retainedStaff.applyToPending")}
                    </AppText>
                  </Pressable>

                  {form.applyToPending ? (
                    <View style={{ marginTop: 10 }}>
                      <Field
                        label={t("retainedStaff.rateChangeReason")}
                        required
                        value={form.rateChangeReason}
                        onChangeText={(v) =>
                          setForm({ ...form, rateChangeReason: v })
                        }
                        placeholder={t(
                          "retainedStaff.rateChangeReasonPlaceholder",
                        )}
                        theme={theme}
                        rem={rem}
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}

              <SectionTitle
                text={t("retainedStaff.workingSchedule")}
                theme={theme}
                rem={rem}
              />
              <View style={{ marginBottom: 8 }}>
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.75),
                    fontWeight: "600",
                    color: c.textDim,
                    textTransform: "uppercase",
                    letterSpacing: 0.05 * rem(0.75),
                    marginBottom: 6,
                  }}
                >
                  {t("retainedStaff.workDays")}
                </AppText>
                <View style={styles.daysRow}>
                  {WORK_DAYS.map((d) => {
                    const active = form.workDays.includes(d.value);
                    return (
                      <Pressable
                        key={d.value}
                        onPress={() => toggleWorkDay(d.value)}
                        style={({ pressed }) => [
                          styles.dayBtn,
                          {
                            backgroundColor: active ? c.orange : c.bgInput,
                            borderColor: active ? c.orange : c.border,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                            fontSize: rem(0.8),
                            fontWeight: "600",
                            color: active ? "#fff" : c.textDim,
                          }}
                        >
                          {t(`retainedStaff.${d.key}`)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              <View
                style={[styles.formGrid, isNarrow && styles.formGridSingle]}
              >
                <Field
                  label={t("retainedStaff.startTime")}
                  value={form.workStart}
                  onChangeText={(v) => setForm({ ...form, workStart: v })}
                  placeholder="09:00"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.endTime")}
                  value={form.workEnd}
                  onChangeText={(v) => setForm({ ...form, workEnd: v })}
                  placeholder="17:00"
                  theme={theme}
                  rem={rem}
                />
              </View>

              <SectionTitle
                text={t("retainedStaff.hrInformation")}
                theme={theme}
                rem={rem}
              />
              <View
                style={[styles.formGrid, isNarrow && styles.formGridSingle]}
              >
                <Field
                  label={t("retainedStaff.manager")}
                  value={form.managerName}
                  onChangeText={(v) => setForm({ ...form, managerName: v })}
                  placeholder={t("retainedStaff.managerPlaceholder")}
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.emergencyContact")}
                  value={form.emergencyContact}
                  onChangeText={(v) =>
                    setForm({ ...form, emergencyContact: v })
                  }
                  placeholder={t("retainedStaff.emergencyContactPlaceholder")}
                  keyboardType="phone-pad"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.internalNotes")}
                  value={form.notes}
                  onChangeText={(v) => setForm({ ...form, notes: v })}
                  placeholder={t("retainedStaff.internalNotesPlaceholder")}
                  multiline
                  full
                  theme={theme}
                  rem={rem}
                />
              </View>
            </ScrollView>

            <View style={[styles.footer, { borderTopColor: c.border }]}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    borderColor: pressed ? c.borderHover : c.border,
                    opacity: submitting ? 0.5 : 1,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.85),
                    fontWeight: "600",
                    color: c.textDim,
                  }}
                >
                  {t("retainedStaff.cancelBtn")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: pressed ? c.orangeHover : c.orange,
                    opacity: submitting ? 0.6 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color="#fff"
                  />
                )}
                <AppText
                  style={{
                    fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                    fontSize: rem(0.85),
                    fontWeight: "700",
                    color: "#fff",
                    marginLeft: 6,
                  }}
                >
                  {submitting
                    ? t("retainedStaff.saving")
                    : t("retainedStaff.saveChanges")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function SectionTitle({ text, theme, rem }) {
  return (
    <AppText
      style={{
        fontFamily: theme.fonts?.display || "Syne_700Bold",
        fontSize: rem(0.95),
        lineHeight: rem(0.95) * 1.2,
        fontWeight: "700",
        color: theme.colors.orange,
        textTransform: "uppercase",
        letterSpacing: 0.06 * rem(0.95),
        marginTop: rem(1.5),
        marginBottom: rem(0.75),
      }}
    >
      {text}
    </AppText>
  );
}

function Field({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  full,
  theme,
  rem,
}) {
  return (
    <View
      style={{
        width: full ? "100%" : undefined,
        flex: full ? undefined : 1,
        minWidth: full ? undefined : 140,
        marginBottom: 8,
      }}
    >
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.75),
          fontWeight: "600",
          color: theme.colors.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.05 * rem(0.75),
          marginBottom: 6,
        }}
      >
        {label}
        {required ? (
          <AppText style={{ color: theme.colors.red }}> *</AppText>
        ) : null}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{
          backgroundColor: theme.colors.bgInput,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          color: theme.colors.text,
          fontFamily: theme.fonts?.body || "DMSans_400Regular",
          fontSize: rem(0.9),
          minHeight: multiline ? 60 : 42,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function SelectField({ label, value, options, onChange, theme, rem }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ flex: 1, minWidth: 140, marginBottom: 8 }}>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.75),
          fontWeight: "600",
          color: theme.colors.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.05 * rem(0.75),
          marginBottom: 6,
        }}
      >
        {label}
      </AppText>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: theme.colors.bgInput,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 42,
        }}
      >
        <AppText
          numberOfLines={1}
          style={{
            fontFamily: theme.fonts?.body || "DMSans_400Regular",
            fontSize: rem(0.9),
            color: theme.colors.text,
            flex: 1,
          }}
        >
          {current?.label || "—"}
        </AppText>
        <Ionicons
          name="chevron-down"
          size={16}
          color={theme.colors.textMuted}
        />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.bgPanel,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.colors.border,
              width: "100%",
              maxWidth: 400,
              paddingVertical: 8,
            }}
          >
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  backgroundColor:
                    opt.value === value
                      ? theme.colors.orangeDim
                      : "transparent",
                }}
              >
                <AppText
                  style={{
                    fontFamily:
                      opt.value === value
                        ? theme.fonts?.bodySemiBold
                        : theme.fonts?.body,
                    fontSize: rem(0.9),
                    fontWeight: opt.value === value ? "600" : "400",
                    color:
                      opt.value === value
                        ? theme.colors.orange
                        : theme.colors.text,
                  }}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: { flex: 1 },
  kav: { flex: 1, justifyContent: "center", padding: 16 },
  modal: {
    borderRadius: 16,
    borderWidth: 1,
    width: "100%",
    maxWidth: 720,
    height: "90%",
    alignSelf: "center",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 24,
    marginTop: 16,
  },
  body: { padding: 24, paddingTop: 16 },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  formGridSingle: { flexDirection: "column" },
  rateChangeBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  dayBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
