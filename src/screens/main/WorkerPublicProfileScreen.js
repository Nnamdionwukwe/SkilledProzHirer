// src/screens/main/WorkerPublicProfileScreen.js
//
// i18n: all visible strings use t() under `workerProfile.*` (existing) or
// `workers.publicProfile.*` (new keys added to en.json).

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
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { WebView } from "react-native-webview";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import ReportButton from "../../components/ReportButton";
import VideoPlayerModal from "../../components/VideoPlayerModal";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import useSavedWorker from "../../hooks/useSavedWorker";
import {
  FaStar,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaBolt,
  FaPhone,
  FaEnvelope,
  FaUser,
  FaCommentDots,
  FaEdit,
  FaAward,
  FaCalendarAlt,
  FaShieldAlt,
  FaImage,
  FaFileAlt,
  FaChevronRight,
  FaLock,
  FaSearch,
  FaArrowLeft,
  FaBookmark,
  FaVideo,
  FaTimes,
  FaExpand,
  FaGlobe,
  FaClock,
} from "../../icons/fa";

const isPdfUrl = (url) => !!url && /\.pdf$/i.test(url.split("?")[0]);

const LANGUAGE_CODES = [
  "en",
  "fr",
  "ar",
  "yo",
  "ha",
  "ig",
  "sw",
  "pt",
  "es",
  "de",
  "zh",
  "hi",
  "bn",
  "ur",
  "tr",
  "ko",
  "ja",
  "ru",
  "id",
  "vi",
  "it",
  "nl",
  "pl",
  "fa",
  "am",
  "zu",
  "af",
  "so",
];

function timeAgo(date, t) {
  if (!date) return t("workers.publicProfile.dash");
  const diff = Date.now() - new Date(date).getTime();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return t("workers.publicProfile.timeToday");
  if (d < 30) return t("workers.publicProfile.timeDaysAgo", { count: d });
  const m = Math.floor(d / 30);
  if (m < 12) return t("workers.publicProfile.timeMonthsAgo", { count: m });
  return t("workers.publicProfile.timeYearsAgo", {
    count: Math.floor(m / 12),
  });
}

