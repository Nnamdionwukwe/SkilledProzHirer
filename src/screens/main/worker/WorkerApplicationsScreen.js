// src/screens/main/worker/WorkerApplicationsScreen.js
// Mirrors: website /worker/applications
// API: GET /jobs/worker/my-applications?limit=100

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Avatar from "../../../components/Avatar";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import client from "../../../api/client";

// ─── Constants ────────────────────────────────────────────────────────────────
const ITEMS_PER_PAGE = 8;

// ─── Status meta - now functions that accept t ──────────────────────────────
function getAppStatusMeta(t) {
  return {
    PENDING: {
      label: t("workerApplications.status.pending"),
      color: "#f97316",
      bg: "rgba(249,115,22,0.15)",
    },
    ACCEPTED: {
      label: t("workerApplications.status.accepted"),
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
    },
    REJECTED: {
      label: t("workerApplications.status.rejected"),
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
    },
  };
}

function getJobStatusMeta(t) {
  return {
    OPEN: {
      label: t("workerApplications.jobStatus.open"),
      color: "#22c55e",
      bg: "rgba(34,197,94,0.15)",
    },
    FILLED: {
      label: t("workerApplications.jobStatus.filled"),
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.15)",
    },
    CANCELLED: {
      label: t("workerApplications.jobStatus.cancelled"),
      color: "#ef4444",
      bg: "rgba(239,68,68,0.15)",
    },
  };
}

