// src/screens/main/HirerPublicProfileScreen.js
// Mirrors: website /hirers/:userId/profile
// API: GET /hirers/:userId/profile
//      POST /jobs/:id/apply
//
// Roles:
//   WORKER viewing  → sees Apply Now buttons + Message button
//   HIRER viewing own → sees Edit Profile button
//   HIRER viewing other → read-only

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../components/AppText";
import Avatar from "../../components/Avatar";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d < 1) return "Today";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtBudget(currency, budget) {
  return `${currency} ${Number(budget).toLocaleString()}`;
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating, size = 16 }) {
  const filled = Math.round(rating ?? 0);
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <AppText
          key={s}
          style={{ fontSize: size, color: s <= filled ? "#f97316" : "#374151" }}
        >
          ★
        </AppText>
      ))}
    </View>
  );
}

// ─── Contact chip ─────────────────────────────────────────────────────────────
function Chip({ emoji, label, onPress, c }) {
  const El = onPress ? Pressable : View;
  return (
    <El
      onPress={onPress}
      style={[hp.chip, { backgroundColor: c.bgPanel, borderColor: c.border }]}
    >
      <AppText style={{ fontSize: 13 }}>{emoji} </AppText>
      <AppText variant="small" numberOfLines={1} style={{ color: c.text }}>
        {label}
      </AppText>
    </El>
  );
}

