// src/screens/main/MyDisputesScreen.js
//
// Verbatim port of pages/disputes/MyDisputes.jsx.
//
// Fetch: GET /disputes/my
// Cancel: PATCH /disputes/:bookingId/cancel
//
// Renders:
//   · Header: "SUPPORT" eyebrow + "My Disputes" title + subtitle +
//             3 header stats (total / active / resolved)
//   · 5 filter tabs (All / Open / Under Review / Resolved / Cancelled)
//   · Error + success banners (dismissible)
//   · Expandable dispute cards with:
//       - Icon + title + reason tag + date + category tag + status badge
//       - Body: reason, description, evidence gallery (with lightbox),
//               booking details grid, parties (hirer + worker),
//               payment status, actions (cancel dispute + view booking)
//   · Cancel dispute confirmation modal
//   · Image lightbox modal
//   · Empty state
//   · PageSkeleton during initial load
//
// Port notes:
//   · window.confirm → ConfirmModal (React Native Modal)
//   · <img> with onClick lightbox → Pressable + Modal Image
//   · <button> → Pressable throughout

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaUser,
  FaImage,
  FaTrash,
  FaEye,
  FaTimes,
} from "../../icons/fa";

// ── Status meta — verbatim from web ──────────────────────────────────
const STATUS_META = {
  DISPUTED: {
    label: "Open",
    color: "#f97316",
    bg: "rgba(249,115,22,0.12)",
    icon: FaExclamationTriangle,
  },
  UNDER_REVIEW: {
    label: "Under Review",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.1)",
    icon: FaClock,
  },
  RESOLVED: {
    label: "Resolved",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
    icon: FaCheckCircle,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#9ca3af",
    bg: "rgba(156,163,175,0.12)",
    icon: FaTimesCircle,
  },
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "DISPUTED", label: "Open" },
  { key: "UNDER_REVIEW", label: "Under Review" },
  { key: "RESOLVED", label: "Resolved" },
  { key: "CANCELLED", label: "Cancelled" },
];

