// src/screens/main/MyReportsScreen.js
// Mirrors: website /reports/my
// APIs:
//   GET    /reports/my?page=&limit=&status=  → paginated report list
//   POST   /reports                          → submit new report
//   DELETE /reports/:id                      → cancel pending report

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../components/AppText";
import AppScreen from "../../components/AppScreen";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  PENDING: {
    label: "Pending Review",
    icon: "⏳",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
    border: "rgba(245,158,11,0.30)",
  },
  REVIEWING: {
    label: "Under Review",
    icon: "🔍",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.30)",
  },
  RESOLVED: {
    label: "Resolved",
    icon: "✅",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.30)",
  },
  DISMISSED: {
    label: "Dismissed",
    icon: "🚫",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.12)",
    border: "rgba(107,114,128,0.30)",
  },
};

const ACTION_META = {
  NO_ACTION: { label: "No action taken", icon: "—" },
  WARNING_ISSUED: { label: "Warning issued", icon: "⚠️" },
  CONTENT_REMOVED: { label: "Content removed", icon: "🗑️" },
  USER_SUSPENDED: { label: "User suspended", icon: "🔒" },
  USER_BANNED: { label: "User banned", icon: "🚫" },
};

const TYPE_META = {
  USER: { label: "User", icon: "👤" },
  JOB_POST: { label: "Job Post", icon: "💼" },
  POST: { label: "Community Post", icon: "📝" },
  REVIEW: { label: "Review", icon: "⭐" },
  BOOKING: { label: "Booking", icon: "📅" },
  MESSAGE: { label: "Message", icon: "💬" },
};

const REASON_OPTIONS = [
  { value: "SPAM", label: "Spam" },
  { value: "FAKE_PROFILE", label: "Fake profile" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "FRAUD", label: "Fraud / scam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SCAM", label: "Scam" },
  { value: "MISLEADING_INFORMATION", label: "Misleading info" },
  { value: "FAKE_REVIEWS", label: "Fake reviews" },
  { value: "UNDERAGE_USER", label: "Underage user" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "OTHER", label: "Other" },
];

const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "REVIEWING", label: "Reviewing" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "DISMISSED", label: "Dismissed" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const timeAgo = (d) => {
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
};

// ── StatusBadge ───────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.DISMISSED;
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: m.bg,
        borderWidth: 1,
        borderColor: m.border,
      }}
    >
      <AppText style={{ fontSize: 10, fontWeight: "700", color: m.color }}>
        {m.icon} {m.label}
      </AppText>
    </View>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────────────
function SkeletonCard({ c }) {
  return (
    <View
      style={{
        height: 120,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bgCard,
        marginBottom: 10,
      }}
    />
  );
}

