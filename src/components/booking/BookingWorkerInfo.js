// src/components/booking/BookingWorkerInfo.js
//
// Port of pages/bookings/CreateBooking/BookingWorkerInfo.jsx.
// Identical to the previous version — no changes here.

import { useState, useEffect } from "react";
import { Image, Pressable, TextInput, View } from "react-native";

import AppText from "../AppText";
import Skeleton from "../Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { getHirerFeeRate } from "../../utils/pricing";
import {
  FaShieldCheck,
  FaCheck,
  FaHandshake,
  FaLock,
  FaStar,
  FaMapPin,
  FaCommentDots,
  FaCalendarAlt,
  FaClock,
  FaExclamationTriangle,
} from "../../icons/fa";

const CURRENCY_SYMBOLS = {
  NGN: "₦",
  USD: "$",
  EUR: "€",
  GBP: "£",
  USDC: "USDC",
  USDT: "USDT",
};

function formatPrice(amount, currency = "NGN") {
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  const num = Number(amount) || 0;
  return `${symbol}${num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

const DURATION_OPTIONS = [
  {
    unit: "hours",
    label: "Hourly",
    rateKey: "hourlyRate",
    suffix: "/hr",
    inputLabel: "Hours",
  },
  {
    unit: "days",
    label: "Daily",
    rateKey: "dailyRate",
    suffix: "/day",
    inputLabel: "Days",
  },
  {
    unit: "weeks",
    label: "Weekly",
    rateKey: "weeklyRate",
    suffix: "/wk",
    inputLabel: "Weeks",
  },
  {
    unit: "months",
    label: "Monthly",
    rateKey: "monthlyRate",
    suffix: "/mo",
    inputLabel: "Months",
  },
  {
    unit: "years",
    label: "Yearly",
    rateKey: "yearlyRate",
    suffix: "/yr",
    inputLabel: "Years",
  },
  {
    unit: "custom",
    label: "Custom",
    rateKey: "customRate",
    suffix: "",
    inputLabel: "Description",
  },
];

export default function BookingWorkerInfo({
  propWorkerId,
  worker,
  workerLoading,
  workerError,
  selectedUnit,
  setSelectedUnit,
  availableUnits,
  currentOption,
  lockedRate,
  lockedCurrency,
  isFromJob,
  isNegotiated,
  setIsNegotiated,
  negotiatedRate,
  setNegotiatedRate,
  negotiationNote,
  setNegotiationNote,
  estFees,
  form,
  set,
  onBrowseWorkers,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const format = (amount) => formatPrice(amount, lockedCurrency);
  const currencySymbol = CURRENCY_SYMBOLS[lockedCurrency] || lockedCurrency;
  const feeRate = getHirerFeeRate(lockedCurrency);
  const feePercent = Math.round(feeRate * 100);

  const [quantityInput, setQuantityInput] = useState(
    String(form.quantity || 1),
  );

  useEffect(() => {
    setQuantityInput(String(form.quantity || 1));
  }, [form.quantity]);

  const effectiveTotal = (() => {
    if (isNegotiated && negotiatedRate) return parseFloat(negotiatedRate);
    if (selectedUnit === "custom") {
      const customRate = form.rate || worker?.customRate || 0;
      const customQty = form.quantity || 1;
      return customRate * customQty;
    }
    if (estFees) return estFees.subtotal;
    return 0;
  })();

  return (
    <>
      {/* Worker ID input */}
      {!propWorkerId ? (
        <View style={fieldset(c)}>
          <AppText style={legend(c)}>WORKER</AppText>
          <View style={{ gap: 6 }}>
            <AppText style={label(c)}>
              Worker ID <AppText style={{ color: c.orange }}>*</AppText>
            </AppText>
            <TextInput
              value={form.workerId}
              onChangeText={(t) => set("workerId", t)}
              placeholder="Paste the worker's user ID"
              placeholderTextColor={c.textMuted}
              style={input(c)}
            />
            <AppText style={{ fontSize: 11, color: c.textMuted }}>
              Browse workers and copy their ID.{" "}
              <AppText
                onPress={onBrowseWorkers}
                style={{ color: c.orange, textDecorationLine: "underline" }}
              >
                Browse Workers →
              </AppText>
            </AppText>
          </View>
        </View>
      ) : null}

      {/* Worker loading skeleton */}
      {workerLoading ? (
        <View
          style={{
            flexDirection: "row",
            gap: 14,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 16,
          }}
        >
          <Skeleton width={52} height={52} radius={26} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={14} radius={4} />
            <Skeleton width="40%" height={12} radius={4} />
          </View>
        </View>
      ) : null}

      {/* Worker error */}
      {workerError ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: c.redDim,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
            borderRadius: 12,
            padding: 14,
          }}
        >
          <FaExclamationTriangle size={14} color={c.red} />
          <AppText style={{ flex: 1, fontSize: 13, color: c.red }}>
            {workerError}
          </AppText>
        </View>
      ) : null}

      {/* Worker card */}
      {worker && !workerLoading ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            gap: 12,
            backgroundColor: c.bgCard,
            borderWidth: 1.5,
            borderColor: c.orangeGlow,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: c.orangeDim,
              borderWidth: 2,
              borderColor: c.orange,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {worker.user?.avatar ? (
              <Image
                source={{ uri: worker.user.avatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AppText
                style={{ fontSize: 16, fontWeight: "700", color: c.orange }}
              >
                {`${worker.user?.firstName?.[0] || ""}${
                  worker.user?.lastName?.[0] || ""
                }`.toUpperCase() || "?"}
              </AppText>
            )}
            {worker.isAvailable ? (
              <View
                style={{
                  position: "absolute",
                  bottom: 1,
                  right: 1,
                  width: 11,
                  height: 11,
                  borderRadius: 6,
                  backgroundColor: c.green,
                  borderWidth: 2,
                  borderColor: c.bgPanel,
                }}
              />
            ) : null}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <AppText
                numberOfLines={1}
                style={{ fontSize: 14, fontWeight: "700", color: c.text }}
              >
                {`${worker.user?.firstName || ""} ${
                  worker.user?.lastName || ""
                }`.trim() || "Worker"}
              </AppText>
              {worker.verificationStatus === "VERIFIED" ? (
                <FaShieldCheck size={14} color={c.green} />
              ) : null}
            </View>
            {worker.title ? (
              <AppText
                numberOfLines={1}
                style={{ fontSize: 12, color: c.textDim, marginTop: 2 }}
              >
                {worker.title}
              </AppText>
            ) : null}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 6,
              }}
            >
              {worker.avgRating > 0 ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <FaStar size={11} color={c.orange} />
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    {worker.avgRating.toFixed(1)} ({worker.totalReviews})
                  </AppText>
                </View>
              ) : null}
              {worker.user?.city || worker.user?.country ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <FaMapPin size={11} color={c.textMuted} />
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    {[worker.user?.city, worker.user?.country]
                      .filter(Boolean)
                      .join(", ")}
                  </AppText>
                </View>
              ) : null}
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
              >
                <FaCheck size={11} color={c.textMuted} />
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  {worker.completedJobs || 0} jobs done
                </AppText>
              </View>
            </View>
            {worker.categories?.length > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 4,
                  marginTop: 6,
                }}
              >
                {worker.categories.map((wc) => (
                  <View
                    key={wc.id}
                    style={{
                      backgroundColor: c.orangeDim,
                      borderWidth: 1,
                      borderColor: c.orangeGlow,
                      borderRadius: 100,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        fontWeight: "600",
                        color: c.orange,
                      }}
                    >
                      {`${wc.category.icon || ""} ${
                        wc.category.name || ""
                      }`.trim()}
                    </AppText>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Pricing & Duration */}
      {worker ? (
        <View style={fieldset(c)}>
          <AppText style={legend(c)}>PRICING & DURATION</AppText>

          {isFromJob ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <RateBox label="Agreed Budget (from job)" c={c}>
                  {format(lockedRate)}
                </RateBox>
              </View>
              <View style={{ flex: 1 }}>
                <RateBox label="Currency" c={c}>
                  {lockedCurrency}
                </RateBox>
              </View>
            </View>
          ) : (
            <>
              <View style={{ gap: 8 }}>
                <AppText style={label(c)}>
                  Engagement Type{" "}
                  <AppText style={{ color: c.orange }}>*</AppText>
                </AppText>
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, lineHeight: 15 }}
                >
                  Select how you want to engage this worker. The rate is set by
                  the worker and cannot be modified.
                </AppText>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {(availableUnits.length > 0
                    ? availableUnits
                    : [DURATION_OPTIONS[0]]
                  ).map((opt) => {
                    const rate = worker[opt.rateKey];
                    const hasRate = rate > 0;
                    const active = selectedUnit === opt.unit;
                    return (
                      <Pressable
                        key={opt.unit}
                        onPress={() => hasRate && setSelectedUnit(opt.unit)}
                        disabled={!hasRate}
                        style={({ pressed }) => [
                          {
                            flexBasis: "48%",
                            flexGrow: 1,
                            paddingHorizontal: 10,
                            paddingVertical: 12,
                            backgroundColor: active ? c.orangeDim : c.bgCard,
                            borderWidth: 1.5,
                            borderColor: active ? c.orange : c.border,
                            borderRadius: 12,
                            alignItems: "center",
                            gap: 3,
                            opacity: !hasRate ? 0.4 : pressed ? 0.85 : 1,
                          },
                        ]}
                      >
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "700",
                            color: active ? c.orange : c.textDim,
                          }}
                        >
                          {opt.label}
                        </AppText>
                        {hasRate ? (
                          <AppText
                            style={{
                              fontSize: 12,
                              fontWeight: "800",
                              color: active ? c.orange : c.text,
                            }}
                          >
                            {`${format(rate)}${opt.suffix}`}
                          </AppText>
                        ) : (
                          <AppText style={{ fontSize: 10, color: c.textMuted }}>
                            Not offered
                          </AppText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <RateBox label="Agreed Rate" c={c}>
                    {isNegotiated && negotiatedRate
                      ? `${format(parseFloat(negotiatedRate))} · Negotiated`
                      : `${format(lockedRate)}${currentOption?.suffix || ""}`}
                  </RateBox>
                </View>
                <View style={{ flex: 1 }}>
                  <RateBox label="Currency" c={c}>
                    {lockedCurrency}
                  </RateBox>
                </View>
              </View>

              {selectedUnit === "custom" ? (
                <View style={{ gap: 12 }}>
                  <View style={{ gap: 6 }}>
                    <AppText style={label(c)}>
                      Rate per {currentOption?.label?.toLowerCase()}{" "}
                      <AppText style={{ color: c.orange }}>*</AppText>
                    </AppText>
                    <View style={inputWrap(c)}>
                      <AppText style={{ fontSize: 14, color: c.textMuted }}>
                        {currencySymbol}
                      </AppText>
                      <TextInput
                        value={String(form.rate || worker.customRate || 0)}
                        editable={false}
                        style={{ flex: 1, fontSize: 14, color: c.text }}
                      />
                      <FaLock size={12} color={c.textMuted} />
                    </View>
                    <AppText style={{ fontSize: 11, color: c.textMuted }}>
                      Rate set by worker — cannot be modified
                    </AppText>
                  </View>

                  <View style={{ gap: 6 }}>
                    <AppText style={label(c)}>Custom Label</AppText>
                    <View
                      style={{
                        backgroundColor: c.bgInput || c.bgCard,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        minHeight: 48,
                      }}
                    >
                      <AppText style={{ fontSize: 13, color: c.text }}>
                        {form.customLabel ||
                          worker.customRateLabel ||
                          "No custom label provided"}
                      </AppText>
                    </View>
                    <AppText style={{ fontSize: 11, color: c.textMuted }}>
                      Label provided by the worker
                    </AppText>
                  </View>

                  <View style={{ gap: 6 }}>
                    <AppText style={label(c)}>
                      Number of {currentOption?.label?.toLowerCase()}{" "}
                      <AppText style={{ color: c.orange }}>*</AppText>
                    </AppText>
                    <TextInput
                      value={quantityInput}
                      onChangeText={(val) => {
                        setQuantityInput(val);
                        if (val === "") return;
                        const num = parseFloat(val);
                        if (!isNaN(num) && num >= 1) set("quantity", num);
                      }}
                      onBlur={() => {
                        if (
                          quantityInput === "" ||
                          parseFloat(quantityInput) < 1
                        ) {
                          setQuantityInput("1");
                          set("quantity", 1);
                        }
                      }}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={c.textMuted}
                      style={input(c)}
                    />
                  </View>
                </View>
              ) : currentOption ? (
                <View style={{ gap: 6 }}>
                  <AppText style={label(c)}>
                    Number of {currentOption.inputLabel}{" "}
                    <AppText style={{ color: c.orange }}>*</AppText>
                  </AppText>
                  <View style={inputWrap(c)}>
                    <FaClock size={14} color={c.textMuted} />
                    <TextInput
                      value={form.estimatedValue}
                      onChangeText={(t) => set("estimatedValue", t)}
                      keyboardType="numeric"
                      placeholder="e.g. 4"
                      placeholderTextColor={c.textMuted}
                      style={{ flex: 1, fontSize: 14, color: c.text }}
                    />
                  </View>
                  {form.estimatedValue ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <FaCalendarAlt size={11} color={c.textDim} />
                      <AppText style={{ fontSize: 11, color: c.textDim }}>
                        {form.estimatedValue}{" "}
                        {currentOption.inputLabel.toLowerCase()}
                        {currentOption.unit !== "hours" ? (
                          <AppText style={{ color: c.textMuted }}>
                            {currentOption.unit === "days"
                              ? ` ≈ ${parseFloat(form.estimatedValue) * 8}h`
                              : currentOption.unit === "weeks"
                                ? ` ≈ ${parseFloat(form.estimatedValue) * 40}h`
                                : currentOption.unit === "months"
                                  ? ` ≈ ${parseFloat(form.estimatedValue) * 160}h`
                                  : currentOption.unit === "years"
                                    ? ` ≈ ${parseFloat(form.estimatedValue) * 1920}h`
                                    : ""}
                          </AppText>
                        ) : null}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </>
          )}

          <View style={{ gap: 10 }}>
            <Pressable
              onPress={() => {
                setIsNegotiated((v) => !v);
                if (isNegotiated) {
                  setNegotiatedRate("");
                  setNegotiationNote("");
                }
              }}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  backgroundColor: isNegotiated
                    ? "rgba(249,115,22,0.06)"
                    : c.bgCard,
                  borderWidth: 1.5,
                  borderColor: isNegotiated ? c.orange : c.border,
                  borderRadius: 14,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isNegotiated ? c.orangeDim : c.bgPanel,
                  borderWidth: 1,
                  borderColor: isNegotiated ? c.orange : c.border,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isNegotiated ? (
                  <FaCheck size={14} color={c.orange} />
                ) : (
                  <FaHandshake size={14} color={c.textDim} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: isNegotiated ? c.orange : c.text,
                  }}
                >
                  {isNegotiated
                    ? "Using negotiated rate"
                    : "We agreed on a different rate"}
                </AppText>
                <AppText
                  style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}
                >
                  {isNegotiated
                    ? "Tap to go back to worker's listed rate"
                    : "Override the worker's listed price with your agreed total amount"}
                </AppText>
              </View>
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: isNegotiated ? c.orange : "transparent",
                  borderWidth: 2,
                  borderColor: isNegotiated ? c.orange : c.border,
                  flexShrink: 0,
                }}
              />
            </Pressable>

            {isNegotiated ? (
              <View
                style={{
                  padding: 14,
                  backgroundColor: "rgba(249,115,22,0.04)",
                  borderWidth: 1,
                  borderColor: c.orangeGlow,
                  borderRadius: 12,
                  gap: 12,
                }}
              >
                <View style={{ gap: 6 }}>
                  <AppText style={label(c)}>
                    Agreed Total Amount{" "}
                    <AppText style={{ color: c.orange }}>*</AppText>
                  </AppText>
                  <View style={inputWrap(c)}>
                    <FaCommentDots size={14} color={c.textMuted} />
                    <TextInput
                      value={negotiatedRate}
                      onChangeText={setNegotiatedRate}
                      keyboardType="numeric"
                      placeholder={format(lockedRate)}
                      placeholderTextColor={c.textMuted}
                      style={{ flex: 1, fontSize: 14, color: c.text }}
                    />
                    <AppText style={{ fontSize: 12, color: c.textMuted }}>
                      {currencySymbol}
                    </AppText>
                  </View>
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    Enter the total agreed amount for the entire job
                  </AppText>
                  {lockedRate > 0 && negotiatedRate ? (
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: c.textDim,
                      }}
                    >
                      {parseFloat(negotiatedRate) < lockedRate
                        ? `🟢 ${format(
                            lockedRate - parseFloat(negotiatedRate),
                          )} below listed rate`
                        : parseFloat(negotiatedRate) > lockedRate
                          ? `🟡 ${format(
                              parseFloat(negotiatedRate) - lockedRate,
                            )} above listed rate`
                          : "✅ Same as listed rate"}
                    </AppText>
                  ) : null}
                </View>

                <View style={{ gap: 6 }}>
                  <AppText style={label(c)}>
                    Negotiation Note (optional)
                  </AppText>
                  <TextInput
                    value={negotiationNote}
                    onChangeText={setNegotiationNote}
                    multiline
                    numberOfLines={2}
                    placeholder="e.g. Agreed 10% discount for repeat booking"
                    placeholderTextColor={c.textMuted}
                    style={{
                      backgroundColor: c.bgInput || c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      fontSize: 13,
                      color: c.text,
                      minHeight: 60,
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 6,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <FaLock size={12} color={c.orange} />
                  <AppText
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: c.textMuted,
                      lineHeight: 16,
                    }}
                  >
                    Make sure the worker agreed to this price in the platform
                    Chat before booking. This replaces all duration calculations
                    with a fixed total of{" "}
                    <AppText style={{ color: c.orange, fontWeight: "700" }}>
                      {negotiatedRate
                        ? format(parseFloat(negotiatedRate))
                        : format(lockedRate)}
                    </AppText>{" "}
                    for this booking.
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>

          <View
            style={{
              backgroundColor: c.bgCard,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 12,
              padding: 14,
              gap: 4,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <AppText
                style={{
                  fontSize: 11,
                  color: c.textMuted,
                  fontWeight: "600",
                }}
              >
                {isNegotiated && negotiatedRate
                  ? "Agreed Total"
                  : "Estimated Total"}
              </AppText>
              {isNegotiated && negotiatedRate ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 3,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: c.greenDim,
                    borderRadius: 100,
                  }}
                >
                  <FaHandshake size={10} color={c.green} />
                  <AppText
                    style={{
                      fontSize: 9,
                      fontWeight: "700",
                      color: c.green,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Negotiated
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 22,
                fontWeight: "900",
                color: c.green,
                letterSpacing: -0.5,
              }}
            >
              {format(effectiveTotal)}
            </AppText>
          </View>

          {!isNegotiated && estFees ? (
            <View
              style={{
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 6,
              }}
            >
              <FeeRow label="Subtotal" value={format(estFees.subtotal)} c={c} />
              <FeeRow
                label={`Platform Fee (${feePercent}%)`}
                value={format(estFees.hirerFee)}
                c={c}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.text }}
                >
                  Total to Pay
                </AppText>
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.green }}
                >
                  {format(estFees.totalToPay)}
                </AppText>
              </View>
            </View>
          ) : null}

          {isNegotiated && negotiatedRate ? (
            <View
              style={{
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 10,
                gap: 6,
              }}
            >
              <FeeRow
                label="Agreed Amount"
                value={format(parseFloat(negotiatedRate))}
                c={c}
              />
              <FeeRow
                label={`Platform Fee (${feePercent}%)`}
                value={format(parseFloat(negotiatedRate) * feeRate)}
                c={c}
              />
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.text }}
                >
                  Total to Pay
                </AppText>
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.green }}
                >
                  {format(parseFloat(negotiatedRate) * (1 + feeRate))}
                </AppText>
              </View>
            </View>
          ) : null}

          {worker.pricingNote ? (
            <View
              style={{
                flexDirection: "row",
                gap: 6,
                backgroundColor: c.bgCard,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
                padding: 12,
              }}
            >
              <FaCommentDots size={12} color={c.orange} />
              <AppText
                style={{
                  flex: 1,
                  fontSize: 11,
                  color: c.textDim,
                  lineHeight: 16,
                }}
              >
                Worker's pricing note:{" "}
                <AppText style={{ fontStyle: "italic" }}>
                  {worker.pricingNote}
                </AppText>
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
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
  marginBottom: 2,
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

const inputWrap = (c) => ({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  backgroundColor: c.bgInput || c.bgCard,
  borderWidth: 1,
  borderColor: c.border,
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 11,
});

function RateBox({ label: lbl, children, c }) {
  return (
    <View
      style={{
        backgroundColor: "rgba(249,115,22,0.06)",
        borderWidth: 1,
        borderColor: c.orangeGlow,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 3,
      }}
    >
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {lbl}
      </AppText>
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 14,
          fontWeight: "800",
          color: c.orange,
        }}
      >
        {children}
      </AppText>
    </View>
  );
}

function FeeRow({ label: lbl, value, c }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <AppText style={{ fontSize: 12, color: c.textDim }}>{lbl}</AppText>
      <AppText style={{ fontSize: 12, color: c.text }}>{value}</AppText>
    </View>
  );
}
