// src/screens/main/WorkerPublicProfileScreen.js
// Endpoint: GET /workers/:userId  |  GET /reviews/worker/:userId
// Mirrors the website worker profile page with all tabs.

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import TopBar from "../../components/TopBar";
import {
  getWorkerPublicProfile,
  getWorkerPublicReviews,
} from "../../api/workers";
import { Ionicons } from "@expo/vector-icons";

const { width: SW } = Dimensions.get("window");

// ── Category colour cycle ────────────────────────────────────────────────────
const CAT_COLORS = [
  { bg: "rgba(249,115,22,0.15)", text: "#f97316", border: "#f97316" },
  { bg: "rgba(99,102,241,0.15)", text: "#818cf8", border: "#818cf8" },
  { bg: "rgba(6,182,212,0.15)", text: "#22d3ee", border: "#22d3ee" },
  { bg: "rgba(34,197,94,0.15)", text: "#22c55e", border: "#22c55e" },
  { bg: "rgba(236,72,153,0.15)", text: "#f472b6", border: "#f472b6" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function fmtFullDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Star row ──────────────────────────────────────────────────────────────────
function Stars({ rating, size = 16, color }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <AppText
          key={i}
          style={{ fontSize: size, color: i <= rating ? color : "#4b5563" }}
        >
          ★
        </AppText>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Lightbox
// ─────────────────────────────────────────────────────────────────────────────
function Lightbox({ item, onClose }) {
  if (!item) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={lb.backdrop} onPress={onClose}>
        <View style={lb.container}>
          <Pressable style={lb.closeBtn} onPress={onClose}>
            <AppText style={{ color: "#fff", fontSize: 18 }}>✕</AppText>
          </Pressable>
          <Image
            source={{ uri: item.imageUrl }}
            style={lb.image}
            resizeMode="contain"
          />
          {(item.title || item.description) && (
            <View style={lb.caption}>
              {item.title && (
                <AppText
                  style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                >
                  {item.title}
                </AppText>
              )}
              {item.description && (
                <AppText
                  style={{ color: "rgba(255,255,255,0.7)", marginTop: 4 }}
                >
                  {item.description}
                </AppText>
              )}
            </View>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab content sections
// ─────────────────────────────────────────────────────────────────────────────

function AboutSection({ worker, c, t }) {
  const u = worker.user ?? {};
  const wp = worker;
  const availability = wp.availability ?? [];

  // Compact weekly calendar
  const avByDay = availability.reduce((acc, a) => {
    acc[a.dayOfWeek] = a;
    return acc;
  }, {});

  return (
    <View
      style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <AppText style={[tab.sectionTitle, { color: c.text }]}>
        {t("workerProfile.about")}
      </AppText>

      {!!wp.description && (
        <AppText
          variant="body"
          style={{ color: c.textMuted, lineHeight: 24, marginBottom: 16 }}
        >
          {wp.description}
        </AppText>
      )}

      {/* Stats grid */}
      <View style={tab.statsGrid}>
        {!!wp.yearsExperience && (
          <View
            style={[
              tab.statCard,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <AppText style={{ fontSize: 20, lineHeight: 30 }}>🏆</AppText>
            <AppText
              variant="small"
              style={{ color: c.textMuted, marginTop: 4, letterSpacing: 0.6 }}
            >
              YEARS EXPERIENCE
            </AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginTop: 2 }}
            >
              {wp.yearsExperience} yrs
            </AppText>
          </View>
        )}
        {!!wp.serviceRadius && (
          <View
            style={[
              tab.statCard,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <AppText style={{ fontSize: 20, lineHeight: 30 }}>📡</AppText>
            <AppText
              variant="small"
              style={{ color: c.textMuted, marginTop: 4, letterSpacing: 0.6 }}
            >
              SERVICE RADIUS
            </AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginTop: 2 }}
            >
              {wp.serviceRadius} km
            </AppText>
          </View>
        )}
        {!!u.createdAt && (
          <View
            style={[
              tab.statCard,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <AppText style={{ fontSize: 20, lineHeight: 30 }}>📅</AppText>
            <AppText
              variant="small"
              style={{ color: c.textMuted, marginTop: 4, letterSpacing: 0.6 }}
            >
              MEMBER SINCE
            </AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginTop: 2 }}
            >
              {new Date(u.createdAt).toLocaleDateString("en-GB", {
                month: "long",
                year: "numeric",
              })}
            </AppText>
          </View>
        )}
      </View>

      {/* Weekly availability mini */}
      {availability.length > 0 && (
        <>
          <AppText style={[tab.sectionTitle, { color: c.text, marginTop: 20 }]}>
            {t("workerProfile.weeklyAvailability")}
          </AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {[0, 1, 2, 3, 4, 5, 6].map((day) => {
              const a = avByDay[day];
              const available = !!a?.isAvailable;
              return (
                <View
                  key={day}
                  style={[
                    tab.dayChip,
                    {
                      backgroundColor: available
                        ? "rgba(249,115,22,0.12)"
                        : c.bgInput,
                      borderColor: available ? c.orange : c.border,
                      opacity: available ? 1 : 0.45,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: available ? c.orange : c.textMuted }}
                  >
                    {DAYS[day]}
                  </AppText>
                  {available && a?.startTime && (
                    <AppText
                      style={{ fontSize: 10, color: c.orange, marginTop: 2 }}
                    >
                      {a.startTime}
                    </AppText>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function PortfolioSection({ items, c, t }) {
  const [selected, setSelected] = useState(null);

  if (!items?.length)
    return (
      <View
        style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <AppText style={{ color: c.textMuted, textAlign: "center" }}>
          {t("workerProfile.noPortfolio")}
        </AppText>
      </View>
    );

  return (
    <View
      style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <View style={tab.sectionTitleRow}>
        <AppText style={[tab.sectionTitle, { color: c.text }]}>
          {t("workerProfile.portfolio")}
        </AppText>
        <View style={[tab.countBadge, { backgroundColor: c.bgInput }]}>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {items.length}
          </AppText>
        </View>
      </View>
      <View style={tab.portfolioGrid}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => setSelected(item)}
            style={[tab.portfolioItem, { backgroundColor: c.bgInput }]}
          >
            <Image
              source={{ uri: item.imageUrl }}
              style={tab.portfolioImg}
              resizeMode="cover"
            />
            {item.title && (
              <View
                style={[
                  tab.portfolioCaption,
                  { backgroundColor: "rgba(0,0,0,0.6)" },
                ]}
              >
                <AppText
                  variant="small"
                  style={{ color: "#fff" }}
                  numberOfLines={1}
                >
                  {item.title}
                </AppText>
                {item.description && (
                  <AppText
                    style={{ color: "rgba(255,255,255,0.7)", fontSize: 10 }}
                    numberOfLines={1}
                  >
                    {item.description}
                  </AppText>
                )}
              </View>
            )}
          </Pressable>
        ))}
      </View>
      <Lightbox item={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

function CertificationsSection({ certs, c, t }) {
  if (!certs?.length)
    return (
      <View
        style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <AppText style={{ color: c.textMuted, textAlign: "center" }}>
          {t("workerProfile.noCerts")}
        </AppText>
      </View>
    );

  return (
    <View
      style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <View style={tab.sectionTitleRow}>
        <AppText style={[tab.sectionTitle, { color: c.text }]}>
          {t("workerProfile.certifications")}
        </AppText>
        <View style={[tab.countBadge, { backgroundColor: c.bgInput }]}>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {certs.length}
          </AppText>
        </View>
      </View>
      {certs.map((cert, i) => (
        <View
          key={cert.id ?? i}
          style={[
            tab.certRow,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          <AppText style={{ fontSize: 28, marginRight: 14 }}>📜</AppText>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              {cert.name}
            </AppText>
            {cert.issuedBy && (
              <AppText variant="small" style={{ color: c.textMuted }}>
                Issued by {cert.issuedBy}
              </AppText>
            )}
            {(cert.issueDate || cert.expiryDate) && (
              <AppText variant="small" style={{ color: c.textMuted }}>
                {fmtDate(cert.issueDate)}
                {cert.expiryDate ? ` – ${fmtDate(cert.expiryDate)}` : ""}
              </AppText>
            )}
          </View>
          {cert.documentUrl && (
            <Pressable onPress={() => Linking.openURL(cert.documentUrl)}>
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                View →
              </AppText>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

function AvailabilitySection({ availability, c, t }) {
  const avByDay = (availability ?? []).reduce((acc, a) => {
    acc[a.dayOfWeek] = a;
    return acc;
  }, {});

  return (
    <View
      style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <AppText style={[tab.sectionTitle, { color: c.text }]}>
        {t("workerProfile.availability")}
      </AppText>
      {[0, 1, 2, 3, 4, 5, 6].map((day) => {
        const a = avByDay[day];
        const available = !!a?.isAvailable;
        return (
          <View
            key={day}
            style={[
              tab.avRow,
              {
                backgroundColor: available
                  ? "rgba(249,115,22,0.06)"
                  : "transparent",
                borderColor: available ? c.orange : c.border,
              },
            ]}
          >
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: available ? c.text : c.textMuted, width: 40 }}
            >
              {DAYS[day]}
            </AppText>
            <AppText
              variant="body"
              style={{
                color: available ? c.textMuted : c.textMuted,
                flex: 1,
                marginLeft: 12,
              }}
            >
              {available && a?.startTime
                ? `${a.startTime} – ${a.endTime ?? "18:00"}`
                : t("workerProfile.unavailable")}
            </AppText>
            <View
              style={[
                tab.avDot,
                { backgroundColor: available ? "#22c55e" : "#374151" },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function ReviewsSection({ reviews, avgRating, total, c }) {
  return (
    <View
      style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <View style={tab.reviewsHeader}>
        <View style={tab.sectionTitleRow}>
          <AppText style={[tab.sectionTitle, { color: c.text }]}>
            Reviews
          </AppText>
          <View style={[tab.countBadge, { backgroundColor: c.bgInput }]}>
            <AppText variant="small" style={{ color: c.textMuted }}>
              {total}
            </AppText>
          </View>
        </View>
        {avgRating > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <AppText
              style={{
                fontSize: 32,
                lineHeight: 33,
                fontWeight: "900",
                color: c.orange,
              }}
            >
              {Number(avgRating).toFixed(1)}
            </AppText>
            <Stars rating={Math.round(avgRating)} size={18} color={c.orange} />
          </View>
        )}
      </View>

      {reviews.map((r) => {
        const g = r.giver ?? {};
        return (
          <View
            key={r.id}
            style={[
              tab.reviewCard,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <View style={tab.reviewAuthorRow}>
              <View
                style={[tab.reviewAvatar, { backgroundColor: c.orangeDim }]}
              >
                {g.avatar ? (
                  <Image
                    source={{ uri: g.avatar }}
                    style={tab.reviewAvatarImg}
                  />
                ) : (
                  <AppText style={{ color: c.orange, fontWeight: "700" }}>
                    {initials(g.firstName, g.lastName)}
                  </AppText>
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text }}
                >
                  {g.firstName} {g.lastName}
                </AppText>
                {r.booking?.title && (
                  <AppText variant="small" style={{ color: c.textMuted }}>
                    {r.booking.title}
                  </AppText>
                )}
              </View>
              <Stars rating={r.rating} size={14} color={c.orange} />
            </View>
            {r.comment && (
              <View style={[tab.reviewQuote, { borderLeftColor: c.orange }]}>
                <AppText
                  variant="body"
                  style={{ color: c.textMuted, fontStyle: "italic" }}
                >
                  "{r.comment}"
                </AppText>
              </View>
            )}
            <AppText
              variant="small"
              style={{ color: c.textMuted, marginTop: 6 }}
            >
              {fmtFullDate(r.createdAt)}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const PROFILE_TABS = [
  "about",
  "portfolio",
  "certifications",
  "availability",
  "reviews",
];

export default function WorkerPublicProfileScreen({ navigation, route }) {
  const userId = route?.params?.userId;
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();

  const [worker, setWorker] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewMeta, setReviewMeta] = useState({ avgRating: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("about");

  const load = useCallback(async () => {
    try {
      const [w, rev] = await Promise.all([
        getWorkerPublicProfile(userId),
        getWorkerPublicReviews(userId, { limit: 20 }).catch(() => ({
          reviews: [],
          avgRating: 0,
          total: 0,
        })),
      ]);
      setWorker(w);
      setReviews(rev.reviews ?? []);
      setReviewMeta({ avgRating: rev.avgRating ?? 0, total: rev.total ?? 0 });
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg }]}>
        <TopBar navigation={navigation} title="" />
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color={c.orange} />
        </View>
      </View>
    );
  }

  if (!worker) return null;

  const u = worker.user ?? {};
  const wp = worker;
  const isVerified = wp.verificationStatus === "VERIFIED";
  const isAvailable = wp.isAvailable;
  const categories = wp.categories ?? [];
  const portfolio = wp.portfolio ?? [];
  const certs = wp.certifications ?? [];
  const availability = wp.availability ?? [];
  const location = [u.city, u.country].filter(Boolean).join(", ");

  // Rate chips
  const rateChips = [
    wp.dailyRate && {
      label: `${wp.currency} ${Number(wp.dailyRate).toLocaleString()}`,
      suffix: "/day",
    },
    wp.weeklyRate && {
      label: `${wp.currency} ${Number(wp.weeklyRate).toLocaleString()}`,
      suffix: "/wk",
    },
    wp.monthlyRate && {
      label: `${wp.currency} ${Number(wp.monthlyRate).toLocaleString()}`,
      suffix: "/mo",
    },
    wp.customRate &&
      wp.pricingNote && {
        label: `${wp.currency} ${Number(wp.customRate).toLocaleString()}`,
        suffix: `/${wp.pricingNote}`,
      },
  ].filter(Boolean);

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile hero card ── */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          {/* Avatar + name + availability */}
          <View style={styles.heroTop}>
            <View style={styles.heroAvatarWrap}>
              <View
                style={[
                  styles.heroAvatar,
                  { backgroundColor: c.orangeDim, borderColor: c.orange },
                ]}
              >
                {u.avatar ? (
                  <Image
                    source={{ uri: u.avatar }}
                    style={styles.heroAvatarImg}
                  />
                ) : (
                  <AppText
                    style={{ color: c.orange, fontWeight: "700", fontSize: 28 }}
                  >
                    {initials(u.firstName, u.lastName)}
                  </AppText>
                )}
              </View>
              {isVerified && (
                <View
                  style={[
                    styles.heroVerifiedBadge,
                    { backgroundColor: c.bgCard },
                  ]}
                >
                  <Ionicons name="shield-checkmark" size={21} color="#22c55e" />
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <AppText style={[styles.heroName, { color: c.text }]}>
                  {u.firstName} {u.lastName}
                </AppText>
                <View
                  style={[
                    styles.availPill,
                    {
                      backgroundColor: isAvailable
                        ? "rgba(34,197,94,0.12)"
                        : "rgba(107,114,128,0.12)",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.availDot,
                      { backgroundColor: isAvailable ? "#22c55e" : "#6b7280" },
                    ]}
                  />
                  <AppText
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: isAvailable ? "#22c55e" : "#6b7280",
                    }}
                  >
                    {isAvailable
                      ? t("workerProfile.available")
                      : t("workerProfile.unavailable")}
                  </AppText>
                </View>
              </View>
              {!!wp.title && (
                <AppText
                  variant="body"
                  style={{ color: c.textMuted, marginTop: 2 }}
                >
                  {wp.title}
                </AppText>
              )}
            </View>
          </View>

          {/* Category chips */}
          {categories.length > 0 && (
            <View style={styles.catsWrap}>
              {categories.map((wc, i) => {
                const col = CAT_COLORS[i % CAT_COLORS.length];
                return (
                  <View
                    key={wc.id ?? i}
                    style={[
                      styles.catChip,
                      {
                        backgroundColor: col.bg,
                        borderColor: col.border,
                      },
                    ]}
                  >
                    {wc.category?.icon && (
                      <AppText style={{ fontSize: 13, marginRight: 4 }}>
                        {wc.category.icon}
                      </AppText>
                    )}
                    <AppText
                      style={{
                        color: col.text,
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {wc.category?.name ?? wc.name}
                    </AppText>
                  </View>
                );
              })}
            </View>
          )}

          {/* Stats row */}
          <View style={styles.statsRow}>
            <AppText style={{ color: c.orange }}>★</AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange, marginLeft: 4 }}
            >
              {wp.avgRating > 0 ? Number(wp.avgRating).toFixed(1) : "New"}
            </AppText>
            <AppText variant="small" style={{ color: c.textMuted }}>
              {" "}
              {wp.totalReviews ?? 0} reviews |
            </AppText>
            <AppText style={{ marginLeft: 4 }}>✅</AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginLeft: 4 }}
            >
              {wp.completedJobs ?? 0}
            </AppText>
            <AppText variant="small" style={{ color: c.textMuted }}>
              {" "}
              jobs done |
            </AppText>
          </View>

          {/* Location */}
          {!!location && (
            <AppText
              variant="body"
              style={{ color: c.textMuted, marginTop: 6 }}
            >
              📍{" "}
              <AppText weight="semibold" style={{ color: c.text }}>
                {location}
              </AppText>
              <AppText variant="small" style={{ color: c.textMuted }}>
                {" "}
                location |
              </AppText>
            </AppText>
          )}

          {/* Response rate */}
          {wp.responseRate !== undefined && (
            <AppText
              variant="body"
              style={{ color: c.textMuted, marginTop: 4 }}
            >
              ⚡{" "}
              <AppText weight="semibold" style={{ color: c.text }}>
                {wp.responseRate ?? 0}%
              </AppText>
              <AppText variant="small" style={{ color: c.textMuted }}>
                {" "}
                response
              </AppText>
            </AppText>
          )}

          {/* Contact chips */}
          <View style={styles.contactChips}>
            {!!u.phone && (
              <View
                style={[
                  styles.contactChip,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ fontSize: 12 }}>📱</AppText>
                <AppText
                  variant="small"
                  style={{ color: c.text, marginLeft: 4 }}
                >
                  {u.phone}
                </AppText>
              </View>
            )}
            {!!u.email && (
              <View
                style={[
                  styles.contactChip,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ fontSize: 12 }}>✉️</AppText>
                <AppText
                  variant="small"
                  style={{ color: c.text, marginLeft: 4 }}
                >
                  {u.email}
                </AppText>
              </View>
            )}
            {!!u.gender && (
              <View
                style={[
                  styles.contactChip,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ fontSize: 12 }}>🪪</AppText>
                <AppText
                  variant="small"
                  style={{ color: c.text, marginLeft: 4 }}
                >
                  {u.gender}
                </AppText>
              </View>
            )}
            {!!u.language && (
              <View
                style={[
                  styles.contactChip,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText style={{ fontSize: 12 }}>💬</AppText>
                <AppText
                  variant="small"
                  style={{ color: c.text, marginLeft: 4 }}
                >
                  {u.language}
                </AppText>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: c.border }]} />

          {/* Hourly rate (large) */}
          {!!wp.hourlyRate && (
            <View style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                <AppText style={[styles.bigRate, { color: c.orange }]}>
                  {wp.currency} {Number(wp.hourlyRate).toLocaleString()}
                </AppText>
                <AppText
                  variant="body"
                  style={{ color: c.textMuted, marginLeft: 6 }}
                >
                  /hr
                </AppText>
              </View>

              {/* Rate chips grid */}
              {rateChips.length > 0 && (
                <View style={styles.rateChipsWrap}>
                  {rateChips.map((chip, i) => (
                    <View
                      key={i}
                      style={[
                        styles.rateChip,
                        { backgroundColor: c.bgInput, borderColor: c.border },
                      ]}
                    >
                      <AppText
                        variant="body"
                        weight="semibold"
                        style={{ color: c.text }}
                      >
                        {chip.label}
                      </AppText>
                      <AppText
                        variant="small"
                        style={{ color: c.textMuted, marginLeft: 4 }}
                      >
                        {chip.suffix}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}

              {!!wp.pricingNote && !wp.customRate && (
                <AppText
                  variant="small"
                  style={{
                    color: c.textMuted,
                    fontStyle: "italic",
                    marginTop: 6,
                  }}
                >
                  {t("workerProfile.pricesNegotiable")}
                </AppText>
              )}
              {!wp.pricingNote && (
                <AppText
                  variant="small"
                  style={{
                    color: c.textMuted,
                    fontStyle: "italic",
                    marginTop: 6,
                  }}
                >
                  {t("workerProfile.pricesNegotiable")}
                </AppText>
              )}
            </View>
          )}

          {/* Book Now + Message */}
          <View style={styles.ctaRow}>
            <Pressable
              onPress={() =>
                navigation.navigate("CreateBooking", {
                  workerId: wp.userId ?? u.id ?? userId,
                })
              }
              style={[styles.bookBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                variant="title"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                {t("workerProfile.bookNow")}
              </AppText>
            </Pressable>
            <Pressable
              style={[
                styles.msgBtn,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
              onPress={() => toast.info(t("toast.messagingComingSoon"))}
            >
              <AppText style={{ fontSize: 20, lineHeight: 30 }}>💬</AppText>
            </Pressable>
          </View>
        </View>

        {/* ── Tab bar ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabContent}
        >
          {PROFILE_TABS.map((tabKey) => {
            const active = activeTab === tabKey;
            let count = null;
            if (tabKey === "portfolio") count = portfolio.length;
            if (tabKey === "certifications") count = certs.length;
            if (tabKey === "reviews") count = reviewMeta.total;

            const label = t(`workerProfile.tab_${tabKey}`);

            return (
              <Pressable
                key={tabKey}
                onPress={() => setActiveTab(tabKey)}
                style={[
                  styles.profileTab,
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
                {count !== null && count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: active
                          ? "rgba(255,255,255,0.2)"
                          : c.bgInput,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: active ? "#fff" : c.textMuted,
                      }}
                    >
                      {count}
                    </AppText>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Tab content ── */}
        {activeTab === "about" && <AboutSection worker={worker} c={c} t={t} />}
        {activeTab === "portfolio" && (
          <PortfolioSection items={portfolio} c={c} t={t} />
        )}
        {activeTab === "certifications" && (
          <CertificationsSection certs={certs} c={c} t={t} />
        )}
        {activeTab === "availability" && (
          <AvailabilitySection availability={availability} c={c} t={t} />
        )}
        {activeTab === "reviews" && (
          <ReviewsSection
            reviews={reviews}
            avgRating={reviewMeta.avgRating}
            total={reviewMeta.total}
            c={c}
          />
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero card
  heroCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 14,
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  heroAvatarWrap: { position: "relative" },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroAvatarImg: { width: 80, height: 80 },
  heroAvailDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#0c0c18",
  },
  heroVerifiedBadge: {
    position: "absolute",
    bottom: -2,
    left: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: { fontSize: 22, fontWeight: "800", lineHeight: 28 },
  availPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  availDot: { width: 7, height: 7, borderRadius: 3.5 },

  // Categories
  catsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 2,
    marginBottom: 4,
  },

  // Contact chips
  contactChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  contactChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },

  // Rates
  bigRate: { fontSize: 32, lineHeight: 35, fontWeight: "900" },
  rateChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  rateChip: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },

  // CTA
  ctaRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  bookBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  msgBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Tabs
  tabScroll: { flexGrow: 0, marginBottom: 14 },
  tabContent: { gap: 8, flexDirection: "row" },
  profileTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 18,
    alignItems: "center",
  },
});

// Tab section styles
const tab = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 14 },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },

  // About stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 52,
  },

  // Portfolio
  portfolioGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  portfolioItem: {
    width: (SW - 80) / 2,
    height: (SW - 80) / 2,
    borderRadius: 12,
    overflow: "hidden",
  },
  portfolioImg: { width: "100%", height: "75%" },
  portfolioCaption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
  },

  // Certs
  certRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },

  // Availability
  avRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  avDot: { width: 10, height: 10, borderRadius: 5 },

  // Reviews
  reviewsHeader: { marginBottom: 16 },
  reviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  reviewAuthorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  reviewAvatarImg: { width: 40, height: 40 },
  reviewQuote: { borderLeftWidth: 3, paddingLeft: 10, marginTop: 4 },
});

// Lightbox styles
const lb = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  container: {
    margin: 16,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#111",
  },
  closeBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  image: { width: SW - 32, height: SW - 32 },
  caption: { padding: 16, backgroundColor: "rgba(0,0,0,0.8)" },
});
