// src/screens/main/HirerPublicProfileScreen.js
//
// Verbatim port of pages/hirers/HirerPublicProfile.jsx.
// Fully self-contained — hero card, tabs (Open Jobs / Reviews), apply flow,
// and in-app navigation to Chat.

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaStar,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaClock,
  FaBuilding,
  FaUsers,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaShieldAlt,
  FaAward,
  FaCommentDots,
  FaPencil,
  FaClipboardList,
  FaHandHoldingHeart,
  FaSearch,
  FaLock,
  FaArrowLeft,
  FaChevronRight,
} from "../../icons/fa";

function formatSpent(amount) {
  const n = Number(amount) || 0;
  if (n === 0) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function timeAgo(date) {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return "Today";
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function Stars({ rating, c }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <FaStar
          key={s}
          size={11}
          color={s <= Math.round(rating) ? c.orange : c.textMuted}
        />
      ))}
    </View>
  );
}

export default function HirerPublicProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user: viewerUser } = useAuthStore();
  const c = theme.colors;

  const userId = route.params?.userId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("jobs");

  // Track applying state per job ID
  const [applying, setApplying] = useState(null);
  const [applyMsg, setApplyMsg] = useState({});
  const [applyResult, setApplyResult] = useState({});

  const isOwnProfile = viewerUser?.id === userId;

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError("");

    client
      .get(`/hirers/${userId}/profile`)
      .then((res) => setData(res.data.data))
      .catch((e) => setError(e.response?.data?.message || "Profile not found"))
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleApply(jobId) {
    setApplying(jobId);
    setApplyResult((r) => ({ ...r, [jobId]: null }));

    try {
      await client.post(`/jobs/${jobId}/apply`, {
        message: applyMsg[jobId] || "",
      });
      setApplyResult((r) => ({
        ...r,
        [jobId]: {
          success: true,
          msg: "Application sent! The hirer will be notified.",
        },
      }));
      setApplyMsg((m) => ({ ...m, [jobId]: "" }));
      toast.success("Application sent!");
    } catch (e) {
      setApplyResult((r) => ({
        ...r,
        [jobId]: {
          success: false,
          msg: e.response?.data?.message || "Failed to apply.",
        },
      }));
    } finally {
      setApplying(null);
    }
  }

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  if (error || !data) {
    const isPrivate = error?.includes("private");
    return (
      <AppScreen scroll={false}>
        <View style={styles.errorWrap}>
          {isPrivate ? (
            <FaLock size={40} color={c.textMuted} />
          ) : (
            <FaSearch size={40} color={c.textMuted} />
          )}
          <AppText style={styles.errorTitle(c)}>
            {isPrivate ? "Private Profile" : "Hirer not found"}
          </AppText>
          <AppText style={styles.errorSub(c)}>
            {error || "This profile is not available."}
          </AppText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: c.border, marginTop: 20 }]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
              Back
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  const { profile, jobPosts, reviews, stats } = data;
  const hirerUser = profile.user;

  const verificationStatus =
    hirerUser.hirerProfile?.verificationStatus ??
    hirerUser.workerProfile?.verificationStatus ??
    null;
  const isVerified = verificationStatus === "VERIFIED";
  const isBackgroundChecked = hirerUser.workerProfile?.backgroundCheck === true;

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.topBack}>
        <FaArrowLeft size={12} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
          Back
        </AppText>
      </Pressable>

      {/* ═══ HERO ═══ */}
      <View
        style={[
          styles.hero,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.heroInner}>
          <View
            style={[
              styles.avatarWrap,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {hirerUser.avatar ? (
              <Image
                source={{ uri: hirerUser.avatar }}
                style={styles.avatarImg}
              />
            ) : (
              <AppText style={styles.avatarFallbackText(c)}>
                {hirerUser.firstName?.[0]}
                {hirerUser.lastName?.[0]}
              </AppText>
            )}
          </View>

          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <AppText style={styles.heroName(c)} numberOfLines={2}>
                {hirerUser.firstName} {hirerUser.lastName}
              </AppText>
            </View>

            {(isVerified || isBackgroundChecked) && (
              <View style={styles.badgesRow}>
                {isVerified && (
                  <View
                    style={[
                      styles.verifiedBadge,
                      { backgroundColor: c.greenDim, borderColor: c.green },
                    ]}
                  >
                    <FaShieldAlt size={11} color={c.green} />
                    <AppText style={styles.verifiedText(c)}>
                      Verified Hirer
                    </AppText>
                  </View>
                )}
                {isBackgroundChecked && (
                  <View
                    style={[
                      styles.checkedBadge,
                      {
                        backgroundColor: c.orangeDim,
                        borderColor: c.orangeGlow,
                      },
                    ]}
                  >
                    <FaAward size={11} color={c.orange} />
                    <AppText style={styles.checkedText(c)}>
                      Background Checked
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {profile.companyName && (
              <View style={styles.companyRow}>
                <FaBuilding size={11} color={c.textDim} />
                <AppText style={styles.companyText(c)}>
                  {profile.companyName}
                </AppText>
              </View>
            )}
            {profile.companySize && (
              <View style={styles.companyRow}>
                <FaUsers size={11} color={c.textDim} />
                <AppText style={styles.companyText(c)}>
                  {profile.companySize} employees
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Contact info chips */}
        <View style={styles.contactRow}>
          {hirerUser.phone && (
            <View
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaPhone size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)}>{hirerUser.phone}</AppText>
            </View>
          )}
          {hirerUser.email && (
            <View
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaEnvelope size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)} numberOfLines={1}>
                {hirerUser.email}
              </AppText>
            </View>
          )}
          {profile.website && (
            <View
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaGlobe size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)} numberOfLines={1}>
                {profile.website.replace(/^https?:\/\//, "")}
              </AppText>
            </View>
          )}
        </View>

        {/* Meta row */}
        <View style={styles.metaRow}>
          {(hirerUser.city || hirerUser.country) && (
            <View style={styles.metaItem}>
              <FaMapMarkerAlt size={11} color={c.textDim} />
              <AppText style={styles.metaText(c)}>
                {[hirerUser.city, hirerUser.country].filter(Boolean).join(", ")}
              </AppText>
            </View>
          )}
          <View style={styles.metaItem}>
            <FaCalendarAlt size={11} color={c.textDim} />
            <AppText style={styles.metaText(c)}>
              Member since{" "}
              {new Date(hirerUser.createdAt).toLocaleDateString("en-GB", {
                month: "short",
                year: "numeric",
              })}
            </AppText>
          </View>
          {hirerUser.lastSeen && (
            <View style={styles.metaItem}>
              <FaClock size={11} color={c.textDim} />
              <AppText style={styles.metaText(c)}>
                Last seen {timeAgo(hirerUser.lastSeen)}
              </AppText>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { borderTopColor: c.border }]}>
          <View style={styles.statItem}>
            <AppText style={styles.statNum(c)}>{stats.totalHires}</AppText>
            <AppText style={styles.statLabel(c)}>hires</AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.statItem}>
            <AppText style={styles.statNum(c)}>
              {formatSpent(stats.totalSpent)}
            </AppText>
            <AppText style={styles.statLabel(c)}>spent</AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.statItem}>
            <AppText style={styles.statNum(c)}>{stats.openJobs}</AppText>
            <AppText style={styles.statLabel(c)}>open jobs</AppText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.statItem}>
            <Stars rating={stats.avgRating} c={c} />
            <AppText style={styles.statLabel(c)}>
              {stats.totalReviews} reviews
            </AppText>
          </View>
        </View>

        {/* CTA */}
        {!isOwnProfile && viewerUser?.role === "WORKER" && (
          <Pressable
            onPress={() => navigation.navigate("Chat", { userId })}
            style={({ pressed }) => [
              styles.msgBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaCommentDots size={14} color={c.textDim} />
            <AppText style={styles.msgBtnText(c)}>Message Hirer</AppText>
          </Pressable>
        )}
        {isOwnProfile && (
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={({ pressed }) => [
              styles.msgBtn,
              {
                backgroundColor: c.bgCard,
                borderColor: c.border,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaPencil size={12} color={c.textDim} />
            <AppText style={styles.msgBtnText(c)}>Edit Profile</AppText>
          </Pressable>
        )}
      </View>

      {/* ═══ TABS ═══ */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setTab("jobs")}
          style={[
            styles.tabBtn,
            { borderBottomColor: tab === "jobs" ? c.orange : "transparent" },
          ]}
        >
          <AppText
            style={[
              styles.tabText,
              { color: tab === "jobs" ? c.orange : c.textMuted },
            ]}
          >
            Open Jobs ({stats.openJobs})
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setTab("reviews")}
          style={[
            styles.tabBtn,
            { borderBottomColor: tab === "reviews" ? c.orange : "transparent" },
          ]}
        >
          <AppText
            style={[
              styles.tabText,
              { color: tab === "reviews" ? c.orange : c.textMuted },
            ]}
          >
            Reviews ({stats.totalReviews})
          </AppText>
        </Pressable>
      </View>

      {/* ═══ TAB CONTENT ═══ */}
      {tab === "jobs" ? (
        <View style={styles.jobsGrid}>
          {jobPosts.length === 0 ? (
            <View style={styles.emptySection}>
              <FaClipboardList size={32} color={c.textMuted} />
              <AppText style={styles.emptyText(c)}>
                No open jobs at the moment.
              </AppText>
            </View>
          ) : (
            jobPosts.map((job) => (
              <View
                key={job.id}
                style={[
                  styles.jobCard,
                  { backgroundColor: c.bgPanel, borderColor: c.border },
                ]}
              >
                <View style={styles.jobTop}>
                  <View
                    style={[
                      styles.jobCatChip,
                      {
                        backgroundColor: c.orangeDim,
                        borderColor: c.orangeGlow,
                      },
                    ]}
                  >
                    <AppText style={styles.jobCatText(c)}>
                      {job.category.icon} {job.category.name}
                    </AppText>
                  </View>
                  <AppText style={styles.jobTime(c)}>
                    {timeAgo(job.createdAt)}
                  </AppText>
                </View>

                <AppText style={styles.jobTitle(c)}>{job.title}</AppText>
                <AppText style={styles.jobDesc(c)} numberOfLines={2}>
                  {job.description}
                </AppText>

                <View style={styles.jobMeta}>
                  <AppText style={styles.jobBudget(c)}>
                    {job.currency} {Number(job.budget).toLocaleString()}
                  </AppText>
                  <AppText style={styles.jobApps(c)}>
                    {job._count.applications} applicant
                    {job._count.applications !== 1 ? "s" : ""}
                  </AppText>
                  {job.address && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <FaMapMarkerAlt size={10} color={c.textMuted} />
                      <AppText style={styles.jobLocation(c)}>
                        {job.address.split(",")[0]}
                      </AppText>
                    </View>
                  )}
                </View>

                {/* Apply Section */}
                {viewerUser?.role === "WORKER" && !isOwnProfile && (
                  <View
                    style={[styles.applySection, { borderTopColor: c.border }]}
                  >
                    {applyResult[job.id]?.success && (
                      <View
                        style={[
                          styles.applySuccess,
                          { backgroundColor: c.greenDim, borderColor: c.green },
                        ]}
                      >
                        <AppText style={styles.applySuccessText(c)}>
                          {applyResult[job.id].msg}
                        </AppText>
                      </View>
                    )}
                    {applyResult[job.id] && !applyResult[job.id].success && (
                      <View
                        style={[
                          styles.applyError,
                          { backgroundColor: c.redDim, borderColor: c.red },
                        ]}
                      >
                        <AppText style={styles.applyErrorText(c)}>
                          {applyResult[job.id].msg}
                        </AppText>
                      </View>
                    )}

                    {!applyResult[job.id]?.success && (
                      <>
                        <TextInput
                          value={applyMsg[job.id] || ""}
                          onChangeText={(v) =>
                            setApplyMsg((m) => ({ ...m, [job.id]: v }))
                          }
                          placeholder="Add a message to your application (optional)..."
                          placeholderTextColor={c.textMuted}
                          multiline
                          numberOfLines={2}
                          style={[
                            styles.applyInput,
                            {
                              backgroundColor: c.bgInput,
                              borderColor: c.border,
                              color: c.text,
                            },
                          ]}
                        />
                        <Pressable
                          onPress={() => handleApply(job.id)}
                          disabled={applying === job.id}
                          style={({ pressed }) => [
                            styles.applyBtn,
                            {
                              backgroundColor: c.orange,
                              opacity:
                                applying === job.id ? 0.6 : pressed ? 0.9 : 1,
                            },
                          ]}
                        >
                          {applying === job.id ? (
                            <ActivityIndicator size="small" color={c.bg} />
                          ) : (
                            <>
                              <FaHandHoldingHeart size={14} color={c.bg} />
                              <AppText style={styles.applyBtnText(c)}>
                                Apply Now
                              </AppText>
                            </>
                          )}
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                <Pressable
                  onPress={() =>
                    navigation.navigate("JobDetail", { jobId: job.id })
                  }
                  style={styles.jobViewLink}
                >
                  <AppText style={styles.jobViewLinkText(c)}>
                    View full details →
                  </AppText>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

      {tab === "reviews" ? (
        <View style={{ gap: 10 }}>
          {reviews.length === 0 ? (
            <View style={styles.emptySection}>
              <FaStar size={32} color={c.textMuted} />
              <AppText style={styles.emptyText(c)}>No reviews yet.</AppText>
            </View>
          ) : (
            reviews.map((r) => (
              <View
                key={r.id}
                style={[
                  styles.reviewCard,
                  { backgroundColor: c.bgPanel, borderColor: c.border },
                ]}
              >
                <View style={styles.reviewTop}>
                  <View
                    style={[
                      styles.reviewAvatar,
                      {
                        backgroundColor: c.orangeDim,
                        borderColor: c.orangeGlow,
                      },
                    ]}
                  >
                    {r.giver.avatar ? (
                      <Image
                        source={{ uri: r.giver.avatar }}
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <AppText style={styles.reviewAvatarText(c)}>
                        {r.giver.firstName?.[0]}
                        {r.giver.lastName?.[0]}
                      </AppText>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.reviewName(c)}>
                      {r.giver.firstName} {r.giver.lastName}
                    </AppText>
                    <AppText style={styles.reviewDate(c)}>
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </AppText>
                  </View>
                  <Stars rating={r.rating} c={c} />
                </View>
                {r.comment && (
                  <AppText style={styles.reviewComment(c)}>
                    "{r.comment}"
                  </AppText>
                )}
              </View>
            ))
          )}
        </View>
      ) : null}
    </AppScreen>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 18,
    fontWeight: "800",
    color: c.text,
    marginTop: 16,
  }),
  errorSub: (c) => ({
    fontSize: 13,
    color: c.textDim,
    marginTop: 6,
    textAlign: "center",
  }),
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  topBack: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 8,
  },

  hero: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  heroInner: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallbackText: (c) => ({
    fontSize: 22,
    fontWeight: "800",
    color: c.orange,
  }),
  heroInfo: { flex: 1, minWidth: 0, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  heroName: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 18,
    fontWeight: "800",
    color: c.text,
  }),

  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  verifiedText: (c) => ({ fontSize: 9, fontWeight: "700", color: c.green }),
  checkedBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
  },
  checkedText: (c) => ({ fontSize: 9, fontWeight: "700", color: c.orange }),

  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  companyText: (c) => ({ fontSize: 11, color: c.textDim }),

  contactRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "100%",
  },
  contactText: (c) => ({ fontSize: 10, color: c.textDim, marginLeft: 4 }),

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: (c) => ({ fontSize: 10, color: c.textDim }),

  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    rowGap: 6,
    columnGap: 6,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statNum: (c) => ({ fontSize: 14, fontWeight: "800", color: c.text }),
  statLabel: (c) => ({ fontSize: 9, color: c.textMuted }),
  statDivider: { width: 1, height: 14 },

  msgBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  msgBtnText: (c) => ({ fontSize: 12, fontWeight: "700", color: c.textDim }),

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
  },
  tabText: { fontSize: 13, fontWeight: "700" },

  jobsGrid: { gap: 12 },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.1)",
  },
  emptyText: (c) => ({ fontSize: 13, color: c.textDim, marginTop: 10 }),

  jobCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  jobTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  jobCatChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  jobCatText: (c) => ({ fontSize: 10, fontWeight: "700", color: c.orange }),
  jobTime: (c) => ({ fontSize: 10, color: c.textMuted }),
  jobTitle: (c) => ({
    fontFamily: "Syne_700Bold",
    fontSize: 15,
    fontWeight: "700",
    color: c.text,
    marginBottom: 4,
  }),
  jobDesc: (c) => ({
    fontSize: 12,
    color: c.textDim,
    lineHeight: 18,
    marginBottom: 8,
  }),
  jobMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 10,
  },
  jobBudget: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 14,
    fontWeight: "800",
    color: c.orange,
  }),
  jobApps: (c) => ({ fontSize: 11, color: c.textMuted }),
  jobLocation: (c) => ({ fontSize: 11, color: c.textMuted }),

  applySection: { paddingTop: 10, borderTopWidth: 1, gap: 8 },
  applySuccess: { padding: 8, borderRadius: 8, borderWidth: 1 },
  applySuccessText: (c) => ({
    fontSize: 11,
    color: c.green,
    fontWeight: "600",
  }),
  applyError: { padding: 8, borderRadius: 8, borderWidth: 1 },
  applyErrorText: (c) => ({ fontSize: 11, color: c.red, fontWeight: "600" }),
  applyInput: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  applyBtnText: (c) => ({ fontSize: 13, fontWeight: "700", color: c.bg }),

  jobViewLink: { marginTop: 12, alignSelf: "flex-start" },
  jobViewLinkText: (c) => ({
    fontSize: 12,
    color: c.orange,
    fontWeight: "600",
  }),

  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  reviewAvatarText: (c) => ({
    fontSize: 10,
    fontWeight: "700",
    color: c.orange,
  }),
  reviewName: (c) => ({ fontSize: 13, fontWeight: "700", color: c.text }),
  reviewDate: (c) => ({ fontSize: 10, color: c.textMuted, marginTop: 2 }),
  reviewComment: (c) => ({
    fontSize: 12,
    color: c.textDim,
    fontStyle: "italic",
    lineHeight: 18,
    borderLeftWidth: 2,
    borderLeftColor: c.orangeGlow,
    paddingLeft: 10,
  }),
});
