// src/screens/main/DisputesScreen.js
//
// Port of pages/disputes/Disputes.jsx + Disputes.module.css.
//
// Preserved verbatim:
//   - STATUS_META (DISPUTED / UNDER_REVIEW / RESOLVED / CANCELLED)
//   - GET /disputes/my (list)
//   - PATCH /disputes/:id/cancel (cancel)
//   - Header stats trio (Total / Active / Resolved)
//   - 5 filter tabs (All / Open / Under Review / Resolved / Cancelled)
//   - Expandable card: card-top → card-body
//   - Detail grid (reason / description / evidence)
//   - Booking details section
//   - Parties row (hirer + worker chips)
//   - Payment info block
//   - Actions: Cancel Dispute (only DISPUTED) + View Booking
//   - Confirmation modal
//   - Image lightbox
//
// Dedupe fix: `filtered` de-duplicates by id, so duplicate server rows can't
// trigger React's "two children with the same key" warning.

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import Skeleton from "../../components/Skeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaMoneyBillWave,
  FaUser,
  FaImage,
  FaTrash,
  FaEye,
  FaTimes,
  FaChevronRight,
} from "../../icons/fa";

const STATUS_META = {
  DISPUTED: { label: "Open", key: "open" },
  UNDER_REVIEW: { label: "Under Review", key: "review" },
  RESOLVED: { label: "Resolved", key: "resolved" },
  CANCELLED: { label: "Cancelled", key: "cancelled" },
};

function getStatusMeta(status) {
  return STATUS_META[status] || { label: status, key: "open" };
}

function statusColors(key, c) {
  switch (key) {
    case "open":
      return { bg: c.orangeDim, fg: c.orange, border: c.orangeGlow };
    case "review":
      return {
        bg: "rgba(59,130,246,0.1)",
        fg: "#60a5fa",
        border: "rgba(59,130,246,0.2)",
      };
    case "resolved":
      return { bg: c.greenDim, fg: c.green, border: "rgba(34,197,94,0.3)" };
    case "cancelled":
      return { bg: c.bgCard, fg: c.textMuted, border: c.border };
    default:
      return { bg: c.orangeDim, fg: c.orange, border: c.orangeGlow };
  }
}

function formatCurrency(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Status badge ──────────────────────────────────────────────────────
function StatusBadge({ status, c }) {
  const meta = getStatusMeta(status);
  const colors = statusColors(meta.key, c);
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: colors.bg,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
      }}
    >
      <AppText style={{ fontSize: 10, fontWeight: "700", color: colors.fg }}>
        {meta.label}
      </AppText>
    </View>
  );
}

