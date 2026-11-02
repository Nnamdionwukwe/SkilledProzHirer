// src/screens/main/ProfileScreen.js
//
// Verbatim port of pages/users/UserProfile.jsx.
// Fetch: GET /users/:id  (matches web's api.get(`/users/${profileId}`))
// Fonts: Syne_800ExtraBold for display, DMSans_* for body — same as web.
// Layout: matches web's 860px / 480px breakpoints exactly.

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import CertMediaViewer from "../../components/CertMediaViewer";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { useSubscription } from "../../contexts/SubscriptionContext";
import client from "../../api/client";
import {
  FaStar,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaDollarSign,
  FaClock,
  FaCalendarAlt,
  FaBuilding,
  FaUsers,
  FaPhone,
  FaEnvelope,
  FaGlobe,
  FaCamera,
  FaEdit,
  FaShieldAlt,
  FaAward,
  FaImage,
  FaFileText,
  FaChevronRight,
  FaTimes,
  FaExpand,
  FaLock,
  FaPencil,
  FaSettings,
  FaBolt,
  FaBriefcase,
  FaHardHat,
  FaAlertCircle,
  FaMaximize2,
  FaSparkles,
  FaCheckCircle2,
  FaShieldCheck,
  FaExternalLinkAlt,
} from "../../icons/fa";

const TABS = {
  WORKER: ["About", "Portfolio", "Certifications", "Reviews"],
  HIRER: ["About", "Reviews"],
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Font constants — these match the web's Syne + DM Sans stacks
const FONT_DISPLAY = "Syne_800ExtraBold";
const FONT_BODY_MED = "DMSans_500Medium";
const FONT_BODY_BOLD = "DMSans_700Bold";
const FONT_BODY_REG = "DMSans_400Regular";

function initials(u) {
  if (!u) return "??";
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

function timeAgo(date) {
  if (!date) return "Never";
  const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

function Stars({ rating = 0, max = 5, c }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <FaStar
          key={i}
          size={12}
          color={i < Math.round(rating) ? c.orange : c.textMuted}
        />
      ))}
    </View>
  );
}

