// src/screens/main/JobApplicationsScreen.js
// Mirrors the website's JobApplications.
// API: GET /jobs/:id + GET /jobs/:id/applications + PATCH /jobs/:id/applications/:appId

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import Card from "../../components/Card";
import ConfirmModal from "../../components/ConfirmModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import {
  getJobPost,
  getJobApplications,
  updateApplicationStatus,
} from "../../api/jobs";

// ─── Status meta ─────────────────────────────────────────────────────────────
const APP_STATUS = {
  PENDING: { label: "Pending", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  ACCEPTED: { label: "Accepted", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  REJECTED: { label: "Rejected", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

// ─── Stars ───────────────────────────────────────────────────────────────────
function Stars({ rating, c }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? "star" : "star-outline"}
          size={12}
          color={s <= Math.round(rating) ? c.orange : c.textMuted}
        />
      ))}
    </View>
  );
}

// ─── Application card ────────────────────────────────────────────────────────
function AppCard({ app, onAccept, onReject, updating, c, t }) {
  const navigation = useNavigation();
  const { worker } = app;
  const wp = worker?.workerProfile;
  const sm = APP_STATUS[app.status] ?? APP_STATUS.PENDING;
  const isPending = app.status === "PENDING";

  return (
    <Card padded style={{ marginBottom: 10 }}>
      {/* Worker top row */}
      <View style={styles.workerTop}>
        {/* Avatar */}
        <View
          style={[
            styles.workerAvatar,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          {worker?.avatar ? (
            <Image source={{ uri: worker.avatar }} style={styles.avatarImg} />
          ) : (
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {worker?.firstName?.[0]}
              {worker?.lastName?.[0]}
            </AppText>
          )}
        </View>
        {/* Info */}
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {worker?.firstName} {worker?.lastName}
          </AppText>
          <AppText variant="small" tone="dim" numberOfLines={1}>
            {wp?.title ?? "Worker"}
          </AppText>
          {(worker?.city || worker?.country) && (
            <View style={styles.locRow}>
              <Ionicons
                name="location-outline"
                size={11}
                color={c.textMuted}
                style={{ marginRight: 3 }}
              />
              <AppText variant="small" tone="dim" numberOfLines={1}>
                {[worker.city, worker.country].filter(Boolean).join(", ")}
              </AppText>
            </View>
          )}
        </View>
        {/* Status badge */}
        <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: sm.color }}
          >
            {sm.label}
          </AppText>
        </View>
      </View>

      {/* Worker stats */}
      <View
        style={[
          styles.statsRow,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {wp?.avgRating > 0 && (
          <View style={styles.statItem}>
            <Stars rating={wp.avgRating} c={c} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginLeft: 4 }}
            >
              {Number(wp.avgRating).toFixed(1)}
            </AppText>
            {wp.totalReviews > 0 && (
              <AppText variant="small" tone="dim" style={{ marginLeft: 3 }}>
                ({wp.totalReviews})
              </AppText>
            )}
          </View>
        )}
        {wp?.completedJobs > 0 && (
          <View style={styles.statItem}>
            <AppText variant="small">✅</AppText>
            <AppText variant="small" style={{ marginLeft: 4 }}>
              {wp.completedJobs} {t("jobs.apply.jobsDone")}
            </AppText>
          </View>
        )}
        {wp?.hourlyRate > 0 && (
          <View style={styles.statItem}>
            <AppText variant="small">💰</AppText>
            <AppText variant="small" style={{ marginLeft: 4 }}>
              {wp.currency} {Number(wp.hourlyRate).toLocaleString()}/hr
            </AppText>
          </View>
        )}
        {wp?.yearsExperience > 0 && (
          <View style={styles.statItem}>
            <AppText variant="small">🏆</AppText>
            <AppText variant="small" style={{ marginLeft: 4 }}>
              {wp.yearsExperience} {t("jobs.apply.yrsExp")}
            </AppText>
          </View>
        )}
      </View>

      {/* Cover note */}
      {app.message && (
        <View style={[styles.coverNote, { borderLeftColor: c.orange }]}>
          <AppText
            variant="small"
            tone="dim"
            style={{ letterSpacing: 0.6, marginBottom: 4 }}
          >
            {t("jobs.apply.coverNote").toUpperCase()}
          </AppText>
          <AppText variant="body" tone="dim" style={{ fontStyle: "italic" }}>
            "{app.message}"
          </AppText>
        </View>
      )}

      {/* Applied date */}
      <AppText variant="small" tone="dim" style={{ marginTop: 10 }}>
        {t("jobs.apply.applied")}{" "}
        {new Date(app.createdAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}{" "}
        {t("jobs.apply.at")}{" "}
        {new Date(app.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </AppText>

      {/* Pending actions */}
      {isPending && (
        <View style={styles.decisionRow}>
          <Pressable
            onPress={() =>
              navigation.navigate("Profile", { userId: worker?.id })
            }
            style={[styles.viewProfileBtn, { borderColor: c.border }]}
          >
            <AppText variant="small" weight="semibold">
              {t("jobs.apply.viewProfile")} →
            </AppText>
          </Pressable>
          <Pressable
            onPress={onReject}
            disabled={updating}
            style={[
              styles.decisionBtn,
              {
                backgroundColor: "rgba(239,68,68,0.10)",
                borderColor: "#ef4444",
              },
            ]}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: "#ef4444" }}
              >
                {t("jobs.apply.decline")}
              </AppText>
            )}
          </Pressable>
          <Pressable
            onPress={onAccept}
            disabled={updating}
            style={[
              styles.decisionBtn,
              {
                backgroundColor: "rgba(34,197,94,0.12)",
                borderColor: "#22c55e",
              },
            ]}
          >
            {updating ? (
              <ActivityIndicator size="small" color="#22c55e" />
            ) : (
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: "#22c55e" }}
              >
                {t("jobs.apply.accept")}
              </AppText>
            )}
          </Pressable>
        </View>
      )}

      {/* Accepted state — create booking CTA */}
      {app.status === "ACCEPTED" && (
        <Pressable
          onPress={() => navigation.navigate("Bookings")}
          style={[
            styles.bookingCta,
            { backgroundColor: "rgba(34,197,94,0.08)", borderColor: "#22c55e" },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#22c55e" }}
          >
            ✅ {t("jobs.apply.accepted")} —{" "}
          </AppText>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#22c55e", textDecorationLine: "underline" }}
          >
            {t("jobs.apply.createBooking")} →
          </AppText>
        </Pressable>
      )}
    </Card>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHead({ label, count, c }) {
  return (
    <View style={styles.sectionHead}>
      <AppText
        variant="small"
        weight="semibold"
        tone="dim"
        style={{ letterSpacing: 0.8 }}
      >
        {label.toUpperCase()}
      </AppText>
      {count > 0 && (
        <View style={[styles.countBadge, { backgroundColor: c.orange }]}>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#fff", fontSize: 11 }}
          >
            {count}
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function JobApplicationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const c = th.colors;

  const jobId = route.params?.jobId;

  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    Promise.all([getJobPost(jobId), getJobApplications(jobId)])
      .then(([jobData, appsData]) => {
        setJob(jobData.jobPost);
        setApplications(appsData.applications ?? []);
      })
      .catch(() => setError(t("jobs.notFound")))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleDecision = (appId, status) => {
    setModal({
      title:
        status === "ACCEPTED"
          ? t("jobs.apply.acceptConfirm")
          : t("jobs.apply.declineConfirm"),
      confirmLabel:
        status === "ACCEPTED"
          ? t("jobs.apply.accept")
          : t("jobs.apply.decline"),
      destructive: status === "REJECTED",
      onConfirm: async () => {
        setUpdating(appId);
        try {
          await updateApplicationStatus(jobId, appId, status);
          setApplications((prev) =>
            prev.map((a) => (a.id === appId ? { ...a, status } : a)),
          );
          if (status === "ACCEPTED") {
            setJob((j) => (j ? { ...j, status: "FILLED" } : j));
            toast.success(t("jobs.apply.acceptSuccess"));
          } else {
            toast.success(t("jobs.apply.declineSuccess"));
          }
        } catch {
          toast.error(t("toast.unknownError"));
        } finally {
          setUpdating(null);
        }
      },
    });
  };

  const pending = applications.filter((a) => a.status === "PENDING");
  const reviewed = applications.filter((a) => a.status !== "PENDING");
  const accepted = applications.filter((a) => a.status === "ACCEPTED").length;

  if (loading)
    return (
      <AppScreen scrollable={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.orange} />
        </View>
      </AppScreen>
    );

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Back */}
      <Pressable
        onPress={() => navigation.navigate("JobsManagement")}
        style={styles.backBtn}
        hitSlop={8}
      >
        <Ionicons
          name="arrow-back"
          size={16}
          color={c.text}
          style={{ marginRight: 6 }}
        />
        <AppText variant="small">{t("common.back")}</AppText>
      </Pressable>

      {/* ── JOB SUMMARY ── */}
      {job && (
        <Card padded style={{ marginBottom: 16 }}>
          <View style={styles.jobSummary}>
            <View style={[styles.jobIcon, { backgroundColor: c.bgCard }]}>
              <AppText variant="body">{job.category?.icon ?? "📋"}</AppText>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <AppText variant="body" weight="semibold" numberOfLines={2}>
                {job.title}
              </AppText>
              <AppText variant="small" tone="dim" numberOfLines={1}>
                {job.category?.name} · {job.address} ·{" "}
                {new Date(job.scheduledAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
          </View>

          {/* Stats row */}
          <View style={[styles.summaryStats, { borderTopColor: c.border }]}>
            {[
              {
                label: t("jobs.apply.totalApps"),
                value: applications.length,
                color: c.text,
              },
              {
                label: t("jobs.apply.pending"),
                value: pending.length,
                color: c.orange,
              },
              {
                label: t("jobs.apply.accepted"),
                value: accepted,
                color: "#22c55e",
              },
            ].map((s) => (
              <View key={s.label} style={styles.summaryStatItem}>
                <AppText
                  variant="title"
                  weight="semibold"
                  style={{ color: s.color }}
                >
                  {s.value}
                </AppText>
                <AppText variant="small" tone="dim">
                  {s.label}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Empty state */}
      {applications.length === 0 && (
        <Card padded style={styles.emptyCard}>
          <Ionicons name="mail-open-outline" size={36} color={c.textMuted} />
          <AppText variant="body" weight="semibold" style={{ marginTop: 12 }}>
            {t("jobs.apply.noApps")}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginTop: 6, textAlign: "center" }}
          >
            {t("jobs.apply.noAppsText")}
          </AppText>
        </Card>
      )}

      {/* Pending section */}
      {pending.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <SectionHead
            label={t("jobs.apply.pendingReview")}
            count={pending.length}
            c={c}
          />
          {pending.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              updating={updating === app.id}
              onAccept={() => handleDecision(app.id, "ACCEPTED")}
              onReject={() => handleDecision(app.id, "REJECTED")}
              c={c}
              t={t}
            />
          ))}
        </View>
      )}

      {/* Reviewed section */}
      {reviewed.length > 0 && (
        <View>
          <SectionHead
            label={t("jobs.apply.reviewed")}
            count={reviewed.length}
            c={c}
          />
          {reviewed.map((app) => (
            <AppCard
              key={app.id}
              app={app}
              updating={updating === app.id}
              c={c}
              t={t}
            />
          ))}
        </View>
      )}
      <ConfirmModal
        visible={!!modal}
        title={modal?.title ?? ""}
        confirmLabel={modal?.confirmLabel ?? t("common.yes")}
        cancelLabel={t("common.no")}
        destructive={modal?.destructive}
        onConfirm={() => {
          modal?.onConfirm?.();
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backBtn: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  emptyCard: { alignItems: "center", paddingVertical: 40 },

  jobSummary: { flexDirection: "row", alignItems: "flex-start" },
  jobIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStats: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryStatItem: { flex: 1, alignItems: "center" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  countBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  // App card
  workerTop: { flexDirection: "row", alignItems: "flex-start" },
  workerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  locRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  statItem: { flexDirection: "row", alignItems: "center" },
  coverNote: {
    marginTop: 12,
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  decisionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    alignItems: "center",
  },
  viewProfileBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  decisionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookingCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
});
