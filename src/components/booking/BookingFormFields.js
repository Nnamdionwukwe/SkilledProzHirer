// src/components/booking/BookingFormFields.js
//
// Port of pages/bookings/CreateBooking/BookingFormFields.jsx.
// Schedule section now uses two tap buttons that trigger native
// DateTimePicker dialogs via onOpenDatePicker / onOpenTimePicker.

import { Pressable, TextInput, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FaBriefcase,
  FaClock,
  FaFileText,
  FaHourglassHalf,
  FaGlobe,
  FaMapPin,
  FaRightLeft,
  FaDollarSign,
  FaSun,
  FaCalendarAlt,
  FaPencil,
  FaCheck,
  FaLock,
} from "../../icons/fa";

const JOB_TYPES = [
  { value: "FULL_TIME", label: "Full-time", Icon: FaBriefcase },
  { value: "PART_TIME", label: "Part-time", Icon: FaClock },
  { value: "CONTRACT", label: "Contract", Icon: FaFileText },
  { value: "TEMPORARY", label: "Temporary", Icon: FaHourglassHalf },
];

const LOCATION_TYPES = [
  { value: "REMOTE", label: "Remote", Icon: FaGlobe },
  { value: "ON_SITE", label: "On-site", Icon: FaMapPin },
  { value: "HYBRID", label: "Hybrid", Icon: FaRightLeft },
];

const BUDGET_TYPES = [
  {
    value: "FIXED",
    label: "Fixed Price",
    sub: "Pay a set total",
    Icon: FaDollarSign,
  },
  { value: "HOURLY", label: "Per Hour", sub: "Billed hourly", Icon: FaClock },
  { value: "DAILY", label: "Per Day", sub: "Billed daily", Icon: FaSun },
  {
    value: "WEEKLY",
    label: "Per Week",
    sub: "Billed weekly",
    Icon: FaCalendarAlt,
  },
  {
    value: "MONTHLY",
    label: "Per Month",
    sub: "Billed monthly",
    Icon: FaCalendarAlt,
  },
  {
    value: "YEARLY",
    label: "Per Year",
    sub: "Billed yearly",
    Icon: FaCalendarAlt,
  },
  { value: "CUSTOM", label: "Custom", sub: "Define your own", Icon: FaPencil },
];

const DURATION_TYPES_LIST = [
  { value: "HOURS", label: "Hours", Icon: FaClock },
  { value: "DAYS", label: "Days", Icon: FaSun },
  { value: "WEEKS", label: "Weeks", Icon: FaCalendarAlt },
  { value: "MONTHS", label: "Months", Icon: FaCalendarAlt },
  { value: "YEARLY", label: "Yearly", Icon: FaCalendarAlt },
  { value: "CUSTOM", label: "Custom", Icon: FaPencil },
];

const UNIT_TO_TYPES = {
  hours: { budget: "HOURLY", duration: "HOURS" },
  days: { budget: "DAILY", duration: "DAYS" },
  weeks: { budget: "WEEKLY", duration: "WEEKS" },
  months: { budget: "MONTHLY", duration: "MONTHS" },
  years: { budget: "YEARLY", duration: "YEARLY" },
  custom: { budget: "CUSTOM", duration: "CUSTOM" },
};

