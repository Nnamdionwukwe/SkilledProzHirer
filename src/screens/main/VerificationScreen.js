// src/screens/main/VerificationScreen.js
// Role-aware: Worker  → GET /verification/status  + POST /verification/submit-id
//             Hirer   → GET /verification/hirer/status + POST /verification/hirer/submit

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Animated,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import { Ionicons } from "@expo/vector-icons";
import {
  getVerificationStatus,
  submitHirerVerification,
  submitIdVerification,
} from "../../api/verification";

const ID_TYPES = [
  { value: "NATIONAL_ID", labelKey: "verification.idTypes.nationalId" },
  { value: "PASSPORT", labelKey: "verification.idTypes.passport" },
  { value: "DRIVERS_LICENSE", labelKey: "verification.idTypes.driversLicense" },
  { value: "VOTERS_CARD", labelKey: "verification.idTypes.votersCard" },
  {
    value: "RESIDENCE_PERMIT",
    labelKey: "verification.idTypes.residencePermit",
  },
  { value: "WORK_PERMIT", labelKey: "verification.idTypes.workPermit" },
];

const STATUS_META = {
  UNVERIFIED: {
    icon: "lock-open-outline",
    color: "#6b7280",
    labelKey: "verification.statusUnverified",
  },
  PENDING: {
    icon: "time-outline",
    color: "#f97316",
    labelKey: "verification.statusPending",
  },
  VERIFIED: {
    icon: "checkmark-circle",
    color: "#22c55e",
    labelKey: "verification.statusVerified",
  },
  REJECTED: {
    icon: "close-circle",
    color: "#ef4444",
    labelKey: "verification.statusRejected",
  },
};

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
    };
  }
  return data;
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────
function VerificationSkeleton({ c }) {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const Block = ({ w, h, mb = 16, radius = 12, align = "stretch" }) => (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        opacity: shimmer,
        marginBottom: mb,
        alignSelf: align,
      }}
    />
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16 }}
    >
      <Block w="40%" h={20} mb={12} radius={20} align="flex-start" />
      <Block w="60%" h={30} mb={10} radius={8} align="flex-start" />
      <Block w="90%" h={16} mb={24} radius={6} align="flex-start" />
      <Block w="100%" h={160} mb={20} />
      <Block w="100%" h={60} mb={20} />
      <Block w="100%" h={180} mb={20} />
    </ScrollView>
  );
}

