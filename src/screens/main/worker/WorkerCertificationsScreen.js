// src/screens/main/worker/WorkerCertificationsScreen.js
// Verbatim port of pages/worker/certifications/CertificationsPage.jsx.
//
// Endpoints:
//   GET    /workers/:id                          → worker.certifications
//   POST   /workers/certifications               → multipart
//   DELETE /workers/certifications/:id

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const isExpired = (d) => d && new Date(d) < new Date();

const isImageUrl = (url) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpg|jpeg|png|webp|gif)$/.test(clean);
};

const isPdfUrl = (url) => {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.pdf$/.test(clean);
};

function certStatus(cert) {
  if (cert?.verified) return "verified";
  if (cert?.rejectionReason) return "rejected";
  return "pending";
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = "danger",
  c,
}) {
  if (!isOpen) return null;
  const confirmColor =
    confirmVariant === "primary"
      ? c.orange
      : confirmVariant === "warning"
        ? "#fbbf24"
        : c.red;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.72)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: 22,
            borderRadius: 16,
            borderWidth: 1,
            backgroundColor: c.bgPanel,
            borderColor: c.border,
          }}
        >
          <AppText
            weight="displayBlack"
            style={{ fontSize: 16, color: c.text, marginBottom: 8 }}
          >
            {title}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            {message}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: "transparent",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
              >
                {cancelLabel}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: confirmColor,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
              >
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────────────────────────
function CertStatusBadge({ status, t, c }) {
  const map = {
    verified: {
      color: c.green,
      bg: "rgba(34,197,94,0.12)",
      icon: "checkmark-circle",
      label: t("workerCertifications.status.verified"),
    },
    rejected: {
      color: c.red,
      bg: "rgba(239,68,68,0.12)",
      icon: "close-circle",
      label: t("workerCertifications.status.rejected"),
    },
    pending: {
      color: "#eab308",
      bg: "rgba(234,179,8,0.12)",
      icon: "time-outline",
      label: t("workerCertifications.status.pending"),
    },
  };
  const meta = map[status] || map.pending;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        backgroundColor: meta.bg,
      }}
    >
      <Ionicons name={meta.icon} size={10} color={meta.color} />
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "800",
          color: meta.color,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {meta.label}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function CertificationsSkeleton({ c }) {
  return (
    <View style={{ gap: 10 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            padding: 14,
            borderRadius: 12,
            backgroundColor: c.bgCard,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Skeleton width={44} height={44} radius={10} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={14} radius={4} />
            <Skeleton width="80%" height={10} radius={4} />
          </View>
          <Skeleton width={72} height={34} radius={8} />
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerCertificationsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [documentAsset, setDocumentAsset] = useState(null);
  const [saving, setSaving] = useState(false);

  // Lightbox
  const [lightbox, setLightbox] = useState(null); // { url, name, type }
  const [pdfViewerSrc, setPdfViewerSrc] = useState(null);

  // Delete confirm
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await client.get(`/workers/${user.id}`);
      setData(res.data.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const certs = data?.worker?.certifications || [];

  async function pickDocument() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t("workerCertifications.toast.libraryPermission"));
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setDocumentAsset(result.assets[0]);
  }

  async function handleSubmit() {
    if (!name.trim() || !issuedBy.trim()) {
      toast.error(t("workerCertifications.error.nameRequired"));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("issuedBy", issuedBy.trim());
      if (issueDate) fd.append("issueDate", issueDate);
      if (expiryDate) fd.append("expiryDate", expiryDate);
      if (documentAsset) {
        fd.append("document", {
          uri: documentAsset.uri,
          name: documentAsset.name || `cert-${Date.now()}.pdf`,
          type: documentAsset.mimeType || "application/pdf",
        });
      }
      await client.post("/workers/certifications", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setName("");
      setIssuedBy("");
      setIssueDate("");
      setExpiryDate("");
      setDocumentAsset(null);
      toast.success(t("workerCertifications.success.added"));
      fetchData();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          t("workerCertifications.error.addFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    try {
      await client.delete(`/workers/certifications/${id}`);
      toast.success(t("workerCertifications.success.removed"));
      fetchData();
    } catch {
      toast.error(t("workerCertifications.error.deleteFailed"));
    }
  }

  function openDocument(url, displayName) {
    if (!url) return;
    if (isPdfUrl(url)) {
      setPdfViewerSrc(url);
    } else if (isImageUrl(url)) {
      setLightbox({ url, name: displayName, type: "image" });
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Header */}
      <View style={{ marginBottom: 4, marginTop: 4 }}>
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 22,
            color: c.text,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t("workerCertifications.list.title")}
        </AppText>
        <AppText style={{ fontSize: 13, color: c.textDim }}>
          {t("workerCertifications.list.subtitle")}
        </AppText>
      </View>

      {/* Add form */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 18,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 14,
          }}
        >
          <Ionicons name="add-circle-outline" size={16} color={c.orange} />
          <AppText
            weight="displayBlack"
            style={{ fontSize: 16, color: c.text }}
          >
            {t("workerCertifications.add.title")}
          </AppText>
        </View>

        {/* Certification Name */}
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.textDim,
            marginBottom: 4,
          }}
        >
          {t("workerCertifications.add.name")}{" "}
          <AppText style={{ color: c.red }}>*</AppText>
        </AppText>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t("workerCertifications.add.namePlaceholder")}
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />

        {/* Issued By */}
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.textDim,
            marginBottom: 4,
            marginTop: 12,
          }}
        >
          {t("workerCertifications.add.issuedBy")}{" "}
          <AppText style={{ color: c.red }}>*</AppText>
        </AppText>
        <TextInput
          value={issuedBy}
          onChangeText={setIssuedBy}
          placeholder={t("workerCertifications.add.issuedByPlaceholder")}
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />

        {/* Issue Date */}
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.textDim,
            marginBottom: 4,
            marginTop: 12,
          }}
        >
          {t("workerCertifications.add.issueDate")}
        </AppText>
        <TextInput
          value={issueDate}
          onChangeText={setIssueDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />

        {/* Expiry Date */}
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.textDim,
            marginBottom: 4,
            marginTop: 12,
          }}
        >
          {t("workerCertifications.add.expiryDate")}
        </AppText>
        <TextInput
          value={expiryDate}
          onChangeText={setExpiryDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={c.textMuted}
          style={inputStyle(c)}
        />

        {/* Document picker */}
        <AppText
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.textDim,
            marginBottom: 6,
            marginTop: 12,
          }}
        >
          {t("workerCertifications.add.document")}
        </AppText>
        <Pressable
          onPress={pickDocument}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingVertical: 12,
            paddingHorizontal: 14,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: c.border,
            borderStyle: "dashed",
            backgroundColor: c.bgInput,
            opacity: pressed ? 0.85 : 1,
            marginBottom: 16,
          })}
        >
          <Ionicons name="cloud-upload-outline" size={20} color={c.orange} />
          <AppText
            style={{ flex: 1, fontSize: 12, color: c.textDim }}
            numberOfLines={1}
          >
            {documentAsset
              ? documentAsset.name
              : t("workerCertifications.add.documentPlaceholder")}
          </AppText>
        </Pressable>

        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: c.orange,
            opacity: saving ? 0.5 : pressed ? 0.9 : 1,
          })}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="add" size={16} color="#fff" />
              <AppText
                style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
              >
                {t("workerCertifications.add.button")}
              </AppText>
            </>
          )}
        </Pressable>
      </View>

      {/* List */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 18,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 14,
          }}
        >
          <Ionicons name="ribbon-outline" size={16} color={c.orange} />
          <AppText
            weight="displayBlack"
            style={{ fontSize: 16, color: c.text }}
          >
            {t("workerCertifications.list.myTitle")}
          </AppText>
          <AppText style={{ fontSize: 13, color: c.textDim }}>
            ({certs.length})
          </AppText>
        </View>

        {loading ? (
          <CertificationsSkeleton c={c} />
        ) : certs.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, gap: 8 }}>
            <Ionicons
              name="ribbon-outline"
              size={42}
              color={c.textDim}
              style={{ opacity: 0.5 }}
            />
            <AppText
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: c.textDim,
                textAlign: "center",
              }}
            >
              {t("workerCertifications.list.emptyTitle")}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textMuted,
                textAlign: "center",
                maxWidth: 280,
              }}
            >
              {t("workerCertifications.list.emptySub")}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {certs.map((cert) => {
              const expired = isExpired(cert.expiryDate);
              const hasDoc = !!cert.documentUrl;
              const img = hasDoc && isImageUrl(cert.documentUrl);
              const pdf = hasDoc && isPdfUrl(cert.documentUrl);
              const status = certStatus(cert);

              return (
                <View
                  key={cert.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: c.bgCard,
                    borderWidth: 1,
                    borderColor: c.border,
                  }}
                >
                  {/* Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: expired
                        ? "rgba(239,68,68,0.12)"
                        : "rgba(34,197,94,0.12)",
                      borderWidth: 1,
                      borderColor: expired
                        ? "rgba(239,68,68,0.2)"
                        : "rgba(34,197,94,0.2)",
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons
                      name="ribbon"
                      size={22}
                      color={expired ? c.red : c.green}
                    />
                  </View>

                  {/* Body */}
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <AppText
                        weight="displayBlack"
                        style={{ fontSize: 14, color: c.text }}
                      >
                        {cert.name}
                      </AppText>
                      <CertStatusBadge status={status} t={t} c={c} />
                      {expired ? (
                        <View
                          style={{
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 999,
                            backgroundColor: "rgba(239,68,68,0.12)",
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "800",
                              color: c.red,
                              textTransform: "uppercase",
                              letterSpacing: 0.5,
                            }}
                          >
                            {t("workerCertifications.list.expired")}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons
                          name="person-outline"
                          size={10}
                          color={c.textMuted}
                        />
                        <AppText style={{ fontSize: 11, color: c.textMuted }}>
                          {cert.issuedBy || "—"}
                        </AppText>
                      </View>
                      {cert.issueDate ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={10}
                            color={c.textMuted}
                          />
                          <AppText style={{ fontSize: 11, color: c.textMuted }}>
                            {fmtDate(cert.issueDate)}
                          </AppText>
                        </View>
                      ) : null}
                      {cert.expiryDate ? (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={10}
                            color={expired ? c.red : c.textMuted}
                          />
                          <AppText
                            style={{
                              fontSize: 11,
                              color: expired ? c.red : c.textMuted,
                            }}
                          >
                            {t("workerCertifications.list.expires", {
                              date: fmtDate(cert.expiryDate),
                            })}
                          </AppText>
                        </View>
                      ) : null}
                    </View>

                    {status === "rejected" && cert.rejectionReason ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: 6,
                          marginTop: 4,
                          padding: 8,
                          borderRadius: 8,
                          backgroundColor: "rgba(239,68,68,0.08)",
                          borderWidth: 1,
                          borderColor: "rgba(239,68,68,0.2)",
                        }}
                      >
                        <Ionicons
                          name="alert-circle-outline"
                          size={12}
                          color={c.red}
                          style={{ marginTop: 1 }}
                        />
                        <AppText
                          style={{
                            flex: 1,
                            fontSize: 11,
                            color: c.red,
                            lineHeight: 16,
                          }}
                        >
                          {cert.rejectionReason}
                        </AppText>
                      </View>
                    ) : null}

                    {status === "verified" && cert.verifiedAt ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          marginTop: 4,
                        }}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={12}
                          color={c.green}
                        />
                        <AppText style={{ fontSize: 11, color: c.green }}>
                          {t("workerCertifications.list.verifiedOn", {
                            date: fmtDate(cert.verifiedAt),
                          })}
                        </AppText>
                      </View>
                    ) : null}

                    {/* Actions row */}
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      {hasDoc && (img || pdf) ? (
                        <Pressable
                          onPress={() =>
                            openDocument(cert.documentUrl, cert.name)
                          }
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: c.bgPanel,
                            opacity: pressed ? 0.85 : 1,
                          })}
                        >
                          <Ionicons
                            name="eye-outline"
                            size={12}
                            color={c.textDim}
                          />
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: c.textDim,
                            }}
                          >
                            {t("workerCertifications.list.view")}
                          </AppText>
                        </Pressable>
                      ) : null}
                      {hasDoc && !img && !pdf ? (
                        <Pressable
                          onPress={() =>
                            openDocument(cert.documentUrl, cert.name)
                          }
                          style={({ pressed }) => ({
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: c.border,
                            backgroundColor: c.bgPanel,
                            opacity: pressed ? 0.85 : 1,
                          })}
                        >
                          <Ionicons
                            name="open-outline"
                            size={12}
                            color={c.textDim}
                          />
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: c.textDim,
                            }}
                          >
                            {t("workerCertifications.list.open")}
                          </AppText>
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() => setConfirmDeleteId(cert.id)}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: "rgba(239,68,68,0.3)",
                          backgroundColor: "rgba(239,68,68,0.08)",
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={12}
                          color={c.red}
                        />
                        <AppText
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: c.red,
                          }}
                        >
                          {t("workerCertifications.list.remove")}
                        </AppText>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Image lightbox */}
      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.94)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              zIndex: 2,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {lightbox ? (
            <>
              <Image
                source={{ uri: lightbox.url }}
                style={{ width: "100%", height: "70%" }}
                resizeMode="contain"
              />
              {lightbox.name ? (
                <AppText
                  weight="displayBlack"
                  style={{
                    marginTop: 16,
                    fontSize: 16,
                    color: "#fff",
                    textAlign: "center",
                  }}
                >
                  {lightbox.name}
                </AppText>
              ) : null}
            </>
          ) : null}
        </View>
      </Modal>

      {/* PDF viewer */}
      <Modal
        visible={!!pdfViewerSrc}
        animationType="slide"
        onRequestClose={() => setPdfViewerSrc(null)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.bg }}
          edges={["top", "bottom"]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
              backgroundColor: c.bgPanel,
            }}
          >
            <Pressable
              onPress={() => setPdfViewerSrc(null)}
              hitSlop={8}
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={20} color={c.text} />
            </Pressable>
            <AppText
              style={{ fontSize: 14, fontWeight: "600", color: c.text }}
              numberOfLines={1}
            >
              {t("workerCertifications.pdfViewerTitle")}
            </AppText>
            <View style={{ width: 20 }} />
          </View>
          {pdfViewerSrc ? (
            <WebView
              source={{
                uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfViewerSrc)}`,
              }}
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: c.bg,
                  }}
                >
                  <ActivityIndicator size="large" color={c.orange} />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        title={t("workerCertifications.delete.title")}
        message={t("workerCertifications.delete.message")}
        confirmLabel={t("workerCertifications.delete.confirm")}
        cancelLabel={t("workerCertifications.delete.cancel")}
        confirmVariant="danger"
        c={c}
      />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INPUT STYLE HELPER
// ─────────────────────────────────────────────────────────────────────────────
function inputStyle(c) {
  return {
    backgroundColor: c.bgInput,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: c.text,
    fontSize: 13,
    width: "100%",
  };
}
