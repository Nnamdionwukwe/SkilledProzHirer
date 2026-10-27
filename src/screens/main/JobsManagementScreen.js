// src/screens/main/JobsManagementScreen.js
//
// Verbatim port of components/hirer/HirerJobBoardManagement.jsx.
//
// Fetch: GET /jobs/hirer/me?page=N&limit=9&status=X
// Update: PATCH /jobs/:jobId/status with { status: "OPEN"|"FILLED"|"CANCELLED" }
//
// Renders:
//   · Header: "MY JOBS" eyebrow + "Job Board" title + "Post New Job" CTA
//   · Success / error alerts (dismissible)
//   · Summary pills: Open / Filled / Cancelled / Total
//   · Filter tabs: All / Open / Filled / Cancelled
//   · Job cards with:
//       - Colored accent bar per status
//       - Category chip + status badge
//       - Title + description (clamped)
//       - Meta row (date, address, duration, job type, location type)
//       - Budget + applicants count + skills count
//       - Recent applicant thumbnails (+ more)
//       - Actions: View Details, Applications, Edit (open), Mark Filled,
//                  Cancel, Reopen
//       - Inline confirm row for Mark Filled / Cancel
//   · Pagination
//   · PageSkeleton during initial load

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
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
  FaPlus,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaBriefcase,
  FaGlobe,
  FaHome,
  FaRandom,
  FaUsers,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimes,
  FaFileAlt,
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
} from "../../icons/fa";

// ── Constants — verbatim from web ────────────────────────────────────
const STATUS_TABS = ["ALL", "OPEN", "FILLED", "CANCELLED"];

