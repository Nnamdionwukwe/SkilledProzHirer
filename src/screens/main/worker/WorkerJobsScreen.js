// src/screens/main/worker/WorkerJobsScreen.js
// Mirrors: website /worker/browse-jobs
// APIs:
//   GET /categories                             — category dropdown
//   GET /jobs?status=OPEN&search=&categoryId=   — job listing
//   POST /jobs/:id/apply { message }            — apply to job

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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
import { categoriesApi } from "../../../api/categories";
import client from "../../../api/client";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 12; // horizontal padding each side
const COL_GAP = 10; // gap between the 2 columns
const CARD_W = (SCREEN_W - H_PAD * 2 - COL_GAP) / 2;

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

// Format estimated duration exactly as website: "80 hours (≈10 days)"
function formatDuration(value, unit) {
  if (!value || !unit) return null;
  const v = parseFloat(value);
  if (!v) return null;
  const u = String(unit).toLowerCase();
  if (u === "hours" || u === "hour") {
    if (v >= 8) {
      const days = v / 8;
      const daysStr = Number.isInteger(days) ? days : days.toFixed(1);
      return `${v} hours (≈${daysStr} days)`;
    }
    return `${v} hour${v !== 1 ? "s" : ""}`;
  }
  if (u === "days" || u === "day") return `${v} day${v !== 1 ? "s" : ""}`;
  if (u === "weeks" || u === "week") return `${v} week${v !== 1 ? "s" : ""}`;
  if (u === "months" || u === "month") return `${v} month${v !== 1 ? "s" : ""}`;
  return `${v} ${unit}`;
}

function fmtBudget(currency, budget) {
  if (!budget && budget !== 0) return "";
  return `${currency ?? ""} ${Number(budget).toLocaleString()}`.trim();
}