// ── Submit Report Modal (bottom sheet) ────────────────────────────────────────
function ReportFormModal({ visible, onClose, onSuccess, c, modalBg, toast }) {
  const [targetType, setTargetType] = useState("USER");
  const [targetId, setTargetId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);

  function reset() {
    setTargetType("USER");
    setTargetId("");
    setReason("");
    setDescription("");
    setEvidence("");
    setDone(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submit() {
    if (!targetId.trim()) {
      toast.error("Please enter the Target ID.");
      return;
    }
    if (!reason) {
      toast.error("Please select a reason.");
      return;
    }
    setSubmitting(true);
    try {
      const evidenceArr = evidence
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 5);
      const res = await client.post("/reports", {
        targetType,
        targetId: targetId.trim(),
        reason,
        description: description.trim() || undefined,
        evidence: evidenceArr,
      });
      setDone({ ref: res.data.data.ref });
      onSuccess?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}
          onPress={handleClose}
        >
          <Pressable
            style={[s.sheet, { backgroundColor: modalBg, maxHeight: "92%" }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <View style={[s.handle, { backgroundColor: c.border }]} />

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 18,
              }}
            >
              <View>
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.orange,
                    fontWeight: "700",
                    letterSpacing: 0.8,
                  }}
                >
                  SAFETY & TRUST
                </AppText>
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 24, color: c.text, marginTop: 2 }}
                >
                  File a Report
                </AppText>
              </View>
              <Pressable
                onPress={handleClose}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="close" size={18} color={c.textDim} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {done ? (
                /* ── Success state ── */
                <View
                  style={{ alignItems: "center", paddingVertical: 32, gap: 12 }}
                >
                  <AppText style={{ fontSize: 52 }}>✅</AppText>
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 22, color: c.text, textAlign: "center" }}
                  >
                    Report Submitted
                  </AppText>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{
                      textAlign: "center",
                      lineHeight: 20,
                      maxWidth: 280,
                    }}
                  >
                    Reference:{" "}
                    <AppText weight="semibold" style={{ color: c.text }}>
                      {done.ref}
                    </AppText>
                    {"\n"}Our team will review it within 24–48 hours.
                  </AppText>
                  <Pressable
                    onPress={handleClose}
                    style={{
                      marginTop: 8,
                      paddingHorizontal: 28,
                      paddingVertical: 13,
                      borderRadius: 12,
                      backgroundColor: c.orange,
                    }}
                  >
                    <AppText weight="semibold" style={{ color: "#000" }}>
                      Done
                    </AppText>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* ── Target Type ── */}
                  <AppText style={[s.fieldLabel, { color: c.textMuted }]}>
                    TARGET TYPE
                  </AppText>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginBottom: 16 }}
                    contentContainerStyle={{ gap: 8, paddingBottom: 2 }}
                  >
                    {Object.entries(TYPE_META).map(([key, m]) => (
                      <Pressable
                        key={key}
                        onPress={() => setTargetType(key)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          borderRadius: 10,
                          borderWidth: 1,
                          backgroundColor:
                            targetType === key
                              ? "rgba(249,115,22,0.18)"
                              : c.bgCard,
                          borderColor:
                            targetType === key
                              ? "rgba(249,115,22,0.5)"
                              : c.border,
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: targetType === key ? c.orange : c.textDim,
                          }}
                        >
                          {m.icon} {m.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </ScrollView>

                  {/* ── Target ID ── */}
                  <AppText style={[s.fieldLabel, { color: c.textMuted }]}>
                    TARGET ID *
                  </AppText>
                  <TextInput
                    value={targetId}
                    onChangeText={setTargetId}
                    placeholder="Paste the UUID of the item to report"
                    placeholderTextColor={c.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[
                      s.input,
                      {
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: c.bgCard,
                      },
                    ]}
                  />

                  {/* ── Reason grid ── */}
                  <AppText
                    style={[s.fieldLabel, { color: c.textMuted, marginTop: 4 }]}
                  >
                    REASON *
                  </AppText>
                  <View
                    style={{
                      flexDirection: "row",
                      flexWrap: "wrap",
                      gap: 8,
                      marginBottom: 16,
                    }}
                  >
                    {REASON_OPTIONS.map((r) => (
                      <Pressable
                        key={r.value}
                        onPress={() => setReason(r.value)}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 9,
                          borderRadius: 20,
                          borderWidth: 1,
                          backgroundColor:
                            reason === r.value
                              ? "rgba(249,115,22,0.18)"
                              : c.bgCard,
                          borderColor:
                            reason === r.value
                              ? "rgba(249,115,22,0.5)"
                              : c.border,
                        }}
                      >
                        {reason === r.value && (
                          <View
                            style={{
                              position: "absolute",
                              top: 4,
                              right: 4,
                              width: 7,
                              height: 7,
                              borderRadius: 4,
                              backgroundColor: c.orange,
                            }}
                          />
                        )}
                        <AppText
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: reason === r.value ? c.orange : c.textDim,
                          }}
                        >
                          {r.label}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>

                  {/* ── Description ── */}
                  <AppText style={[s.fieldLabel, { color: c.textMuted }]}>
                    ADDITIONAL DETAILS{" "}
                    <AppText style={{ color: c.textMuted, fontWeight: "400" }}>
                      (optional)
                    </AppText>
                  </AppText>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Describe what happened. More detail = faster action."
                    placeholderTextColor={c.textMuted}
                    multiline
                    numberOfLines={4}
                    maxLength={1000}
                    textAlignVertical="top"
                    style={[
                      s.textarea,
                      {
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: c.bgCard,
                      },
                    ]}
                  />
                  <AppText
                    style={{
                      fontSize: 11,
                      color: c.textMuted,
                      alignSelf: "flex-end",
                      marginBottom: 16,
                    }}
                  >
                    {description.length}/1000
                  </AppText>

                  {/* ── Evidence ── */}
                  <AppText style={[s.fieldLabel, { color: c.textMuted }]}>
                    EVIDENCE URLS{" "}
                    <AppText style={{ color: c.textMuted, fontWeight: "400" }}>
                      (one per line, max 5)
                    </AppText>
                  </AppText>
                  <TextInput
                    value={evidence}
                    onChangeText={setEvidence}
                    placeholder={
                      "https://example.com/screenshot1.png\nhttps://example.com/screenshot2.png"
                    }
                    placeholderTextColor={c.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    style={[
                      s.textarea,
                      {
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: c.bgCard,
                      },
                    ]}
                  />

                  {/* Disclaimer */}
                  <View
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: "rgba(249,115,22,0.08)",
                      borderWidth: 1,
                      borderColor: "rgba(249,115,22,0.2)",
                      marginTop: 4,
                      marginBottom: 20,
                    }}
                  >
                    <AppText style={{ fontSize: 15 }}>🔒</AppText>
                    <AppText
                      variant="small"
                      tone="dim"
                      style={{ flex: 1, lineHeight: 18 }}
                    >
                      False or malicious reports may result in action against
                      your account. Reports are reviewed by our team and are
                      confidential.
                    </AppText>
                  </View>

                  <Pressable
                    onPress={submit}
                    disabled={submitting || !reason || !targetId.trim()}
                    style={{
                      paddingVertical: 16,
                      borderRadius: 14,
                      alignItems: "center",
                      backgroundColor:
                        reason && targetId.trim() ? "#ef4444" : c.bgCard,
                      borderWidth: reason && targetId.trim() ? 0 : 1,
                      borderColor: c.border,
                      opacity: reason && targetId.trim() ? 1 : 0.6,
                      marginBottom: 32,
                    }}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <AppText
                        weight="semibold"
                        style={{
                          fontSize: 15,
                          color:
                            reason && targetId.trim() ? "#fff" : c.textMuted,
                        }}
                      >
                        🚩 Submit Report
                      </AppText>
                    )}
                  </Pressable>
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Detail Drawer (bottom sheet) ──────────────────────────────────────────────
function DetailDrawer({ report, visible, onClose, onCancel, c, modalBg }) {
  if (!report || !visible) return null;

  const typeMeta = TYPE_META[report.targetType] || {
    label: report.targetType,
    icon: "📄",
  };
  const statusMeta = STATUS_META[report.status] || STATUS_META.DISMISSED;
  const actionMeta = ACTION_META[report.actionTaken] || {
    label: report.actionTaken || "—",
    icon: "—",
  };
  const canCancel = report.status === "PENDING";
  const isDone = report.status === "RESOLVED" || report.status === "DISMISSED";

  const timelineSteps = [
    {
      label: "Report submitted",
      date: fmtDate(report.createdAt),
      done: true,
      active: false,
    },
    {
      label: "Review started",
      date: "—",
      done: report.status !== "PENDING",
      active: report.status === "REVIEWING",
    },
    {
      label: isDone
        ? report.status === "RESOLVED"
          ? "Resolved"
          : "Dismissed"
        : "Awaiting resolution",
      date: isDone ? fmtDate(report.resolvedAt) : "—",
      done: isDone,
      active: false,
    },
  ];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.65)" }}
        onPress={onClose}
      >
        <Pressable
          style={[s.sheet, { backgroundColor: modalBg, maxHeight: "88%" }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <View style={[s.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              paddingBottom: 14,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
              marginBottom: 16,
            }}
          >
            <View>
              <AppText
                style={{
                  fontSize: 10,
                  color: c.orange,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  marginBottom: 2,
                }}
              >
                REPORT DETAIL
              </AppText>
              <AppText
                weight="displayBlack"
                style={{ fontSize: 20, color: c.text, letterSpacing: 0.5 }}
              >
                {report.ref}
              </AppText>
            </View>
            <Pressable
              onPress={onClose}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText style={{ color: c.textMuted, fontSize: 16 }}>✕</AppText>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Status hero */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                backgroundColor: statusMeta.bg,
                borderColor: statusMeta.border,
                marginBottom: 16,
              }}
            >
              <AppText style={{ fontSize: 28 }}>{statusMeta.icon}</AppText>
              <View>
                <AppText
                  weight="semibold"
                  style={{ fontSize: 15, color: c.text }}
                >
                  {statusMeta.label}
                </AppText>
                <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
                  {isDone
                    ? `Resolved ${fmtDate(report.resolvedAt)}`
                    : `Submitted ${timeAgo(report.createdAt)}`}
                </AppText>
              </View>
            </View>

            {/* Detail grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginBottom: 16,
              }}
            >
              {[
                {
                  label: "Reported",
                  value: `${typeMeta.icon}  ${typeMeta.label}`,
                },
                {
                  label: "Reason",
                  value:
                    REASON_OPTIONS.find((r) => r.value === report.reason)
                      ?.label || report.reason,
                },
                { label: "Submitted", value: fmtDate(report.createdAt) },
                {
                  label: "Target ID",
                  value: report.targetId?.slice(-8).toUpperCase(),
                  mono: true,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{
                    width: "47%",
                    padding: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.bgCard,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 9,
                      color: c.textMuted,
                      fontWeight: "700",
                      letterSpacing: 0.7,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: c.text,
                      fontFamily: item.mono
                        ? Platform.select({
                            ios: "Courier",
                            android: "monospace",
                          })
                        : undefined,
                    }}
                  >
                    {item.value}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Description */}
            {report.description ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                  marginBottom: 16,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    color: c.textMuted,
                    fontWeight: "700",
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  YOUR DESCRIPTION
                </AppText>
                <AppText variant="body" tone="dim" style={{ lineHeight: 20 }}>
                  {report.description}
                </AppText>
              </View>
            ) : null}

            {/* Outcome */}
            {isDone ? (
              <View
                style={{
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(34,197,94,0.25)",
                  backgroundColor: "rgba(34,197,94,0.10)",
                  marginBottom: 16,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    color: "#22c55e",
                    fontWeight: "700",
                    letterSpacing: 0.7,
                    textTransform: "uppercase",
                    marginBottom: 8,
                  }}
                >
                  OUTCOME
                </AppText>
                <AppText
                  weight="semibold"
                  style={{ color: c.text, fontSize: 14, marginBottom: 4 }}
                >
                  {actionMeta.icon} {actionMeta.label}
                </AppText>
                {report.adminNote ? (
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ fontStyle: "italic", lineHeight: 18 }}
                  >
                    "{report.adminNote}"
                  </AppText>
                ) : null}
              </View>
            ) : null}

            {/* Timeline */}
            <View style={{ marginBottom: 16 }}>
              <AppText
                style={{
                  fontSize: 10,
                  color: c.textMuted,
                  fontWeight: "700",
                  letterSpacing: 0.8,
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                TIMELINE
              </AppText>
              {timelineSteps.map((step, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    paddingVertical: 10,
                    borderBottomWidth:
                      i < timelineSteps.length - 1
                        ? StyleSheet.hairlineWidth
                        : 0,
                    borderBottomColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: step.done
                        ? "#22c55e"
                        : step.active
                          ? "#3b82f6"
                          : c.border,
                      flexShrink: 0,
                    }}
                  />
                  <AppText variant="body" tone="dim" style={{ flex: 1 }}>
                    {step.label}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    {step.date}
                  </AppText>
                </View>
              ))}
            </View>

            {/* Cancel button */}
            {canCancel ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onCancel(report);
                }}
                style={{
                  paddingVertical: 14,
                  borderRadius: 12,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(239,68,68,0.35)",
                  backgroundColor: "rgba(239,68,68,0.10)",
                }}
              >
                <AppText
                  weight="semibold"
                  style={{ color: "#ef4444", fontSize: 14 }}
                >
                  🗑️ Cancel this report
                </AppText>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Cancel Confirm Modal ──────────────────────────────────────────────────────
