// src/components/booking/RaiseDisputeSheet.js
//
// Verbatim port of components/disputes/RaiseDisputeModal.jsx.
//
// POST /disputes/raise with multipart/form-data:
//   bookingId     — string
//   reason        — one of REASONS[].value (enum)
//   description   — 20–500 chars
//   files[]       — optional evidence (images/PDFs)
//
// Mobile port notes:
//   · Web uses <input type="file" multiple>, ported to expo-image-picker +
//     expo-document-picker (both guarded — install one to enable uploads)
//   · File previews use Image for images; PDFs render as a chip
//   · No client-side file size cap in the web; we cap at 10MB per file to
//     protect the mobile network

import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import {
  FaExclamationTriangle,
  FaTimes,
  FaImage,
  FaTrashAlt,
  FaFileImage,
} from "../../icons/fa";

// Optional expo modules — guarded so the file compiles without them
let ImagePicker = null;
let DocumentPicker = null;
try {
  ImagePicker = require("expo-image-picker");
} catch {}
try {
  DocumentPicker = require("expo-document-picker");
} catch {}

// ── Reason enum — verbatim from web ─────────────────────────────────────
const REASONS = [
  { value: "PAYMENT_NOT_RELEASED", label: "Payment not released" },
  { value: "WORK_NOT_COMPLETED", label: "Work not completed" },
  { value: "POOR_QUALITY_WORK", label: "Poor quality of work" },
  { value: "NO_SHOW", label: "Worker/Hirer no-show" },
  { value: "OVERCHARGING", label: "Overcharging / wrong amount" },
  { value: "HARASSMENT", label: "Harassment or misconduct" },
  { value: "DAMAGE_TO_PROPERTY", label: "Damage to property" },
  { value: "OTHER", label: "Other" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file (mobile safety cap)
const MAX_DESC = 500;
const MIN_DESC = 20;

export default function RaiseDisputeSheet({
  bookingId,
  bookingTitle,
  onClose,
  onSuccess,
}) {
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setReason("");
    setDescription("");
    setFiles([]);
    setError("");
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  // ── File pickers ────────────────────────────────────────────────────
  const addFiles = (newFiles) => {
    const sizeChecked = [];
    for (const f of newFiles) {
      if (f.size && f.size > MAX_FILE_SIZE) {
        toast.error(
          `"${f.name}" is ${(f.size / (1024 * 1024)).toFixed(1)}MB — max 10MB.`,
        );
        continue;
      }
      sizeChecked.push(f);
    }
    if (sizeChecked.length) setFiles((prev) => [...prev, ...sizeChecked]);
  };

  const pickImages = async () => {
    if (!ImagePicker) {
      toast.info("Install expo-image-picker to attach images.");
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.error("Media library permission required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.85,
      });
      if (result.canceled) return;
      addFiles(
        result.assets.map((a, i) => ({
          uri: a.uri,
          name: a.fileName || `evidence_${Date.now()}_${i}.jpg`,
          type: a.mimeType || "image/jpeg",
          size: a.fileSize,
        })),
      );
    } catch {
      toast.error("Could not pick images.");
    }
  };

  const pickDoc = async () => {
    if (!DocumentPicker) {
      toast.info("Install expo-document-picker to attach PDFs.");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      addFiles(
        result.assets.map((a) => ({
          uri: a.uri,
          name: a.name || `evidence_${Date.now()}.pdf`,
          type: a.mimeType || "application/pdf",
          size: a.size,
        })),
      );
    } catch {
      toast.error("Could not pick documents.");
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError("");

    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    if (description.trim().length < MIN_DESC) {
      setError(
        `Please provide a description of at least ${MIN_DESC} characters.`,
      );
      return;
    }

    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("bookingId", String(bookingId));
      form.append("reason", reason);
      form.append("description", description.trim());
      files.forEach((f, i) => {
        form.append("files", {
          uri: f.uri,
          name:
            f.name || `evidence_${i}.${(f.type || "").split("/")[1] || "jpg"}`,
          type: f.type || "application/octet-stream",
        });
      });

      await client.post("/disputes/raise", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onSuccess?.();
      toast.success("Dispute raised. Our team will review within 24–48 hours.");
      reset();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to raise dispute.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.sheet,
            { backgroundColor: c.bgPanel, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <AppText
                  style={{
                    fontFamily: "Syne_800ExtraBold",
                    fontSize: 20,
                    fontWeight: "800",
                    color: c.text,
                    letterSpacing: -0.4,
                  }}
                >
                  Raise a Dispute
                </AppText>
                {bookingTitle ? (
                  <AppText
                    style={{
                      fontSize: 12,
                      color: c.textDim,
                      marginTop: 2,
                    }}
                    numberOfLines={1}
                  >
                    For: {bookingTitle}
                  </AppText>
                ) : null}
              </View>
              <Pressable
                onPress={handleClose}
                disabled={submitting}
                hitSlop={8}
                style={[
                  styles.closeBtn,
                  {
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                    opacity: submitting ? 0.4 : 1,
                  },
                ]}
              >
                <FaTimes size={14} color={c.textDim} />
              </Pressable>
            </View>

            {/* Warning banner */}
            <View
              style={[
                styles.warnBox,
                {
                  backgroundColor: c.orangeDim,
                  borderColor: c.orangeGlow,
                },
              ]}
            >
              <FaExclamationTriangle
                size={12}
                color={c.orange}
                style={{ marginTop: 2 }}
              />
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textDim,
                  flex: 1,
                  marginLeft: 8,
                  lineHeight: 18,
                }}
              >
                Disputes are reviewed by our support team within 24–48 hours.
                Please provide as much detail as possible.
              </AppText>
            </View>

            {/* Reason picker */}
            <AppText style={[styles.label, { color: c.textDim }]}>
              REASON *
            </AppText>
            <View style={styles.reasonPills}>
              {REASONS.map((r) => {
                const active = reason === r.value;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => {
                      if (submitting) return;
                      setReason(r.value);
                      setError("");
                    }}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? c.orange : c.bgInput,
                        borderColor: active ? c.orange : c.border,
                        opacity: pressed && !active ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: active ? "#fff" : c.text,
                      }}
                    >
                      {r.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>

            {/* Description */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
                marginBottom: 6,
              }}
            >
              <AppText
                style={[
                  styles.label,
                  { color: c.textDim, marginTop: 0, marginBottom: 0 },
                ]}
              >
                DESCRIPTION *
              </AppText>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {description.length}/{MAX_DESC}
              </AppText>
            </View>
            <TextInput
              value={description}
              onChangeText={(v) => {
                if (submitting) return;
                setDescription(v.slice(0, MAX_DESC));
                setError("");
              }}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="Describe the issue in detail. Include dates, amounts, and any relevant context that will help our team resolve this quickly…"
              placeholderTextColor={c.textMuted}
              editable={!submitting}
              style={[
                styles.textarea,
                {
                  color: c.text,
                  borderColor: c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            />

            {/* Evidence upload */}
            <AppText
              style={[styles.label, { color: c.textDim, marginTop: 14 }]}
            >
              <FaImage size={10} color={c.textDim} /> EVIDENCE (OPTIONAL)
              {files.length > 0
                ? ` · ${files.length} file${files.length !== 1 ? "s" : ""}`
                : ""}
            </AppText>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={pickImages}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.uploadBtn,
                  {
                    borderColor: c.border,
                    backgroundColor: c.bgCard,
                    opacity: submitting ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaFileImage size={12} color={c.textDim} />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: c.textDim,
                    marginLeft: 6,
                  }}
                >
                  Images
                </AppText>
              </Pressable>
              <Pressable
                onPress={pickDoc}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.uploadBtn,
                  {
                    borderColor: c.border,
                    backgroundColor: c.bgCard,
                    opacity: submitting ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaFileImage size={12} color={c.textDim} />
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: c.textDim,
                    marginLeft: 6,
                  }}
                >
                  PDF
                </AppText>
              </Pressable>
            </View>

            {/* File previews */}
            {files.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginTop: 10 }}
                contentContainerStyle={{ gap: 8, paddingRight: 8 }}
              >
                {files.map((f, idx) => {
                  const isImage = (f.type || "").startsWith("image/");
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.fileChip,
                        { backgroundColor: c.bgInput, borderColor: c.border },
                      ]}
                    >
                      {isImage ? (
                        <Image
                          source={{ uri: f.uri }}
                          style={styles.fileThumb}
                        />
                      ) : (
                        <View
                          style={[
                            styles.fileThumb,
                            styles.pdfThumb,
                            { backgroundColor: c.bgCard },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "700",
                              color: c.textDim,
                            }}
                          >
                            PDF
                          </AppText>
                        </View>
                      )}
                      <AppText
                        style={{
                          fontSize: 9,
                          color: c.textDim,
                          marginTop: 4,
                          maxWidth: 60,
                        }}
                        numberOfLines={1}
                      >
                        {f.name}
                      </AppText>
                      <Pressable
                        onPress={() => removeFile(idx)}
                        disabled={submitting}
                        hitSlop={6}
                        style={[
                          styles.removeBtn,
                          { backgroundColor: "rgba(0,0,0,0.6)" },
                        ]}
                      >
                        <FaTrashAlt size={8} color="#fff" />
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
            ) : null}

            {/* Error */}
            {error ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: c.redDim,
                    borderColor: "rgba(239,68,68,0.3)",
                  },
                ]}
              >
                <FaExclamationTriangle size={11} color={c.red} />
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.red,
                    marginLeft: 6,
                    flex: 1,
                    lineHeight: 18,
                  }}
                >
                  {error}
                </AppText>
              </View>
            ) : null}

            {/* Submit row */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 20 }}>
              <Pressable
                onPress={handleClose}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.cancelBtn,
                  {
                    borderColor: c.border,
                    opacity: submitting ? 0.4 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.submitBtn,
                  {
                    backgroundColor: submitting ? c.bgCard : c.red,
                    opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
                  >
                    Submit Dispute
                  </AppText>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "92%",
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  warnBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  reasonPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    fontSize: 14,
    lineHeight: 20,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  fileChip: {
    width: 72,
    padding: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    position: "relative",
  },
  fileThumb: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  pdfThumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  submitBtn: {
    flex: 1.5,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
  },
});