// ─── Document Picker Modal ────────────────────────────────────────────────
function DocumentPickerModal({ visible, onClose, onPick, c }) {
  const { t } = useTranslation();
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
            { backgroundColor: c.bgPanel, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <AppText style={[m.sheetTitle, { color: c.text }]}>
            {t("verification.uploadModalTitle")}
          </AppText>
          <AppText
            style={{ color: c.textMuted, marginBottom: 16, fontSize: 13 }}
          >
            {t("verification.uploadModalSub")}
          </AppText>

          <Pressable
            onPress={() => {
              onClose();
              onPick("library");
            }}
            style={[m.option, { borderBottomColor: c.border }]}
          >
            <View style={[m.iconWrap, { backgroundColor: `${c.orange}15` }]}>
              <Ionicons name="images-outline" size={22} color={c.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{ color: c.text, fontSize: 14, fontWeight: "600" }}
              >
                {t("verification.uploadModalLibrary")}
              </AppText>
              <AppText
                style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}
              >
                {t("verification.uploadModalLibrarySub")}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              onClose();
              onPick("files");
            }}
            style={[m.option, { borderBottomColor: c.border }]}
          >
            <View style={[m.iconWrap, { backgroundColor: `${c.orange}15` }]}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={c.orange}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{ color: c.text, fontSize: 14, fontWeight: "600" }}
              >
                {t("verification.uploadModalFiles")}
              </AppText>
              <AppText
                style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}
              >
                {t("verification.uploadModalFilesSub")}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
          </Pressable>

          <Pressable
            onPress={onClose}
            style={[
              m.cancelBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText style={{ color: c.text, fontWeight: "600", fontSize: 13 }}>
              {t("verification.cancel")}
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── ID Type Modal ────────────────────────────────────────────────────────
function IdTypeModal({ visible, onClose, onSelect, c }) {
  const { t } = useTranslation();
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
            { backgroundColor: c.bgPanel, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[m.handle, { backgroundColor: c.border }]} />
          <AppText style={[m.sheetTitle, { color: c.text }]}>
            {t("verification.selectIdType")}
          </AppText>
          {ID_TYPES.map((item) => (
            <Pressable
              key={item.value}
              onPress={() => {
                onSelect({ value: item.value, label: t(item.labelKey) });
                onClose();
              }}
              style={[m.option, { borderBottomColor: c.border }]}
            >
              <AppText style={{ color: c.text, fontSize: 14, flex: 1 }}>
                {t(item.labelKey)}
              </AppText>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
          <View style={{ height: 24 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────
function DocumentUpload({ label, file, onPick, c }) {
  const { t } = useTranslation();
  return (
    <View style={{ marginBottom: 16 }}>
      <AppText
        weight="semibold"
        style={{
          color: c.textMuted,
          marginBottom: 8,
          letterSpacing: 0.4,
          fontSize: 11,
        }}
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
            <Ionicons name="document-text" size={28} color={c.orange} />
            <AppText
              weight="semibold"
              style={{ color: c.orange, fontSize: 12 }}
              numberOfLines={1}
            >
              {file.name ?? t("verification.documentSelected")}
            </AppText>
            <AppText style={{ color: c.textMuted, fontSize: 11 }}>
              {t("verification.uploadTapToChange")}
            </AppText>
          </View>
        ) : (
          <View style={{ alignItems: "center", gap: 6 }}>
            <Ionicons
              name="cloud-upload-outline"
              size={28}
              color={c.textMuted}
            />
            <AppText weight="semibold" style={{ color: c.text, fontSize: 13 }}>
              {t("verification.uploadTap")}
            </AppText>
            <AppText style={{ color: c.textMuted, fontSize: 11 }}>
              {t("verification.uploadHint")}
            </AppText>
          </View>
        )}
      </Pressable>
    </View>
  );
}

function StatusCard({ data, c }) {
  const { t } = useTranslation();
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
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText
        weight="semibold"
        style={{
          color: c.textMuted,
          letterSpacing: 0.6,
          marginBottom: 8,
          fontSize: 10,
        }}
      >
        {t("verification.statusHeading")}
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
        <Ionicons
          name={meta.icon}
          size={12}
          color={meta.color}
          style={{ marginRight: 4 }}
        />
        <AppText weight="semibold" style={{ color: meta.color, fontSize: 11 }}>
          {t(meta.labelKey)}
        </AppText>
      </View>
      <AppText
        style={{ color: c.textDim, marginTop: 8, lineHeight: 18, fontSize: 13 }}
      >
        {data.statusMessage}
      </AppText>
      {sub?.submittedAt && (
        <AppText style={{ color: c.textMuted, marginTop: 6, fontSize: 11 }}>
          {t("verification.submittedAt", { date: fmtDate(sub.submittedAt) })}
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
            weight="semibold"
            style={{ color: "#ef4444", marginBottom: 4, fontSize: 11 }}
          >
            {t("verification.rejectionReason")}
          </AppText>
          <AppText style={{ color: c.textMuted, fontSize: 11 }}>
            {rev.rejectionReason}
          </AppText>
        </View>
      )}
    </View>
  );
}

function StateCard({ status, c, onRetry }) {
  const { t } = useTranslation();
  const meta = STATUS_META[status] ?? STATUS_META.UNVERIFIED;

  let titleKey = "";
  let bodyKey = "";
  if (status === "PENDING") {
    titleKey = "verification.pendingTitle";
    bodyKey = "verification.pendingBody";
  } else if (status === "VERIFIED") {
    titleKey = "verification.verifiedTitle";
    bodyKey = "verification.verifiedBody";
  } else if (status === "REJECTED") {
    titleKey = "verification.rejectedTitle";
    bodyKey = "verification.rejectedBody";
  }

  return (
    <View
      style={[
        s.stateCard,
        { backgroundColor: `${meta.color}15`, borderColor: `${meta.color}40` },
      ]}
    >
      <Ionicons name={meta.icon} size={44} color={meta.color} />
      <AppText style={[s.stateTitle, { color: c.text }]}>{t(titleKey)}</AppText>
      <AppText style={[s.stateBody, { color: c.textMuted }]}>
        {t(bodyKey)}
      </AppText>
      {status === "REJECTED" && (
        <Pressable
          onPress={onRetry}
          style={[s.retryBtn, { backgroundColor: c.orange }]}
        >
          <AppText weight="semibold" style={{ color: "#fff", fontSize: 13 }}>
            {t("verification.tryAgain")}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function Field({ label, required, c, children }) {
  return (
    <View style={s.fieldWrap}>
      <AppText
        weight="semibold"
        style={{
          color: c.textMuted,
          letterSpacing: 0.4,
          marginBottom: 6,
          fontSize: 11,
        }}
      >
        {label}
        {required ? " *" : ""}
      </AppText>
      {children}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────
export default function VerificationScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isWorker = user?.role === "WORKER";

  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forceForm, setForceForm] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);

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

  const handleDocPick = async (source) => {
    try {
      if (source === "library") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          toast.error(t("verification.toast.libraryPermission"));
          return;
        }
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
      } else {
        const r = await DocumentPicker.getDocumentAsync({
          type: ["image/*", "application/pdf"],
          copyToCacheDirectory: true,
        });
        if (!r.canceled && r.assets?.[0]) setDocFile(r.assets[0]);
      }
    } catch {
      toast.error(t("verification.toast.pickerFailed"));
    }
  };

  const handleSubmit = async () => {
    if (isWorker || verificationType === "INDIVIDUAL") {
      if (!idType) return toast.error(t("verification.toast.selectIdType"));
      if (!idNumber.trim())
        return toast.error(t("verification.toast.idNumberRequired"));
    } else {
      if (!companyName.trim())
        return toast.error(t("verification.toast.companyNameRequired"));
      if (!companyRegNumber.trim())
        return toast.error(t("verification.toast.regNumberRequired"));
    }
    if (!docFile) return toast.error(t("verification.toast.documentRequired"));

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
      toast.success(t("verification.toast.submitSuccess"));
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
        err?.response?.data?.message ?? t("verification.toast.submitFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentStatus = statusData?.currentStatus ?? "UNVERIFIED";
  const showForm =
    forceForm || currentStatus === "UNVERIFIED" || currentStatus === "REJECTED";

  const whyList = isWorker
    ? [
        t("verification.whyWorker1"),
        t("verification.whyWorker2"),
        t("verification.whyWorker3"),
        t("verification.whyWorker4"),
      ]
    : [
        t("verification.whyHirer1"),
        t("verification.whyHirer2"),
        t("verification.whyHirer3"),
        t("verification.whyHirer4"),
      ];

  if (loading) {
    return <VerificationSkeleton c={c} />;
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
            weight="semibold"
            style={{ color: c.orange, letterSpacing: 0.8, fontSize: 10 }}
          >
            {t("verification.heroEyebrow")}
          </AppText>
        </View>
        <AppText style={[s.heroTitle, { color: c.text }]}>
          {t("verification.heroTitle")}
        </AppText>
        <AppText style={[s.heroSub, { color: c.textDim }]}>
          {isWorker
            ? t("verification.heroSubWorker")
            : t("verification.heroSubHirer")}
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
          weight="semibold"
          style={{ color: c.text, marginBottom: 10, fontSize: 13 }}
        >
          {t("verification.whyVerify")}
        </AppText>
        {whyList.map((reason, i) => (
          <View key={i} style={s.whyRow}>
            <Ionicons
              name="arrow-forward"
              size={12}
              color={c.orange}
              style={{ marginRight: 8, marginTop: 2 }}
            />
            <AppText
              style={{
                color: c.textDim,
                flex: 1,
                lineHeight: 18,
                fontSize: 12,
              }}
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
                  icon: "id-card-outline",
                  label: t("verification.typeIndividual"),
                  sub: t("verification.typeIndividualSub"),
                },
                {
                  value: "BUSINESS",
                  icon: "business-outline",
                  label: t("verification.typeBusiness"),
                  sub: t("verification.typeBusinessSub"),
                },
              ].map((item) => {
                const active = verificationType === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setVerificationType(item.value)}
                    style={[
                      s.typeCard,
                      {
                        backgroundColor: active ? `${c.orange}18` : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={active ? c.orange : c.textMuted}
                      style={{ marginBottom: 8 }}
                    />
                    <AppText
                      weight="semibold"
                      style={{ color: c.text, fontSize: 13 }}
                    >
                      {item.label}
                    </AppText>
                    <AppText
                      style={{
                        color: c.textMuted,
                        marginTop: 2,
                        textAlign: "center",
                        fontSize: 11,
                      }}
                    >
                      {item.sub}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* INDIVIDUAL fields */}
          {(isWorker || verificationType === "INDIVIDUAL") && (
            <>
              <Field label={t("verification.idType")} required c={c}>
                <Pressable
                  onPress={() => setShowIdModal(true)}
                  style={[
                    s.selectBtn,
                    { backgroundColor: c.bgInput, borderColor: c.border },
                  ]}
                >
                  <AppText
                    style={{
                      flex: 1,
                      color: idType ? c.text : c.textMuted,
                      fontSize: 13,
                    }}
                  >
                    {idType?.label ?? t("verification.selectIdType")}
                  </AppText>
                  <Ionicons name="chevron-down" size={16} color={c.textMuted} />
                </Pressable>
              </Field>
              <Field label={t("verification.idNumber")} required c={c}>
                <TextInput
                  value={idNumber}
                  onChangeText={setIdNumber}
                  placeholder={t("verification.idNumberPlaceholder")}
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

          {/* BUSINESS fields */}
          {!isWorker && verificationType === "BUSINESS" && (
            <>
              <Field label={t("verification.companyName")} required c={c}>
                <TextInput
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder={t("verification.companyNamePlaceholder")}
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
              <Field label={t("verification.companyRegNumber")} required c={c}>
                <TextInput
                  value={companyRegNumber}
                  onChangeText={setCompanyRegNumber}
                  placeholder={t("verification.companyRegNumberPlaceholder")}
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
              <Field label={t("verification.companyCountry")} c={c}>
                <TextInput
                  value={companyCountry}
                  onChangeText={setCompanyCountry}
                  placeholder={t("verification.companyCountryPlaceholder")}
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
              <Field label={t("verification.website")} c={c}>
                <TextInput
                  value={website}
                  onChangeText={setWebsite}
                  placeholder={t("verification.websitePlaceholder")}
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

          <DocumentUpload
            label={
              !isWorker && verificationType === "BUSINESS"
                ? t("verification.uploadCacDocument")
                : t("verification.uploadIdDocument")
            }
            file={docFile}
            onPick={() => setShowDocModal(true)}
            c={c}
          />

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
                weight="semibold"
                style={{ color: "#fff", fontSize: 14 }}
              >
                {t("verification.submit")}
              </AppText>
            )}
          </Pressable>

          <AppText
            style={{
              textAlign: "center",
              marginTop: 8,
              marginBottom: 16,
              lineHeight: 16,
              color: c.textMuted,
              fontSize: 11,
            }}
          >
            {t("verification.submitFooter")}
          </AppText>
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Modals */}
      <IdTypeModal
        visible={showIdModal}
        onClose={() => setShowIdModal(false)}
        onSelect={setIdType}
        c={c}
      />
      <DocumentPickerModal
        visible={showDocModal}
        onClose={() => setShowDocModal(false)}
        onPick={handleDocPick}
        c={c}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  hero: { marginBottom: 20 },
  eyebrow: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 30,
    marginBottom: 6,
  },
  heroSub: { fontSize: 13, lineHeight: 18 },
  whyCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 16,
  },
  whyRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  statusCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  rejectionBox: { marginTop: 10, padding: 10, borderRadius: 8, borderWidth: 1 },
  stateCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    alignItems: "center",
    gap: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 4,
  },
  stateBody: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  typeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    alignItems: "center",
  },
  fieldWrap: { marginBottom: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
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
  sheetTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
});