function CancelConfirmModal({
  report,
  visible,
  onClose,
  onSuccess,
  c,
  modalBg,
  toast,
}) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      await client.delete(`/reports/${report.id}`);
      onSuccess("Report cancelled and removed.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel report.");
    } finally {
      setLoading(false);
    }
  }

  if (!report || !visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          style={{
            backgroundColor: modalBg,
            borderRadius: 22,
            padding: 28,
            width: "100%",
            maxWidth: 360,
            alignItems: "center",
            gap: 10,
            borderWidth: 1,
            borderColor: "rgba(239,68,68,0.2)",
          }}
          onPress={(e) => e.stopPropagation()}
        >
          <AppText style={{ fontSize: 40 }}>🗑️</AppText>
          <AppText
            weight="displayBlack"
            style={{ fontSize: 20, color: c.text, textAlign: "center" }}
          >
            Cancel this report?
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ textAlign: "center", lineHeight: 19 }}
          >
            Ref{" "}
            <AppText weight="semibold" style={{ color: c.text }}>
              {report.ref}
            </AppText>
            {"\n"}
            {REASON_OPTIONS.find((r) => r.value === report.reason)?.label}
            {"\n"}This action cannot be undone.
          </AppText>

          <View
            style={{
              flexDirection: "row",
              gap: 10,
              width: "100%",
              marginTop: 8,
            }}
          >
            <Pressable
              onPress={onClose}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: "transparent",
              }}
            >
              <AppText weight="semibold" style={{ color: c.textDim }}>
                Keep it
              </AppText>
            </Pressable>
            <Pressable
              onPress={handleCancel}
              disabled={loading}
              style={{
                flex: 1,
                paddingVertical: 13,
                borderRadius: 12,
                alignItems: "center",
                backgroundColor: "#ef4444",
              }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <AppText weight="semibold" style={{ color: "#fff" }}>
                  Yes, cancel
                </AppText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Report Card ───────────────────────────────────────────────────────────────
function ReportCard({ report, onView, onCancel, c }) {
  const typeMeta = TYPE_META[report.targetType] || {
    label: report.targetType,
    icon: "📄",
  };
  const actionMeta = ACTION_META[report.actionTaken];
  const canCancel = report.status === "PENDING";
  const hasOutcome = report.actionTaken && report.actionTaken !== "NO_ACTION";
  const noAction =
    report.actionTaken === "NO_ACTION" && report.status === "RESOLVED";
  const reasonLabel =
    REASON_OPTIONS.find((r) => r.value === report.reason)?.label ||
    report.reason;

  return (
    <Pressable
      onPress={() => onView(report)}
      style={{
        backgroundColor: c.bgPanel,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
        padding: 16,
        marginBottom: 10,
      }}
    >
      {/* Top row */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1,
            marginRight: 10,
          }}
        >
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText style={{ fontSize: 20 }}>{typeMeta.icon}</AppText>
          </View>
          <View style={{ flex: 1 }}>
            <AppText
              weight="semibold"
              style={{ fontSize: 13, color: c.text, letterSpacing: 0.3 }}
            >
              {report.ref}
            </AppText>
            <AppText
              style={{
                fontSize: 10,
                color: c.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginTop: 1,
              }}
            >
              {typeMeta.label}
            </AppText>
          </View>
        </View>
        <StatusBadge status={report.status} />
      </View>

      {/* Reason + description */}
      <View style={{ paddingLeft: 52, marginBottom: 8 }}>
        <AppText
          weight="semibold"
          style={{ fontSize: 14, color: c.text, marginBottom: 3 }}
        >
          {reasonLabel}
        </AppText>
        {report.description ? (
          <AppText
            variant="small"
            tone="dim"
            numberOfLines={2}
            style={{ lineHeight: 18 }}
          >
            {report.description}
          </AppText>
        ) : null}
      </View>

      {/* Outcome pill */}
      {hasOutcome ? (
        <View
          style={{
            alignSelf: "flex-start",
            marginLeft: 52,
            marginBottom: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "rgba(34,197,94,0.25)",
            backgroundColor: "rgba(34,197,94,0.10)",
          }}
        >
          <AppText
            style={{ fontSize: 11, fontWeight: "600", color: "#22c55e" }}
          >
            {actionMeta?.icon} {actionMeta?.label}
          </AppText>
        </View>
      ) : noAction ? (
        <View
          style={{
            alignSelf: "flex-start",
            marginLeft: 52,
            marginBottom: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.bgCard,
          }}
        >
          <AppText
            style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}
          >
            — No action taken
          </AppText>
        </View>
      ) : null}

      {/* Footer */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 10,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
        }}
      >
        <AppText style={{ fontSize: 11, color: c.textMuted }}>
          {timeAgo(report.createdAt)}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {canCancel ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onCancel(report);
              }}
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText style={{ fontSize: 14 }}>🗑️</AppText>
            </Pressable>
          ) : null}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgCard,
            }}
          >
            <AppText
              style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
            >
              Details
            </AppText>
            <Ionicons name="chevron-forward" size={12} color={c.textMuted} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MyReportsScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const c = th.colors;
  const modalBg = th.effectiveMode === "dark" ? "#111118" : "#ffffff";

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewTarget, setViewTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const LIMIT = 10;

  const load = useCallback(
    async (pg = 1, status = tab, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (status !== "ALL") params.status = status;
        const res = await client.get("/reports/my", { params });
        const d = res.data.data;
        setReports(d.reports || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPage(pg);
      } catch {
        toast.error("Failed to load reports.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [tab],
  );

  useEffect(() => {
    load(1, tab);
  }, [tab]);

  function handleTabChange(key) {
    setTab(key);
    setPage(1);
  }

  function handleCancelSuccess(msg) {
    setCancelTarget(null);
    toast.success(msg);
    load(page, tab);
  }

  function handleReportSuccess() {
    setShowForm(false);
    load(1, "ALL");
    setTab("ALL");
  }

  // Summary counts
  const pending = reports.filter((r) => r.status === "PENDING").length;
  const reviewing = reports.filter((r) => r.status === "REVIEWING").length;
  const resolved = reports.filter((r) => r.status === "RESOLVED").length;

  return (
    <>
      <AppScreen
        contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(1, tab, true)}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
      >
        {/* ── Page header ── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 18,
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText
              style={{
                fontSize: 11,
                color: c.orange,
                fontWeight: "700",
                letterSpacing: 0.8,
              }}
            >
              SAFETY & TRUST
            </AppText>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 2,
                flexWrap: "wrap",
              }}
            >
              <AppText
                weight="displayBlack"
                style={{ fontSize: 30, color: c.text, lineHeight: 36 }}
              >
                My Reports
              </AppText>
              {total > 0 && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.bgCard,
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: c.textMuted,
                    }}
                  >
                    {total}
                  </AppText>
                </View>
              )}
            </View>
            <AppText
              variant="small"
              tone="dim"
              style={{ marginTop: 4, lineHeight: 18 }}
            >
              Track reports you've submitted. Reviewed within 24–48 hours.
            </AppText>
          </View>
          <Pressable
            onPress={() => setShowForm(true)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: "#ef4444",
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="flag" size={14} color="#fff" />
            <AppText weight="semibold" style={{ color: "#fff", fontSize: 13 }}>
              Report
            </AppText>
          </Pressable>
        </View>

        {/* ── Summary strip ── */}
        {!loading && reports.length > 0 && (
          <View
            style={{
              flexDirection: "row",
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgPanel,
              overflow: "hidden",
              marginBottom: 14,
            }}
          >
            {[
              { icon: "⏳", value: pending, label: "Pending" },
              { icon: "🔍", value: reviewing, label: "Reviewing" },
              { icon: "✅", value: resolved, label: "Resolved" },
            ].map((item, i) => (
              <React.Fragment key={item.label}>
                {i > 0 && (
                  <View
                    style={{
                      width: StyleSheet.hairlineWidth,
                      backgroundColor: c.border,
                    }}
                  />
                )}
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 14,
                    gap: 3,
                  }}
                >
                  <AppText style={{ fontSize: 18 }}>{item.icon}</AppText>
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 20, color: c.text, lineHeight: 24 }}
                  >
                    {item.value}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: 10,
                      color: c.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    {item.label}
                  </AppText>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {/* ── Info banner ── */}
        <View
          style={{
            flexDirection: "row",
            gap: 12,
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: c.border,
            borderLeftWidth: 3,
            borderLeftColor: c.orange,
            backgroundColor: c.bgPanel,
            marginBottom: 16,
          }}
        >
          <AppText style={{ fontSize: 16 }}>🔒</AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ flex: 1, lineHeight: 18 }}
          >
            All reports are confidential. The reported party is never told who
            filed the report.
          </AppText>
        </View>

        {/* ── Status tabs ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
          contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
        >
          {STATUS_TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => handleTabChange(t.key)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1,
                backgroundColor:
                  tab === t.key ? "rgba(249,115,22,0.15)" : "transparent",
                borderColor: tab === t.key ? "rgba(249,115,22,0.5)" : c.border,
              }}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: tab === t.key ? c.orange : c.textDim,
                }}
              >
                {t.label}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>

        {/* ── Cards ── */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} c={c} />
          ))
        ) : reports.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 64, gap: 10 }}>
            <AppText style={{ fontSize: 44, opacity: 0.35 }}>🚩</AppText>
            <AppText weight="semibold" style={{ fontSize: 16, color: c.text }}>
              {tab === "ALL"
                ? "No reports yet"
                : `No ${tab.toLowerCase()} reports`}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", maxWidth: 260, lineHeight: 18 }}
            >
              {tab === "ALL"
                ? "Tap Report to flag a user, job post, or any content."
                : "Try a different filter above."}
            </AppText>
            {tab !== "ALL" ? (
              <Pressable
                onPress={() => handleTabChange("ALL")}
                style={{
                  marginTop: 8,
                  paddingHorizontal: 18,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <AppText
                  style={{ fontSize: 12, fontWeight: "600", color: c.textDim }}
                >
                  View all reports
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              c={c}
              onView={setViewTarget}
              onCancel={setCancelTarget}
            />
          ))
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              marginTop: 8,
            }}
          >
            <Pressable
              disabled={page <= 1 || loading}
              onPress={() => load(page - 1)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: page <= 1 || loading ? 0.4 : 1,
              }}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                ← Prev
              </AppText>
            </Pressable>
            <AppText style={{ fontSize: 12, color: c.textMuted }}>
              Page {page} of {pages}
            </AppText>
            <Pressable
              disabled={page >= pages || loading}
              onPress={() => load(page + 1)}
              style={{
                paddingHorizontal: 18,
                paddingVertical: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: page >= pages || loading ? 0.4 : 1,
              }}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                Next →
              </AppText>
            </Pressable>
          </View>
        )}
      </AppScreen>

      {/* ── Modals — outside AppScreen so they cover full screen ── */}
      <ReportFormModal
        visible={showForm}
        onClose={() => setShowForm(false)}
        onSuccess={handleReportSuccess}
        c={c}
        modalBg={modalBg}
        toast={toast}
      />

      <DetailDrawer
        report={viewTarget}
        visible={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onCancel={(r) => {
          setViewTarget(null);
          setCancelTarget(r);
        }}
        c={c}
        modalBg={modalBg}
      />

      <CancelConfirmModal
        report={cancelTarget}
        visible={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onSuccess={handleCancelSuccess}
        c={c}
        modalBg={modalBg}
        toast={toast}
      />
    </>
  );
}

// ── Shared sheet styles ───────────────────────────────────────────────────────
const s = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  input: {
    height: 46,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 90,
    marginBottom: 4,
  },
});
