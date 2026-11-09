// src/screens/main/ReleaseEscrowScreen.js

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaCheck,
  FaCheckCircle,
  FaExclamationTriangle,
  FaHistory,
  FaLock,
  FaMoneyBillWave,
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

export default function ReleaseEscrowScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const c = theme.colors;

  const bookingId = route.params?.bookingId;

  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);
  const [note, setNote] = useState("");

  // Selection state
  const [mode, setMode] = useState("percent");
  const [selectedPct, setSelectedPct] = useState(100);
  const [customAmount, setCustomAmount] = useState("");

  // Confirmation modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
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

  // Derived values
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

  // Resolve amount
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
    !customExceeds;

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
      setShowConfirmModal(false);
      setTimeout(() => {
        navigation.navigate("BookingDetail", { bookingId });
      }, 2600);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to release payment.");
    } finally {
      setReleasing(false);
    }
  }

  // Loading
  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: c.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </SafeAreaView>
    );
  }

  // Success
  if (confirmed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={styles.successWrap}>
          <View
            style={[
              styles.successRing,
              {
                backgroundColor: "rgba(34, 197, 94, 0.12)",
                borderColor: "rgba(34, 197, 94, 0.3)",
              },
            ]}
          >
            <FaCheckCircle size={32} color="#22c55e" />
          </View>
          <AppText style={[styles.successTitle, { color: c.text }]}>
            {confirmed.isFinal
              ? "Payment Fully Released!"
              : "Partial Payment Released!"}
          </AppText>
          <AppText style={[styles.successText, { color: c.textDim }]}>
            {formatMoney(confirmed.amount, currency)} has been released to{" "}
            {booking?.worker?.firstName}.
            {!confirmed.isFinal && (
              <> The remaining balance is still safely held in escrow.</>
            )}
          </AppText>
          <AppText style={[styles.successSub, { color: c.textMuted }]}>
            Redirecting you back...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  // Guard: nothing left
  if (remaining <= 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <View style={styles.payWrap}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backLink}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ color: c.textDim, marginLeft: 6, fontSize: 13 }}>
              Back to Booking
            </AppText>
          </Pressable>
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.breakdownTitle, { color: c.textMuted }]}>
              Nothing to Release
            </AppText>
            <AppText style={{ color: c.textDim, marginTop: 6 }}>
              This payment has already been fully released to the worker.
            </AppText>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.payWrap}>
          {/* Header */}
          <View style={styles.payHeader}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backLink}
            >
              <FaArrowLeft size={12} color={c.textDim} />
              <AppText
                style={{ color: c.textDim, marginLeft: 6, fontSize: 13 }}
              >
                Back to Booking
              </AppText>
            </Pressable>
            <View
              style={[
                styles.payBadge,
                {
                  backgroundColor: "rgba(34, 197, 94, 0.1)",
                  borderColor: "rgba(34, 197, 94, 0.2)",
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "700",
                  color: "#22c55e",
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Release Escrow
              </AppText>
            </View>
          </View>

          {/* Worker card */}
          <View
            style={[
              styles.summaryCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={styles.summaryTop}>
              <View
                style={[
                  styles.workerAvatar,
                  { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                ]}
              >
                {booking?.worker?.avatar ? (
                  <AppText style={{ color: c.orange }}>IMG</AppText> // Replace with Image component if needed
                ) : (
                  <AppText
                    style={{ fontSize: 16, fontWeight: "800", color: c.orange }}
                  >
                    {booking?.worker?.firstName?.[0]}
                    {booking?.worker?.lastName?.[0]}
                  </AppText>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={[styles.summaryLabel, { color: c.textMuted }]}>
                  Releasing payment to
                </AppText>
                <AppText style={[styles.summaryTitle, { color: c.text }]}>
                  {booking?.worker?.firstName} {booking?.worker?.lastName}
                </AppText>
                <AppText style={[styles.summaryCategory, { color: c.orange }]}>
                  {booking?.title}
                </AppText>
              </View>
            </View>
          </View>

          {/* History */}
          {hasHistory && (
            <View
              style={[
                styles.breakdownCard,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <FaHistory
                  size={12}
                  color={c.textMuted}
                  style={{ marginRight: 6 }}
                />
                <AppText
                  style={[
                    styles.breakdownTitle,
                    { color: c.textMuted, marginBottom: 0 },
                  ]}
                >
                  Release History
                </AppText>
              </View>
              <View style={styles.breakdownRows}>
                {history.map((r) => (
                  <View key={r.id} style={styles.breakdownRow}>
                    <AppText
                      style={[
                        styles.breakdownLabel,
                        { color: c.textDim, flex: 1 },
                      ]}
                      numberOfLines={1}
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
                    <AppText style={[styles.breakdownVal, { color: c.text }]}>
                      {formatMoney(r.amount, currency)}
                    </AppText>
                  </View>
                ))}
                <View
                  style={[
                    styles.breakdownDivider,
                    { backgroundColor: c.border },
                  ]}
                />
                <View style={styles.breakdownRow}>
                  <AppText
                    style={[styles.breakdownLabel, { color: c.textDim }]}
                  >
                    Already released
                  </AppText>
                  <AppText style={[styles.breakdownVal, { color: c.text }]}>
                    {formatMoney(releasedAmount, currency)} ({releasedPct}%)
                  </AppText>
                </View>
              </View>
            </View>
          )}

          {/* Escrow Summary */}
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.breakdownTitle, { color: c.textMuted }]}>
              Escrow Summary
            </AppText>
            <View style={styles.breakdownRows}>
              <View style={styles.breakdownRow}>
                <AppText style={[styles.breakdownLabel, { color: c.textDim }]}>
                  Total Paid
                </AppText>
                <AppText style={[styles.breakdownVal, { color: c.text }]}>
                  {formatMoney(pay?.amount, currency)}
                </AppText>
              </View>
              <View style={styles.breakdownRow}>
                <AppText style={[styles.breakdownLabel, { color: c.textDim }]}>
                  Platform Fee
                </AppText>
                <AppText style={[styles.breakdownVal, { color: c.text }]}>
                  {formatMoney(pay?.platformFee, currency)}
                </AppText>
              </View>
              {pay?.referralDeduct > 0 && (
                <View style={styles.breakdownRow}>
                  <AppText
                    style={[styles.breakdownLabel, { color: "#22c55e" }]}
                  >
                    Referral Discount
                  </AppText>
                  <AppText style={[styles.breakdownVal, { color: "#22c55e" }]}>
                    - {formatMoney(pay.referralDeduct, currency)}
                  </AppText>
                </View>
              )}

              {releasedAmount > 0 && (
                <View style={styles.breakdownRow}>
                  <AppText style={[styles.breakdownLabel, { color: c.orange }]}>
                    Already released
                  </AppText>
                  <AppText style={[styles.breakdownVal, { color: c.orange }]}>
                    - {formatMoney(releasedAmount, currency)}
                  </AppText>
                </View>
              )}

              <View
                style={[styles.breakdownDivider, { backgroundColor: c.border }]}
              />
              <View style={styles.breakdownRow}>
                <AppText
                  style={[styles.breakdownLabelTotal, { color: c.text }]}
                >
                  Remaining in Escrow
                </AppText>
                <AppText
                  style={[styles.breakdownValTotal, { color: "#22c55e" }]}
                >
                  {formatMoney(remaining, currency)}
                </AppText>
              </View>
            </View>
          </View>

          {/* Release Amount Picker */}
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.breakdownTitle, { color: c.textMuted }]}>
              Choose Release Amount
            </AppText>

            {/* Preset pills */}
            <View style={styles.presetRow}>
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
                    style={[
                      styles.presetPill,
                      {
                        borderColor: isActive ? c.orange : c.border,
                        backgroundColor: isActive ? c.orangeDim : c.bgInput,
                      },
                    ]}
                  >
                    <AppText style={[styles.presetPct, { color: c.orange }]}>
                      {pct}%
                    </AppText>
                    <AppText style={[styles.presetAmt, { color: c.textDim }]}>
                      {formatMoney(pctAmount, currency)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Custom Amount */}
            <View style={styles.customRow}>
              <AppText style={[styles.customDivider, { color: c.textMuted }]}>
                or enter a custom amount
              </AppText>
              <View
                style={[
                  styles.customInputWrap,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <TextInput
                  keyboardType="decimal-pad"
                  placeholder="e.g. 5000"
                  placeholderTextColor={c.textMuted}
                  value={customAmount}
                  onChangeText={(val) => {
                    setCustomAmount(val);
                    setMode("custom");
                  }}
                  onFocus={() => setMode("custom")}
                  style={[
                    styles.customInput,
                    { color: customInvalid || customExceeds ? c.red : c.text },
                  ]}
                />
                <AppText style={[styles.customCurrency, { color: c.orange }]}>
                  {currency}
                </AppText>
              </View>
              {customExceeds && (
                <AppText style={[styles.customHint, { color: c.red }]}>
                  Amount exceeds the remaining escrow (
                  {formatMoney(remaining, currency)}).
                </AppText>
              )}
              {customInvalid && (
                <AppText style={[styles.customHint, { color: c.red }]}>
                  Enter a positive amount.
                </AppText>
              )}
              {!customExceeds && !customInvalid && mode === "custom" && (
                <AppText style={[styles.customHint, { color: c.textMuted }]}>
                  Must not exceed {formatMoney(remaining, currency)}.
                </AppText>
              )}
            </View>

            {/* Live Preview */}
            <View style={[styles.releasePreview, { borderTopColor: c.border }]}>
              <View style={styles.releasePreviewRow}>
                <AppText
                  style={[styles.releasePreviewLabel, { color: c.textDim }]}
                >
                  Releasing now
                </AppText>
                <AppText
                  style={[styles.releasePreviewValue, { color: c.text }]}
                >
                  {resolvedAmount > 0
                    ? formatMoney(resolvedAmount, currency)
                    : "—"}
                </AppText>
              </View>
              <View style={styles.releasePreviewRow}>
                <AppText
                  style={[styles.releasePreviewLabel, { color: c.textDim }]}
                >
                  Remaining after this release
                </AppText>
                <AppText
                  style={[styles.releasePreviewValue, { color: c.text }]}
                >
                  {formatMoney(
                    Math.max(0, remaining - resolvedAmount),
                    currency,
                  )}
                </AppText>
              </View>
              {willBeFinal && (
                <View
                  style={[
                    styles.releaseFinalNote,
                    {
                      backgroundColor: "rgba(34,197,94,0.1)",
                      borderColor: "rgba(34,197,94,0.3)",
                    },
                  ]}
                >
                  <FaCheckCircle
                    size={12}
                    color="#22c55e"
                    style={{ marginRight: 6 }}
                  />
                  <AppText
                    style={{
                      color: "#22c55e",
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    This will complete the payment in full.
                  </AppText>
                </View>
              )}
            </View>
          </View>

          {/* Optional Note */}
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText style={[styles.breakdownTitle, { color: c.textMuted }]}>
              Note (optional)
            </AppText>
            <TextInput
              placeholder="e.g. Emergency medical"
              placeholderTextColor={c.textMuted}
              value={note}
              onChangeText={setNote}
              maxLength={200}
              style={[
                styles.customInput,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                  borderWidth: 1,
                  borderRadius: 9,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                },
              ]}
            />
          </View>

          {/* Disclaimer */}
          <View
            style={[
              styles.disclaimerCard,
              {
                backgroundColor: "rgba(249, 115, 22, 0.05)",
                borderColor: "rgba(249, 115, 22, 0.25)",
              },
            ]}
          >
            <View style={styles.disclaimerHeader}>
              <FaLock size={16} color={c.orange} />
              <AppText style={[styles.disclaimerTitle, { color: c.text }]}>
                Before you release any funds
              </AppText>
            </View>

            <View style={styles.disclaimerBody}>
              <View style={styles.disclaimerItem}>
                <View
                  style={[
                    styles.disclaimerBullet,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 11, fontWeight: "800", color: c.orange }}
                  >
                    1
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={[styles.disclaimerItemTitle, { color: c.text }]}
                  >
                    Released money is final.
                  </AppText>
                  <AppText
                    style={[styles.disclaimerItemText, { color: c.textDim }]}
                  >
                    Once a release is made, that amount goes to{" "}
                    <AppText style={{ fontWeight: "700", color: c.text }}>
                      {booking?.worker?.firstName} {booking?.worker?.lastName}
                    </AppText>{" "}
                    immediately. It cannot be reversed, clawed back, or refunded
                    — not by you, not by support, not by dispute.
                  </AppText>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <View
                  style={[
                    styles.disclaimerBullet,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 11, fontWeight: "800", color: c.orange }}
                  >
                    2
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={[styles.disclaimerItemTitle, { color: c.text }]}
                  >
                    Refunds only cover what is still in escrow.
                  </AppText>
                  <AppText
                    style={[styles.disclaimerItemText, { color: c.textDim }]}
                  >
                    If you open a dispute later, you can only be refunded from
                    the portion still held. Any amount you have already released
                    is permanently out of escrow and cannot be refunded.
                  </AppText>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <View
                  style={[
                    styles.disclaimerBullet,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 11, fontWeight: "800", color: c.orange }}
                  >
                    3
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={[styles.disclaimerItemTitle, { color: c.text }]}
                  >
                    Partial releases are allowed — use them.
                  </AppText>
                  <AppText
                    style={[styles.disclaimerItemText, { color: c.textDim }]}
                  >
                    If you're unsure the work is complete, release only a
                    portion now. You can release the rest later once you're
                    satisfied.
                  </AppText>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <View
                  style={[
                    styles.disclaimerBullet,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 11, fontWeight: "800", color: c.orange }}
                  >
                    4
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={[styles.disclaimerItemTitle, { color: c.text }]}
                  >
                    Only release for work you have received.
                  </AppText>
                  <AppText
                    style={[styles.disclaimerItemText, { color: c.textDim }]}
                  >
                    Releasing is you confirming you've seen the work or agreed
                    to the arrangement. SkilledProz does not arbitrate
                    already-released funds.
                  </AppText>
                </View>
              </View>

              <View style={styles.disclaimerItem}>
                <View
                  style={[
                    styles.disclaimerBullet,
                    { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 11, fontWeight: "800", color: c.orange }}
                  >
                    5
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    style={[styles.disclaimerItemTitle, { color: c.text }]}
                  >
                    Final release closes the booking.
                  </AppText>
                  <AppText
                    style={[styles.disclaimerItemText, { color: c.textDim }]}
                  >
                    When the remaining balance reaches zero, the payment is
                    marked complete and review prompts are sent to both parties.
                  </AppText>
                </View>
              </View>
            </View>
          </View>

          {error ? (
            <View
              style={[
                styles.inlineError,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.2)",
                },
              ]}
            >
              <FaExclamationTriangle
                size={14}
                color={c.red}
                style={{ marginRight: 6 }}
              />
              <AppText
                style={{
                  color: c.red,
                  flex: 1,
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                {error}
              </AppText>
            </View>
          ) : null}

          <Pressable
            onPress={() => setShowConfirmModal(true)}
            disabled={!canSubmit}
            style={({ pressed }) => [
              styles.payBtn,
              {
                backgroundColor: "#22c55e",
                opacity: !canSubmit ? 0.6 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {releasing ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <ActivityIndicator size="small" color="#fff" />
                <AppText style={styles.payBtnText}>Releasing...</AppText>
              </View>
            ) : (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <FaMoneyBillWave size={16} color="#fff" />
                <AppText style={styles.payBtnText}>
                  {resolvedAmount > 0
                    ? `Release ${formatMoney(resolvedAmount, currency)} to ${booking?.worker?.firstName || "worker"}`
                    : "Release Payment to Worker"}
                </AppText>
              </View>
            )}
          </Pressable>

          <AppText style={[styles.payDisclaimer, { color: c.textMuted }]}>
            {willBeFinal
              ? "This is the final release — the worker receives the full remaining escrow."
              : "Partial releases let you send an advance while keeping the rest in escrow."}
          </AppText>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !releasing && setShowConfirmModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !releasing && setShowConfirmModal(false)}
          />
          <View
            style={[
              styles.confirmBox,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View
              style={[
                styles.confirmIconGreen,
                {
                  backgroundColor: c.greenDim,
                  borderColor: "rgba(34,197,94,0.35)",
                },
              ]}
            >
              <FaMoneyBillWave size={26} color="#22c55e" />
            </View>

            <AppText style={[styles.confirmTitle, { color: c.text }]}>
              {willBeFinal
                ? "Release the full remaining balance?"
                : "Release this amount?"}
            </AppText>

            <View
              style={[
                styles.confirmAmountBlock,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <AppText
                style={[styles.confirmAmountLabel, { color: c.textMuted }]}
              >
                You are releasing
              </AppText>
              <AppText
                style={[styles.confirmAmountValue, { color: "#22c55e" }]}
              >
                {formatMoney(resolvedAmount, currency)}
              </AppText>
              <AppText style={[styles.confirmAmountSub, { color: c.textDim }]}>
                to {booking?.worker?.firstName} {booking?.worker?.lastName}
              </AppText>
              {note.trim() && (
                <AppText
                  style={[styles.confirmAmountNote, { color: c.textMuted }]}
                >
                  Note: “{note.trim()}”
                </AppText>
              )}
            </View>

            <View
              style={[
                styles.confirmAfterBlock,
                { borderBottomColor: c.border },
              ]}
            >
              <View style={styles.confirmAfterRow}>
                <AppText style={{ color: c.textDim, fontSize: 13 }}>
                  Remaining in escrow after this release
                </AppText>
                <AppText
                  style={{ color: c.text, fontWeight: "700", fontSize: 13 }}
                >
                  {formatMoney(
                    Math.max(0, remaining - resolvedAmount),
                    currency,
                  )}
                </AppText>
              </View>
            </View>

            <View
              style={[
                styles.confirmWarning,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.25)",
                },
              ]}
            >
              <FaExclamationTriangle
                size={14}
                color={c.red}
                style={{ marginRight: 6, marginTop: 2, flexShrink: 0 }}
              />
              <AppText style={{ color: c.red, fontSize: 13, lineHeight: 20 }}>
                Released funds are{" "}
                <AppText style={{ fontWeight: "800" }}>non-refundable</AppText>.
                If you dispute this booking later, only what is still in escrow
                can be recovered.
              </AppText>
            </View>

            <Pressable
              style={[
                styles.confirmAck,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
              onPress={() => setAckChecked(!ackChecked)}
            >
              <View
                style={[
                  styles.checkbox,
                  {
                    borderColor: c.border,
                    backgroundColor: ackChecked ? c.orange : "transparent",
                  },
                ]}
              >
                {ackChecked && <FaCheck size={10} color="#fff" />}
              </View>
              <AppText
                style={{
                  color: c.textDim,
                  fontSize: 13,
                  flex: 1,
                  lineHeight: 20,
                }}
              >
                I understand this release is final and non-refundable.
              </AppText>
            </Pressable>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setShowConfirmModal(false)}
                disabled={releasing}
                style={[styles.confirmCancelBtn, { borderColor: c.border }]}
              >
                <AppText
                  style={{ color: c.textDim, fontWeight: "700", fontSize: 15 }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleRelease}
                disabled={!ackChecked || releasing}
                style={[
                  styles.confirmDangerBtn,
                  {
                    backgroundColor: "#22c55e",
                    borderColor: "#22c55e",
                    opacity: !ackChecked || releasing ? 0.5 : 1,
                  },
                ]}
              >
                {releasing ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator size="small" color="#fff" />
                    <AppText
                      style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}
                    >
                      Releasing...
                    </AppText>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FaMoneyBillWave size={14} color="#fff" />
                    <AppText
                      style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}
                    >
                      Release {formatMoney(resolvedAmount, currency)}
                    </AppText>
                  </View>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 40,
  },
  payWrap: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    gap: 16,
  },
  payHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
  },
  payBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
  },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  workerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 2,
  },
  summaryCategory: {
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  breakdownTitle: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
  },
  breakdownRows: {
    gap: 10,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownVal: {
    fontSize: 13,
    fontWeight: "600",
  },
  breakdownDivider: {
    height: 1,
    marginVertical: 4,
  },
  breakdownLabelTotal: {
    fontSize: 14,
    fontWeight: "700",
  },
  breakdownValTotal: {
    fontSize: 18,
    fontWeight: "800",
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    flexBasis: "48%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetPct: {
    fontSize: 16,
    fontWeight: "800",
  },
  presetAmt: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  customRow: {
    marginBottom: 16,
  },
  customDivider: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  customInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  customInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    height: "100%",
  },
  customCurrency: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  customHint: {
    fontSize: 11,
    marginTop: 6,
  },
  releasePreview: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    paddingTop: 14,
    marginTop: 6,
  },
  releasePreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  releasePreviewLabel: {
    fontSize: 13,
  },
  releasePreviewValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  releaseFinalNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  disclaimerCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  disclaimerTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  disclaimerBody: {
    gap: 12,
  },
  disclaimerItem: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  disclaimerBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  disclaimerItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 2,
  },
  disclaimerItemText: {
    fontSize: 12,
    lineHeight: 18,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  payBtn: {
    width: "100%",
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  payBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  payDisclaimer: {
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
  },
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  successRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  successText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  successSub: {
    fontSize: 12,
    marginTop: 8,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmBox: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  confirmIconGreen: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 16,
  },
  confirmAmountBlock: {
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  confirmAmountLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  confirmAmountValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  confirmAmountSub: {
    fontSize: 13,
    marginTop: 6,
  },
  confirmAmountNote: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 8,
    textAlign: "center",
  },
  confirmAfterBlock: {
    width: "100%",
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  confirmAfterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  confirmAck: {
    flexDirection: "row",
    alignItems: "flex-start",
    width: "100%",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  confirmActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDangerBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
