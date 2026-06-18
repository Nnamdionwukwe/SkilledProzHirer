// src/screens/main/DisputesScreen.js
// Mirrors the website's My Disputes page exactly.
// Endpoints:
//   GET  /disputes/my                — list disputes
//   POST /disputes                   — raise a dispute (via RaiseDisputeSheet)
//   PATCH /disputes/:bookingId/cancel — cancel a dispute

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import ConfirmModal from "../../components/ConfirmModal";
import { getMyDisputes, raiseDispute, cancelDispute } from "../../api/disputes";
import { useTranslation } from "react-i18next";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ── Status config — disputes currently use booking status DISPUTED ─────────
const DISPUTE_STATUS = {
  DISPUTED: { label: "DISPUTED", color: "#f97316" },
  COMPLETED: { label: "RESOLVED", color: "#22c55e" },
  CANCELLED: { label: "CANCELLED", color: "#ef4444" },
  ACCEPTED: { label: "UNDER REVIEW", color: "#6366f1" },
};

// Filter tabs shown on the website
const FILTER_TABS = ["All", "Open", "Under Review", "Resolved", "Cancelled"];

// Map each tab to a set of booking statuses
const TAB_STATUSES = {
  All: null, // show all
  Open: ["DISPUTED"],
  "Under Review": ["ACCEPTED", "DISPUTED"],
  Resolved: ["COMPLETED"],
  Cancelled: ["CANCELLED"],
};

// ── Dispute reason presets (matches common dispute reasons) ───────────────────
const REASONS = [
  "Worker didn't show up",
  "Work quality was poor",
  "Work not completed",
  "Overcharged for service",
  "Damaged property",
  "Safety concern",
  "Other",
];