export default function BookingFormFields({
  worker,
  jobType,
  setJobType,
  locationType,
  setLocationType,
  budgetType,
  setBudgetType,
  durationType,
  setDurationType,
  form,
  set,
  minDate,
  selectedUnit,
  isNegotiated,
  onOpenCategoryPicker,
  onOpenDatePicker,
  onOpenTimePicker,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const isLocked = selectedUnit && !isNegotiated;
  const lockedBudgetType = selectedUnit
    ? UNIT_TO_TYPES[selectedUnit]?.budget
    : null;
  const lockedDurationType = selectedUnit
    ? UNIT_TO_TYPES[selectedUnit]?.duration
    : null;
  const isNegotiatedLocked = isNegotiated;

  const scheduledDate = form.scheduledAt ? new Date(form.scheduledAt) : null;

  return (
    <>
      {worker ? (
        <>
          {/* Job Type */}
          <View style={fieldset(c)}>
            <AppText style={legend(c)}>JOB TYPE</AppText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {JOB_TYPES.map((jt) => {
                const Icon = jt.Icon;
                const active = jobType === jt.value;
                return (
                  <Pressable
                    key={jt.value}
                    onPress={() => setJobType(jt.value)}
                    style={({ pressed }) => [
                      {
                        flexBasis: "48%",
                        flexGrow: 1,
                        paddingVertical: 16,
                        paddingHorizontal: 8,
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: active
                          ? "rgba(249,115,22,0.08)"
                          : c.bgCard,
                        borderWidth: 1.5,
                        borderColor: active ? c.orange : c.border,
                        borderRadius: 14,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Icon size={20} color={active ? c.orange : c.textDim} />
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {jt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Location Type */}
          <View style={fieldset(c)}>
            <AppText style={legend(c)}>LOCATION TYPE</AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {LOCATION_TYPES.map((lt) => {
                const Icon = lt.Icon;
                const active = locationType === lt.value;
                return (
                  <Pressable
                    key={lt.value}
                    onPress={() => setLocationType(lt.value)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        paddingVertical: 14,
                        paddingHorizontal: 4,
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: active
                          ? "rgba(249,115,22,0.08)"
                          : c.bgCard,
                        borderWidth: 1.5,
                        borderColor: active ? c.orange : c.border,
                        borderRadius: 14,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Icon size={18} color={active ? c.orange : c.textDim} />
                    <AppText
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: active ? c.orange : c.textDim,
                      }}
                    >
                      {lt.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Payment Type */}
          <View style={fieldset(c)}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <AppText style={legend(c)}>PAYMENT TYPE</AppText>
              {isLocked || isNegotiatedLocked ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    backgroundColor: c.bgInput || c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 6,
                  }}
                >
                  <FaLock size={10} color={c.textMuted} />
                  <AppText style={{ fontSize: 9, color: c.textMuted }}>
                    Locked
                  </AppText>
                </View>
              ) : null}
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {BUDGET_TYPES.map((bt, idx) => {
                const Icon = bt.Icon;
                const active = isNegotiatedLocked
                  ? bt.value === "FIXED"
                  : budgetType === bt.value;
                const disabled = isNegotiatedLocked
                  ? bt.value !== "FIXED"
                  : isLocked && bt.value !== lockedBudgetType;
                return (
                  <Pressable
                    key={bt.value}
                    onPress={() => !disabled && setBudgetType(bt.value)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: active
                          ? "rgba(249,115,22,0.08)"
                          : pressed && !disabled
                            ? c.bgCard
                            : "transparent",
                        borderBottomWidth:
                          idx < BUDGET_TYPES.length - 1 ? 1 : 0,
                        borderBottomColor: c.border,
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: active ? c.orange : c.bgCard,
                        borderWidth: 1,
                        borderColor: active ? c.orange : c.border,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={15} color={active ? "#000" : c.textDim} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: active ? c.orange : c.text,
                        }}
                      >
                        {bt.label}
                      </AppText>
                      <AppText style={{ fontSize: 11, color: c.textMuted }}>
                        {bt.sub}
                      </AppText>
                    </View>
                    {active ? (
                      <FaCheck size={16} color={c.orange} />
                    ) : disabled ? (
                      <FaLock size={12} color={c.textMuted} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
            {isLocked ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <FaLock size={11} color={c.textMuted} />
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  Payment type is locked to match the worker's selected rate.
                </AppText>
              </View>
            ) : null}
            {isNegotiatedLocked ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <FaLock size={11} color={c.textMuted} />
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  Payment type is locked to "Fixed Price" for negotiated
                  bookings.
                </AppText>
              </View>
            ) : null}
          </View>

          {/* Job Duration */}
          <View style={fieldset(c)}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <AppText style={legend(c)}>JOB DURATION</AppText>
              {isLocked || isNegotiatedLocked ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    backgroundColor: c.bgInput || c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 6,
                  }}
                >
                  <FaLock size={10} color={c.textMuted} />
                  <AppText style={{ fontSize: 9, color: c.textMuted }}>
                    Locked
                  </AppText>
                </View>
              ) : null}
            </View>
            <View
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {DURATION_TYPES_LIST.map((dt, idx) => {
                const Icon = dt.Icon;
                const active = isNegotiatedLocked
                  ? dt.value === "CUSTOM"
                  : durationType === dt.value;
                const disabled = isNegotiatedLocked
                  ? dt.value !== "CUSTOM"
                  : isLocked && dt.value !== lockedDurationType;
                return (
                  <Pressable
                    key={dt.value}
                    onPress={() => !disabled && setDurationType(dt.value)}
                    disabled={disabled}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                        backgroundColor: active
                          ? "rgba(249,115,22,0.08)"
                          : pressed && !disabled
                            ? c.bgCard
                            : "transparent",
                        borderBottomWidth:
                          idx < DURATION_TYPES_LIST.length - 1 ? 1 : 0,
                        borderBottomColor: c.border,
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: active ? c.orange : c.bgCard,
                        borderWidth: 1,
                        borderColor: active ? c.orange : c.border,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={14} color={active ? "#000" : c.textDim} />
                    </View>
                    <AppText
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: "600",
                        color: active ? c.orange : c.text,
                      }}
                    >
                      {dt.label}
                    </AppText>
                    {active ? (
                      <FaCheck size={16} color={c.orange} />
                    ) : disabled ? (
                      <FaLock size={12} color={c.textMuted} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Category */}
          <View style={fieldset(c)}>
            <AppText style={legend(c)}>CATEGORY</AppText>
            <AppText style={label(c)}>Service Category</AppText>
            <AppText style={{ fontSize: 11, color: c.textMuted }}>
              Auto-filled from the worker's registered categories.
            </AppText>
            {worker.categories?.length === 1 ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <AppText style={{ fontSize: 13, color: c.text }}>
                  {`${worker.categories[0].category.icon || ""} ${
                    worker.categories[0].category.name || ""
                  }`.trim()}
                </AppText>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: c.bgInput || c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 6,
                  }}
                >
                  <FaLock size={10} color={c.textMuted} />
                  <AppText style={{ fontSize: 10, color: c.textMuted }}>
                    Locked
                  </AppText>
                </View>
              </View>
            ) : (
              <Pressable
                onPress={onOpenCategoryPicker}
                style={({ pressed }) => [
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: c.bgInput || c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText style={{ fontSize: 13, color: c.text }}>
                  {(() => {
                    const found = worker.categories?.find(
                      (wc) => wc.category.id === form.categoryId,
                    );
                    return found
                      ? `${found.category.icon || ""} ${
                          found.category.name || ""
                        }`.trim()
                      : "Select category";
                  })()}
                </AppText>
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  Tap to change
                </AppText>
              </Pressable>
            )}
          </View>
        </>
      ) : null}

      {/* Job Information */}
      <View style={fieldset(c)}>
        <AppText style={legend(c)}>JOB INFORMATION</AppText>

        <View style={{ gap: 6 }}>
          <AppText style={label(c)}>
            Job Title <AppText style={{ color: c.orange }}>*</AppText>
          </AppText>
          <TextInput
            value={form.title}
            onChangeText={(t) => set("title", t)}
            placeholder="e.g. Fix leaking kitchen pipe"
            placeholderTextColor={c.textMuted}
            maxLength={120}
            style={input(c)}
          />
        </View>

        <View style={{ gap: 6 }}>
          <AppText style={label(c)}>
            Description <AppText style={{ color: c.orange }}>*</AppText>
          </AppText>
          <TextInput
            value={form.description}
            onChangeText={(t) => set("description", t)}
            placeholder="Describe exactly what needs to be done..."
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={4}
            style={[input(c), { minHeight: 100, textAlignVertical: "top" }]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <AppText style={label(c)}>Requirements (optional)</AppText>
          <TextInput
            value={form.requirements}
            onChangeText={(t) => set("requirements", t)}
            placeholder="e.g. Must have 3+ years of React experience"
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={2}
            style={[input(c), { minHeight: 60, textAlignVertical: "top" }]}
          />
        </View>

        <View style={{ gap: 6 }}>
          <AppText style={label(c)}>Responsibilities (optional)</AppText>
          <TextInput
            value={form.responsibilities}
            onChangeText={(t) => set("responsibilities", t)}
            placeholder="e.g. Design UI mockups, conduct user tests"
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={2}
            style={[input(c), { minHeight: 60, textAlignVertical: "top" }]}
          />
        </View>

        {locationType !== "REMOTE" ? (
          <View style={{ gap: 6 }}>
            <AppText style={label(c)}>
              Service Address <AppText style={{ color: c.orange }}>*</AppText>
            </AppText>
            <TextInput
              value={form.address}
              onChangeText={(t) => set("address", t)}
              placeholder="Full address where the job will take place"
              placeholderTextColor={c.textMuted}
              style={input(c)}
            />
          </View>
        ) : null}

        <View style={{ gap: 6 }}>
          <AppText style={label(c)}>Additional Notes</AppText>
          <TextInput
            value={form.notes}
            onChangeText={(t) => set("notes", t)}
            placeholder="Access instructions, parking, tools to bring..."
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={2}
            style={[input(c), { minHeight: 60, textAlignVertical: "top" }]}
          />
        </View>
      </View>

      {/* Schedule */}
      <View style={fieldset(c)}>
        <AppText style={legend(c)}>SCHEDULE</AppText>
        <View style={{ gap: 6 }}>
          <AppText style={label(c)}>
            Date & Time <AppText style={{ color: c.orange }}>*</AppText>
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onOpenDatePicker}
              style={({ pressed }) => [
                {
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: c.bgInput || c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaCalendarAlt size={14} color={c.textMuted} />
              <AppText style={{ fontSize: 13, color: c.text }}>
                {scheduledDate
                  ? scheduledDate.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Select date"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onOpenTimePicker}
              style={({ pressed }) => [
                {
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: c.bgInput || c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaClock size={14} color={c.textMuted} />
              <AppText style={{ fontSize: 13, color: c.text }}>
                {scheduledDate
                  ? scheduledDate.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Select time"}
              </AppText>
            </Pressable>
          </View>
          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            Min: {minDate.replace("T", " ")}
          </AppText>
        </View>
      </View>
    </>
  );
}

const fieldset = (c) => ({
  backgroundColor: c.bgPanel,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 16,
  paddingHorizontal: 14,
  paddingVertical: 14,
  gap: 12,
});

const legend = (c) => ({
  fontSize: 10,
  fontWeight: "700",
  color: c.orange,
  letterSpacing: 1,
  textTransform: "uppercase",
});

const label = (c) => ({
  fontSize: 10,
  fontWeight: "600",
  color: c.textDim,
  textTransform: "uppercase",
  letterSpacing: 0.6,
});

const input = (c) => ({
  backgroundColor: c.bgInput || c.bgCard,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 11,
  fontSize: 14,
  color: c.text,
  fontFamily: "DMSans_400Regular",
});
