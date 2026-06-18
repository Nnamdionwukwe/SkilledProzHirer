// src/screens/main/worker/WorkerCertificationsScreen.js
// Mirrors: website /worker/certifications
// APIs:
//   GET  /workers/:userId             — load certifications
//   POST /workers/certifications      — FormData: name, issuedBy, issueDate?, expiryDate?, document?
//   DELETE /workers/certifications/:certId  (via workerAuth.js deleteCertification)

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import AppScreen from "../../../components/AppScreen";
import AppText from "../../../components/AppText";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

const SCREEN_W = Dimensions.get("window").width;

// ─── Date picker field ────────────────────────────────────────────────────────
function DateField({ label, value, onChange, c }) {
  const [show, setShow] = useState(false);

  const dateValue = value ? new Date(value) : new Date();
  const display = value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "dd/mm/yyyy";

  const handleChange = (event, selected) => {
    if (Platform.OS === "android") setShow(false);
    if (selected) {
      onChange(selected.toISOString().split("T")[0]);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppText variant="small" weight="semibold" style={cert.label}>
        {label}
      </AppText>
      <Pressable
        onPress={() => setShow(true)}
        style={[
          cert.input,
          cert.dateField,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <AppText
          variant="body"
          style={{ flex: 1, color: value ? c.text : c.textMuted }}
        >
          {display}
        </AppText>
        <Ionicons name="calendar-outline" size={18} color={c.textMuted} />
      </Pressable>

      {/* iOS — wrap in Modal */}
      {Platform.OS === "ios" && show && (
        <Modal
          transparent
          animationType="slide"
          onRequestClose={() => setShow(false)}
        >
          <Pressable style={cert.dateBackdrop} onPress={() => setShow(false)}>
            <View style={[cert.dateSheet, { backgroundColor: c.bgCard }]}>
              <Pressable
                onPress={() => setShow(false)}
                style={{ alignSelf: "flex-end", padding: 12 }}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  Done
                </AppText>
              </Pressable>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                textColor={c.text}
                style={{ width: SCREEN_W - 32 }}
              />
            </View>
          </Pressable>
        </Modal>
      )}

      {/* Android — renders as dialog automatically */}
      {Platform.OS === "android" && show && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}
    </View>
  );
}

// ─── Cert row ─────────────────────────────────────────────────────────────────
function CertRow({ cert: c2, onDelete, c }) {
  const isExpired = c2.expiryDate && new Date(c2.expiryDate) < new Date();

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-NG", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const handleView = () => {
    if (!c2.documentUrl) return;
    Linking.openURL(c2.documentUrl).catch(() => {});
  };

  return (
    <View style={[cert.certRow, { borderBottomColor: c.border }]}>
      {/* Medal icon */}
      <View
        style={[
          cert.medal,
          {
            backgroundColor: isExpired
              ? "rgba(239,68,68,0.12)"
              : "rgba(34,197,94,0.12)",
          },
        ]}
      >
        <AppText style={{ fontSize: 26 }}>🏅</AppText>
      </View>

      {/* Info */}
      <View style={{ flex: 1 }}>
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: c.text, marginBottom: 2 }}
        >
          {c2.name}
        </AppText>
        <AppText variant="small" tone="dim">
          Issued by {c2.issuedBy} · {fmtDate(c2.issueDate)}
          {c2.expiryDate ? ` · Expires ${fmtDate(c2.expiryDate)}` : ""}
        </AppText>
      </View>

      {/* Actions */}
      <View style={{ gap: 6, alignItems: "flex-end" }}>
        {isExpired && (
          <View
            style={[
              cert.expiredBadge,
              {
                backgroundColor: "rgba(239,68,68,0.15)",
                borderColor: "#ef4444",
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: "#ef4444", fontSize: 10 }}
            >
              EXPIRED
            </AppText>
          </View>
        )}
        {c2.documentUrl && (
          <Pressable
            onPress={handleView}
            style={[cert.viewBtn, { borderColor: c.border }]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text }}
            >
              View
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerCertificationsScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;

  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [docFile, setDocFile] = useState(null);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/workers/${user.id}`);
      setCerts(res.data.data?.worker?.certifications ?? []);
    } catch {
      toast.error("Could not load certifications");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Pick document ───────────────────────────────────────────────────────────
  const pickDocument = async () => {
    const r = await DocumentPicker.getDocumentAsync({
      type: ["application/pdf", "image/*"],
      copyToCacheDirectory: true,
    });
    if (!r.canceled && r.assets?.[0]) setDocFile(r.assets[0]);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error("Certification name is required");
      return;
    }
    if (!issuedBy.trim()) {
      toast.error("Issuing body is required");
      return;
    }

    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("issuedBy", issuedBy.trim());
    if (issueDate) formData.append("issueDate", issueDate);
    if (expiryDate) formData.append("expiryDate", expiryDate);
    if (docFile)
      formData.append("document", {
        uri: docFile.uri,
        name: docFile.name,
        type: docFile.mimeType ?? "application/pdf",
      });

    setSaving(true);
    try {
      await client.post("/workers/certifications", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setName("");
      setIssuedBy("");
      setIssueDate("");
      setExpiryDate("");
      setDocFile(null);
      toast.success("Certification added!");
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Failed to add certification",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40, gap: 16 }}
    >
      {/* ── Add Certification ── */}
      <View
        style={[
          cert.card,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 16 }}
        >
          Add Certification
        </AppText>

        {/* Name + Issued By */}
        <View style={cert.row2}>
          <View style={{ flex: 1 }}>
            <AppText variant="small" weight="semibold" style={cert.label}>
              Certification Name *
            </AppText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. City & Guilds Electrical"
              placeholderTextColor={c.textMuted}
              style={[
                cert.input,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                },
              ]}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="small" weight="semibold" style={cert.label}>
              Issued By *
            </AppText>
            <TextInput
              value={issuedBy}
              onChangeText={setIssuedBy}
              placeholder="e.g. City & Guilds UK"
              placeholderTextColor={c.textMuted}
              style={[
                cert.input,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                },
              ]}
            />
          </View>
        </View>

        {/* Issue Date + Expiry Date */}
        <View style={[cert.row2, { marginTop: 14 }]}>
          <DateField
            label="Issue Date"
            value={issueDate}
            onChange={setIssueDate}
            c={c}
          />
          <DateField
            label="Expiry Date"
            value={expiryDate}
            onChange={setExpiryDate}
            c={c}
          />
        </View>

        {/* Document */}
        <AppText
          variant="small"
          weight="semibold"
          style={[cert.label, { marginTop: 14 }]}
        >
          Certificate Document (optional)
        </AppText>
        <Pressable
          onPress={pickDocument}
          style={[
            cert.docPicker,
            {
              borderColor: docFile ? c.orange : c.border,
              backgroundColor: docFile ? `${c.orange}08` : c.bgInput,
            },
          ]}
        >
          <Ionicons
            name={docFile ? "document-text" : "attach-outline"}
            size={20}
            color={docFile ? c.orange : c.textMuted}
            style={{ marginRight: 8 }}
          />
          <AppText
            variant="body"
            style={{ flex: 1, color: docFile ? c.orange : c.textMuted }}
            numberOfLines={1}
          >
            {docFile ? docFile.name : "Choose file — PDF, JPG, PNG"}
          </AppText>
          {docFile && (
            <Pressable onPress={() => setDocFile(null)} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          )}
        </Pressable>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={saving}
          style={[
            cert.submitBtn,
            {
              backgroundColor: c.orange,
              opacity: saving ? 0.75 : 1,
              marginTop: 16,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
              + Add Certification
            </AppText>
          )}
        </Pressable>
      </View>

      {/* ── Certifications List ── */}
      <View
        style={[
          cert.card,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 16 }}
        >
          My Certifications ({certs.length})
        </AppText>

        {certs.length === 0 ? (
          <View style={cert.empty}>
            <AppText style={{ fontSize: 44, marginBottom: 10 }}>🏅</AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginBottom: 4 }}
            >
              No certifications added
            </AppText>
            <AppText variant="small" tone="dim" style={{ textAlign: "center" }}>
              Add your trade certifications to build trust with clients
            </AppText>
          </View>
        ) : (
          certs.map((c2) => <CertRow key={c2.id} cert={c2} c={c} />)
        )}
      </View>
    </AppScreen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const cert = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  row2: { flexDirection: "row", gap: 12 },
  label: {
    color: "#6b7280",
    letterSpacing: 0.6,
    fontSize: 11,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  dateField: { flexDirection: "row", alignItems: "center", height: 50 },
  dateBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  dateSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    alignItems: "center",
  },

  docPicker: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  submitBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },

  certRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  medal: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  expiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  viewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },

  empty: { paddingVertical: 36, alignItems: "center" },
});