export default function WorkerPublicProfileScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { user: viewerUser } = useAuthStore();
  const c = theme.colors;

  const userId = route.params?.userId;

  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("about");
  const [avatarLightbox, setAvatarLightbox] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  const isOwnProfile = viewerUser?.id === userId;
  const isHirer = viewerUser?.role === "HIRER";
  const saved = useSavedWorker(userId, { enabled: isHirer && !isOwnProfile });

  const languageName = (code) => {
    if (!code) return "";
    const key = `workers.publicProfile.language.${code}`;
    const val = t(key, { defaultValue: code });
    return val === key ? code : val;
  };

  const openChatWithWorker = useCallback(async () => {
    if (!userId || openingChat) return;
    setOpeningChat(true);
    try {
      const res = await client.get("/messages/conversations", {
        params: { page: 1, limit: 100, _t: Date.now() },
      });
      const convos = res.data?.data?.conversations || [];
      const peerIdStr = String(userId);
      const myIdStr = String(viewerUser?.id || "");
      const existing = convos.find((convo) => {
        const usersArr = convo.users || [];
        const other = usersArr.find((u) => {
          const uid = String(u.userId || u.user?.id || u.id);
          return uid !== myIdStr;
        });
        const otherId = other
          ? String(other.userId || other.user?.id || other.id)
          : null;
        if (otherId === peerIdStr) return true;
        const last = convo.messages?.[0] ?? convo.lastMessage;
        if (last?.senderId === peerIdStr || last?.receiverId === peerIdStr)
          return true;
        return false;
      });

      if (existing?.id) {
        navigation.navigate("Chat", {
          conversationId: existing.id,
          withUserId: userId,
        });
      } else {
        navigation.navigate("Chat", { withUserId: userId });
      }
    } catch {
      navigation.navigate("Chat", { withUserId: userId });
    } finally {
      setOpeningChat(false);
    }
  }, [userId, viewerUser?.id, openingChat, navigation]);

  useEffect(() => {
    if (!userId) {
      setError(t("workers.publicProfile.notFound"));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    Promise.all([
      client.get(`/workers/${userId}`),
      client
        .get(`/reviews/worker/${userId}`, { params: { limit: 10 } })
        .catch(() => ({ data: { data: { reviews: [] } } })),
    ])
      .then(([wRes, rRes]) => {
        setWorker(wRes.data.data.worker);
        setReviews(rRes.data.data.reviews || []);
      })
      .catch((e) => {
        setError(
          e.response?.data?.message || t("workers.publicProfile.notFound"),
        );
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="detail" />
      </AppScreen>
    );
  }

  if (error || !worker) {
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
            {isPrivate
              ? t("workers.publicProfile.privateProfile")
              : t("workers.publicProfile.notFound")}
          </AppText>
          <AppText style={styles.errorSub(c)}>
            {error || t("workers.publicProfile.notFoundSub")}
          </AppText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: c.border, marginTop: 20 }]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
              {t("workers.publicProfile.backToSearch")}
            </AppText>
          </Pressable>
        </View>
      </AppScreen>
    );
  }

  const { user, categories, portfolio, certifications, availability } = worker;
  const hasVideo = !!worker.videoIntroUrl;
  const isVerified = worker.verificationStatus === "VERIFIED";

  const hasMultiRate =
    worker.dailyRate > 0 ||
    worker.weeklyRate > 0 ||
    worker.monthlyRate > 0 ||
    worker.yearlyRate > 0 ||
    worker.customRate > 0;

  const tabs = [
    { key: "about", label: t("workers.publicProfile.tabAbout") },
    {
      key: "portfolio",
      label: t("workers.publicProfile.tabPortfolio"),
      count: portfolio.length,
    },
    ...(hasVideo
      ? [{ key: "video", label: t("workers.publicProfile.tabVideo") }]
      : []),
    {
      key: "certifications",
      label: t("workers.publicProfile.tabCertifications"),
      count: certifications.length,
    },
    {
      key: "availability",
      label: t("workers.publicProfile.tabAvailability"),
    },
    {
      key: "reviews",
      label: t("workers.publicProfile.tabReviews"),
      count: worker.totalReviews,
    },
  ];

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      <Pressable onPress={() => navigation.goBack()} style={styles.topBack}>
        <FaArrowLeft size={12} color={c.textDim} />
        <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
          {t("workers.publicProfile.back")}
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
          <Pressable
            onPress={() => user?.avatar && setAvatarLightbox(user.avatar)}
            disabled={!user?.avatar}
            style={[
              styles.avatarWrap,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            {user?.avatar ? (
              <>
                <Image source={{ uri: user.avatar }} style={styles.avatarImg} />
                <View
                  style={[
                    styles.avatarExpand,
                    { backgroundColor: c.orange, borderColor: c.bgPanel },
                  ]}
                >
                  <FaExpand size={8} color="#fff" />
                </View>
              </>
            ) : (
              <AppText style={styles.avatarFallbackText(c)}>
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </AppText>
            )}
          </Pressable>

          <View style={styles.heroInfo}>
            <View style={styles.nameRow}>
              <AppText style={styles.heroName(c)} numberOfLines={2}>
                {user?.firstName} {user?.lastName}
              </AppText>
              {isVerified ? <FaShieldAlt size={16} color={c.orange} /> : null}
            </View>
            {worker.title ? (
              <AppText style={styles.heroTitleText(c)}>{worker.title}</AppText>
            ) : null}
            <View style={styles.availRow}>
              <View
                style={[
                  styles.availDot,
                  {
                    backgroundColor: worker.isAvailable ? c.green : c.textMuted,
                  },
                ]}
              />
              <AppText
                style={[
                  styles.availText,
                  { color: worker.isAvailable ? c.green : c.textMuted },
                ]}
              >
                {worker.isAvailable
                  ? t("workerProfile.available")
                  : t("workerProfile.unavailable")}
              </AppText>
            </View>
          </View>
        </View>

        {categories?.length > 0 ? (
          <View style={styles.catRow}>
            {categories.slice(0, 4).map((wc) => (
              <View
                key={wc.id}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: wc.isPrimary ? c.orangeDim : c.bgCard,
                    borderColor: wc.isPrimary ? c.orangeGlow : c.border,
                  },
                ]}
              >
                {wc.category.icon ? (
                  <AppText style={{ fontSize: 11 }}>{wc.category.icon}</AppText>
                ) : null}
                <AppText
                  style={[
                    styles.catText,
                    { color: wc.isPrimary ? c.orange : c.textDim },
                  ]}
                  numberOfLines={1}
                >
                  {wc.category.name}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── STATS ── */}
        <View style={[styles.statsRow, { borderTopColor: c.border }]}>
          <StatItem
            icon={<FaStar size={12} color={c.orange} />}
            value={
              worker.avgRating > 0
                ? worker.avgRating.toFixed(1)
                : t("workers.publicProfile.new")
            }
            label={t("workers.publicProfile.reviewCount", {
              count: worker.totalReviews,
            })}
            c={c}
          />
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <StatItem
            icon={<FaCheckCircle size={12} color={c.orange} />}
            value={worker.completedJobs}
            label={t("workers.publicProfile.jobsDone")}
            c={c}
          />
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <StatItem
            icon={<FaBolt size={12} color={c.orange} />}
            value={`${worker.responseRate}%`}
            label={t("workers.publicProfile.response")}
            c={c}
          />
          {user?.lastSeen ? (
            <>
              <View
                style={[styles.statDivider, { backgroundColor: c.border }]}
              />
              <StatItem
                icon={<FaClock size={12} color={c.orange} />}
                value={timeAgo(user.lastSeen, t)}
                label={t("workers.publicProfile.lastSeen")}
                c={c}
              />
            </>
          ) : null}
        </View>

        {/* ── CONTACT CHIPS ── */}
        <View style={styles.contactRow}>
          {user?.phone ? (
            <Pressable
              onPress={() =>
                Linking.openURL(`tel:${user.phone.replace(/\s+/g, "")}`)
              }
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaPhone size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)}>{user.phone}</AppText>
            </Pressable>
          ) : null}
          {user?.email ? (
            <Pressable
              onPress={() => Linking.openURL(`mailto:${user.email}`)}
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaEnvelope size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)} numberOfLines={1}>
                {user.email}
              </AppText>
            </Pressable>
          ) : null}
          {user?.city || user?.country ? (
            <View
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaMapMarkerAlt size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)} numberOfLines={1}>
                {[user.city, user.country].filter(Boolean).join(", ")}
              </AppText>
            </View>
          ) : null}
          {user?.language ? (
            <View
              style={[
                styles.contactChip,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <FaGlobe size={10} color={c.textDim} />
              <AppText style={styles.contactText(c)}>
                {languageName(user.language)}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {/* ═══ RATE + ACTIONS ═══ */}
      <View
        style={[
          styles.actionCard,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={styles.rateBlock}>
          <AppText style={styles.rateMain(c)}>
            {worker.currency} {worker.hourlyRate?.toLocaleString()}
          </AppText>
          <AppText style={styles.rateSuffix(c)}>
            {t("workers.publicProfile.perHour")}
          </AppText>
        </View>

        {hasMultiRate ? (
          <View style={styles.ratePills}>
            {worker.dailyRate > 0 ? (
              <RatePill
                value={worker.dailyRate}
                suffix={t("workers.publicProfile.perDay")}
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.weeklyRate > 0 ? (
              <RatePill
                value={worker.weeklyRate}
                suffix={t("workers.publicProfile.perWeek")}
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.monthlyRate > 0 ? (
              <RatePill
                value={worker.monthlyRate}
                suffix={t("workers.publicProfile.perMonth")}
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.yearlyRate > 0 ? (
              <RatePill
                value={worker.yearlyRate}
                suffix={t("workers.publicProfile.perYear")}
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.customRate > 0 ? (
              <RatePill
                value={worker.customRate}
                suffix={
                  worker.customRateLabel
                    ? `/${worker.customRateLabel}`
                    : t("workers.publicProfile.perCustom")
                }
                currency={worker.currency}
                c={c}
              />
            ) : null}
          </View>
        ) : null}

        {worker.pricingNote ? (
          <AppText style={styles.pricingNote(c)}>{worker.pricingNote}</AppText>
        ) : null}

        {!isOwnProfile ? (
          <>
            <View style={styles.actionBtns}>
              <Pressable
                onPress={() =>
                  navigation.navigate("CreateBooking", { workerId: userId })
                }
                style={({ pressed }) => [
                  styles.bookBtn,
                  { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <AppText style={styles.bookBtnText(c)}>
                  {t("workerProfile.bookNow")}
                </AppText>
              </Pressable>

              {isHirer ? (
                <Pressable
                  onPress={saved.toggle}
                  disabled={saved.checking || saved.toggling}
                  style={({ pressed }) => [
                    styles.iconActionBtn,
                    {
                      backgroundColor: saved.isSaved ? c.orangeDim : c.bgCard,
                      borderColor: saved.isSaved ? c.orangeGlow : c.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <FaBookmark
                    size={16}
                    color={saved.isSaved ? c.orange : c.textDim}
                  />
                </Pressable>
              ) : null}

              <Pressable
                onPress={openChatWithWorker}
                disabled={openingChat}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    opacity: openingChat ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {openingChat ? (
                  <ActivityIndicator size="small" color={c.textDim} />
                ) : (
                  <FaCommentDots size={16} color={c.textDim} />
                )}
              </Pressable>
            </View>

            <View style={{ marginTop: 10 }}>
              <ReportButton
                targetType="USER"
                targetId={worker.userId || userId}
                targetName={`${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
              />
            </View>
          </>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={[
              styles.editBtn,
              { borderColor: c.border, backgroundColor: c.bgCard },
            ]}
          >
            <FaEdit size={13} color={c.textDim} />
            <AppText style={{ fontSize: 13, color: c.textDim, marginLeft: 6 }}>
              {t("workers.publicProfile.editProfile")}
            </AppText>
          </Pressable>
        )}
      </View>

      {/* ═══ TABS ═══ */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginTop: 14, marginBottom: 12 }}
        contentContainerStyle={{ gap: 4, paddingHorizontal: 4 }}
      >
        {tabs.map((tabItem) => {
          const active = tab === tabItem.key;
          return (
            <Pressable
              key={tabItem.key}
              onPress={() => setTab(tabItem.key)}
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
                {tabItem.label}
              </AppText>
              {typeof tabItem.count === "number" && tabItem.count > 0 ? (
                <View
                  style={[
                    styles.tabCount,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <AppText style={{ fontSize: 9, color: c.textMuted }}>
                    {tabItem.count}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ═══ TAB CONTENT ═══ */}
      {tab === "about" ? (
        <AboutTab
          worker={worker}
          user={user}
          availability={availability}
          t={t}
          c={c}
        />
      ) : null}
      {tab === "portfolio" ? (
        <PortfolioTab
          portfolio={portfolio}
          onOpen={(item) =>
            setLightbox({
              type: "portfolio",
              url: item.imageUrl,
              title: item.title,
              description: item.description,
            })
          }
          t={t}
          c={c}
        />
      ) : null}
      {tab === "video" && hasVideo ? (
        <VideoTab
          worker={worker}
          user={user}
          onPlay={() => setVideoOpen(true)}
          t={t}
          c={c}
        />
      ) : null}
      {tab === "certifications" ? (
        <CertificationsTab
          certifications={certifications}
          onOpen={(cert) => {
            const isPdf = isPdfUrl(cert.documentUrl);
            setLightbox({
              type: isPdf ? "pdf" : "image",
              url: cert.documentUrl,
              title: cert.name,
              issuer: cert.issuedBy,
            });
          }}
          t={t}
          c={c}
        />
      ) : null}
      {tab === "availability" ? (
        <AvailabilityTab availability={availability} t={t} c={c} />
      ) : null}
      {tab === "reviews" ? (
        <ReviewsTab
          reviews={reviews}
          total={worker.totalReviews}
          avgRating={worker.avgRating}
          t={t}
          c={c}
        />
      ) : null}

      {/* ═══ MODALS ═══ */}
      <VideoPlayerModal
        visible={videoOpen}
        videoUrl={worker.videoIntroUrl}
        title={t("workers.publicProfile.videoTitle", {
          name: user?.firstName || "",
        })}
        onClose={() => setVideoOpen(false)}
      />

      <Modal
        visible={!!avatarLightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setAvatarLightbox(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setAvatarLightbox(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 500, alignItems: "center" }}
          >
            <Pressable
              onPress={() => setAvatarLightbox(null)}
              style={styles.lightboxClose}
            >
              <FaTimes size={18} color="#fff" />
            </Pressable>
            {avatarLightbox ? (
              <Image
                source={{ uri: avatarLightbox }}
                style={{ width: "100%", height: 400, borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <Pressable
          style={styles.lightboxBackdrop}
          onPress={() => setLightbox(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{ width: "90%", maxWidth: 500, alignItems: "center" }}
          >
            <Pressable
              onPress={() => setLightbox(null)}
              style={styles.lightboxClose}
            >
              <FaTimes size={18} color="#fff" />
            </Pressable>
            {lightbox?.type === "pdf" ? (
              <View
                style={{
                  width: "100%",
                  height: 500,
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <WebView source={{ uri: lightbox.url }} />
              </View>
            ) : lightbox?.url ? (
              <Image
                source={{ uri: lightbox.url }}
                style={{ width: "100%", height: 400, borderRadius: 12 }}
                resizeMode="contain"
              />
            ) : null}
            {lightbox?.title ? (
              <AppText style={styles.lightboxTitleText}>
                {lightbox.title}
              </AppText>
            ) : null}
            {lightbox?.description ? (
              <AppText style={styles.lightboxDescText}>
                {lightbox.description}
              </AppText>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>
    </AppScreen>
  );
}

// ── Sub-components ──

function StatItem({ icon, value, label, c }) {
  return (
    <View style={styles.statItem}>
      {icon}
      <AppText style={styles.statItemVal(c)} numberOfLines={1}>
        {value}
      </AppText>
      <AppText style={styles.statItemLabel(c)}>{label}</AppText>
    </View>
  );
}

function RatePill({ value, suffix, currency, c }) {
  return (
    <View
      style={[
        styles.ratePill,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <AppText style={styles.ratePillMain(c)}>
        {currency} {Number(value).toLocaleString()}
      </AppText>
      <AppText style={styles.ratePillSuffix(c)}>{suffix}</AppText>
    </View>
  );
}

function AboutTab({ worker, user, availability, t, c }) {
  const days = [
    t("workers.publicProfile.daySun"),
    t("workers.publicProfile.dayMon"),
    t("workers.publicProfile.dayTue"),
    t("workers.publicProfile.dayWed"),
    t("workers.publicProfile.dayThu"),
    t("workers.publicProfile.dayFri"),
    t("workers.publicProfile.daySat"),
  ];

  return (
    <View style={{ gap: 12 }}>
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={styles.sectionTitle(c)}>
          {t("workers.publicProfile.aboutTitle")}
        </AppText>
        <AppText style={styles.aboutBio(c)}>
          {worker.description || t("workerProfile.empty.noBio")}
        </AppText>

        <View style={styles.infoCardsGrid}>
          <InfoCard
            icon={<FaAward size={14} color={c.orange} />}
            label={t("workers.publicProfile.yearsExp")}
            value={t("workers.publicProfile.yearsValue", {
              count: worker.yearsExperience || 0,
            })}
            c={c}
          />
          <InfoCard
            icon={<FaMapMarkerAlt size={14} color={c.orange} />}
            label={t("workerProfile.serviceRadius")}
            value={`${worker.serviceRadius} km`}
            c={c}
          />
          <InfoCard
            icon={<FaCalendarAlt size={14} color={c.orange} />}
            label={t("workers.publicProfile.joined")}
            value={new Date(user.createdAt).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
          {worker.backgroundCheck && (
            <InfoCard
              icon={<FaShieldAlt size={14} color={c.green} />}
              label={t("workers.publicProfile.background")}
              value={t("workers.publicProfile.cleared")}
              accent
              c={c}
            />
          )}
        </View>
      </View>

      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={styles.sectionTitle(c)}>
          {t("workerProfile.weeklyAvailability")}
        </AppText>
        <View style={styles.weekRow}>
          {days.map((d, i) => {
            const slot = availability.find(
              (a) => a.dayOfWeek === i && a.isAvailable,
            );
            return (
              <View
                key={d}
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: slot ? c.orangeDim : c.bgCard,
                    borderColor: slot ? c.orangeGlow : c.border,
                  },
                ]}
              >
                <AppText
                  style={[
                    styles.dayText,
                    { color: slot ? c.orange : c.textMuted },
                  ]}
                >
                  {d}
                </AppText>
                {slot ? (
                  <AppText style={[styles.dayTime, { color: c.orange }]}>
                    {slot.startTime?.slice(0, 5)}
                  </AppText>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function InfoCard({ icon, label, value, accent, c }) {
  return (
    <View
      style={[
        styles.infoCard,
        {
          backgroundColor: accent ? c.greenDim : c.bgCard,
          borderColor: accent ? c.green : c.border,
        },
      ]}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText
          style={[
            styles.infoCardLabel,
            { color: accent ? c.green : c.textMuted },
          ]}
          numberOfLines={1}
        >
          {label}
        </AppText>
        <AppText
          style={[styles.infoCardValue, { color: accent ? c.green : c.text }]}
          numberOfLines={1}
        >
          {value}
        </AppText>
      </View>
    </View>
  );
}

function PortfolioTab({ portfolio, onOpen, t, c }) {
  if (!portfolio?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaImage size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>
          {t("workerProfile.empty.noPortfolio")}
        </AppText>
      </View>
    );
  }
  return (
    <View style={styles.portfolioGrid}>
      {portfolio.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onOpen(item)}
          style={({ pressed }) => [
            styles.portfolioCard,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Image source={{ uri: item.imageUrl }} style={styles.portfolioImg} />
          <View style={styles.portfolioBody}>
            <AppText style={styles.portfolioTitle(c)} numberOfLines={1}>
              {item.title}
            </AppText>
            {item.description ? (
              <AppText style={styles.portfolioDesc(c)} numberOfLines={2}>
                {item.description}
              </AppText>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

function VideoTab({ worker, user, onPlay, t, c }) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText style={styles.sectionTitle(c)}>
        {t("workers.publicProfile.videoIntroTitle")}
      </AppText>
      <Pressable
        onPress={onPlay}
        style={({ pressed }) => [
          styles.videoPlaceholder,
          {
            backgroundColor: c.bgCard,
            borderColor: c.orangeGlow,
            opacity: pressed ? 0.9 : 1,
          },
        ]}
      >
        <FaVideo size={40} color={c.orange} />
        <AppText style={styles.videoName(c)}>
          {t("workers.publicProfile.videoTitle", {
            name: user.firstName,
          })}
        </AppText>
        <AppText style={styles.videoHint(c)}>
          {t("workers.publicProfile.tapToWatch")}
        </AppText>
      </Pressable>
    </View>
  );
}

function CertificationsTab({ certifications, onOpen, t, c }) {
  if (!certifications?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaFileAlt size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>
          {t("workerProfile.empty.noCertifications")}
        </AppText>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      {certifications.map((cert) => (
        <View
          key={cert.id}
          style={[
            styles.certCard,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View
            style={[
              styles.certIcon,
              { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
            ]}
          >
            <FaFileAlt size={18} color={c.orange} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={styles.certName(c)} numberOfLines={2}>
              {cert.name}
            </AppText>
            <AppText style={styles.certIssuer(c)} numberOfLines={1}>
              {t("workers.publicProfile.issuedBy", {
                issuer: cert.issuedBy,
              })}
            </AppText>
            {cert.issueDate ? (
              <AppText style={styles.certDate(c)}>
                {new Date(cert.issueDate).toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric",
                })}
                {cert.expiryDate
                  ? ` – ${new Date(cert.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                  : ""}
              </AppText>
            ) : null}
          </View>
          {cert.verified && (
            <View
              style={[
                styles.certVerified,
                { backgroundColor: c.greenDim, borderColor: c.green },
              ]}
            >
              <FaCheckCircle size={9} color={c.green} />
              <AppText style={styles.certVerifiedText(c)}>
                {t("workers.publicProfile.verified")}
              </AppText>
            </View>
          )}
          {cert.documentUrl && (
            <Pressable
              onPress={() => onOpen(cert)}
              style={({ pressed }) => [
                styles.certViewBtn,
                {
                  backgroundColor: c.orangeDim,
                  borderColor: c.orangeGlow,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <AppText style={styles.certViewText(c)}>
                {t("workers.publicProfile.view")}
              </AppText>
              <FaChevronRight size={10} color={c.orange} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

function AvailabilityTab({ availability, t, c }) {
  if (!availability?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaCalendarAlt size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>
          {t("workers.publicProfile.noAvailability")}
        </AppText>
      </View>
    );
  }
  const days = [
    t("workers.publicProfile.daySun"),
    t("workers.publicProfile.dayMon"),
    t("workers.publicProfile.dayTue"),
    t("workers.publicProfile.dayWed"),
    t("workers.publicProfile.dayThu"),
    t("workers.publicProfile.dayFri"),
    t("workers.publicProfile.daySat"),
  ];
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {days.map((day, i) => {
        const slot = availability.find((a) => a.dayOfWeek === i);
        return (
          <View
            key={day}
            style={[styles.availRow, { borderBottomColor: c.border }]}
          >
            <AppText style={styles.availDay(c)}>{day}</AppText>
            {slot?.isAvailable ? (
              <AppText style={[styles.availTime, { color: c.green }]}>
                {slot.startTime?.slice(0, 5)} – {slot.endTime?.slice(0, 5)}
              </AppText>
            ) : (
              <AppText style={styles.availOff(c)}>
                {t("workerProfile.unavailable")}
              </AppText>
            )}
            <View
              style={[
                styles.availDotSmall,
                {
                  backgroundColor: slot?.isAvailable ? c.green : c.textMuted,
                  marginLeft: "auto",
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function ReviewsTab({ reviews, total, avgRating, t, c }) {
  if (!reviews?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaStar size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>
          {t("workerProfile.empty.noReviews")}
        </AppText>
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <View
        style={[
          styles.ratingSummary,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <View style={{ alignItems: "center" }}>
          <AppText style={styles.reviewAvg(c)}>
            {avgRating > 0
              ? avgRating.toFixed(1)
              : t("workers.publicProfile.dash")}
          </AppText>
          <AppText style={styles.reviewTotalLabel(c)}>
            {t("workers.publicProfile.reviewCount", { count: total })}
          </AppText>
        </View>
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", gap: 2 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <FaStar
                key={s}
                size={16}
                color={s <= Math.round(avgRating) ? c.orange : c.textMuted}
              />
            ))}
          </View>
        </View>
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
                { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
              ]}
            >
              {r.giver?.avatar ? (
                <Image
                  source={{ uri: r.giver.avatar }}
                  style={{ width: "100%", height: "100%" }}
                />
              ) : (
                <AppText style={styles.reviewAvatarText(c)}>
                  {r.giver?.firstName?.[0]}
                  {r.giver?.lastName?.[0]}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={styles.reviewName(c)} numberOfLines={1}>
                {r.giver?.firstName} {r.giver?.lastName}
              </AppText>
              {r.booking?.title && (
                <AppText style={styles.reviewBookingTitle(c)} numberOfLines={1}>
                  {r.booking.title}
                </AppText>
              )}
            </View>
            <View style={{ flexDirection: "row", gap: 1 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <FaStar
                  key={s}
                  size={10}
                  color={s <= r.rating ? c.orange : c.textMuted}
                />
              ))}
            </View>
          </View>
          {r.comment && (
            <AppText style={styles.reviewComment(c)}>"{r.comment}"</AppText>
          )}
          <AppText style={styles.reviewDate(c)}>
            {new Date(r.createdAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ═══ STYLES — unchanged ═══
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
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallbackText: (c) => ({
    fontSize: 28,
    fontWeight: "800",
    color: c.orange,
  }),
  avatarExpand: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  heroInfo: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  heroName: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 20,
    fontWeight: "800",
    color: c.text,
  }),
  heroTitleText: (c) => ({ fontSize: 13, color: c.textDim }),
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  availDot: { width: 8, height: 8, borderRadius: 4 },
  availText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: "100%",
  },
  catText: { fontSize: 10, fontWeight: "600", marginLeft: 4 },
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
  statItem: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  statItemVal: (c) => ({
    fontSize: 12,
    fontWeight: "700",
    color: c.text,
    marginLeft: 4,
  }),
  statItemLabel: (c) => ({ fontSize: 9, color: c.textMuted, marginLeft: 2 }),
  statDivider: { width: 1, height: 14 },
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
  actionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  rateBlock: { flexDirection: "row", alignItems: "baseline" },
  rateMain: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 26,
    fontWeight: "800",
    color: c.orange,
  }),
  rateSuffix: (c) => ({ fontSize: 12, color: c.textDim, marginLeft: 3 }),
  ratePills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  ratePill: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratePillMain: (c) => ({ fontSize: 11, fontWeight: "700", color: c.text }),
  ratePillSuffix: (c) => ({ fontSize: 9, color: c.textDim, marginLeft: 2 }),
  pricingNote: (c) => ({
    fontSize: 11,
    color: c.textMuted,
    marginTop: 8,
    lineHeight: 16,
    fontStyle: "italic",
  }),
  actionBtns: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" },
  bookBtn: {
    flex: 1,
    minWidth: 140,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bookBtnText: (c) => ({ fontSize: 14, fontWeight: "700", color: c.bg }),
  iconActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 2,
    gap: 4,
  },
  tabCount: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  section: { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: (c) => ({
    fontFamily: "Syne_700Bold",
    fontSize: 12,
    fontWeight: "700",
    color: c.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 12,
  }),
  aboutBio: (c) => ({ fontSize: 13, color: c.textDim, lineHeight: 20 }),
  infoCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    flexBasis: "48%",
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    minWidth: 0,
  },
  infoCardLabel: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoCardValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  weekRow: { flexDirection: "row", flexWrap: "nowrap", gap: 4 },
  dayCell: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  dayText: { fontSize: 10, fontWeight: "700" },
  dayTime: { fontSize: 8, marginTop: 2 },
  emptySection: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyText: (c) => ({ fontSize: 13, color: c.textDim, marginTop: 10 }),
  portfolioGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  portfolioCard: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  portfolioImg: { width: "100%", height: 110 },
  portfolioBody: { padding: 8 },
  portfolioTitle: (c) => ({ fontSize: 12, fontWeight: "700", color: c.text }),
  portfolioDesc: (c) => ({ fontSize: 10, color: c.textMuted, marginTop: 2 }),
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  videoName: (c) => ({
    fontSize: 13,
    fontWeight: "700",
    color: c.text,
    marginTop: 12,
  }),
  videoHint: (c) => ({ fontSize: 11, color: c.textDim, marginTop: 4 }),
  certCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
  certName: (c) => ({ fontSize: 13, fontWeight: "700", color: c.text }),
  certIssuer: (c) => ({ fontSize: 11, color: c.textDim, marginTop: 2 }),
  certDate: (c) => ({ fontSize: 10, color: c.textMuted, marginTop: 2 }),
  certVerified: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    flexShrink: 0,
  },
  certVerifiedText: (c) => ({
    fontSize: 9,
    fontWeight: "700",
    color: c.green,
    marginLeft: 3,
  }),
  certViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "center",
    flexShrink: 0,
  },
  certViewText: (c) => ({
    fontSize: 11,
    fontWeight: "700",
    color: c.orange,
    marginRight: 3,
  }),
  availRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  availDay: (c) => ({
    fontSize: 12,
    fontWeight: "700",
    color: c.text,
    width: 50,
  }),
  availTime: { fontSize: 12, fontWeight: "600" },
  availOff: (c) => ({ fontSize: 12, color: c.textMuted, fontStyle: "italic" }),
  availDotSmall: { width: 8, height: 8, borderRadius: 4 },
  ratingSummary: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 16,
  },
  reviewAvg: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 32,
    fontWeight: "800",
    color: c.orange,
    lineHeight: 34,
  }),
  reviewTotalLabel: (c) => ({ fontSize: 10, color: c.textMuted, marginTop: 2 }),
  reviewCard: { borderRadius: 12, borderWidth: 1, padding: 12 },
  reviewTop: { flexDirection: "row", alignItems: "center", gap: 8 },
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
  reviewName: (c) => ({ fontSize: 12, fontWeight: "700", color: c.text }),
  reviewBookingTitle: (c) => ({ fontSize: 10, color: c.textDim, marginTop: 1 }),
  reviewComment: (c) => ({
    fontSize: 12,
    color: c.textDim,
    fontStyle: "italic",
    lineHeight: 18,
    marginTop: 8,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: c.orangeGlow,
  }),
  reviewDate: (c) => ({ fontSize: 10, color: c.textMuted, marginTop: 8 }),
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
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
  lightboxTitleText: {
    fontFamily: "Syne_700Bold",
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
    textAlign: "center",
  },
  lightboxDescText: {
    fontSize: 12,
    color: "#ccc",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 18,
  },
});
