// src/components/ReportButton.js
//
// Port of pages/reports/ReportButton.jsx + Reports.module.css.
//
// Self-contained modal — no external navigation. Submits to POST /reports
// and shows a success screen with a reference code.
//
// Usage:
//   <ReportButton targetType="USER" targetId={userId} targetName="John Doe" />
//   <ReportButton targetType="POST" targetId={postId} variant="icon" />

import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import client from "../api/client";
import {
  FaFlag,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
} from "../icons/fa";

const REASONS = [
  { value: "SPAM", label: "Spam" },
  { value: "FAKE_PROFILE", label: "Fake profile" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "FRAUD", label: "Fraud / scam activity" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "SCAM", label: "Scam" },
  { value: "MISLEADING_INFORMATION", label: "Misleading information" },
  { value: "FAKE_REVIEWS", label: "Fake reviews" },
  { value: "UNDERAGE_USER", label: "Underage user" },
  { value: "HATE_SPEECH", label: "Hate speech" },
  { value: "OTHER", label: "Other" },
];

const TYPE_LABEL = {
  USER: "user",
  JOB_POST: "job post",
  POST: "community post",
  REVIEW: "review",
  BOOKING: "booking",
  MESSAGE: "message",
};

const URL_RE = /^https?:\/\/\S+$/i;

