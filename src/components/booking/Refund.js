// src/components/booking/Refund.js
//
// Verbatim port of:
//   · components/booking/Refund/RefundRequest.jsx
//   · components/booking/Refund/RefundStatus.jsx
//
// Exports:
//   · RefundRequest — form with 3 refund types (FULL / PARTIAL / CUSTOM_AMOUNT),
//                     48-hour eligibility countdown, confirmation modal
//   · RefundStatus  — status card with icon, color, role-aware description,
//                     reference/amount/type/timestamps, admin notes
//
// Endpoint: POST /refunds/request
// Payload: { bookingId, paymentId, refundType, percentage?, amount?, reason }

import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import {
  FaMoneyBillWave,
  FaClock,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaFileInvoice,
  FaPercent,
} from "../../icons/fa";

// ── Helpers ────────────────────────────────────────────────────────────
function fmtPrice(amount, currency = "NGN") {
  const n = Number(amount) || 0;
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const REFUND_TYPES = [
  { value: "FULL", label: "Full Refund", icon: FaMoneyBillWave },
  { value: "PARTIAL", label: "Partial Refund", icon: FaPercent },
  { value: "CUSTOM_AMOUNT", label: "Custom Amount", icon: FaFileInvoice },
];

// ═══════════════════════════════════════════════════════════════════════
// RefundRequest
// ═══════════════════════════════════════════════════════════════════════
export function RefundRequest({
  booking,
  payment,
  onRequestRefund,
  isProcessing = false,
  isHirer = false,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [selectedType, setSelectedType] = useState("FULL");
  const [percentage, setPercentage] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  // Only hirers can request refunds
  if (!isHirer) return null;

  // ── 48-hour eligibility ─────────────────────────────────────────────
  const isEligible = () => {
    if (!booking?.completedAt) return false;
    const completedAt = new Date(booking.completedAt);
    const hoursSinceCompletion =
      (Date.now() - completedAt.getTime()) / (1000 * 60 * 60);
    return hoursSinceCompletion <= 48;
  };

  const getTimeRemaining = () => {
    if (!booking?.completedAt) return null;
    const completedAt = new Date(booking.completedAt);
    const remainingMs =
      48 * 60 * 60 * 1000 - (Date.now() - completedAt.getTime());
    if (remainingMs <= 0) return null;
    const hours = Math.floor(remainingMs / (60 * 60 * 1000));
    const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
    return `${hours}h ${minutes}m`;
  };

  // ── Refund amount calculation ───────────────────────────────────────
  const originalAmount =
    Number(payment?.amount) || Number(booking?.agreedRate) || 0;
  const currency = payment?.currency || booking?.currency || "NGN";

  const calculateRefundAmount = () => {
    if (selectedType === "FULL") return originalAmount;
    if (selectedType === "PARTIAL") return (originalAmount * percentage) / 100;
    if (selectedType === "CUSTOM_AMOUNT") {
      const amount = parseFloat(customAmount);
      return isNaN(amount) ? 0 : amount;
    }
    return 0;
  };

  const refundAmount = calculateRefundAmount();
  const timeRemaining = getTimeRemaining();

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = () => {
    const newErrors = {};
    if (!reason.trim()) {
      newErrors.reason = "Please provide a reason for the refund";
    }
    if (
      selectedType === "CUSTOM_AMOUNT" &&
      (!customAmount || parseFloat(customAmount) <= 0)
    ) {
      newErrors.customAmount = "Please enter a valid amount";
    }
    if (
      selectedType === "CUSTOM_AMOUNT" &&
      parseFloat(customAmount) > originalAmount
    ) {
      newErrors.customAmount = "Amount cannot exceed the original payment";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    const payload = {
      bookingId: booking.id,
      paymentId: payment?.id,
      refundType: selectedType,
      reason: reason.trim(),
    };
    if (selectedType === "PARTIAL") payload.percentage = percentage;
    if (selectedType === "CUSTOM_AMOUNT")
      payload.amount = parseFloat(customAmount);

    onRequestRefund(payload);
    setShowConfirm(false);
  };

  // ── Not eligible ────────────────────────────────────────────────────
  if (!isEligible()) {
    return (
      <View
        style={[
          styles.refundCard,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <View style={styles.refundHeader}>
          <FaClock size={14} color={c.orange} />
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              marginLeft: 6,
            }}
          >
            Refund Unavailable
          </AppText>
        </View>
        <AppText
          style={{
            fontSize: 13,
            color: c.textDim,
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          Refund requests must be made within 48 hours of booking completion.
        </AppText>
        {booking?.completedAt ? (
          <AppText style={{ fontSize: 11, color: c.textMuted, marginTop: 6 }}>
            Completed on: {new Date(booking.completedAt).toLocaleString()}
          </AppText>
        ) : null}
      </View>
    );
  }

  // ── Eligible form ───────────────────────────────────────────────────
  return (
    <>
      <View
        style={[
          styles.refundCard,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {/* Header */}
        <View style={styles.refundHeader}>
          <FaMoneyBillWave size={14} color={c.orange} />
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              marginLeft: 6,
              flex: 1,
            }}
          >
            Request Refund
          </AppText>
          {timeRemaining ? (
            <View
              style={[
                styles.timerBadge,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaClock size={9} color={c.orange} />
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: c.orange,
                  marginLeft: 3,
                }}
              >
                {timeRemaining}
              </AppText>
            </View>
          ) : null}
        </View>

        {/* Info summary */}
        <View
          style={[
            styles.infoBox,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <InfoRow label="Booking" value={booking.title} c={c} />
          <InfoRow
            label="Original Amount"
            value={fmtPrice(originalAmount, currency)}
            c={c}
          />
          <InfoRow
            label="Status"
            value={
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <FaCheckCircle size={10} color={c.green} />
                <AppText
                  style={{ fontSize: 12, fontWeight: "700", color: c.green }}
                >
                  Eligible
                </AppText>
              </View>
            }
            c={c}
          />
        </View>

        {/* Refund type selector */}
        <AppText style={[styles.label, { color: c.textDim }]}>
          REFUND TYPE
        </AppText>
        <View style={styles.typeGrid}>
          {REFUND_TYPES.map((t) => {
            const active = selectedType === t.value;
            const Icon = t.icon;
            return (
              <Pressable
                key={t.value}
                onPress={() => setSelectedType(t.value)}
                style={({ pressed }) => [
                  styles.typeBtn,
                  {
                    backgroundColor: active ? c.orangeDim : c.bgInput,
                    borderColor: active ? c.orange : c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Icon size={14} color={active ? c.orange : c.textDim} />
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "700",
                    color: active ? c.orange : c.text,
                    marginTop: 4,
                    textAlign: "center",
                  }}
                  numberOfLines={2}
                >
                  {t.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* Partial slider */}
        {selectedType === "PARTIAL" ? (
          <View style={{ marginTop: 14 }}>
            <AppText style={[styles.label, { color: c.textDim }]}>
              PERCENTAGE: {percentage}%
            </AppText>
            <PercentageSlider
              value={percentage}
              onChange={setPercentage}
              c={c}
            />
            <AmountPreview
              label="Refund Amount"
              value={fmtPrice(refundAmount, currency)}
              c={c}
            />
          </View>
        ) : null}

        {/* Custom amount */}
        {selectedType === "CUSTOM_AMOUNT" ? (
          <View style={{ marginTop: 14 }}>
            <AppText style={[styles.label, { color: c.textDim }]}>
              ENTER AMOUNT ({currency})
            </AppText>
            <TextInput
              value={customAmount}
              onChangeText={(v) => {
                setCustomAmount(v.replace(/[^0-9.]/g, ""));
                if (errors.customAmount)
                  setErrors({ ...errors, customAmount: null });
              }}
              keyboardType="decimal-pad"
              placeholder="Enter amount"
              placeholderTextColor={c.textMuted}
              style={[
                styles.input,
                {
                  color: c.text,
                  borderColor: errors.customAmount ? c.red : c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            />
            {errors.customAmount ? (
              <AppText style={{ fontSize: 11, color: c.red, marginTop: 4 }}>
                {errors.customAmount}
              </AppText>
            ) : (
              <AppText
                style={{ fontSize: 11, color: c.textMuted, marginTop: 4 }}
              >
                Maximum: {fmtPrice(originalAmount, currency)}
              </AppText>
            )}
          </View>
        ) : null}

        {/* Full preview */}
        {selectedType === "FULL" ? (
          <AmountPreview
            label="Refund Amount"
            value={fmtPrice(refundAmount, currency)}
            c={c}
          />
        ) : null}

        {/* Reason */}
        <AppText style={[styles.label, { color: c.textDim, marginTop: 14 }]}>
          REASON *
        </AppText>
        <TextInput
          value={reason}
          onChangeText={(v) => {
            setReason(v);
            if (errors.reason) setErrors({ ...errors, reason: null });
          }}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          placeholder="Please explain why you're requesting a refund…"
          placeholderTextColor={c.textMuted}
          style={[
            styles.textarea,
            {
              color: c.text,
              borderColor: errors.reason ? c.red : c.border,
              backgroundColor: c.bgInput,
            },
          ]}
        />
        {errors.reason ? (
          <AppText style={{ fontSize: 11, color: c.red, marginTop: 4 }}>
            {errors.reason}
          </AppText>
        ) : null}

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={isProcessing}
          style={({ pressed }) => [
            styles.submitBtn,
            {
              backgroundColor: isProcessing ? c.bgCard : c.orange,
              opacity: isProcessing ? 0.7 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {isProcessing ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
            >
              <ActivityIndicator color="#fff" size="small" />
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
              >
                Processing…
              </AppText>
            </View>
          ) : (
            <AppText style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}>
              Submit Refund Request
            </AppText>
          )}
        </Pressable>

        {/* Info note */}
        <View
          style={[
            styles.infoNote,
            {
              backgroundColor: "rgba(249,115,22,0.08)",
              borderColor: "rgba(249,115,22,0.2)",
            },
          ]}
        >
          <FaInfoCircle size={11} color={c.orange} style={{ marginTop: 2 }} />
          <AppText
            style={{
              fontSize: 11,
              color: c.textDim,
              flex: 1,
              marginLeft: 6,
              lineHeight: 17,
            }}
          >
            Refund requests are reviewed within 24-48 hours. You'll be notified
            once your request is processed.
          </AppText>
        </View>
      </View>

      {/* Confirmation modal */}
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
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 17,
                fontWeight: "700",
                color: c.text,
              }}
            >
              Confirm Refund Request
            </AppText>
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                marginTop: 6,
                lineHeight: 19,
              }}
            >
              Are you sure you want to request a refund for this booking? This
              action cannot be undone.
            </AppText>

            <View
              style={[
                styles.confirmDetails,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <ConfirmRow label="Booking" value={booking.title} c={c} />
              <ConfirmRow
                label="Amount"
                value={fmtPrice(refundAmount, currency)}
                c={c}
              />
              <ConfirmRow
                label="Type"
                value={
                  REFUND_TYPES.find((t) => t.value === selectedType)?.label
                }
                c={c}
              />
              <ConfirmRow label="Reason" value={reason} c={c} />
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
              <FaExclamationTriangle size={11} color={c.red} />
              <AppText
                style={{
                  fontSize: 11,
                  color: c.red,
                  marginLeft: 6,
                  flex: 1,
                }}
              >
                This action cannot be undone.
              </AppText>
            </View>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
              <Pressable
                onPress={() => setShowConfirm(false)}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: "transparent",
                    borderColor: c.border,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: "#eab308",
                    opacity: pressed ? 0.9 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: "#000" }}
                >
                  Yes, Request Refund
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// RefundStatus
// ═══════════════════════════════════════════════════════════════════════
const STATUS_CONFIG = {
  PENDING: {
    icon: FaClock,
    color: "#fbbf24",
    label: "Pending Review",
    description: {
      hirer: "Your refund request is being reviewed by our team.",
      worker:
        "The hirer has requested a refund. This is being reviewed by our team.",
    },
  },
  APPROVED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Approved",
    description: {
      hirer: "Your refund has been approved and is being processed.",
      worker:
        "The refund for this booking has been approved and is being processed.",
    },
  },
  PROCESSING: {
    icon: FaSpinner,
    color: "#818cf8",
    label: "Processing",
    description: {
      hirer: "Your refund is currently being processed.",
      worker: "The refund for this booking is currently being processed.",
    },
  },
  COMPLETED: {
    icon: FaCheckCircle,
    color: "#22c55e",
    label: "Completed",
    description: {
      hirer: "Your refund has been completed successfully.",
      worker: "The refund for this booking has been completed.",
    },
  },
  FAILED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Failed",
    description: {
      hirer: "Your refund failed. Please contact support.",
      worker: "The refund for this booking failed. Please contact support.",
    },
  },
  REJECTED: {
    icon: FaTimesCircle,
    color: "#ef4444",
    label: "Rejected",
    description: {
      hirer: "Your refund request was rejected.",
      worker: "The refund request for this booking was rejected.",
    },
  },
  DISPUTED: {
    icon: FaExclamationTriangle,
    color: "#f59e0b",
    label: "In Dispute",
    description: {
      hirer: "This refund is under dispute review.",
      worker: "This refund is under dispute review.",
    },
  },
};

export function RefundStatus({ refund, onViewDetails, isHirer = true }) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (!refund) return null;

  const config = STATUS_CONFIG[refund.status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  const roleKey = isHirer ? "hirer" : "worker";
  const description =
    config.description?.[roleKey] ||
    config.description?.hirer ||
    "Your refund is being processed.";

  return (
    <View
      style={[
        styles.statusCard,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText
        style={{
          fontFamily: "Syne_700Bold",
          fontSize: 12,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 1,
          color: c.textDim,
          marginBottom: 12,
        }}
      >
        Refund
      </AppText>

      {/* Header */}
      <View style={styles.statusHeader}>
        <View
          style={[
            styles.statusIconWrap,
            {
              backgroundColor: `${config.color}22`,
              borderColor: `${config.color}55`,
            },
          ]}
        >
          <Icon size={18} color={config.color} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText
            style={{
              fontFamily: "Syne_700Bold",
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
            }}
          >
            {config.label}
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              marginTop: 3,
              lineHeight: 17,
            }}
          >
            {description}
          </AppText>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: `${config.color}33` }]}
        >
          <AppText
            style={{
              fontSize: 9,
              fontWeight: "800",
              color: "#fff",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            {refund.status}
          </AppText>
        </View>
      </View>

      {/* Details */}
      <View style={{ gap: 6, marginTop: 14 }}>
        <StatusRow label="Reference" value={refund.reference} c={c} mono />
        <StatusRow
          label="Amount"
          value={fmtPrice(refund.amount, refund.currency)}
          c={c}
        />
        <StatusRow
          label="Type"
          value={(refund.refundType || "").replace("_", " ")}
          c={c}
        />
        <StatusRow
          label="Requested"
          value={new Date(refund.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          c={c}
        />
        {refund.processedAt ? (
          <StatusRow
            label="Processed"
            value={new Date(refund.processedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
        ) : null}
      </View>

      {/* Admin note */}
      {refund.adminNotes ? (
        <View
          style={[
            styles.adminNoteBox,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
              marginBottom: 3,
            }}
          >
            Admin Note
          </AppText>
          <AppText style={{ fontSize: 12, color: c.textDim, lineHeight: 17 }}>
            {refund.adminNotes}
          </AppText>
        </View>
      ) : null}

      {/* View details */}
      <Pressable
        onPress={() => onViewDetails?.(refund)}
        style={({ pressed }) => [
          styles.viewBtn,
          {
            borderColor: c.orange,
            backgroundColor: c.orangeDim,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <AppText style={{ fontSize: 12, fontWeight: "700", color: c.orange }}>
          View Full Details
        </AppText>
      </Pressable>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function InfoRow({ label, value, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textDim }}>{label}</AppText>
      {typeof value === "string" ? (
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: c.text,
            flex: 1,
            textAlign: "right",
            marginLeft: 8,
          }}
          numberOfLines={2}
        >
          {value}
        </AppText>
      ) : (
        value
      )}
    </View>
  );
}

function ConfirmRow({ label, value, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 4,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textDim }}>{label}:</AppText>
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: c.text,
          flex: 1,
          textAlign: "right",
          marginLeft: 8,
        }}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}

function StatusRow({ label, value, c, mono }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 5,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textMuted }}>{label}</AppText>
      <AppText
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: c.text,
          fontFamily: mono ? "monospace" : undefined,
        }}
        numberOfLines={1}
      >
        {value}
      </AppText>
    </View>
  );
}

function AmountPreview({ label, value, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        marginTop: 10,
      }}
    >
      <AppText style={{ fontSize: 12, color: c.textDim }}>{label}:</AppText>
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 15,
          fontWeight: "800",
          color: c.orange,
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function PercentageSlider({ value, onChange, c }) {
  const step = 5;
  const dec = () => onChange(Math.max(1, value - step));
  const inc = () => onChange(Math.min(99, value + step));

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 4,
      }}
    >
      <Pressable
        onPress={dec}
        disabled={value <= 1}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: value <= 1 ? 0.4 : 1,
        }}
      >
        <AppText style={{ fontSize: 18, color: c.text, lineHeight: 20 }}>
          −
        </AppText>
      </Pressable>
      <View
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: c.border,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${value}%`,
            backgroundColor: c.orange,
          }}
        />
      </View>
      <Pressable
        onPress={inc}
        disabled={value >= 99}
        hitSlop={6}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
          opacity: value >= 99 ? 0.4 : 1,
        }}
      >
        <AppText style={{ fontSize: 18, color: c.text, lineHeight: 20 }}>
          +
        </AppText>
      </Pressable>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  refundCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  refundHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  infoBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  typeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 90,
    fontSize: 14,
    lineHeight: 20,
  },
  submitBtn: {
    marginTop: 14,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  confirmDetails: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  confirmWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  statusCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  statusHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  adminNoteBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  viewBtn: {
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
