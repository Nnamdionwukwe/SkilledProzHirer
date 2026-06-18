// src/screens/main/VerificationScreen.js
// Role-aware: Worker  → GET /verification/status  + POST /verification/submit-id
//             Hirer   → GET /verification/hirer/status + POST /verification/hirer/submit

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import {
  getVerificationStatus,
  submitHirerVerification,
  submitIdVerification,
} from "../../api/verification";

const ID_TYPES = [
  { value: "NATIONAL_ID", label: "National ID" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVERS_LICENSE", label: "Driver's License" },
  { value: "VOTERS_CARD", label: "Voter's Card" },
  { value: "RESIDENCE_PERMIT", label: "Residence Permit" },
  { value: "WORK_PERMIT", label: "Work Permit" },
];

const STATUS_META = {
  UNVERIFIED: { emoji: "🔓", color: "#6b7280", label: "Not Verified" },
  PENDING: { emoji: "⏳", color: "#f97316", label: "Pending Review" },
  VERIFIED: { emoji: "✅", color: "#22c55e", label: "Verified" },
  REJECTED: { emoji: "❌", color: "#ef4444", label: "Rejected" },
};

const WHY_VERIFY_HIRER = [
  "Workers trust verified hirers and respond faster",
  "Your profile shows a Verified badge in search",
  "Unlock higher booking frequency and limits",
  "Disputes are resolved faster for verified accounts",
];

const WHY_VERIFY_WORKER = [
  "Verified workers appear higher in search results",
  "Hirers are 3× more likely to book a verified worker",
  "Your profile shows a shield badge ✅",
  "Get access to premium job listings",
];

// Normalize different response shapes into one common shape
function normalize(data, role) {
  if (role === "WORKER") {
    return {
      currentStatus: data.verificationStatus ?? "UNVERIFIED",
      statusMessage: data.statusMessage ?? "",
      latestSubmission: data.lastSubmittedAt
        ? {
            verificationType: "INDIVIDUAL",
            submittedAt: data.lastSubmittedAt,
            documentUrl: data.idDocument ?? null,
            idType: data.submissionData?.idType ?? null,
          }
        : null,
      latestReview: null,
      certifications: data.certifications ?? [],
      backgroundCheck: data.backgroundCheck ?? false,
    };
  }
  return data; // hirer shape already matches
}

function IdTypeModal({ visible, onClose, onSelect, c, modalBg }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={m.backdrop} onPress={onClose}>
        <Pressable
          style={[
            m.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <AppText style={[m.sheetTitle, { color: c.text }]}>
            Select ID Type
          </AppText>
          {ID_TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => {
                onSelect(t);
                onClose();
              }}
              style={[m.option, { borderBottomColor: c.border }]}
            >
              <AppText variant="body" style={{ color: c.text }}>
                {t.label}
              </AppText>
            </Pressable>
          ))}
          <View style={{ height: 24 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DocumentUpload({ label, file, onPick, c }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: c.textMuted, marginBottom: 8, letterSpacing: 0.6 }}
      >
        {label} *
      </AppText>
      <Pressable
        onPress={onPick}
        style={[
          s.uploadBox,
          {
            borderColor: file ? c.orange : c.border,
            backgroundColor: file ? `${c.orange}08` : c.bgInput,
          },
        ]}
      >
        {file ? (
          <View style={{ alignItems: "center", gap: 6 }}>
            <AppText style={{ fontSize: 32 }}>📄</AppText>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange }}
              numberOfLines={1}
            >
              {file.name ?? "Document selected"}
            </AppText>
            <AppText variant="small" style={{ color: c.textMuted }}>
              Tap to change
            </AppText>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 8 }}>
            <AppText style={{ fontSize: 36 }}>🗂️</AppText>
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              Tap to upload
            </AppText>
            <AppText variant="small" style={{ color: c.textMuted }}>
              JPG, PNG or PDF — max 10MB
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function StatusCard({ data, c }) {
  const status = data.currentStatus ?? "UNVERIFIED";
  const meta = STATUS_META[status] ?? STATUS_META.UNVERIFIED;
  const sub = data.latestSubmission;
  const rev = data.latestReview;
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

  return (
    <View
      style={[
        s.statusCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: c.textMuted, letterSpacing: 0.8, marginBottom: 8 }}
      >
        ACCOUNT STATUS
      </AppText>
      <View
        style={[
          s.statusBadge,
          {
            backgroundColor: `${meta.color}22`,
            borderColor: `${meta.color}55`,
          },
        ]}
      >
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: meta.color }}
        >
          {meta.emoji} {meta.label}
        </AppText>
      </View>
      <AppText
        variant="body"
        style={{ color: c.textMuted, marginTop: 10, lineHeight: 22 }}
      >
        {data.statusMessage}
      </AppText>
      {sub?.submittedAt && (
        <AppText variant="small" style={{ color: c.textMuted, marginTop: 6 }}>
          Submitted: {fmtDate(sub.submittedAt)}
        </AppText>
      )}
      {rev?.rejectionReason && (
        <View
          style={[
            s.rejectionBox,
            { backgroundColor: "rgba(239,68,68,0.08)", borderColor: "#ef4444" },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#ef4444", marginBottom: 4 }}
          >
            Rejection reason:
          </AppText>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {rev.rejectionReason}
          </AppText>
        </View>
      )}
    </View>
  );
}

