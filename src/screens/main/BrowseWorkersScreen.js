// src/screens/main/BrowseWorkersScreen.js
// Endpoints: GET /workers/search · GET /search/trending · GET /search/nearby
// Mirrors website Browse Jobs page exactly.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FlatList,
  Image,
  Switch,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import {
  searchWorkers,
  getTrending,
  getNearbyWorkers,
  getFilterOptions,
} from "../../api/workers";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtRate(rate, currency) {
  if (!rate) return null;
  return `${currency ?? ""} ${Number(rate).toLocaleString()}`;
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ── Worker Card ────────────────────────────────────────────────────────────────
function WorkerCard({ worker, onPress, c, t, isNew = false }) {
  const u = worker.user ?? {};
  const wp = worker; // workerProfile fields live at root from /workers/search
  // shape differs between /search (workerProfile root) and /search/trending
  const firstName = u.firstName ?? wp.user?.firstName;
  const lastName = u.lastName ?? wp.user?.lastName;
  const avatar = u.avatar ?? wp.user?.avatar;
  const city = u.city ?? wp.user?.city;
  const country = u.country ?? wp.user?.country;
  const title = wp.title;
  const hourlyRate = wp.hourlyRate;
  const currency = wp.currency ?? wp.user?.currency;
  const avgRating = wp.avgRating;
  const totalReviews = wp.totalReviews ?? 0;
  const completedJobs = wp.completedJobs ?? 0;
  const isAvailable = wp.isAvailable;
  const isVerified = wp.verificationStatus === "VERIFIED";
  const categories = wp.categories ?? [];
  const location = [city, country].filter(Boolean).join(", ");
  const userId = u.id ?? wp.user?.id ?? wp.userId;

  return (
    <Pressable
      onPress={() => onPress(userId)}
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Top badges row */}
      <View style={styles.cardBadgeRow}>
        {isNew && (
          <View style={[styles.newBadge, { backgroundColor: "#1e1b4b" }]}>
            <AppText
              style={{ color: "#818cf8", fontSize: 11, fontWeight: "700" }}
            >
              NEW
            </AppText>
          </View>
        )}
        {isVerified && (
          <AppText style={[styles.shieldBadge, { marginLeft: "auto" }]}>
            <Ionicons name="shield-checkmark" size={21} color="#22c55e" />
          </AppText>
        )}
        {!isNew && !isVerified && <View style={{ flex: 1 }} />}
      </View>

      {/* Avatar row */}
      <View style={styles.avatarRow}>
        <View style={styles.avatarWrap}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: c.orangeDim, borderColor: c.border },
            ]}
          >
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <AppText
                style={{ color: c.orange, fontWeight: "700", fontSize: 18 }}
              >
                {initials(firstName, lastName)}
              </AppText>
            )}
          </View>
          {/* Available green dot */}
          <View
            style={[
              styles.availDot,
              { backgroundColor: isAvailable ? "#22c55e" : "#6b7280" },
            ]}
          />
        </View>
      </View>

      {/* Name + title */}
      <AppText
        variant="title"
        weight="semibold"
        style={{ color: c.text, marginTop: 8 }}
      >
        {firstName} {lastName}
      </AppText>
      {!!title && (
        <AppText variant="body" style={{ color: c.textMuted, marginTop: 2 }}>
          {title}
        </AppText>
      )}

      {/* Primary category chip */}
      {categories.length > 0 && (
        <Pressable
          style={[
            styles.catChip,
            { backgroundColor: c.orangeDim, borderColor: c.orange },
          ]}
        >
          {categories[0]?.category?.icon ? (
            <AppText style={{ fontSize: 13, marginRight: 4 }}>
              {categories[0].category.icon}
            </AppText>
          ) : (
            <AppText style={{ fontSize: 13, marginRight: 4 }}>🔧</AppText>
          )}
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {categories[0]?.category?.name ?? categories[0]?.name}
          </AppText>
        </Pressable>
      )}

      {/* Location */}
      {!!location && (
        <AppText variant="small" style={{ color: c.textMuted, marginTop: 6 }}>
          📍 {location}
        </AppText>
      )}

      {/* Rating + jobs */}
      <View style={styles.ratingRow}>
        <AppText style={{ fontSize: 14, color: c.orange }}>★</AppText>
        {avgRating > 0 ? (
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.orange, marginLeft: 4 }}
          >
            {Number(avgRating).toFixed(1)}
          </AppText>
        ) : (
          <AppText variant="small" style={{ color: c.orange, marginLeft: 4 }}>
            {t("browse.new")}
          </AppText>
        )}
        <AppText variant="small" style={{ color: c.textMuted, marginLeft: 4 }}>
          ({totalReviews})
        </AppText>
        <AppText
          variant="small"
          style={{ color: c.textMuted, marginLeft: "auto" }}
        >
          {completedJobs} {t("browse.jobs")}
        </AppText>
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: c.border }]} />

      {/* Rate + availability */}
      <View style={styles.rateRow}>
        <AppText style={{ fontSize: 16, fontWeight: "700", color: c.text }}>
          {fmtRate(hourlyRate, currency)}
          <AppText variant="small" style={{ color: c.textMuted }}>
            /hr
          </AppText>
        </AppText>
        <View
          style={[
            styles.availChip,
            {
              backgroundColor: isAvailable
                ? "rgba(34,197,94,0.12)"
                : "rgba(107,114,128,0.12)",
            },
          ]}
        >
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isAvailable ? "#22c55e" : "#6b7280",
              letterSpacing: 0.8,
            }}
          >
            {isAvailable ? t("browse.available") : t("browse.unavailable")}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