function getFilterTabs(t) {
  return [
    { key: null, label: t("workerApplications.filter.all") },
    { key: "PENDING", label: t("workerApplications.filter.pending") },
    { key: "ACCEPTED", label: t("workerApplications.filter.accepted") },
    { key: "REJECTED", label: t("workerApplications.filter.rejected") },
  ];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date, t) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return t("workerApplications.time.today");
  if (d < 7) return t("workerApplications.time.daysAgo", { d });
  if (d < 30)
    return t("workerApplications.time.weeksAgo", { w: Math.floor(d / 7) });
  const m = Math.floor(d / 30);
  if (m < 12) return t("workerApplications.time.monthsAgo", { m });
  return t("workerApplications.time.yearsAgo", { y: Math.floor(m / 12) });
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Application card ─────────────────────────────────────────────────────────
function ApplicationCard({ app, onViewJob, onMessage, onHirerProfile, c }) {
  const { t } = useTranslation();
  const APP_STATUS_META = getAppStatusMeta(t);
  const JOB_STATUS_META = getJobStatusMeta(t);

  const job = app.jobPost ?? {};
  const hirer = job.hirer ?? {};
  const profile = hirer.hirerProfile ?? {};
  const company =
    profile.companyName ??
    `${hirer.firstName ?? ""} ${hirer.lastName ?? ""}`.trim();
  const appMeta = APP_STATUS_META[app.status] ?? APP_STATUS_META.PENDING;
  const jobMeta = JOB_STATUS_META[job.status] ?? JOB_STATUS_META.OPEN;
  const isAccepted = app.status === "ACCEPTED";

  return (
    <View
      style={[ac.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* ── Category badge + job status ── */}
      <View style={ac.topRow}>
        <View
          style={[
            ac.catBadge,
            {
              backgroundColor: "rgba(249,115,22,0.15)",
              borderColor: "rgba(249,115,22,0.4)",
            },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
            numberOfLines={1}
          >
            {job.category?.icon} {job.category?.name}
          </AppText>
        </View>
        <View
          style={[
            ac.statusPill,
            { backgroundColor: jobMeta.bg, borderColor: `${jobMeta.color}55` },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: jobMeta.color, fontSize: 11 }}
          >
            {jobMeta.label}
          </AppText>
        </View>
      </View>

      {/* ── Job title ── */}
      <AppText
        weight="semibold"
        style={[ac.jobTitle, { color: c.text }]}
        numberOfLines={2}
      >
        {job.title}
      </AppText>

      {/* ── Meta row ── */}
      <View style={ac.metaRow}>
        {job.address && (
          <AppText variant="small" tone="dim" style={ac.metaItem}>
            📍 {job.address}
          </AppText>
        )}
        {job.scheduledAt && (
          <AppText variant="small" tone="dim" style={ac.metaItem}>
            📅 {fmtDate(job.scheduledAt)}
          </AppText>
        )}
        {job.budget && (
          <AppText variant="small" tone="dim" style={ac.metaItem}>
            💰 {job.currency} {Number(job.budget).toLocaleString()}
          </AppText>
        )}
      </View>

      {/* ── Hirer row ── */}
      {company && (
        <View style={ac.hirerRow}>
          <Avatar
            uri={hirer.avatar}
            firstName={hirer.firstName}
            lastName={hirer.lastName}
            size={32}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.text, marginLeft: 10 }}
            numberOfLines={1}
          >
            {company}
          </AppText>
        </View>
      )}

      {/* ── Cover message ── */}
      {app.message && (
        <View
          style={[
            ac.messageBox,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{
              color: c.textMuted,
              letterSpacing: 0.8,
              fontSize: 10,
              marginBottom: 6,
            }}
          >
            {t("workerApplications.message.yourMessage")}
          </AppText>
          <AppText
            variant="body"
            style={{ color: c.textMuted, fontStyle: "italic" }}
          >
            "{app.message}"
          </AppText>
        </View>
      )}

      {/* ── Application status + Applied time ── */}
      <View style={ac.statusRow}>
        <View
          style={[
            ac.appStatusBadge,
            { backgroundColor: appMeta.bg, borderColor: `${appMeta.color}55` },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: appMeta.color }}
          >
            {appMeta.label}
          </AppText>
        </View>
        <AppText variant="small" tone="dim" style={{ marginLeft: 10 }}>
          {t("workerApplications.message.applied")} {timeAgo(app.createdAt, t)}
        </AppText>
      </View>

      {/* ── Action buttons ── */}
      <View style={ac.btnRow}>
        {/* Always: View Job */}
        <Pressable
          onPress={() => onViewJob(job.id)}
          style={[
            ac.btn,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText variant="small" weight="semibold" style={{ color: c.text }}>
            {t("workerApplications.button.viewJob")} →
          </AppText>
        </Pressable>

        {/* Accepted only: Message Hirer + Hirer Profile */}
        {isAccepted && (
          <>
            <Pressable
              onPress={() => onMessage(hirer.id)}
              style={[
                ac.btn,
                {
                  backgroundColor: "rgba(34,197,94,0.15)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: "#22c55e" }}
              >
                💬 {t("workerApplications.button.messageHirer")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => onHirerProfile(hirer.id)}
              style={[
                ac.btn,
                {
                  backgroundColor: "rgba(249,115,22,0.15)",
                  borderColor: c.orange,
                },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                {t("workerApplications.button.hirerProfile")}
              </AppText>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const ac = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  catBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  jobTitle: { fontSize: 18, lineHeight: 24, marginBottom: 8 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  metaItem: { lineHeight: 18 },
  hirerRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  messageBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 12,
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  appStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  btnRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});

// ─── Filter tab ───────────────────────────────────────────────────────────────
function FilterTab({ label, count, active, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        ft.tab,
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
        {label}
      </AppText>
      {count != null && count > 0 && (
        <View
          style={[
            ft.badge,
            { backgroundColor: active ? "rgba(255,255,255,0.3)" : c.bgPanel },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: active ? "#fff" : c.text, fontSize: 11 }}
          >
            {count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const ft = StyleSheet.create({
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: "center",
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerApplicationsScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const c = th.colors;

  const [allApps, setAllApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // null = All
  const [page, setPage] = useState(1);

  // Get FILTER_TABS inside component with t()
  const FILTER_TABS = getFilterTabs(t);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await client.get("/jobs/worker/my-applications", {
        params: { limit: 100, page: 1 }, // load all, filter client-side
      });
      const d = res.data.data ?? res.data;
      setAllApps(d.applications ?? []);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ??
          t("workerApplications.error.loadFailed"),
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const counts = {
    PENDING: allApps.filter((a) => a.status === "PENDING").length,
    ACCEPTED: allApps.filter((a) => a.status === "ACCEPTED").length,
    REJECTED: allApps.filter((a) => a.status === "REJECTED").length,
  };

  const filtered = activeTab
    ? allApps.filter((a) => a.status === activeTab)
    : allApps;
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const displayed = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onViewJob = (jobId) =>
    navigation.navigate("WorkerJobDetail", { jobId });
  const onMessage = (userId) =>
    navigation.navigate("Chat", { recipientId: userId });
  const onHirerProfile = (userId) =>
    navigation.navigate("HirerPublicProfile", { userId });

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={c.orange}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── Page header ── */}
      <View style={s.pageHeader}>
        <View style={{ flex: 1 }}>
          <AppText variant="body" tone="dim" style={{ marginTop: 4 }}>
            {t("workerApplications.header.submitted", {
              count: allApps.length,
              s: allApps.length !== 1 ? "s" : "",
            })}
          </AppText>
        </View>
        <Pressable
          onPress={() => navigation.navigate("WorkerJobs")}
          style={[
            s.browseBtn,
            { backgroundColor: "rgba(249,115,22,0.15)", borderColor: c.orange },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {t("workerApplications.header.browseJobs")} →
          </AppText>
        </Pressable>
      </View>

      {/* ── Filter tabs ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTER_TABS.map((tab) => {
          const count = tab.key ? counts[tab.key] || 0 : allApps.length;
          return (
            <FilterTab
              key={String(tab.key)}
              label={tab.label}
              count={count}
              active={activeTab === tab.key}
              onPress={() => handleTabChange(tab.key)}
              c={c}
            />
          );
        })}
      </ScrollView>

      {/* ── Empty state ── */}
      {filtered.length === 0 && (
        <View style={s.empty}>
          <AppText style={{ fontSize: 52, marginBottom: 14 }}>📋</AppText>
          <AppText
            variant="title"
            weight="semibold"
            style={{ color: c.text, marginBottom: 8 }}
          >
            {activeTab
              ? t("workerApplications.empty.noFiltered", {
                  status: activeTab.toLowerCase(),
                })
              : t("workerApplications.empty.noApplications")}
          </AppText>
          <AppText
            variant="body"
            tone="dim"
            style={{ textAlign: "center", marginBottom: 20 }}
          >
            {activeTab
              ? t("workerApplications.empty.tryDifferentFilter")
              : t("workerApplications.empty.startBrowsing")}
          </AppText>
          {!activeTab && (
            <Pressable
              onPress={() => navigation.navigate("WorkerJobs")}
              style={[s.browseEmptyBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                {t("workerApplications.header.browseJobs")} →
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Application cards ── */}
      {displayed.map((app) => (
        <ApplicationCard
          key={app.id}
          app={app}
          onViewJob={onViewJob}
          onMessage={onMessage}
          onHirerProfile={onHirerProfile}
          c={c}
        />
      ))}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <View style={[s.pagination, { borderTopColor: c.border }]}>
          <Pressable
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={[
              s.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === 1 ? 0.4 : 1,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text }}
            >
              {t("workerApplications.pagination.prev")}
            </AppText>
          </Pressable>

          <View
            style={[
              s.pageIndicator,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text }}
            >
              {page} {t("workerApplications.pagination.of")} {totalPages}
            </AppText>
          </View>

          <Pressable
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={[
              s.pageBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: page === totalPages ? 0.4 : 1,
              },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text }}
            >
              {t("workerApplications.pagination.next")} →
            </AppText>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  pageHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  pageTitle: { fontSize: 32, lineHeight: 38 },
  browseBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 12,
    flexShrink: 0,
  },
  browseEmptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },

  empty: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 24 },

  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  pageBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  pageIndicator: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
});