// ── Confirmation modal ────────────────────────────────────────────────
function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, c }) {
  if (!isOpen) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
          justifyContent: "center",
          padding: 24,
        }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 18,
            padding: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 17,
                fontWeight: "800",
                color: c.text,
                flex: 1,
              }}
            >
              {title}
            </AppText>
            <Pressable onPress={onClose} hitSlop={8}>
              <FaTimes size={18} color={c.textDim} />
            </Pressable>
          </View>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              lineHeight: 19,
              marginTop: 10,
            }}
          >
            {message}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              marginTop: 18,
              justifyContent: "flex-end",
            }}
          >
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  backgroundColor: "transparent",
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 8,
                  opacity: pressed ? 0.75 : 1,
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
              onPress={onConfirm}
              style={({ pressed }) => [
                {
                  paddingVertical: 10,
                  paddingHorizontal: 18,
                  backgroundColor: c.red,
                  borderRadius: 8,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
              >
                Confirm
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Image lightbox ────────────────────────────────────────────────────
function ImageLightbox({ imageUrl, onClose }) {
  if (!imageUrl) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.92)",
          justifyContent: "center",
          alignItems: "center",
          padding: 16,
        }}
      >
        <Pressable
          onPress={onClose}
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
          <FaTimes size={22} color="#fff" />
        </Pressable>
        <Image
          source={{ uri: imageUrl }}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

// ── Detail item ───────────────────────────────────────────────────────
function DetailItem({ label, value, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 3,
        flexBasis: "48%",
        minWidth: 140,
      }}
    >
      <AppText
        style={{
          fontFamily: "DMSans_600SemiBold",
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          letterSpacing: 0.6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </AppText>
      <AppText style={{ fontSize: 12, color: c.text, lineHeight: 17 }}>
        {value}
      </AppText>
    </View>
  );
}

// ── Party chip ────────────────────────────────────────────────────────
function PartyChip({ person, role, c }) {
  if (!person) return null;
  const initials =
    `${person.firstName?.[0] || ""}${
      person.lastName?.[0] || ""
    }`.toUpperCase() || "?";
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: c.orangeDim,
          borderWidth: 1,
          borderColor: c.orangeGlow,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {person.avatar ? (
          <Image
            source={{ uri: person.avatar }}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <AppText style={{ fontSize: 10, fontWeight: "700", color: c.orange }}>
            {initials}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          numberOfLines={1}
          style={{ fontSize: 12, fontWeight: "700", color: c.text }}
        >
          {`${person.firstName || ""} ${person.lastName || ""}`.trim() || "—"}
        </AppText>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 3,
            marginTop: 2,
          }}
        >
          <FaUser size={9} color={c.textMuted} />
          <AppText style={{ fontSize: 10, color: c.textMuted }}>{role}</AppText>
        </View>
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────
export default function DisputesScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;
  const { user } = useAuthStore();

  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(null);
  const [success, setSuccess] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);
  const [lightboxImage, setLightboxImage] = useState(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setRefreshing(true);
    setError("");
    try {
      const res = await client.get("/disputes/my");
      const raw = res.data.data.disputes || [];

      // De-duplicate by id BEFORE storing to state — a corrupted server
      // response (double row for the same dispute) triggers React's
      // "two children with the same key" warning on render.
      const seen = new Set();
      const all = raw.filter((d) => {
        if (!d?.id || seen.has(d.id)) return false;
        seen.add(d.id);
        return true;
      });

      if (__DEV__ && all.length !== raw.length) {
        console.log(
          "[DisputesScreen] dropped",
          raw.length - all.length,
          "duplicate rows",
        );
      }

      setDisputes(all);
      setTotal(all.length);
    } catch {
      setError("Failed to load disputes.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load]);

  const openCancelModal = (bookingId) => {
    setCancelBookingId(bookingId);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setCancelBookingId(null);
  };

  const confirmCancel = async () => {
    if (!cancelBookingId) return;
    setCancelling(cancelBookingId);
    setError("");
    setSuccess("");
    try {
      await client.patch(`/disputes/${cancelBookingId}/cancel`);
      setSuccess("Dispute cancelled successfully.");
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === cancelBookingId ? { ...d, status: "CANCELLED" } : d,
        ),
      );
      closeCancelModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cancel dispute.");
      closeCancelModal();
    } finally {
      setCancelling(null);
    }
  };

  // Filter tabs — safe since disputes is already deduped
  const seenIds = new Set();
  const filtered = (
    filterStatus ? disputes.filter((d) => d.status === filterStatus) : disputes
  ).filter((d) => {
    if (!d?.id || seenIds.has(d.id)) return false;
    seenIds.add(d.id);
    return true;
  });

  const filterTabs = [
    { value: "", label: "All" },
    { value: "DISPUTED", label: "Open" },
    { value: "UNDER_REVIEW", label: "Under Review" },
    { value: "RESOLVED", label: "Resolved" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const totalActive = disputes.filter(
    (d) => d.status === "DISPUTED" || d.status === "UNDER_REVIEW",
  ).length;
  const totalResolved = disputes.filter((d) => d.status === "RESOLVED").length;

  // ── Loading ────────────────────────────────────────────────────
  if (loading && disputes.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
        <View style={{ padding: 16, gap: 14 }}>
          <Skeleton width="40%" height={14} radius={4} />
          <Skeleton width="60%" height={28} radius={6} />
          <Skeleton width="80%" height={14} radius={4} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={56} radius={10} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={56} radius={10} />
            </View>
            <View style={{ flex: 1 }}>
              <Skeleton width="100%" height={56} radius={10} />
            </View>
          </View>
          <Skeleton width="100%" height={32} radius={6} />
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={90} radius={14} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(false)}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
      >
        {/* Header */}
        <View>
          <AppText
            style={{
              fontFamily: "DMSans_600SemiBold",
              fontSize: 10,
              fontWeight: "700",
              color: c.orange,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Support
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 24,
              fontWeight: "800",
              color: c.text,
              letterSpacing: -0.3,
            }}
          >
            My Disputes
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              marginTop: 4,
              lineHeight: 17,
            }}
          >
            Track and manage disputes raised on your bookings
          </AppText>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              gap: 12,
              marginTop: 14,
              paddingHorizontal: 8,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 20,
                  fontWeight: "800",
                  color: c.text,
                }}
              >
                {total}
              </AppText>
              <AppText
                style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}
              >
                Total
              </AppText>
            </View>
            <View style={{ alignItems: "center" }}>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 20,
                  fontWeight: "800",
                  color: c.orange,
                }}
              >
                {totalActive}
              </AppText>
              <AppText
                style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}
              >
                Active
              </AppText>
            </View>
            <View style={{ alignItems: "center" }}>
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: 20,
                  fontWeight: "800",
                  color: c.green,
                }}
              >
                {totalResolved}
              </AppText>
              <AppText
                style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}
              >
                Resolved
              </AppText>
            </View>
          </View>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: 4,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
            paddingBottom: 1,
          }}
        >
          {filterTabs.map((tab) => {
            const active = filterStatus === tab.value;
            return (
              <Pressable
                key={tab.value || "all"}
                onPress={() => setFilterStatus(tab.value)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? c.orange : "transparent",
                  marginBottom: -1,
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    fontWeight: active ? "700" : "500",
                    color: active ? c.orange : c.textMuted,
                  }}
                >
                  {tab.label}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Alerts */}
        {error ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.redDim,
              borderWidth: 1,
              borderColor: c.red,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <FaExclamationTriangle size={13} color={c.red} />
            <AppText style={{ flex: 1, fontSize: 12, color: c.red }}>
              {error}
            </AppText>
            <Pressable onPress={() => setError("")} hitSlop={6}>
              <FaTimes size={12} color={c.red} />
            </Pressable>
          </View>
        ) : null}

        {success ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.greenDim,
              borderWidth: 1,
              borderColor: c.green,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 10,
            }}
          >
            <FaCheckCircle size={13} color={c.green} />
            <AppText style={{ flex: 1, fontSize: 12, color: c.green }}>
              {success}
            </AppText>
            <Pressable onPress={() => setSuccess("")} hitSlop={6}>
              <FaTimes size={12} color={c.green} />
            </Pressable>
          </View>
        ) : null}

        {/* List */}
        {filtered.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 48,
              paddingHorizontal: 20,
              backgroundColor: c.bgPanel,
              borderWidth: 1.5,
              borderColor: c.border,
              borderStyle: "dashed",
              borderRadius: 14,
              gap: 10,
            }}
          >
            <FaShieldAlt
              size={40}
              color={c.textMuted}
              style={{ opacity: 0.5 }}
            />
            <AppText
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: c.text,
                textAlign: "center",
              }}
            >
              {filterStatus
                ? `No ${getStatusMeta(filterStatus).label.toLowerCase()} disputes`
                : "No disputes yet"}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                textAlign: "center",
                maxWidth: 320,
              }}
            >
              Disputes can be raised from any active booking that has an issue.
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filtered.map((dispute) => {
              const isExpanded = expanded === dispute.id;
              const meta = getStatusMeta(dispute.status);
              const colors = statusColors(meta.key, c);
              const StatusIcon =
                dispute.status === "RESOLVED"
                  ? FaCheckCircle
                  : dispute.status === "CANCELLED"
                    ? FaTimesCircle
                    : FaExclamationTriangle;

              return (
                <View
                  key={dispute.id}
                  style={{
                    backgroundColor: c.bgPanel,
                    borderWidth: 1,
                    borderColor: isExpanded ? c.orangeGlow : c.border,
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                >
                  {/* Card top */}
                  <Pressable
                    onPress={() =>
                      setExpanded((prev) =>
                        prev === dispute.id ? null : dispute.id,
                      )
                    }
                    style={({ pressed }) => [
                      {
                        flexDirection: "row",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: 10,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 9,
                          backgroundColor: colors.bg,
                          borderWidth: 1,
                          borderColor: colors.border,
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <StatusIcon size={14} color={colors.fg} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <AppText
                          numberOfLines={2}
                          style={{
                            fontFamily: "DMSans_600SemiBold",
                            fontSize: 13,
                            fontWeight: "700",
                            color: c.text,
                          }}
                        >
                          {dispute.title || "Booking dispute"}
                        </AppText>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            alignItems: "center",
                            gap: 5,
                            marginTop: 5,
                          }}
                        >
                          {dispute.disputeReason ? (
                            <View
                              style={{
                                backgroundColor: c.bgCard,
                                borderWidth: 1,
                                borderColor: c.border,
                                borderRadius: 4,
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                              }}
                            >
                              <AppText
                                style={{
                                  fontSize: 10,
                                  color: c.textDim,
                                  textTransform: "capitalize",
                                }}
                              >
                                {dispute.disputeReason.replace(/_/g, " ")}
                              </AppText>
                            </View>
                          ) : null}
                          <AppText style={{ fontSize: 10, color: c.textDim }}>
                            {new Date(dispute.createdAt).toLocaleDateString(
                              "en-GB",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              },
                            )}
                          </AppText>
                        </View>
                      </View>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      <StatusBadge status={dispute.status} c={c} />
                      <FaChevronRight
                        size={12}
                        color={c.textMuted}
                        style={{
                          transform: [
                            { rotate: isExpanded ? "90deg" : "0deg" },
                          ],
                        }}
                      />
                    </View>
                  </Pressable>

                  {/* Card body */}
                  {isExpanded ? (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: c.border,
                        paddingHorizontal: 14,
                        paddingVertical: 14,
                        gap: 14,
                      }}
                    >
                      {/* Dispute details */}
                      <View style={{ gap: 8 }}>
                        {dispute.disputeReason ? (
                          <DetailItem
                            label="Reason"
                            value={dispute.disputeReason.replace(/_/g, " ")}
                            c={c}
                          />
                        ) : null}
                        {dispute.disputeDescription ? (
                          <DetailItem
                            label="Description"
                            value={dispute.disputeDescription}
                            c={c}
                          />
                        ) : null}
                        {dispute.disputeEvidence &&
                        dispute.disputeEvidence.length > 0 ? (
                          <View>
                            <AppText
                              style={{
                                fontFamily: "DMSans_600SemiBold",
                                fontSize: 9,
                                fontWeight: "700",
                                color: c.textMuted,
                                letterSpacing: 0.6,
                                textTransform: "uppercase",
                                marginBottom: 6,
                              }}
                            >
                              Evidence
                            </AppText>
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {dispute.disputeEvidence.map((url, idx) => (
                                <Pressable
                                  key={idx}
                                  onPress={() => setLightboxImage(url)}
                                  style={({ pressed }) => [
                                    {
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 4,
                                      backgroundColor: c.bgInput || c.bgCard,
                                      borderWidth: 1,
                                      borderColor: c.border,
                                      borderRadius: 6,
                                      paddingHorizontal: 8,
                                      paddingVertical: 5,
                                      opacity: pressed ? 0.75 : 1,
                                    },
                                  ]}
                                >
                                  <FaImage size={11} color={c.textDim} />
                                  <AppText
                                    style={{
                                      fontSize: 10,
                                      color: c.textDim,
                                    }}
                                  >
                                    View
                                  </AppText>
                                </Pressable>
                              ))}
                            </View>
                          </View>
                        ) : null}
                      </View>

                      {/* Booking details */}
                      <View>
                        <AppText
                          style={{
                            fontFamily: "DMSans_600SemiBold",
                            fontSize: 9,
                            fontWeight: "700",
                            color: c.textMuted,
                            letterSpacing: 0.6,
                            textTransform: "uppercase",
                            marginBottom: 6,
                          }}
                        >
                          Booking Details
                        </AppText>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 8,
                          }}
                        >
                          {dispute.agreedRate != null ? (
                            <DetailItem
                              label="Agreed Rate"
                              value={formatCurrency(
                                dispute.agreedRate,
                                dispute.currency,
                              )}
                              c={c}
                            />
                          ) : null}
                          {dispute.estimatedUnit && dispute.estimatedValue ? (
                            <DetailItem
                              label="Duration"
                              value={`${dispute.estimatedValue} ${dispute.estimatedUnit}`}
                              c={c}
                            />
                          ) : null}
                          {dispute.address ? (
                            <DetailItem
                              label="Address"
                              value={dispute.address}
                              c={c}
                            />
                          ) : null}
                          {dispute.scheduledAt ? (
                            <DetailItem
                              label="Scheduled"
                              value={new Date(
                                dispute.scheduledAt,
                              ).toLocaleString("en-GB", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                              c={c}
                            />
                          ) : null}
                          {dispute.jobType ? (
                            <DetailItem
                              label="Job Type"
                              value={dispute.jobType.replace(/_/g, " ")}
                              c={c}
                            />
                          ) : null}
                          {dispute.locationType ? (
                            <DetailItem
                              label="Location"
                              value={dispute.locationType.replace(/_/g, " ")}
                              c={c}
                            />
                          ) : null}
                        </View>
                      </View>

                      {/* Parties */}
                      {dispute.hirer || dispute.worker ? (
                        <View style={{ gap: 6 }}>
                          {dispute.hirer ? (
                            <PartyChip
                              person={dispute.hirer}
                              role="Hirer"
                              c={c}
                            />
                          ) : null}
                          {dispute.worker ? (
                            <PartyChip
                              person={dispute.worker}
                              role="Worker"
                              c={c}
                            />
                          ) : null}
                        </View>
                      ) : null}

                      {/* Payment info */}
                      {dispute.payments && dispute.payments.length > 0 ? (
                        <View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              marginBottom: 6,
                            }}
                          >
                            <FaMoneyBillWave size={10} color={c.orange} />
                            <AppText
                              style={{
                                fontFamily: "DMSans_600SemiBold",
                                fontSize: 9,
                                fontWeight: "700",
                                color: c.textMuted,
                                letterSpacing: 0.6,
                                textTransform: "uppercase",
                              }}
                            >
                              Payment
                            </AppText>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <DetailItem
                              label="Status"
                              value={dispute.payments[0].status}
                              c={c}
                            />
                            <DetailItem
                              label="Amount"
                              value={formatCurrency(
                                dispute.payments[0].amount,
                                dispute.payments[0].currency,
                              )}
                              c={c}
                            />
                          </View>
                        </View>
                      ) : null}

                      {/* Actions */}
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 8,
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: c.border,
                        }}
                      >
                        {dispute.status === "DISPUTED" ? (
                          <Pressable
                            onPress={() => openCancelModal(dispute.id)}
                            disabled={cancelling === dispute.id}
                            style={({ pressed }) => [
                              {
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 5,
                                paddingHorizontal: 14,
                                paddingVertical: 9,
                                backgroundColor: "transparent",
                                borderWidth: 1,
                                borderColor: c.red,
                                borderRadius: 8,
                                opacity:
                                  cancelling === dispute.id
                                    ? 0.5
                                    : pressed
                                      ? 0.75
                                      : 1,
                              },
                            ]}
                          >
                            {cancelling === dispute.id ? (
                              <>
                                <ActivityIndicator size="small" color={c.red} />
                                <AppText
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: c.red,
                                  }}
                                >
                                  Cancelling...
                                </AppText>
                              </>
                            ) : (
                              <>
                                <FaTrash size={11} color={c.red} />
                                <AppText
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "600",
                                    color: c.red,
                                  }}
                                >
                                  Cancel Dispute
                                </AppText>
                              </>
                            )}
                          </Pressable>
                        ) : null}
                        <Pressable
                          onPress={() =>
                            navigation.navigate("BookingDetail", {
                              bookingId: dispute.id,
                            })
                          }
                          style={({ pressed }) => [
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                              paddingHorizontal: 10,
                              paddingVertical: 9,
                              marginLeft: "auto",
                              opacity: pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          <FaEye size={11} color={c.orange} />
                          <AppText
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: c.orange,
                            }}
                          >
                            View Booking →
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Confirmation modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={closeCancelModal}
        onConfirm={confirmCancel}
        title="Cancel Dispute"
        message="Are you sure you want to cancel this dispute? This action cannot be undone."
        c={c}
      />

      {/* Image lightbox */}
      <ImageLightbox
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