function StateCard({ status, c, onRetry }) {
  if (status === "PENDING")
    return (
      <View
        style={[
          s.stateCard,
          { backgroundColor: `${c.orange}15`, borderColor: `${c.orange}40` },
        ]}
      >
        <AppText style={{ fontSize: 48, lineHeight: 60, textAlign: "center" }}>
          ⏳
        </AppText>
        <AppText style={[s.stateTitle, { color: c.text }]}>
          Verification under review
        </AppText>
        <AppText style={[s.stateBody, { color: c.textMuted }]}>
          Your documents are being reviewed. This usually takes 24–48 hours.
          You'll be notified once complete.
        </AppText>
      </View>
    );
  if (status === "VERIFIED")
    return (
      <View
        style={[
          s.stateCard,
          { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "#22c55e" },
        ]}
      >
        <AppText style={{ fontSize: 48, lineHeight: 60, textAlign: "center" }}>
          ✅
        </AppText>
        <AppText style={[s.stateTitle, { color: c.text }]}>
          Account Verified
        </AppText>
        <AppText style={[s.stateBody, { color: c.textMuted }]}>
          Your account is fully verified and your profile shows a Verified
          badge.
        </AppText>
      </View>
    );
  if (status === "REJECTED")
    return (
      <View
        style={[
          s.stateCard,
          { backgroundColor: "rgba(239,68,68,0.10)", borderColor: "#ef4444" },
        ]}
      >
        <AppText style={{ fontSize: 48, lineHeight: 60, textAlign: "center" }}>
          ❌
        </AppText>
        <AppText style={[s.stateTitle, { color: c.text }]}>
          Verification Rejected
        </AppText>
        <AppText style={[s.stateBody, { color: c.textMuted }]}>
          Please review the reason above and re-submit with a valid document.
        </AppText>
        <Pressable
          onPress={onRetry}
          style={[s.retryBtn, { backgroundColor: c.orange }]}
        >
          <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
            Try Again
          </AppText>
        </Pressable>
      </View>
    );
  return null;
}

function Field({ label, required, c, children }) {
  return (
    <View style={s.fieldWrap}>
      <AppText
        variant="small"
        weight="semibold"
        style={{
          color: c.textMuted,
          letterSpacing: 0.6,
          marginBottom: 8,
          fontSize: 12,
        }}
      >
        {label}
        {required ? " *" : ""}
      </AppText>
      {children}
    </View>
  );
}