function ProBadge({ isEnterprise, isProTier, c }) {
  if (isEnterprise) {
    return (
      <View style={[styles.proBadge, { backgroundColor: "#7c3aed" }]}>
        <FaSparkles size={9} color="#fff" />
        <AppText style={styles.proTextWhite}>ENTERPRISE</AppText>
      </View>
    );
  }
  if (isProTier) {
    return (
      <View style={[styles.proBadge, { backgroundColor: c.orange }]}>
        <FaSparkles size={9} color={c.bg} />
        <AppText style={[styles.proTextWhite, { color: c.bg }]}>PRO</AppText>
      </View>
    );
  }
  return null;
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user: me, updateUser } = useAuthStore();
  const { isEnterprise, isProTier } = useSubscription();
  const c = theme.colors;
  const { width } = useWindowDimensions();
  const isWide = width >= 860;

  const [user, setUser] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [tab, setTab] = useState("About");
  const [uploading, setUploading] = useState(false);

  const [avatarLightbox, setAvatarLightbox] = useState(false);
  const [certMedia, setCertMedia] = useState(null);
  const [portfolioLightbox, setPortfolioLightbox] = useState(null);

  const isWorker = user?.role === "WORKER";
  const wp = user?.workerProfile;
  const hp = user?.hirerProfile;

  // ── Fetch the FULL user — GET /users/:id (same endpoint as web) ──
  useFocusEffect(
    useCallback(() => {
      const id = me?.id;
      if (!id) return;
      let cancelled = false;
      client
        .get(`/users/${id}`)
        .then((res) => {
          if (cancelled) return;
          setUser(res.data.data.user);
          updateUser?.(res.data.data.user);
        })
        .catch(() => {
          if (!cancelled && me) setUser(me);
        })
        .finally(() => {
          if (!cancelled) setInitialLoading(false);
        });
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [me?.id]),
  );

  const handleAvatarChange = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    const uri = res.assets[0].uri;
    const form = new FormData();
    form.append("avatar", { uri, name: "avatar.jpg", type: "image/jpeg" });
    setUploading(true);
    try {
      const { data } = await client.put("/users/me/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const newAvatar = data.data.user.avatar;
      setUser((u) => ({ ...u, avatar: newAvatar }));
      updateUser?.({ avatar: newAvatar });
    } catch {
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    if (tab !== "Reviews" || !user?.id) return;
    setReviewsLoading(true);
    const endpoint = isWorker
      ? `/reviews/worker/${user.id}`
      : `/reviews/hirer/${user.id}`;
    client
      .get(endpoint, { params: { limit: 20 } })
      .then((res) => setReviews(res.data.data.reviews || []))
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [tab, user?.id, isWorker]);

  if (initialLoading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }
  if (!user) return null;

  const tabs = TABS[user.role] ?? ["About"];

  const handleCall = () => user.phone && Linking.openURL(`tel:${user.phone}`);
  const handleEmail = () =>
    user.email && Linking.openURL(`mailto:${user.email}`);
  const handleWebsite = () => {
    if (!hp?.website) return;
    const url = hp.website.startsWith("http")
      ? hp.website
      : `https://${hp.website}`;
    Linking.openURL(url);
  };

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={isWide ? styles.layoutWide : styles.layout}>
        {/* ════════ SIDEBAR ════════ */}
        <View style={[styles.sidebar, isWide && styles.sidebarWide]}>
          {/* Hero card */}
          <View
            style={[
              styles.heroCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View
              style={[
                styles.heroBg,
                { backgroundColor: c.orangeDim, opacity: 0.6 },
              ]}
            />

            <View style={styles.avatarWrap}>
              <Pressable
                onPress={() => user.avatar && setAvatarLightbox(true)}
                disabled={!user.avatar}
              >
                {user.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarFallback,
                      {
                        backgroundColor: c.orangeDim,
                        borderColor: c.orangeGlow,
                      },
                    ]}
                  >
                    <AppText
                      style={[styles.avatarInitials, { color: c.orange }]}
                    >
                      {initials(user)}
                    </AppText>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={handleAvatarChange}
                disabled={uploading}
                style={[
                  styles.avatarBadge,
                  { backgroundColor: c.orange, borderColor: c.bgPanel },
                ]}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color={c.bg} />
                ) : (
                  <FaCamera size={12} color={c.bg} />
                )}
              </Pressable>
            </View>

            <View style={styles.heroNameRow}>
              <AppText
                style={[styles.heroName, { color: c.text }]}
                numberOfLines={2}
              >
                {user.firstName} {user.lastName}
              </AppText>
              {(wp?.verificationStatus ?? hp?.verificationStatus) ===
                "VERIFIED" && <FaShieldAlt size={14} color={c.orange} />}
            </View>

            <ProBadge isEnterprise={isEnterprise} isProTier={isProTier} c={c} />

            {(wp?.verificationStatus ?? hp?.verificationStatus) ===
              "VERIFIED" && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: c.greenDim, borderColor: c.green },
                ]}
              >
                <FaShieldAlt size={9} color={c.green} />
                <AppText
                  style={{ color: c.green, fontSize: 10, marginLeft: 4 }}
                >
                  {isWorker ? "Verified Worker" : "Verified Hirer"}
                </AppText>
              </View>
            )}
            {wp?.backgroundCheck === true && (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: "rgba(59,130,246,0.12)",
                    borderColor: "#60a5fa",
                  },
                ]}
              >
                <FaAward size={9} color="#60a5fa" />
                <AppText
                  style={{ color: "#60a5fa", fontSize: 10, marginLeft: 4 }}
                >
                  Background Checked
                </AppText>
              </View>
            )}

            <View
              style={[
                styles.rolePill,
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              {isWorker ? (
                <FaHardHat size={11} color={c.orange} />
              ) : (
                <FaBriefcase size={11} color={c.orange} />
              )}
              <AppText style={[styles.rolePillText, { color: c.orange }]}>
                {isWorker ? "Worker" : "Hirer"}
              </AppText>
            </View>

            {wp?.title ? (
              <AppText
                style={{ fontSize: 12, color: c.textDim, fontStyle: "italic" }}
              >
                {wp.title}
              </AppText>
            ) : null}

            {wp?.avgRating > 0 ? (
              <View style={styles.ratingRow}>
                <Stars rating={wp.avgRating} c={c} />
                <AppText
                  style={{ fontSize: 13, fontWeight: "800", color: c.text }}
                >
                  {Number(wp.avgRating).toFixed(1)}
                </AppText>
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  ({wp.totalReviews ?? 0} reviews)
                </AppText>
              </View>
            ) : null}

            <Pressable
              onPress={() => navigation.navigate("Settings")}
              style={[
                styles.editBtn,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaSettings size={12} color={c.textDim} />
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 6,
                }}
              >
                Settings
              </AppText>
            </Pressable>
          </View>

          {/* STATS STRIP */}
          <View
            style={[
              styles.statsWrap,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              style={{ flexGrow: 0 }}
            >
              {wp ? (
                <>
                  <Stat
                    icon={<FaDollarSign size={14} color={c.orange} />}
                    value={`${wp.currency ?? user.currency ?? "USD"} ${Number(wp.hourlyRate ?? 0).toLocaleString()}`}
                    label="/hr"
                    c={c}
                  />
                  <Stat
                    icon={<FaCheckCircle size={14} color={c.orange} />}
                    value={`${wp.completedJobs ?? 0}`}
                    label="jobs done"
                    c={c}
                  />
                  <Stat
                    icon={<FaBolt size={14} color={c.orange} />}
                    value={`${wp.responseRate ?? 0}%`}
                    label="response"
                    c={c}
                  />
                  {wp.serviceRadius ? (
                    <Stat
                      icon={<FaMapMarkerAlt size={14} color={c.orange} />}
                      value={`${wp.serviceRadius} km`}
                      label="radius"
                      c={c}
                    />
                  ) : null}
                </>
              ) : null}

              {user.role === "HIRER" && user.hirerStats ? (
                <>
                  <Stat
                    icon={<FaBriefcase size={14} color={c.orange} />}
                    value={`${user.hirerStats.totalHires}`}
                    label="hires"
                    c={c}
                  />
                  <Stat
                    icon={<FaDollarSign size={14} color={c.orange} />}
                    value={`${user.currency ?? "USD"} ${Number(user.hirerStats.totalSpent).toLocaleString()}`}
                    label="spent"
                    c={c}
                  />
                  {user.hirerStats.avgRating > 0 ? (
                    <Stat
                      icon={<FaStar size={14} color={c.orange} />}
                      value={`${Number(user.hirerStats.avgRating).toFixed(1)}`}
                      label={`(${user.hirerStats.totalReviews})`}
                      c={c}
                    />
                  ) : null}
                </>
              ) : null}

              <Stat
                icon={<FaClock size={14} color={c.orange} />}
                value={timeAgo(user.lastSeen)}
                label="last seen"
                c={c}
              />
              <Stat
                icon={<FaCalendarAlt size={14} color={c.orange} />}
                value={new Date(user.createdAt).toLocaleDateString("en", {
                  month: "short",
                  year: "numeric",
                })}
                label="joined"
                c={c}
              />
            </ScrollView>
          </View>

          {/* INFO PILLS */}
          <View
            style={[
              styles.infoCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            {hp?.companyName ? (
              <InfoPill
                icon={<FaBuilding size={12} color={c.textDim} />}
                text={hp.companyName}
                c={c}
              />
            ) : null}
            {hp?.companySize ? (
              <InfoPill
                icon={<FaUsers size={12} color={c.textDim} />}
                text={`${hp.companySize} employees`}
                c={c}
              />
            ) : null}
            {user.city || user.country ? (
              <InfoPill
                icon={<FaMapMarkerAlt size={12} color={c.textDim} />}
                text={[user.city, user.country].filter(Boolean).join(", ")}
                c={c}
              />
            ) : null}
            {user.phone ? (
              <Pressable
                onPress={handleCall}
                style={[
                  styles.infoPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaPhone size={12} color={c.orange} />
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.orange,
                    marginLeft: 5,
                    textDecorationLine: "underline",
                  }}
                >
                  {user.phone}
                </AppText>
              </Pressable>
            ) : null}
            {user.email ? (
              <Pressable
                onPress={handleEmail}
                style={[
                  styles.infoPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaEnvelope size={12} color={c.orange} />
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.orange,
                    marginLeft: 5,
                    textDecorationLine: "underline",
                  }}
                  numberOfLines={1}
                >
                  {user.email}
                </AppText>
              </Pressable>
            ) : null}
            {user.currency ? (
              <InfoPill
                icon={<FaGlobe size={12} color={c.textDim} />}
                text={user.currency}
                c={c}
              />
            ) : null}
            {hp?.website ? (
              <Pressable
                onPress={handleWebsite}
                style={[
                  styles.infoPill,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <FaGlobe size={12} color={c.orange} />
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.orange,
                    marginLeft: 5,
                    textDecorationLine: "underline",
                  }}
                  numberOfLines={1}
                >
                  {hp.website.replace(/^https?:\/\//, "")}
                </AppText>
              </Pressable>
            ) : null}
          </View>

          {/* Categories */}
          {wp?.categories?.length > 0 ? (
            <View
              style={[
                styles.catCard,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <AppText style={styles.cardLabel(c)}>Specialities</AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {wp.categories.map((cat) => (
                  <View
                    key={cat.id}
                    style={[
                      styles.catPill,
                      { backgroundColor: c.bgCard, borderColor: c.border },
                    ]}
                  >
                    <AppText style={{ fontSize: 11, color: c.textDim }}>
                      {cat.category?.name ?? cat.name}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* ════════ MAIN ════════ */}
        <View style={[styles.main, isWide && styles.mainWide]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.tabBar, { borderBottomColor: c.border }]}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {tabs.map((t) => {
              const active = tab === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setTab(t)}
                  style={[
                    styles.tabBtn,
                    { borderBottomColor: active ? c.orange : "transparent" },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: active ? "700" : "500",
                      color: active ? c.orange : c.textMuted,
                    }}
                  >
                    {t}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ABOUT */}
          {tab === "About" && (
            <View style={{ gap: 12 }}>
              {user.bio ? (
                <View
                  style={[
                    styles.bioCard,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  <AppText style={styles.cardLabel(c)}>About</AppText>
                  <AppText
                    style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}
                  >
                    {user.bio}
                  </AppText>
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 13,
                      color: c.textMuted,
                      textAlign: "center",
                    }}
                  >
                    Add a bio to tell people about yourself.
                  </AppText>
                  <Pressable
                    onPress={() => navigation.navigate("EditProfile")}
                    style={[styles.smallBtn, { backgroundColor: c.orangeDim }]}
                  >
                    <FaPencil size={11} color={c.orange} />
                    <AppText
                      style={{ fontSize: 12, color: c.orange, marginLeft: 6 }}
                    >
                      Add bio
                    </AppText>
                  </Pressable>
                </View>
              )}

              {wp?.availability ? (
                <View
                  style={[
                    styles.availCard,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  <AppText style={styles.cardLabel(c)}>Availability</AppText>
                  <View
                    style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}
                  >
                    {WEEK_DAYS.map((d) => {
                      const active = wp.availability?.includes(d);
                      return (
                        <View
                          key={d}
                          style={[
                            styles.dayPill,
                            {
                              backgroundColor: active ? c.orangeDim : c.bgInput,
                              borderColor: active ? c.orangeGlow : c.border,
                            },
                          ]}
                        >
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: active ? c.orange : c.textMuted,
                            }}
                          >
                            {d}
                          </AppText>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                <Badge
                  icon={<FaCheckCircle size={11} color={c.green} />}
                  text={`Email ${user.isEmailVerified ? "Verified" : "Unverified"}`}
                  color={user.isEmailVerified ? c.green : c.textMuted}
                  bg={user.isEmailVerified ? c.greenDim : c.bgCard}
                  c={c}
                />
                {(wp?.verificationStatus ?? hp?.verificationStatus) ===
                "VERIFIED" ? (
                  <Badge
                    icon={<FaShieldAlt size={11} color={c.orange} />}
                    text="ID Verified"
                    color={c.orange}
                    bg={c.orangeDim}
                    c={c}
                  />
                ) : null}
                {wp?.backgroundCheck === true ? (
                  <Badge
                    icon={<FaAward size={11} color="#60a5fa" />}
                    text="Background Checked"
                    color="#60a5fa"
                    bg="rgba(59,130,246,0.1)"
                    c={c}
                  />
                ) : null}
              </View>
            </View>
          )}

          {/* PORTFOLIO */}
          {tab === "Portfolio" && (
            <View>
              {wp?.portfolio?.length > 0 ? (
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
                >
                  {wp.portfolio.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() =>
                        setPortfolioLightbox({
                          img: item.imageUrl,
                          title: item.title,
                        })
                      }
                      style={({ pressed }) => [
                        styles.portfolioCard,
                        {
                          backgroundColor: c.bgPanel,
                          borderColor: c.border,
                          opacity: pressed ? 0.9 : 1,
                          width: isWide ? "31%" : "48%",
                        },
                      ]}
                    >
                      {item.imageUrl ? (
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.portfolioImg}
                        />
                      ) : (
                        <View
                          style={[
                            styles.portfolioPlaceholder,
                            { backgroundColor: c.bgInput },
                          ]}
                        >
                          <FaImage size={22} color={c.textMuted} />
                        </View>
                      )}
                      <View style={{ padding: 10 }}>
                        <AppText
                          style={{
                            fontSize: 12,
                            fontWeight: "700",
                            color: c.text,
                          }}
                          numberOfLines={1}
                        >
                          {item.title}
                        </AppText>
                      </View>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  <FaImage size={28} color={c.textMuted} />
                  <AppText
                    style={{ fontSize: 13, color: c.textMuted, marginTop: 8 }}
                  >
                    Upload your best work to attract clients.
                  </AppText>
                </View>
              )}
            </View>
          )}

          {/* CERTIFICATIONS */}
          {tab === "Certifications" && (
            <View style={{ gap: 10 }}>
              {wp?.certifications?.length > 0 ? (
                wp.certifications.map((cert) => (
                  <Pressable
                    key={cert.id}
                    onPress={() =>
                      cert.documentUrl &&
                      setCertMedia({
                        src: cert.documentUrl,
                        title: cert.name || "Certification",
                      })
                    }
                    style={({ pressed }) => [
                      styles.certCard,
                      {
                        backgroundColor: c.bgPanel,
                        borderColor: c.border,
                        opacity: pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.certIcon,
                        {
                          backgroundColor: c.orangeDim,
                          borderColor: c.orangeGlow,
                        },
                      ]}
                    >
                      <FaAward size={16} color={c.orange} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: c.text,
                        }}
                        numberOfLines={2}
                      >
                        {cert.name}
                      </AppText>
                      {cert.issuer ? (
                        <AppText
                          style={{
                            fontSize: 11,
                            color: c.textDim,
                            marginTop: 2,
                          }}
                        >
                          Issued by {cert.issuer}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      {cert.verified ? (
                        <Badge
                          icon={<FaCheckCircle size={9} color={c.green} />}
                          text="Verified"
                          color={c.green}
                          bg={c.greenDim}
                          c={c}
                        />
                      ) : cert.rejectionReason ? (
                        <Badge
                          icon={<FaAlertCircle size={9} color={c.red} />}
                          text="Rejected"
                          color={c.red}
                          bg={c.redDim}
                          c={c}
                        />
                      ) : (
                        <Badge
                          icon={<FaClock size={9} color="#eab308" />}
                          text="Pending"
                          color="#eab308"
                          bg="rgba(234,179,8,0.12)"
                          c={c}
                        />
                      )}
                    </View>
                  </Pressable>
                ))
              ) : (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  <FaAward size={28} color={c.textMuted} />
                  <AppText
                    style={{ fontSize: 13, color: c.textMuted, marginTop: 8 }}
                  >
                    Add certifications to build trust with clients.
                  </AppText>
                </View>
              )}
            </View>
          )}

          {/* REVIEWS */}
          {tab === "Reviews" && (
            <View style={{ gap: 10 }}>
              {reviewsLoading ? (
                <>
                  <View
                    style={[
                      styles.reviewSummary,
                      { backgroundColor: c.bgPanel, borderColor: c.border },
                    ]}
                  >
                    <View
                      style={{
                        width: 60,
                        height: 28,
                        borderRadius: 6,
                        backgroundColor: c.bgCard,
                        opacity: 0.5,
                      }}
                    />
                    <View
                      style={{
                        width: 80,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: c.bgCard,
                        opacity: 0.5,
                      }}
                    />
                  </View>
                  {[1, 2, 3].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.reviewCard,
                        { backgroundColor: c.bgPanel, borderColor: c.border },
                      ]}
                    >
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: c.bgCard,
                            opacity: 0.5,
                          }}
                        />
                        <View style={{ flex: 1, gap: 6 }}>
                          <View
                            style={{
                              width: "50%",
                              height: 12,
                              borderRadius: 6,
                              backgroundColor: c.bgCard,
                              opacity: 0.5,
                            }}
                          />
                          <View
                            style={{
                              width: "30%",
                              height: 10,
                              borderRadius: 6,
                              backgroundColor: c.bgCard,
                              opacity: 0.5,
                            }}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              ) : reviews.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: c.bgPanel, borderColor: c.border },
                  ]}
                >
                  <FaStar size={28} color={c.textMuted} />
                  <AppText
                    style={{ fontSize: 13, color: c.textMuted, marginTop: 8 }}
                  >
                    No reviews yet.
                  </AppText>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      styles.reviewSummary,
                      { backgroundColor: c.bgPanel, borderColor: c.border },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AppText
                        style={{
                          fontFamily: FONT_DISPLAY,
                          fontSize: 28,
                          fontWeight: "800",
                          color: c.orange,
                        }}
                      >
                        {(
                          reviews.reduce((a, r) => a + r.rating, 0) /
                          reviews.length
                        ).toFixed(1)}
                      </AppText>
                      <Stars
                        rating={
                          reviews.reduce((a, r) => a + r.rating, 0) /
                          reviews.length
                        }
                        c={c}
                      />
                    </View>
                    <AppText style={{ fontSize: 11, color: c.textMuted }}>
                      {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                    </AppText>
                  </View>

                  {reviews.map((r) => (
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
                          {r.giver?.avatar ? (
                            <Image
                              source={{ uri: r.giver.avatar }}
                              style={{ width: "100%", height: "100%" }}
                            />
                          ) : (
                            <AppText style={{ fontSize: 10, color: c.orange }}>
                              {r.giver?.firstName?.[0]}
                              {r.giver?.lastName?.[0]}
                            </AppText>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText
                            style={{
                              fontSize: 12,
                              fontWeight: "700",
                              color: c.text,
                            }}
                            numberOfLines={1}
                          >
                            {r.giver?.firstName} {r.giver?.lastName}
                            <AppText
                              style={{
                                fontSize: 10,
                                color: c.textMuted,
                                fontWeight: "400",
                              }}
                            >
                              {" "}
                              · {r.giver?.role === "HIRER" ? "Hirer" : "Worker"}
                            </AppText>
                          </AppText>
                          <AppText
                            style={{
                              fontSize: 10,
                              color: c.textMuted,
                              marginTop: 2,
                            }}
                          >
                            {new Date(r.createdAt).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </AppText>
                        </View>
                        <Stars rating={r.rating} c={c} />
                      </View>
                      {r.comment ? (
                        <AppText
                          style={{
                            fontSize: 12,
                            color: c.textDim,
                            fontStyle: "italic",
                            lineHeight: 18,
                            marginTop: 8,
                            paddingLeft: 10,
                            borderLeftWidth: 2,
                            borderLeftColor: c.orangeGlow,
                          }}
                        >
                          "{r.comment}"
                        </AppText>
                      ) : null}
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Modals */}
      <Modal
        visible={avatarLightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarLightbox(false)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setAvatarLightbox(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 500, alignItems: "center" }}
          >
            <Pressable
              onPress={() => setAvatarLightbox(false)}
              style={styles.lightboxClose}
            >
              <FaTimes size={18} color="#fff" />
            </Pressable>
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={{ width: "100%", height: 400, borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!portfolioLightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setPortfolioLightbox(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setPortfolioLightbox(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 500, alignItems: "center" }}
          >
            <Pressable
              onPress={() => setPortfolioLightbox(null)}
              style={styles.lightboxClose}
            >
              <FaTimes size={18} color="#fff" />
            </Pressable>
            {portfolioLightbox?.img ? (
              <Image
                source={{ uri: portfolioLightbox.img }}
                style={{ width: "100%", height: 400, borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : null}
            {portfolioLightbox?.title ? (
              <AppText
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontSize: 14,
                  fontWeight: "700",
                  color: "#fff",
                  marginTop: 12,
                  textAlign: "center",
                }}
              >
                {portfolioLightbox.title}
              </AppText>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {certMedia ? (
        <CertMediaViewer
          src={certMedia.src}
          title={certMedia.title}
          onClose={() => setCertMedia(null)}
        />
      ) : null}
    </AppScreen>
  );
}

function Stat({ icon, value, label, c }) {
  return (
    <View style={styles.stat}>
      {icon}
      <AppText
        style={{ fontSize: 13, fontWeight: "700", color: c.text }}
        numberOfLines={1}
      >
        {value}
      </AppText>
      <AppText style={{ fontSize: 10, color: c.textMuted, marginLeft: 2 }}>
        {label}
      </AppText>
    </View>
  );
}

function InfoPill({ icon, text, c }) {
  return (
    <View
      style={[
        styles.infoPill,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {icon}
      <AppText
        style={{ fontSize: 11, color: c.textDim, marginLeft: 5 }}
        numberOfLines={1}
      >
        {text}
      </AppText>
    </View>
  );
}

function Badge({ icon, text, color, bg, c }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: color }]}>
      {icon}
      <AppText style={{ fontSize: 10, color, marginLeft: 4 }}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flexDirection: "column", gap: 12 },
  layoutWide: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
  sidebar: { gap: 12 },
  sidebarWide: { width: 300 },
  main: { gap: 12 },
  mainWide: { flex: 1 },

  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    position: "relative",
  },
  heroBg: { position: "absolute", top: 0, left: 0, right: 0, height: 70 },
  avatarWrap: { position: "relative" },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.12)",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 26, fontWeight: "800" },
  avatarBadge: {
    position: "absolute",
    right: -4,
    bottom: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  heroNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  heroName: {
    fontFamily: FONT_DISPLAY,
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  proTextWhite: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9,
    borderWidth: 1,
    width: "100%",
    marginTop: 6,
  },

  statsWrap: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },

  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "100%",
  },

  catCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  cardLabel: (c) => ({
    fontSize: 10,
    fontWeight: "700",
    color: c.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  }),
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  tabBar: { borderBottomWidth: 1, marginBottom: 12, flexGrow: 0 },
  tabBtn: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2 },

  bioCard: { borderRadius: 14, borderWidth: 1, padding: 16 },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 30,
    alignItems: "center",
    gap: 10,
  },
  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },

  availCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  dayPill: {
    width: 40,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },

  portfolioCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  portfolioImg: { width: "100%", height: 100 },
  portfolioPlaceholder: {
    width: "100%",
    height: 100,
    alignItems: "center",
    justifyContent: "center",
  },

  certCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  certIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  reviewSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  reviewTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
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

  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  lightboxClose: {
    position: "absolute",
    top: -40,
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
});
