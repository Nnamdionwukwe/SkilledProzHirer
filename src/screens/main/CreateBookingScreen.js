// src/screens/main/CreateBookingScreen.js
//
// Port of pages/bookings/CreateBooking.jsx.
//
// Uses @react-native-community/datetimepicker for the schedule:
//   - Android: native calendar/clock dialogs
//   - iOS: inline spinners (kept open until user taps elsewhere)

import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import BookingWorkerInfo from "../../components/booking/BookingWorkerInfo";
import BookingFormFields from "../../components/booking/BookingFormFields";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import { getHirerFeeRate } from "../../utils/pricing";
import {
  FaArrowLeft,
  FaPlus,
  FaExclamationTriangle,
  FaClipboardList,
  FaCheck,
} from "../../icons/fa";

const DURATION_OPTIONS = [
  {
    unit: "hours",
    label: "Hourly",
    rateKey: "hourlyRate",
    suffix: "/hr",
    inputLabel: "Hours",
    inputType: "number",
    step: 0.5,
  },
  {
    unit: "days",
    label: "Daily",
    rateKey: "dailyRate",
    suffix: "/day",
    inputLabel: "Days",
    inputType: "number",
    step: 1,
  },
  {
    unit: "weeks",
    label: "Weekly",
    rateKey: "weeklyRate",
    suffix: "/wk",
    inputLabel: "Weeks",
    inputType: "number",
    step: 1,
  },
  {
    unit: "months",
    label: "Monthly",
    rateKey: "monthlyRate",
    suffix: "/mo",
    inputLabel: "Months",
    inputType: "number",
    step: 1,
  },
  {
    unit: "years",
    label: "Yearly",
    rateKey: "yearlyRate",
    suffix: "/yr",
    inputLabel: "Years",
    inputType: "number",
    step: 1,
  },
  {
    unit: "custom",
    label: "Custom",
    rateKey: "customRate",
    suffix: "",
    inputLabel: "Description",
    inputType: "text",
    step: null,
  },
];

const UNIT_TO_TYPES = {
  hours: { budget: "HOURLY", duration: "HOURS" },
  days: { budget: "DAILY", duration: "DAYS" },
  weeks: { budget: "WEEKLY", duration: "WEEKS" },
  months: { budget: "MONTHLY", duration: "MONTHS" },
  years: { budget: "YEARLY", duration: "YEARLY" },
  custom: { budget: "CUSTOM", duration: "CUSTOM" },
};

function computeFees(agreedRate, qty = 1, currency = "NGN") {
  const subtotal = parseFloat((agreedRate * qty).toFixed(2));
  const rate = getHirerFeeRate(currency);
  const hirerFee = parseFloat((subtotal * rate).toFixed(2));
  const totalToPay = parseFloat((subtotal + hirerFee).toFixed(2));
  return { subtotal, hirerFee, totalToPay, workerGets: subtotal };
}