const STATUS_META = {
  OPEN: { label: "Open", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  FILLED: { label: "Filled", color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  CANCELLED: {
    label: "Cancelled",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
  },
};

const BUDGET_TYPE_LABELS = {
  HOURLY: "/hr",
  DAILY: "/day",
  WEEKLY: "/wk",
  MONTHLY: "/mo",
  YEARLY: "/yr",
  CUSTOM: "",
  FIXED: "",
};

const JOB_TYPE_LABELS = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  TEMPORARY: "Temporary",
};

const LOCATION_TYPE_LABELS = {
  REMOTE: "Remote",
  ON_SITE: "On-site",
  HYBRID: "Hybrid",
};

function locIcon(type) {
  if (type === "REMOTE") return FaGlobe;
  if (type === "HYBRID") return FaRandom;
  return FaHome;
}

// ── Duration label helper ────────────────────────────────────────────
function formatJobDuration(job) {
  if (!job) return null;
  const value = job.estimatedValue;
  const hours = job.estimatedHours;
  const unit = job.estimatedUnit || "hours";

  if (unit === "custom") return value || null;
  if (!value && !hours) return null;

  const UNIT_MAP = {
    hours: "hour",
    days: "day",
    weeks: "week",
    months: "month",
    years: "year",
  };

  if (value) {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return String(value);
    const noun = UNIT_MAP[unit] || unit;
    const label = noun + (num !== 1 ? "s" : "");
    return `${num} ${label}`;
  }

  if (hours) {
    const num = parseFloat(hours);
    if (isNaN(num) || num <= 0) return `${hours} hours`;
    return `${num} hours`;
  }

  return null;
}

export default function JobsManagementScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ── Fetch ─────────────────────────────────────────────────────────
  const load = useCallback(
    async (pg = page, flt = filter, isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      try {
        const params = { page: pg, limit: 9 };
        if (flt !== "ALL") params.status = flt;
        const res = await client.get("/jobs/hirer/me", { params });
        const data = res?.data?.data || {};
        setJobs(data.jobPosts || []);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      } catch (err) {
        setError("Failed to load jobs.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, filter],
  );

  useEffect(() => {
    load(page, filter);
  }, [filter, page, load]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, filter, true);
  };

  // ── Update status ─────────────────────────────────────────────────
  const updateStatus = async (jobId, status) => {
    setActing(jobId);
    setError("");
    setSuccess("");
    try {
      await client.patch(`/jobs/${jobId}/status`, { status });
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status } : j)),
      );
      setSuccess(`Job marked as ${status.toLowerCase()}.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update job status.");
    } finally {
      setActing(null);
    }
  };

  // ── Summary counts ────────────────────────────────────────────────
  const openCount = jobs.filter((j) => j.status === "OPEN").length;
  const filledCount = jobs.filter((j) => j.status === "FILLED").length;
  const cancelledCount = jobs.filter((j) => j.status === "CANCELLED").length;

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="list" rows={6} />
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
      {/* ── Header ──────────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              color: c.orange,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            My Jobs
          </AppText>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 24,
              fontWeight: "800",
              color: c.text,
              letterSpacing: -0.4,
            }}
          >
            Job Board
          </AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate("PostJob")}
          style={({ pressed }) => [
            styles.postBtn,
            { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <FaPlus size={10} color={c.bg} />
          <AppText
            style={{
              fontSize: 12,
              fontWeight: "700",
              color: c.bg,
              marginLeft: 5,
            }}
          >
            Post New Job
          </AppText>
        </Pressable>
      </View>

      {/* ── Alerts ──────────────────────────────────────────────── */}
      {error ? (
        <Pressable
          onPress={() => setError("")}
          style={[
            styles.alert,
            { backgroundColor: c.redDim, borderColor: "rgba(239,68,68,0.2)" },
          ]}
        >
          <FaExclamationTriangle size={11} color={c.red} />
          <AppText
            style={{ fontSize: 12, color: c.red, flex: 1, marginLeft: 6 }}
          >
            {error}
          </AppText>
          <FaTimes size={10} color={c.red} />
        </Pressable>
      ) : null}
      {success ? (
        <Pressable
          onPress={() => setSuccess("")}
          style={[
            styles.alert,
            {
              backgroundColor: c.greenDim,
              borderColor: "rgba(34,197,94,0.2)",
            },
          ]}
        >
          <FaCheckCircle size={11} color={c.green} />
          <AppText
            style={{ fontSize: 12, color: c.green, flex: 1, marginLeft: 6 }}
          >
            {success}
          </AppText>
          <FaTimes size={10} color={c.green} />
        </Pressable>
      ) : null}

      {/* ── Summary pills ───────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginTop: 14, marginBottom: 10 }}
        contentContainerStyle={{ gap: 8, paddingRight: 8 }}
      >
        <SummaryPill label="Open" value={openCount} color={c.green} c={c} />
        <SummaryPill label="Filled" value={filledCount} color="#818cf8" c={c} />
        <SummaryPill
          label="Cancelled"
          value={cancelledCount}
          color={c.red}
          c={c}
        />
        <SummaryPill label="Total" value={total} color={c.textDim} c={c} />
      </ScrollView>

      {/* ── Filter tabs ─────────────────────────────────────────── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginBottom: 16 }}
        contentContainerStyle={{ gap: 6, paddingRight: 8 }}
      >
        {STATUS_TABS.map((s) => {
          const active = filter === s;
          return (
            <Pressable
              key={s}
              onPress={() => {
                setFilter(s);
                setPage(1);
              }}
              style={({ pressed }) => [
                styles.filterTab,
                {
                  backgroundColor: active ? c.orangeDim : c.bgCard,
                  borderColor: active ? c.orange : c.border,
                  opacity: pressed && !active ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: active ? c.orange : c.textDim,
                }}
              >
                {s === "ALL" ? "All Jobs" : STATUS_META[s]?.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Grid ────────────────────────────────────────────────── */}
      {jobs.length === 0 ? (
        <Empty filter={filter} c={c} navigation={navigation} />
      ) : (
        <View style={{ gap: 12 }}>
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              acting={acting === job.id}
              onStatusChange={updateStatus}
              c={c}
              navigation={navigation}
            />
          ))}
        </View>
      )}

      {/* ── Pagination ──────────────────────────────────────────── */}
      {pages > 1 ? (
        <View style={[styles.pager, { borderTopColor: c.border }]}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                opacity: page === 1 ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaChevronLeft size={10} color={c.textDim} />
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 4,
              }}
            >
              Prev
            </AppText>
          </Pressable>
          <AppText style={{ fontSize: 12, color: c.textDim }}>
            {page} / {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => Math.min(pages, p + 1))}
            style={({ pressed }) => [
              styles.pageBtn,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                opacity: page === pages ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: c.textDim,
                marginRight: 4,
              }}
            >
              Next
            </AppText>
            <FaChevronRight size={10} color={c.textDim} />
          </Pressable>
        </View>
      ) : null}
    </AppScreen>
  );
}

// ── Job card ────────────────────────────────────────────────────────
function JobCard({ job, acting, onStatusChange, c, navigation }) {
  const [showConfirm, setShowConfirm] = useState(null);
  const meta = STATUS_META[job.status] || STATUS_META.OPEN;
  const isOpen = job.status === "OPEN";
  const scheduled = new Date(job.scheduledAt);
  const applicantCount = job._count?.applications || 0;
  const recentApplicants = job.applications?.slice(0, 3) || [];
  const skillsCount = job.skills?.length || 0;
  const budgetSuffix = BUDGET_TYPE_LABELS[job.budgetType];
  const LocationIcon = locIcon(job.locationType);
  const dur = formatJobDuration(job);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* Accent bar */}
      <View style={[styles.accentBar, { backgroundColor: meta.color }]} />

      <View style={styles.cardInner}>
        {/* Top: category + badge */}
        <View style={styles.cardTop}>
          <View
            style={[
              styles.categoryChip,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {job.category?.icon ? (
              <AppText style={{ fontSize: 11 }}>{job.category.icon}</AppText>
            ) : null}
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: c.orange,
                marginLeft: 4,
              }}
              numberOfLines={1}
            >
              {job.category?.name || "General"}
            </AppText>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
            <AppText
              style={{
                fontSize: 9,
                fontWeight: "700",
                color: meta.color,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {meta.label}
            </AppText>
          </View>
        </View>

        {/* Title & description */}
        <AppText
          style={{
            fontFamily: "Syne_700Bold",
            fontSize: 15,
            fontWeight: "700",
            color: c.text,
            marginTop: 8,
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {job.title}
        </AppText>
        <AppText
          style={{
            fontSize: 12,
            color: c.textDim,
            marginTop: 4,
            lineHeight: 18,
          }}
          numberOfLines={2}
        >
          {job.description}
        </AppText>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <MetaItem
            icon={<FaCalendarAlt size={10} color={c.textMuted} />}
            label={scheduled.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
          {job.address ? (
            <MetaItem
              icon={<FaMapMarkerAlt size={10} color={c.textMuted} />}
              label={job.address}
              c={c}
              truncate
            />
          ) : null}
          {dur ? (
            <MetaItem
              icon={<AppText style={{ fontSize: 9 }}>⏱</AppText>}
              label={dur}
              c={c}
            />
          ) : null}
          {JOB_TYPE_LABELS[job.jobType] ? (
            <MetaItem
              icon={<FaBriefcase size={10} color={c.textMuted} />}
              label={JOB_TYPE_LABELS[job.jobType]}
              c={c}
            />
          ) : null}
          {LOCATION_TYPE_LABELS[job.locationType] ? (
            <MetaItem
              icon={
                LocationIcon ? (
                  <LocationIcon size={10} color={c.textMuted} />
                ) : null
              }
              label={LOCATION_TYPE_LABELS[job.locationType]}
              c={c}
            />
          ) : null}
        </View>

        {/* Budget + applicants */}
        <View
          style={[
            styles.statsRow,
            { borderTopColor: c.border, marginTop: 10, paddingTop: 10 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <AppText
              style={{
                fontFamily: "Syne_800ExtraBold",
                fontSize: 16,
                fontWeight: "800",
                color: c.orange,
              }}
            >
              {job.currency} {Number(job.budget || 0).toLocaleString()}
            </AppText>
            {budgetSuffix ? (
              <AppText
                style={{ fontSize: 10, color: c.textMuted, marginLeft: 3 }}
              >
                {budgetSuffix}
              </AppText>
            ) : null}
          </View>
          <Pressable
            onPress={() =>
              navigation.navigate("JobApplications", { jobId: job.id })
            }
            style={[
              styles.applicantChip,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <FaUsers size={10} color={c.textDim} />
            <AppText style={{ fontSize: 11, color: c.textDim, marginLeft: 4 }}>
              {applicantCount} applicant{applicantCount !== 1 ? "s" : ""}
            </AppText>
            {skillsCount > 0 ? (
              <AppText
                style={{ fontSize: 10, color: c.textMuted, marginLeft: 4 }}
              >
                · {skillsCount} skill{skillsCount !== 1 ? "s" : ""}
              </AppText>
            ) : null}
          </Pressable>
        </View>

        {/* Applicant previews */}
        {recentApplicants.length > 0 ? (
          <View style={styles.previewsRow}>
            {recentApplicants.map((app) => (
              <View
                key={app.id}
                style={[
                  styles.previewAvatar,
                  { backgroundColor: c.orangeDim, borderColor: c.bgPanel },
                ]}
              >
                {app.worker?.avatar ? (
                  <Image
                    source={{ uri: app.worker.avatar }}
                    style={styles.previewImg}
                  />
                ) : (
                  <AppText
                    style={{ fontSize: 9, fontWeight: "700", color: c.orange }}
                  >
                    {app.worker?.firstName?.[0]}
                    {app.worker?.lastName?.[0]}
                  </AppText>
                )}
              </View>
            ))}
            {applicantCount > 3 ? (
              <View style={[styles.previewMore, { backgroundColor: c.bgCard }]}>
                <AppText
                  style={{ fontSize: 9, fontWeight: "700", color: c.textDim }}
                >
                  +{applicantCount - 3}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => navigation.navigate("JobDetail", { jobId: job.id })}
            style={({ pressed }) => [
              styles.viewBtn,
              {
                borderColor: c.border,
                backgroundColor: c.bgCard,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
            >
              View Details
            </AppText>
          </Pressable>
          <Pressable
            onPress={() =>
              navigation.navigate("JobApplications", { jobId: job.id })
            }
            style={({ pressed }) => [
              styles.appsBtn,
              {
                backgroundColor: c.orangeDim,
                borderColor: "rgba(249,115,22,0.25)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: c.orange }}
            >
              Applications
            </AppText>
          </Pressable>
          {isOpen ? (
            <Pressable
              onPress={() => navigation.navigate("EditJob", { jobId: job.id })}
              style={({ pressed }) => [
                styles.editBtn,
                {
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaEdit size={10} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 11,
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 3,
                }}
              >
                Edit
              </AppText>
            </Pressable>
          ) : null}
        </View>

        {/* Status actions */}
        {isOpen && !showConfirm ? (
          <View style={styles.statusActions}>
            <Pressable
              onPress={() => setShowConfirm("FILLED")}
              disabled={acting}
              style={({ pressed }) => [
                styles.fillBtn,
                {
                  backgroundColor: "rgba(129,140,248,0.1)",
                  borderColor: "rgba(129,140,248,0.25)",
                  opacity: acting ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: "#818cf8" }}
              >
                Mark Filled
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setShowConfirm("CANCELLED")}
              disabled={acting}
              style={({ pressed }) => [
                styles.cancelBtn,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.2)",
                  opacity: acting ? 0.4 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "700", color: c.red }}
              >
                Cancel
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {/* Confirm row */}
        {showConfirm ? (
          <View
            style={[
              styles.confirmRow,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText style={{ fontSize: 11, color: c.textDim, flex: 1 }}>
              {showConfirm === "FILLED"
                ? "Mark job as filled?"
                : "Cancel this job?"}
            </AppText>
            <Pressable
              disabled={acting}
              onPress={() => {
                onStatusChange(job.id, showConfirm);
                setShowConfirm(null);
              }}
              style={({ pressed }) => [
                styles.confirmYes,
                {
                  backgroundColor:
                    showConfirm === "CANCELLED" ? c.red : c.green,
                  opacity: acting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText style={{ fontSize: 11, fontWeight: "700", color: c.bg }}>
                {acting ? "…" : "Yes"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setShowConfirm(null)}
              style={({ pressed }) => [
                styles.confirmNo,
                { borderColor: c.border, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "600", color: c.textDim }}
              >
                No
              </AppText>
            </Pressable>
          </View>
        ) : null}

        {!isOpen ? (
          <Pressable
            disabled={acting}
            onPress={() => onStatusChange(job.id, "OPEN")}
            style={({ pressed }) => [
              styles.reopenBtn,
              {
                backgroundColor: c.greenDim,
                borderColor: "rgba(34,197,94,0.25)",
                opacity: acting ? 0.4 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{ fontSize: 11, fontWeight: "700", color: c.green }}
            >
              {acting ? "…" : "Reopen Job"}
            </AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ── Sub-components ──────────────────────────────────────────────────
function SummaryPill({ label, value, color, c }) {
  return (
    <View
      style={[
        styles.summaryPill,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 15,
          fontWeight: "800",
          color,
          lineHeight: 17,
        }}
      >
        {value}
      </AppText>
      <AppText style={{ fontSize: 10, color: c.textDim, marginLeft: 6 }}>
        {label}
      </AppText>
    </View>
  );
}

function MetaItem({ icon, label, c, truncate }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
      {icon}
      <AppText
        style={{ fontSize: 10, color: c.textDim, flexShrink: truncate ? 1 : 0 }}
        numberOfLines={truncate ? 1 : 1}
      >
        {label}
      </AppText>
    </View>
  );
}

function Empty({ filter, c, navigation }) {
  return (
    <View
      style={[
        styles.empty,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <FaFileAlt size={40} color={c.textMuted} />
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 17,
          fontWeight: "800",
          color: c.text,
          marginTop: 12,
        }}
      >
        {filter === "ALL"
          ? "No jobs posted yet"
          : `No ${filter.toLowerCase()} jobs`}
      </AppText>
      <AppText
        style={{
          fontSize: 12,
          color: c.textDim,
          marginTop: 6,
          marginBottom: 16,
          textAlign: "center",
          lineHeight: 18,
          maxWidth: 320,
        }}
      >
        {filter === "ALL"
          ? "Post your first job and start receiving applications from skilled workers."
          : `You don't have any ${filter.toLowerCase()} jobs right now.`}
      </AppText>
      {filter === "ALL" ? (
        <Pressable
          onPress={() => navigation.navigate("PostJob")}
          style={({ pressed }) => [
            styles.emptyBtn,
            { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
            Post a Job
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  alert: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accentBar: {
    height: 3,
    width: "100%",
  },
  cardInner: { padding: 16 },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "65%",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexWrap: "wrap",
    gap: 8,
  },
  applicantChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  previewsRow: {
    flexDirection: "row",
    marginTop: 10,
    gap: 6,
    alignItems: "center",
  },
  previewAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%" },
  previewMore: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  viewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  appsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  fillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  confirmYes: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 40,
    alignItems: "center",
  },
  confirmNo: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  reopenBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginTop: 12,
  },
  emptyBtn: {
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
});
