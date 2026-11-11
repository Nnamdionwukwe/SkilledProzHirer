// src/screens/main/SupportHubScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Support Hub — mobile port of the website's src/pages/support/SupportHub.jsx.
//
// API:
//   GET  /support/tickets                 → supportApi.getMyTickets()
//   POST /support/tickets (multipart)     → supportApi.createTicket()
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Pressable,
  TextInput,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useSupportStore } from "../../store/supportStore";
import { getMyTickets, createTicket, getTicket } from "../../api/support";

// ─── Constants ─────────────────────────────────────────────────────────────
const CATEGORY_KEYS = [
  { value: "ACCOUNT", tKey: "ACCOUNT" },
  { value: "PAYMENT", tKey: "PAYMENT" },
  { value: "BOOKING", tKey: "BOOKING" },
  { value: "TECHNICAL", tKey: "TECHNICAL" },
  { value: "VERIFICATION", tKey: "VERIFICATION" },
  { value: "WITHDRAWAL", tKey: "WITHDRAWAL" },
  { value: "OTHER", tKey: "OTHER" },
];

const STATUS_META = {
  OPEN: {
    fg: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    tKey: "statusOpen",
  },
  IN_PROGRESS: {
    fg: "#eab308",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.25)",
    tKey: "statusInProgress",
  },
  WAITING_USER: {
    fg: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
    tKey: "statusWaiting",
  },
  RESOLVED: {
    fg: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
    tKey: "statusResolved",
  },
  CLOSED: {
    fg: "#888888",
    bg: "rgba(136,136,136,0.12)",
    border: "rgba(136,136,136,0.25)",
    tKey: "statusClosed",
  },
};

const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file

// ─── Helpers ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function humanizeCategory(c) {
  if (!c) return "";
  return String(c).replace(/_/g, " ");
}

