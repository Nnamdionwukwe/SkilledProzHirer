// src/screens/main/worker/WorkerJobDetailScreen.js
// Mirrors: website /jobs/:id (worker view)
// APIs:
//   GET  /jobs/:id              → jobPost data + hasApplied flag
//   POST /jobs/:id/apply        → { message } — apply to job

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../../components/AppText";
import Avatar from "../../../components/Avatar";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─── Constants — mirrors PostJob options exactly ───────────────────────────────
const BUDGET_TYPES = {
  FIXED: { label: "Fixed Price", emoji: "💵", sub: "Pay a set total" },
  PER_HOUR: { label: "Per Hour", emoji: "⏱", sub: "Billed hourly" },
  PER_DAY: { label: "Per Day", emoji: "☀️", sub: "Billed daily" },
  PER_WEEK: { label: "Per Week", emoji: "📅", sub: "Billed weekly" },
  PER_MONTH: { label: "Per Month", emoji: "🗓", sub: "Billed monthly" },
  CUSTOM: { label: "Custom", emoji: "✏️", sub: "Define your own" },
};

const JOB_TYPES = {
  FULL_TIME: { label: "Full-time", icon: "briefcase-outline" },
  PART_TIME: { label: "Part-time", icon: "time-outline" },
  CONTRACT: { label: "Contract", icon: "document-text-outline" },
  TEMPORARY: { label: "Temporary", icon: "hourglass-outline" },
};

const LOCATION_TYPES = {
  REMOTE: { label: "Remote", icon: "globe-outline", emoji: "🌐" },
  ON_SITE: { label: "On-site", icon: "location-outline", emoji: "📍" },
  HYBRID: { label: "Hybrid", icon: "git-network-outline", emoji: "🔀" },
};

const DURATION_TYPES = {
  HOURS: { label: "Hours", emoji: "⏱" },
  DAYS: { label: "Days", emoji: "☀️" },
  WEEKS: { label: "Weeks", emoji: "📅" },
  MONTHS: { label: "Months", emoji: "🗓" },
  CUSTOM: { label: "Custom", emoji: "✏️" },
};

const STATUS_META = {
  OPEN: { label: "Open", color: "#22c55e" },
  FILLED: { label: "Filled", color: "#3b82f6" },
  CANCELLED: { label: "Cancelled", color: "#ef4444" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "Today";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtBudget(currency, budget) {
  if (!budget && budget !== 0) return "—";
  return `${currency ?? ""} ${Number(budget).toLocaleString()}`.trim();
}

function fmtDuration(value, unit, durType, durVal) {
  // Try estimatedValue + estimatedUnit first, fall back to durationType + durationValue
  const v = value ?? durVal;
  const u = (unit ?? durType ?? "").toUpperCase();
  if (!v) return null;
  const num = parseFloat(v);
  if (!num) return null;
  const meta = DURATION_TYPES[u] ?? { label: u, emoji: "⏱" };
  if (u === "HOURS" && num >= 8) {
    const days = num / 8;
    const dStr = Number.isInteger(days) ? days : days.toFixed(1);
    return `${meta.emoji} ${num} hours (≈${dStr} days)`;
  }
  return `${meta.emoji} ${num} ${meta.label.toLowerCase()}`;
}

// ─── Section heading (small caps) ────────────────────────────────────────────
function SectionLabel({ text, c }) {
  return (
    <AppText
      variant="small"
      weight="semibold"
      style={{
        color: c.textMuted,
        letterSpacing: 1.2,
        fontSize: 11,
        marginBottom: 14,
      }}
    >
      {text}
    </AppText>
  );
}

// ─── Detail tile (for the 3-column grid) ─────────────────────────────────────
function DetailTile({ emoji, label, value, valueColor, valueStyle, c, style }) {
  return (
    <View
      style={[
        dt.tile,
        { backgroundColor: c.bgPanel, borderColor: c.border },
        style,
      ]}
    >
      <View style={dt.tileTop}>
        <AppText style={{ fontSize: 16, marginRight: 6 }}>{emoji}</AppText>
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: c.textMuted, letterSpacing: 0.8, fontSize: 10 }}
        >
          {label}
        </AppText>
      </View>
      <AppText
        variant="body"
        weight="semibold"
        style={[{ color: valueColor ?? c.text, marginTop: 4 }, valueStyle]}
        numberOfLines={2}
      >
        {value}
      </AppText>
    </View>
  );
}
const dt = StyleSheet.create({
  tile: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    flex: 1,
  },
  tileTop: { flexDirection: "row", alignItems: "center" },
});

