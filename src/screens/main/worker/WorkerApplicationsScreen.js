// src/screens/main/worker/WorkerApplicationsScreen.js
// Verbatim port of pages/worker/MyJobApplications.jsx + MyJobApplications.module.css
//
// Endpoints:
//   GET /jobs/worker/my-applications?page&limit&status

import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
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
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(date, t) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return t("workerApplications.time.today", "Today");
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const STATUS_META = {
  PENDING: { labelKey: "workerApplications.status.pending", bgKey: "orange" },
  ACCEPTED: { labelKey: "workerApplications.status.accepted", bgKey: "green" },
  REJECTED: { labelKey: "workerApplications.status.rejected", bgKey: "red" },
};

const JOB_STATUS_META = {
  OPEN: {
    labelKey: "workerApplications.jobStatus.open",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.12)",
  },
  FILLED: {
    labelKey: "workerApplications.jobStatus.filled",
    color: "#60a5fa",
    bg: "rgba(59,130,246,0.12)",
  },
  CANCELLED: {
    labelKey: "workerApplications.jobStatus.cancelled",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.12)",
  },
};

// ── Empty state ─────────────────────────────────────────────────────────
function EmptyState({ filtered, onBrowse, t, c }) {
  return (
    <View style={s.empty}>
      <Ionicons
        name="clipboard-outline"
        size={48}
        color={c.textMuted}
        style={{ marginBottom: 4 }}
      />
      <AppText
        variant="title"
        weight="displayBlack"
        style={{ fontSize: 20, color: c.text, textAlign: "center" }}
      >
        {filtered
          ? t(
              "workerApplications.empty.noApplications",
              "No applications match this filter",
            )
          : t("workerApplications.empty.noApplications", "No applications yet")}
      </AppText>
      <AppText
        style={{
          fontSize: 14,
          color: c.textDim,
          maxWidth: 320,
          textAlign: "center",
        }}
      >
        {filtered
          ? t(
              "workerApplications.empty.tryDifferentFilter",
              "Try a different status filter.",
            )
          : t(
              "workerApplications.empty.startBrowsing",
              "Browse the job board and apply to jobs that match your skills.",
            )}
      </AppText>
      {!filtered && (
        <Pressable
          onPress={onBrowse}
          style={({ pressed }) => [
            s.browseBtn,
            { backgroundColor: c.orange, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <AppText style={{ fontSize: 13, fontWeight: "700", color: c.bg }}>
            {t("workerApplications.header.browseJobs", "Browse Jobs")}
          </AppText>
          <Ionicons name="arrow-forward" size={14} color={c.bg} />
        </Pressable>
      )}
    </View>
  );
}

// ── Card ────────────────────────────────────────────────────────────────
function ApplicationCard({
  app,
  onViewJob,
  onMessageHirer,
  onViewHirer,
  t,
  c,
  isMobile,
}) {
  const job = app.jobPost;
  const hirer = job?.hirer;
  const appMeta = STATUS_META[app.status] ?? STATUS_META.PENDING;
  const jobMeta = JOB_STATUS_META[job?.status] ?? JOB_STATUS_META.OPEN;

  const isAccepted = app.status === "ACCEPTED";
  const hasJobId = Boolean(job?.id);

  return (
    <Pressable
      onPress={onViewJob}
      disabled={!hasJobId}
      style={({ pressed }) => [
        s.card,
        {
          backgroundColor: c.bgPanel,
          borderColor: isAccepted ? "rgba(34,197,94,0.3)" : c.border,
          opacity: !hasJobId ? 0.9 : pressed ? 0.94 : 1,
        },
      ]}
    >
      {isAccepted && (
        <View
          style={{
            height: 3,
            backgroundColor: c.green,
            width: "100%",
          }}
        />
      )}

      <View
        style={[s.cardBody, isMobile && { flexDirection: "column", gap: 14 }]}
      >
        {/* Left: job info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Category chip + job status */}
          <View style={s.cardTopRow}>
            <View
              style={[
                s.catChip,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              {job?.category?.icon ? (
                <AppText style={{ fontSize: 11 }}>{job.category.icon}</AppText>
              ) : null}
              <AppText
                style={{ fontSize: 10, fontWeight: "600", color: c.orange }}
              >
                {job?.category?.name ?? "—"}
              </AppText>
            </View>
            <View style={[s.jobStatusBadge, { backgroundColor: jobMeta.bg }]}>
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "600",
                  color: jobMeta.color,
                }}
              >
                {t(jobMeta.labelKey, job?.status ?? "Open")}
              </AppText>
            </View>
          </View>

          {/* Job title */}
          <AppText
            variant="title"
            weight="displayBlack"
            style={s.jobTitle}
            numberOfLines={isMobile ? 2 : 1}
          >
            {job?.title ?? t("workerApplications.job.removed", "Job removed")}
          </AppText>

          {/* Meta row */}
          <View style={s.metaRow}>
            {job?.address && (
              <View style={s.metaItem}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color={c.textMuted}
                />
                <AppText
                  style={{ fontSize: 12, color: c.textDim }}
                  numberOfLines={1}
                >
                  {job.address.split(",")[0]}
                </AppText>
              </View>
            )}
            {job?.scheduledAt && (
              <View style={s.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={12}
                  color={c.textMuted}
                />
                <AppText style={{ fontSize: 12, color: c.textDim }}>
                  {fmtDate(job.scheduledAt)}
                </AppText>
              </View>
            )}
            {job?.budget && (
              <View style={s.metaItem}>
                <Ionicons name="cash-outline" size={12} color={c.textMuted} />
                <AppText style={{ fontSize: 12, color: c.textDim }}>
                  {job.currency} {Number(job.budget).toLocaleString()}
                </AppText>
              </View>
            )}
          </View>

          {/* Hirer row */}
          {hirer && (
            <View style={s.hirerRow}>
              <View
                style={[
                  s.hirerAvatar,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                {hirer.avatar ? (
                  <Image
                    source={{ uri: hirer.avatar }}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <AppText
                    style={{ fontSize: 9, fontWeight: "600", color: c.textDim }}
                  >
                    {hirer.firstName?.[0]}
                    {hirer.lastName?.[0]}
                  </AppText>
                )}
              </View>
              <AppText
                style={{ fontSize: 12, color: c.textDim, flexShrink: 1 }}
                numberOfLines={1}
              >
                {hirer.hirerProfile?.companyName ||
                  `${hirer.firstName} ${hirer.lastName}`}
              </AppText>
            </View>
          )}

          {/* Your message */}
          {app.message && (
            <View
              style={[
                s.yourMessage,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText
                style={{
                  fontSize: 9,
                  color: c.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 3,
                }}
              >
                {t("workerApplications.message.yourMessage", "Your message")}
              </AppText>
              <AppText
                style={{
                  fontSize: 12,
                  color: c.textDim,
                  lineHeight: 18,
                  fontStyle: "italic",
                }}
                numberOfLines={2}
              >
                "{app.message}"
              </AppText>
            </View>
          )}
        </View>

        {/* Right: status + actions */}
        <View
          style={[
            s.cardRight,
            isMobile && {
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "flex-start",
            },
          ]}
        >
          {/* App status badge */}
          <View
            style={[
              s.appStatusBadge,
              {
                backgroundColor:
                  app.status === "ACCEPTED"
                    ? "rgba(34,197,94,0.12)"
                    : app.status === "REJECTED"
                      ? c.redDim
                      : c.orangeDim,
                borderColor:
                  app.status === "ACCEPTED"
                    ? "rgba(34,197,94,0.25)"
                    : app.status === "REJECTED"
                      ? "rgba(239,68,68,0.2)"
                      : c.orangeGlow,
                borderWidth: 1,
              },
            ]}
          >
            {isAccepted && (
              <Ionicons name="checkmark-circle" size={13} color={c.green} />
            )}
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "700",
                color:
                  app.status === "ACCEPTED"
                    ? c.green
                    : app.status === "REJECTED"
                      ? c.red
                      : c.orange,
                letterSpacing: 0.2,
              }}
            >
              {t(appMeta.labelKey, app.status)}
            </AppText>
          </View>

          <AppText style={{ fontSize: 11, color: c.textMuted }}>
            {t("workerApplications.time.applied", "Applied")}{" "}
            {timeAgo(app.createdAt, t)}
          </AppText>

          {/* Action buttons */}
          <View
            style={[
              s.cardActions,
              isMobile && { flexDirection: "row", flexWrap: "wrap", gap: 8 },
            ]}
          >
            {isAccepted && hirer?.id && (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onMessageHirer();
                }}
                style={({ pressed }) => [
                  s.messageBtn,
                  {
                    backgroundColor: c.greenDim,
                    borderColor: "rgba(34,197,94,0.25)",
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons name="chatbubble-outline" size={12} color={c.green} />
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: c.green,
                  }}
                >
                  {t("workerApplications.button.messageHirer", "Message Hirer")}
                </AppText>
              </Pressable>
            )}
            {isAccepted && hirer?.id && (
              <Pressable
                onPress={(e) => {
                  e?.stopPropagation?.();
                  onViewHirer();
                }}
                style={({ pressed }) => [
                  s.hirerProfileBtn,
                  {
                    backgroundColor: c.orangeDim,
                    borderColor: c.orangeGlow,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: c.orange,
                  }}
                >
                  {t("workerApplications.button.hirerProfile", "Hirer Profile")}
                </AppText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
export default function WorkerApplicationsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const isMobile = width <= 640;

  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const LIMIT = 10;

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: LIMIT };
      if (statusFilter !== "ALL") params.status = statusFilter;
      const res = await client.get("/jobs/worker/my-applications", { params });
      const d = res.data?.data;
      setApplications(d?.applications || []);
      setTotal(d?.total || 0);
      setPages(d?.pages || 1);
    } catch (e) {
      setError(
        t(
          "workerApplications.error.loadFailed",
          "Failed to load your applications.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, user?.id, t]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = applications.reduce((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const handleFilter = (s) => {
    setStatusFilter(s);
    setPage(1);
  };

  // Open a chat with the hirer (find or create the conversation)
  const openChatWithHirer = async (hirerId) => {
    if (!hirerId) return;
    try {
      const res = await client.get("/messages/conversations", {
        params: { page: 1, limit: 100, _t: Date.now() },
      });
      const convos = res.data?.data?.conversations || [];
      const target = String(hirerId);
      const found = convos.find((cv) =>
        (cv.users || []).some((u) => {
          const uid = String(u.userId || u.user?.id || u.id);
          return uid === target;
        }),
      );
      if (found?.id) {
        navigation.navigate("Chat", {
          conversationId: found.id,
          withUserId: hirerId,
        });
        return;
      }
      const created = await client.post("/messages", {
        receiverId: hirerId,
        content: "👋",
      });
      navigation.navigate("Chat", {
        conversationId: created.data?.data?.conversationId,
        withUserId: hirerId,
      });
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          "Could not open chat. Please try again.",
      );
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={s.page}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.pageHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            variant="title"
            weight="displayBlack"
            style={[s.pageTitle, { color: c.text }]}
          >
            {t("workerApplications.header.title", "My Applications")}
          </AppText>
          <AppText style={[s.pageSubtitle, { color: c.textDim }]}>
            {total}{" "}
            {t(
              total === 1
                ? "workerApplications.header.submittedSingular"
                : "workerApplications.header.submittedPlural",
              total === 1 ? "application submitted" : "applications submitted",
            )}
          </AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate("WorkerJobs")}
          style={({ pressed }) => [
            s.browseLink,
            {
              backgroundColor: c.orangeDim,
              borderColor: c.orangeGlow,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <AppText style={{ fontSize: 12, fontWeight: "600", color: c.orange }}>
            {t("workerApplications.header.browseJobs", "Browse Jobs")}
          </AppText>
          <Ionicons name="arrow-forward" size={13} color={c.orange} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={s.tabs}>
        {["ALL", "PENDING", "ACCEPTED", "REJECTED"].map((st) => {
          const active = statusFilter === st;
          return (
            <Pressable
              key={st}
              onPress={() => handleFilter(st)}
              style={({ pressed }) => [
                s.tab,
                {
                  backgroundColor: active ? c.orangeDim : "transparent",
                  borderColor: active ? c.orange : c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  color: active ? c.orange : c.textDim,
                  fontWeight: active ? "700" : "500",
                }}
              >
                {st === "ALL"
                  ? t("workerApplications.filter.all", "All")
                  : t(STATUS_META[st]?.labelKey, st)}
              </AppText>
              {st !== "ALL" && counts[st] > 0 && (
                <View
                  style={[
                    s.tabBadge,
                    {
                      backgroundColor:
                        st === "ACCEPTED"
                          ? "rgba(34,197,94,0.15)"
                          : st === "REJECTED"
                            ? c.redDim
                            : "rgba(249,115,22,0.2)",
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color:
                        st === "ACCEPTED"
                          ? c.green
                          : st === "REJECTED"
                            ? c.red
                            : c.orange,
                    }}
                  >
                    {counts[st]}
                  </AppText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      {error ? (
        <AppText
          style={{
            fontSize: 13,
            color: c.red,
            textAlign: "center",
            padding: 24,
          }}
        >
          {error}
        </AppText>
      ) : loading ? (
        <View style={s.list}>
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width="100%" height={140} radius={14} />
          ))}
        </View>
      ) : applications.length === 0 ? (
        <EmptyState
          filtered={statusFilter !== "ALL"}
          onBrowse={() => navigation.navigate("WorkerJobs")}
          t={t}
          c={c}
        />
      ) : (
        <View style={s.list}>
          {applications.map((app) => (
            <ApplicationCard
              key={app.id}
              app={app}
              onViewJob={() =>
                navigation.navigate("WorkerJobDetail", {
                  jobId: app.jobPost?.id,
                })
              }
              onMessageHirer={() => openChatWithHirer(app.jobPost?.hirer?.id)}
              onViewHirer={() =>
                navigation.navigate("HirerPublicProfile", {
                  userId: app.jobPost?.hirer?.id,
                })
              }
              t={t}
              c={c}
              isMobile={isMobile}
            />
          ))}
        </View>
      )}

      {/* Pagination */}
      {!loading && pages > 1 && (
        <View style={s.pagination}>
          <Pressable
            disabled={page === 1}
            onPress={() => setPage((p) => p - 1)}
            style={({ pressed }) => [
              s.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: page === 1 ? c.border : c.orange,
                opacity: page === 1 ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: page === 1 ? c.textDim : c.orange,
              }}
            >
              ← {t("workerApplications.pagination.prev", "Prev")}
            </AppText>
          </Pressable>
          <AppText style={{ fontSize: 12, color: c.textDim }}>
            {page} {t("workerApplications.pagination.of", "of")} {pages}
          </AppText>
          <Pressable
            disabled={page === pages}
            onPress={() => setPage((p) => p + 1)}
            style={({ pressed }) => [
              s.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: page === pages ? c.border : c.orange,
                opacity: page === pages ? 0.35 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: page === pages ? c.textDim : c.orange,
              }}
            >
              {t("workerApplications.pagination.next", "Next")} →
            </AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ── Styles (mirroring MyJobApplications.module.css) ─────────────────────
const s = StyleSheet.create({
  page: {
    padding: rem(1.25),
    paddingBottom: rem(6),
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },

  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
    flexWrap: "wrap",
  },
  pageTitle: {
    fontSize: 28,
    letterSpacing: -0.8,
    lineHeight: 32,
  },
  pageSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  browseLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
  },
  tabBadge: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 999,
  },

  // List
  list: {
    gap: 14,
  },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  cardBody: {
    flexDirection: "row",
    gap: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    flexWrap: "wrap",
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  jobStatusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },

  jobTitle: {
    fontSize: 15,
    color: "#fff",
    letterSpacing: -0.3,
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  hirerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  hirerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  yourMessage: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },

  // Right column
  cardRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 8,
    minWidth: 150,
  },
  appStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  cardActions: {
    flexDirection: "column",
    gap: 6,
    width: "100%",
    marginTop: 4,
  },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
  },
  hirerProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
    borderWidth: 1,
  },

  // Empty
  empty: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  browseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
  },

  // Pagination
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    marginTop: 24,
    flexWrap: "wrap",
  },
  pageBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
  },
});