export default function CreateBookingScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;
  const { user } = useAuthStore();

  const propWorkerId = route.params?.workerId || "";
  const fromJobId = route.params?.fromJob || null;

  const [worker, setWorker] = useState(null);
  const [workerLoading, setWorkerLoading] = useState(false);
  const [workerError, setWorkerError] = useState("");
  const [jobPost, setJobPost] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [jobType, setJobType] = useState("FULL_TIME");
  const [locationType, setLocationType] = useState("REMOTE");
  const [budgetType, setBudgetType] = useState("HOURLY");
  const [durationType, setDurationType] = useState("HOURS");
  const [isNegotiated, setIsNegotiated] = useState(false);
  const [negotiatedRate, setNegotiatedRate] = useState("");
  const [negotiationNote, setNegotiationNote] = useState("");
  const [form, setForm] = useState({
    workerId: propWorkerId,
    categoryId: "",
    title: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
    scheduledAt: "",
    estimatedValue: "",
    notes: "",
    requirements: "",
    responsibilities: "",
    rate: 0,
    customLabel: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);

  // Date/time picker state
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const minDate = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16);

  // Sync budgetType & durationType to selectedUnit
  useEffect(() => {
    if (selectedUnit && UNIT_TO_TYPES[selectedUnit]) {
      setBudgetType(UNIT_TO_TYPES[selectedUnit].budget);
      setDurationType(UNIT_TO_TYPES[selectedUnit].duration);
    }
  }, [selectedUnit]);

  // Load worker
  useEffect(() => {
    const id = form.workerId?.trim();
    if (!id) {
      setWorker(null);
      return;
    }
    setWorkerLoading(true);
    setWorkerError("");
    client
      .get(`/workers/${id}`)
      .then((res) => {
        const w = res.data.data.worker;
        setWorker(w);
        setForm((prev) => ({
          ...prev,
          rate: w.customRate || 0,
          customLabel: w.customRateLabel || "",
        }));
        const available = DURATION_OPTIONS.filter((o) =>
          o.rateKey === "customRate" ? w.customRate > 0 : w[o.rateKey] > 0,
        );
        setSelectedUnit((available[0] || DURATION_OPTIONS[0]).unit);
        const primaryCat =
          w.categories?.find((cc) => cc.isPrimary) || w.categories?.[0];
        if (primaryCat)
          setForm((f) => ({ ...f, categoryId: primaryCat.category.id }));
      })
      .catch(() => {
        setWorkerError("Worker not found. Check the ID and try again.");
      })
      .finally(() => setWorkerLoading(false));
  }, [form.workerId]);

  // Load job post
  useEffect(() => {
    if (!fromJobId) return;
    client
      .get(`/jobs/${fromJobId}`)
      .then((res) => {
        const jp = res.data.data.jobPost;
        setJobPost(jp);
        setForm((f) => ({
          ...f,
          categoryId: jp.categoryId || f.categoryId,
          title: jp.title || f.title,
          description: jp.description || f.description,
          address: jp.address || f.address,
          estimatedValue:
            jp.estimatedValue ||
            (jp.estimatedHours ? String(jp.estimatedHours) : f.estimatedValue),
        }));
        if (jp.estimatedUnit) setSelectedUnit(jp.estimatedUnit);
      })
      .catch(() => {});
  }, [fromJobId]);

  // Derived
  const isFromJob = !!fromJobId && !!jobPost;
  const currentOption = DURATION_OPTIONS.find((o) => o.unit === selectedUnit);
  const lockedRate = isFromJob
    ? jobPost?.budget || 0
    : worker && currentOption
      ? worker[currentOption.rateKey] || 0
      : 0;
  const lockedCurrency = isFromJob
    ? jobPost?.currency || "USD"
    : worker?.currency || "USD";
  const availableUnits = worker
    ? DURATION_OPTIONS.filter((o) =>
        o.rateKey === "customRate"
          ? worker.customRate > 0
          : worker[o.rateKey] > 0,
      )
    : [];
  const finalRate =
    isNegotiated && negotiatedRate ? parseFloat(negotiatedRate) : lockedRate;
  const estQty = parseFloat(form.estimatedValue) || 1;

  let estFees = null;
  if (selectedUnit === "custom") {
    const customRate = form.rate || worker?.customRate || 0;
    const customQty = form.quantity || 1;
    if (customRate > 0)
      estFees = computeFees(customRate, customQty, lockedCurrency);
  } else if (
    lockedRate > 0 &&
    form.estimatedValue &&
    currentOption?.inputType === "number"
  ) {
    estFees = computeFees(finalRate, estQty, lockedCurrency);
  }

  const set = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));
    setError("");
  };

  // ── Date/Time picker handlers ─────────────────────────────────
  const handleDateChange = (event, selectedDate) => {
    // On Android, always close after selection (even on dismiss)
    if (Platform.OS !== "ios") setShowDatePicker(false);
    if (event.type === "dismissed") return;
    if (selectedDate) {
      const current = form.scheduledAt
        ? new Date(form.scheduledAt)
        : new Date(Date.now() + 3600 * 1000);
      current.setFullYear(selectedDate.getFullYear());
      current.setMonth(selectedDate.getMonth());
      current.setDate(selectedDate.getDate());
      // ISO slice for local timezone (not UTC)
      const pad = (n) => String(n).padStart(2, "0");
      const str = `${current.getFullYear()}-${pad(
        current.getMonth() + 1,
      )}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(
        current.getMinutes(),
      )}`;
      set("scheduledAt", str);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS !== "ios") setShowTimePicker(false);
    if (event.type === "dismissed") return;
    if (selectedTime) {
      const current = form.scheduledAt
        ? new Date(form.scheduledAt)
        : new Date(Date.now() + 3600 * 1000);
      current.setHours(selectedTime.getHours());
      current.setMinutes(selectedTime.getMinutes());
      const pad = (n) => String(n).padStart(2, "0");
      const str = `${current.getFullYear()}-${pad(
        current.getMonth() + 1,
      )}-${pad(current.getDate())}T${pad(current.getHours())}:${pad(
        current.getMinutes(),
      )}`;
      set("scheduledAt", str);
    }
  };

  const handleSubmit = async () => {
    if (!worker) {
      setError("Please enter a valid Worker ID first.");
      return;
    }
    const required = [
      "workerId",
      "categoryId",
      "title",
      "description",
      ...(locationType !== "REMOTE" ? ["address"] : []),
      "scheduledAt",
    ];
    for (const k of required) {
      if (!form[k]) {
        setError(
          `Please fill in: ${k.replace(/([A-Z])/g, " $1").toLowerCase()}`,
        );
        return;
      }
    }
    if (lockedRate <= 0 && currentOption?.unit !== "custom" && !isNegotiated) {
      setError("This worker has not set a rate for the selected duration.");
      return;
    }
    if (isNegotiated && !negotiatedRate) {
      setError("Please enter the agreed total amount.");
      return;
    }

    setLoading(true);
    try {
      let estimatedHours = null;
      const rawVal = form.estimatedValue
        ? parseFloat(form.estimatedValue)
        : null;
      if (!isNegotiated && rawVal !== null) {
        if (currentOption?.unit === "hours") estimatedHours = rawVal;
        else if (currentOption?.unit === "days") estimatedHours = rawVal * 8;
        else if (currentOption?.unit === "weeks") estimatedHours = rawVal * 40;
        else if (currentOption?.unit === "months")
          estimatedHours = rawVal * 160;
        else if (currentOption?.unit === "years")
          estimatedHours = rawVal * 1920;
      }

      const finalAgreedRate = isNegotiated
        ? parseFloat(negotiatedRate)
        : finalRate;

      let estimatedValueStr = undefined;
      if (isNegotiated) {
        if (selectedUnit === "custom")
          estimatedValueStr = String(form.quantity || 1);
        else
          estimatedValueStr = form.estimatedValue
            ? String(form.estimatedValue)
            : undefined;
      } else if (selectedUnit === "custom") {
        estimatedValueStr = String(form.rate * (form.quantity || 1));
      } else if (form.estimatedValue) {
        estimatedValueStr = String(form.estimatedValue);
      }

      const payload = {
        workerId: form.workerId,
        categoryId: form.categoryId,
        title: form.title,
        description: form.description,
        address: locationType === "REMOTE" ? "Remote" : form.address,
        latitude: form.latitude ? parseFloat(form.latitude) : undefined,
        longitude: form.longitude ? parseFloat(form.longitude) : undefined,
        scheduledAt: form.scheduledAt,
        estimatedHours: estimatedHours ?? undefined,
        estimatedUnit: currentOption?.unit || "hours",
        estimatedValue: estimatedValueStr,
        quantity: selectedUnit === "custom" ? form.quantity || 1 : 1,
        customLabel: form.customLabel || null,
        agreedRate: isNegotiated
          ? parseFloat(negotiatedRate)
          : selectedUnit === "custom"
            ? form.rate
            : finalRate,
        isNegotiated,
        negotiatedRate: isNegotiated ? parseFloat(negotiatedRate) : undefined,
        negotiationNote:
          isNegotiated && negotiationNote ? negotiationNote : undefined,
        currency: lockedCurrency,
        notes: form.notes || undefined,
        jobType: jobType || undefined,
        locationType: locationType || undefined,
        budgetType: budgetType || undefined,
        durationType: durationType || undefined,
        requirements: form.requirements || undefined,
        responsibilities: form.responsibilities || undefined,
      };

      const res = await client.post("/bookings", payload);
      const { booking } = res.data.data;
      navigation.navigate("BookingDetail", { bookingId: booking.id });
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Failed to create booking. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => navigation.navigate("Bookings");
  const onBrowseWorkers = () => navigation.navigate("BrowseWorkers");

  // Restricted
  if (user?.role !== "HIRER") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            gap: 12,
          }}
        >
          <FaClipboardList size={44} color={c.orange} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 20,
              fontWeight: "800",
              color: c.text,
              textAlign: "center",
            }}
          >
            Only Hirers Can Post Jobs
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
          >
            Workers can accept and complete jobs, but only Hirers can post them.
          </AppText>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              {
                marginTop: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: c.orange,
                borderRadius: 10,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: "#000",
              }}
            >
              Back to Bookings
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back */}
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                alignSelf: "flex-start",
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 20,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText
              style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
            >
              Back to Bookings
            </AppText>
          </Pressable>

          {/* Header */}
          <View>
            <AppText
              style={{
                fontFamily: "DMSans_600SemiBold",
                fontSize: 10,
                fontWeight: "700",
                color: c.orange,
                letterSpacing: 1,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              New Job
            </AppText>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 24,
                fontWeight: "800",
                color: c.text,
                letterSpacing: -0.3,
              }}
            >
              Create Booking
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                marginTop: 4,
                lineHeight: 18,
              }}
            >
              Fill in the details and the worker will be notified immediately.
            </AppText>
          </View>

          {/* Worker info + pricing */}
          <BookingWorkerInfo
            propWorkerId={propWorkerId}
            worker={worker}
            workerLoading={workerLoading}
            workerError={workerError}
            selectedUnit={selectedUnit}
            setSelectedUnit={setSelectedUnit}
            availableUnits={availableUnits}
            currentOption={currentOption}
            lockedRate={lockedRate}
            lockedCurrency={lockedCurrency}
            isFromJob={isFromJob}
            isNegotiated={isNegotiated}
            setIsNegotiated={setIsNegotiated}
            negotiatedRate={negotiatedRate}
            setNegotiatedRate={setNegotiatedRate}
            negotiationNote={negotiationNote}
            setNegotiationNote={setNegotiationNote}
            estFees={estFees}
            form={form}
            set={set}
            onBrowseWorkers={onBrowseWorkers}
          />

          {/* Form fields */}
          <BookingFormFields
            worker={worker}
            jobType={jobType}
            setJobType={setJobType}
            locationType={locationType}
            setLocationType={setLocationType}
            budgetType={budgetType}
            setBudgetType={setBudgetType}
            durationType={durationType}
            setDurationType={setDurationType}
            form={form}
            set={set}
            minDate={minDate}
            selectedUnit={selectedUnit}
            isNegotiated={isNegotiated}
            onOpenCategoryPicker={() => setCategoryPickerOpen(true)}
            onOpenDatePicker={() => setShowDatePicker(true)}
            onOpenTimePicker={() => setShowTimePicker(true)}
          />

          {/* Error */}
          {error ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: c.redDim,
                borderWidth: 1,
                borderColor: "rgba(239,68,68,0.2)",
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <FaExclamationTriangle size={14} color={c.red} />
              <AppText style={{ flex: 1, fontSize: 13, color: c.red }}>
                {error}
              </AppText>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={loading || !worker}
            style={({ pressed }) => [
              {
                height: 56,
                backgroundColor: c.orange,
                borderRadius: 999,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: loading || !worker ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {loading ? (
              <>
                <Skeleton width={17} height={17} radius={9} />
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#000",
                  }}
                >
                  Creating booking…
                </AppText>
              </>
            ) : (
              <>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    borderWidth: 2,
                    borderColor: "rgba(0,0,0,0.25)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaPlus size={14} color="#000" />
                </View>
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 16,
                    fontWeight: "800",
                    color: "#000",
                  }}
                >
                  Create Booking
                </AppText>
              </>
            )}
          </Pressable>

          <AppText
            style={{
              fontSize: 11,
              color: c.textMuted,
              textAlign: "center",
              lineHeight: 16,
              paddingHorizontal: 8,
            }}
          >
            The worker will be notified immediately. Payment is only charged
            after the worker accepts and you approve it.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category picker modal */}
      <Modal
        visible={categoryPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            justifyContent: "center",
            padding: 24,
          }}
          onPress={() => setCategoryPickerOpen(false)}
        >
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 8,
              maxHeight: 400,
            }}
          >
            <ScrollView>
              {worker?.categories?.map((wc) => {
                const active = form.categoryId === wc.category.id;
                return (
                  <Pressable
                    key={wc.id}
                    onPress={() => {
                      set("categoryId", wc.category.id);
                      setCategoryPickerOpen(false);
                    }}
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: active
                          ? c.orangeDim
                          : pressed
                            ? c.bgCard
                            : "transparent",
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: active ? "700" : "500",
                        color: active ? c.orange : c.text,
                      }}
                    >
                      {`${wc.category.icon || ""} ${wc.category.name || ""}${
                        wc.isPrimary ? " (Primary)" : ""
                      }`.trim()}
                    </AppText>
                    {active ? <FaCheck size={14} color={c.orange} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Date picker (Android: dialog, iOS: inline spinner) ── */}
      {showDatePicker ? (
        <DateTimePicker
          value={
            form.scheduledAt
              ? new Date(form.scheduledAt)
              : new Date(Date.now() + 3600 * 1000)
          }
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={new Date()}
          onChange={handleDateChange}
        />
      ) : null}

      {/* ── Time picker (Android: dialog, iOS: inline spinner) ── */}
      {showTimePicker ? (
        <DateTimePicker
          value={
            form.scheduledAt
              ? new Date(form.scheduledAt)
              : new Date(Date.now() + 3600 * 1000)
          }
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
          is24Hour={false}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