// ── Filter Panel ───────────────────────────────────────────────────────────────
function FilterPanel({
  visible,
  onClose,
  filters,
  setFilters,
  options,
  c,
  t,
  th,
}) {
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  const apply = () => {
    setFilters(local);
    onClose();
  };
  const reset = () => {
    setLocal({});
    setFilters({});
    onClose();
  };
  const set = (key, val) => setLocal((f) => ({ ...f, [key]: val }));

  const categories = options.categories ?? [];
  const languages = options.languages ?? [];
  const distances = options.distances ?? [5, 10, 25, 50, 100, 200];

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fp.backdrop} onPress={onClose}>
        <Pressable
          style={[
            fp.sheet,
            {
              backgroundColor: th.mode === "dark" ? "#111118" : "#ffffff",
              borderTopColor: c.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[fp.handle, { backgroundColor: c.border }]} />
          {/* Header */}
          <View style={fp.header}>
            <AppText
              variant="title"
              weight="semibold"
              style={{ color: c.text }}
            >
              {t("browse.filters")}
            </AppText>
            <Pressable
              onPress={onClose}
              style={[
                fp.closeBtn,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <AppText style={{ color: c.text }}>✕</AppText>
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {/* Availability */}
            <SectionLabel label={t("browse.filter.availability")} c={c} />
            <View style={fp.row}>
              <Switch
                value={local.available !== "false"}
                onValueChange={(v) => set("available", v ? "true" : "false")}
                trackColor={{ true: c.orange, false: c.border }}
                thumbColor="#fff"
              />
              <AppText variant="body" style={{ color: c.text, marginLeft: 12 }}>
                Available only
              </AppText>
            </View>

            {/* Category */}
            <SectionLabel label={t("browse.filter.category")} c={c} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                flexDirection: "row",
                paddingBottom: 4,
              }}
            >
              {[
                { id: null, name: t("browse.filter.allCategories") },
                ...categories,
              ].map((cat) => {
                const active = (local.category ?? null) === (cat.slug ?? null);
                return (
                  <Pressable
                    key={cat.id ?? "all"}
                    onPress={() => set("category", cat.slug ?? null)}
                    style={[
                      fp.chip,
                      {
                        backgroundColor: active ? c.orange : c.bgInput,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? "#fff" : c.text }}
                    >
                      {cat.icon ? `${cat.icon} ` : ""}
                      {cat.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* City */}
            <SectionLabel label={t("browse.filter.city")} c={c} />
            <TextInput
              value={local.city ?? ""}
              onChangeText={(v) => set("city", v)}
              placeholder={t("browse.filter.cityPlaceholder") || "e.g. Lagos"}
              placeholderTextColor={c.textMuted}
              style={[
                fp.input,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                },
              ]}
            />

            {/* Hourly Rate */}
            <SectionLabel label={t("browse.filter.hourlyRate")} c={c} />
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <TextInput
                value={local.minRate ?? ""}
                onChangeText={(v) => set("minRate", v)}
                placeholder={t("browse.filter.min")}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={[
                  fp.input,
                  {
                    flex: 1,
                    color: c.text,
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              />
              <AppText style={{ color: c.textMuted }}>–</AppText>
              <TextInput
                value={local.maxRate ?? ""}
                onChangeText={(v) => set("maxRate", v)}
                placeholder={t("browse.filter.max")}
                placeholderTextColor={c.textMuted}
                keyboardType="numeric"
                style={[
                  fp.input,
                  {
                    flex: 1,
                    color: c.text,
                    backgroundColor: c.bgInput,
                    borderColor: c.border,
                  },
                ]}
              />
            </View>

            {/* Min Rating */}
            <SectionLabel label={t("browse.filter.minRating")} c={c} />
            {[
              { label: t("browse.filter.rating4"), val: "4" },
              { label: t("browse.filter.rating3"), val: "3" },
              { label: t("browse.filter.anyRating"), val: null },
            ].map((r) => {
              const active = (local.rating ?? null) === r.val;
              return (
                <Pressable
                  key={r.label}
                  onPress={() => set("rating", r.val)}
                  style={[
                    fp.optionRow,
                    {
                      borderColor: active ? c.orange : c.border,
                      backgroundColor: active ? `${c.orange}22` : c.bgInput,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{ color: active ? c.orange : c.text }}
                  >
                    {r.label}
                  </AppText>
                </Pressable>
              );
            })}

            {/* Max Distance */}
            <SectionLabel label={t("browse.filter.maxDistance")} c={c} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                flexDirection: "row",
                paddingBottom: 4,
              }}
            >
              {[
                { label: t("browse.filter.anyDistance"), val: null },
                ...distances.map((d) => ({ label: `${d}km`, val: String(d) })),
              ].map((d) => {
                const active = (local.radius ?? null) === d.val;
                return (
                  <Pressable
                    key={d.label}
                    onPress={() => set("radius", d.val)}
                    style={[
                      fp.chip,
                      {
                        backgroundColor: active ? c.orange : c.bgInput,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? "#fff" : c.text }}
                    >
                      {d.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Language */}
            <SectionLabel label={t("browse.filter.language")} c={c} />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                flexDirection: "row",
                paddingBottom: 4,
              }}
            >
              {[t("browse.filter.anyLanguage"), ...languages].map((lang) => {
                const val =
                  lang === t("browse.filter.anyLanguage") ? null : lang;
                const active = (local.language ?? null) === val;
                return (
                  <Pressable
                    key={lang}
                    onPress={() => set("language", val)}
                    style={[
                      fp.chip,
                      {
                        backgroundColor: active ? c.orange : c.bgInput,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? "#fff" : c.text }}
                    >
                      {lang}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Gender */}
            <SectionLabel label={t("browse.filter.gender")} c={c} />
            {[
              { label: t("browse.filter.any"), val: null },
              { label: t("browse.filter.male"), val: t("browse.filter.male") },
              {
                label: t("browse.filter.female"),
                val: t("browse.filter.female"),
              },
              {
                label: t("browse.filter.nonBinary"),
                val: t("browse.filter.nonBinary"),
              },
            ].map((g) => {
              const active = (local.gender ?? null) === g.val;
              return (
                <Pressable
                  key={g.label}
                  onPress={() => set("gender", g.val)}
                  style={[
                    fp.optionRow,
                    {
                      borderColor: active ? c.orange : c.border,
                      backgroundColor: active ? `${c.orange}22` : c.bgInput,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{ color: active ? c.orange : c.text }}
                  >
                    {g.label}
                  </AppText>
                </Pressable>
              );
            })}

            {/* Verification */}
            <SectionLabel label={t("browse.filter.verification")} c={c} />
            {[
              { label: t("browse.filter.any"), val: null },
              { label: t("browse.filter.verified"), val: "VERIFIED" },
            ].map((v) => {
              const active = (local.verification ?? null) === v.val;
              return (
                <Pressable
                  key={v.label}
                  onPress={() => set("verification", v.val)}
                  style={[
                    fp.optionRow,
                    {
                      borderColor: active ? c.orange : c.border,
                      backgroundColor: active ? `${c.orange}22` : c.bgInput,
                    },
                  ]}
                >
                  <AppText
                    variant="body"
                    style={{ color: active ? c.orange : c.text }}
                  >
                    {v.label}
                  </AppText>
                </Pressable>
              );
            })}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer buttons */}
          <View style={fp.footer}>
            <Pressable
              onPress={reset}
              style={[fp.resetBtn, { borderColor: c.border }]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text }}
              >
                Reset
              </AppText>
            </Pressable>
            <Pressable
              onPress={apply}
              style={[fp.applyBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: "#fff" }}
              >
                Apply Filters
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SectionLabel({ label, c }) {
  return (
    <AppText
      variant="small"
      weight="semibold"
      style={{
        color: c.textMuted,
        letterSpacing: 0.8,
        marginTop: 20,
        marginBottom: 10,
      }}
    >
      {label}
    </AppText>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            styles.skCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
      ))}
    </View>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
const TABS = ["trending", "results", "nearby", "filters"];

export default function BrowseWorkersScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("trending");
  const [workers, setWorkers] = useState([]);
  const [trending, setTrending] = useState({ top: [], newWorkers: [] });
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState({});

  // ── Load trending on mount ──────────────────────────────────────────────────
  const loadTrending = useCallback(async () => {
    try {
      const data = await getTrending();
      // Trending may return { workers } or { topRated, newWorkers }
      const all = data.topWorkers ?? data.workers ?? data.topRated ?? [];
      const newW = data.recentlyJoined ?? data.newWorkers ?? [];
      setTrending({ top: all.slice(0, 10), newWorkers: newW.slice(0, 10) });
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadNearby = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error(t("browse.filter.locationDenied"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const data = await getNearbyWorkers({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        radius: 25,
      });
      setNearby(data.workers ?? []);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTrending();
    getFilterOptions()
      .then(setFilterOptions)
      .catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!query.trim() && Object.keys(filters).length === 0) return;
    setActiveTab("results");
    setLoading(true);
    try {
      const data = await searchWorkers({
        q: query.trim(),
        ...filters,
        limit: 30,
      });
      setWorkers(data.workers ?? []);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        toast.error(t("browse.filter.locationDenied"));
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setActiveTab("nearby");
      loadNearby(loc.coords.latitude, loc.coords.longitude);
    } catch {
      toast.error(t("toast.unknownError"));
    }
  };

  const handleTabChange = (tab) => {
    if (tab === "filters") {
      setShowFilters(true);
      return;
    }
    if (tab === "nearby") {
      setActiveTab("nearby");
      loadNearby();
      return;
    }
    setActiveTab(tab);
    if (tab === "trending" && trending.top.length === 0) {
      setLoading(true);
      loadTrending();
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (activeTab === "trending") loadTrending();
    else if (activeTab === "nearby") {
      loadNearby();
      setRefreshing(false);
    } else {
      setRefreshing(false);
    }
  };

  const goToProfile = (userId) => {
    navigation.navigate("WorkerProfile", { userId });
  };

  // Build list data for FlatList
  const listData =
    activeTab === "trending"
      ? [] // trending uses ListHeader sections
      : activeTab === "results"
        ? workers
        : nearby;

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={listData}
        keyExtractor={(item, i) => item.user?.id ?? item.userId ?? String(i)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View>
            {/* Search bar */}
            <View
              style={[
                styles.searchBar,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText
                style={{
                  color: c.textMuted,
                  lineHeight: 25,
                  fontSize: 18,
                  marginRight: 6,
                }}
              >
                🔍
              </AppText>
              <TextInput
                value={query}
                onChangeText={setQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                placeholder={t("browse.searchPlaceholder")}
                placeholderTextColor={c.textMuted}
                style={[styles.searchInput, { color: c.text }]}
              />
              <Pressable
                style={[
                  styles.iconBtn,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
                // In the mic button onPress:
                onPress={() => toast.error(t("browse.filter.voiceSearch"))}
              >
                <AppText>🎤</AppText>
              </Pressable>
              <Pressable
                style={[
                  styles.iconBtn,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
                onPress={handleLocationSearch}
              >
                <AppText>📍</AppText>
              </Pressable>
              <Pressable
                onPress={handleSearch}
                style={[styles.searchBtn, { backgroundColor: c.orange }]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#fff" }}
                >
                  {t("browse.search")}
                </AppText>
              </Pressable>
            </View>

            {/* Filter tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}
            >
              {[
                { key: "trending", label: t("browse.trending") },
                { key: "results", label: t("browse.results") },
                { key: "nearby", label: t("browse.nearby") },
                { key: "filters", label: `🔧 ${t("browse.filters")}` },
              ].map(({ key, label }) => {
                const active = activeTab === key && key !== "filters";
                return (
                  <Pressable
                    key={key}
                    onPress={() => handleTabChange(key)}
                    style={[
                      styles.tab,
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
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Trending sections */}
            {activeTab === "trending" &&
              (loading ? (
                <Skeleton c={c} />
              ) : (
                <View>
                  {trending.top.length > 0 && (
                    <>
                      <AppText style={[styles.sectionTitle, { color: c.text }]}>
                        {t("browse.topRated")}
                      </AppText>
                      {trending.top.map((w, i) => (
                        <View
                          key={w.user?.id ?? i}
                          style={{ marginBottom: 12 }}
                        >
                          <WorkerCard
                            worker={w}
                            onPress={goToProfile}
                            c={c}
                            t={t}
                          />
                        </View>
                      ))}
                    </>
                  )}
                  {trending.newWorkers.length > 0 && (
                    <>
                      <AppText
                        style={[
                          styles.sectionTitle,
                          { color: c.text, marginTop: 8 },
                        ]}
                      >
                        {t("browse.newOnPlatform")}
                      </AppText>
                      {trending.newWorkers.map((w, i) => (
                        <View
                          key={w.user?.id ?? `new${i}`}
                          style={{ marginBottom: 12 }}
                        >
                          <WorkerCard
                            worker={w}
                            onPress={goToProfile}
                            c={c}
                            t={t}
                            isNew
                          />
                        </View>
                      ))}
                    </>
                  )}
                  {trending.top.length === 0 &&
                    trending.newWorkers.length === 0 && (
                      <EmptyState c={c} t={t} />
                    )}
                </View>
              ))}

            {/* Results/Nearby headings */}
            {activeTab === "results" && !loading && (
              <AppText style={[styles.sectionTitle, { color: c.text }]}>
                {t("browse.searchResults")} ({workers.length})
              </AppText>
            )}
            {activeTab === "nearby" && !loading && (
              <AppText style={[styles.sectionTitle, { color: c.text }]}>
                {t("browse.nearbyWorkers")}
              </AppText>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <WorkerCard worker={item} onPress={goToProfile} c={c} t={t} />
          </View>
        )}
        ListEmptyComponent={
          activeTab !== "trending" ? (
            loading ? (
              <Skeleton c={c} />
            ) : (
              <EmptyState c={c} t={t} />
            )
          ) : null
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />

      <FilterPanel
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        setFilters={(f) => {
          setFilters(f);
          if (query.trim()) handleSearch();
        }}
        options={filterOptions}
        c={c}
        t={t}
        th={th} // ← add this
      />
    </View>
  );
}

function EmptyState({ c, t }) {
  return (
    <View style={styles.empty}>
      <AppText style={{ fontSize: 44 }}>🔍</AppText>
      <AppText
        variant="body"
        weight="semibold"
        style={{ color: c.text, marginTop: 12 }}
      >
        {t("browse.noResults")}
      </AppText>
      <AppText variant="small" style={{ color: c.textMuted, marginTop: 6 }}>
        {t("browse.noResultsSub")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 15 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },

  // Tabs
  tabsScroll: { flexGrow: 0, marginBottom: 16 },
  tabsContent: { gap: 8, flexDirection: "row" },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },

  // Section titles
  sectionTitle: { fontSize: 20, fontWeight: "800", marginBottom: 12 },

  // Worker card
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  cardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    minHeight: 24,
  },
  newBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  shieldBadge: { fontSize: 18 },
  avatarWrap: { position: "relative", alignSelf: "flex-start" },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 64, height: 64 },
  availDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#0c0c18",
  },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  catChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 8,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },

  skCard: {
    height: 200,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});

const fp = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    height: "85%", // ← was maxHeight: "75%"
    padding: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 4,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  applyBtn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 20,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  optionRow: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
});
