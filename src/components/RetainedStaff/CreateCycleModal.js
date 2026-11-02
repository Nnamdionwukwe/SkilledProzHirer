// src/components/RetainedStaff/CreateCycleModal.js
//
// Ported verbatim from src/pages/hirer/retained-staff/CreateCycleModal.jsx
// + CreateCycleModal.module.css.
//
// Fee rate: getHirerFeeRate(currency) → 3% NGN, 6% foreign.
// Do NOT hardcode percentages — always use pricing.js.

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
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { retainedStaffApi } from "../../api/retainedStaff";
import { getHirerFeeRate } from "../../utils/pricing";

const CYCLE_TYPES = [
  {
    value: "MANUAL",
    labelKey: "retainedStaff.cycleTypeManual",
    descKey: "retainedStaff.cycleTypeManualDesc",
  },
  {
    value: "BONUS",
    labelKey: "retainedStaff.cycleTypeBonus",
    descKey: "retainedStaff.cycleTypeBonusDesc",
  },
  {
    value: "REIMBURSEMENT",
    labelKey: "retainedStaff.cycleTypeReimburse",
    descKey: "retainedStaff.cycleTypeReimburseDesc",
  },
  {
    value: "FINAL_SETTLEMENT",
    labelKey: "retainedStaff.cycleTypeFinal",
    descKey: "retainedStaff.cycleTypeFinalDesc",
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateCycleModal({
  isOpen,
  onClose,
  onSuccess,
  member,
}) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { width } = useWindowDimensions();
  const isNarrow = width <= 560;

  const [type, setType] = useState("BONUS");
  const [form, setForm] = useState({
    periodStart: today(),
    periodEnd: today(),
    payDate: today(),
    baseAmount: "",
    bonusAmount: "",
    deductionAmount: "0",
    label: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen || !member) return;
    setType("BONUS");
    setForm({
      periodStart: today(),
      periodEnd: today(),
      payDate: today(),
      baseAmount: "",
      bonusAmount: "",
      deductionAmount: "0",
      label: "",
      notes: "",
    });
    setError("");
  }, [isOpen, member]);

  const grossAmount =
    (parseFloat(form.baseAmount) || 0) + (parseFloat(form.bonusAmount) || 0);
  const workerPayout = Math.max(
    0,
    grossAmount - (parseFloat(form.deductionAmount) || 0),
  );

  const currency = member?.currency || "NGN";
  const feeRate = getHirerFeeRate(currency);
  const feePercent = feeRate * 100;

  const platformFee = Math.round(workerPayout * feeRate * 100) / 100;
  const netAmount = Math.round((workerPayout + platformFee) * 100) / 100;

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  const handleSubmit = async () => {
    setError("");
    if (grossAmount <= 0) {
      setError(t("retainedStaff.cycleAmountRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        type,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
        baseAmount: parseFloat(form.baseAmount) || 0,
        bonusAmount: parseFloat(form.bonusAmount) || 0,
        deductionAmount: parseFloat(form.deductionAmount) || 0,
        label: form.label.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const res = await retainedStaffApi.createCycle(member.id, payload);
      toast.success(t("retainedStaff.cycleCreated"));
      onSuccess?.(res.data?.data?.cycle);
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message || t("retainedStaff.cycleCreateFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
                  {t("retainedStaff.createCycleTitle")}
                </AppText>
                <AppText
                  numberOfLines={2}
                  style={{
                    fontFamily: theme.fonts?.body || "DMSans_400Regular",
                    fontSize: rem(0.8),
                    lineHeight: rem(0.8) * 1.35,
                    color: c.textDim,
                    marginTop: 4,
                  }}
                >
                  {t("retainedStaff.createCycleFor", {
                    jobTitle: member?.jobTitle || "",
                    name: `${member?.worker?.firstName || ""} ${
                      member?.worker?.lastName || ""
                    }`.trim(),
                  })}
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
              {/* Cycle type */}
              <View style={{ marginBottom: rem(1) }}>
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
                  {t("retainedStaff.cycleType")}
                </AppText>
                <View
                  style={[styles.typeGrid, isNarrow && styles.typeGridSingle]}
                >
                  {CYCLE_TYPES.map((ct) => {
                    const active = type === ct.value;
                    return (
                      <Pressable
                        key={ct.value}
                        onPress={() => setType(ct.value)}
                        style={({ pressed }) => [
                          styles.typeCard,
                          {
                            borderColor: active ? c.orange : c.border,
                            backgroundColor: active ? c.orangeDim : c.bgInput,
                            opacity: pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodyBold || "DMSans_700Bold",
                            fontSize: rem(0.9),
                            fontWeight: "700",
                            color: c.text,
                          }}
                        >
                          {t(ct.labelKey)}
                        </AppText>
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.body || "DMSans_400Regular",
                            fontSize: rem(0.75),
                            lineHeight: rem(0.75) * 1.4,
                            color: c.textDim,
                            marginTop: 4,
                          }}
                        >
                          {t(ct.descKey)}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Dates */}
              <View
                style={[styles.formGrid, isNarrow && styles.formGridSingle]}
              >
                <Field
                  label={t("retainedStaff.periodStart")}
                  value={form.periodStart}
                  onChangeText={(v) => setForm({ ...form, periodStart: v })}
                  placeholder="YYYY-MM-DD"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.periodEnd")}
                  value={form.periodEnd}
                  onChangeText={(v) => setForm({ ...form, periodEnd: v })}
                  placeholder="YYYY-MM-DD"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.payDate")}
                  value={form.payDate}
                  onChangeText={(v) => setForm({ ...form, payDate: v })}
                  placeholder="YYYY-MM-DD"
                  full
                  theme={theme}
                  rem={rem}
                />
              </View>

              {/* Amounts */}
              <View
                style={[styles.formGrid, isNarrow && styles.formGridSingle]}
              >
                <Field
                  label={t("retainedStaff.baseAmount", { currency })}
                  value={form.baseAmount}
                  onChangeText={(v) => setForm({ ...form, baseAmount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.bonusAmount", { currency })}
                  value={form.bonusAmount}
                  onChangeText={(v) => setForm({ ...form, bonusAmount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.deductionAmount", { currency })}
                  value={form.deductionAmount}
                  onChangeText={(v) => setForm({ ...form, deductionAmount: v })}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.cycleLabel")}
                  value={form.label}
                  onChangeText={(v) => setForm({ ...form, label: v })}
                  placeholder={t("retainedStaff.cycleLabelPlaceholder")}
                  theme={theme}
                  rem={rem}
                />
                <Field
                  label={t("retainedStaff.cycleNotes")}
                  value={form.notes}
                  onChangeText={(v) => setForm({ ...form, notes: v })}
                  placeholder={t("retainedStaff.cycleNotesPlaceholder")}
                  multiline
                  full
                  theme={theme}
                  rem={rem}
                />
              </View>

              {/* Preview */}
              {netAmount > 0 ? (
                <View
                  style={[
                    styles.preview,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.orange,
                    },
                  ]}
                >
                  <View style={styles.previewHeader}>
                    <Ionicons name="cash-outline" size={16} color={c.orange} />
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.displayBlack || "Syne_800ExtraBold",
                        fontSize: rem(0.85),
                        fontWeight: "800",
                        color: c.orange,
                        textTransform: "uppercase",
                        letterSpacing: 0.05 * rem(0.85),
                        marginLeft: 6,
                      }}
                    >
                      {t("retainedStaff.cyclePreview")}
                    </AppText>
                  </View>
                  <PreviewRow
                    label={t("retainedStaff.basePlusBonus")}
                    value={`${currency} ${grossAmount.toLocaleString()}`}
                    theme={theme}
                    rem={rem}
                  />
                  {parseFloat(form.deductionAmount) > 0 ? (
                    <PreviewRow
                      label={t("retainedStaff.deductions")}
                      value={`− ${currency} ${parseFloat(
                        form.deductionAmount,
                      ).toLocaleString()}`}
                      theme={theme}
                      rem={rem}
                    />
                  ) : null}
                  <PreviewRow
                    label={t("retainedStaff.workerReceives")}
                    value={`${currency} ${workerPayout.toLocaleString()}`}
                    theme={theme}
                    rem={rem}
                  />
                  <PreviewRow
                    label={t("retainedStaff.platformFeeWithRate", {
                      rate: feePercent.toFixed(1),
                    })}
                    value={`+ ${currency} ${platformFee.toLocaleString()}`}
                    theme={theme}
                    rem={rem}
                  />
                  <View
                    style={[
                      styles.previewTotalRow,
                      { borderTopColor: c.border },
                    ]}
                  >
                    <AppText
                      style={{
                        fontFamily: theme.fonts?.display || "Syne_700Bold",
                        fontSize: rem(1),
                        fontWeight: "800",
                        color: c.text,
                      }}
                    >
                      {t("retainedStaff.youPayHirer")}
                    </AppText>
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.displayBlack || "Syne_800ExtraBold",
                        fontSize: rem(1),
                        fontWeight: "800",
                        color: c.green,
                      }}
                    >
                      {currency} {netAmount.toLocaleString()}
                    </AppText>
                  </View>
                </View>
              ) : null}
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
                    ? t("retainedStaff.cycleCreating")
                    : t("retainedStaff.createCycleBtn")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({
  label,
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

function PreviewRow({ label, value, theme, rem }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <AppText
        style={{
          fontFamily: theme.fonts?.body || "DMSans_400Regular",
          fontSize: rem(0.85),
          color: theme.colors.textDim,
        }}
      >
        {label}
      </AppText>
      <AppText
        style={{
          fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
          fontSize: rem(0.85),
          fontWeight: "600",
          color: theme.colors.text,
        }}
      >
        {value}
      </AppText>
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
    maxWidth: 680,
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
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeGridSingle: { flexDirection: "column" },
  typeCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1.5,
    borderRadius: 10,
    padding: 12,
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  formGridSingle: { flexDirection: "column" },
  preview: {
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  previewTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
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
