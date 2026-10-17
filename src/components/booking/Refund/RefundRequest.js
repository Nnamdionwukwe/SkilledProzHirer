// src/components/booking/Refund/RefundRequest.js
import React, { useState } from "react";
import { View, TextInput, Pressable, StyleSheet, Modal } from "react-native";
import Slider from "@react-native-community/slider";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaClock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaSpinner,
  FaPercent,
  FaFileInvoice,
} from "../../../icons/fa";

import AppText from "../../AppText";
import { useTheme } from "../../../contexts/ThemeContext";

const formatPrice = (amount, currency = "NGN") => {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const REFUND_TYPES = [
  { value: "FULL", label: "Full Refund", icon: FaMoneyBillWave },
  { value: "PARTIAL", label: "Partial Refund", icon: FaPercent },
  { value: "CUSTOM_AMOUNT", label: "Custom Amount", icon: FaFileInvoice },
];

export default function RefundRequest({
  booking,
  payment,
  onRequestRefund,
  isProcessing,
  isHirer,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [selectedType, setSelectedType] = useState("FULL");
  const [percentage, setPercentage] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  if (!isHirer) return null;

  const isEligible = () => {
    if (!booking.completedAt) return false;
    const hours =
      (Date.now() - new Date(booking.completedAt).getTime()) / 3600000;
    return hours <= 48;
  };

  const getTimeRemaining = () => {
    if (!booking.completedAt) return null;
    const remainingMs =
      48 * 3600000 - (Date.now() - new Date(booking.completedAt).getTime());
    if (remainingMs <= 0) return null;
    const h = Math.floor(remainingMs / 3600000);
    const m = Math.floor((remainingMs % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  const calculateRefundAmount = () => {
    const orig = payment?.amount || booking.agreedRate || 0;
    if (selectedType === "FULL") return orig;
    if (selectedType === "PARTIAL") return (orig * percentage) / 100;
    const amt = parseFloat(customAmount);
    return isNaN(amt) ? 0 : amt;
  };

  const handleSubmit = () => {
    const e = {};
    if (!reason.trim()) e.reason = "Please provide a reason for the refund";
    if (
      selectedType === "CUSTOM_AMOUNT" &&
      (!customAmount || parseFloat(customAmount) <= 0)
    ) {
      e.customAmount = "Please enter a valid amount";
    }
    if (
      selectedType === "CUSTOM_AMOUNT" &&
      parseFloat(customAmount) > (payment?.amount || 0)
    ) {
      e.customAmount = "Amount cannot exceed the original payment";
    }
    if (Object.keys(e).length) return setErrors(e);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const data = {
      bookingId: booking.id,
      paymentId: payment?.id,
      refundType: selectedType,
      reason: reason.trim(),
    };
    if (selectedType === "PARTIAL") data.percentage = percentage;
    if (selectedType === "CUSTOM_AMOUNT")
      data.amount = parseFloat(customAmount);
    onRequestRefund(data);
    setShowConfirm(false);
  };

  const refundAmount = calculateRefundAmount();
  const currency = payment?.currency || booking?.currency || "NGN";
  const timeRemaining = getTimeRemaining();

  if (!isEligible()) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <FaClock size={16} color={c.textMuted} />
          <AppText weight="bold">Refund Unavailable</AppText>
        </View>
        <AppText variant="small" tone="dim">
          Refund requests must be made within 48 hours of booking completion.
        </AppText>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.card,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <FaMoneyBillWave size={16} color={c.orange} />
          <AppText weight="bold" style={{ flex: 1 }}>
            Request Refund
          </AppText>
          {timeRemaining && (
            <View style={[styles.timer, { backgroundColor: c.orangeDim }]}>
              <FaClock size={10} color={c.orange} />
              <AppText
                variant="small"
                style={{ color: c.orange, marginLeft: 4 }}
              >
                {timeRemaining}
              </AppText>
            </View>
          )}
        </View>

        <View style={{ gap: 6, marginBottom: 12 }}>
          <View style={styles.row}>
            <AppText variant="small" tone="dim">
              Booking
            </AppText>
            <AppText variant="small" weight="semibold">
              {booking.title}
            </AppText>
          </View>
          <View style={styles.row}>
            <AppText variant="small" tone="dim">
              Original Amount
            </AppText>
            <AppText variant="small" weight="semibold">
              {formatPrice(
                payment?.amount || booking.agreedRate || 0,
                currency,
              )}
            </AppText>
          </View>
          <View style={styles.row}>
            <AppText variant="small" tone="dim">
              Status
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <FaCheckCircle size={10} color="#22c55e" />
              <AppText
                variant="small"
                style={{ color: "#22c55e", marginLeft: 4 }}
              >
                Eligible
              </AppText>
            </View>
          </View>
        </View>

        <AppText variant="small" tone="dim" style={styles.label}>
          Refund Type
        </AppText>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
          {REFUND_TYPES.map((type) => {
            const Icon = type.icon;
            const active = selectedType === type.value;
            return (
              <Pressable
                key={type.value}
                onPress={() => setSelectedType(type.value)}
                style={[
                  styles.typeBtn,
                  {
                    borderColor: active ? c.orange : c.border,
                    backgroundColor: active ? c.orangeDim : c.bgCard,
                    flex: 1,
                  },
                ]}
              >
                <Icon size={14} color={active ? c.orange : c.textDim} />
                <AppText
                  variant="small"
                  style={{
                    color: active ? c.orange : c.textDim,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {type.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {selectedType === "PARTIAL" && (
          <View style={{ marginBottom: 12 }}>
            <AppText variant="small" tone="dim" style={styles.label}>
              Percentage: {percentage}%
            </AppText>
            <Slider
              minimumValue={1}
              maximumValue={99}
              step={1}
              value={percentage}
              onValueChange={setPercentage}
              minimumTrackTintColor={c.orange}
              maximumTrackTintColor={c.border}
              thumbTintColor={c.orange}
            />
            <View style={styles.row}>
              <AppText variant="small" tone="dim">
                Refund Amount
              </AppText>
              <AppText weight="bold" style={{ color: c.orange }}>
                {formatPrice(refundAmount, currency)}
              </AppText>
            </View>
          </View>
        )}

        {selectedType === "CUSTOM_AMOUNT" && (
          <View style={{ marginBottom: 12 }}>
            <AppText variant="small" tone="dim" style={styles.label}>
              Enter Amount ({currency})
            </AppText>
            <TextInput
              value={customAmount}
              onChangeText={(v) => {
                setCustomAmount(v);
                setErrors({ ...errors, customAmount: null });
              }}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              placeholderTextColor={c.textMuted}
              style={[
                styles.input,
                {
                  backgroundColor: c.bgInput,
                  borderColor: errors.customAmount ? "#ef4444" : c.border,
                  color: c.text,
                },
              ]}
            />
            {errors.customAmount && (
              <AppText
                variant="small"
                style={{ color: "#ef4444", marginTop: 4 }}
              >
                {errors.customAmount}
              </AppText>
            )}
          </View>
        )}

        {selectedType === "FULL" && (
          <View style={[styles.row, { marginBottom: 12 }]}>
            <AppText variant="small" tone="dim">
              Refund Amount
            </AppText>
            <AppText weight="bold" style={{ color: c.orange }}>
              {formatPrice(refundAmount, currency)}
            </AppText>
          </View>
        )}

        <AppText variant="small" tone="dim" style={styles.label}>
          Reason <AppText style={{ color: "#ef4444" }}>*</AppText>
        </AppText>
        <TextInput
          value={reason}
          onChangeText={(v) => {
            setReason(v);
            setErrors({ ...errors, reason: null });
          }}
          multiline
          placeholder="Please explain why you're requesting a refund..."
          placeholderTextColor={c.textMuted}
          style={[
            styles.textarea,
            {
              backgroundColor: c.bgInput,
              borderColor: errors.reason ? "#ef4444" : c.border,
              color: c.text,
            },
          ]}
        />
        {errors.reason && (
          <AppText variant="small" style={{ color: "#ef4444", marginTop: 4 }}>
            {errors.reason}
          </AppText>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={isProcessing}
          style={[
            styles.submitBtn,
            {
              backgroundColor: c.orange,
              opacity: isProcessing ? 0.5 : 1,
              marginTop: 12,
            },
          ]}
        >
          {isProcessing ? <FaSpinner size={11} color={c.bg} /> : null}
          <AppText
            weight="bold"
            style={{ color: c.bg, marginLeft: isProcessing ? 6 : 0 }}
          >
            {isProcessing ? "Processing..." : "Submit Refund Request"}
          </AppText>
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            marginTop: 10,
            gap: 6,
          }}
        >
          <FaInfoCircle size={11} color={c.textMuted} />
          <AppText variant="small" tone="dim" style={{ flex: 1, fontSize: 11 }}>
            Refund requests are reviewed within 24-48 hours.
          </AppText>
        </View>
      </View>

      <Modal
        visible={showConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirm(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText weight="bold" style={{ fontSize: 16, marginBottom: 8 }}>
              Confirm Refund Request
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginBottom: 12 }}>
              Are you sure you want to request a refund for this booking? This
              action cannot be undone.
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setShowConfirm(false)}
                style={[
                  styles.modalBtn,
                  { borderColor: c.border, borderWidth: 1 },
                ]}
              >
                <AppText variant="small" weight="bold" tone="dim">
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={[styles.modalBtn, { backgroundColor: c.orange }]}
              >
                <AppText variant="small" weight="bold" style={{ color: c.bg }}>
                  Yes, Request
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { marginTop: 6, marginBottom: 6 },
  typeBtn: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  input: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textarea: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
  },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
