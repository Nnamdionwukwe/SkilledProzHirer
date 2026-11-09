// src/screens/main/ReleasePaymentScreen.js
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Image,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import api from "../../api/client";

const PRESET_PERCENTAGES = [25, 50, 75, 100];

function formatMoney(amount, currency = "NGN") {
  if (amount == null || isNaN(amount)) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReleasePaymentScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { theme } = useTheme();
  const colors = theme.colors;
  const { width } = useWindowDimensions();
  const isMobile = width <= 640;

  // Data state
  const [booking, setBooking] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(null);

  // Form state
  const [note, setNote] = useState("");
  const [mode, setMode] = useState("percent");
  const [selectedPct, setSelectedPct] = useState(100);
  const [customAmount, setCustomAmount] = useState("");

  // Modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get(`/bookings/${bookingId}`),
      api.get(`/payments/${bookingId}`),
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

      const res = await api.post(`/payments/release/${bookingId}`, payload);
      const data = res.data?.data || {};
      setConfirmed({
        amount: data.release?.amount ?? resolvedAmount,
        isFinal: !!data.isFinal,
      });
      setShowConfirmModal(false);
      setTimeout(() => {
        navigation.navigate("BookingDetail", { id: bookingId });
      }, 2600);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to release payment.");
    } finally {
      setReleasing(false);
    }
  }

  // ── Loading State ──
  if (loading) {
    return (
      <View
        style={[
          styles.page,
          { backgroundColor: colors.bg, justifyContent: "center" },
        ]}
      >
        <View
          style={[
            styles.skCard,
            { backgroundColor: colors.bgPanel, borderColor: colors.border },
          ]}
        />
      </View>
    );
  }

  // ── Success State ──
  if (confirmed) {
    return (
      <View
        style={[
          styles.page,
          { backgroundColor: colors.bg, justifyContent: "center" },
        ]}
      >
        <View style={styles.successWrap}>
          <View
            style={[
              styles.successRing,
              {
                backgroundColor: colors.greenDim,
                borderColor: "rgba(34, 197, 94, 0.3)",
              },
            ]}
          >
            <FontAwesome5 name="check-circle" size={28} color={colors.green} />
          </View>
          <AppText
            weight="displayBlack"
            style={[styles.successTitle, { color: colors.text }]}
          >
            {confirmed.isFinal
              ? "Payment Fully Released!"
              : "Partial Payment Released!"}
          </AppText>
          <AppText style={[styles.successText, { color: colors.textDim }]}>
            {formatMoney(confirmed.amount, currency)} has been released to{" "}
            {booking?.worker?.firstName}.
            {!confirmed.isFinal &&
              " The remaining balance is still safely held in escrow."}
          </AppText>
          <AppText style={[styles.successSub, { color: colors.textMuted }]}>
            Redirecting you back...
          </AppText>
        </View>
      </View>
    );
  }

  // ── Guard: Nothing left ──
  if (remaining <= 0) {
    return (
      <View style={[styles.page, { backgroundColor: colors.bg }]}>
        <ScrollView contentContainerStyle={styles.payWrap}>
          <View style={styles.payHeader}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.backLink}
            >
              <FontAwesome5
                name="arrow-left"
                size={11}
                color={colors.textDim}
                style={{ marginRight: 6 }}
              />
              <AppText style={{ color: colors.textDim, fontSize: 12 }}>
                Back to Booking
              </AppText>
            </Pressable>
          </View>
          <View
            style={[
              styles.breakdownCard,
              { backgroundColor: colors.bgPanel, borderColor: colors.border },
            ]}
          >
            <AppText
              weight="bold"
              style={[styles.breakdownTitle, { color: colors.textMuted }]}
            >
              Nothing to Release
            </AppText>
            <AppText
              style={{ color: colors.textDim, marginTop: 6, fontSize: 12 }}
            >
              This payment has already been fully released to the worker.
            </AppText>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Main Form ──
  return (
    <View style={[styles.page, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.payWrap}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.payHeader}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backLink}
          >
            <FontAwesome5
              name="arrow-left"
              size={11}
              color={colors.textDim}
              style={{ marginRight: 6 }}
            />
            <AppText style={{ color: colors.textDim, fontSize: 12 }}>
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
              weight="bold"
              style={{
                color: colors.green,
                fontSize: 10,
                letterSpacing: 0.08 * 10,
              }}
            >
              Release Escrow
            </AppText>
          </View>
        </View>

        {/* Worker Summary */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: colors.bgPanel, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryTop}>
            <View
              style={[
                styles.workerAvatar,
                {
                  backgroundColor: colors.orangeDim,
                  borderColor: colors.orangeGlow,
                },
              ]}
            >
              {booking?.worker?.avatar ? (
                <Image
                  source={{ uri: booking.worker.avatar }}
                  style={styles.avatarImg}
                />
              ) : (
                <AppText
                  weight="displayBlack"
                  style={{ color: colors.orange, fontSize: 14 }}
                >
                  {booking?.worker?.firstName?.[0]}
                  {booking?.worker?.lastName?.[0]}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <AppText
                weight="semibold"
                style={[styles.summaryLabel, { color: colors.textMuted }]}
              >
                Releasing payment to
              </AppText>
              <AppText
                weight="displayBlack"
                style={[styles.summaryTitle, { color: colors.text }]}
              >
                {booking?.worker?.firstName} {booking?.worker?.lastName}
              </AppText>
              <AppText
                weight="semibold"
                style={[styles.summaryCategory, { color: colors.orange }]}
              >
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
              { backgroundColor: colors.bgPanel, borderColor: colors.border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <FontAwesome5
                name="history"
                size={11}
                color={colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <AppText
                weight="bold"
                style={[
                  styles.breakdownTitle,
                  { color: colors.textMuted, marginBottom: 0 },
                ]}
              >
                Release History
              </AppText>
            </View>
            <View style={styles.breakdownRows}>
              {history.map((r) => (
                <View key={r.id} style={styles.breakdownRow}>
                  <AppText
                    style={[styles.breakdownLabel, { color: colors.textDim }]}
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
                    weight="semibold"
                    style={[styles.breakdownVal, { color: colors.text }]}
                  >
                    {formatMoney(r.amount, currency)}
                  </AppText>
                </View>
              ))}
              <View
                style={[
                  styles.breakdownDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              <View style={styles.breakdownRow}>
                <AppText
                  style={[styles.breakdownLabel, { color: colors.textDim }]}
                >
                  Already released
                </AppText>
                <AppText
                  weight="semibold"
                  style={[styles.breakdownVal, { color: colors.text }]}
                >
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
            { backgroundColor: colors.bgPanel, borderColor: colors.border },
          ]}
        >
          <AppText
            weight="bold"
            style={[styles.breakdownTitle, { color: colors.textMuted }]}
          >
            Escrow Summary
          </AppText>
          <View style={styles.breakdownRows}>
            <View style={styles.breakdownRow}>
              <AppText
                style={[styles.breakdownLabel, { color: colors.textDim }]}
              >
                Total Paid
              </AppText>
              <AppText
                weight="semibold"
                style={[styles.breakdownVal, { color: colors.text }]}
              >
                {formatMoney(pay?.amount, currency)}
              </AppText>
            </View>
            <View style={styles.breakdownRow}>
              <AppText
                style={[styles.breakdownLabel, { color: colors.textDim }]}
              >
                Platform Fee
              </AppText>
              <AppText
                weight="semibold"
                style={[styles.breakdownVal, { color: colors.text }]}
              >
                {formatMoney(pay?.platformFee, currency)}
              </AppText>
            </View>
            {pay?.referralDeduct > 0 && (
              <View style={styles.breakdownRow}>
                <AppText
                  weight="semibold"
                  style={[styles.breakdownLabel, { color: colors.green }]}
                >
                  Referral Discount
                </AppText>
                <AppText
                  weight="semibold"
                  style={[styles.breakdownVal, { color: colors.green }]}
                >
                  - {formatMoney(pay.referralDeduct, currency)}
                </AppText>
              </View>
            )}
            {releasedAmount > 0 && (
              <View style={styles.breakdownRow}>
                <AppText
                  weight="semibold"
                  style={[styles.breakdownLabel, { color: colors.orange }]}
                >
                  Already released
                </AppText>
                <AppText
                  weight="semibold"
                  style={[styles.breakdownVal, { color: colors.orange }]}
                >
                  - {formatMoney(releasedAmount, currency)}
                </AppText>
              </View>
            )}
            <View
              style={[
                styles.breakdownDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <View style={styles.breakdownRow}>
              <AppText
                weight="bold"
                style={[styles.breakdownLabelTotal, { color: colors.text }]}
              >
                Remaining in Escrow
              </AppText>
              <AppText
                weight="displayBlack"
                style={[styles.breakdownValTotal, { color: colors.green }]}
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
            { backgroundColor: colors.bgPanel, borderColor: colors.border },
          ]}
        >
          <AppText
            weight="bold"
            style={[styles.breakdownTitle, { color: colors.textMuted }]}
          >
            Choose Release Amount
          </AppText>

          {/* Preset Pills */}
          <View style={styles.presetRow}>
            {PRESET_PERCENTAGES.map((pct) => {
              const pctAmount = parseFloat(
                Math.min((workerPayout * pct) / 100, remaining).toFixed(2),
              );
              const isActive = mode === "percent" && selectedPct === pct;
              return (
                <Pressable
                  key={pct}
                  style={[
                    styles.presetPill,
                    {
                      backgroundColor: isActive
                        ? colors.orangeDim
                        : colors.bgInput,
                      borderColor: isActive ? colors.orange : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setMode("percent");
                    setSelectedPct(pct);
                  }}
                >
                  <AppText
                    weight="displayBlack"
                    style={[styles.presetPct, { color: colors.orange }]}
                  >
                    {pct}%
                  </AppText>
                  <AppText
                    weight="semibold"
                    style={[styles.presetAmt, { color: colors.textDim }]}
                  >
                    {formatMoney(pctAmount, currency)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Custom Input */}
          <View style={styles.customRow}>
            <AppText
              weight="bold"
              style={[styles.customDivider, { color: colors.textMuted }]}
            >
              or enter a custom amount
            </AppText>
            <View
              style={[
                styles.customInputWrap,
                {
                  backgroundColor: colors.bgInput,
                  borderColor:
                    customInvalid || customExceeds ? colors.red : colors.border,
                },
              ]}
            >
              <TextInput
                keyboardType="decimal-pad"
                placeholder="e.g. 5000"
                placeholderTextColor={colors.textMuted}
                value={customAmount}
                onChangeText={(val) => {
                  setCustomAmount(val);
                  setMode("custom");
                }}
                onFocus={() => setMode("custom")}
                style={[styles.customInput, { color: colors.text }]}
              />
              <AppText
                weight="displayBlack"
                style={[styles.customCurrency, { color: colors.orange }]}
              >
                {currency}
              </AppText>
            </View>
            {customExceeds && (
              <AppText
                weight="semibold"
                style={[styles.customHint, { color: colors.red }]}
              >
                Amount exceeds the remaining escrow (
                {formatMoney(remaining, currency)}).
              </AppText>
            )}
            {customInvalid && (
              <AppText
                weight="semibold"
                style={[styles.customHint, { color: colors.red }]}
              >
                Enter a positive amount.
              </AppText>
            )}
            {!customExceeds && !customInvalid && mode === "custom" && (
              <AppText style={[styles.customHint, { color: colors.textMuted }]}>
                Must not exceed {formatMoney(remaining, currency)}.
              </AppText>
            )}
          </View>

          {/* Live Preview */}
          <View
            style={[styles.releasePreview, { borderTopColor: colors.border }]}
          >
            <View style={styles.releasePreviewRow}>
              <AppText
                style={[styles.releasePreviewLabel, { color: colors.textDim }]}
              >
                Releasing now
              </AppText>
              <AppText
                weight="displayBlack"
                style={[styles.releasePreviewValue, { color: colors.text }]}
              >
                {resolvedAmount > 0
                  ? formatMoney(resolvedAmount, currency)
                  : "—"}
              </AppText>
            </View>
            <View style={styles.releasePreviewRow}>
              <AppText
                style={[styles.releasePreviewLabel, { color: colors.textDim }]}
              >
                Remaining after this release
              </AppText>
              <AppText
                weight="displayBlack"
                style={[styles.releasePreviewValue, { color: colors.text }]}
              >
                {formatMoney(Math.max(0, remaining - resolvedAmount), currency)}
              </AppText>
            </View>
            {willBeFinal && (
              <View
                style={[
                  styles.releaseFinalNote,
                  {
                    backgroundColor: colors.greenDim,
                    borderColor: "rgba(34, 197, 94, 0.3)",
                  },
                ]}
              >
                <FontAwesome5
                  name="check-circle"
                  size={11}
                  color={colors.green}
                  style={{ marginRight: 6 }}
                />
                <AppText
                  weight="semibold"
                  style={{ color: colors.green, fontSize: 11 }}
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
            { backgroundColor: colors.bgPanel, borderColor: colors.border },
          ]}
        >
          <AppText
            weight="bold"
            style={[styles.breakdownTitle, { color: colors.textMuted }]}
          >
            Note (optional)
          </AppText>
          <TextInput
            maxLength={200}
            placeholder="e.g. Emergency medical"
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={setNote}
            style={[
              styles.manualInput,
              {
                backgroundColor: colors.bgInput,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
          />
        </View>

        {/* Pre-release Disclaimer */}
        <View
          style={[
            styles.disclaimerCard,
            {
              borderColor: "rgba(249, 115, 22, 0.25)",
              backgroundColor: "rgba(249, 115, 22, 0.05)",
            },
          ]}
        >
          <View style={styles.disclaimerHeader}>
            <FontAwesome5 name="lock" size={14} color={colors.orange} />
            <AppText
              weight="displayBlack"
              style={[styles.disclaimerTitle, { color: colors.text }]}
            >
              Before you release any funds
            </AppText>
          </View>
          <View style={styles.disclaimerBody}>
            {[
              {
                title: "Released money is final.",
                text: `Once a release is made, that amount goes to ${booking?.worker?.firstName} ${booking?.worker?.lastName} immediately. It cannot be reversed, clawed back, or refunded — not by you, not by support, not by dispute.`,
              },
              {
                title: "Refunds only cover what is still in escrow.",
                text: "If you open a dispute later, you can only be refunded from the portion still held. Any amount you have already released is permanently out of escrow and cannot be refunded.",
              },
              {
                title: "Partial releases are allowed — use them.",
                text: "If you're unsure the work is complete, release only a portion now. You can release the rest later once you're satisfied.",
              },
              {
                title: "Only release for work you have received.",
                text: "Releasing is you confirming you've seen the work or agreed to the arrangement. SkilledProz does not arbitrate already-released funds.",
              },
              {
                title: "Final release closes the booking.",
                text: "When the remaining balance reaches zero, the payment is marked complete and review prompts are sent to both parties.",
              },
            ].map((item, idx) => (
              <View key={idx} style={styles.disclaimerItem}>
                <View
                  style={[
                    styles.disclaimerBullet,
                    {
                      backgroundColor: colors.orangeDim,
                      borderColor: colors.orangeGlow,
                    },
                  ]}
                >
                  <AppText
                    weight="displayBlack"
                    style={{ color: colors.orange, fontSize: 9 }}
                  >
                    {idx + 1}
                  </AppText>
                </View>
                <View style={{ flex: 1 }}>
                  <AppText
                    weight="bold"
                    style={[styles.disclaimerItemTitle, { color: colors.text }]}
                  >
                    {item.title}
                  </AppText>
                  <AppText
                    style={[
                      styles.disclaimerItemText,
                      { color: colors.textDim },
                    ]}
                  >
                    {item.text}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Error */}
        {error ? (
          <View
            style={[
              styles.inlineError,
              {
                backgroundColor: colors.redDim,
                borderColor: "rgba(239, 68, 68, 0.2)",
              },
            ]}
          >
            <FontAwesome5
              name="exclamation-triangle"
              size={12}
              color={colors.red}
              style={{ marginRight: 6 }}
            />
            <AppText
              weight="semibold"
              style={{ color: colors.red, fontSize: 12 }}
            >
              {error}
            </AppText>
          </View>
        ) : null}

        {/* Action Button */}
        <Pressable
          style={({ pressed }) => [
            styles.payBtn,
            { backgroundColor: colors.green, shadowColor: colors.green },
            !canSubmit && { opacity: 0.6 },
            pressed && canSubmit && { transform: [{ scale: 0.98 }] },
          ]}
          onPress={() => setShowConfirmModal(true)}
          disabled={!canSubmit}
        >
          {releasing ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <ActivityIndicator color="#000" size="small" />
              <AppText
                weight="displayBlack"
                style={{ color: "#000", fontSize: 14 }}
              >
                Releasing...
              </AppText>
            </View>
          ) : (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <FontAwesome5 name="money-bill-wave" size={14} color="#000" />
              <AppText
                weight="displayBlack"
                style={{ color: "#000", fontSize: 14 }}
              >
                {resolvedAmount > 0
                  ? `Release ${formatMoney(resolvedAmount, currency)} to ${booking?.worker?.firstName || "worker"}`
                  : "Release Payment to Worker"}
              </AppText>
            </View>
          )}
        </Pressable>

        <AppText style={[styles.payDisclaimer, { color: colors.textMuted }]}>
          {willBeFinal
            ? "This is the final release — the worker receives the full remaining escrow."
            : "Partial releases let you send an advance while keeping the rest in escrow."}
        </AppText>
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => !releasing && setShowConfirmModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.confirmOverlay}
        >
          <Pressable
            style={styles.confirmOverlay}
            onPress={() => !releasing && setShowConfirmModal(false)}
          >
            <Pressable
              style={[
                styles.confirmBox,
                { backgroundColor: colors.bgPanel, borderColor: colors.border },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.confirmIconGreen,
                  {
                    backgroundColor: colors.greenDim,
                    borderColor: "rgba(34, 197, 94, 0.35)",
                  },
                ]}
              >
                <FontAwesome5
                  name="money-bill-wave"
                  size={20}
                  color={colors.green}
                />
              </View>

              <AppText
                weight="displayBlack"
                style={[styles.confirmTitle, { color: colors.text }]}
              >
                {willBeFinal
                  ? "Release the full remaining balance?"
                  : "Release this amount?"}
              </AppText>

              <View
                style={[
                  styles.confirmAmountBlock,
                  {
                    backgroundColor: colors.bgInput,
                    borderColor: colors.border,
                  },
                ]}
              >
                <AppText
                  weight="bold"
                  style={[
                    styles.confirmAmountLabel,
                    { color: colors.textMuted },
                  ]}
                >
                  You are releasing
                </AppText>
                <AppText
                  weight="displayBlack"
                  style={[styles.confirmAmountValue, { color: colors.green }]}
                >
                  {formatMoney(resolvedAmount, currency)}
                </AppText>
                <AppText
                  style={[styles.confirmAmountSub, { color: colors.textDim }]}
                >
                  to {booking?.worker?.firstName} {booking?.worker?.lastName}
                </AppText>
                {note.trim() && (
                  <AppText
                    style={[
                      styles.confirmAmountNote,
                      { color: colors.textMuted },
                    ]}
                  >
                    Note: “{note.trim()}”
                  </AppText>
                )}
              </View>

              <View
                style={[
                  styles.confirmAfterBlock,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.confirmAfterRow}>
                  <AppText style={{ color: colors.textDim, fontSize: 11 }}>
                    Remaining in escrow after this release
                  </AppText>
                  <AppText
                    weight="bold"
                    style={{ color: colors.text, fontSize: 12 }}
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
                    backgroundColor: colors.redDim,
                    borderColor: "rgba(239, 68, 68, 0.25)",
                  },
                ]}
              >
                <FontAwesome5
                  name="exclamation-triangle"
                  size={12}
                  color={colors.red}
                  style={{ marginTop: 1 }}
                />
                <AppText
                  style={{
                    color: colors.red,
                    fontSize: 11,
                    flex: 1,
                    lineHeight: 16,
                  }}
                >
                  Released funds are{" "}
                  <AppText weight="bold" style={{ color: colors.red }}>
                    non-refundable
                  </AppText>
                  . If you dispute this booking later, only what is still in
                  escrow can be recovered.
                </AppText>
              </View>

              <Pressable
                style={[
                  styles.confirmAck,
                  {
                    backgroundColor: colors.bgInput,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setAckChecked(!ackChecked)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      borderColor: ackChecked
                        ? colors.orange
                        : colors.textMuted,
                      backgroundColor: ackChecked
                        ? colors.orange
                        : "transparent",
                    },
                  ]}
                >
                  {ackChecked && (
                    <FontAwesome5 name="check" size={8} color="#fff" />
                  )}
                </View>
                <AppText
                  style={{
                    color: colors.textDim,
                    flex: 1,
                    fontSize: 11,
                    lineHeight: 16,
                  }}
                >
                  I understand this release is final and non-refundable.
                </AppText>
              </Pressable>

              <View style={styles.confirmActions}>
                <Pressable
                  style={[
                    styles.confirmCancelBtn,
                    { borderColor: colors.border },
                  ]}
                  onPress={() => setShowConfirmModal(false)}
                  disabled={releasing}
                >
                  <AppText
                    weight="bold"
                    style={{ color: colors.textDim, fontSize: 12 }}
                  >
                    Cancel
                  </AppText>
                </Pressable>
                <Pressable
                  style={[
                    styles.confirmDangerBtn,
                    {
                      backgroundColor: colors.green,
                      borderColor: colors.green,
                    },
                  ]}
                  onPress={handleRelease}
                  disabled={!ackChecked || releasing}
                >
                  {releasing ? (
                    <ActivityIndicator color="#000" size="small" />
                  ) : (
                    <>
                      <FontAwesome5
                        name="money-bill-wave"
                        size={11}
                        color="#000"
                      />
                      <AppText
                        weight="displayBlack"
                        style={{ color: "#000", fontSize: 12 }}
                      >
                        Release {formatMoney(resolvedAmount, currency)}
                      </AppText>
                    </>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  // Moved content closer to edges (reduced padding from 24 to 16, top from 40 to 24)
  payWrap: {
    padding: 16,
    paddingTop: 24,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
    gap: 12,
  },
  payHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  backLink: { flexDirection: "row", alignItems: "center" },
  payBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  // Reduced card padding from 24 to 16
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  summaryTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  summaryLabel: {
    fontSize: 10,
    letterSpacing: 0.05,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  summaryTitle: { fontSize: 15, marginBottom: 2 },
  summaryCategory: { fontSize: 11 },

  // Reduced card padding from 24 to 16
  breakdownCard: { borderRadius: 12, padding: 16, borderWidth: 1 },
  breakdownTitle: {
    fontSize: 10,
    letterSpacing: 0.08,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  breakdownRows: { gap: 8 },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: { fontSize: 12 },
  breakdownVal: { fontSize: 12 },
  breakdownDivider: { height: 1, marginVertical: 2 },
  breakdownLabelTotal: { fontSize: 13, fontWeight: "700" },
  breakdownValTotal: { fontSize: 15 },

  presetRow: { flexDirection: "row", gap: 6, marginBottom: 12 },
  presetPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
  },
  presetPct: { fontSize: 13 },
  presetAmt: { fontSize: 10 },

  customRow: { marginBottom: 12 },
  customDivider: { fontSize: 10, letterSpacing: 0.08, marginBottom: 6 },
  customInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  customInput: { flex: 1, fontSize: 14, fontWeight: "700", paddingVertical: 6 },
  customCurrency: { fontSize: 12, letterSpacing: 0.04 },
  customHint: { fontSize: 10, marginTop: 4 },

  releasePreview: {
    borderTopWidth: 1,
    borderStyle: "dashed",
    paddingTop: 10,
    marginTop: 4,
  },
  releasePreviewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  releasePreviewLabel: { fontSize: 11.5 },
  releasePreviewValue: { fontSize: 13 },
  releaseFinalNote: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },

  manualInput: {
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 12,
    padding: 10,
    width: "100%",
  },

  disclaimerCard: { borderRadius: 12, padding: 14, borderWidth: 1 },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  disclaimerTitle: { fontSize: 13 },
  disclaimerBody: { gap: 10 },
  disclaimerItem: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  disclaimerBullet: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  disclaimerItemTitle: { fontSize: 11, marginBottom: 2 },
  disclaimerItemText: { fontSize: 10.5, lineHeight: 15 },

  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },

  payBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
  },
  payDisclaimer: { textAlign: "center", fontSize: 10, lineHeight: 14 },
  skCard: {
    width: "100%",
    maxWidth: 520,
    height: 420,
    borderRadius: 16,
    borderWidth: 1,
    opacity: 0.5,
  },

  successWrap: {
    alignItems: "center",
    textAlign: "center",
    padding: 24,
    gap: 12,
    maxWidth: 400,
    alignSelf: "center",
  },
  successRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: 18 },
  successText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  successSub: { fontSize: 11, textAlign: "center" },

  // Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  confirmBox: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
  },
  confirmIconGreen: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 10,
  },
  confirmTitle: { fontSize: 15, marginBottom: 10, textAlign: "center" },
  confirmAmountBlock: {
    width: "100%",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    alignItems: "center",
    marginBottom: 10,
  },
  confirmAmountLabel: { fontSize: 10, letterSpacing: 0.05, marginBottom: 2 },
  confirmAmountValue: { fontSize: 20 },
  confirmAmountSub: { fontSize: 11, marginTop: 4 },
  confirmAmountNote: { fontSize: 10, marginTop: 6, fontStyle: "italic" },
  confirmAfterBlock: {
    width: "100%",
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  confirmAfterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  confirmWarning: {
    width: "100%",
    flexDirection: "row",
    gap: 6,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 10,
  },
  confirmAck: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  // Buttons fixed side-by-side and text sizes reduced
  confirmActions: { flexDirection: "row", gap: 8, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmDangerBtn: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
