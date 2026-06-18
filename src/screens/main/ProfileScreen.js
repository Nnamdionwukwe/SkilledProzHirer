// src/screens/main/ProfileScreen.js
// Mobile mirror of the website's UserProfile.jsx
// Endpoints: GET /users/:id  ·  GET /reviews/hirer/:id  ·  GET /reviews/worker/:id

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import Card from "../../components/Card";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useToast } from "../../contexts/ToastContext";
import {
  getUser,
  getHirerReviews,
  getWorkerReviews,
  updateAvatar,
} from "../../api/profile";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function initials(u) {
  if (!u) return "??";
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

function timeAgo(date, t) {
  if (!date) return t("profile.never");
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("profile.justNow");
  if (m < 60) return t("profile.minutesAgo", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("profile.hoursAgo", { h });
  const d = Math.floor(h / 24);
  if (d < 30) return t("profile.daysAgo", { d });
  return new Date(date).toLocaleDateString();
}

// ─── Star row ─────────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = 13, c }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(rating) ? "star" : "star-outline"}
          size={size}
          color={i < Math.round(rating) ? c.orange : c.textMuted}
        />
      ))}
    </View>
  );
}

// ─── Info chip (location, phone, etc.) ───────────────────────────────────────
function InfoChip({ icon, label, onPress, c }) {
  const Inner = (
    <View
      style={[
        styles.chip,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <Ionicons
        name={icon}
        size={13}
        color={c.orange}
        style={{ marginRight: 5 }}
      />
      <AppText
        variant="small"
        numberOfLines={1}
        style={{ color: c.text, maxWidth: 160 }}
      >
        {label}
      </AppText>
    </View>
  );
  return onPress ? <Pressable onPress={onPress}>{Inner}</Pressable> : Inner;
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({ icon, value, label, c }) {
  return (
    <View style={[styles.statCell, { borderColor: c.border }]}>
      <Ionicons
        name={icon}
        size={16}
        color={c.orange}
        style={{ marginBottom: 6 }}
      />
      <AppText variant="body" weight="semibold" numberOfLines={1}>
        {value}
      </AppText>
      <AppText variant="small" tone="dim" numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

// ─── Badge pill ───────────────────────────────────────────────────────────────
function Badge({ icon, label, color, bg }) {
  return (
    <View style={[styles.badgePill, { backgroundColor: bg }]}>
      <Ionicons
        name={icon}
        size={12}
        color={color}
        style={{ marginRight: 4 }}
      />
      <AppText variant="small" weight="semibold" style={{ color }}>
        {label}
      </AppText>
    </View>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review, c }) {
  const gi = review.giver;
  const name = `${gi?.firstName ?? ""} ${gi?.lastName ?? ""}`.trim();
  const role = gi?.role === "HIRER" ? "Hirer" : "Worker";
  const date = new Date(review.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Card padded style={{ marginBottom: 10 }}>
      <View style={styles.reviewTop}>
        {/* Avatar */}
        <View
          style={[
            styles.reviewAvatar,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          {gi?.avatar ? (
            <Image source={{ uri: gi.avatar }} style={styles.reviewAvatarImg} />
          ) : (
            <AppText variant="small" weight="semibold">
              {gi?.firstName?.[0] ?? "?"}
            </AppText>
          )}
        </View>
        {/* Meta */}
        <View style={{ flex: 1, marginHorizontal: 10 }}>
          <AppText variant="body" weight="semibold" numberOfLines={1}>
            {name}{" "}
            <AppText variant="small" tone="dim">
              · {role}
            </AppText>
          </AppText>
          {review.booking?.title && (
            <AppText variant="small" tone="dim" numberOfLines={1}>
              {review.booking.category?.icon} {review.booking.title}
            </AppText>
          )}
          <AppText variant="small" tone="dim">
            {date}
          </AppText>
        </View>
        {/* Stars + score */}
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Stars rating={review.rating} size={12} c={c} />
          <AppText variant="small" tone="dim">
            {review.rating}/5
          </AppText>
        </View>
      </View>
      {review.comment ? (
        <View style={[styles.reviewQuote, { borderLeftColor: c.orange }]}>
          <AppText variant="body" tone="dim" style={{ fontStyle: "italic" }}>
            "{review.comment}"
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { user: me, updateUser } = useAuthStore();
  const { toast } = useToast();
  const c = th.colors;

  // userId from route params (viewing someone else) or own profile
  const routeUserId = route.params?.userId;
  const profileId = routeUserId || me?.id;
  const isOwn = !routeUserId || routeUserId === me?.id;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("about");
  const [uploading, setUploading] = useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsAvg, setReviewsAvg] = useState(0);

  // ── Fetch profile ──────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    if (!profileId) return;
    try {
      const data = await getUser(profileId);
      setUser(data);
      setError("");
    } catch {
      setError(t("profile.userNotFound"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [profileId, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // ── Fetch reviews when tab opens ──────────────────────────────────────────
  useEffect(() => {
    if (tab !== "reviews" || !user) return;
    setReviewsLoading(true);
    const fetcher =
      user.role === "WORKER"
        ? getWorkerReviews(user.id, { limit: 20 })
        : getHirerReviews(user.id, { limit: 20 });
    fetcher
      .then((d) => {
        setReviews(d.reviews ?? []);
        setReviewsTotal(d.total ?? 0);
        setReviewsAvg(d.avgRating ?? 0);
      })
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [tab, user]);

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarPress = async () => {
    if (!isOwn || uploading) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error(t("settings.profile.permissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("avatar", {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: "avatar.jpg",
    });
    setUploading(true);
    try {
      const updated = await updateAvatar(formData);
      setUser((u) => ({ ...u, avatar: updated.avatar }));
      updateUser({ avatar: updated.avatar });
      toast.success(t("settings.profile.photoUpdated"));
    } catch {
      toast.error(t("settings.profile.photoFailed"));
    } finally {
      setUploading(false);
    }
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading)
    return (
      <AppScreen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.orange} />
          <AppText variant="small" tone="dim" style={{ marginTop: 12 }}>
            {t("profile.loadingProfile")}
          </AppText>
        </View>
      </AppScreen>
    );

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !user)
    return (
      <AppScreen>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={40} color={c.red} />
          <AppText variant="body" tone="dim" style={{ marginTop: 10 }}>
            {error || t("profile.userNotFound")}
          </AppText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backPill, { backgroundColor: c.bgCard }]}
          >
            <Ionicons name="arrow-back" size={15} color={c.text} />
            <AppText variant="small" style={{ marginLeft: 6 }}>
              {t("common.back")}
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );

  const wp = user.workerProfile;
  const hp = user.hirerProfile;
  const hs = user.hirerStats;
  const tabs =
    user.role === "WORKER"
      ? [
          { key: "about", label: t("profile.tabAbout") },
          { key: "reviews", label: t("profile.tabReviews") },
        ]
      : [
          { key: "about", label: t("profile.tabAbout") },
          { key: "reviews", label: t("profile.tabReviews") },
        ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <AppScreen scrollable={false}>
      {/* Top nav */}
      <View style={[styles.topBar, { borderBottomColor: c.border }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color={c.text} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 10 }}>
          {isOwn && (
            <AppText variant="small" tone="dim">
              {t("profile.yourPublicProfile")}
            </AppText>
          )}
        </View>
        {isOwn && (
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={[
              styles.settingsBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={16}
              color={c.text}
              style={{ marginRight: 6 }}
            />
            <AppText variant="small" weight="semibold">
              {t("nav.settings")}
            </AppText>
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchProfile();
            }}
            tintColor={c.orange}
          />
        }
      >
        {/* ── HERO CARD ─────────────────────────────────────────────────── */}
        <Card style={styles.heroCard}>
          {/* Hero background strip */}
          <View style={[styles.heroBg, { backgroundColor: c.orangeDim }]} />

          {/* Avatar */}
          <Pressable
            onPress={handleAvatarPress}
            disabled={!isOwn}
            style={styles.avatarWrap}
          >
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText
                  variant="display"
                  weight="displayBlack"
                  style={{ color: c.orange }}
                >
                  {initials(user)}
                </AppText>
              </View>
            )}
            {isOwn && (
              <View
                style={[
                  styles.avatarOverlay,
                  { backgroundColor: "rgba(0,0,0,0.5)" },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            )}
            {!isOwn && (
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: c.green, borderColor: c.bgPanel },
                ]}
              />
            )}
          </Pressable>

          {/* Name + badges */}
          <View style={styles.heroInfo}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <AppText variant="displaySm" weight="displayBlack">
                {user.firstName} {user.lastName}
              </AppText>
              {wp?.verificationStatus === "VERIFIED" && (
                <Ionicons name="shield-checkmark" size={18} color={c.green} />
              )}
            </View>

            {/* Role pill */}
            <View
              style={[
                styles.rolePill,
                { backgroundColor: c.bgCard, borderColor: c.orange },
              ]}
            >
              <Ionicons
                name={
                  user.role === "WORKER"
                    ? "construct-outline"
                    : "briefcase-outline"
                }
                size={12}
                color={c.orange}
              />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange, marginLeft: 4 }}
              >
                {user.role === "WORKER"
                  ? t("profile.worker")
                  : t("profile.hirer")}
              </AppText>
            </View>

            {/* Worker title */}
            {wp?.title && (
              <AppText variant="body" tone="dim" style={{ marginTop: 4 }}>
                {wp.title}
              </AppText>
            )}

            {/* Stars (worker) */}
            {user.role === "WORKER" && wp?.avgRating > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 6,
                }}
              >
                <Stars rating={wp.avgRating} c={c} />
                <AppText variant="small" weight="semibold">
                  {Number(wp.avgRating).toFixed(1)}
                </AppText>
                <AppText variant="small" tone="dim">
                  ({wp.totalReviews ?? 0} {t("profile.reviews")})
                </AppText>
              </View>
            )}
          </View>
        </Card>

        {/* ── STATS ROW ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ gap: 0 }}
        >
          <View
            style={[
              styles.statsRow,
              { borderColor: c.border, backgroundColor: c.bgCard },
            ]}
          >
            {user.role === "HIRER" && hs && (
              <>
                <StatCell
                  icon="briefcase-outline"
                  value={String(hs.totalHires)}
                  label={t("profile.totalHires")}
                  c={c}
                />
                <StatCell
                  icon="cash-outline"
                  value={`${user.currency ?? "USD"} ${Number(hs.totalSpent).toLocaleString()}`}
                  label={t("profile.totalSpent")}
                  c={c}
                />
                {hs.avgRating > 0 && (
                  <StatCell
                    icon="star-outline"
                    value={`${Number(hs.avgRating).toFixed(1)} (${hs.totalReviews})`}
                    label={t("profile.rating")}
                    c={c}
                  />
                )}
              </>
            )}
            {user.role === "WORKER" && wp && (
              <>
                <StatCell
                  icon="cash-outline"
                  value={`${wp.currency ?? user.currency ?? "USD"} ${Number(wp.hourlyRate ?? 0).toLocaleString()}`}
                  label={t("profile.perHour")}
                  c={c}
                />
                <StatCell
                  icon="checkmark-circle-outline"
                  value={String(wp.completedJobs ?? wp.totalJobs ?? 0)}
                  label={t("profile.jobsDone")}
                  c={c}
                />
                {wp.serviceRadius && (
                  <StatCell
                    icon="location-outline"
                    value={`${wp.serviceRadius}`}
                    label={t("profile.radius")}
                    c={c}
                  />
                )}
              </>
            )}
            <StatCell
              icon="time-outline"
              value={timeAgo(user.lastSeen, t)}
              label={t("profile.lastSeen")}
              c={c}
            />
            <StatCell
              icon="calendar-outline"
              value={new Date(user.createdAt).toLocaleDateString("en", {
                month: "short",
                year: "numeric",
              })}
              label={t("profile.joined")}
              c={c}
            />
          </View>
        </ScrollView>

        {/* ── INFO CHIPS ────────────────────────────────────────────────── */}
        <Card style={{ marginBottom: 12, padding: 14 }}>
          <View style={styles.chipsWrap}>
            {hp?.companyName && (
              <InfoChip icon="business-outline" label={hp.companyName} c={c} />
            )}
            {hp?.companySize && (
              <InfoChip icon="people-outline" label={hp.companySize} c={c} />
            )}
            {(user.city || user.country) && (
              <InfoChip
                icon="location-outline"
                label={[user.city, user.country].filter(Boolean).join(", ")}
                c={c}
              />
            )}
            {user.phone && (
              <InfoChip
                icon="call-outline"
                label={user.phone}
                onPress={() => Linking.openURL(`tel:${user.phone}`)}
                c={c}
              />
            )}
            {user.email && isOwn && (
              <InfoChip
                icon="mail-outline"
                label={user.email}
                onPress={() => Linking.openURL(`mailto:${user.email}`)}
                c={c}
              />
            )}
            {user.currency && (
              <InfoChip icon="globe-outline" label={user.currency} c={c} />
            )}
            {hp?.website && (
              <InfoChip
                icon="link-outline"
                label={hp.website.replace(/^https?:\/\//, "")}
                onPress={() =>
                  Linking.openURL(
                    hp.website.startsWith("http")
                      ? hp.website
                      : `https://${hp.website}`,
                  )
                }
                c={c}
              />
            )}
          </View>
        </Card>

        {/* ── TAB BAR ───────────────────────────────────────────────────── */}
        <View style={[styles.tabBar, { borderBottomColor: c.border }]}>
          {tabs.map((t_) => (
            <Pressable
              key={t_.key}
              onPress={() => setTab(t_.key)}
              style={[
                styles.tabBtn,
                tab === t_.key && {
                  borderBottomColor: c.orange,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <AppText
                variant="body"
                weight={tab === t_.key ? "semibold" : "regular"}
                style={{ color: tab === t_.key ? c.orange : c.textMuted }}
              >
                {t_.label}
              </AppText>
            </Pressable>
          ))}
        </View>

        {/* ════════════ ABOUT TAB ════════════ */}
        {tab === "about" && (
          <View style={{ paddingTop: 14, gap: 12 }}>
            {/* Bio */}
            {user.bio ? (
              <Card padded>
                <AppText
                  variant="small"
                  weight="semibold"
                  tone="dim"
                  style={styles.sectionLabel}
                >
                  {t("profile.tabAbout").toUpperCase()}
                </AppText>
                <AppText
                  variant="body"
                  style={{ marginTop: 8, lineHeight: 22 }}
                >
                  {user.bio}
                </AppText>
              </Card>
            ) : (
              <Card padded style={styles.emptyCard}>
                <AppText variant="body" tone="dim">
                  {t("profile.noBio")}
                </AppText>
                {isOwn && (
                  <Pressable
                    onPress={() => navigation.navigate("Settings")}
                    style={[
                      styles.emptyBtn,
                      { backgroundColor: c.orangeDim, borderColor: c.orange },
                    ]}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={13}
                      color={c.orange}
                      style={{ marginRight: 6 }}
                    />
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.orange }}
                    >
                      {t("profile.addBio")}
                    </AppText>
                  </Pressable>
                )}
              </Card>
            )}

            {/* Specialities (worker) */}
            {wp?.categories?.length > 0 && (
              <Card padded>
                <AppText
                  variant="small"
                  weight="semibold"
                  tone="dim"
                  style={styles.sectionLabel}
                >
                  {t("profile.specialities").toUpperCase()}
                </AppText>
                <View style={styles.chipsWrap}>
                  {wp.categories.map((cat) => (
                    <View
                      key={cat.id}
                      style={[
                        styles.catPill,
                        { backgroundColor: c.orangeDim, borderColor: c.orange },
                      ]}
                    >
                      <AppText
                        variant="small"
                        weight="semibold"
                        style={{ color: c.orange }}
                      >
                        {cat.category?.name ?? cat.name}
                      </AppText>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* Verification badges */}
            <Card padded>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Badge
                  icon={
                    user.isEmailVerified ? "checkmark-circle" : "close-circle"
                  }
                  label={t("profile.emailVerified")}
                  color={user.isEmailVerified ? "#22c55e" : "#ef4444"}
                  bg={
                    user.isEmailVerified
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(239,68,68,0.1)"
                  }
                />
                {wp?.verificationStatus === "VERIFIED" && (
                  <Badge
                    icon="shield-checkmark"
                    label={t("profile.idVerified")}
                    color="#f97316"
                    bg="rgba(249,115,22,0.12)"
                  />
                )}
                {wp?.backgroundCheck && (
                  <Badge
                    icon="ribbon"
                    label={t("profile.backgroundChecked")}
                    color="#3b82f6"
                    bg="rgba(59,130,246,0.1)"
                  />
                )}
              </View>
            </Card>
          </View>
        )}

        {/* ════════════ REVIEWS TAB ════════════ */}
        {tab === "reviews" && (
          <View style={{ paddingTop: 14 }}>
            {reviewsLoading ? (
              <View style={styles.center}>
                <ActivityIndicator color={c.orange} />
              </View>
            ) : reviews.length === 0 ? (
              <Card padded style={styles.emptyCard}>
                <Ionicons name="star-outline" size={28} color={c.textMuted} />
                <AppText variant="body" tone="dim" style={{ marginTop: 8 }}>
                  {t("profile.noReviews")}
                </AppText>
              </Card>
            ) : (
              <>
                {/* Summary bar */}
                <Card padded style={{ marginBottom: 12 }}>
                  <View style={styles.reviewSummary}>
                    <AppText
                      variant="display"
                      weight="displayBlack"
                      style={{ color: c.orange, fontSize: 40 }}
                    >
                      {Number(
                        reviewsAvg ||
                          reviews.reduce((a, r) => a + r.rating, 0) /
                            reviews.length,
                      ).toFixed(1)}
                    </AppText>
                    <View style={{ marginLeft: 12 }}>
                      <Stars
                        rating={
                          reviewsAvg ||
                          reviews.reduce((a, r) => a + r.rating, 0) /
                            reviews.length
                        }
                        size={18}
                        c={c}
                      />
                      <AppText
                        variant="small"
                        tone="dim"
                        style={{ marginTop: 4 }}
                      >
                        {reviewsTotal}{" "}
                        {reviewsTotal === 1
                          ? t("profile.review")
                          : t("profile.reviews")}
                      </AppText>
                    </View>
                  </View>
                </Card>

                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} c={c} />
                ))}
              </>
            )}
          </View>
        )}

        {/* Book button for non-owner viewing a worker */}
        {!isOwn && user.role === "WORKER" && (
          <Pressable
            onPress={() =>
              navigation.navigate("BookingDetail", { workerId: user.id })
            }
            style={[styles.bookBtn, { backgroundColor: c.orange }]}
          >
            <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
              {t("profile.book")} {user.firstName}
            </AppText>
            <Ionicons
              name="chevron-forward"
              size={18}
              color="#fff"
              style={{ marginLeft: 6 }}
            />
          </Pressable>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </AppScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  scroll: { paddingBottom: 24 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },

  // Hero
  heroCard: {
    marginBottom: 12,
    overflow: "hidden",
    padding: 0,
    paddingBottom: 24,
  },
  heroBg: { height: 80, width: "100%", marginBottom: 0 },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: "center",
    marginTop: -44,
    overflow: "hidden",
    position: "relative",
  },
  avatar: { width: "100%", height: "100%", borderRadius: 44 },
  avatarFallback: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  heroInfo: {
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 6,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  statCell: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRightWidth: StyleSheet.hairlineWidth,
    minWidth: 90,
  },

  // Chips
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Tabs
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 0,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  // Sections
  sectionLabel: { letterSpacing: 0.8 },
  emptyCard: { alignItems: "center", paddingVertical: 24 },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  // Reviews
  reviewSummary: { flexDirection: "row", alignItems: "center" },
  reviewTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  reviewAvatarImg: { width: "100%", height: "100%" },
  reviewQuote: { borderLeftWidth: 3, paddingLeft: 10, marginTop: 4 },

  // Book button
  bookBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
  },
  backPill: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