// ─── Skeleton card ────────────────────────────────────────────────────────
function SkeletonCard({ c }) {
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

  return (
    <Animated.View
      style={{
        height: 86,
        borderRadius: 16,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        opacity: shimmer,
      }}
    />
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────
function StatusBadge({ status, c, t }) {
  const meta = STATUS_META[status] ?? {
    fg: c.textMuted,
    bg: c.bgCard,
    border: c.border,
    tKey: null,
  };
  const label = meta.tKey ? t(`support.hub.${meta.tKey}`) : status || "";
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: meta.bg,
        borderWidth: 1,
        borderColor: meta.border,
      }}
    >
      <AppText
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: meta.fg,
          textTransform: "uppercase",
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

// ─── Ticket card ──────────────────────────────────────────────────────────
function TicketCard({ ticket, onPress, c, t }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: pressed ? c.borderHover : c.border,
        padding: 16,
        borderRadius: 16,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {/* Icon */}
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: c.bgCard,
          borderWidth: 1,
          borderColor: c.border,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name="document-text-outline" size={20} color={c.orange} />
      </View>

      {/* Info */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginBottom: 2,
          }}
        >
          <AppText
            style={{
              fontSize: 13,
              fontWeight: "800",
              color: c.text,
              letterSpacing: 0.3,
            }}
            numberOfLines={1}
          >
            {ticket.ticketNumber}
          </AppText>
          <StatusBadge status={ticket.status} c={c} t={t} />
        </View>

        <AppText
          style={{
            fontSize: 14,
            fontWeight: "700",
            color: c.text,
            marginBottom: 6,
          }}
          numberOfLines={1}
        >
          {ticket.subject}
        </AppText>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="time-outline" size={12} color={c.textMuted} />
            <AppText style={{ fontSize: 12, color: c.textMuted }}>
              {fmtDate(ticket.createdAt)}
            </AppText>
          </View>
          {!!ticket.category && (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 4,
                backgroundColor: c.bgInput,
              }}
            >
              <AppText
                style={{
                  fontSize: 10,
                  color: c.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                }}
              >
                {humanizeCategory(ticket.category)}
              </AppText>
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Ticket Modal
// ─────────────────────────────────────────────────────────────────────────────
function CreateTicketModal({ visible, onClose, onCreated, c, toast, t }) {
  const [category, setCategory] = useState("TECHNICAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const reset = () => {
    setCategory("TECHNICAL");
    setSubject("");
    setDescription("");
    setFiles([]);
    setError("");
    setSubmitting(false);
    setShowCategoryPicker(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const pickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "image/*",
          "application/pdf",
          "video/mp4",
          "video/webm",
          "video/quicktime",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      const next = [...files];
      for (const a of res.assets) {
        if (a.size && a.size > MAX_FILE_BYTES) {
          toast.error(t("support.hub.errors.fileTooLarge", { name: a.name }));
          continue;
        }
        next.push({
          uri: a.uri,
          name: a.name || `file_${Date.now()}`,
          mimeType: a.mimeType || "application/octet-stream",
          size: a.size,
        });
      }
      setFiles(next);
    } catch {
      toast.error(t("support.hub.errors.pickFailed"));
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    if (!subject.trim() || subject.trim().length < 4) {
      setError(t("support.hub.errors.subjectTooShort"));
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError(t("support.hub.errors.descriptionTooShort"));
      return;
    }
    setSubmitting(true);

    try {
      const form = new FormData();
      form.append("category", category);
      form.append("subject", subject.trim());
      form.append("description", description.trim());
      files.forEach((f) => {
        form.append("attachments", {
          uri: f.uri,
          name: f.name,
          type: f.mimeType,
        });
      });

      await createTicket(form);
      reset();
      onCreated();
      onClose();
      toast.success(t("support.hub.success.created"));
    } catch (err) {
      setError(
        err?.response?.data?.message || t("support.hub.errors.createFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryLabel = t(`support.hub.categories.${category}`, {
    defaultValue: category,
  });

  if (!visible) return null;

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            styles.modalCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <AppText
              weight="displayBlack"
              style={{ fontSize: 17, color: c.text }}
            >
              {t("support.hub.createTicketTitle")}
            </AppText>
            <Pressable onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={c.textMuted} />
            </Pressable>
          </View>

          <ScrollView
            style={{ maxHeight: 560 }}
            contentContainerStyle={styles.formBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!!error && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: "rgba(239,68,68,0.12)",
                    borderColor: "rgba(239,68,68,0.25)",
                  },
                ]}
              >
                <AppText style={{ color: "#ef4444", fontSize: 13 }}>
                  {error}
                </AppText>
              </View>
            )}

            {/* Category */}
            <View style={styles.field}>
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                {t("support.hub.category")}
              </AppText>
              <Pressable
                onPress={() => setShowCategoryPicker((v) => !v)}
                style={[
                  styles.selectBox,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ color: c.text, fontSize: 13 }}>
                  {selectedCategoryLabel}
                </AppText>
                <Ionicons
                  name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={c.textMuted}
                />
              </Pressable>
              {showCategoryPicker && (
                <View
                  style={[
                    styles.pickerDropdown,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  {CATEGORY_KEYS.map((cat) => {
                    const active = cat.value === category;
                    return (
                      <Pressable
                        key={cat.value}
                        onPress={() => {
                          setCategory(cat.value);
                          setShowCategoryPicker(false);
                        }}
                        style={[
                          styles.pickerItem,
                          {
                            backgroundColor: active
                              ? c.orangeDim
                              : "transparent",
                            borderBottomColor: c.border,
                          },
                        ]}
                      >
                        <AppText
                          style={{
                            color: active ? c.orange : c.text,
                            fontSize: 13,
                            fontWeight: active ? "600" : "400",
                          }}
                        >
                          {t(`support.hub.categories.${cat.tKey}`)}
                        </AppText>
                        {active && (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={c.orange}
                          />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Subject */}
            <View style={styles.field}>
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                {t("support.hub.subject")}
              </AppText>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder={t("support.hub.subjectPlaceholder")}
                placeholderTextColor={c.textMuted}
                maxLength={120}
                style={[
                  styles.input,
                  {
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                    color: c.text,
                  },
                ]}
              />
            </View>

            {/* Description */}
            <View style={styles.field}>
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                {t("support.hub.description")}
              </AppText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder={t("support.hub.descriptionPlaceholder")}
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                    color: c.text,
                  },
                ]}
              />
            </View>

            {/* Attachments */}
            <View style={styles.field}>
              <AppText
                style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
              >
                {t("support.hub.attachments")}
              </AppText>
              <Pressable
                onPress={pickFiles}
                style={[
                  styles.uploadBox,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={24}
                  color={c.textMuted}
                />
                <AppText style={{ fontSize: 12, color: c.textMuted }}>
                  {t("support.hub.uploadHint")}
                </AppText>
              </Pressable>
              {files.length > 0 && (
                <View style={{ gap: 6, marginTop: 8 }}>
                  {files.map((f, i) => (
                    <View
                      key={`${f.uri}-${i}`}
                      style={[
                        styles.fileItem,
                        {
                          backgroundColor: "rgba(34,197,94,0.12)",
                          borderColor: "rgba(34,197,94,0.2)",
                        },
                      ]}
                    >
                      <AppText
                        style={{ fontSize: 12, color: "#22c55e", flex: 1 }}
                        numberOfLines={1}
                      >
                        {f.name}
                      </AppText>
                      <Pressable onPress={() => removeFile(i)} hitSlop={8}>
                        <Ionicons name="close" size={14} color="#22c55e" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <Pressable
                onPress={handleClose}
                style={[
                  styles.cancelBtn,
                  { borderColor: c.border, backgroundColor: "transparent" },
                ]}
              >
                <AppText style={{ color: c.text, fontWeight: "600" }}>
                  {t("support.hub.cancel")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={submitting}
                style={[
                  styles.submitBtn,
                  { backgroundColor: c.orange, opacity: submitting ? 0.6 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <AppText style={{ color: "#fff", fontWeight: "600" }}>
                    {t("support.hub.submit")}
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

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function SupportHubScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const refreshSupport = useSupportStore((s) => s.refresh);
  const c = theme.colors;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadTickets = useCallback(async () => {
    try {
      const data = await getMyTickets();
      const list = data?.tickets ?? data?.data?.tickets ?? [];
      setTickets(Array.isArray(list) ? list : []);
    } catch {
      // silent — mirrors web
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    refreshSupport?.();
  }, [loadTickets, refreshSupport]);

  const openTicket = (ticketId) => {
    navigation.navigate("SupportTicketDetail", { id: ticketId });
  };

  return (
    <AppScreen
      contentContainerStyle={{ padding: 16, paddingBottom: 56 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadTickets();
            refreshSupport?.();
          }}
          tintColor={c.orange}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <AppText
            weight="displayBlack"
            style={{ fontSize: 15, color: c.text, lineHeight: 30 }}
          >
            {t("support.hub.title")}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginTop: 4, lineHeight: 18, fontSize: 12 }}
          >
            {t("support.hub.subtitle")}
          </AppText>
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.newTicketBtn, { backgroundColor: c.orange }]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <AppText style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
            {t("support.hub.newTicket")}
          </AppText>
        </Pressable>
      </View>

      {/* ── Body ── */}
      {loading ? (
        <View style={{ gap: 10, marginTop: 4 }}>
          <SkeletonCard c={c} />
          <SkeletonCard c={c} />
          <SkeletonCard c={c} />
          <SkeletonCard c={c} />
        </View>
      ) : tickets.length === 0 ? (
        <View
          style={[
            styles.emptyState,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={48}
            color={c.textMuted}
          />
          <AppText
            weight="semibold"
            style={{ fontSize: 16, color: c.text, marginTop: 4 }}
          >
            {t("support.hub.noTickets")}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ textAlign: "center", lineHeight: 20, marginTop: 4 }}
          >
            {t("support.hub.noTicketsSub")}
          </AppText>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <TicketCard
              ticket={item}
              onPress={() => openTicket(item.id)}
              c={c}
              t={t}
            />
          )}
        />
      )}

      {/* ── Create Ticket Modal ── */}
      <CreateTicketModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onCreated={loadTickets}
        c={c}
        toast={toast}
        t={t}
      />
    </AppScreen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  newTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },

  // Create-ticket modal
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  formBody: {
    padding: 20,
    gap: 16,
  },
  field: { gap: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 13,
    minHeight: 100,
  },
  selectBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pickerDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  uploadBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 8,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    gap: 6,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 4,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  submitBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 6,
  },
});
