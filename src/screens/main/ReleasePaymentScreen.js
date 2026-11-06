// src/screens/main/ReleasePaymentScreen.js

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Image,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaHistory,
  FaLock,
  FaSpinner,
} from "../../icons/fa";

const PRESET_PERCENTAGES = [25, 50, 75, 100];

function formatMoney(amount, currency = "NGN") {
  if (amount == null || isNaN(amount)) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

// ═══════════════════════════════════════════════════════════════════════
// Skeleton Loader
// ═══════════════════════════════════════════════════════════════════════
function SkeletonBlock({ c, height = 16, width = "100%", radius = 8, style }) {
  return (
    <View
      style={[
        {
          height,
          width,
          backgroundColor: c.bgCard,
          borderRadius: radius,
          borderWidth: 1,
          borderColor: c.border,
        },
        style,
      ]}
    />
  );
}

function ReleasePaymentSkeleton({ c }) {
  return (
    <View style={{ gap: 12 }}>
      <SkeletonBlock c={c} height={36} width={140} radius={20} />
      <SkeletonBlock c={c} height={100} radius={16} />
      <SkeletonBlock c={c} height={160} radius={16} />
      <SkeletonBlock c={c} height={220} radius={16} />
      <SkeletonBlock c={c} height={300} radius={16} />
      <SkeletonBlock c={c} height={52} radius={12} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════════════
export default function ReleasePaymentScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;

  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const [note, setNote] = useState("");

  const [mode, setMode] = useState("percent");
  const [selectedPct, setSelectedPct] = useState(100);
  const [customAmount, setCustomAmount] = useState("");

  const [ackChecked, setAckChecked] = useState(false);

  useEffect(() => {
    Promise.all([
      client.get(`/bookings/${bookingId}`),
      client.get(`/payments/${bookingId}`),
    ])
      .then(([bookingRes, paymentRes]) => {
        setBooking(bookingRes.data.data.booking);
        setPayment(paymentRes.data.data);
      })
      .catch(() => setError("Could not load booking or payment details."))
      .finally(() => setLoading(false));
  }, [bookingId]);

  const pay = payment || booking?.payment;
  const currency = pay?.currency || booking?.currency || "NGN";
  const workerPayout = Number(pay?.workerPayout) || 0;
  const releasedAmount = Number(pay?.releasedAmount) || 0;
  const remaining = useMemo(
    () => parseFloat(Math.max(0, workerPayout - releasedAmount).toFixed(2)),
    [workerPayout, releasedAmount],
  );
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;

  const history = Array.isArray(pay?.releases) ? pay.releases : [];
  const hasHistory = history.length > 0;

  const resolvedAmount = useMemo(() => {
    if (remaining <= 0) return 0;
    if (mode === "percent") {
      const raw = (workerPayout * selectedPct) / 100;
      return parseFloat(Math.min(raw, remaining).toFixed(2));
    }
    const parsed = parseFloat(customAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) return 0;
    return parseFloat(Math.min(parsed, remaining).toFixed(2));
  }, [mode, selectedPct, customAmount, workerPayout, remaining]);

  useEffect(() => {
    setAckChecked(false);
  }, [resolvedAmount]);

  const willBeFinal =
    resolvedAmount > 0 &&
    parseFloat((remaining - resolvedAmount).toFixed(2)) === 0;

  const customInvalid =
    mode === "custom" &&
    customAmount !== "" &&
    (isNaN(parseFloat(customAmount)) || parseFloat(customAmount) <= 0);

  const customExceeds =
    mode === "custom" &&
    customAmount !== "" &&
    parseFloat(customAmount) > remaining;

  const canSubmit =
    !releasing &&
    remaining > 0 &&
    resolvedAmount > 0 &&
    resolvedAmount <= remaining &&
    !customInvalid &&
    !customExceeds &&
    ackChecked;

  async function handleRelease() {
    if (!canSubmit) return;
    setReleasing(true);
    setError("");
    try {
      const payload = { amount: resolvedAmount };
      if (note.trim()) payload.note = note.trim();

      const res = await client.post(`/payments/release/${bookingId}`, payload);
      const data = res.data?.data || {};
      setConfirmed({
        amount: data.release?.amount ?? resolvedAmount,
        isFinal: !!data.isFinal,
      });
      setTimeout(() => navigation.goBack(), 2600);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to release payment.");
    } finally {
      setReleasing(false);
    }
  }

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg }}
        edges={["top", "left", "right"]}
      >
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <ReleasePaymentSkeleton c={c} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Success ─────────────────────────────────────────────────────
  if (confirmed) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg }}
        edges={["top", "left", "right"]}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(34,197,94,0.12)",
              borderWidth: 2,
              borderColor: "rgba(34,197,94,0.3)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <FaCheckCircle size={32} color={c.green} />
          </View>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 22,
              fontWeight: "800",
              color: c.text,
              textAlign: "center",
              marginBottom: 8,
            }}
          >
            {confirmed.isFinal
              ? "Payment Fully Released!"
              : "Partial Payment Released!"}
          </AppText>
          <AppText
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 14,
              color: c.textDim,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 8,
            }}
          >
            {formatMoney(confirmed.amount, currency)} has been released to{" "}
            {booking?.worker?.firstName}.
            {!confirmed.isFinal
              ? " The remaining balance is still safely held in escrow."
              : ""}
          </AppText>
          <AppText
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 12,
              color: c.textMuted,
            }}
          >
            Redirecting you back...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── Nothing to release ──────────────────────────────────────────
  if (remaining <= 0) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.bg }}
        edges={["top", "left", "right"]}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 24,
          }}
        >
          <FaLock size={48} color={c.textMuted} style={{ marginBottom: 16 }} />
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 18,
              fontWeight: "800",
              color: c.text,
              marginBottom: 8,
            }}
          >
            Nothing to Release
          </AppText>
          <AppText
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 14,
              color: c.textDim,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            This payment has already been fully released to the worker.
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: 48,
          gap: 12,
          maxWidth: 560,
          alignSelf: "center",
          width: "100%",
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 4,
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
                color: c.textDim,
              }}
            >
              Back to Booking
            </AppText>
          </Pressable>

          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 999,
              backgroundColor: "rgba(34,197,94,0.1)",
              borderWidth: 1,
              borderColor: "rgba(34,197,94,0.2)",
            }}
          >
            <AppText
              style={{
                fontFamily: "DMSans_700Bold",
                fontSize: 11,
                fontWeight: "700",
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: c.green,
              }}
            >
              Release Escrow
            </AppText>
          </View>
        </View>

        {/* Worker card */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 14,
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: c.orangeDim,
                borderWidth: 2,
                borderColor: c.orangeGlow,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {booking?.worker?.avatar ? (
                <Image
                  source={{ uri: booking.worker.avatar }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 16,
                    fontWeight: "800",
                    color: c.orange,
                  }}
                >
                  {booking?.worker?.firstName?.[0]}
                  {booking?.worker?.lastName?.[0]}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 11,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  color: c.textMuted,
                  marginBottom: 4,
                }}
              >
                Releasing payment to
              </AppText>
              <AppText
                style={{
                  fontFamily: "Syne_700Bold",
                  fontSize: 18,
                  fontWeight: "800",
                  color: c.text,
                  lineHeight: 22,
                  marginBottom: 3,
                }}
                numberOfLines={2}
              >
                {booking?.worker?.firstName} {booking?.worker?.lastName}
              </AppText>
              <AppText
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.orange,
                }}
                numberOfLines={1}
              >
                {booking?.title}
              </AppText>
            </View>
          </View>
        </View>

        {/* Release history (only if any) */}
        {hasHistory ? (
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 12,
              }}
            >
              <FaHistory size={11} color={c.textMuted} />
              <AppText
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 11,
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                  color: c.textMuted,
                }}
              >
                Release History
              </AppText>
            </View>

            <View style={{ gap: 10 }}>
              {history.map((r) => (
                <View
                  key={r.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <AppText
                    style={{
                      fontFamily: "DMSans_400Regular",
                      fontSize: 13,
                      color: c.textDim,
                      flex: 1,
                    }}
                    numberOfLines={2}
                  >
                    {new Date(r.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    ·{" "}
                    {new Date(r.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {r.note ? ` · ${r.note}` : ""}
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: "DMSans_700Bold",
                      fontSize: 13,
                      fontWeight: "600",
                      color: c.text,
                    }}
                  >
                    {formatMoney(r.amount, currency)}
                  </AppText>
                </View>
              ))}

              <View
                style={{
                  height: 1,
                  backgroundColor: c.border,
                  marginVertical: 4,
                }}
              />

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <AppText
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 13,
                    color: c.textDim,
                  }}
                >
                  Already released
                </AppText>
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.text,
                  }}
                >
                  {formatMoney(releasedAmount, currency)} ({releasedPct}%)
                </AppText>
              </View>
            </View>
          </View>
        ) : null}

        {/* Escrow summary */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <AppText
            style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: c.textMuted,
              marginBottom: 14,
            }}
          >
            Escrow Summary
          </AppText>

          <View style={{ gap: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppText
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 13,
                  color: c.textDim,
                }}
              >
                Total Paid
              </AppText>
              <AppText
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.text,
                }}
              >
                {formatMoney(pay?.amount, currency)}
              </AppText>
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppText
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 13,
                  color: c.textDim,
                }}
              >
                Platform Fee
              </AppText>
              <AppText
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 13,
                  fontWeight: "600",
                  color: c.text,
                }}
              >
                {formatMoney(pay?.platformFee, currency)}
              </AppText>
            </View>

            {pay?.referralDeduct > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <AppText
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 13,
                    color: c.green,
                  }}
                >
                  Referral Discount
                </AppText>
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.green,
                  }}
                >
                  - {formatMoney(pay.referralDeduct, currency)}
                </AppText>
              </View>
            ) : null}

            {releasedAmount > 0 ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <AppText
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 13,
                    color: c.orange,
                  }}
                >
                  Already released
                </AppText>
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.orange,
                  }}
                >
                  - {formatMoney(releasedAmount, currency)}
                </AppText>
              </View>
            ) : null}

            <View
              style={{
                height: 1,
                backgroundColor: c.border,
                marginVertical: 4,
              }}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppText
                style={{
                  fontFamily: "DMSans_700Bold",
                  fontSize: 14,
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                Remaining in Escrow
              </AppText>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 18,
                  fontWeight: "800",
                  color: c.green,
                }}
              >
                {formatMoney(remaining, currency)}
              </AppText>
            </View>
          </View>
        </View>

        {/* Amount picker */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <AppText
            style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: c.textMuted,
              marginBottom: 14,
            }}
          >
            Choose Release Amount
          </AppText>

          {/* Preset pills - 2 Column Grid */}
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {PRESET_PERCENTAGES.map((pct) => {
              const pctAmount = parseFloat(
                Math.min((workerPayout * pct) / 100, remaining).toFixed(2),
              );
              const isActive = mode === "percent" && selectedPct === pct;
              return (
                <Pressable
                  key={pct}
                  onPress={() => {
                    setMode("percent");
                    setSelectedPct(pct);
                  }}
                  style={({ pressed }) => [
                    {
                      width: "48%",
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      backgroundColor: isActive ? c.orangeDim : c.bgInput,
                      borderColor: isActive ? c.orange : c.border,
                      alignItems: "center",
                      gap: 4,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontFamily: "Syne_800ExtraBold",
                      fontSize: 18,
                      fontWeight: "800",
                      color: c.orange,
                    }}
                  >
                    {pct}%
                  </AppText>
                  <AppText
                    style={{
                      fontFamily: "DMSans_700Bold",
                      fontSize: 11,
                      fontWeight: "600",
                      color: isActive ? c.orange : c.textDim,
                    }}
                    numberOfLines={1}
                  >
                    {formatMoney(pctAmount, currency)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Custom amount */}
          <AppText
            style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1,
              color: c.textMuted,
              marginBottom: 8,
            }}
          >
            Or enter a custom amount
          </AppText>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              borderWidth: 1,
              borderColor:
                customExceeds || customInvalid
                  ? c.red
                  : mode === "custom"
                    ? c.orange
                    : c.border,
              borderRadius: 10,
              backgroundColor: c.bgInput,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <TextInput
              value={customAmount}
              onChangeText={(v) => {
                setCustomAmount(v);
                setMode("custom");
              }}
              onFocus={() => setMode("custom")}
              placeholder="e.g. 5000"
              placeholderTextColor={c.textMuted}
              keyboardType="numeric"
              style={{
                flex: 1,
                backgroundColor: "transparent",
                borderWidth: 0,
                color: c.text,
                fontFamily: "DMSans_700Bold",
                fontSize: 16,
                fontWeight: "700",
                paddingVertical: 8,
              }}
            />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 13,
                fontWeight: "800",
                color: c.orange,
                letterSpacing: 0.4,
              }}
            >
              {currency}
            </AppText>
          </View>

          {customExceeds ? (
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 12,
                color: c.red,
                marginTop: 6,
              }}
            >
              Amount exceeds the remaining escrow (
              {formatMoney(remaining, currency)}).
            </AppText>
          ) : null}
          {customInvalid ? (
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 12,
                color: c.red,
                marginTop: 6,
              }}
            >
              Enter a positive amount.
            </AppText>
          ) : null}
          {!customExceeds && !customInvalid && mode === "custom" ? (
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 12,
                color: c.textMuted,
                marginTop: 6,
              }}
            >
              Must not exceed {formatMoney(remaining, currency)}.
            </AppText>
          ) : null}

          {/* Live preview */}
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: c.border,
              borderStyle: "dashed",
              paddingTop: 14,
              marginTop: 14,
              gap: 8,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppText
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 13,
                  color: c.textDim,
                }}
              >
                Releasing now
              </AppText>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                {resolvedAmount > 0
                  ? formatMoney(resolvedAmount, currency)
                  : "—"}
              </AppText>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <AppText
                style={{
                  fontFamily: "DMSans_400Regular",
                  fontSize: 13,
                  color: c.textDim,
                }}
              >
                Remaining after this release
              </AppText>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                {formatMoney(Math.max(0, remaining - resolvedAmount), currency)}
              </AppText>
            </View>

            {willBeFinal ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  padding: 10,
                  backgroundColor: c.greenDim,
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.3)",
                  borderRadius: 8,
                  marginTop: 4,
                }}
              >
                <FaCheckCircle size={12} color={c.green} />
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 12,
                    fontWeight: "600",
                    color: c.green,
                    flex: 1,
                  }}
                >
                  This will complete the payment in full.
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Optional note */}
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <AppText
            style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 11,
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              color: c.textMuted,
              marginBottom: 10,
            }}
          >
            Note (optional)
          </AppText>
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={200}
            placeholder="e.g. Emergency medical"
            placeholderTextColor={c.textMuted}
            style={{
              backgroundColor: c.bgInput,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 9,
              paddingHorizontal: 14,
              paddingVertical: 11,
              color: c.text,
              fontFamily: "DMSans_400Regular",
              fontSize: 14,
            }}
          />
        </View>

        {/* Disclaimer */}
        <View
          style={{
            backgroundColor: "rgba(249,115,22,0.05)",
            borderWidth: 1,
            borderColor: "rgba(249,115,22,0.25)",
            borderRadius: 14,
            padding: 18,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <FaLock size={14} color={c.orange} />
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 14,
                fontWeight: "800",
                color: c.text,
                flex: 1,
              }}
            >
              Before you release any funds
            </AppText>
          </View>

          {[
            {
              title: "Released money is final.",
              body: (
                <>
                  Once a release is made, that amount goes to{" "}
                  <AppText
                    style={{
                      fontFamily: "DMSans_700Bold",
                      fontWeight: "700",
                      color: c.text,
                    }}
                  >
                    {booking?.worker?.firstName} {booking?.worker?.lastName}
                  </AppText>{" "}
                  immediately. It cannot be reversed, clawed back, or refunded.
                </>
              ),
            },
            {
              title: "Refunds only cover what is still in escrow.",
              body: "If you open a dispute later, you can only be refunded from the portion still held.",
            },
            {
              title: "Partial releases are allowed.",
              body: "If unsure the work is complete, release a portion now and the rest later.",
            },
            {
              title: "Only release for work you have received.",
              body: "Releasing confirms you've seen the work or agreed to the arrangement.",
            },
            {
              title: "Final release closes the booking.",
              body: "When the remaining balance reaches zero, the payment is marked complete.",
            },
          ].map((item, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: idx === 4 ? 0 : 12,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: c.orangeDim,
                  borderWidth: 1,
                  borderColor: c.orangeGlow,
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: 1,
                }}
              >
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 10,
                    fontWeight: "800",
                    color: c.orange,
                  }}
                >
                  {idx + 1}
                </AppText>
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  style={{
                    fontFamily: "DMSans_700Bold",
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.text,
                    marginBottom: 2,
                  }}
                >
                  {item.title}
                </AppText>
                <AppText
                  style={{
                    fontFamily: "DMSans_400Regular",
                    fontSize: 12,
                    color: c.textDim,
                    lineHeight: 18,
                  }}
                >
                  {item.body}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        {/* Error */}
        {error ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              padding: 12,
              backgroundColor: c.redDim,
              borderWidth: 1,
              borderColor: "rgba(239,68,68,0.2)",
              borderRadius: 10,
            }}
          >
            <FaExclamationTriangle size={13} color={c.red} />
            <AppText
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 13,
                color: c.red,
                flex: 1,
              }}
            >
              {error}
            </AppText>
          </View>
        ) : null}

        {/* Acknowledge checkbox */}
        <Pressable
          onPress={() => setAckChecked((v) => !v)}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
              padding: 12,
              backgroundColor: c.bgInput,
              borderWidth: 1,
              borderColor: ackChecked ? c.orange : c.border,
              borderRadius: 10,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 4,
              borderWidth: 1.5,
              borderColor: ackChecked ? c.orange : c.border,
              backgroundColor: ackChecked ? c.orange : "transparent",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            {ackChecked ? <FaCheckCircle size={12} color="#000" /> : null}
          </View>
          <AppText
            style={{
              fontFamily: "DMSans_400Regular",
              fontSize: 13,
              color: c.textDim,
              flex: 1,
              lineHeight: 18,
            }}
          >
            I understand this release is final and non-refundable.
          </AppText>
        </Pressable>

        {/* Submit */}
        <Pressable
          onPress={handleRelease}
          disabled={!canSubmit}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 15,
              borderRadius: 12,
              backgroundColor: canSubmit ? c.green : c.bgCard,
              borderWidth: 1,
              borderColor: canSubmit ? c.green : c.border,
              opacity: !canSubmit ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {releasing ? (
            <>
              <FaSpinner size={14} color={canSubmit ? "#000" : c.textDim} />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 15,
                  fontWeight: "800",
                  color: canSubmit ? "#000" : c.textDim,
                }}
              >
                Releasing...
              </AppText>
            </>
          ) : (
            <>
              <FaMoneyBillWave
                size={14}
                color={canSubmit ? "#000" : c.textDim}
              />
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 15,
                  fontWeight: "800",
                  color: canSubmit ? "#000" : c.textDim,
                }}
              >
                {resolvedAmount > 0
                  ? `Release ${formatMoney(resolvedAmount, currency)} to ${
                      booking?.worker?.firstName || "worker"
                    }`
                  : "Release Payment to Worker"}
              </AppText>
            </>
          )}
        </Pressable>

        <AppText
          style={{
            fontFamily: "DMSans_400Regular",
            fontSize: 12,
            color: c.textMuted,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          {willBeFinal
            ? "This is the final release — the worker receives the full remaining escrow."
            : "Partial releases let you send an advance while keeping the rest in escrow."}
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}
