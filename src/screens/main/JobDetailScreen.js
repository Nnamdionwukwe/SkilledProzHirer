// src/screens/main/JobDetailScreen.js
// Mirrors the website's JobDetail. API: GET /jobs/:id + PATCH /jobs/:id/status

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
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
import { useAuthStore } from "../../store/authStore";
import { getJobPost, updateJobStatus } from "../../api/jobs";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function durationLabel(job) {
  if (!job?.durationType || !job?.durationValue) return null;
  const v = job.durationValue;
  switch (job.durationType) {
    case "HOURS":
      return `${v} hours`;
    case "DAYS":
      return `${v} days`;
    case "WEEKS":
      return `${v} weeks`;
    case "MONTHS":
      return `${v} months`;
    case "CUSTOM":
      return v;
    default:
      return null;
  }
}

const STATUS_META = {
  OPEN: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  FILLED: { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

// ─── Detail cell ──────────────────────────────────────────────────────────────
function DetailCell({ icon, label, value, accent, c }) {
  return (
    <View
      style={[
        styles.detailCell,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <AppText variant="small" style={{ fontSize: 18, marginBottom: 4 }}>
        {icon}
      </AppText>
      <AppText
        variant="small"
        tone="dim"
        style={{ letterSpacing: 0.6, marginBottom: 4 }}
      >
        {label.toUpperCase()}
      </AppText>
      <AppText
        variant="body"
        weight="semibold"
        style={accent ? { color: "#f97316" } : {}}
      >
        {value || "—"}
      </AppText>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function JobDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user: me } = useAuthStore();
  const c = th.colors;

  const jobId = route.params?.jobId;

  const [jobData, setJobData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);

  useEffect(() => {
    if (!jobId) return;
    getJobPost(jobId)
      .then(setJobData)
      .catch(() => setError(t("jobs.notFound")))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleStatusUpdate = (status) => {
    setModal({
      title:
        status === "FILLED"
          ? t("jobs.markFilledConfirm")
          : status === "CANCELLED"
            ? t("jobs.cancelConfirm")
            : t("jobs.reopenConfirm"),
      confirmLabel: t("common.yes"),
      destructive: status === "CANCELLED",
      onConfirm: async () => {
        setActing(true);
        try {
          await updateJobStatus(jobId, status);
          setJobData((prev) => ({
            ...prev,
            jobPost: { ...prev.jobPost, status },
          }));
          toast.success(t("jobs.jobUpdated", { status: status.toLowerCase() }));
        } catch {
          toast.error(t("toast.unknownError"));
        } finally {
          setActing(false);
        }
      },
    });
  };

  if (loading)
    return (
      <AppScreen scrollable={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={th.colors.orange} />
        </View>
      </AppScreen>
    );

  if (error || !jobData)
    return (
      <AppScreen scrollable={false}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={c.red} />
          <AppText variant="body" tone="dim" style={{ marginTop: 10 }}>
            {error || t("jobs.notFound")}
          </AppText>
        </View>
      </AppScreen>
    );

  const { jobPost, hasApplied } = jobData;
  const sm = STATUS_META[jobPost.status] ?? STATUS_META.OPEN;
  const isOpen = jobPost.status === "OPEN";
  const isOwner = me?.id === jobPost.hirer?.id;
  const dur = durationLabel(jobPost);
  const appCount = jobPost._count?.applications ?? 0;
  const hirer = jobPost.hirer;
  const hp = hirer?.hirerProfile;
  const scheduled = new Date(jobPost.scheduledAt);

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Back */}
      <Pressable
        onPress={() => navigation.goBack()}
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

      {/* ── HEADER CARD ── */}
      <Card padded style={{ marginBottom: 12 }}>
        {/* Category chip + status */}
        <View style={styles.cardTop}>
          <View style={[styles.catChip, { backgroundColor: c.orangeDim }]}>
            {jobPost.category?.icon && (
              <AppText variant="small">{jobPost.category.icon}</AppText>
            )}
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange, marginLeft: 4 }}
            >
              {jobPost.category?.name}
            </AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: sm.bg }]}>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: sm.color }}
            >
              {jobPost.status}
            </AppText>
          </View>
        </View>

        <AppText
          variant="display"
          weight="displayBlack"
          style={{ marginTop: 12, lineHeight: 38 }}
        >
          {jobPost.title}
        </AppText>

        {/* Meta */}
        <View style={styles.metaRow}>
          {jobPost.jobType && (
            <View
              style={[
                styles.durBadge,
                { backgroundColor: c.orangeDim, borderColor: c.orange },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {t(`postJob.jobType.${jobPost.jobType}`)}
              </AppText>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={13}
              color={c.textMuted}
              style={{ marginRight: 5 }}
            />
            <AppText variant="small" tone="dim">
              {scheduled.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </AppText>
          </View>
          {jobPost.locationType && (
            <View
              style={[
                styles.durBadge,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText variant="small" tone="dim">
                {t(`postJob.locationType.${jobPost.locationType}`)}
              </AppText>
            </View>
          )}
          {jobPost.address && (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={13}
                color={c.textMuted}
                style={{ marginRight: 5 }}
              />
              <AppText variant="small" tone="dim">
                {jobPost.address}
              </AppText>
            </View>
          )}
          {dur && (
            <View
              style={[
                styles.durBadge,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={12}
                color={c.textMuted}
                style={{ marginRight: 4 }}
              />
              <AppText variant="small" tone="dim">
                {dur}
              </AppText>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons
              name="time-outline"
              size={13}
              color={c.textMuted}
              style={{ marginRight: 5 }}
            />
            <AppText variant="small" tone="dim">
              {t("jobs.detail.postedAgo", { time: timeAgo(jobPost.createdAt) })}
            </AppText>
          </View>
        </View>

        {/* Budget hero */}
        <View
          style={[
            styles.budgetHero,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            variant="display"
            weight="displayBlack"
            style={{ color: c.orange, fontSize: 36 }}
          >
            {jobPost.currency} {Number(jobPost.budget).toLocaleString()}
          </AppText>
          <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
            {t("jobs.detail.budget")}
          </AppText>
          <View
            style={[
              styles.appCountChip,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={13}
              color={c.textMuted}
              style={{ marginRight: 4 }}
            />
            <AppText variant="small" tone="dim">
              {appCount}{" "}
              {appCount === 1 ? t("jobs.applicant") : t("jobs.applicants")}
            </AppText>
          </View>
        </View>
      </Card>

      {/* ── JOB DESCRIPTION ── */}
      <Card padded style={{ marginBottom: 12 }}>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={styles.sectionLabel}
        >
          {t("jobs.detail.jobDesc").toUpperCase()}
        </AppText>
        <AppText variant="body" style={{ marginTop: 10, lineHeight: 22 }}>
          {jobPost.description}
        </AppText>
        {jobPost.notes && (
          <View
            style={[
              styles.notesBox,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <Ionicons
              name="document-text-outline"
              size={14}
              color={c.textMuted}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="body"
              tone="dim"
              style={{ flex: 1, lineHeight: 20 }}
            >
              {jobPost.notes}
            </AppText>
          </View>
        )}
      </Card>

      {/* ── SKILLS ── */}
      {jobPost.skills?.length > 0 && (
        <Card padded style={{ marginBottom: 12 }}>
          <AppText
            variant="small"
            weight="semibold"
            tone="dim"
            style={styles.sectionLabel}
          >
            {t("jobs.detail.skills").toUpperCase()}
          </AppText>
          <View style={styles.skillsWrap}>
            {jobPost.skills.map((sk) => (
              <View
                key={sk}
                style={[
                  styles.skillPill,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  {sk}
                </AppText>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* ── DETAILS GRID ── */}
      <Card padded style={{ marginBottom: 12 }}>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={styles.sectionLabel}
        >
          {t("jobs.detail.details").toUpperCase()}
        </AppText>
        <View style={styles.detailGrid}>
          <DetailCell
            icon="📂"
            label={t("jobs.detail.category")}
            value={jobPost.category?.name}
            c={c}
          />
          <DetailCell
            icon="💰"
            label={t("jobs.detail.budget")}
            value={`${jobPost.currency} ${Number(jobPost.budget).toLocaleString()}`}
            accent
            c={c}
          />
          <DetailCell
            icon="📅"
            label={t("jobs.detail.scheduled")}
            value={scheduled.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            c={c}
          />
          {dur && (
            <DetailCell
              icon="⏱️"
              label={t("jobs.detail.duration")}
              value={dur}
              c={c}
            />
          )}
          {jobPost.address && (
            <DetailCell
              icon="📍"
              label={t("jobs.detail.location")}
              value={jobPost.address}
              c={c}
            />
          )}
          <DetailCell
            icon="🏷️"
            label={t("jobs.detail.status")}
            value={
              jobPost.status.charAt(0) + jobPost.status.slice(1).toLowerCase()
            }
            c={c}
          />
          {jobPost.jobType && (
            <DetailCell
              icon="🧑‍💼"
              label={t("postJob.jobType")}
              value={t(`postJob.jobType.${jobPost.jobType}`)}
              c={c}
            />
          )}
          {jobPost.locationType && (
            <DetailCell
              icon="🌐"
              label={t("postJob.locationType")}
              value={t(`postJob.locationType.${jobPost.locationType}`)}
              c={c}
            />
          )}
          {jobPost.budgetType && (
            <DetailCell
              icon="💳"
              label={t("postJob.budgetType")}
              value={t(`postJob.paymentType.${jobPost.budgetType}`)}
              c={c}
            />
          )}
          {jobPost.durationType && jobPost.durationValue && (
            <DetailCell
              icon="📏"
              label={t("postJob.jobDuration")}
              value={
                jobPost.durationType === "CUSTOM"
                  ? jobPost.durationValue
                  : `${jobPost.durationValue} ${t(`postJob.durationType.${jobPost.durationType}`)}`
              }
              c={c}
            />
          )}
        </View>
      </Card>

      {/* ── MANAGE ACTIONS (owner) ── */}
      {isOwner && (
        <Card padded style={{ marginBottom: 12 }}>
          <AppText
            variant="small"
            weight="semibold"
            tone="dim"
            style={styles.sectionLabel}
          >
            {t("jobs.detail.manageJob").toUpperCase()}
          </AppText>
          <Pressable
            onPress={() =>
              navigation.navigate("JobApplications", { jobId: jobPost.id })
            }
            style={[
              styles.manageBtn,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={c.orange}
              style={{ marginRight: 8 }}
            />
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {t("jobs.detail.viewApps")} ({appCount})
            </AppText>
          </Pressable>

          {isOpen && !acting && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              <Pressable
                onPress={() => handleStatusUpdate("FILLED")}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: "rgba(99,102,241,0.12)",
                    borderColor: "#6366f1",
                    flex: 1,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#6366f1" }}
                >
                  {t("jobs.markFilled")}
                </AppText>
              </Pressable>
              <Pressable
                onPress={() => handleStatusUpdate("CANCELLED")}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor: "rgba(239,68,68,0.10)",
                    borderColor: "#ef4444",
                    flex: 1,
                  },
                ]}
              >
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#ef4444" }}
                >
                  {t("jobs.cancelJob")}
                </AppText>
              </Pressable>
            </View>
          )}

          {jobPost.status === "CANCELLED" && (
            <Pressable
              onPress={() => handleStatusUpdate("OPEN")}
              style={[
                styles.manageBtn,
                {
                  backgroundColor: "rgba(34,197,94,0.10)",
                  borderColor: "#22c55e",
                  marginTop: 10,
                },
              ]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#22c55e" }}
              >
                {t("jobs.reopenJob")}
              </AppText>
            </Pressable>
          )}

          {acting && (
            <ActivityIndicator color={c.orange} style={{ marginTop: 10 }} />
          )}
        </Card>
      )}

      {/* ── HIRER CARD ── */}
      <Card padded style={{ marginBottom: 12 }}>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={[styles.sectionLabel, { textAlign: "center" }]}
        >
          {t("jobs.detail.postedBy").toUpperCase()}
        </AppText>

        <View style={styles.hirerBody}>
          <View
            style={[
              styles.hirerAvatar,
              { backgroundColor: c.bgCard, borderColor: c.orange },
            ]}
          >
            {hirer?.avatar ? (
              <Image
                source={{ uri: hirer.avatar }}
                style={styles.hirerAvatarImg}
              />
            ) : (
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {hirer?.firstName?.[0]}
                {hirer?.lastName?.[0]}
              </AppText>
            )}
          </View>
          <AppText variant="title" weight="semibold" style={{ marginTop: 10 }}>
            {hirer?.firstName} {hirer?.lastName}
          </AppText>
          {hp?.companyName && (
            <AppText variant="body" tone="dim">
              {hp.companyName}
            </AppText>
          )}
          {(hirer?.city || hirer?.country) && (
            <View style={[styles.metaItem, { marginTop: 4 }]}>
              <Ionicons
                name="location-outline"
                size={13}
                color={c.textMuted}
                style={{ marginRight: 4 }}
              />
              <AppText variant="small" tone="dim">
                {[hirer.city, hirer.country].filter(Boolean).join(", ")}
              </AppText>
            </View>
          )}
          {(hp?.totalHires > 0 || hp?.avgRating > 0) && (
            <View style={styles.hirerStats}>
              {hp.totalHires > 0 && (
                <AppText variant="small" tone="dim">
                  {hp.totalHires} {t("profile.totalHires")}
                </AppText>
              )}
              {hp.avgRating > 0 && (
                <AppText variant="small" tone="dim">
                  ★ {hp.avgRating.toFixed(1)}
                </AppText>
              )}
            </View>
          )}
          <Pressable
            onPress={() =>
              navigation.navigate("HirerDetail", { userId: hirer?.id })
            }
            style={[
              styles.viewProfileBtn,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {t("profile.myProfile")} →
            </AppText>
          </Pressable>
        </View>
      </Card>

      {/* ── QUICK FACTS ── */}
      <Card padded>
        <AppText
          variant="small"
          weight="semibold"
          tone="dim"
          style={styles.sectionLabel}
        >
          {t("jobs.detail.quickFacts").toUpperCase()}
        </AppText>
        {[
          {
            label: t("jobs.detail.budget"),
            value: `${jobPost.currency} ${Number(jobPost.budget).toLocaleString()}`,
            accent: true,
          },
          { label: t("jobs.detail.category"), value: jobPost.category?.name },
          {
            label: t("postJob.jobType"),
            value: jobPost.jobType
              ? t(`postJob.jobType.${jobPost.jobType}`)
              : null,
          },
          {
            label: t("postJob.locationType"),
            value: jobPost.locationType
              ? t(`postJob.locationType.${jobPost.locationType}`)
              : null,
          },
          {
            label: t("postJob.budgetType"),
            value: jobPost.budgetType
              ? t(`postJob.paymentType.${jobPost.budgetType}`)
              : null,
          },
          {
            label: t("jobs.detail.scheduled"),
            value: scheduled.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            }),
          },
          { label: t("jobs.detail.duration"), value: dur },
          { label: t("jobs.apply.totalApps"), value: String(appCount) },
          { label: t("jobs.detail.status"), value: jobPost.status },
        ]
          .filter((r) => r.value)
          .map((row) => (
            <View
              key={row.label}
              style={[styles.factRow, { borderBottomColor: c.border }]}
            >
              <AppText variant="body" tone="dim">
                {row.label}
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={row.accent ? { color: c.orange } : {}}
              >
                {row.value}
              </AppText>
            </View>
          ))}
      </Card>

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
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: "65%",
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  durBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  budgetHero: {
    marginTop: 14,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  appCountChip: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  sectionLabel: { letterSpacing: 0.8, marginBottom: 10 },
  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  skillPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  detailCell: { width: "48%", padding: 14, borderRadius: 12, borderWidth: 1 },
  manageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  actionBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  hirerBody: { alignItems: "center", paddingVertical: 16 },
  hirerAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  hirerAvatarImg: { width: "100%", height: "100%", borderRadius: 36 },
  hirerStats: { flexDirection: "row", gap: 14, marginTop: 8 },
  viewProfileBtn: {
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "stretch",
    alignItems: "center",
  },
  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
