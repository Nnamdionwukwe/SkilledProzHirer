// src/screens/main/WorkerPublicProfileScreen.js
import React, { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
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
  FaClock, // Added for Last Seen
} from "../../icons/fa";

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const isPdfUrl = (url) => !!url && /\.pdf$/i.test(url.split("?")[0]);

const LANGUAGE_NAMES = {
  en: "English",
  fr: "French",
  ar: "Arabic",
  yo: "Yoruba",
  ha: "Hausa",
  ig: "Igbo",
  sw: "Swahili",
  pt: "Portuguese",
  es: "Spanish",
  de: "German",
  zh: "Chinese",
  hi: "Hindi",
  bn: "Bengali",
  ur: "Urdu",
  tr: "Turkish",
  ko: "Korean",
  ja: "Japanese",
  ru: "Russian",
  id: "Indonesian",
  vi: "Vietnamese",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  fa: "Persian",
  am: "Amharic",
  zu: "Zulu",
  af: "Afrikaans",
  so: "Somali",
};

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

export default function WorkerPublicProfileScreen() {
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

  const isOwnProfile = viewerUser?.id === userId;
  const isHirer = viewerUser?.role === "HIRER";
  const saved = useSavedWorker(userId, { enabled: isHirer && !isOwnProfile });

  useEffect(() => {
    if (!userId) {
      setError("Worker not found");
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
        setError(e.response?.data?.message || "Profile not found");
      })
      .finally(() => setLoading(false));
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
            {isPrivate ? "Private Profile" : "Worker not found"}
          </AppText>
          <AppText style={styles.errorSub(c)}>
            {error || "This worker profile is not available."}
          </AppText>
          <Pressable
            onPress={() => navigation.goBack()}
            style={[styles.backBtn, { borderColor: c.border, marginTop: 20 }]}
          >
            <FaArrowLeft size={12} color={c.textDim} />
            <AppText style={{ fontSize: 12, color: c.textDim, marginLeft: 6 }}>
              Back to Search
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
    { key: "about", label: "About" },
    { key: "portfolio", label: "Portfolio", count: portfolio.length },
    ...(hasVideo ? [{ key: "video", label: "Video Intro" }] : []),
    {
      key: "certifications",
      label: "Certifications",
      count: certifications.length,
    },
    { key: "availability", label: "Availability" },
    { key: "reviews", label: "Reviews", count: worker.totalReviews },
  ];

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
                {worker.isAvailable ? "Available" : "Unavailable"}
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
            value={worker.avgRating > 0 ? worker.avgRating.toFixed(1) : "New"}
            label={`${worker.totalReviews} review${worker.totalReviews !== 1 ? "s" : ""}`}
            c={c}
          />
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <StatItem
            icon={<FaCheckCircle size={12} color={c.orange} />}
            value={worker.completedJobs}
            label="jobs done"
            c={c}
          />
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <StatItem
            icon={<FaBolt size={12} color={c.orange} />}
            value={`${worker.responseRate}%`}
            label="response"
            c={c}
          />
          {user?.lastSeen ? (
            <>
              <View
                style={[styles.statDivider, { backgroundColor: c.border }]}
              />
              <StatItem
                icon={<FaClock size={12} color={c.orange} />}
                value={timeAgo(user.lastSeen)}
                label="last seen"
                c={c}
              />
            </>
          ) : null}
        </View>

        {/* ── CONTACT CHIPS (Phone + Email clickable) ── */}
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
                {LANGUAGE_NAMES[user.language] || user.language}
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
          <AppText style={styles.rateSuffix(c)}>/hr</AppText>
        </View>

        {hasMultiRate ? (
          <View style={styles.ratePills}>
            {worker.dailyRate > 0 ? (
              <RatePill
                value={worker.dailyRate}
                suffix="/day"
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.weeklyRate > 0 ? (
              <RatePill
                value={worker.weeklyRate}
                suffix="/wk"
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.monthlyRate > 0 ? (
              <RatePill
                value={worker.monthlyRate}
                suffix="/mo"
                currency={worker.currency}
                c={c}
              />
            ) : null}
            {worker.yearlyRate > 0 ? (
              <RatePill
                value={worker.yearlyRate}
                suffix="/yr"
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
                    : "/custom"
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
                <AppText style={styles.bookBtnText(c)}>Book Now</AppText>
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
                onPress={() => navigation.navigate("Chat", { userId })}
                style={({ pressed }) => [
                  styles.iconActionBtn,
                  {
                    backgroundColor: c.bgCard,
                    borderColor: c.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <FaCommentDots size={16} color={c.textDim} />
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
              Edit Profile
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
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
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
                {t.label}
              </AppText>
              {typeof t.count === "number" && t.count > 0 ? (
                <View
                  style={[
                    styles.tabCount,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <AppText style={{ fontSize: 9, color: c.textMuted }}>
                    {t.count}
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
          c={c}
        />
      ) : null}
      {tab === "video" && hasVideo ? (
        <VideoTab
          worker={worker}
          user={user}
          onPlay={() => setVideoOpen(true)}
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
          c={c}
        />
      ) : null}
      {tab === "availability" ? (
        <AvailabilityTab availability={availability} c={c} />
      ) : null}
      {tab === "reviews" ? (
        <ReviewsTab
          reviews={reviews}
          total={worker.totalReviews}
          avgRating={worker.avgRating}
          c={c}
        />
      ) : null}

      {/* ═══ MODALS ═══ */}
      <VideoPlayerModal
        visible={videoOpen}
        videoUrl={worker.videoIntroUrl}
        title={`${user?.firstName || ""}'s Introduction`}
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

function AboutTab({ worker, user, availability, c }) {
  return (
    <View style={{ gap: 12 }}>
      <View
        style={[
          styles.section,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <AppText style={styles.sectionTitle(c)}>About</AppText>
        <AppText style={styles.aboutBio(c)}>
          {worker.description || "No description provided."}
        </AppText>

        {/* ── 2-COLUMN GRID ── */}
        <View style={styles.infoCardsGrid}>
          <InfoCard
            icon={<FaAward size={14} color={c.orange} />}
            label="Years Exp."
            value={`${worker.yearsExperience || 0} yr${worker.yearsExperience !== 1 ? "s" : ""}`}
            c={c}
          />
          <InfoCard
            icon={<FaMapMarkerAlt size={14} color={c.orange} />}
            label="Radius"
            value={`${worker.serviceRadius} km`}
            c={c}
          />
          <InfoCard
            icon={<FaCalendarAlt size={14} color={c.orange} />}
            label="Joined"
            value={new Date(user.createdAt).toLocaleDateString("en-GB", {
              month: "short",
              year: "numeric",
            })}
            c={c}
          />
          {worker.backgroundCheck && (
            <InfoCard
              icon={<FaShieldAlt size={14} color={c.green} />}
              label="Background"
              value="Cleared"
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
        <AppText style={styles.sectionTitle(c)}>Weekly Availability</AppText>
        <View style={styles.weekRow}>
          {DAYS_SHORT.map((d, i) => {
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

function PortfolioTab({ portfolio, onOpen, c }) {
  if (!portfolio?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaImage size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>No portfolio items yet.</AppText>
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

function VideoTab({ worker, user, onPlay, c }) {
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      <AppText style={styles.sectionTitle(c)}>Video Introduction</AppText>
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
          {user.firstName}'s Introduction
        </AppText>
        <AppText style={styles.videoHint(c)}>Tap to watch</AppText>
      </Pressable>
    </View>
  );
}

function CertificationsTab({ certifications, onOpen, c }) {
  if (!certifications?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaFileAlt size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>No certifications added.</AppText>
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
              Issued by {cert.issuedBy}
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
              <AppText style={styles.certVerifiedText(c)}>Verified</AppText>
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
              <AppText style={styles.certViewText(c)}>View</AppText>
              <FaChevronRight size={10} color={c.orange} />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

function AvailabilityTab({ availability, c }) {
  if (!availability?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaCalendarAlt size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>No availability set.</AppText>
      </View>
    );
  }
  return (
    <View
      style={[
        styles.section,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {DAYS_SHORT.map((day, i) => {
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
              <AppText style={styles.availOff(c)}>Unavailable</AppText>
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

function ReviewsTab({ reviews, total, avgRating, c }) {
  if (!reviews?.length) {
    return (
      <View
        style={[
          styles.emptySection,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <FaStar size={36} color={c.textMuted} />
        <AppText style={styles.emptyText(c)}>No reviews yet.</AppText>
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
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
          </AppText>
          <AppText style={styles.reviewTotalLabel(c)}>
            {total} review{total !== 1 ? "s" : ""}
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

  // Fixed info cards grid
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

  // Fixed weekly row (7 equal columns)
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
