// src/screens/main/HirerPublicProfileScreen.js
//
// Verbatim port of HirerPublicProfile.jsx + HirerPublicProfile.module.css.
// All font families, sizes, weights, line-heights, and letter-spacing are
// copied 1:1 from the CSS.

import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons"; // Fallback for missing icons

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaStar,
  FaMapMarkerAlt,
  FaCalendarAlt,
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
  FaTimes,
  FaExpand,
} from "../../icons/fa";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Breakpoints — mirrored from CSS @media rules ────────────────
const isSmallPhone = SCREEN_WIDTH <= 480;
const isTinyPhone = SCREEN_WIDTH <= 359;

// ── Helpers ────────────────────────────────────────────────────
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

function Stars({ rating }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <AppText
          key={s}
          style={{
            fontSize: 14,
            color:
              s <= Math.round(rating) ? "#f97316" : "rgba(255,255,255,0.08)",
          }}
        >
          ★
        </AppText>
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

  const [applying, setApplying] = useState(null);
  const [applyMsg, setApplyMsg] = useState({});
  const [applyResult, setApplyResult] = useState({});
  const [avatarLightbox, setAvatarLightbox] = useState(null);

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
      const msg = e.response?.data?.message || "Failed to apply.";
      setApplyResult((r) => ({ ...r, [jobId]: { success: false, msg } }));
      toast.error(msg);
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
        <View style={styles.notFound}>
          {isPrivate ? (
            <FaLock size={40} color={c.textMuted} />
          ) : (
            <FaSearch size={40} color={c.textMuted} />
          )}
          <AppText style={[styles.notFoundTitle, { color: c.text }]}>
            {isPrivate ? "Private Profile" : "Hirer not found"}
          </AppText>
          <AppText
            style={{ fontSize: 13, color: c.textMuted, textAlign: "center" }}
          >
            {error || "This profile is not available."}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("Search")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 5,
              marginTop: 4,
            }}
          >
            <FaArrowLeft size={13} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim }}>
              Back to Search
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

  // Format website URL safely
  const websiteUrl = profile.website
    ? profile.website.startsWith("http")
      ? profile.website
      : `https://${profile.website}`
    : null;

  return (
    <AppScreen
      scroll={true}
      contentContainerStyle={styles.page}
      backgroundColor={c.bg}
    >
      {/* ══════════════ HERO ══════════════ */}
      <View
        style={[
          styles.hero,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={[styles.heroTopStrip, { backgroundColor: c.orange }]} />

        <View style={styles.heroInner}>
          <Pressable
            onPress={() =>
              hirerUser.avatar && setAvatarLightbox(hirerUser.avatar)
            }
            disabled={!hirerUser.avatar}
            style={[
              styles.avatarWrap,
              {
                width: isSmallPhone ? 72 : 96,
                height: isSmallPhone ? 72 : 96,
                borderRadius: (isSmallPhone ? 72 : 96) / 2,
                backgroundColor: c.orangeDim,
                borderColor: c.orangeGlow,
              },
            ]}
          >
            {hirerUser.avatar ? (
              <Image
                source={{ uri: hirerUser.avatar }}
                style={{ width: "100%", height: "100%", borderRadius: 999 }}
              />
            ) : (
              <AppText
                style={{
                  fontFamily: "Syne_800ExtraBold",
                  fontSize: isSmallPhone ? 24 : 32,
                  fontWeight: "800",
                  color: c.orange,
                }}
              >
                {hirerUser.firstName?.[0]}
                {hirerUser.lastName?.[0]}
              </AppText>
            )}

            {hirerUser.avatar ? (
              <View
                style={[
                  styles.avatarExpandBadge,
                  { backgroundColor: c.orange, borderColor: c.bgPanel },
                ]}
              >
                <FaExpand size={10} color="#000" />
              </View>
            ) : null}
          </Pressable>

          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <AppText
                style={[
                  styles.heroName,
                  {
                    color: c.text,
                    fontSize: isSmallPhone ? 18 : 24,
                    lineHeight: isSmallPhone ? 22 : 30,
                  },
                ]}
                numberOfLines={2}
              >
                {hirerUser.firstName} {hirerUser.lastName}
              </AppText>
            </View>

            {(isVerified || isBackgroundChecked) && (
              <View style={styles.badgesRow}>
                {isVerified && (
                  <View
                    style={[
                      styles.badgeVerified,
                      {
                        backgroundColor: "rgba(34,197,94,0.1)",
                        borderColor: "rgba(34,197,94,0.25)",
                      },
                    ]}
                  >
                    <FaShieldAlt size={11} color={c.green} />
                    <AppText style={[styles.badgeText, { color: c.green }]}>
                      Verified Hirer
                    </AppText>
                  </View>
                )}
                {isBackgroundChecked && (
                  <View
                    style={[
                      styles.badgeChecked,
                      {
                        backgroundColor: "rgba(59,130,246,0.1)",
                        borderColor: "rgba(59,130,246,0.25)",
                      },
                    ]}
                  >
                    <FaAward size={11} color="#60a5fa" />
                    <AppText style={[styles.badgeText, { color: "#60a5fa" }]}>
                      Background Checked
                    </AppText>
                  </View>
                )}
              </View>
            )}

            {profile.companyName && (
              <View style={styles.companyRow}>
                <FaBuilding size={13} color={c.textDim} />
                <AppText style={[styles.companyName, { color: c.textDim }]}>
                  {profile.companyName}
                </AppText>
              </View>
            )}

            {profile.companySize && (
              <View style={[styles.companyRow, { marginBottom: 6 }]}>
                <FaUsers size={12} color={c.textMuted} />
                <AppText style={[styles.companySize, { color: c.textMuted }]}>
                  {profile.companySize} employees
                </AppText>
              </View>
            )}

            {/* Contact chips: Phone, Email, Gender, Language, Website */}
            <View style={styles.contactRow}>
              {hirerUser.phone && (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${hirerUser.phone}`)}
                  style={[
                    styles.contactItem,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <FaPhone size={12} color={c.textDim} />
                  <AppText
                    style={[styles.contactItemText, { color: c.textDim }]}
                    numberOfLines={1}
                  >
                    {hirerUser.phone}
                  </AppText>
                </Pressable>
              )}

              {hirerUser.email && (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${hirerUser.email}`)}
                  style={[
                    styles.contactItem,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <FaEnvelope size={12} color={c.textDim} />
                  <AppText
                    style={[styles.contactItemText, { color: c.textDim }]}
                    numberOfLines={1}
                  >
                    {hirerUser.email}
                  </AppText>
                </Pressable>
              )}

              {/* GENDER */}
              {hirerUser.gender && (
                <View
                  style={[
                    styles.contactItem,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <Ionicons name="card-outline" size={12} color={c.textDim} />
                  <AppText
                    style={[styles.contactItemText, { color: c.textDim }]}
                  >
                    {hirerUser.gender}
                  </AppText>
                </View>
              )}

              {/* LANGUAGE */}
              {hirerUser.language && (
                <View
                  style={[
                    styles.contactItem,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <Ionicons
                    name="language-outline"
                    size={12}
                    color={c.textDim}
                  />
                  <AppText
                    style={[styles.contactItemText, { color: c.textDim }]}
                  >
                    {hirerUser.language}
                  </AppText>
                </View>
              )}

              {/* WEBSITE — clickable */}
              {websiteUrl && (
                <Pressable
                  onPress={() => Linking.openURL(websiteUrl)}
                  style={[
                    styles.contactItem,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <FaGlobe size={12} color={c.textDim} />
                  <AppText
                    style={[styles.contactItemText, { color: c.textDim }]}
                    numberOfLines={1}
                  >
                    {profile.website.replace(/^https?:\/\//, "")}
                  </AppText>
                </Pressable>
              )}
            </View>

            <View style={styles.metaRow}>
              {(hirerUser.city || hirerUser.country) && (
                <View style={styles.metaItem}>
                  <FaMapMarkerAlt size={12} color={c.textDim} />
                  <AppText style={[styles.metaItemText, { color: c.textDim }]}>
                    {[hirerUser.city, hirerUser.country]
                      .filter(Boolean)
                      .join(", ")}
                  </AppText>
                </View>
              )}
              <View style={styles.metaItem}>
                <FaCalendarAlt size={12} color={c.textDim} />
                <AppText style={[styles.metaItemText, { color: c.textDim }]}>
                  Member since{" "}
                  {new Date(hirerUser.createdAt).toLocaleDateString("en-GB", {
                    month: "short",
                    year: "numeric",
                  })}
                </AppText>
              </View>
              {hirerUser.lastSeen && (
                <View style={styles.metaItem}>
                  <FaClock size={12} color={c.textDim} />
                  <AppText style={[styles.metaItemText, { color: c.textDim }]}>
                    Last seen {timeAgo(hirerUser.lastSeen)}
                  </AppText>
                </View>
              )}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <AppText style={[styles.statNum, { color: c.orange }]}>
                  {stats.totalHires}
                </AppText>
                <AppText style={[styles.statLabel, { color: c.textMuted }]}>
                  hires
                </AppText>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: c.border }]}
              />
              <View style={styles.stat}>
                <AppText style={[styles.statNum, { color: c.orange }]}>
                  {stats.openJobs}
                </AppText>
                <AppText style={[styles.statLabel, { color: c.textMuted }]}>
                  open jobs
                </AppText>
              </View>
              <View
                style={[styles.statDivider, { backgroundColor: c.border }]}
              />
              <View style={styles.stat}>
                <Stars rating={stats.avgRating} />
                <AppText style={[styles.statLabel, { color: c.textMuted }]}>
                  {stats.totalReviews} reviews
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {!isOwnProfile && viewerUser?.role === "WORKER" && (
          <View style={[styles.heroCta, { borderTopColor: c.border }]}>
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
              <FaCommentDots size={16} color={c.text} />
            </Pressable>
          </View>
        )}
        {isOwnProfile && (
          <View style={[styles.heroCta, { borderTopColor: c.border }]}>
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={({ pressed }) => [
                styles.editBtn,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <FaPencil size={13} color={c.textDim} />
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
              >
                Edit Profile
              </AppText>
            </Pressable>
          </View>
        )}
      </View>

      {/* ══════════════ TAB BAR ══════════════ */}
      <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => setTab("jobs")}
          style={[
            styles.tabBtn,
            {
              borderBottomColor: tab === "jobs" ? c.orange : "transparent",
              marginBottom: -1,
            },
          ]}
        >
          <AppText
            style={[
              styles.tabText,
              { color: tab === "jobs" ? c.orange : c.textDim },
            ]}
          >
            Open Jobs ({stats.openJobs})
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setTab("reviews")}
          style={[
            styles.tabBtn,
            {
              borderBottomColor: tab === "reviews" ? c.orange : "transparent",
              marginBottom: -1,
            },
          ]}
        >
          <AppText
            style={[
              styles.tabText,
              { color: tab === "reviews" ? c.orange : c.textDim },
            ]}
          >
            Reviews ({stats.totalReviews})
          </AppText>
        </Pressable>
      </View>

      {/* ══════════════ JOBS TAB ══════════════ */}
      {tab === "jobs" ? (
        <View style={styles.jobsGrid}>
          {jobPosts.length === 0 ? (
            <View style={styles.empty}>
              <View style={{ opacity: 0.5 }}>
                <FaClipboardList size={28} color={c.textMuted} />
              </View>
              <AppText
                style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
              >
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
                <View style={styles.jobCardTop}>
                  <View
                    style={[
                      styles.jobCat,
                      {
                        backgroundColor: c.orangeDim,
                        borderColor: c.orangeGlow,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: c.orange,
                        lineHeight: 14,
                      }}
                      numberOfLines={1}
                    >
                      {job.category.icon} {job.category.name}
                    </AppText>
                  </View>
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    {timeAgo(job.createdAt)}
                  </AppText>
                </View>

                <AppText
                  style={[styles.jobTitle, { color: c.text }]}
                  numberOfLines={2}
                >
                  {job.title}
                </AppText>

                <AppText
                  style={{ fontSize: 12, color: c.textDim, lineHeight: 19.2 }}
                  numberOfLines={2}
                >
                  {job.description.slice(0, 120)}
                  {job.description.length > 120 ? "..." : ""}
                </AppText>

                <View style={styles.jobMeta}>
                  <AppText style={[styles.jobBudget, { color: c.orange }]}>
                    {job.currency} {Number(job.budget).toLocaleString()}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: c.textMuted }}>
                    {job._count.applications} applicant
                    {job._count.applications !== 1 ? "s" : ""}
                  </AppText>
                  {job.address && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <FaMapMarkerAlt size={11} color={c.textMuted} />
                      <AppText style={{ fontSize: 11, color: c.textMuted }}>
                        {job.address.split(",")[0]}
                      </AppText>
                    </View>
                  )}
                </View>

                {viewerUser?.role === "WORKER" && !isOwnProfile && (
                  <View
                    style={[styles.applySection, { borderTopColor: c.border }]}
                  >
                    {applyResult[job.id]?.success && (
                      <View
                        style={[
                          styles.applyBanner,
                          {
                            backgroundColor: "rgba(34,197,94,0.1)",
                            borderColor: "rgba(34,197,94,0.2)",
                          },
                        ]}
                      >
                        <AppText style={{ fontSize: 12, color: c.green }}>
                          {applyResult[job.id].msg}
                        </AppText>
                      </View>
                    )}
                    {applyResult[job.id] && !applyResult[job.id].success && (
                      <View
                        style={[
                          styles.applyBanner,
                          {
                            backgroundColor: c.redDim,
                            borderColor: "rgba(239,68,68,0.2)",
                          },
                        ]}
                      >
                        <AppText style={{ fontSize: 12, color: c.red }}>
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
                          textAlignVertical="top"
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
                            <ActivityIndicator size="small" color="#000" />
                          ) : (
                            <>
                              <FaHandHoldingHeart size={14} color="#000" />
                              <AppText
                                style={{
                                  fontSize: 13,
                                  fontWeight: "800",
                                  color: "#000",
                                }}
                              >
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
                  style={{ marginTop: 8, alignSelf: "flex-start" }}
                >
                  <AppText style={{ fontSize: 12, color: c.textDim }}>
                    View full details →
                  </AppText>
                </Pressable>
              </View>
            ))
          )}
        </View>
      ) : null}

      {/* ══════════════ REVIEWS TAB ══════════════ */}
      {tab === "reviews" ? (
        <View style={styles.reviewsList}>
          {reviews.length === 0 ? (
            <View style={styles.empty}>
              <View style={{ opacity: 0.5 }}>
                <FaStar size={28} color={c.textMuted} />
              </View>
              <AppText
                style={{ fontSize: 13, color: c.textDim, textAlign: "center" }}
              >
                No reviews yet.
              </AppText>
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
                      { backgroundColor: c.bgCard, borderColor: c.border },
                    ]}
                  >
                    {r.giver.avatar ? (
                      <Image
                        source={{ uri: r.giver.avatar }}
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 17,
                        }}
                      />
                    ) : (
                      <AppText
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: c.textDim,
                        }}
                      >
                        {r.giver.firstName?.[0]}
                        {r.giver.lastName?.[0]}
                      </AppText>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText
                      style={{ fontSize: 13, fontWeight: "700", color: c.text }}
                    >
                      {r.giver.firstName} {r.giver.lastName}
                    </AppText>
                    <AppText style={{ fontSize: 11, color: c.textMuted }}>
                      {new Date(r.createdAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </AppText>
                  </View>
                  <Stars rating={r.rating} />
                </View>
                {r.comment && (
                  <AppText
                    style={{
                      fontSize: 13,
                      color: c.textDim,
                      fontStyle: "italic",
                      borderLeftWidth: 2,
                      borderLeftColor: c.orangeGlow,
                      paddingLeft: 10,
                      lineHeight: 21.45,
                    }}
                  >
                    "{r.comment}"
                  </AppText>
                )}
              </View>
            ))
          )}
        </View>
      ) : null}

      {/* ══════════════ FULLSCREEN AVATAR VIEWER ══════════════ */}
      <Modal
        visible={!!avatarLightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarLightbox(null)}
      >
        <Pressable
          style={styles.lightboxOverlay}
          onPress={() => setAvatarLightbox(null)}
        >
          <Pressable
            style={styles.lightboxCloseBtn}
            onPress={() => setAvatarLightbox(null)}
            hitSlop={12}
          >
            <FaTimes size={22} color="#fff" />
          </Pressable>
          {avatarLightbox ? (
            <Image
              source={{ uri: avatarLightbox }}
              style={styles.lightboxImg}
              resizeMode="contain"
            />
          ) : null}
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  page: {
    paddingHorizontal: isTinyPhone ? 10 : isSmallPhone ? 16 : 24,
    paddingTop: isSmallPhone ? 20 : 32,
    paddingBottom: 40,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 48,
    gap: 10,
  },
  notFoundTitle: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  hero: {
    borderRadius: 18,
    borderWidth: 1,
    padding: isSmallPhone ? 16 : 24,
    marginBottom: 14,
    overflow: "hidden",
  },
  heroTopStrip: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    opacity: 0.85,
  },
  heroInner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: isSmallPhone ? 14 : 20,
    marginBottom: 14,
  },
  avatarWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
    borderWidth: 3,
  },
  avatarExpandBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    marginBottom: 2,
  },
  heroName: {
    fontFamily: "Syne_800ExtraBold",
    fontWeight: "800",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
    marginBottom: 4,
  },
  badgeVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeChecked: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 20,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.02 * 11,
    lineHeight: 11,
  },
  companyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  companyName: {
    fontSize: 13,
  },
  companySize: {
    fontSize: 12,
  },
  contactRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 8,
    marginTop: 4,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 190,
  },
  contactItemText: {
    fontSize: 11,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaItemText: {
    fontSize: 12,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    rowGap: 8,
  },
  stat: {
    flexDirection: "column",
    gap: 1,
  },
  statNum: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 18,
    fontWeight: "800",
    lineHeight: 18,
  },
  statLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.08 * 10,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  heroCta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  msgBtn: {
    paddingVertical: 9,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: 18,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabBar: {
    flexDirection: "row",
    gap: 3,
    borderBottomWidth: 1,
    marginBottom: 14,
  },
  tabBtn: {
    flexShrink: 0,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
  },
  jobsGrid: {
    gap: 10,
  },
  jobCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: "column",
  },
  jobCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  jobCat: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  jobTitle: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 14,
    fontWeight: "800",
  },
  jobMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  jobBudget: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 14,
    fontWeight: "800",
  },
  applySection: {
    paddingTop: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  applyInput: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 12,
    minHeight: 56,
  },
  applyBtn: {
    width: "100%",
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  applyBanner: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  reviewsList: {
    gap: 10,
  },
  reviewCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  reviewTop: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  empty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.08)",
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  lightboxCloseBtn: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  lightboxImg: {
    width: "90%",
    height: "90%",
  },
});
