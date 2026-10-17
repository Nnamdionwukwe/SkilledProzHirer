// src/screens/main/MyDisputesScreen.js
import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Image,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaTimes,
  FaImage,
  FaEye,
  FaTrash,
  FaSpinner,
} from "../../icons/fa";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

const STATUS_META = {
  DISPUTED: { label: "Open", color: "#f97316" },
  UNDER_REVIEW: { label: "Under Review", color: "#60a5fa" },
  RESOLVED: { label: "Resolved", color: "#22c55e" },
  CANCELLED: { label: "Cancelled", color: "#9ca3af" },
};

export default function MyDisputesScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const navigation = useNavigation();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await client.get("/disputes/my");
      setDisputes(res.data.data.disputes || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const confirmCancel = async () => {
    if (!showCancelModal) return;
    setCancelling(showCancelModal);
    try {
      await client.patch(`/disputes/${showCancelModal}/cancel`);
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === showCancelModal ? { ...d, status: "CANCELLED" } : d,
        ),
      );
      setShowCancelModal(null);
    } catch {
    } finally {
      setCancelling(null);
    }
  };

  const filtered = filterStatus
    ? disputes.filter((d) => d.status === filterStatus)
    : disputes;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={{ marginBottom: 16 }}>
          <AppText
            variant="small"
            weight="bold"
            style={{
              color: c.orange,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Support
          </AppText>
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ marginTop: 2 }}
          >
            My Disputes
          </AppText>
          <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
            Track and manage disputes raised on your bookings
          </AppText>
        </View>

        {/* Filter tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, marginBottom: 16 }}
        >
          {["", "DISPUTED", "UNDER_REVIEW", "RESOLVED", "CANCELLED"].map(
            (s) => {
              const active = filterStatus === s;
              return (
                <Pressable
                  key={s || "all"}
                  onPress={() => setFilterStatus(s)}
                  style={[
                    styles.tab,
                    {
                      borderColor: active ? c.orange : c.border,
                      backgroundColor: active ? c.orangeDim : c.bgCard,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: active ? c.orange : c.textDim }}
                  >
                    {s === "" ? "All" : STATUS_META[s]?.label || s}
                  </AppText>
                </Pressable>
              );
            },
          )}
        </ScrollView>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={c.orange}
            style={{ paddingVertical: 40 }}
          />
        ) : filtered.length === 0 ? (
          <View
            style={[
              styles.empty,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <FaShieldAlt size={32} color={c.textMuted} />
            <AppText weight="bold" style={{ marginTop: 12 }}>
              {filterStatus
                ? `No ${STATUS_META[filterStatus]?.label?.toLowerCase()} disputes`
                : "No disputes yet"}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ marginTop: 6, textAlign: "center" }}
            >
              Disputes can be raised from any active booking that has an issue.
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {filtered.map((d) => {
              const meta = STATUS_META[d.status] || STATUS_META.DISPUTED;
              const open = expanded === d.id;
              return (
                <View
                  key={d.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: c.bgPanel,
                      borderColor: open ? c.orange : c.border,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => setExpanded(open ? null : d.id)}
                    style={styles.cardTop}
                  >
                    <View
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <View
                        style={[
                          styles.cardIcon,
                          {
                            backgroundColor: `${meta.color}22`,
                            borderColor: meta.color,
                          },
                        ]}
                      >
                        {d.status === "RESOLVED" ? (
                          <FaCheckCircle size={16} color={meta.color} />
                        ) : d.status === "CANCELLED" ? (
                          <FaTimesCircle size={16} color={meta.color} />
                        ) : (
                          <FaExclamationTriangle size={16} color={meta.color} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText weight="semibold" numberOfLines={2}>
                          {d.title || "Booking dispute"}
                        </AppText>
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 4,
                          }}
                        >
                          {d.disputeReason && (
                            <AppText variant="small" tone="dim">
                              {d.disputeReason.replace(/_/g, " ")}
                            </AppText>
                          )}
                          <AppText variant="small" tone="dim">
                            ·
                          </AppText>
                          <AppText variant="small" tone="dim">
                            {new Date(d.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </AppText>
                        </View>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <View
                        style={[
                          styles.badge,
                          {
                            borderColor: meta.color,
                            backgroundColor: `${meta.color}22`,
                          },
                        ]}
                      >
                        <AppText
                          variant="small"
                          weight="bold"
                          style={{ color: meta.color, fontSize: 10 }}
                        >
                          {meta.label}
                        </AppText>
                      </View>
                      <AppText variant="small" tone="dim">
                        {open ? "▲" : "▼"}
                      </AppText>
                    </View>
                  </Pressable>

                  {open && (
                    <View
                      style={[styles.cardBody, { borderTopColor: c.border }]}
                    >
                      {d.disputeDescription && (
                        <View>
                          <AppText
                            variant="small"
                            weight="bold"
                            tone="dim"
                            style={styles.label}
                          >
                            Description
                          </AppText>
                          <AppText
                            variant="small"
                            tone="dim"
                            style={{ lineHeight: 20 }}
                          >
                            {d.disputeDescription}
                          </AppText>
                        </View>
                      )}
                      {d.disputeEvidence?.length > 0 && (
                        <View>
                          <AppText
                            variant="small"
                            weight="bold"
                            tone="dim"
                            style={styles.label}
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
                            {d.disputeEvidence.map((url, i) => (
                              <Pressable
                                key={i}
                                onPress={() => setLightbox(url)}
                                style={[
                                  styles.evidenceBtn,
                                  {
                                    backgroundColor: c.bgInput,
                                    borderColor: c.border,
                                  },
                                ]}
                              >
                                <FaImage size={11} color={c.textDim} />
                                <AppText
                                  variant="small"
                                  tone="dim"
                                  style={{ marginLeft: 4 }}
                                >
                                  View
                                </AppText>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      )}
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 8,
                          flexWrap: "wrap",
                          paddingTop: 8,
                          borderTopWidth: 1,
                          borderTopColor: c.border,
                        }}
                      >
                        {d.status === "DISPUTED" && (
                          <Pressable
                            onPress={() => setShowCancelModal(d.id)}
                            disabled={cancelling === d.id}
                            style={[
                              styles.cancelBtn,
                              {
                                borderColor: "#ef4444",
                                opacity: cancelling === d.id ? 0.5 : 1,
                              },
                            ]}
                          >
                            {cancelling === d.id ? (
                              <FaSpinner size={11} color="#ef4444" />
                            ) : (
                              <FaTrash size={11} color="#ef4444" />
                            )}
                            <AppText
                              variant="small"
                              weight="bold"
                              style={{ color: "#ef4444", marginLeft: 6 }}
                            >
                              Cancel Dispute
                            </AppText>
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() =>
                            navigation.navigate("BookingDetail", {
                              bookingId: d.id,
                            })
                          }
                          style={[
                            styles.cancelBtn,
                            { borderColor: c.orange, marginLeft: "auto" },
                          ]}
                        >
                          <FaEye size={11} color={c.orange} />
                          <AppText
                            variant="small"
                            weight="bold"
                            style={{ color: c.orange, marginLeft: 6 }}
                          >
                            View Booking
                          </AppText>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Lightbox */}
      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setLightbox(null)}
        >
          <Image
            source={{ uri: lightbox }}
            style={styles.lightboxImage}
            resizeMode="contain"
          />
        </Pressable>
      </Modal>

      {/* Cancel confirm */}
      <Modal
        visible={!!showCancelModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCancelModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText weight="bold" style={{ fontSize: 16, marginBottom: 8 }}>
              Cancel Dispute
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
              Are you sure you want to cancel this dispute? This action cannot
              be undone.
            </AppText>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Pressable
                onPress={() => setShowCancelModal(null)}
                style={[
                  styles.modalBtn,
                  { borderWidth: 1, borderColor: c.border },
                ]}
              >
                <AppText variant="small" weight="bold" tone="dim">
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={confirmCancel}
                style={[styles.modalBtn, { backgroundColor: "#ef4444" }]}
              >
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#fff" }}
                >
                  Confirm
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    gap: 10,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardBody: { borderTopWidth: 1, padding: 14, gap: 12 },
  label: { textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  evidenceBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  lightboxImage: { width: "100%", height: "80%" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: { padding: 20, borderRadius: 16, borderWidth: 1 },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
});
