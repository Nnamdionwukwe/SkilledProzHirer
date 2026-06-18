// src/screens/main/JobsManagementScreen.js
// Mirrors the website's HirerJobBoardManagement — job cards, filter tabs,
// status actions, pagination. API: GET /jobs/hirer/me

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import AppButton from "../../components/AppButton";
import Card from "../../components/Card";
import ConfirmModal from "../../components/ConfirmModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { getMyJobPosts, updateJobStatus } from "../../api/jobs";

// ─── Duration label ───────────────────────────────────────────────────────────
function durationLabel(job) {
  if (!job.durationType || !job.durationValue) return null;
  const v = job.durationValue;
  switch (job.durationType) {
    case "HOURS":
      return `${v} hrs`;
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

// ─── Status meta ─────────────────────────────────────────────────────────────
const STATUS_META = {
  OPEN: { color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  FILLED: { color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
  CANCELLED: { color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
};

// ─── Location icon helper ─────────────────────────────────────────────────────
function locTypeIcon(type) {
  if (type === "ON_SITE") return "location-outline";
  if (type === "HYBRID") return "git-merge-outline";
  return "globe-outline";
}

// ─── Job Card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onStatusChange, acting, c, t }) {
  const navigation = useNavigation();
  const [modal, setModal] = useState(null);
  const meta = STATUS_META[job.status] ?? STATUS_META.OPEN;
  const isOpen = job.status === "OPEN";
  const dur = durationLabel(job);
  const appCount = job._count?.applications ?? 0;
  const previews = job.applications?.slice(0, 3) ?? [];

  const confirmStatus = (newStatus) => {
    setModal({
      title:
        newStatus === "FILLED"
          ? t("jobs.markFilledConfirm")
          : newStatus === "CANCELLED"
            ? t("jobs.cancelConfirm")
            : t("jobs.reopenConfirm"),
      confirmLabel: t("common.yes"),
      destructive: newStatus === "CANCELLED",
      onConfirm: () => onStatusChange(job.id, newStatus),
    });
  };

  return (
    <Card style={styles.jobCard}>
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.cardInner}>
        {/* Top row: category chip + status badge */}
        <View style={styles.cardTop}>
          <View style={[styles.catChip, { backgroundColor: c.orangeDim }]}>
            {job.category?.icon ? (
              <AppText variant="small">{job.category.icon}</AppText>
            ) : null}
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange, marginLeft: 4 }}
              numberOfLines={1}
            >
              {job.category?.name ?? "General"}
            </AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: meta.color }}
            >
              {job.status}
            </AppText>
          </View>
        </View>

        {/* Job meta tags: type · location · payment type */}
        <View style={styles.tagsRow}>
          {job.jobType && (
            <View
              style={[
                styles.tagPill,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText variant="small" tone="dim">
                {t(`postJob.jobType.${job.jobType}`)}
              </AppText>
            </View>
          )}
          {job.locationType && (
            <View
              style={[
                styles.tagPill,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <Ionicons
                name={locTypeIcon(job.locationType)}
                size={11}
                color={c.textMuted}
                style={{ marginRight: 3 }}
              />
              <AppText variant="small" tone="dim">
                {t(`postJob.locationType.${job.locationType}`)}
              </AppText>
            </View>
          )}
          {job.budgetType && (
            <View
              style={[
                styles.tagPill,
                { backgroundColor: c.orangeDim, borderColor: c.orange },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {t(`postJob.paymentType.${job.budgetType}`)}
              </AppText>
            </View>
          )}
        </View>

        {/* Title & description */}
        <AppText
          variant="title"
          weight="semibold"
          style={{ marginTop: 8 }}
          numberOfLines={2}
        >
          {job.title}
        </AppText>
        <AppText
          variant="small"
          tone="dim"
          numberOfLines={2}
          style={{ marginTop: 4 }}
        >
          {job.description}
        </AppText>

        {/* Meta row: date · location · duration */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color={c.textMuted}
              style={{ marginRight: 4 }}
            />
            <AppText variant="small" tone="dim">
              {new Date(job.scheduledAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </AppText>
          </View>
          {job.address && (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={12}
                color={c.textMuted}
                style={{ marginRight: 4 }}
              />
              <AppText variant="small" tone="dim" numberOfLines={1}>
                {job.address}
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
                size={11}
                color={c.textMuted}
                style={{ marginRight: 3 }}
              />
              <AppText variant="small" tone="dim">
                {dur}
              </AppText>
            </View>
          )}
        </View>

        {/* Budget + applicant count */}
        <View style={styles.budgetRow}>
          <AppText
            variant="title"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {job.currency} {Number(job.budget).toLocaleString()}
          </AppText>
          <Pressable
            onPress={() =>
              navigation.navigate("JobApplications", { jobId: job.id })
            }
            style={[
              styles.appCountChip,
              { backgroundColor: c.bgCard, borderColor: c.border },
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
          </Pressable>
        </View>

        {/* Skills preview */}
        {job.skills?.length > 0 && (
          <View style={styles.skillsPreview}>
            {job.skills.slice(0, 4).map((sk) => (
              <View
                key={sk}
                style={[
                  styles.skillPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText variant="small" tone="dim" numberOfLines={1}>
                  {sk}
                </AppText>
              </View>
            ))}
            {job.skills.length > 4 && (
              <View
                style={[
                  styles.skillPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText variant="small" tone="dim">
                  +{job.skills.length - 4}
                </AppText>
              </View>
            )}
          </View>
        )}

        {/* Applicant avatar previews */}
        {previews.length > 0 && (
          <View style={styles.previews}>
            {previews.map((app) => (
              <View
                key={app.id}
                style={[
                  styles.previewAvatar,
                  { backgroundColor: c.bgCard, borderColor: c.bgPanel },
                ]}
              >
                {app.worker?.avatar ? (
                  <Image
                    source={{ uri: app.worker.avatar }}
                    style={styles.previewImg}
                  />
                ) : (
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: c.orange, fontSize: 10 }}
                  >
                    {app.worker?.firstName?.[0]}
                    {app.worker?.lastName?.[0]}
                  </AppText>
                )}
              </View>
            ))}
            {appCount > 3 && (
              <View
                style={[styles.previewMore, { backgroundColor: c.orangeDim }]}
              >
                <AppText
                  variant="small"
                  style={{ color: c.orange, fontSize: 10 }}
                >
                  +{appCount - 3}
                </AppText>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.navigate("JobDetail", { jobId: job.id })}
            style={[styles.viewBtn, { borderColor: c.border }]}
          >
            <AppText variant="small" weight="semibold">
              {t("jobs.viewDetails")}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() =>
              navigation.navigate("JobApplications", { jobId: job.id })
            }
            style={[
              styles.appsBtn,
              { backgroundColor: c.orangeDim, borderColor: c.orange },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {t("jobs.applications.title")}
            </AppText>
          </Pressable>
        </View>

        {/* Status change actions */}
        {isOpen && (
          <View style={[styles.statusActions, { borderTopColor: c.border }]}>
            <Pressable
              onPress={() => confirmStatus("FILLED")}
              disabled={acting}
              style={[
                styles.fillBtn,
                {
                  backgroundColor: "rgba(99,102,241,0.12)",
                  borderColor: "#6366f1",
                },
              ]}
            >
              {acting ? (
                <ActivityIndicator size="small" color="#6366f1" />
              ) : (
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#6366f1" }}
                >
                  {t("jobs.markFilled")}
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={() => confirmStatus("CANCELLED")}
              disabled={acting}
              style={[
                styles.cancelStatusBtn,
                {
                  backgroundColor: "rgba(239,68,68,0.10)",
                  borderColor: "#ef4444",
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

        {!isOpen && job.status === "CANCELLED" && (
          <View style={[styles.statusActions, { borderTopColor: c.border }]}>
            <Pressable
              onPress={() => confirmStatus("OPEN")}
              disabled={acting}
              style={[
                styles.reopenBtn,
                {
                  backgroundColor: "rgba(34,197,94,0.10)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              {acting ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#22c55e" }}
                >
                  {t("jobs.reopenJob")}
                </AppText>
              )}
            </Pressable>
          </View>
        )}
      </View>
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
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
const STATUS_TABS = ["ALL", "OPEN", "FILLED", "CANCELLED"];

export default function JobsManagementScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const c = th.colors;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState(null);

  const load = useCallback(
    async (pg = page, flt = filter) => {
      try {
        const params = { page: pg, limit: 9 };
        if (flt !== "ALL") params.status = flt;
        const data = await getMyJobPosts(params);
        setJobs(data.jobPosts ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
      } catch {
        toast.error(t("toast.networkError"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, filter, t, toast],
  );

  useEffect(() => {
    load();
  }, [filter, page]);

  const handleFilterChange = (f) => {
    setFilter(f);
    setPage(1);
  };

  const handleStatusChange = async (jobId, status) => {
    setActing(jobId);
    try {
      await updateJobStatus(jobId, status);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status } : j)),
      );
      toast.success(t("jobs.jobUpdated", { status: status.toLowerCase() }));
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setActing(null);
    }
  };

  // Summary counts
  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const filledCount = jobs.filter((j) => j.status === "FILLED").length;
  const cancelledCount = jobs.filter((j) => j.status === "CANCELLED").length;

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load(1, filter);
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, letterSpacing: 0.8 }}
          >
            {t("jobs.myJobs").toUpperCase()}
          </AppText>
         >
        </View>
        <AppButton
          title={t("jobs.postNewJob")}
          fullWidth={false}
          onPress={() => navigation.navigate("PostJob")}
          style={{ paddingHorizontal: 14 }}
        />
      </View>

      {/* Summary pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 16 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {[
          { label: t("jobs.open"), value: openCount, color: "#22c55e" },
          { label: t("jobs.filled"), value: filledCount, color: "#6366f1" },
          {
            label: t("jobs.cancelled"),
            value: cancelledCount,
            color: "#ef4444",
          },
          { label: t("jobs.total"), value: total, color: c.textMuted },
        ].map((p) => (
          <View
            key={p.label}
            style={[
              styles.summaryPill,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: p.color }}
            >
              {p.value}
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
              {p.label}
            </AppText>
          </View>
        ))}
      </ScrollView>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 14 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        {STATUS_TABS.map((s) => {
          const active = filter === s;
          return (
            <Pressable
              key={s}
              onPress={() => handleFilterChange(s)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: active ? c.orange : c.bgCard,
                  borderColor: active ? c.orange : c.border,
                },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: active ? "#fff" : c.text }}
              >
                {s === "ALL" ? t("jobs.allJobs") : t(`jobs.${s.toLowerCase()}`)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Job list */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={c.orange} />
        </View>
      ) : jobs.length === 0 ? (
        <Card padded style={styles.emptyCard}>
          <Ionicons
            name="document-text-outline"
            size={36}
            color={c.textMuted}
          />
          <AppText variant="body" weight="semibold" style={{ marginTop: 12 }}>
            {filter === "ALL"
              ? t("jobs.noJobs")
              : t("jobs.noJobsFiltered", { status: filter.toLowerCase() })}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ marginTop: 6, textAlign: "center" }}
          >
            {filter === "ALL" ? t("jobs.postFirstJob") : ""}
          </AppText>
          {filter === "ALL" && (
            <AppButton
              title={t("jobs.postNewJob")}
              iconLeft="add"
              onPress={() => navigation.navigate("PostJob")}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>
      ) : (
        <View style={{ marginTop: 16, gap: 12 }}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              acting={acting === job.id}
              onStatusChange={handleStatusChange}
              c={c}
              t={t}
            />
          ))}
        </View>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <View style={[styles.pagination, { borderTopColor: c.border }]}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            style={[
              styles.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === 1 ? 0.4 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={16} color={c.text} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginLeft: 6 }}
            >
              Prev
            </AppText>
          </Pressable>
          <AppText variant="body" tone="dim">
            {page} / {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => p + 1)}
            style={[
              styles.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === pages ? 0.4 : 1,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginRight: 6 }}
            >
              Next
            </AppText>
            <Ionicons name="arrow-forward" size={16} color={c.text} />
          </Pressable>
        </View>
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  emptyCard: { alignItems: "center", paddingVertical: 40, marginTop: 20 },

  // Job card
  jobCard: { marginBottom: 0, overflow: "hidden", padding: 0 },
  accentBar: { height: 3, width: "100%" },
  cardInner: { padding: 16 },
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
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center" },
  durBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  appCountChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  previews: { flexDirection: "row", gap: 4, marginTop: 10 },
  previewAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  previewMore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImg: { width: "100%", height: "100%", borderRadius: 14 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  appsBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  statusActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  fillBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelStatusBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  reopenBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  skillsPreview: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  skillPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
});
