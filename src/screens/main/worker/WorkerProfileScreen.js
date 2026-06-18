// src/screens/main/worker/WorkerProfileScreen.js
// Mirrors: website /worker/profile (UserProfile component)
// API: GET /users/:id  →  data.data.user (includes workerProfile)
//      GET /reviews/worker/:id  →  data.data.reviews

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";

import AppText from "../../../components/AppText";
import Avatar from "../../../components/Avatar";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ["About", "Portfolio", "Certifications", "Reviews"];

const DAY_MAP = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(date) {
  if (!date) return "Never";
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function getActiveDays(availability) {
  if (!availability || !Array.isArray(availability)) return new Set();
  return new Set(
    availability
      .filter((a) => a.isAvailable)
      .map((a) => DAY_MAP[a.dayOfWeek] ?? a.dayOfWeek),
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating = 0, size = 14 }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <AppText
          key={s}
          style={{
            fontSize: size,
            color: s <= Math.round(rating) ? "#f59e0b" : "#374151",
          }}
        >
          ★
        </AppText>
      ))}
    </View>
  );
}

// ─── Stat row ─────────────────────────────────────────────────────────────────
function StatRow({ icon, value, label, color, c }) {
  return (
    <View style={[sr.row, { borderBottomColor: c.border }]}>
      <Ionicons
        name={icon}
        size={16}
        color={color ?? c.orange}
        style={{ marginRight: 12, width: 20 }}
      />
      <AppText
        weight="semibold"
        style={{ color: c.text, fontSize: 16, marginRight: 6 }}
      >
        {value}
      </AppText>
      <AppText variant="small" tone="dim">
        {label}
      </AppText>
    </View>
  );
}
const sr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});

// ─── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon, value, onPress, c }) {
  const El = onPress ? Pressable : View;
  return (
    <El onPress={onPress} style={ir.row}>
      <Ionicons
        name={icon}
        size={15}
        color={c.textMuted}
        style={{ marginRight: 12, width: 20 }}
      />
      <AppText
        variant="body"
        style={{ color: c.text, flex: 1 }}
        numberOfLines={1}
      >
        {value}
      </AppText>
    </El>
  );
}
const ir = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
});

// ─── Portfolio lightbox ───────────────────────────────────────────────────────
function Lightbox({ item, onClose, c }) {
  if (!item) return null;
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={lb.backdrop} onPress={onClose}>
        <Pressable
          style={[lb.box, { backgroundColor: c.bgCard }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable onPress={onClose} style={lb.close}>
            <AppText style={{ color: c.text, fontSize: 18 }}>✕</AppText>
          </Pressable>
          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={lb.img}
              resizeMode="contain"
            />
          )}
          <View style={{ padding: 16 }}>
            <AppText
              variant="title"
              weight="semibold"
              style={{ color: c.text }}
            >
              {item.title}
            </AppText>
            {item.description && (
              <AppText
                variant="body"
                tone="dim"
                style={{ marginTop: 6, lineHeight: 22 }}
              >
                {item.description}
              </AppText>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const lb = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 24,
  },
  box: { borderRadius: 20, overflow: "hidden" },
  close: { position: "absolute", top: 12, right: 16, zIndex: 10, padding: 4 },
  img: { width: "100%", height: 280 },
});

