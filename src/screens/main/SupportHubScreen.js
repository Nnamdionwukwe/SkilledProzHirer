// src/screens/main/SupportHubScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Support Hub — mobile port of the website's src/pages/support/SupportHub.jsx.
//
// Layout (matches the web page 1:1):
//   • Header (title + subtitle + "New Ticket" button)
//   • Ticket list (skeleton → empty state → list)
//   • Create Ticket modal (category select, subject, description, upload box)
//
// API:
//   GET  /support/tickets                 → supportApi.getMyTickets()
//   POST /support/tickets (multipart)     → supportApi.createTicket()
//
// Status badge colors match SupportHub.module.css exactly:
//   OPEN         blue    (#3b82f6)
//   IN_PROGRESS  yellow  (#eab308)
//   WAITING_USER orange  (#f97316)
//   RESOLVED     green   (#22c55e)
//   CLOSED       muted
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
const CATEGORIES = [
  { value: "ACCOUNT", label: "Account & Login" },
  { value: "PAYMENT", label: "Payments & Billing" },
  { value: "BOOKING", label: "Bookings & Jobs" },
  { value: "TECHNICAL", label: "Technical Bug" },
  { value: "VERIFICATION", label: "Verification" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "OTHER", label: "Other" },
];

const STATUS_COLORS = {
  OPEN: {
    fg: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
    label: "Open",
  },
  IN_PROGRESS: {
    fg: "#eab308",
    bg: "rgba(234,179,8,0.12)",
    border: "rgba(234,179,8,0.25)",
    label: "In Progress",
  },
  WAITING_USER: {
    fg: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.25)",
    label: "Action Needed",
  },
  RESOLVED: {
    fg: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.25)",
    label: "Resolved",
  },
  CLOSED: {
    fg: "#888888",
    bg: "rgba(136,136,136,0.12)",
    border: "rgba(136,136,136,0.25)",
    label: "Closed",
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

// ─── Skeleton card (matches .skeletonCard from CSS) ───────────────────────
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

// ─── Status badge (matches .badge classes) ────────────────────────────────
function StatusBadge({ status, c }) {
  const meta = STATUS_COLORS[status] ?? {
    fg: c.textMuted,
    bg: c.bgCard,
    border: c.border,
    label: status || "",
  };
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
        {meta.label}
      </AppText>
    </View>
  );
}

// ─── Ticket card (matches .ticketCard) ────────────────────────────────────
function TicketCard({ ticket, onPress, c }) {
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
          <StatusBadge status={ticket.status} c={c} />
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
function CreateTicketModal({ visible, onClose, onCreated, c, toast }) {
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
          toast.error(`${a.name} exceeds the 25 MB limit.`);
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
      toast.error("Could not open file picker.");
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setError("");
    if (!subject.trim() || subject.trim().length < 4) {
      setError("Subject must be at least 4 characters.");
      return;
    }
    if (!description.trim() || description.trim().length < 10) {
      setError("Description must be at least 10 characters.");
      return;
    }
    setSubmitting(true);

    try {
      // Website uses FormData with field names: category, subject, description,
      // attachments (multiple).
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
      toast.success("Ticket created.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory =
    CATEGORIES.find((cat) => cat.value === category)?.label ?? category;

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
              Create Support Ticket
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
                Category
              </AppText>
              <Pressable
                onPress={() => setShowCategoryPicker((v) => !v)}
                style={[
                  styles.selectBox,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ color: c.text, fontSize: 13 }}>
                  {selectedCategory}
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
                  {CATEGORIES.map((cat) => {
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
                          {cat.label}
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
                Subject
              </AppText>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="Brief summary of the issue"
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
                Description
              </AppText>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Please provide as much detail as possible..."
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
                Attachments (Images, PDFs, Videos)
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
                  Tap to upload files
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
                  Cancel
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
                    Submit Ticket
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
      // Web does: res.data.tickets → data is already-unwrapped by api wrapper
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
            style={{ fontSize: 24, color: c.text, lineHeight: 30 }}
          >
            Support Hub
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginTop: 4, lineHeight: 18 }}
          >
            View your past tickets or open a new one for detailed issues.
          </AppText>
        </View>
        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.newTicketBtn, { backgroundColor: c.orange }]}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <AppText style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
            New Ticket
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
            No tickets yet
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ textAlign: "center", lineHeight: 20, marginTop: 4 }}
          >
            Need help with something? Open a ticket and our team will get back
            to you.
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
