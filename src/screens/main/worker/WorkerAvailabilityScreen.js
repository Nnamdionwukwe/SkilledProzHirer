// src/screens/main/worker/WorkerAvailabilityScreen.js
// Mirrors: website /worker/availability
// APIs:
//   GET /workers/:userId          — loads worker.availability (numeric dayOfWeek 0-6)
//   PUT /workers/availability     — { availability: [...] } (string dayOfWeek names)

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import DateTimePicker from "@react-native-community/datetimepicker";

import AppScreen from "../../../components/AppScreen";
import AppText from "../../../components/AppText";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─── Day definitions — matches website exactly ────────────────────────────────
// Now a function that accepts t
function getDays(t) {
  return [
    { value: "MONDAY", label: t("workerAvailability.days.monday"), num: 1 },
    { value: "TUESDAY", label: t("workerAvailability.days.tuesday"), num: 2 },
    {
      value: "WEDNESDAY",
      label: t("workerAvailability.days.wednesday"),
      num: 3,
    },
    { value: "THURSDAY", label: t("workerAvailability.days.thursday"), num: 4 },
    { value: "FRIDAY", label: t("workerAvailability.days.friday"), num: 5 },
    { value: "SATURDAY", label: t("workerAvailability.days.saturday"), num: 6 },
    { value: "SUNDAY", label: t("workerAvailability.days.sunday"), num: 0 },
  ];
}

// Backend returns numeric dayOfWeek; we map back to name
const NUM_TO_DAY = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};
// Name → numeric (for matching incoming data)
const DAY_TO_NUM = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

function buildDefault(t) {
  const DAYS = getDays(t);
  return DAYS.map((d) => ({
    dayOfWeek: d.value,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: !["SATURDAY", "SUNDAY"].includes(d.value),
  }));
}