// ─── Option card (read-only, shows PostJob-style selection) ──────────────────
function OptionCard({ emoji, label, sub, selected, c }) {
  return (
    <View
      style={[
        oc.card,
        {
          backgroundColor: selected ? "rgba(249,115,22,0.12)" : c.bgPanel,
          borderColor: selected ? c.orange : c.border,
        },
      ]}
    >
      {selected && <View style={[oc.dot, { backgroundColor: c.orange }]} />}
      <AppText style={{ fontSize: 22, marginBottom: 6 }}>{emoji}</AppText>
      <AppText
        variant="small"
        weight="semibold"
        style={{ color: selected ? c.orange : c.text, textAlign: "center" }}
      >
        {label}
      </AppText>
      {sub && (
        <AppText
          variant="small"
          tone="dim"
          style={{ textAlign: "center", fontSize: 10, marginTop: 2 }}
        >
          {sub}
        </AppText>
      )}
    </View>
  );
}
const oc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    position: "relative",
  },
  dot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// ─── Apply bottom-sheet ───────────────────────────────────────────────────────
function ApplySheet({ visible, job, onClose, onSuccess, c, modalBg }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible) {
      setMsg("");
      setError(null);
      setSending(false);
    }
  }, [visible]);

  const submit = async () => {
    setSending(true);
    setError(null);
    try {
      await client.post(`/jobs/${job?.id}/apply`, { message: msg.trim() });
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message ?? "Failed to submit application.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={as.backdrop} onPress={onClose}>
        <Pressable
          style={[
            as.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[as.handle, { backgroundColor: c.border }]} />

          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.orange, paddingHorizontal: 20 }}
          >
            {job?.category?.icon} {job?.category?.name}
          </AppText>
          <AppText
            variant="title"
            weight="semibold"
            style={{
              color: c.text,
              paddingHorizontal: 20,
              marginTop: 2,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {job?.title}
          </AppText>
          <AppText
            weight="displayBlack"
            style={{
              color: c.orange,
              paddingHorizontal: 20,
              marginBottom: 16,
              fontSize: 20,
            }}
          >
            {fmtBudget(job?.currency, job?.budget)}
          </AppText>

          <View style={{ paddingHorizontal: 20 }}>
            <AppText
              variant="small"
              weight="semibold"
              style={{
                color: c.textMuted,
                letterSpacing: 0.8,
                marginBottom: 8,
                fontSize: 11,
              }}
            >
              COVER MESSAGE (OPTIONAL)
            </AppText>
            <TextInput
              value={msg}
              onChangeText={setMsg}
              placeholder="Introduce yourself and explain why you're a great fit..."
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={[
                as.textarea,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                },
              ]}
            />
            {error && (
              <View
                style={[
                  as.errBox,
                  {
                    borderColor: "#ef4444",
                    backgroundColor: "rgba(239,68,68,0.10)",
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color="#ef4444"
                  style={{ marginRight: 6 }}
                />
                <AppText variant="small" style={{ color: "#ef4444", flex: 1 }}>
                  {error}
                </AppText>
              </View>
            )}
            <Pressable
              onPress={submit}
              disabled={sending}
              style={[
                as.btn,
                { backgroundColor: c.orange, opacity: sending ? 0.75 : 1 },
              ]}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#fff" }}
                >
                  🚀 Apply Now
                </AppText>
              )}
            </Pressable>
            <Pressable onPress={onClose} style={as.cancelBtn}>
              <AppText variant="small" tone="dim">
                Cancel
              </AppText>
            </Pressable>
          </View>
          <View style={{ height: 24 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const as = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 12,
  },
  btn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  cancelBtn: { paddingVertical: 12, alignItems: "center" },
  errBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerJobDetailScreen({ route, navigation }) {
  const { jobId } = route.params ?? {};
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  const [job, setJob] = useState(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showApply, setShowApply] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await client.get(`/jobs/${jobId}`);
      const d = res.data.data;
      setJob(d.jobPost ?? d);
      setHasApplied(d.hasApplied ?? false);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not load job");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const budgetMeta = BUDGET_TYPES[job?.budgetType] ?? BUDGET_TYPES.FIXED;
  const jobTypeMeta = JOB_TYPES[job?.jobType] ?? JOB_TYPES.FULL_TIME;
  const locTypeMeta =
    LOCATION_TYPES[job?.locationType] ?? LOCATION_TYPES.REMOTE;
  const statusMeta = STATUS_META[job?.status] ?? STATUS_META.OPEN;
  const duration = fmtDuration(
    job?.estimatedValue,
    job?.estimatedUnit,
    job?.durationType,
    job?.durationValue,
  );
  const budget = fmtBudget(job?.currency, job?.budget);
  const hirer = job?.hirer;
  const hirerProfile = hirer?.hirerProfile ?? {};
  const companyName =
    hirerProfile.companyName ??
    `${hirer?.firstName ?? ""} ${hirer?.lastName ?? ""}`.trim();
  const hirerLocation = [hirer?.city, hirer?.country]
    .filter(Boolean)
    .join(", ");
  const applied = job?._count?.applications ?? 0;

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

  if (!job) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <AppText style={{ fontSize: 48, marginBottom: 12 }}>🔍</AppText>
        <AppText variant="title" weight="semibold" style={{ color: c.text }}>
          Job not found
        </AppText>
      </View>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }}
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
        {/* ── Back button ── */}
        <Pressable
          onPress={() => navigation.goBack()}
          style={[
            s.backBtn,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <Ionicons
            name="arrow-back"
            size={16}
            color={c.text}
            style={{ marginRight: 6 }}
          />
          <AppText variant="small" weight="semibold" style={{ color: c.text }}>
            Back to Jobs
          </AppText>
        </Pressable>

        {/* ═══ HERO CARD ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          {/* Category + status */}
          <View style={s.heroTop}>
            <View
              style={[
                s.catBadge,
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
              >
                {job.category?.icon} {job.category?.name}
              </AppText>
            </View>
            <View
              style={[
                s.statusBadge,
                {
                  backgroundColor: `${statusMeta.color}22`,
                  borderColor: `${statusMeta.color}55`,
                },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: statusMeta.color, fontSize: 11 }}
              >
                {statusMeta.label.toUpperCase()}
              </AppText>
            </View>
          </View>

          {/* Title — displayBlack matches website exactly */}
          <AppText weight="displayBlack" style={[s.title, { color: c.text }]}>
            {job.title}
          </AppText>

          {/* Meta row: date + location + posted */}
          <View style={s.metaRow}>
            {job.scheduledAt && (
              <AppText variant="small" tone="dim" style={s.metaItem}>
                📅 {fmtDate(job.scheduledAt)}
              </AppText>
            )}
            {job.address && (
              <AppText variant="small" tone="dim" style={s.metaItem}>
                📍 {job.address}
              </AppText>
            )}
            <AppText variant="small" tone="dim" style={s.metaItem}>
              📤 Posted {timeAgo(job.createdAt)}
            </AppText>
          </View>

          {/* Budget hero */}
          <View
            style={[
              s.budgetRow,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <AppText
                weight="displayBlack"
                style={{ color: c.orange, fontSize: 32, lineHeight: 38 }}
              >
                {budget}
              </AppText>
              <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
                Budget
              </AppText>
            </View>
            <View
              style={[
                s.applicantPill,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText style={{ fontSize: 14, marginRight: 4 }}>👥</AppText>
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.text }}
              >
                {applied} applicant{applied !== 1 ? "s" : ""}
              </AppText>
            </View>
          </View>
        </View>

        {/* ═══ JOB DESCRIPTION ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <SectionLabel text="JOB DESCRIPTION" c={c} />
          <AppText variant="body" style={{ color: c.text, lineHeight: 24 }}>
            {job.description}
          </AppText>
          {job.notes && (
            <View
              style={[
                s.notesBox,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <AppText style={{ fontSize: 16, marginRight: 8 }}>📝</AppText>
              <AppText
                variant="body"
                style={{ color: c.textMuted, flex: 1, lineHeight: 22 }}
              >
                {job.notes}
              </AppText>
            </View>
          )}
          {Array.isArray(job.skills) && job.skills.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <AppText
                variant="small"
                weight="semibold"
                style={{
                  color: c.textMuted,
                  letterSpacing: 0.8,
                  fontSize: 11,
                  marginBottom: 8,
                }}
              >
                SKILLS
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {job.skills.map((sk, i) => (
                  <View
                    key={i}
                    style={[
                      s.skillBadge,
                      { backgroundColor: c.bgPanel, borderColor: c.border },
                    ]}
                  >
                    <AppText variant="small" style={{ color: c.text }}>
                      {sk}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ═══ DETAILS grid (3-col) ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <SectionLabel text="DETAILS" c={c} />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
            <DetailTile
              emoji="📁"
              label="CATEGORY"
              value={job.category?.name ?? "—"}
              c={c}
            />
            <DetailTile
              emoji="💰"
              label="BUDGET"
              value={budget}
              valueColor={c.orange}
              c={c}
            />
            <DetailTile
              emoji="📅"
              label="SCHEDULED"
              value={
                job.scheduledAt
                  ? new Date(job.scheduledAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"
              }
              c={c}
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <DetailTile
              emoji="📍"
              label="LOCATION"
              value={job.address ?? locTypeMeta.label}
              c={c}
            />
            <DetailTile
              emoji="🏷"
              label="STATUS"
              value={statusMeta.label}
              valueColor={statusMeta.color}
              c={c}
            />
            {duration && (
              <DetailTile emoji="⏱" label="DURATION" value={duration} c={c} />
            )}
          </View>
        </View>

        {/* ═══ PAYMENT TYPE ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <SectionLabel text="PAYMENT TYPE" c={c} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(BUDGET_TYPES).map(([key, meta]) => (
              <View key={key} style={{ width: "30.5%" }}>
                <OptionCard
                  emoji={meta.emoji}
                  label={meta.label}
                  sub={meta.sub}
                  selected={job.budgetType === key}
                  c={c}
                />
              </View>
            ))}
          </View>
        </View>

        {/* ═══ JOB TYPE + LOCATION TYPE ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <SectionLabel text="JOB TYPE" c={c} />
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {Object.entries(JOB_TYPES).map(([key, meta]) => (
              <View key={key} style={{ flex: 1 }}>
                <View
                  style={[
                    oc.card,
                    {
                      backgroundColor:
                        job.jobType === key
                          ? "rgba(249,115,22,0.12)"
                          : c.bgPanel,
                      borderColor: job.jobType === key ? c.orange : c.border,
                      paddingVertical: 14,
                    },
                  ]}
                >
                  {job.jobType === key && (
                    <View style={[oc.dot, { backgroundColor: c.orange }]} />
                  )}
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={job.jobType === key ? c.orange : c.textMuted}
                    style={{ marginBottom: 6 }}
                  />
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{
                      color: job.jobType === key ? c.orange : c.text,
                      textAlign: "center",
                    }}
                  >
                    {meta.label}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          <SectionLabel text="LOCATION TYPE" c={c} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            {Object.entries(LOCATION_TYPES).map(([key, meta]) => (
              <View key={key} style={{ flex: 1 }}>
                <View
                  style={[
                    oc.card,
                    {
                      backgroundColor:
                        job.locationType === key
                          ? "rgba(249,115,22,0.12)"
                          : c.bgPanel,
                      borderColor:
                        job.locationType === key ? c.orange : c.border,
                      paddingVertical: 14,
                    },
                  ]}
                >
                  {job.locationType === key && (
                    <View style={[oc.dot, { backgroundColor: c.orange }]} />
                  )}
                  <Ionicons
                    name={meta.icon}
                    size={22}
                    color={job.locationType === key ? c.orange : c.textMuted}
                    style={{ marginBottom: 6 }}
                  />
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{
                      color: job.locationType === key ? c.orange : c.text,
                      textAlign: "center",
                    }}
                  >
                    {meta.label}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ═══ JOB DURATION ═══ */}
        {(job.estimatedValue || job.durationValue) && (
          <View
            style={[
              s.card,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <SectionLabel text="JOB DURATION" c={c} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              {Object.entries(DURATION_TYPES).map(([key, meta]) => {
                const unit = (
                  job.estimatedUnit ??
                  job.durationType ??
                  ""
                ).toUpperCase();
                const sel = unit === key;
                return (
                  <View key={key} style={{ flex: 1 }}>
                    <View
                      style={[
                        oc.card,
                        {
                          backgroundColor: sel
                            ? "rgba(249,115,22,0.12)"
                            : c.bgPanel,
                          borderColor: sel ? c.orange : c.border,
                          paddingVertical: 14,
                        },
                      ]}
                    >
                      {sel && (
                        <View style={[oc.dot, { backgroundColor: c.orange }]} />
                      )}
                      <AppText style={{ fontSize: 20, marginBottom: 4 }}>
                        {meta.emoji}
                      </AppText>
                      <AppText
                        variant="small"
                        weight="semibold"
                        style={{
                          color: sel ? c.orange : c.text,
                          textAlign: "center",
                        }}
                      >
                        {meta.label}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
            {duration && (
              <View
                style={[
                  s.durationResult,
                  { backgroundColor: c.bgPanel, borderColor: c.border },
                ]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  {duration}
                </AppText>
              </View>
            )}
          </View>
        )}

        {/* ═══ APPLY FOR THIS JOB ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <SectionLabel text="APPLY FOR THIS JOB" c={c} />
          {hasApplied ? (
            <View
              style={[
                s.appliedBox,
                {
                  backgroundColor: "rgba(34,197,94,0.10)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color="#22c55e"
                style={{ marginRight: 8 }}
              />
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#22c55e" }}
              >
                You have already applied to this job
              </AppText>
            </View>
          ) : job.status !== "OPEN" ? (
            <View
              style={[
                s.appliedBox,
                {
                  backgroundColor: "rgba(59,130,246,0.10)",
                  borderColor: "#3b82f6",
                },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={20}
                color="#3b82f6"
                style={{ marginRight: 8 }}
              />
              <AppText variant="body" style={{ color: "#3b82f6" }}>
                This job is no longer accepting applications
              </AppText>
            </View>
          ) : (
            <Pressable
              onPress={() => setShowApply(true)}
              style={[s.applyBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                variant="title"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                🚀 Apply Now
              </AppText>
            </Pressable>
          )}
        </View>

        {/* ═══ POSTED BY ═══ */}
        {hirer && (
          <View
            style={[
              s.card,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{
                color: c.orange,
                letterSpacing: 1.2,
                fontSize: 11,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              POSTED BY
            </AppText>

            {/* Centered hirer info */}
            <View style={s.postedByInner}>
              <View style={[s.hirerAvatarWrap, { borderColor: c.orange }]}>
                {hirer.avatar ? (
                  <Image
                    source={{ uri: hirer.avatar }}
                    style={s.hirerAvatarImg}
                  />
                ) : (
                  <View
                    style={[
                      s.hirerAvatarFallback,
                      { backgroundColor: c.bgPanel },
                    ]}
                  >
                    <AppText
                      variant="title"
                      weight="semibold"
                      style={{ color: c.orange, fontSize: 20 }}
                    >
                      {hirer.firstName?.[0]}
                      {hirer.lastName?.[0]}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText
                variant="title"
                weight="semibold"
                style={{ color: c.text, marginTop: 12, fontSize: 20 }}
              >
                {hirer.firstName} {hirer.lastName}
              </AppText>
              {companyName && (
                <AppText variant="body" tone="dim" style={{ marginTop: 2 }}>
                  {companyName}
                </AppText>
              )}
              {hirerLocation && (
                <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
                  📍 {hirerLocation}
                </AppText>
              )}
              {hirerProfile.avgRating > 0 && (
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text, marginTop: 6 }}
                >
                  ★ {Number(hirerProfile.avgRating).toFixed(1)}
                </AppText>
              )}
            </View>

            <Pressable
              onPress={() =>
                navigation.navigate("HirerPublicProfile", { userId: hirer.id })
              }
              style={[
                s.viewProfileBtn,
                {
                  backgroundColor: "rgba(249,115,22,0.15)",
                  borderColor: c.orange,
                },
              ]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.orange }}
              >
                View Profile →
              </AppText>
            </Pressable>
          </View>
        )}

        {/* ═══ QUICK FACTS ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <SectionLabel text="QUICK FACTS" c={c} />
          {[
            { label: "Budget", value: budget, valueColor: c.orange },
            {
              label: "Category",
              value: job.category?.name ?? "—",
              valueColor: c.text,
            },
            {
              label: "Job Type",
              value: JOB_TYPES[job.jobType]?.label ?? job.jobType ?? "—",
              valueColor: c.text,
            },
            {
              label: "Location",
              value: LOCATION_TYPES[job.locationType]?.label ?? "—",
              valueColor: c.text,
            },
            { label: "Applicants", value: String(applied), valueColor: c.text },
          ].map((row, i, arr) => (
            <View
              key={row.label}
              style={[
                s.factRow,
                {
                  borderBottomColor: c.border,
                  borderBottomWidth:
                    i < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <AppText variant="body" tone="dim">
                {row.label}
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: row.valueColor }}
              >
                {row.value}
              </AppText>
            </View>
          ))}

          {/* Status badge row */}
          <View style={[s.factRow, { borderBottomWidth: 0 }]}>
            <AppText variant="body" tone="dim">
              Status
            </AppText>
            <View
              style={[
                s.statusBadge,
                {
                  backgroundColor: `${statusMeta.color}22`,
                  borderColor: `${statusMeta.color}55`,
                },
              ]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: statusMeta.color, fontSize: 11 }}
              >
                {statusMeta.label.toUpperCase()}
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Apply bottom sheet ── */}
      <ApplySheet
        visible={showApply}
        job={job}
        onClose={() => setShowApply(false)}
        onSuccess={() => {
          setHasApplied(true);
          toast.success("Application submitted! The hirer will be notified.");
        }}
        c={c}
        modalBg={modalBg}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 34,
  },

  heroTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  catBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },

  title: { fontSize: 28, lineHeight: 34, marginBottom: 12 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  metaItem: { lineHeight: 18 },

  budgetRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 4,
  },
  applicantPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },

  notesBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  skillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  durationResult: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginTop: 10,
  },

  appliedBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  applyBtn: { paddingVertical: 18, borderRadius: 14, alignItems: "center" },

  postedByInner: { alignItems: "center", marginBottom: 16 },
  hirerAvatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    overflow: "hidden",
  },
  hirerAvatarImg: { width: "100%", height: "100%" },
  hirerAvatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  viewProfileBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },

  factRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
  },
});