// ─── Category selector Modal ───────────────────────────────────────────────────
function CategoryModal({
  visible,
  categories,
  selected,
  onSelect,
  onClose,
  c,
  modalBg,
}) {
  const [q, setQ] = useState("");
  const filtered = [
    { id: null, slug: null, name: "All Categories", icon: "🔍" },
    ...categories,
  ].filter((cat) => !q || cat.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={cm.backdrop} onPress={onClose}>
        <Pressable
          style={[
            cm.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[cm.handle, { backgroundColor: c.border }]} />
          <AppText
            variant="title"
            weight="semibold"
            style={{ color: c.text, paddingHorizontal: 20, marginBottom: 12 }}
          >
            Select Category
          </AppText>

          {/* Search */}
          <View
            style={[
              cm.searchBox,
              {
                borderColor: c.border,
                backgroundColor: c.bgInput,
                marginHorizontal: 16,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={15}
              color={c.textMuted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search categories..."
              placeholderTextColor={c.textMuted}
              style={{ flex: 1, color: c.text, fontSize: 14 }}
            />
            {q ? (
              <Pressable onPress={() => setQ("")} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={c.textMuted} />
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => String(item.slug ?? "all")}
            style={{ maxHeight: 380, marginTop: 8 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const sel = item.slug === selected;
              return (
                <Pressable
                  onPress={() => {
                    onSelect(item.slug);
                    onClose();
                  }}
                  style={[
                    cm.option,
                    {
                      borderBottomColor: c.border,
                      backgroundColor: sel ? `${c.orange}15` : "transparent",
                    },
                  ]}
                >
                  <AppText
                    style={{ fontSize: 18, lineHeight: 30, marginRight: 10 }}
                  >
                    {item.icon}
                  </AppText>
                  <AppText
                    variant="body"
                    style={{ flex: 1, color: sel ? c.orange : c.text }}
                  >
                    {item.name}
                  </AppText>
                  {sel && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={c.orange}
                    />
                  )}
                </Pressable>
              );
            }}
          />
          <View style={{ height: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
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
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

// ─── Apply bottom-sheet Modal ─────────────────────────────────────────────────
function ApplyModal({ visible, job, onClose, c, modalBg, toast }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!visible) {
      setMsg("");
      setResult(null);
      setSending(false);
    }
  }, [visible]);

  const handleApply = async () => {
    setSending(true);
    try {
      await client.post(`/jobs/${job.id}/apply`, { message: msg.trim() });
      setResult({
        success: true,
        msg: "Application sent! The hirer will be notified.",
      });
    } catch (err) {
      setResult({
        success: false,
        msg: err?.response?.data?.message ?? "Failed to apply.",
      });
    } finally {
      setSending(false);
    }
  };

  if (!job) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={am.backdrop} onPress={onClose}>
        <Pressable
          style={[
            am.sheet,
            { backgroundColor: modalBg, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[am.handle, { backgroundColor: c.border }]} />

          {/* Job title */}
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.orange, paddingHorizontal: 20, marginBottom: 2 }}
          >
            {job.category?.icon} {job.category?.name}
          </AppText>
          <AppText
            variant="title"
            weight="semibold"
            style={{ color: c.text, paddingHorizontal: 20, marginBottom: 4 }}
            numberOfLines={2}
          >
            {job.title}
          </AppText>
          <AppText
            variant="small"
            tone="dim"
            style={{ paddingHorizontal: 20, marginBottom: 16 }}
          >
            {fmtBudget(job.currency, job.budget)}
          </AppText>

          {result?.success ? (
            <View style={{ paddingHorizontal: 20 }}>
              <View
                style={[
                  am.resultBox,
                  {
                    backgroundColor: "rgba(34,197,94,0.12)",
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
                  style={{ color: "#22c55e", flex: 1 }}
                >
                  {result.msg}
                </AppText>
              </View>
              <Pressable
                onPress={onClose}
                style={[
                  am.btn,
                  {
                    backgroundColor: c.bgPanel,
                    borderColor: c.border,
                    borderWidth: 1,
                    marginTop: 8,
                  },
                ]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  Close
                </AppText>
              </Pressable>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <AppText
                variant="small"
                weight="semibold"
                style={{
                  color: c.textMuted,
                  letterSpacing: 0.6,
                  marginBottom: 8,
                  fontSize: 11,
                }}
              >
                MESSAGE (OPTIONAL)
              </AppText>
              <TextInput
                value={msg}
                onChangeText={setMsg}
                placeholder="Add a message to your application..."
                placeholderTextColor={c.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={[
                  am.textarea,
                  {
                    color: c.text,
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              />
              {result && !result.success && (
                <View
                  style={[
                    am.resultBox,
                    {
                      backgroundColor: "rgba(239,68,68,0.12)",
                      borderColor: "#ef4444",
                      marginBottom: 10,
                    },
                  ]}
                >
                  <Ionicons
                    name="alert-circle"
                    size={16}
                    color="#ef4444"
                    style={{ marginRight: 6 }}
                  />
                  <AppText
                    variant="small"
                    style={{ color: "#ef4444", flex: 1 }}
                  >
                    {result.msg}
                  </AppText>
                </View>
              )}
              <Pressable
                onPress={handleApply}
                disabled={sending}
                style={[
                  am.btn,
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
                    ✋ Apply Now
                  </AppText>
                )}
              </Pressable>
              <Pressable onPress={onClose} style={am.cancelBtn}>
                <AppText variant="small" tone="dim">
                  Cancel
                </AppText>
              </Pressable>
            </View>
          )}
          <View style={{ height: 24 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const am = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
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
    minHeight: 80,
    marginBottom: 12,
  },
  btn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  cancelBtn: { paddingVertical: 12, alignItems: "center" },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
});

// ─── Hirer mini-card (inside job card) ───────────────────────────────────────
function HirerMiniCard({ hirer, c }) {
  const profile = hirer?.hirerProfile ?? {};
  const companyName =
    profile.companyName ??
    `${hirer?.firstName ?? ""} ${hirer?.lastName ?? ""}`.trim();
  const location = [hirer?.city, hirer?.country].filter(Boolean).join(", ");
  const rating = profile.avgRating ?? 0;

  return (
    <View
      style={[mc.wrap, { backgroundColor: c.bgPanel, borderColor: c.border }]}
    >
      <Avatar
        uri={hirer?.avatar}
        firstName={hirer?.firstName}
        lastName={hirer?.lastName}
        size={36}
      />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: c.text }}
          numberOfLines={1}
        >
          {companyName}
        </AppText>
        {location ? (
          <AppText variant="small" tone="dim" numberOfLines={1}>
            📍 {location}
          </AppText>
        ) : null}
      </View>
      {rating > 0 && (
        <AppText variant="small" weight="semibold" style={{ color: c.orange }}>
          ★ {Number(rating).toFixed(1)}
        </AppText>
      )}
    </View>
  );
}

const mc = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    marginVertical: 10,
  },
});

// ─── Job card ─────────────────────────────────────────────────────────────────
function JobCard({ job, onApply, onHirerProfile, onViewDetail, c }) {
  const duration = formatDuration(
    job.estimatedValue ?? job.estValue ?? job.defaultEstValue,
    job.estimatedUnit ?? job.estUnit ?? job.defaultEstUnit,
  );
  const applied = job._count?.applications ?? 0;
  const budgetStr = fmtBudget(job.currency, job.budget);

  return (
    <View
      style={[jc.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Category badge + time ago */}
      <View style={jc.topRow}>
        <View
          style={[
            jc.catBadge,
            { backgroundColor: c.bgPanel, borderColor: "rgba(249,115,22,0.4)" },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, fontSize: 11 }}
            numberOfLines={1}
          >
            {job.category?.icon} {job.category?.name}
          </AppText>
        </View>
        <AppText
          variant="small"
          tone="dim"
          style={{ fontSize: 11, flexShrink: 0, marginLeft: 4 }}
        >
          {timeAgo(job.createdAt)}
        </AppText>
      </View>

      {/* Job title — displayBlack weight, exactly as website */}
      <AppText
        weight="displayBlack"
        style={[jc.title, { color: c.text }]}
        numberOfLines={2}
      >
        {job.title}
      </AppText>

      {/* Description */}
      <AppText variant="small" tone="dim" style={jc.desc} numberOfLines={3}>
        {job.description}
      </AppText>

      {/* Hirer mini-card */}
      {job.hirer && <HirerMiniCard hirer={job.hirer} c={c} />}

      {/* Budget row: large orange displayBlack + duration badge + applied */}
      <View style={jc.budgetRow}>
        {/* Budget — displayBlack weight, orange, large — wraps naturally on narrow cards */}
        <AppText
          weight="displayBlack"
          style={[jc.budget, { color: c.orange }]}
          numberOfLines={2}
        >
          {budgetStr}
        </AppText>
      </View>

      {/* Duration + applied count row */}
      <View style={jc.metaRow}>
        {duration && (
          <View
            style={[
              jc.durationBadge,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText
              variant="small"
              style={{ color: c.textMuted, fontSize: 11 }}
              numberOfLines={1}
            >
              ⏱ {duration}
            </AppText>
          </View>
        )}
        <AppText
          variant="small"
          tone="dim"
          style={{ fontSize: 11, flexShrink: 0 }}
        >
          {applied} applied
        </AppText>
      </View>

      {/* Buttons */}
      <View style={jc.btnRow}>
        <Pressable
          onPress={() => onViewDetail(job.id)}
          style={[jc.applyBtn, { backgroundColor: c.orange }]}
        >
          <AppText weight="semibold" style={{ color: "#fff", fontSize: 13 }}>
            View & Apply →
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onHirerProfile(job.hirer?.id)}
          style={[
            jc.hirerBtn,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <AppText weight="semibold" style={{ color: c.text, fontSize: 13 }}>
            Hirer Profile
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

const jc = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    width: CARD_W,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    maxWidth: CARD_W * 0.7,
    overflow: "hidden",
  },

  title: { fontSize: 18, lineHeight: 24, marginBottom: 4 },
  desc: { lineHeight: 18, marginBottom: 2 },

  budgetRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 2 },
  budget: { fontSize: 22, lineHeight: 28, flexShrink: 1 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 12,
    gap: 4,
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    flex: 1,
    overflow: "hidden",
  },

  btnRow: { gap: 6 },
  applyBtn: { paddingVertical: 11, borderRadius: 12, alignItems: "center" },
  hirerBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerJobsScreen({ navigation }) {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;
  const modalBg = th.mode === "dark" ? "#111118" : "#ffffff";

  // Data
  const [jobs, setJobs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [committed, setCommitted] = useState(""); // committed search (on Search press)
  const [catSlug, setCatSlug] = useState(null); // backend filters by slug not id
  const [showCatModal, setShowCatModal] = useState(false);

  // Apply modal
  const [applyJob, setApplyJob] = useState(null);
  const [showApply, setShowApply] = useState(false);

  // ── Load categories ─────────────────────────────────────────────────────────
  useEffect(() => {
    client
      .get("/categories")
      .then((res) => {
        const d = res.data.data ?? res.data;
        setCategories(d.categories ?? d ?? []);
      })
      .catch(() => {});
  }, []);

  // ── Load jobs ───────────────────────────────────────────────────────────────
  const loadJobs = useCallback(async () => {
    try {
      const params = { limit: 20, page: 1 };
      // backend param is "q" not "search"
      if (committed) params.q = committed;
      // backend param is "category" (slug) not "categoryId"
      if (catSlug) params.category = catSlug;

      const res = await client.get("/jobs", { params });
      const d = res.data.data ?? res.data;
      // backend returns "jobPosts" not "jobs"
      setJobs(d.jobPosts ?? d.jobs ?? []);
      setTotal(d.total ?? d.jobPosts?.length ?? 0);
    } catch (err) {
      toast.error("Could not load jobs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [committed, catSlug]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // ── Derived ─────────────────────────────────────────────────────────────────
  const selectedCat = categories.find((c) => c.slug === catSlug);
  const catLabel = selectedCat
    ? `${selectedCat.icon} ${selectedCat.name}`
    : "All Categories";

  // Group jobs into rows of 2 for the 2-column grid
  const rows = [];
  for (let i = 0; i < jobs.length; i += 2) {
    rows.push([jobs[i], jobs[i + 1]].filter(Boolean));
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSearch = () => {
    setLoading(true);
    setCommitted(searchText.trim());
  };

  const handleApplyPress = (job) => {
    setApplyJob(job);
    setShowApply(true);
  };

  const handleViewDetail = (jobId) => {
    navigation.navigate("WorkerJobDetail", { jobId });
  };

  const handleHirerProfile = (hirerId) => {
    if (!hirerId) return;
    navigation.navigate("HirerPublicProfile", { userId: hirerId });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: H_PAD, paddingBottom: 40 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadJobs();
          }}
          tintColor={c.orange}
        />
      }
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Search + Category row ── */}
      <View style={s.filterRow}>
        {/* Search input */}
        <View
          style={[
            s.searchBox,
            { backgroundColor: c.bgCard, borderColor: c.border, flex: 1 },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={16}
            color={c.textMuted}
            style={{ marginRight: 8 }}
          />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            placeholder="Search jobs by title or description..."
            placeholderTextColor={c.textMuted}
            style={{ flex: 1, color: c.text, fontSize: 14 }}
          />
          {searchText ? (
            <Pressable
              onPress={() => {
                setSearchText("");
                setCommitted("");
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={16} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {/* Category dropdown */}
        <Pressable
          onPress={() => setShowCatModal(true)}
          style={[
            s.catDropdown,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.text, flex: 1, fontSize: 13 }}
            numberOfLines={1}
          >
            {catLabel}
          </AppText>
          <Ionicons
            name="chevron-down"
            size={14}
            color={c.textMuted}
            style={{ marginLeft: 4 }}
          />
        </Pressable>
      </View>

      {/* ── Search button ── */}
      <Pressable
        onPress={handleSearch}
        style={[s.searchBtn, { backgroundColor: c.orange }]}
      >
        <AppText weight="semibold" style={{ color: "#fff", fontSize: 15 }}>
          Search
        </AppText>
      </Pressable>

      {/* ── Result count ── */}
      {!loading && (
        <AppText
          variant="body"
          tone="dim"
          style={{ marginTop: 16, marginBottom: 14 }}
        >
          {total} open job{total !== 1 ? "s" : ""} found
        </AppText>
      )}

      {/* ── Loading ── */}
      {loading && (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={c.orange} />
        </View>
      )}

      {/* ── Empty ── */}
      {!loading && jobs.length === 0 && (
        <View style={s.empty}>
          <AppText style={{ fontSize: 48, marginBottom: 12 }}>📋</AppText>
          <AppText
            variant="title"
            weight="semibold"
            style={{ color: c.text, marginBottom: 6 }}
          >
            No jobs found
          </AppText>
          <AppText variant="body" tone="dim" style={{ textAlign: "center" }}>
            Try adjusting your search or clearing the category filter.
          </AppText>
          {(committed || catSlug) && (
            <Pressable
              onPress={() => {
                setSearchText("");
                setCommitted("");
                setCatSlug(null);
              }}
              style={[s.clearBtn, { borderColor: c.border, marginTop: 16 }]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.text }}
              >
                Clear filters
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {/* ── 2-column job grid ── */}
      {!loading &&
        rows.map((row, rowIdx) => (
          <View key={rowIdx} style={s.row}>
            {row.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={handleApplyPress}
                onHirerProfile={handleHirerProfile}
                onViewDetail={handleViewDetail}
                c={c}
              />
            ))}
            {/* If last row has 1 item, add spacer so it doesn't stretch */}
            {row.length === 1 && <View style={{ width: CARD_W }} />}
          </View>
        ))}

      {/* ── Category modal ── */}
      <CategoryModal
        visible={showCatModal}
        categories={categories}
        selected={catSlug}
        onSelect={(slug) => {
          setCatSlug(slug);
          setLoading(true);
        }}
        onClose={() => setShowCatModal(false)}
        c={c}
        modalBg={modalBg}
      />

      {/* ── Apply modal ── */}
      <ApplyModal
        visible={showApply}
        job={applyJob}
        onClose={() => setShowApply(false)}
        c={c}
        modalBg={modalBg}
        toast={toast}
      />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 10 },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
  },

  catDropdown: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 50,
    width: SCREEN_W * 0.37,
  },

  searchBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },

  row: {
    flexDirection: "row",
    gap: COL_GAP,
    marginBottom: COL_GAP,
  },

  loadingWrap: { paddingVertical: 60, alignItems: "center" },
  empty: { paddingVertical: 60, alignItems: "center", paddingHorizontal: 24 },

  clearBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
});