// ─── ABOUT TAB ────────────────────────────────────────────────────────────────
function AboutTab({ user, wp, c }) {
  const activeDays = getActiveDays(wp?.availability);

  return (
    <View style={{ gap: 12 }}>
      {/* Bio */}
      <View
        style={[tab.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <AppText
          variant="small"
          weight="semibold"
          style={[tab.sectionLabel, { color: c.textMuted }]}
        >
          ABOUT
        </AppText>
        {user.bio ? (
          <AppText
            variant="body"
            style={{ color: c.text, lineHeight: 24, marginTop: 8 }}
          >
            {user.bio}
          </AppText>
        ) : (
          <AppText variant="body" tone="dim" style={{ marginTop: 8 }}>
            No bio added yet.
          </AppText>
        )}
      </View>

      {/* Availability */}
      {wp?.availability && (
        <View
          style={[
            tab.card,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={[tab.sectionLabel, { color: c.textMuted }]}
          >
            AVAILABILITY
          </AppText>
          <View style={tab.daysRow}>
            {DAYS.map((d) => {
              const active = activeDays.has(d);
              return (
                <View
                  key={d}
                  style={[
                    tab.dayPill,
                    {
                      borderColor: active ? c.orange : c.border,
                      backgroundColor: active
                        ? "rgba(249,115,22,0.15)"
                        : c.bgPanel,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{ color: active ? c.orange : c.textMuted }}
                  >
                    {d}
                  </AppText>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Verification badges */}
      <View style={tab.badgeRow}>
        <View
          style={[
            tab.badge,
            {
              borderColor: user.isEmailVerified ? "#22c55e" : c.border,
              backgroundColor: user.isEmailVerified
                ? "rgba(34,197,94,0.12)"
                : c.bgPanel,
            },
          ]}
        >
          <Ionicons
            name="checkmark-circle"
            size={13}
            color={user.isEmailVerified ? "#22c55e" : c.textMuted}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{
              color: user.isEmailVerified ? "#22c55e" : c.textMuted,
              marginLeft: 5,
            }}
          >
            Email {user.isEmailVerified ? "Verified" : "Unverified"}
          </AppText>
        </View>
        {wp?.verificationStatus === "VERIFIED" && (
          <View
            style={[
              tab.badge,
              {
                borderColor: c.orange,
                backgroundColor: "rgba(249,115,22,0.12)",
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={13} color={c.orange} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange, marginLeft: 5 }}
            >
              ID Verified
            </AppText>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── PORTFOLIO TAB ────────────────────────────────────────────────────────────
function PortfolioTab({ items, c }) {
  const [lightbox, setLightbox] = useState(null);

  if (!items?.length) {
    return (
      <View style={tab.empty}>
        <AppText style={{ fontSize: 40, marginBottom: 12 }}>🖼️</AppText>
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          No portfolio items yet
        </AppText>
      </View>
    );
  }

  // Chunk into pairs for 2-column grid
  const rows = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1]].filter(Boolean));
  }

  return (
    <>
      <View style={{ gap: 10 }}>
        {rows.map((row, ri) => (
          <View key={ri} style={{ flexDirection: "row", gap: 10 }}>
            {row.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setLightbox(item)}
                style={[
                  pt.card,
                  { backgroundColor: c.bgCard, borderColor: c.border, flex: 1 },
                ]}
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={pt.img}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[pt.placeholder, { backgroundColor: c.bgPanel }]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={c.textMuted}
                    />
                  </View>
                )}
                {item.title && (
                  <View style={[pt.footer, { backgroundColor: c.bgPanel }]}>
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: c.text }}
                      numberOfLines={1}
                    >
                      {item.title}
                    </AppText>
                    {item.description && (
                      <AppText
                        style={{ fontSize: 11, color: c.textMuted }}
                        numberOfLines={1}
                      >
                        {item.description}
                      </AppText>
                    )}
                  </View>
                )}
              </Pressable>
            ))}
            {row.length === 1 && <View style={{ flex: 1 }} />}
          </View>
        ))}
      </View>
      <Lightbox item={lightbox} onClose={() => setLightbox(null)} c={c} />
    </>
  );
}

const pt = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  img: { width: "100%", height: 140 },
  placeholder: {
    width: "100%",
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: 8 },
});

// ─── CERTIFICATIONS TAB ──────────────────────────────────────────────────────
function CertificationsTab({ items, c }) {
  if (!items?.length) {
    return (
      <View style={tab.empty}>
        <AppText style={{ fontSize: 40, marginBottom: 12 }}>🏆</AppText>
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          No certifications yet
        </AppText>
      </View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((cert) => (
        <View
          key={cert.id}
          style={[ct.row, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          <View style={[ct.icon, { backgroundColor: "rgba(249,115,22,0.15)" }]}>
            <Ionicons name="ribbon" size={22} color={c.orange} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="body" weight="semibold" style={{ color: c.text }}>
              {cert.name}
            </AppText>
            {cert.issuer && (
              <AppText variant="small" tone="dim">
                Issued by {cert.issuer}
              </AppText>
            )}
            {cert.issuedAt && (
              <AppText variant="small" tone="dim">
                {new Date(cert.issuedAt).toLocaleDateString("en-GB", {
                  month: "short",
                  year: "numeric",
                })}
                {cert.expiryDate &&
                  ` – ${new Date(cert.expiryDate).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
              </AppText>
            )}
          </View>
          {cert.isVerified && (
            <View
              style={[
                ct.verBadge,
                {
                  backgroundColor: "rgba(34,197,94,0.12)",
                  borderColor: "#22c55e",
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
              <AppText
                style={{
                  fontSize: 11,
                  color: "#22c55e",
                  marginLeft: 4,
                  fontWeight: "600",
                }}
              >
                Verified
              </AppText>
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const ct = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
});

// ─── REVIEWS TAB ──────────────────────────────────────────────────────────────
function ReviewsTab({ reviews, total, loading, c }) {
  if (loading)
    return (
      <View style={{ paddingVertical: 40, alignItems: "center" }}>
        <ActivityIndicator color={c.orange} />
      </View>
    );

  if (!reviews.length)
    return (
      <View style={tab.empty}>
        <AppText style={{ fontSize: 40, marginBottom: 12 }}>⭐</AppText>
        <AppText variant="body" weight="semibold" style={{ color: c.text }}>
          No reviews yet
        </AppText>
      </View>
    );

  const avg = reviews.reduce((a, r) => a + r.rating, 0) / reviews.length;

  return (
    <View style={{ gap: 12 }}>
      {/* Summary */}
      <View
        style={[
          rv.summary,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        <AppText
          weight="displayBlack"
          style={{ color: c.text, fontSize: 40, marginRight: 12 }}
        >
          {avg.toFixed(1)}
        </AppText>
        <View>
          <Stars rating={avg} size={18} />
          <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
            {total} review{total !== 1 ? "s" : ""}
          </AppText>
        </View>
      </View>

      {/* List */}
      {reviews.map((r) => (
        <View
          key={r.id}
          style={[
            rv.card,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <View style={rv.top}>
            <Avatar
              uri={r.giver?.avatar}
              firstName={r.giver?.firstName}
              lastName={r.giver?.lastName}
              size={38}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text }}
              >
                {r.giver?.firstName} {r.giver?.lastName}
                <AppText variant="small" tone="dim">
                  {" "}
                  · {r.giver?.role === "HIRER" ? "Hirer" : "Worker"}
                </AppText>
              </AppText>
              {r.booking?.title && (
                <AppText variant="small" tone="dim">
                  {r.booking.category?.icon} {r.booking.title}
                </AppText>
              )}
              <AppText variant="small" tone="dim">
                {new Date(r.createdAt).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Stars rating={r.rating} size={13} />
              <AppText variant="small" tone="dim" style={{ marginTop: 2 }}>
                {r.rating}/5
              </AppText>
            </View>
          </View>
          {r.comment && (
            <AppText
              variant="body"
              style={{
                color: c.textMuted,
                fontStyle: "italic",
                marginTop: 10,
                lineHeight: 22,
              }}
            >
              "{r.comment}"
            </AppText>
          )}
        </View>
      ))}
    </View>
  );
}

const rv = StyleSheet.create({
  summary: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  top: { flexDirection: "row", alignItems: "flex-start" },
});

// ─── Shared tab styles ────────────────────────────────────────────────────────
const tab = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  sectionLabel: { letterSpacing: 0.8, fontSize: 11 },
  daysRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  dayPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  empty: { paddingVertical: 60, alignItems: "center" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerProfileScreen({ navigation }) {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user: me } = useAuthStore();
  const c = th.colors;

  const userId = me?.id;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("About");
  const [reviews, setReviews] = useState([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // ── Load profile ─────────────────────────────────────────────────────────────
  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await client.get(`/users/${userId}`);
      setUser(res.data.data?.user ?? res.data.data);
    } catch {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // ── Load reviews when tab opens ─────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== "Reviews" || !userId) return;
    setReviewsLoading(true);
    client
      .get(`/reviews/worker/${userId}`, { params: { limit: 20 } })
      .then((res) => {
        setReviews(res.data.data?.reviews ?? []);
        setReviewsTotal(res.data.data?.total ?? 0);
      })
      .catch(() => setReviews([]))
      .finally(() => setReviewsLoading(false));
  }, [activeTab, userId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading)
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

  if (!user)
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
        <AppText variant="title" weight="semibold" style={{ color: c.text }}>
          Profile not found
        </AppText>
      </View>
    );

  const wp = user.workerProfile ?? {};
  const portfolio = wp.portfolio ?? [];
  const certs = wp.certifications ?? [];
  const categories = wp.categories ?? [];
  const location = [user.city, user.country].filter(Boolean).join(", ");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingBottom: 48 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadProfile();
          }}
          tintColor={c.orange}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ═══ HERO CARD ═══ */}
      <View
        style={[
          s.heroCard,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {/* Banner strip */}
        <View
          style={[s.heroBanner, { backgroundColor: "rgba(249,115,22,0.2)" }]}
        />

        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={[s.avatarRing, { borderColor: c.orange }]}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={s.avatarImg} />
            ) : (
              <View style={[s.avatarFallback, { backgroundColor: c.bgPanel }]}>
                <AppText
                  weight="semibold"
                  style={{ color: c.orange, fontSize: 26 }}
                >
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* Identity */}
        <AppText weight="displayBlack" style={[s.heroName, { color: c.text }]}>
          {user.firstName} {user.lastName}
        </AppText>

        {/* Role badge */}
        <View
          style={[
            s.rolePill,
            { backgroundColor: "rgba(249,115,22,0.15)", borderColor: c.orange },
          ]}
        >
          <Ionicons
            name="construct-outline"
            size={12}
            color={c.orange}
            style={{ marginRight: 5 }}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange, letterSpacing: 0.5 }}
          >
            WORKER
          </AppText>
        </View>

        {/* Verified shield */}
        {wp.verificationStatus === "VERIFIED" && (
          <View
            style={[
              s.verBadge,
              {
                backgroundColor: "rgba(249,115,22,0.12)",
                borderColor: c.orange,
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark"
              size={12}
              color={c.orange}
              style={{ marginRight: 4 }}
            />
            <AppText
              style={{ fontSize: 11, color: c.orange, fontWeight: "700" }}
            >
              Verified Worker
            </AppText>
          </View>
        )}

        {/* Pro badge */}
        {wp.isPro && (
          <View style={[s.proBadge, { backgroundColor: c.orange }]}>
            <AppText
              style={{
                fontSize: 10,
                color: "#fff",
                fontWeight: "800",
                letterSpacing: 0.5,
              }}
            >
              ⭐ PRO
            </AppText>
          </View>
        )}

        {/* Title */}
        {wp.title && (
          <AppText
            variant="body"
            style={{
              color: c.textMuted,
              fontStyle: "italic",
              marginTop: 4,
              textAlign: "center",
            }}
          >
            {wp.title}
          </AppText>
        )}

        {/* Rating */}
        {wp.avgRating > 0 && (
          <View style={s.ratingRow}>
            <Stars rating={wp.avgRating} size={14} />
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text, marginLeft: 6 }}
            >
              {Number(wp.avgRating).toFixed(1)}
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginLeft: 4 }}>
              ({wp.totalReviews ?? 0} reviews)
            </AppText>
          </View>
        )}

        {/* Edit Profile button */}
        <Pressable
          onPress={() => navigation.navigate("Settings")}
          style={[
            s.editBtn,
            { borderColor: c.border, backgroundColor: c.bgPanel },
          ]}
        >
          <Ionicons
            name="pencil-outline"
            size={15}
            color={c.text}
            style={{ marginRight: 8 }}
          />
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            Edit Profile
          </AppText>
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 12 }}>
        {/* ═══ STATS CARD ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          {wp.hourlyRate != null && (
            <StatRow
              icon="cash-outline"
              value={`${wp.currency ?? user.currency ?? "USD"} ${Number(wp.hourlyRate).toLocaleString()}`}
              label="/hr"
              c={c}
            />
          )}
          {wp.serviceRadius && (
            <StatRow
              icon="location-outline"
              value={`${wp.serviceRadius} km`}
              label="radius"
              c={c}
            />
          )}
          <StatRow
            icon="checkmark-circle-outline"
            value={wp.completedJobs ?? 0}
            label="jobs done"
            c={c}
          />
          <StatRow
            icon="time-outline"
            value={timeAgo(user.lastSeen)}
            label="last seen"
            c={c}
          />
          <StatRow
            icon="calendar-outline"
            value={new Date(user.createdAt).toLocaleDateString("en", {
              month: "short",
              year: "numeric",
            })}
            label="joined"
            c={c}
          />
        </View>

        {/* ═══ INFO CARD ═══ */}
        <View
          style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
        >
          {location && (
            <InfoRow icon="location-outline" value={location} c={c} />
          )}
          {user.email && (
            <InfoRow
              icon="mail-outline"
              value={user.email}
              onPress={() => Linking.openURL(`mailto:${user.email}`)}
              c={c}
            />
          )}
          {user.phone && (
            <InfoRow
              icon="call-outline"
              value={user.phone}
              onPress={() => Linking.openURL(`tel:${user.phone}`)}
              c={c}
            />
          )}
          {(user.currency || wp.currency) && (
            <InfoRow
              icon="globe-outline"
              value={wp.currency ?? user.currency}
              c={c}
            />
          )}
        </View>

        {/* ═══ SPECIALITIES ═══ */}
        {categories.length > 0 && (
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
                color: c.textMuted,
                letterSpacing: 1,
                fontSize: 11,
                marginBottom: 12,
              }}
            >
              SPECIALITIES
            </AppText>
            <View style={s.pillWrap}>
              {categories.map((wc) => {
                const cat = wc.category ?? wc;
                return (
                  <View
                    key={wc.id ?? cat.id}
                    style={[
                      s.catPill,
                      { borderColor: c.border, backgroundColor: c.bgPanel },
                    ]}
                  >
                    <AppText variant="small" style={{ color: c.text }}>
                      {cat.name}
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ═══ TAB BAR ═══ */}
        <View style={[s.tabBar, { borderBottomColor: c.border }]}>
          {TABS.map((t) => {
            const active = activeTab === t;
            return (
              <Pressable
                key={t}
                onPress={() => setActiveTab(t)}
                style={[s.tabBtn, active && { borderBottomColor: c.orange }]}
              >
                <AppText
                  variant="body"
                  weight={active ? "semibold" : "regular"}
                  style={{ color: active ? c.orange : c.textMuted }}
                >
                  {t}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {/* ═══ TAB CONTENT ═══ */}
        {activeTab === "About" && <AboutTab user={user} wp={wp} c={c} />}
        {activeTab === "Portfolio" && <PortfolioTab items={portfolio} c={c} />}
        {activeTab === "Certifications" && (
          <CertificationsTab items={certs} c={c} />
        )}
        {activeTab === "Reviews" && (
          <ReviewsTab
            reviews={reviews}
            total={reviewsTotal}
            loading={reviewsLoading}
            c={c}
          />
        )}
      </View>
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  heroCard: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: "transparent",
    paddingBottom: 20,
    alignItems: "center",
  },
  heroBanner: { width: "100%", height: 100 },
  avatarWrap: { marginTop: -44 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: 10,
    textAlign: "center",
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  verBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 6,
  },
  proBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    marginTop: 6,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    marginTop: 14,
    alignSelf: "stretch",
    marginHorizontal: 16,
  },

  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },

  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },

  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
});