// ─── Single job card ──────────────────────────────────────────────────────────
function JobCard({ job, canApply, onApply, c }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleApply = async () => {
    setSending(true);
    setResult(null);
    const res = await onApply(job.id, msg);
    setResult(res);
    if (res.success) setMsg("");
    setSending(false);
  };

  return (
    <View
      style={[hp.jobCard, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Category + time */}
      <View style={hp.jobTop}>
        <View
          style={[
            hp.catBadge,
            { backgroundColor: c.bgPanel, borderColor: c.border },
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
        <AppText variant="small" tone="dim">
          {timeAgo(job.createdAt)}
        </AppText>
      </View>

      {/* Title + description */}
      <AppText
        variant="title"
        weight="semibold"
        style={{ color: c.text, marginTop: 10, marginBottom: 6 }}
        numberOfLines={2}
      >
        {job.title}
      </AppText>
      <AppText
        variant="body"
        tone="dim"
        numberOfLines={3}
        style={{ lineHeight: 20 }}
      >
        {job.description}
      </AppText>

      {/* Meta row */}
      <View style={hp.jobMeta}>
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: c.orange, marginRight: 10 }}
        >
          {fmtBudget(job.currency, job.budget)}
        </AppText>
        <AppText variant="small" tone="dim" style={{ marginRight: 10 }}>
          {job._count?.applications ?? 0} applicant
          {job._count?.applications !== 1 ? "s" : ""}
        </AppText>
        {job.address && (
          <AppText variant="small" tone="dim" numberOfLines={1}>
            📍 {job.address.split(",")[0]}
          </AppText>
        )}
      </View>

      {/* Apply section — workers only, result not yet successful */}
      {canApply && !result?.success && (
        <View style={hp.applySection}>
          <TextInput
            value={msg}
            onChangeText={setMsg}
            placeholder="Add a message to your application (optional)..."
            placeholderTextColor={c.textMuted}
            multiline
            numberOfLines={2}
            textAlignVertical="top"
            style={[
              hp.applyInput,
              {
                color: c.text,
                backgroundColor: c.bgPanel,
                borderColor: c.border,
              },
            ]}
          />
          <Pressable
            onPress={handleApply}
            disabled={sending}
            style={[
              hp.applyBtn,
              { backgroundColor: c.orange, opacity: sending ? 0.75 : 1 },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
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
        </View>
      )}

      {/* Success result */}
      {result?.success && (
        <View
          style={[
            hp.resultBox,
            { backgroundColor: "rgba(34,197,94,0.12)", borderColor: "#22c55e" },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={16}
            color="#22c55e"
            style={{ marginRight: 6 }}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#22c55e", flex: 1 }}
          >
            {result.msg}
          </AppText>
        </View>
      )}

      {/* Error result */}
      {result && !result.success && (
        <View
          style={[
            hp.resultBox,
            { backgroundColor: "rgba(239,68,68,0.12)", borderColor: "#ef4444" },
          ]}
        >
          <Ionicons
            name="alert-circle"
            size={16}
            color="#ef4444"
            style={{ marginRight: 6 }}
          />
          <AppText variant="small" style={{ color: "#ef4444", flex: 1 }}>
            {result.msg}
          </AppText>
        </View>
      )}

      {/* View full details */}
      <Pressable style={{ marginTop: 10 }}>
        <AppText variant="small" style={{ color: c.textMuted }}>
          View full details →
        </AppText>
      </Pressable>
    </View>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review, c }) {
  return (
    <View
      style={[
        hp.reviewCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Reviewer info */}
      <View style={hp.reviewTop}>
        <Avatar
          uri={review.giver?.avatar}
          firstName={review.giver?.firstName}
          lastName={review.giver?.lastName}
          size={44}
        />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {review.giver?.firstName} {review.giver?.lastName}
          </AppText>
          <AppText variant="small" tone="dim">
            {fmtDate(review.createdAt)}
          </AppText>
        </View>
        <Stars rating={review.rating} size={15} />
      </View>

      {/* Comment with orange left accent */}
      {review.comment && (
        <View style={[hp.reviewComment, { borderLeftColor: c.orange }]}>
          <AppText
            variant="body"
            style={{ color: c.textMuted, fontStyle: "italic" }}
          >
            "{review.comment}"
          </AppText>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function HirerPublicProfileScreen({ route, navigation }) {
  const { userId } = route.params ?? {};
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;

  const isWorker = user?.role === "WORKER";
  const isOwnProfile = user?.id === userId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("jobs");

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await client.get(`/hirers/${userId}/profile`);
      setData(res.data.data);
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Could not load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Apply ───────────────────────────────────────────────────────────────────
  const handleApply = async (jobId, message) => {
    try {
      await client.post(`/jobs/${jobId}/apply`, { message: message || "" });
      return {
        success: true,
        msg: "Application sent! The hirer will be notified.",
      };
    } catch (err) {
      return {
        success: false,
        msg: err?.response?.data?.message ?? "Failed to apply.",
      };
    }
  };

  // ── Open message chat ───────────────────────────────────────────────────────
  const openMessages = () => {
    navigation.navigate("Chat", { recipientId: userId });
  };

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

  if (!data) {
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
        <AppText style={{ fontSize: 48, marginBottom: 16 }}>🔍</AppText>
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 8 }}
        >
          Hirer not found
        </AppText>
        <AppText variant="body" tone="dim" style={{ textAlign: "center" }}>
          This profile may be private or unavailable.
        </AppText>
      </View>
    );
  }

  const { profile, jobPosts = [], reviews = [], stats = {} } = data;
  const hirerUser = profile?.user ?? {};
  const memberSince = hirerUser.createdAt
    ? new Date(hirerUser.createdAt).toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
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
          hp.backBtn,
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
      {/* ═══════ HERO CARD ═══════ */}
      <View
        style={[
          hp.heroCard,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {/* Avatar + name */}
        <View style={hp.heroTop}>
          <View style={[hp.avatarWrap, { borderColor: c.orange }]}>
            {hirerUser.avatar ? (
              <Image source={{ uri: hirerUser.avatar }} style={hp.avatarImg} />
            ) : (
              <View style={[hp.avatarFallback, { backgroundColor: c.bgPanel }]}>
                <AppText
                  variant="title"
                  weight="semibold"
                  style={{ color: c.orange, fontSize: 22 }}
                >
                  {hirerUser.firstName?.[0]}
                  {hirerUser.lastName?.[0]}
                </AppText>
              </View>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 16 }}>
            <AppText style={[hp.heroName, { color: c.text }]}>
              {hirerUser.firstName} {hirerUser.lastName}
            </AppText>
            {profile.companyName && (
              <AppText
                variant="body"
                style={{ color: c.textMuted, marginTop: 2 }}
              >
                🏢 {profile.companyName}
              </AppText>
            )}
            {profile.companySize && (
              <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
                👥 {profile.companySize} employees
              </AppText>
            )}
          </View>
        </View>

        {/* Contact chips */}
        <View style={hp.chipRow}>
          {hirerUser.phone && (
            <Chip
              emoji="📱"
              label={hirerUser.phone}
              onPress={() => Linking.openURL(`tel:${hirerUser.phone}`)}
              c={c}
            />
          )}
          {hirerUser.email && (
            <Chip
              emoji="✉️"
              label={hirerUser.email}
              onPress={() => Linking.openURL(`mailto:${hirerUser.email}`)}
              c={c}
            />
          )}
          {hirerUser.gender && (
            <Chip emoji="🪪" label={hirerUser.gender} c={c} />
          )}
          {hirerUser.language && (
            <Chip emoji="🗣" label={hirerUser.language} c={c} />
          )}
          {profile.website && (
            <Chip
              emoji="🌐"
              label={profile.website.replace(/^https?:\/\//, "")}
              onPress={() => Linking.openURL(profile.website)}
              c={c}
            />
          )}
        </View>

        {/* Location + member since */}
        <View style={hp.metaRow}>
          {(hirerUser.city || hirerUser.country) && (
            <AppText variant="small" tone="dim" style={{ marginRight: 16 }}>
              📍{" "}
              {[hirerUser.city, hirerUser.country].filter(Boolean).join(", ")}
            </AppText>
          )}
          <AppText variant="small" tone="dim">
            🗓️ Member since {memberSince}
          </AppText>
        </View>

        {/* Stats */}
        <View
          style={[
            hp.statsRow,
            { borderTopColor: c.border, borderBottomColor: c.border },
          ]}
        >
          <View style={hp.statItem}>
            <AppText style={[hp.statNum, { color: c.orange }]}>
              {stats.totalHires ?? 0}
            </AppText>
            <AppText variant="small" tone="dim" style={hp.statLabel}>
              HIRES
            </AppText>
          </View>
          <View style={[hp.statDivider, { backgroundColor: c.border }]} />
          <View style={hp.statItem}>
            <AppText style={[hp.statNum, { color: c.orange }]}>
              {stats.openJobs ?? 0}
            </AppText>
            <AppText variant="small" tone="dim" style={hp.statLabel}>
              OPEN JOBS
            </AppText>
          </View>
          <View style={[hp.statDivider, { backgroundColor: c.border }]} />
          <View style={hp.statItem}>
            <Stars rating={stats.avgRating ?? 0} size={18} />
            <AppText
              variant="small"
              tone="dim"
              style={[hp.statLabel, { marginTop: 2 }]}
            >
              {stats.totalReviews ?? 0} REVIEWS
            </AppText>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
          {/* Worker: message button */}
          {isWorker && !isOwnProfile && (
            <Pressable
              onPress={openMessages}
              style={[
                hp.msgBtn,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <Ionicons name="chatbubble-outline" size={20} color={c.text} />
            </Pressable>
          )}
          {/* Own profile: edit button */}
          {isOwnProfile && (
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={[
                hp.editBtn,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <Ionicons
                name="pencil-outline"
                size={16}
                color={c.text}
                style={{ marginRight: 6 }}
              />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.text }}
              >
                Edit Profile
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      {/* ═══════ TABS ═══════ */}
      <View style={[hp.tabBar, { borderBottomColor: c.border }]}>
        {[
          { id: "jobs", label: `Open Jobs (${stats.openJobs ?? 0})` },
          { id: "reviews", label: `Reviews (${stats.totalReviews ?? 0})` },
        ].map((t) => {
          const active = tab === t.id;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[hp.tabBtn, active && { borderBottomColor: c.orange }]}
            >
              <AppText
                variant="body"
                weight={active ? "semibold" : "regular"}
                style={{ color: active ? c.orange : c.textMuted }}
              >
                {t.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* ═══════ TAB CONTENT ═══════ */}
      <View style={{ padding: 16 }}>
        {/* ── Jobs tab ── */}
        {tab === "jobs" && (
          <View style={{ gap: 12 }}>
            {jobPosts.length === 0 ? (
              <View style={hp.empty}>
                <AppText style={{ fontSize: 44, marginBottom: 10 }}>📋</AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  No open jobs at the moment
                </AppText>
              </View>
            ) : (
              jobPosts.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  canApply={isWorker && !isOwnProfile}
                  onApply={handleApply}
                  c={c}
                />
              ))
            )}
          </View>
        )}

        {/* ── Reviews tab ── */}
        {tab === "reviews" && (
          <View style={{ gap: 12 }}>
            {reviews.length === 0 ? (
              <View style={hp.empty}>
                <AppText style={{ fontSize: 44, marginBottom: 10 }}>⭐</AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  No reviews yet
                </AppText>
              </View>
            ) : (
              reviews.map((r) => <ReviewCard key={r.id} review={r} c={c} />)
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const hp = StyleSheet.create({
  // Hero
  heroCard: {
    margin: 16,
    borderRadius: 20,
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
    marginTop: 44,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  heroName: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  avatarWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2.5,
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },

  // Meta
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 14 },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  statLabel: { letterSpacing: 0.5, marginTop: 2, fontSize: 10 },
  statDivider: { width: 1, height: 32, marginHorizontal: 8 },

  // Actions
  msgBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },

  // Tabs
  tabBar: { flexDirection: "row", borderBottomWidth: 1, paddingHorizontal: 16 },
  tabBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  // Job card
  jobCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  jobTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "75%",
  },
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
    marginBottom: 4,
  },

  // Apply section
  applySection: { marginTop: 12, gap: 8 },
  applyInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
  },
  applyBtn: { paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  resultBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },

  // Review card
  reviewCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  reviewTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  reviewComment: { borderLeftWidth: 3, paddingLeft: 12, marginTop: 4 },

  // Empty state
  empty: { paddingVertical: 48, alignItems: "center" },
});