// Convert "09:00" → "09:00 AM", "18:00" → "06:00 PM"
function fmt24to12(time24) {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

// Parse "09:00" → Date object (today at that time)
function timeStringToDate(timeStr) {
  const [h, m] = (timeStr ?? "08:00").split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

// Date → "HH:MM"
function dateToTimeString(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// ─── Time picker field ────────────────────────────────────────────────────────
function TimeField({ value, onChange, c }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const dateVal = timeStringToDate(value);

  const handleChange = (event, selected) => {
    if (Platform.OS === "android") setShow(false);
    if (selected) onChange(dateToTimeString(selected));
  };

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        onPress={() => setShow(true)}
        style={[
          av.timeBtn,
          {
            backgroundColor: "rgba(0,0,0,0.25)",
            borderColor: "rgba(255,255,255,0.08)",
          },
        ]}
      >
        <AppText variant="body" style={{ color: "#fff", flex: 1 }}>
          {fmt24to12(value)}
        </AppText>
        <Ionicons name="time-outline" size={18} color="rgba(255,255,255,0.5)" />
      </Pressable>

      {/* iOS: wrap in Modal */}
      {Platform.OS === "ios" && show && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <Pressable style={av.pickerBackdrop} onPress={() => setShow(false)}>
            <View style={[av.pickerSheet, { backgroundColor: c.bgCard }]}>
              <Pressable
                onPress={() => setShow(false)}
                style={{ alignSelf: "flex-end", padding: 14 }}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {t("workerAvailability.common.done")}
                </AppText>
              </Pressable>
              <DateTimePicker
                value={dateVal}
                mode="time"
                display="spinner"
                onChange={handleChange}
                textColor={c.text}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Android: dialog */}
      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={dateVal}
          mode="time"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

// ─── Single day row ───────────────────────────────────────────────────────────
function DayRow({ day, onToggle, onTimeChange, c }) {
  const { t } = useTranslation();
  const active = day.isAvailable;
  const DAYS = getDays(t);
  const dayLabel =
    DAYS.find((d) => d.value === day.dayOfWeek)?.label || day.dayOfWeek;

  return (
    <View
      style={[
        av.dayRow,
        {
          backgroundColor: active ? "rgba(249,115,22,0.12)" : c.bgPanel,
          borderColor: active ? "rgba(249,115,22,0.3)" : c.border,
        },
      ]}
    >
      {/* Toggle + label */}
      <View style={av.dayHeader}>
        <Switch
          value={active}
          onValueChange={onToggle}
          trackColor={{ false: "rgba(255,255,255,0.12)", true: c.orange }}
          thumbColor="#fff"
          ios_backgroundColor="rgba(255,255,255,0.12)"
        />
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: active ? c.orange : c.textMuted, marginLeft: 10 }}
        >
          {dayLabel}
        </AppText>
      </View>

      {/* Time pickers or "Not available" */}
      {active ? (
        <View style={av.timeRow}>
          <TimeField
            value={day.startTime}
            onChange={(t) => onTimeChange("startTime", t)}
            c={c}
          />
          <AppText
            variant="small"
            style={{ color: "rgba(255,255,255,0.4)", marginHorizontal: 6 }}
          >
            {t("workerAvailability.common.to")}
          </AppText>
          <TimeField
            value={day.endTime}
            onChange={(t) => onTimeChange("endTime", t)}
            c={c}
          />
        </View>
      ) : (
        <AppText variant="small" tone="dim" style={av.offLabel}>
          {t("workerAvailability.common.notAvailable")}
        </AppText>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerAvailabilityScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;

  const DAYS = getDays(t);
  const [schedule, setSchedule] = useState(buildDefault(t));
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/workers/${user.id}`);
      const avail = res.data.data?.worker?.availability ?? [];
      if (avail.length > 0) {
        // API returns numeric dayOfWeek — map back to named strings
        setSchedule(
          DAYS.map((d) => {
            const saved = avail.find(
              (a) =>
                a.dayOfWeek === DAY_TO_NUM[d.value] || a.dayOfWeek === d.value,
            );
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
      toast.error(t("workerAvailability.error.loadFailed"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Quick actions ───────────────────────────────────────────────────────────
  const setMonFri = () =>
    setSchedule((s) =>
      s.map((d) => ({
        ...d,
        isAvailable: !["SATURDAY", "SUNDAY"].includes(d.dayOfWeek),
        startTime: "08:00",
        endTime: "18:00",
      })),
    );

  const setEveryDay = () =>
    setSchedule((s) =>
      s.map((d) => ({
        ...d,
        isAvailable: true,
        startTime: "08:00",
        endTime: "18:00",
      })),
    );

  const reset = () => setSchedule(buildDefault(t));

  // ── Day mutations ───────────────────────────────────────────────────────────
  const toggle = (idx) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, isAvailable: !d.isAvailable } : d)),
    );

  const setTime = (idx, key, val) =>
    setSchedule((s) => s.map((d, i) => (i === idx ? { ...d, [key]: val } : d)));

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await client.put("/workers/availability", { availability: schedule });
      toast.success(t("workerAvailability.success.saved"));
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          t("workerAvailability.error.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const activeDays = schedule.filter((d) => d.isAvailable).length;

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ── */}

      <AppText variant="body" tone="dim" style={{ marginBottom: 20 }}>
        {t("workerAvailability.subtitle")}
      </AppText>

      {/* ── Quick actions ── */}
      <View style={av.quickRow}>
        {[
          { label: t("workerAvailability.quick.monFri"), onPress: setMonFri },
          {
            label: t("workerAvailability.quick.everyDay"),
            onPress: setEveryDay,
          },
          { label: t("workerAvailability.quick.reset"), onPress: reset },
        ].map((btn) => (
          <Pressable
            key={btn.label}
            onPress={btn.onPress}
            style={[
              av.quickBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text }}
            >
              {btn.label}
            </AppText>
          </Pressable>
        ))}
        <AppText
          variant="small"
          tone="dim"
          style={{ alignSelf: "center", flexShrink: 1 }}
        >
          {t("workerAvailability.common.daysActive", {
            count: activeDays,
            s: activeDays !== 1 ? "s" : "",
          })}
        </AppText>
      </View>

      {/* ── Schedule card ── */}
      <View
        style={[
          av.scheduleCard,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 4 }}
        >
          {t("workerAvailability.schedule.title")}
        </AppText>
        <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
          {t("workerAvailability.schedule.subtitle")}
        </AppText>

        {schedule.map((day, idx) => (
          <DayRow
            key={day.dayOfWeek}
            day={day}
            onToggle={() => toggle(idx)}
            onTimeChange={(key, val) => setTime(idx, key, val)}
            c={c}
          />
        ))}

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={saving || loading}
          style={[
            av.saveBtn,
            { backgroundColor: c.orange, opacity: saving ? 0.75 : 1 },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
              {t("workerAvailability.button.save")}
            </AppText>
          )}
        </Pressable>
      </View>
    </AppScreen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const av = StyleSheet.create({
  bigTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -1,
    marginBottom: 8,
    lineHeight: 30,
  },

  quickRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  quickBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },

  scheduleCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },

  dayRow: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  dayHeader: { flexDirection: "row", alignItems: "center" },
  timeRow: { flexDirection: "row", alignItems: "center" },
  offLabel: { paddingLeft: 2, fontStyle: "italic" },

  timeBtn: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  pickerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 24,
    alignItems: "center",
  },

  saveBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
});