export default function ReportButton({
  targetType,
  targetId,
  targetName,
  variant = "button",
  onSuccess,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [open, setOpen] = useState(false);

  if (!targetType || !targetId) return null;

  const label =
    variant === "icon"
      ? null
      : variant === "link"
        ? `Report this ${TYPE_LABEL[targetType] || "content"}`
        : "Report";

  return (
    <>
      {variant === "icon" ? (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.iconTrigger,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <FaFlag size={14} color={c.textDim} />
        </Pressable>
      ) : variant === "link" ? (
        <Pressable onPress={() => setOpen(true)}>
          <AppText
            style={{
              fontSize: 12,
              color: c.textMuted,
              textDecorationLine: "underline",
            }}
          >
            {label}
          </AppText>
        </Pressable>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          style={({ pressed }) => [
            styles.btnTrigger,
            {
              backgroundColor: c.bgCard,
              borderColor: c.border,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <FaFlag size={12} color={c.textDim} />
          <AppText
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: c.textDim,
              marginLeft: 5,
            }}
          >
            Report
          </AppText>
        </Pressable>
      )}

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <ReportModal
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          onClose={() => setOpen(false)}
          onSuccess={onSuccess}
          c={c}
        />
      </Modal>
    </>
  );
}

function ReportModal({
  targetType,
  targetId,
  targetName,
  onClose,
  onSuccess,
  c,
}) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const handleSubmit = async () => {
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const evidenceArr = evidence
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .filter((l) => URL_RE.test(l))
        .slice(0, 5);

      const res = await client.post("/reports", {
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        evidence: evidenceArr,
      });
      setDone({ ref: res.data.data.ref });
      onSuccess?.();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />
      <View
        style={[
          styles.modalSheet,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              gap: 10,
            }}
          >
            <View
              style={[
                styles.modalHeaderIcon,
                { backgroundColor: c.redDim, borderColor: c.red },
              ]}
            >
              <FaFlag size={15} color={c.red} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText
                style={{
                  fontSize: 9,
                  fontWeight: "700",
                  color: c.red,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                }}
              >
                Report
              </AppText>
              <AppText
                style={{
                  fontFamily: "Syne_700Bold",
                  fontSize: 14,
                  fontWeight: "700",
                  color: c.text,
                  marginTop: 2,
                }}
                numberOfLines={2}
              >
                {targetName
                  ? `Report "${targetName}"`
                  : `Report this ${TYPE_LABEL[targetType] || "content"}`}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={onClose}
            hitSlop={6}
            style={[
              styles.closeBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaTimes size={13} color={c.textMuted} />
          </Pressable>
        </View>

        {done ? (
          <View style={styles.doneState}>
            <FaCheckCircle size={44} color={c.green} />
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 16,
                fontWeight: "800",
                color: c.text,
                marginTop: 14,
              }}
            >
              Report submitted
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                textAlign: "center",
                marginTop: 8,
                lineHeight: 18,
              }}
            >
              Reference:{" "}
              <AppText style={{ fontWeight: "700", color: c.text }}>
                {done.ref}
              </AppText>
              {"\n"}
              Our team will review it within 24–48 hours.
            </AppText>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.doneBtn,
                { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 13, fontWeight: "700", color: c.bg }}>
                Done
              </AppText>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  { backgroundColor: c.redDim, borderColor: c.red },
                ]}
              >
                <FaExclamationTriangle size={13} color={c.red} />
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.red,
                    flex: 1,
                    marginLeft: 6,
                  }}
                >
                  {error}
                </AppText>
              </View>
            ) : null}

            {/* Reason */}
            <View>
              <AppText style={styles.label(c)}>
                Reason <AppText style={{ color: c.red }}>*</AppText>
              </AppText>
              <View style={styles.reasonGrid}>
                {REASONS.map((r) => {
                  const active = reason === r.value;
                  return (
                    <Pressable
                      key={r.value}
                      onPress={() => {
                        setReason(r.value);
                        setError("");
                      }}
                      style={({ pressed }) => [
                        styles.reasonChip,
                        {
                          backgroundColor: active ? c.redDim : c.bgCard,
                          borderColor: active ? c.red : c.border,
                          opacity: pressed && !active ? 0.85 : 1,
                        },
                      ]}
                    >
                      {active ? (
                        <FaCheckCircle size={10} color={c.red} />
                      ) : null}
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: active ? c.red : c.textDim,
                          marginLeft: active ? 4 : 0,
                        }}
                        numberOfLines={2}
                      >
                        {r.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View>
              <AppText style={styles.label(c)}>
                Additional details{" "}
                <AppText
                  style={{
                    color: c.textMuted,
                    fontWeight: "400",
                    textTransform: "none",
                  }}
                >
                  (optional)
                </AppText>
              </AppText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe what happened. The more detail you provide, the faster we can act."
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={3}
                maxLength={1000}
                style={[
                  styles.textarea,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    color: c.text,
                  },
                ]}
              />
              <AppText
                style={{
                  fontSize: 10,
                  color: c.textMuted,
                  textAlign: "right",
                  marginTop: 4,
                }}
              >
                {description.length}/1000
              </AppText>
            </View>

            {/* Evidence */}
            <View>
              <AppText style={styles.label(c)}>
                Evidence URLs{" "}
                <AppText
                  style={{
                    color: c.textMuted,
                    fontWeight: "400",
                    textTransform: "none",
                  }}
                >
                  (optional, one per line, max 5)
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
                numberOfLines={2}
                style={[
                  styles.textarea,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    color: c.text,
                  },
                ]}
              />
            </View>

            <View
              style={[
                styles.disclaimer,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText
                style={{
                  fontSize: 11,
                  color: c.textMuted,
                  lineHeight: 16,
                }}
              >
                False or malicious reports may result in action against your
                account. Reports are reviewed by our moderation team and are
                confidential.
              </AppText>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: c.textDim,
                  }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={loading || !reason}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: c.red,
                    opacity: loading || !reason ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {loading ? (
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                  >
                    Submitting...
                  </AppText>
                ) : (
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                  >
                    Submit Report
                  </AppText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btnTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  iconTrigger: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  modalSheet: {
    maxHeight: "90%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 2,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalHeaderIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  label: (c) => ({
    fontSize: 10,
    fontWeight: "700",
    color: c.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  }),
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: "100%",
  },
  textarea: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: "top",
  },
  disclaimer: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  doneState: {
    padding: 28,
    alignItems: "center",
  },
  doneBtn: {
    marginTop: 20,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 20,
  },
});