function fmtCurrency(amount, currency = "NGN") {
  if (amount == null) return `${currency} 0.00`;
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function MyDisputesScreen({ route }) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState(null);

  // Cancel confirmation modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);

  // Image lightbox
  const [lightboxImage, setLightboxImage] = useState(null);

  // ── Fetch ───────────────────────────────────────────────────────────
  const load = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const res = await client.get("/disputes/my");
        const list = res?.data?.data?.disputes || [];
        setDisputes(list);
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to load disputes.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // If routed with a bookingId (from "Raise a Dispute" on booking detail),
  // auto-expand that dispute when it loads.
  useEffect(() => {
    const targetId = route?.params?.bookingId;
    if (targetId && disputes.length > 0) {
      const match = disputes.find((d) => d.id === targetId);
      if (match) setExpanded(match.id);
    }
  }, [disputes, route?.params?.bookingId]);

  const onRefresh = () => {
    setRefreshing(true);
    load(true);
  };

  // ── Cancel dispute ──────────────────────────────────────────────────
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
    try {
      await client.patch(`/disputes/${cancelBookingId}/cancel`);
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === cancelBookingId ? { ...d, status: "CANCELLED" } : d,
        ),
      );
      toast.success("Dispute cancelled successfully.");
      closeCancelModal();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to cancel dispute.");
      closeCancelModal();
    } finally {
      setCancelling(null);
    }
  };

  // ── Derived ─────────────────────────────────────────────────────────
  const total = disputes.length;
  const activeCount = disputes.filter(
    (d) => d.status === "DISPUTED" || d.status === "UNDER_REVIEW",
  ).length;
  const resolvedCount = disputes.filter((d) => d.status === "RESOLVED").length;

  const filtered = useMemo(() => {
    if (!filterStatus) return disputes;
    return disputes.filter((d) => d.status === filterStatus);
  }, [disputes, filterStatus]);

  // ── Loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="list" rows={4} />
      </AppScreen>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════
  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* ── Header ───────────────────────────────────────────────── */}
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "800",
          color: c.orange,
          letterSpacing: 1.5,
          textTransform: "uppercase",
          marginBottom: 6,
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
          letterSpacing: -0.4,
          lineHeight: 30,
        }}
      >
        My Disputes
      </AppText>
      <AppText
        style={{
          fontSize: 12,
          color: c.textDim,
          marginTop: 4,
          marginBottom: 16,
          lineHeight: 18,
        }}
      >
        Track and manage disputes raised on your bookings
      </AppText>

      {/* ── Header stats ─────────────────────────────────────────── */}
      <View style={styles.headerStats}>
        <HeaderStat label="Total" value={total} color={c.text} />
        <HeaderStat label="Active" value={activeCount} color={c.orange} />
        <HeaderStat label="Resolved" value={resolvedCount} color={c.green} />
      </View>

      {/* ── Filter tabs ──────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 14 }}
        contentContainerStyle={{ gap: 4 }}
      >
        {FILTERS.map((f) => {
          const active = filterStatus === f.key;
          return (
            <Pressable
              key={f.key || "all"}
              onPress={() => setFilterStatus(f.key)}
              style={[
                styles.filterTab,
                {
                  borderBottomColor: active ? c.orange : "transparent",
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 13,
                  fontWeight: active ? "700" : "500",
                  color: active ? c.orange : c.textMuted,
                }}
              >
                {f.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Dispute list ─────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <FaShieldAlt
            size={36}
            color={c.textMuted}
            style={{ marginBottom: 10 }}
          />
          <AppText
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: c.text,
              textAlign: "center",
            }}
          >
            {filterStatus
              ? `No ${STATUS_META[filterStatus]?.label?.toLowerCase()} disputes`
              : "No disputes yet"}
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textDim,
              marginTop: 6,
              textAlign: "center",
              lineHeight: 18,
            }}
          >
            Disputes can be raised from any active booking that has an issue.
          </AppText>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filtered.map((dispute) => {
            const meta = STATUS_META[dispute.status] || STATUS_META.DISPUTED;
            const Icon = meta.icon;
            const isExpanded = expanded === dispute.id;
            return (
              <View
                key={dispute.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: c.bgPanel,
                    borderColor: isExpanded ? c.orangeGlow : c.border,
                  },
                ]}
              >
                {/* Card top (pressable to expand) */}
                <Pressable
                  onPress={() =>
                    setExpanded((prev) =>
                      prev === dispute.id ? null : dispute.id,
                    )
                  }
                  style={styles.cardTop}
                >
                  <View
                    style={[
                      styles.disputeIcon,
                      {
                        backgroundColor: meta.bg,
                        borderColor: `${meta.color}55`,
                      },
                    ]}
                  >
                    <Icon size={16} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: c.text,
                      }}
                      numberOfLines={2}
                    >
                      {dispute.title || "Booking dispute"}
                    </AppText>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 4,
                      }}
                    >
                      {dispute.disputeReason ? (
                        <View
                          style={[
                            styles.reasonTag,
                            {
                              backgroundColor: c.bgCard,
                              borderColor: c.border,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "600",
                              color: c.textDim,
                              textTransform: "capitalize",
                            }}
                          >
                            {String(dispute.disputeReason).replace(/_/g, " ")}
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
                      {dispute.category ? (
                        <View
                          style={[
                            styles.reasonTag,
                            {
                              backgroundColor: c.orangeDim,
                              borderColor: c.orangeGlow,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 9,
                              fontWeight: "600",
                              color: c.orange,
                            }}
                          >
                            {dispute.category.icon} {dispute.category.name}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: meta.bg, borderColor: meta.color },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 9,
                          fontWeight: "700",
                          color: meta.color,
                          textTransform: "uppercase",
                          letterSpacing: 0.3,
                        }}
                      >
                        {meta.label}
                      </AppText>
                    </View>
                    <AppText style={{ fontSize: 9, color: c.textMuted }}>
                      {isExpanded ? "▲" : "▼"}
                    </AppText>
                  </View>
                </Pressable>

                {/* Expanded body */}
                {isExpanded ? (
                  <View style={[styles.cardBody, { borderTopColor: c.border }]}>
                    {/* Reason / Description */}
                    <View style={{ gap: 10 }}>
                      {dispute.disputeReason ? (
                        <DetailBlock label="Reason" c={c}>
                          <AppText style={{ fontSize: 13, color: c.text }}>
                            {String(dispute.disputeReason).replace(/_/g, " ")}
                          </AppText>
                        </DetailBlock>
                      ) : null}
                      {dispute.disputeDescription ? (
                        <DetailBlock label="Description" c={c}>
                          <AppText
                            style={{
                              fontSize: 13,
                              color: c.text,
                              lineHeight: 19,
                            }}
                          >
                            {dispute.disputeDescription}
                          </AppText>
                        </DetailBlock>
                      ) : null}
                      {dispute.disputeEvidence?.length > 0 ? (
                        <DetailBlock label="Evidence" c={c}>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ gap: 8 }}
                          >
                            {dispute.disputeEvidence.map((url, idx) => (
                              <Pressable
                                key={idx}
                                onPress={() => setLightboxImage(url)}
                                style={[
                                  styles.evidenceThumb,
                                  {
                                    backgroundColor: c.bgInput,
                                    borderColor: c.border,
                                  },
                                ]}
                              >
                                <Image
                                  source={{ uri: url }}
                                  style={styles.evidenceImg}
                                />
                                <View
                                  style={[
                                    styles.evidenceOverlay,
                                    { backgroundColor: "rgba(0,0,0,0.4)" },
                                  ]}
                                >
                                  <FaEye size={12} color="#fff" />
                                </View>
                              </Pressable>
                            ))}
                          </ScrollView>
                        </DetailBlock>
                      ) : null}
                    </View>

                    {/* Booking details */}
                    <DetailSection title="Booking Details" c={c}>
                      <View style={styles.detailGrid}>
                        {dispute.agreedRate != null ? (
                          <GridItem
                            label="Agreed Rate"
                            value={fmtCurrency(
                              dispute.agreedRate,
                              dispute.currency,
                            )}
                            c={c}
                          />
                        ) : null}
                        {dispute.estimatedUnit && dispute.estimatedValue ? (
                          <GridItem
                            label="Duration"
                            value={`${dispute.estimatedValue} ${dispute.estimatedUnit}`}
                            c={c}
                          />
                        ) : null}
                        {dispute.address ? (
                          <GridItem
                            label="Address"
                            value={dispute.address}
                            c={c}
                            icon={
                              <FaMapMarkerAlt size={9} color={c.textMuted} />
                            }
                          />
                        ) : null}
                        {dispute.scheduledAt ? (
                          <GridItem
                            label="Scheduled"
                            value={new Date(dispute.scheduledAt).toLocaleString(
                              "en-GB",
                              { dateStyle: "medium", timeStyle: "short" },
                            )}
                            c={c}
                            icon={
                              <FaCalendarAlt size={9} color={c.textMuted} />
                            }
                          />
                        ) : null}
                        {dispute.jobType ? (
                          <GridItem
                            label="Job Type"
                            value={String(dispute.jobType).replace(/_/g, " ")}
                            c={c}
                          />
                        ) : null}
                        {dispute.locationType ? (
                          <GridItem
                            label="Location"
                            value={String(dispute.locationType).replace(
                              /_/g,
                              " ",
                            )}
                            c={c}
                          />
                        ) : null}
                      </View>
                    </DetailSection>

                    {/* Parties */}
                    {dispute.hirer || dispute.worker ? (
                      <View style={styles.partiesRow}>
                        {dispute.hirer ? (
                          <PartyChip party={dispute.hirer} role="Hirer" c={c} />
                        ) : null}
                        {dispute.worker ? (
                          <PartyChip
                            party={dispute.worker}
                            role="Worker"
                            c={c}
                          />
                        ) : null}
                      </View>
                    ) : null}

                    {/* Payment info */}
                    {dispute.payments?.length > 0 ? (
                      <DetailSection
                        title="Payment"
                        c={c}
                        icon={<FaMoneyBillWave size={11} color={c.orange} />}
                      >
                        <View style={styles.detailGrid}>
                          <GridItem
                            label="Status"
                            value={dispute.payments[0].status}
                            c={c}
                          />
                          <GridItem
                            label="Amount"
                            value={fmtCurrency(
                              dispute.payments[0].amount,
                              dispute.payments[0].currency,
                            )}
                            c={c}
                          />
                        </View>
                      </DetailSection>
                    ) : null}

                    {/* Actions */}
                    <View
                      style={[styles.actionsRow, { borderTopColor: c.border }]}
                    >
                      {dispute.status === "DISPUTED" ? (
                        <Pressable
                          onPress={() => openCancelModal(dispute.id)}
                          disabled={cancelling === dispute.id}
                          style={({ pressed }) => [
                            styles.cancelBtn,
                            {
                              borderColor: c.red,
                              backgroundColor: c.redDim,
                              opacity:
                                cancelling === dispute.id
                                  ? 0.5
                                  : pressed
                                    ? 0.85
                                    : 1,
                            },
                          ]}
                        >
                          {cancelling === dispute.id ? (
                            <ActivityIndicator color={c.red} size="small" />
                          ) : (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <FaTrash size={10} color={c.red} />
                              <AppText
                                style={{
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color: c.red,
                                }}
                              >
                                Cancel Dispute
                              </AppText>
                            </View>
                          )}
                        </Pressable>
                      ) : null}
                      <Pressable
                        onPress={() =>
                          navigation.navigate("BookingDetail", {
                            bookingId: dispute.id,
                          })
                        }
                        style={styles.viewBookingBtn}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <FaEye size={10} color={c.orange} />
                          <AppText
                            style={{
                              fontSize: 12,
                              fontWeight: "600",
                              color: c.orange,
                            }}
                          >
                            View Booking →
                          </AppText>
                        </View>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {/* ── Cancel confirmation modal ────────────────────────────── */}
      <Modal
        visible={showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <AppText
                style={{
                  fontFamily: "Syne_700Bold",
                  fontSize: 16,
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                Cancel Dispute
              </AppText>
              <Pressable onPress={closeCancelModal} hitSlop={8}>
                <FaTimesCircle size={18} color={c.textDim} />
              </Pressable>
            </View>
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                lineHeight: 19,
                marginBottom: 16,
              }}
            >
              Are you sure you want to cancel this dispute? This action cannot
              be undone.
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={closeCancelModal}
                disabled={!!cancelling}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: "transparent",
                    borderColor: c.border,
                    borderWidth: 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: c.textDim,
                  }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                disabled={!!cancelling}
                style={({ pressed }) => [
                  styles.modalBtn,
                  {
                    backgroundColor: c.red,
                    opacity: cancelling ? 0.6 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {cancelling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    Confirm
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Image lightbox modal ─────────────────────────────────── */}
      <Modal
        visible={!!lightboxImage}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxImage(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setLightboxImage(null)}
        >
          <Pressable
            style={styles.lightboxContent}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              onPress={() => setLightboxImage(null)}
              style={styles.lightboxClose}
            >
              <FaTimes size={20} color="#fff" />
            </Pressable>
            {lightboxImage ? (
              <Image
                source={{ uri: lightboxImage }}
                style={styles.lightboxImg}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

// ── Sub-components ───────────────────────────────────────────────────
function HeaderStat({ label, value, color }) {
  return (
    <View style={{ alignItems: "center" }}>
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 22,
          fontWeight: "800",
          color,
          lineHeight: 26,
        }}
      >
        {value}
      </AppText>
      <AppText
        style={{
          fontSize: 10,
          color: "#9ca3af",
          marginTop: 2,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

function DetailBlock({ label, children, c }) {
  return (
    <View>
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {label}
      </AppText>
      {children}
    </View>
  );
}

function DetailSection({ title, children, c, icon }) {
  return (
    <View
      style={{
        paddingTop: 12,
        marginTop: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: c.border,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          marginBottom: 8,
        }}
      >
        {icon || <FaMoneyBillWave size={11} color={c.orange} />}
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

function GridItem({ label, value, c, icon }) {
  return (
    <View
      style={[
        styles.gridItem,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
        {icon}
        <AppText
          style={{
            fontSize: 9,
            fontWeight: "700",
            color: c.textMuted,
            textTransform: "uppercase",
            letterSpacing: 0.4,
            marginBottom: 2,
          }}
        >
          {label}
        </AppText>
      </View>
      <AppText
        style={{ fontSize: 12, color: c.text, fontWeight: "600" }}
        numberOfLines={3}
      >
        {value}
      </AppText>
    </View>
  );
}

function PartyChip({ party, role, c }) {
  const initials = `${party.firstName?.[0] || ""}${
    party.lastName?.[0] || ""
  }`.toUpperCase();
  return (
    <View
      style={[
        styles.partyChip,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View
        style={[
          styles.partyAvatar,
          { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
        ]}
      >
        {party.avatar ? (
          <Image source={{ uri: party.avatar }} style={styles.partyAvatarImg} />
        ) : (
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.orange,
            }}
          >
            {initials}
          </AppText>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText
          style={{ fontSize: 12, fontWeight: "600", color: c.text }}
          numberOfLines={1}
        >
          {party.firstName} {party.lastName}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <FaUser size={8} color={c.textMuted} />
          <AppText style={{ fontSize: 10, color: c.textMuted }}>{role}</AppText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 14,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 4,
    paddingBottom: 10,
    paddingTop: 4,
    marginRight: 12,
    borderBottomWidth: 2,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 12,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  disputeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  reasonTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  cardBody: {
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  evidenceThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  evidenceImg: {
    width: "100%",
    height: "100%",
  },
  evidenceOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridItem: {
    width: "48.5%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  partiesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 12,
  },
  partyChip: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  partyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  partyAvatarImg: {
    width: "100%",
    height: "100%",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
  },
  viewBookingBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 4,
    marginLeft: "auto",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxContent: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "85%",
    backgroundColor: "#000",
    borderRadius: 12,
    overflow: "hidden",
  },
  lightboxClose: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImg: {
    width: "100%",
    height: 400,
  },
});