// ─────────────────────────────────────────────────────────────────────────────
// Raise Dispute Sheet (bottom modal)
// ─────────────────────────────────────────────────────────────────────────────
export function RaiseDisputeSheet({
  bookingId,
  bookingTitle,
  visible,
  onClose,
  onSuccess,
  c,
  modalBg,
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [acting, setActing] = useState(false);
  const [reasonError, setReasonError] = useState("");
  const [descError, setDescError] = useState("");
  const { t } = useTranslation();

  const reset = () => {
    setReason("");
    setDescription("");
    setReasonError("");
    setDescError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    let valid = true;
    if (!reason) {
      setReasonError("Please select a reason.");
      valid = false;
    }
    if (description.trim().length < 10) {
      setDescError("Please provide at least 10 characters of detail.");
      valid = false;
    }
    if (!valid) return;

    setActing(true);
    try {
      await raiseDispute({
        bookingId,
        reason,
        description: description.trim(),
      });
      toast.success("Dispute raised. Our team will review within 24–48 hours.");
      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to raise dispute.");
    } finally {
      setActing(false);
    }
  };

  if (!visible) return null;

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
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: c.border }]} />

            {/* Header */}
            <View style={styles.sheetHeader}>
              <View>
                <AppText variant="title" weight="semibold">
                  {`⚠️ ${t("disputes.raiseTitle")}`}
                </AppText>
                {bookingTitle && (
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ marginTop: 4 }}
                    numberOfLines={1}
                  >
                    {bookingTitle}
                  </AppText>
                )}
              </View>
              <Pressable
                onPress={handleClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText tone="dim">✕</AppText>
              </Pressable>
            </View>

            {/* Reason */}
            <AppText
              variant="small"
              weight="semibold"
              style={[styles.fieldLabel, { color: c.textMuted }]}
            >
              REASON *
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 4 }}
              contentContainerStyle={styles.reasonPills}
            >
              {REASONS.map((r) => {
                const active = reason === r;
                return (
                  <Pressable
                    key={r}
                    style={[
                      styles.reasonPill,
                      {
                        backgroundColor: active ? c.orange : c.bgInput,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                    onPress={() => {
                      setReason(r);
                      setReasonError("");
                    }}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? "#fff" : c.text }}
                    >
                      {r}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {reasonError && (
              <AppText
                variant="small"
                tone="danger"
                style={{ marginBottom: 8 }}
              >
                {reasonError}
              </AppText>
            )}

            {/* Description */}
            <AppText
              variant="small"
              weight="semibold"
              style={[styles.fieldLabel, { color: c.textMuted, marginTop: 12 }]}
            >
              DESCRIPTION *
            </AppText>
            <TextInput
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder={t("disputes.description")}
              placeholderTextColor={c.textMuted}
              value={description}
              onChangeText={(v) => {
                setDescription(v);
                setDescError("");
              }}
              style={[
                styles.textarea,
                {
                  color: c.text,
                  borderColor: descError ? "#ef4444" : c.border,
                  backgroundColor: c.bgInput,
                },
              ]}
            />
            {descError && (
              <AppText variant="small" tone="danger" style={{ marginTop: 4 }}>
                {descError}
              </AppText>
            )}

            {/* Info note */}
            <View
              style={[
                styles.infoNote,
                {
                  backgroundColor: "rgba(249,115,22,0.08)",
                  borderColor: "rgba(249,115,22,0.25)",
                },
              ]}
            >
              <AppText variant="small" tone="dim" style={{ lineHeight: 18 }}>
                ⚠️ {t("disputes.support")}
              </AppText>
            </View>

            {/* Submit */}
            <Pressable
              style={[
                styles.submitBtn,
                {
                  backgroundColor: acting ? c.bgCard : c.orange,
                  opacity: acting ? 0.7 : 1,
                },
              ]}
              disabled={acting}
              onPress={handleSubmit}
            >
              {acting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#fff" }}
                >
                  {t("disputes.submitDispute")}
                </AppText>
              )}
            </Pressable>

            <Pressable onPress={handleClose} style={styles.cancelLink}>
              <AppText variant="small" tone="dim">
                {t("common.cancel")}
              </AppText>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispute Card (expandable)
// ─────────────────────────────────────────────────────────────────────────────
function DisputeCard({ item, expanded, onToggle, onViewBooking, onCancel, c }) {
  const statusMeta = DISPUTE_STATUS[item.status] ?? {
    label: item.status,
    color: "#888",
  };
  const { t } = useTranslation();

  // Description: booking notes or description (dispute reason not stored separately in this schema)
  const description = item.notes || item.description || "—";

  return (
    <View
      style={[
        styles.disputeCard,
        {
          backgroundColor: c.bgCard,
          borderColor: expanded ? c.orange : c.border,
          borderWidth: expanded ? 1 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      {/* Card header — always visible */}
      <Pressable onPress={onToggle} style={styles.cardHeader}>
        {/* Warning icon */}
        <View style={[styles.warnIcon, { borderColor: c.orange }]}>
          <AppText variant="body" style={{ color: c.orange }}>
            ⚠
          </AppText>
        </View>

        {/* Title + date */}
        <View style={styles.cardTitleBlock}>
          <AppText variant="body" weight="semibold">
            Booking dispute
          </AppText>
          <AppText variant="small" tone="dim">
            · {fmtDate(item.updatedAt)}
          </AppText>
        </View>

        {/* Status badge + toggle */}
        <View style={styles.cardRight}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusMeta.color}22`,
                borderColor: `${statusMeta.color}55`,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: statusMeta.color, fontSize: 10 }}
            >
              {statusMeta.label}
            </AppText>
          </View>
          <AppText variant="small" tone="dim" style={{ marginLeft: 8 }}>
            {expanded ? "▲" : "▼"}
          </AppText>
        </View>
      </Pressable>

      {/* Expanded content */}
      {expanded && (
        <View style={[styles.cardBody, { borderTopColor: c.border }]}>
          {/* Category if available */}
          {item.category?.name && (
            <View
              style={[
                styles.catChip,
                { backgroundColor: c.orangeDim, borderColor: c.orange },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {item.category.name}
              </AppText>
            </View>
          )}

          {/* Booking title */}
          {item.title && (
            <AppText
              variant="body"
              weight="semibold"
              style={{ marginBottom: 10 }}
            >
              {item.title}
            </AppText>
          )}

          {/* Description label */}
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#888", letterSpacing: 0.8, marginBottom: 6 }}
          >
            DESCRIPTION
          </AppText>
          <AppText variant="body" style={{ marginBottom: 14, lineHeight: 22 }}>
            {description}
          </AppText>

          {/* Parties */}
          {(item.hirer || item.worker) && (
            <View
              style={[
                styles.partiesRow,
                { borderTopColor: c.border, borderBottomColor: c.border },
              ]}
            >
              {item.hirer && (
                <View style={styles.partyItem}>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ marginBottom: 2 }}
                  >
                    Hirer
                  </AppText>
                  <AppText variant="body" weight="semibold">
                    {item.hirer.firstName} {item.hirer.lastName}
                  </AppText>
                </View>
              )}
              {item.worker && (
                <View style={styles.partyItem}>
                  <AppText
                    variant="small"
                    tone="dim"
                    style={{ marginBottom: 2 }}
                  >
                    Worker
                  </AppText>
                  <AppText variant="body" weight="semibold">
                    {item.worker.firstName} {item.worker.lastName}
                  </AppText>
                </View>
              )}
            </View>
          )}

          {/* Payment info */}
          {item.payment && (
            <View
              style={[
                styles.paymentRow,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <AppText variant="small" tone="dim">
                Payment
              </AppText>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor:
                      item.payment.status === "HELD"
                        ? "rgba(249,115,22,0.12)"
                        : "rgba(34,197,94,0.12)",
                    borderColor:
                      item.payment.status === "HELD" ? "#f97316" : "#22c55e",
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{
                    color:
                      item.payment.status === "HELD" ? "#f97316" : "#22c55e",
                    fontSize: 10,
                  }}
                >
                  {item.payment.status}
                </AppText>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.cardActions}>
            {/* View Booking */}
            <Pressable
              onPress={() => onViewBooking(item.id)}
              style={styles.viewBookingBtn}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#f97316" }}
              >
                View Booking →
              </AppText>
            </Pressable>

            {/* Cancel dispute (only if still DISPUTED) */}
            {item.status === "DISPUTED" && (
              <Pressable
                onPress={() => onCancel(item.id)}
                style={[styles.cancelDisputeBtn, { borderColor: "#ef4444" }]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#ef4444" }}
                >
                  Cancel Dispute
                </AppText>
              </Pressable>
            )}
          </View>

          {/* Admin review note */}
          <AppText variant="small" tone="dim" style={styles.reviewNote}>
            Our team reviews disputes within 24–48 hours. Keep an eye on your
            notifications.
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 8 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.skCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function DisputesScreen({ navigation, route }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();
  const { t } = useTranslation();

  // Route params: bookingId + bookingTitle for pre-opening the raise sheet
  const fromBookingId = route?.params?.bookingId ?? null;
  const fromBookingTitle = route?.params?.bookingTitle ?? null;

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("All");
  const [expanded, setExpanded] = useState(null); // bookingId of expanded card
  const [modal, setModal] = useState(null);

  // Raise dispute sheet
  const [sheetBookingId, setSheetBookingId] = useState(fromBookingId);
  const [sheetBookingTitle, setSheetBookingTitle] = useState(fromBookingTitle);
  const [sheetVisible, setSheetVisible] = useState(!!fromBookingId);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchDisputes = useCallback(async () => {
    try {
      const data = await getMyDisputes();
      setDisputes(data.disputes ?? []);
    } catch {
      toast.error("Failed to load disputes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDisputes();
  };

  // ── Cancel dispute ────────────────────────────────────────────────────────
  const handleCancel = (bookingId) => {
    setModal({
      title: "Cancel Dispute",
      message: "Cancel this dispute? The booking will be marked as Completed.",
      confirmLabel: "Yes, Cancel Dispute",
      destructive: true,
      onConfirm: async () => {
        try {
          await cancelDispute(bookingId);
          toast.success("Dispute cancelled. Booking marked as completed.");
          setExpanded(null);
          fetchDisputes();
        } catch (err) {
          toast.error(
            err?.response?.data?.message ?? "Failed to cancel dispute.",
          );
        }
      },
    });
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total = disputes.length;
  const active = disputes.filter((d) => d.status === "DISPUTED").length;
  const resolved = disputes.filter((d) =>
    ["COMPLETED", "CANCELLED"].includes(d.status),
  ).length;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const allowed = TAB_STATUSES[activeTab];
  const visible = allowed
    ? disputes.filter((d) => allowed.includes(d.status))
    : disputes;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            {/* ── Page header ── */}
            <View style={styles.pageHeader}>
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange, letterSpacing: 1.2, marginBottom: 6 }}
              >
                SUPPORT
              </AppText>

              <AppText
                variant="body"
                tone="dim"
                style={{ marginTop: 4, lineHeight: 22 }}
              >
                Track and manage disputes raised on your bookings
              </AppText>
            </View>

            {/* ── Stats row ── */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <AppText
                  weight="displayBlack"
                  variant="small"
                  style={[styles.statNum, { color: c.text }]}
                >
                  {total}
                </AppText>
                <AppText variant="small" tone="dim">
                  Total
                </AppText>
              </View>
              <View style={styles.statItem}>
                <AppText
                  weight="displayBlack"
                  style={[styles.statNum, { color: c.orange }]}
                >
                  {active}
                </AppText>
                <AppText variant="small" tone="dim">
                  Active
                </AppText>
              </View>
              <View style={styles.statItem}>
                <AppText
                  weight="displayBlack"
                  style={[styles.statNum, { color: "#22c55e" }]}
                >
                  {resolved}
                </AppText>
                <AppText variant="small" tone="dim">
                  Resolved
                </AppText>
              </View>
            </View>

            {/* ── Raise Dispute Button ── */}
            <Pressable
              onPress={() => {
                setSheetBookingId(null);
                setSheetBookingTitle(null);
                setSheetVisible(true);
              }}
              style={[styles.raiseBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                ⚠️ {t("disputes.raiseTitle")}
              </AppText>
            </Pressable>

            {/* ── Filter tabs ── */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}
            >
              {FILTER_TABS.map((tab) => {
                const active = activeTab === tab;
                return (
                  <Pressable
                    key={tab}
                    onPress={() => setActiveTab(tab)}
                    style={[
                      styles.tab,
                      { borderBottomColor: active ? c.orange : "transparent" },
                    ]}
                  >
                    <AppText
                      variant="body"
                      weight={active ? "semibold" : "regular"}
                      style={{ color: active ? c.orange : c.textMuted }}
                    >
                      {tab}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
            {/* Tab underline bar */}
            <View style={[styles.tabBar, { backgroundColor: c.border }]} />
          </View>
        }
        renderItem={({ item }) => (
          <DisputeCard
            item={item}
            expanded={expanded === item.id}
            onToggle={() =>
              setExpanded((prev) => (prev === item.id ? null : item.id))
            }
            onViewBooking={(id) =>
              navigation.navigate("BookingDetail", { bookingId: id })
            }
            onCancel={handleCancel}
            c={c}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <AppText style={{ fontSize: 40, textAlign: "center" }}>
                ⚖️
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ textAlign: "center", marginTop: 12 }}
              >
                No disputes
              </AppText>
              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 6, lineHeight: 20 }}
              >
                {activeTab === "All"
                  ? "You have no disputes. We hope it stays that way!"
                  : `No ${activeTab.toLowerCase()} disputes found.`}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      {/* Raise dispute sheet */}
      <RaiseDisputeSheet
        bookingId={sheetBookingId}
        bookingTitle={sheetBookingTitle}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onSuccess={fetchDisputes}
        c={c}
        modalBg={th.mode === "dark" ? "#111118" : "#ffffff"}
      />

      {/* Confirm modal */}
      <ConfirmModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel}
        destructive={modal?.destructive}
        onConfirm={() => {
          modal?.onConfirm?.();
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // Page header
  pageHeader: { paddingTop: 20, paddingBottom: 16 },
  heroTitle: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.5,
    lineHeight: 42,
  },

  raiseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 20,
  },

  // Stats
  statsRow: { flexDirection: "row", gap: 32, marginBottom: 20 },
  statItem: { alignItems: "flex-start", gap: 2 },
  statNum: { fontSize: 32, fontWeight: "900", lineHeight: 38 },

  // Filter tabs
  tabsScroll: { flexGrow: 0, marginBottom: 0 },
  tabsContent: { flexDirection: "row", gap: 0, paddingRight: 16 },
  tab: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    paddingTop: 4,
    marginRight: 20,
    borderBottomWidth: 2,
  },
  tabBar: { height: StyleSheet.hairlineWidth, marginBottom: 16 },

  // Dispute card
  disputeCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  warnIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitleBlock: { flex: 1 },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Expanded body
  cardBody: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  catChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
  },
  partiesRow: {
    flexDirection: "row",
    gap: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginVertical: 12,
  },
  partyItem: { flex: 1 },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },
  viewBookingBtn: { paddingVertical: 8 },
  cancelDisputeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  reviewNote: { lineHeight: 18, textAlign: "center", opacity: 0.6 },

  // Raise dispute sheet
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "88%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    paddingHorizontal: 20,
    marginBottom: 8,
    letterSpacing: 0.8,
    fontSize: 11,
  },
  reasonPills: { paddingHorizontal: 20, gap: 8, flexDirection: "row" },
  reasonPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  textarea: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    minHeight: 110,
    fontSize: 15,
    lineHeight: 22,
  },
  infoNote: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  submitBtn: {
    marginHorizontal: 20,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelLink: { alignItems: "center", paddingVertical: 14 },

  // Skeleton
  skCard: {
    height: 72,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});
