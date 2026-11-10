// src/screens/main/worker/WorkerSavedJobsScreen.js
// Verbatim port of pages/worker/WorkerSavedJobs.jsx + WorkerSavedJobs.module.css
//
// Endpoints:
//   GET    /jobs/saved?page&limit
//   DELETE /jobs/:id/save

import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import { rem, FONTS } from "../../../constants/theme";
import client from "../../../api/client";

// ── Helpers ─────────────────────────────────────────────────────────────
function formatCurrency(amount, currency = "NGN") {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`;
  }
}

function timeAgo(date, t) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t("workerSavedJobs.time.justNow", "just now");
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

// ── Confirmation Modal ──────────────────────────────────────────────────
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  c,
}) {
  if (!isOpen) return null;
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.6)",
          alignItems: "center",
          justifyContent: "center",
          padding: rem(1),
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation?.()}
          style={{
            backgroundColor: c.bgPanel,
            borderColor: c.border,
            borderWidth: 1,
            borderRadius: rem(20 / 14),
            width: "100%",
            maxWidth: 420,
            padding: rem(1.8),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 16 },
            shadowOpacity: 0.3,
            shadowRadius: 32,
            elevation: 24,
          }}
        >
          <AppText
            style={{
              fontFamily: FONTS.displayBlack,
              fontSize: rem(1.25),
              fontWeight: "800",
              color: c.text,
              marginBottom: rem(0.5),
            }}
          >
            {title}
          </AppText>

          <AppText
            style={{
              fontFamily: FONTS.body,
              fontSize: rem(0.95),
              color: c.textDim,
              lineHeight: rem(0.95) * 1.6,
              marginBottom: rem(1.5),
            }}
          >
            {message}
          </AppText>

          <View style={{ flexDirection: "row", gap: rem(0.75) }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: rem(0.7),
                paddingHorizontal: rem(1),
                borderRadius: rem(10 / 14),
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: pressed ? c.bgCard : "transparent",
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <AppText
                style={{
                  fontFamily: FONTS.body,
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: c.textDim,
                }}
              >
                {cancelLabel}
              </AppText>
            </Pressable>

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: rem(0.7),
                paddingHorizontal: rem(1),
                borderRadius: rem(10 / 14),
                backgroundColor: pressed ? (c.redHover ?? "#dc2626") : c.red,
                alignItems: "center",
                justifyContent: "center",
              })}
            >
              <AppText
                style={{
                  fontFamily: FONTS.body,
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: "#fff",
                }}
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

// ── Saved Job Card ──────────────────────────────────────────────────────
function SavedJobCard({ job, onUnsave, hasApplied, onViewFull }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const c = theme.colors;
  const [showModal, setShowModal] = useState(false);

  const canApply = job.status === "OPEN" && !hasApplied;

  const handleUnsaveClick = (e) => {
    e?.stopPropagation?.();
    setShowModal(true);
  };

  const handleConfirmUnsave = async () => {
    setShowModal(false);
    try {
      await client.delete(`/jobs/${job.id}/save`);
      onUnsave(job.id);
    } catch (err) {
      console.error("Unsave failed", err);
    }
  };

  return (
    <>
      <Pressable
        onPress={onViewFull}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: c.bgPanel,
            borderColor: c.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        {/* Accent bar – blue for saved */}
        <View style={[styles.accentBar, { backgroundColor: "#818cf8" }]} />

        <View style={styles.cardTop}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {job.hirer?.avatar ? (
              <Image
                source={{ uri: job.hirer.avatar }}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AppText
                style={{ fontSize: 12, fontWeight: "700", color: c.orange }}
              >
                {initials(job.hirer)}
              </AppText>
            )}
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: "rgba(129,140,248,0.12)",
                borderColor: "rgba(129,140,248,0.25)",
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: "#818cf8",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {job.status === "OPEN"
                ? t("workerSavedJobs.open", "Open")
                : t("workerSavedJobs.closed", "Closed")}
            </AppText>
          </View>
        </View>

        <AppText
          variant="title"
          weight="displayBlack"
          style={styles.cardTitle}
          numberOfLines={2}
        >
          {job.title}
        </AppText>

        <AppText style={styles.cardParty} numberOfLines={1}>
          {job.hirer?.firstName} {job.hirer?.lastName}
          {job.category ? (
            <AppText style={[styles.cardParty, { color: c.orange }]}>
              {" · "}
              {job.category.name}
            </AppText>
          ) : null}
        </AppText>

        <View style={styles.details}>
          <View style={styles.detail}>
            <Ionicons name="location-outline" size={12} color={c.textDim} />
            <AppText
              style={[styles.detailText, { color: c.textDim }]}
              numberOfLines={1}
            >
              {job.address ||
                job.location ||
                t("workerSavedJobs.remote", "Remote")}
            </AppText>
          </View>
          {job.jobType && (
            <View style={styles.detail}>
              <Ionicons name="briefcase-outline" size={12} color={c.textDim} />
              <AppText style={[styles.detailText, { color: c.textDim }]}>
                {job.jobType}
              </AppText>
            </View>
          )}
          <View style={styles.detail}>
            <Ionicons name="calendar-outline" size={12} color={c.textDim} />
            <AppText style={[styles.detailText, { color: c.textDim }]}>
              {t("workerSavedJobs.savedAt", "Saved")} {timeAgo(job.savedAt, t)}
            </AppText>
          </View>
          {hasApplied && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: "rgba(34,197,94,0.12)",
                  borderColor: "rgba(34,197,94,0.25)",
                  alignSelf: "flex-start",
                  marginTop: 4,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: c.green,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {t("workerSavedJobs.applied", "Applied")}
              </AppText>
            </View>
          )}
        </View>

        <View style={[styles.cardFooter, { borderTopColor: c.border }]}>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[styles.rate, { color: c.text }]}
            numberOfLines={1}
          >
            {job.budget && job.currency
              ? formatCurrency(job.budget, job.currency)
              : job.salaryText || "—"}
          </AppText>
          <View style={styles.actions}>
            {canApply && (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onViewFull();
                }}
                style={({ pressed }) => [
                  styles.applyLink,
                  {
                    backgroundColor: c.orange,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{ fontSize: 11, fontWeight: "700", color: "#000" }}
                >
                  {t("workerSavedJobs.applyNow", "Apply Now")}
                </AppText>
              </Pressable>
            )}
            <Pressable
              onPress={handleUnsaveClick}
              style={({ pressed }) => [
                styles.unsaveBtn,
                {
                  borderColor: pressed ? c.red : c.border,
                  backgroundColor: pressed ? c.redDim : "transparent",
                },
              ]}
            >
              {({ pressed }) => (
                <>
                  <Ionicons
                    name="close"
                    size={12}
                    color={pressed ? c.red : c.textMuted}
                  />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: pressed ? c.red : c.textMuted,
                    }}
                  >
                    {t("workerSavedJobs.unsave", "Unsave")}
                  </AppText>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </Pressable>

      <ConfirmationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmUnsave}
        title={t("workerSavedJobs.removeTitle", "Remove saved job?")}
        message={t("workerSavedJobs.removeMessage", {
          defaultValue: `Are you sure you want to remove "${job.title}" from your saved list?`,
          title: job.title,
        })}
        confirmLabel={t("workerSavedJobs.remove", "Remove")}
        cancelLabel={t("common.cancel", "Cancel")}
        c={c}
      />
    </>
  );
}

// Tiny helper to keep inline styling clean
const pressed_unused = () => {};

// ── Main ────────────────────────────────────────────────────────────────
export default function WorkerSavedJobsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 640;

  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 12;
  const pages = Math.ceil(total / limit);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await client.get("/jobs/saved", {
        params: { page, limit },
      });
      const data = res.data?.data;
      setJobs(data?.jobs || []);
      setTotal(data?.total || 0);
    } catch (err) {
      console.error("Failed to load saved jobs", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnsave = (jobId) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    setTotal((prev) => Math.max(0, prev - 1));
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "600",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: c.orange,
              marginBottom: 4,
            }}
          >
            {t("workerSavedJobs.eyebrow", "Bookmarks")}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <AppText
              variant="title"
              weight="displayBlack"
              style={{ fontSize: 28, color: c.text, letterSpacing: -0.5 }}
            >
              {t("workerSavedJobs.title", "Saved Jobs")}
            </AppText>
            {total > 0 && (
              <View
                style={[
                  styles.count,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: c.textDim,
                  }}
                >
                  {total}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.grid}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} width="100%" height={200} radius={16} />
          ))}
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name="folder-open-outline"
            size={52}
            color={c.textMuted}
            style={{ marginBottom: 16 }}
          />
          <AppText
            variant="title"
            weight="displayBlack"
            style={{ fontSize: 20, color: c.text, marginBottom: 8 }}
          >
            {t("workerSavedJobs.emptyTitle", "No saved jobs")}
          </AppText>
          <AppText
            style={{
              fontSize: 14,
              color: c.textDim,
              marginBottom: 24,
              textAlign: "center",
              maxWidth: 340,
            }}
          >
            {t(
              "workerSavedJobs.emptyText",
              "Browse the job board and save jobs you're interested in – they'll appear here.",
            )}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("WorkerJobs")}
            style={({ pressed }) => [
              styles.emptyBtn,
              { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <AppText style={{ fontSize: 14, fontWeight: "700", color: c.bg }}>
              {t("workerSavedJobs.browseJobs", "Browse Jobs")}
            </AppText>
          </Pressable>
        </View>
      ) : (
        <View
          style={[
            styles.grid,
            isDesktop
              ? { flexDirection: "row", flexWrap: "wrap" }
              : isTablet
                ? { flexDirection: "row", flexWrap: "wrap" }
                : null,
          ]}
        >
          {jobs.map((job) => {
            const cardStyle = isDesktop
              ? { width: "31.5%" }
              : isTablet
                ? { width: "48.5%" }
                : { width: "100%" };
            return (
              <View key={job.savedId || job.id} style={cardStyle}>
                <SavedJobCard
                  job={job}
                  hasApplied={job.hasApplied || false}
                  onUnsave={handleUnsave}
                  onViewFull={() =>
                    navigation.navigate("WorkerJobDetail", {
                      jobId: job.id,
                    })
                  }
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <View style={styles.pager}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                backgroundColor: c.bgPanel,
                borderColor: page === 1 ? c.border : c.orange,
                opacity: page === 1 ? 0.3 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: page === 1 ? c.text : c.orange,
              }}
            >
              ← {t("workerSavedJobs.prev", "Prev")}
            </AppText>
          </Pressable>
          <AppText style={{ fontSize: 13, color: c.textDim }}>
            {page} {t("workerSavedJobs.of", "of")} {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => p + 1)}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                backgroundColor: c.bgPanel,
                borderColor: page === pages ? c.border : c.orange,
                opacity: page === pages ? 0.3 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: page === pages ? c.text : c.orange,
              }}
            >
              {t("workerSavedJobs.next", "Next")} →
            </AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles (mirroring WorkerSavedJobs.module.css) ───────────────────────
const styles = StyleSheet.create({
  page: {
    padding: rem(1.25),
    paddingBottom: rem(6),
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 28,
    flexWrap: "wrap",
  },
  count: {
    paddingVertical: 2,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  grid: {
    gap: 14,
  },
  card: {
    position: "relative",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 18,
    paddingLeft: 22,
    gap: 8,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    color: "#fff",
    lineHeight: 20,
  },
  cardParty: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
  },
  details: {
    gap: 4,
  },
  detail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 1,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 2,
    flexWrap: "wrap",
  },
  rate: {
    fontSize: 16,
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  applyLink: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  unsaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 32,
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
  },
});