export default function VerificationScreen() {
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isWorker = user?.role === "WORKER";
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forceForm, setForceForm] = useState(false);

  // Form — shared
  const [docFile, setDocFile] = useState(null);
  const [idType, setIdType] = useState(null);
  const [showIdModal, setShowIdModal] = useState(false);
  const [idNumber, setIdNumber] = useState("");

  // Form — hirer only
  const [verificationType, setVerificationType] = useState("INDIVIDUAL");
  const [companyName, setCompanyName] = useState("");
  const [companyRegNumber, setCompanyRegNumber] = useState("");
  const [companyCountry, setCompanyCountry] = useState("");
  const [website, setWebsite] = useState("");

  const load = useCallback(async () => {
    try {
      const raw = await getVerificationStatus(user?.role);
      setStatusData(normalize(raw, user?.role));
    } catch {
      setStatusData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const pickDocument = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        toast.error("Permission required to access files");
        return;
      }
      Alert.alert("Upload Document", "Choose source", [
        {
          text: "Photo Library",
          onPress: async () => {
            const r = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });
            if (!r.canceled && r.assets?.[0]) {
              const a = r.assets[0];
              setDocFile({
                uri: a.uri,
                name: a.fileName ?? "photo.jpg",
                mimeType: "image/jpeg",
              });
            }
          },
        },
        {
          text: "Files (PDF / Image)",
          onPress: async () => {
            const r = await DocumentPicker.getDocumentAsync({
              type: ["image/*", "application/pdf"],
              copyToCacheDirectory: true,
            });
            if (!r.canceled && r.assets?.[0]) setDocFile(r.assets[0]);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch {
      toast.error("Could not open file picker");
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (isWorker || verificationType === "INDIVIDUAL") {
      if (!idType) {
        toast.error("Please select an ID type");
        return;
      }
      if (!idNumber.trim()) {
        toast.error("Please enter your ID number");
        return;
      }
    } else {
      // hirer BUSINESS
      if (!companyName.trim()) {
        toast.error("Please enter your company name");
        return;
      }
      if (!companyRegNumber.trim()) {
        toast.error("Please enter your registration number");
        return;
      }
    }
    if (!docFile) {
      toast.error("Please upload a verification document");
      return;
    }

    // Build FormData
    const formData = new FormData();
    formData.append("file", {
      uri: docFile.uri,
      name: docFile.name ?? "document.jpg",
      type: docFile.mimeType ?? "image/jpeg",
    });

    setSubmitting(true);
    try {
      if (isWorker) {
        formData.append("idType", idType.value);
        formData.append("idNumber", idNumber.trim());
        await submitIdVerification(formData);
      } else {
        formData.append("verificationType", verificationType);
        if (verificationType === "INDIVIDUAL") {
          formData.append("idType", idType.value);
          formData.append("idNumber", idNumber.trim());
        } else {
          formData.append("companyName", companyName.trim());
          formData.append("companyRegNumber", companyRegNumber.trim());
          if (companyCountry.trim())
            formData.append("companyCountry", companyCountry.trim());
          if (website.trim()) formData.append("website", website.trim());
        }
        await submitHirerVerification(formData);
      }
      toast.success("Verification submitted! We'll review within 24–48 hours.");
      setForceForm(false);
      setDocFile(null);
      setIdType(null);
      setIdNumber("");
      setCompanyName("");
      setCompanyRegNumber("");
      setCompanyCountry("");
      setWebsite("");
      load();
    } catch (err) {
      toast.error(
        err?.response?.data?.message ?? "Submission failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = statusData?.currentStatus ?? "UNVERIFIED";
  const showForm =
    forceForm || currentStatus === "UNVERIFIED" || currentStatus === "REJECTED";
  const whyList = isWorker ? WHY_VERIFY_WORKER : WHY_VERIFY_HIRER;

  if (loading) {
    return (
      <View
        style={[
          s.screen,
          {
            backgroundColor: c.bg,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[s.screen, { backgroundColor: c.bg }]}
      contentContainerStyle={s.content}
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
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ── */}
      <View style={s.hero}>
        <View
          style={[
            s.eyebrow,
            { backgroundColor: c.orangeDim, borderColor: c.orange },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, letterSpacing: 1.2 }}
          >
            TRUST & SAFETY
          </AppText>
        </View>

        <AppText style={[s.heroSub, { color: c.textMuted }]}>
          {isWorker
            ? "Verified workers appear higher in search and get hired faster."
            : "Verified hirers attract better workers and unlock higher booking limits."}
        </AppText>
      </View>

      {/* ── Why verify ── */}
      <View
        style={[
          s.whyCard,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: c.text, marginBottom: 14 }}
        >
          Why verify?
        </AppText>
        {whyList.map((reason, i) => (
          <View key={i} style={s.whyRow}>
            <AppText style={{ color: c.orange, marginRight: 10, fontSize: 16 }}>
              →
            </AppText>
            <AppText
              variant="body"
              style={{ color: c.textMuted, flex: 1, lineHeight: 22 }}
            >
              {reason}
            </AppText>
          </View>
        ))}
      </View>

      {/* ── Status card ── */}
      {statusData && currentStatus !== "UNVERIFIED" && (
        <StatusCard data={statusData} c={c} />
      )}

      {/* ── State card ── */}
      {!forceForm &&
        (currentStatus === "PENDING" ||
          currentStatus === "VERIFIED" ||
          currentStatus === "REJECTED") && (
          <StateCard
            status={currentStatus}
            c={c}
            onRetry={() => setForceForm(true)}
          />
        )}

      {/* ── Verification Form ── */}
      {showForm && (
        <View>
          {/* Type selector — hirers only */}
          {!isWorker && (
            <View style={s.typeRow}>
              {[
                {
                  value: "INDIVIDUAL",
                  emoji: "🪪",
                  label: "Individual",
                  sub: "Personal ID",
                },
                {
                  value: "BUSINESS",
                  emoji: "🏢",
                  label: "Business",
                  sub: "Company registration",
                },
              ].map((t) => {
                const active = verificationType === t.value;
                return (
                  <Pressable
                    key={t.value}
                    onPress={() => setVerificationType(t.value)}
                    style={[
                      s.typeCard,
                      {
                        backgroundColor: active ? `${c.orange}18` : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                  >
                    <AppText style={{ fontSize: 36, marginBottom: 10 }}>
                      {t.emoji}
                    </AppText>
                    <AppText
                      variant="body"
                      weight="semibold"
                      style={{ color: c.text }}
                    >
                      {t.label}
                    </AppText>
                    <AppText
                      variant="small"
                      style={{ color: c.textMuted, marginTop: 2 }}
                    >
                      {t.sub}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* INDIVIDUAL fields — always visible for worker, visible for hirer when INDIVIDUAL */}
          {(isWorker || verificationType === "INDIVIDUAL") && (
            <>
              <Field label="ID Type" required c={c}>
                <Pressable
                  onPress={() => setShowIdModal(true)}
                  style={[
                    s.selectBtn,
                    { backgroundColor: c.bgInput, borderColor: c.border },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{ flex: 1, color: idType ? c.text : c.textMuted }}
                  >
                    {idType?.label ?? "Select ID type"}
                  </AppText>
                  <AppText style={{ color: c.textMuted }}>▾</AppText>
                </Pressable>
              </Field>

              <Field label="ID Number" required c={c}>
                <TextInput
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder="e.g. A123456789"
                  placeholderTextColor={c.textMuted}
                  autoCapitalize="characters"
                  style={[
                    s.input,
                    {
                      color: c.text,
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                    },
                  ]}
                />
              </Field>
            </>
          )}

          {/* BUSINESS fields — hirer only, when BUSINESS selected */}
          {!isWorker && verificationType === "BUSINESS" && (
            <>
              <Field label="Company Name" required c={c}>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="e.g. Acme Services Ltd"
                  placeholderTextColor={c.textMuted}
                  style={[
                    s.input,
                    {
                      color: c.text,
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                    },
                  ]}
                />
              </Field>

              <Field label="Registration Number" required c={c}>
                <TextInput
                  value={companyRegNumber}
                  onChangeText={setCompanyRegNumber}
                  placeholder="e.g. RC1234567"
                  placeholderTextColor={c.textMuted}
                  autoCapitalize="characters"
                  style={[
                    s.input,
                    {
                      color: c.text,
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                    },
                  ]}
                />
              </Field>

              <Field label="Country of Registration" c={c}>
                <TextInput
                  value={companyCountry}
                  onChangeText={setCompanyCountry}
                  placeholder="e.g. Nigeria"
                  placeholderTextColor={c.textMuted}
                  autoCapitalize="words"
                  style={[
                    s.input,
                    {
                      color: c.text,
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                    },
                  ]}
                />
              </Field>

              <Field label="Website" c={c}>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder="https://yourcompany.com"
                  placeholderTextColor={c.textMuted}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={[
                    s.input,
                    {
                      color: c.text,
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                    },
                  ]}
                />
              </Field>
            </>
          )}

          {/* Document upload */}
          <DocumentUpload
            label={
              !isWorker && verificationType === "BUSINESS"
                ? "Upload CAC / Registration Document"
                : "Upload ID Document"
            }
            file={docFile}
            onPick={pickDocument}
            c={c}
          />

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[
              s.submitBtn,
              { backgroundColor: c.orange, opacity: submitting ? 0.75 : 1 },
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <AppText
                variant="title"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                Submit for Verification
              </AppText>
            )}
          </Pressable>

          <AppText
            variant="small"
            tone="dim"
            style={{
              textAlign: "center",
              marginTop: 8,
              marginBottom: 16,
              lineHeight: 18,
            }}
          >
            Your documents are encrypted and only used for verification
            purposes.
          </AppText>
        </View>
      )}

      <View style={{ height: 40 }} />

      <IdTypeModal
        visible={showIdModal}
        onClose={() => setShowIdModal(false)}
        onSelect={setIdType}
        c={c}
        modalBg={modalBg}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 24 },
  eyebrow: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 8,
  },
  heroSub: { fontSize: 15, lineHeight: 22 },
  whyCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 16,
  },
  whyRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  statusCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  rejectionBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  stateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
    gap: 10,
  },
  stateTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  stateBody: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  typeRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  typeCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    alignItems: "center",
  },
  fieldWrap: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
  },
  submitBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 4,
  },
});

const m = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  option: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
});
