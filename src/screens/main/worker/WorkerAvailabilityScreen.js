// src/screens/main/worker/WorkerAvailabilityScreen.js
// Verbatim port of pages/worker/availability/AvailabilityPage.jsx.
//
// Endpoints:
//   GET /workers/:id              → worker.availability (numeric dayOfWeek)
//   PUT /workers/availability     → { availability: [{ dayOfWeek, startTime, endTime, isAvailable }] }

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// DAYS — same shape as web
// ─────────────────────────────────────────────────────────────────────────────
const DAYS = [
  { value: "MONDAY", tKey: "monday", num: 1 },
  { value: "TUESDAY", tKey: "tuesday", num: 2 },
  { value: "WEDNESDAY", tKey: "wednesday", num: 3 },
  { value: "THURSDAY", tKey: "thursday", num: 4 },
  { value: "FRIDAY", tKey: "friday", num: 5 },
  { value: "SATURDAY", tKey: "saturday", num: 6 },
  { value: "SUNDAY", tKey: "sunday", num: 0 },
];

const DAY_MAP = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

function buildDefault() {
  return DAYS.map((d) => ({
    dayOfWeek: d.value,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: !["SATURDAY", "SUNDAY"].includes(d.value),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function DaySkeletons({ c }) {
  return (
    <View style={{ gap: 8 }}>
      {DAYS.map((d) => (
        <Skeleton key={d.value} width="100%" height={56} radius={8} />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerAvailabilityScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const [schedule, setSchedule] = useState(buildDefault());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchAvailability = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await client.get(`/workers/${user.id}`);
      const avail = res.data.data?.worker?.availability || [];
      if (avail.length > 0) {
        setSchedule(
          DAYS.map((d) => {
            const saved = avail.find((a) => a.dayOfWeek === DAY_MAP[d.value]);
            return saved
              ? {
                  dayOfWeek: d.value,
                  startTime: saved.startTime,
                  endTime: saved.endTime,
                  isAvailable: saved.isAvailable,
                }
              : {
                  dayOfWeek: d.value,
                  startTime: "08:00",
                  endTime: "18:00",
                  isAvailable: false,
                };
          }),
        );
      }
    } catch {
      // fall back to defaults
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  useFocusEffect(
    useCallback(() => {
      fetchAvailability();
    }, [fetchAvailability]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAvailability();
  };

  const toggle = (idx) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, isAvailable: !d.isAvailable } : d)),
    );

  const setTime = (idx, key, value) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, [key]: value } : d)),
    );

  const setAllWorkdays = () =>
    setSchedule((s) =>
      s.map((d) => ({
        ...d,
        isAvailable: !["SATURDAY", "SUNDAY"].includes(d.dayOfWeek),
        startTime: "08:00",
        endTime: "18:00",
      })),
    );

  const setAllDays = () =>
    setSchedule((s) =>
      s.map((d) => ({
        ...d,
        isAvailable: true,
        startTime: "08:00",
        endTime: "18:00",
      })),
    );

  const reset = () => setSchedule(buildDefault());

  const handleSave = async () => {
    setSaving(true);
    try {
      await client.put("/workers/availability", { availability: schedule });
      toast.success(t("workerAvailability.success.saved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("workerAvailability.error.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const activeDays = schedule.filter((d) => d.isAvailable).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Header */}
      <View style={{ marginTop: 4 }}>
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 15,
            color: c.text,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t("workerAvailability.title")}
        </AppText>
        <AppText style={{ fontSize: 12, color: c.textDim, lineHeight: 19 }}>
          {t("workerAvailability.subtitle")}
        </AppText>
      </View>

      {/* Quick actions */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
        }}
      >
        <QuickButton
          label={t("workerAvailability.quick.monFri")}
          onPress={setAllWorkdays}
          c={c}
        />
        <QuickButton
          label={t("workerAvailability.quick.everyDay")}
          onPress={setAllDays}
          c={c}
        />
        <QuickButton
          label={t("workerAvailability.quick.reset")}
          onPress={reset}
          c={c}
        />
        <AppText
          style={{
            fontSize: 11,
            color: c.textMuted,
            marginLeft: "auto",
          }}
        >
          {t("workerAvailability.activeDays", { count: activeDays })}
        </AppText>
      </View>

      {/* Card */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 16,
        }}
      >
        <AppText
          weight="displayBlack"
          style={{ fontSize: 12, color: c.text, marginBottom: 4 }}
        >
          {t("workerAvailability.schedule.title")}
        </AppText>
        <AppText
          style={{
            fontSize: 12,
            color: c.textMuted,
            marginBottom: 16,
            lineHeight: 18,
          }}
        >
          {t("workerAvailability.schedule.subtitle")}
        </AppText>

        {loading ? (
          <DaySkeletons c={c} />
        ) : (
          <View style={{ gap: 8 }}>
            {schedule.map((day, idx) => {
              const dayMeta = DAYS.find((d) => d.value === day.dayOfWeek);
              const dayLabel = t(
                `workerAvailability.days.${dayMeta?.tKey || "monday"}`,
              );
              return (
                <View
                  key={day.dayOfWeek}
                  style={{
                    backgroundColor: day.isAvailable ? c.orangeDim : c.bgInput,
                    borderWidth: 1,
                    borderColor: day.isAvailable ? c.orange + "55" : c.border,
                    borderRadius: 10,
                    padding: 12,
                    opacity: day.isAvailable ? 1 : 0.6,
                  }}
                >
                  {/* Toggle row */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Switch
                        value={day.isAvailable}
                        onValueChange={() => toggle(idx)}
                        trackColor={{
                          false: "rgba(255,255,255,0.08)",
                          true: c.orange,
                        }}
                        thumbColor={day.isAvailable ? c.text : c.textDim}
                        ios_backgroundColor="rgba(255,255,255,0.08)"
                      />
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: day.isAvailable ? c.orange : c.textDim,
                        }}
                        numberOfLines={1}
                      >
                        {dayLabel}
                      </AppText>
                    </View>
                  </View>

                  {/* Time row */}
                  {day.isAvailable ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      <TimeInput
                        value={day.startTime}
                        onChange={(v) => setTime(idx, "startTime", v)}
                        c={c}
                      />
                      <AppText
                        style={{
                          fontSize: 11,
                          color: c.textMuted,
                          fontWeight: "600",
                        }}
                      >
                        {t("workerAvailability.common.to")}
                      </AppText>
                      <TimeInput
                        value={day.endTime}
                        onChange={(v) => setTime(idx, "endTime", v)}
                        c={c}
                      />
                    </View>
                  ) : (
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textMuted,
                        fontStyle: "italic",
                        marginTop: 6,
                      }}
                    >
                      {t("workerAvailability.common.notAvailable")}
                    </AppText>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Save */}
        <View
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={saving || loading}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 12,
              borderRadius: 10,
              backgroundColor: c.orange,
              opacity: saving || loading ? 0.5 : pressed ? 0.9 : 1,
            })}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={16} color="#fff" />
                <AppText
                  style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
                >
                  {t("workerAvailability.button.save")}
                </AppText>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function QuickButton({ label, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bgCard,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <AppText style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}>
        {label}
      </AppText>
    </Pressable>
  );
}

function TimeInput({ value, onChange, c }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="HH:MM"
      placeholderTextColor={c.textMuted}
      keyboardType="numbers-and-punctuation"
      style={{
        flex: 1,
        minWidth: 0,
        backgroundColor: c.bgInput,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 10,
        fontSize: 13,
        color: c.text,
      }}
    />
  );
}
