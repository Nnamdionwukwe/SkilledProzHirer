// src/components/booking/RaiseDisputeSheet.js
import React, { useState } from "react";
import {
  View,
  Modal,
  ScrollView,
  TextInput,
  Pressable,
  StyleSheet,
  Image,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import {
  FaExclamationTriangle,
  FaTimes,
  FaImage,
  FaTrashAlt,
  FaSpinner,
  FaFileImage,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

export default function RaiseDisputeSheet({
  bookingId,
  bookingTitle,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const REASONS = [
    {
      value: "PAYMENT_NOT_RELEASED",
      label: t("booking.dispute.reasons.paymentNotReleased"),
    },
    {
      value: "WORK_NOT_COMPLETED",
      label: t("booking.dispute.reasons.workNotCompleted"),
    },
    {
      value: "POOR_QUALITY_WORK",
      label: t("booking.dispute.reasons.poorQuality"),
    },
    { value: "NO_SHOW", label: t("booking.dispute.reasons.noShow") },
    { value: "OVERCHARGING", label: t("booking.dispute.reasons.overcharging") },
    { value: "HARASSMENT", label: t("booking.dispute.reasons.harassment") },
    { value: "DAMAGE_TO_PROPERTY", label: t("booking.dispute.reasons.damage") },
    { value: "OTHER", label: t("booking.dispute.reasons.other") },
  ];

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!res.canceled) {
      setFiles((prev) => [
        ...prev,
        ...res.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `image-${Date.now()}.jpg`,
          type: a.mimeType || "image/jpeg",
        })),
      ]);
    }
  };

  const pickDoc = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!res.canceled) {
      setFiles((prev) => [
        ...prev,
        ...res.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          type: a.mimeType || "application/pdf",
        })),
      ]);
    }
  };

  const removeFile = (i) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError("");
    if (!reason) return setError(t("booking.dispute.reasonRequired"));
    if (!description.trim() || description.trim().length < 20) {
      return setError(t("booking.dispute.descriptionTooShort"));
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("bookingId", bookingId);
      formData.append("reason", reason);
      formData.append("description", description);
      files.forEach((f) => {
        formData.append("files", { uri: f.uri, name: f.name, type: f.type });
      });
      await client.post("/disputes/raise", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || t("booking.dispute.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: c.bgPanel, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <AppText weight="bold" style={{ fontSize: 18 }}>
                  {t("booking.dispute.title")}
                </AppText>
                {bookingTitle && (
                  <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
                    {t("booking.dispute.for", { title: bookingTitle })}
                  </AppText>
                )}
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <FaTimes size={18} color={c.textDim} />
              </Pressable>
            </View>

            {/* Warning */}
            <View
              style={[
                styles.warning,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              <FaExclamationTriangle size={14} color={c.orange} />
              <AppText
                variant="small"
                tone="dim"
                style={{ flex: 1, marginLeft: 8 }}
              >
                {t("booking.dispute.warning")}
              </AppText>
            </View>

            {/* Reason */}
            <AppText variant="small" tone="dim" style={styles.label}>
              {t("booking.dispute.reason")} *
            </AppText>
            <View
              style={[
                styles.select,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => setReason(r.value)}
                    style={[
                      styles.reasonRow,
                      { borderBottomColor: c.border },
                      active && { backgroundColor: c.orangeDim },
                    ]}
                  >
                    <AppText
                      variant="small"
                      style={{ color: active ? c.orange : c.text }}
                    >
                      {r.label}
                    </AppText>
                    {active && <FaCheckCircleFallback color={c.orange} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Description */}
            <AppText variant="small" tone="dim" style={styles.label}>
              {t("booking.dispute.description")} *{" "}
              <AppText variant="small" tone="dim">
                {description.length}/500
              </AppText>
            </AppText>
            <TextInput
              multiline
              value={description}
              onChangeText={(v) => setDescription(v.slice(0, 500))}
              placeholder={t("booking.dispute.descriptionPlaceholder")}
              placeholderTextColor={c.textMuted}
              style={[
                styles.textarea,
                {
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
            />

            {/* Evidence */}
            <AppText variant="small" tone="dim" style={styles.label}>
              <FaImage size={11} color={c.textDim} />{" "}
              {t("booking.dispute.evidence")}{" "}
              <AppText variant="small" tone="dim">
                {t("booking.dispute.filesCount", { count: files.length })}
              </AppText>
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={pickImage}
                style={[
                  styles.addFileBtn,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaFileImage size={12} color={c.textDim} />
                <AppText variant="small" style={{ marginLeft: 6 }}>
                  {t("booking.dispute.addFiles")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={pickDoc}
                style={[
                  styles.addFileBtn,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaImage size={12} color={c.textDim} />
                <AppText variant="small" style={{ marginLeft: 6 }}>
                  PDF
                </AppText>
              </Pressable>
            </View>

            {files.length > 0 && (
              <View style={styles.fileGrid}>
                {files.map((f, i) => (
                  <View key={i} style={styles.fileItem}>
                    {f.type?.startsWith("image/") ? (
                      <Image source={{ uri: f.uri }} style={styles.fileImg} />
                    ) : (
                      <View
                        style={[
                          styles.fileImg,
                          {
                            backgroundColor: c.bgInput,
                            alignItems: "center",
                            justifyContent: "center",
                          },
                        ]}
                      >
                        <AppText variant="small" tone="dim">
                          PDF
                        </AppText>
                      </View>
                    )}
                    <Pressable
                      onPress={() => removeFile(i)}
                      style={styles.fileRemove}
                    >
                      <FaTrashAlt size={9} color="#fff" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: "rgba(239,68,68,0.1)",
                    borderColor: "#ef4444",
                  },
                ]}
              >
                <FaExclamationTriangle size={12} color="#ef4444" />
                <AppText
                  variant="small"
                  style={{ color: "#ef4444", marginLeft: 6, flex: 1 }}
                >
                  {error}
                </AppText>
              </View>
            ) : null}

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 16 }}>
              <Pressable
                onPress={onClose}
                disabled={submitting}
                style={[styles.cancelBtn, { borderColor: c.border }]}
              >
                <AppText variant="small" weight="bold" tone="dim">
                  {t("common.cancel")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={[styles.submitBtn, { opacity: submitting ? 0.55 : 1 }]}
              >
                {submitting ? <FaSpinner size={12} color="#fff" /> : null}
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#fff", marginLeft: submitting ? 6 : 0 }}
                >
                  {submitting
                    ? t("booking.dispute.submitting")
                    : t("booking.dispute.submit")}
                </AppText>
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FaCheckCircleFallback({ color }) {
  return <AppText style={{ color }}>✓</AppText>;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "92%",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: { marginTop: 12, marginBottom: 6 },
  select: { borderRadius: 8, borderWidth: 1, overflow: "hidden" },
  reasonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  textarea: {
    minHeight: 100,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
  },
  addFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  fileGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  fileItem: {
    width: 76,
    height: 76,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  fileImg: { width: "100%", height: "100%" },
  fileRemove: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
});
