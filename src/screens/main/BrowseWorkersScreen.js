// src/screens/main/BrowseWorkersScreen.js
//
// Verbatim port of pages/search/SearchPage.jsx + SearchPage.module.css.
//
// Mobile layout mirrors web's ≤767px breakpoint:
//   · Worker grid = 2 columns via strict 48% width + space-between
//   · Filter sidebar slides in FROM THE LEFT as a ~300px drawer (Animated)
//   · Backdrop fades to rgba(0,0,0,0.6) alongside the drawer
//   · All filter sections stacked vertically (no horizontal pills)
//   · Category / Distance / Language use bottom-sheet pickers
//     (RN equivalent of web's <select>)

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as Location from "expo-location";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PageSkeleton from "../../components/PageSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import useSavedWorker from "../../hooks/useSavedWorker";
import {
  FaSearch,
  FaSlidersH,
  FaXmark,
  FaStar,
  FaInfoCircle,
  FaFrown,
  FaArrowLeft,
  FaArrowRight,
  FaTool,
  FaBookmark,
  FaMapMarkerAlt,
  FaShieldAlt,
  FaMicrophone,
  FaStop,
} from "../../icons/fa";

// ── Speech recognition — safe require ─────────────────────────────
let SR = null;
try {
  SR = require("expo-speech-recognition");
} catch {}

// ── Constants (verbatim from web) ─────────────────────────────────
const RATINGS = [
  { label: "4★ & above", value: 4 },
  { label: "3★ & above", value: 3 },
  { label: "Any rating", value: "" },
];

const DISTANCES = [5, 10, 25, 50, 100, 200];

const GENDERS = [
  { label: "Any", value: "" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Non-binary", value: "Non-binary" },
];

const VERIFICATIONS = [
  { label: "Any", value: "" },
  { label: "Verified", value: "VERIFIED" },
];

const DEFAULT_FILTERS = {
  category: "",
  city: "",
  country: "",
  minRate: "",
  maxRate: "",
  rating: "",
  available: "true",
  language: "",
  gender: "",
  verification: "",
  radius: "",
  lat: "",
  lng: "",
};

const DRAWER_WIDTH = Math.min(300, Dimensions.get("window").width * 0.85);

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════
export default function BrowseWorkersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const initialQuery = route.params?.q || "";

  const [query, setQuery] = useState(initialQuery);
  const [input, setInput] = useState(initialQuery);
  const [workers, setWorkers] = useState([]);
  const [trending, setTrending] = useState({
    categories: [],
    topWorkers: [],
    recentlyJoined: [],
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterMeta, setFilterMeta] = useState({
    categories: [],
    locations: [],
    rateRange: { min: 0, max: 500 },
    languages: [],
    distances: DISTANCES,
  });
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState(initialQuery ? "results" : "trending");
  const [showFilters, setShowFilters] = useState(false);
  const [nearbyWorkers, setNearbyWorkers] = useState([]);
  const [nearbyNote, setNearbyNote] = useState(null);
  const [nearbyError, setNearbyError] = useState(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  // ── Filter drawer animation ────────────────────────────────
  const drawerAnim = useRef(new Animated.Value(0)).current;

  const openFilters = () => {
    setShowFilters(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeFilters = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowFilters(false);
    });
  };

  // ── Pickers ────────────────────────────────────────────────
  const [catPickerOpen, setCatPickerOpen] = useState(false);
  const [distPickerOpen, setDistPickerOpen] = useState(false);
  const [langPickerOpen, setLangPickerOpen] = useState(false);

  // ── Voice ──────────────────────────────────────────────────
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [micPermission, setMicPermission] = useState("undetermined");

  useEffect(() => {
    (async () => {
      if (!SR?.ExpoSpeechRecognitionModule) return;
      try {
        const mod = SR.ExpoSpeechRecognitionModule;
        const avail = mod.isRecognitionAvailable?.() ?? false;
        setVoiceAvailable(!!avail);
        const perm = await mod.getPermissionsAsync?.();
        setMicPermission(perm?.status ?? "undetermined");
      } catch {
        setVoiceAvailable(false);
      }
    })();
  }, []);

  const startVoice = async () => {
    if (!SR?.ExpoSpeechRecognitionModule) {
      toast.info("Voice search is not available on this build.");
      return;
    }
    try {
      const mod = SR.ExpoSpeechRecognitionModule;

      let perm = await mod.getPermissionsAsync?.();
      if (perm?.status !== "granted") {
        perm = await mod.requestPermissionsAsync?.();
      }
      if (perm?.status !== "granted") {
        setMicPermission(perm?.status ?? "denied");
        toast.info(
          perm?.canAskAgain === false
            ? "Microphone permission is disabled. Enable it in Settings → Apps → SkilledProz → Permissions."
            : "Microphone permission required for voice search.",
        );
        return;
      }

      setMicPermission("granted");
      mod.start({ lang: "en-US", interimResults: true, continuous: false });
      setListening(true);
    } catch {
      toast.error("Failed to start voice search.");
      setListening(false);
    }
  };

  const stopVoice = () => {
    try {
      SR?.ExpoSpeechRecognitionModule?.stop?.();
    } catch {}
    setListening(false);
  };

  useEffect(() => {
    if (!SR?.ExpoSpeechRecognitionModule) return;
    const mod = SR.ExpoSpeechRecognitionModule;
    const onResult = mod.addListener?.("result", (e) => {
      const t = e?.results?.[0]?.transcript;
      if (t) setInput(t);
    });
    const onEnd = mod.addListener?.("end", () => setListening(false));
    const onErr = mod.addListener?.("error", () => setListening(false));
    return () => {
      onResult?.remove?.();
      onEnd?.remove?.();
      onErr?.remove?.();
    };
  }, []);

  // ── Initial fetch ──────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      client
        .get("/search/filters")
        .then((r) => setFilterMeta(r.data.data || {})),
      client
        .get("/search/trending")
        .then((r) => setTrending(r.data.data || {})),
    ])
      .catch(() => {})
      .finally(() => setInitialLoading(false));

    if (initialQuery) doSearch(initialQuery, DEFAULT_FILTERS, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Debounced suggestions ──────────────────────────────────
  useEffect(() => {
    if (input.length < 2) {
      setSuggestions(null);
      return;
    }
    const t = setTimeout(() => {
      client
        .get("/search", { params: { q: input, type: "suggest" } })
        .then((r) => setSuggestions(r.data.data?.suggestions || null))
        .catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [input]);

  async function doSearch(q, f, p) {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    setTab("results");
    try {
      const params = { q, type: "workers", page: p, limit: 12 };
      [
        "category",
        "city",
        "country",
        "minRate",
        "maxRate",
        "rating",
        "available",
        "language",
        "gender",
        "verification",
        "radius",
        "lat",
        "lng",
      ].forEach((k) => {
        if (f[k]) params[k] = f[k];
      });

      const res = await client.get("/search", { params });
      setWorkers(res.data.data?.workers?.data || []);
      setTotal(res.data.data?.workers?.total || 0);
      setPages(res.data.data?.workers?.pages || 1);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch() {
    setSuggestions(null);
    setPage(1);
    setQuery(input);
    doSearch(input, filters, 1);
  }

  function applyFilter(key, val) {
    const next = { ...filters, [key]: val };
    setFilters(next);
    setPage(1);
    if (query) doSearch(query, next, 1);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
    if (query) doSearch(query, DEFAULT_FILTERS, 1);
  }

  function changePage(p) {
    setPage(p);
    doSearch(query, filters, p);
  }

  async function findNearby() {
    setLocating(true);
    setNearbyLoading(true);
    setNearbyError(null);
    setTab("nearby");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setNearbyError("permission_denied");
        setNearbyWorkers([]);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setFilters((f) => ({ ...f, lat: String(lat), lng: String(lng) }));

      const params = {
        lat,
        lng,
        radius: filters.radius || 25,
        ...(filters.category && { category: filters.category }),
        ...(filters.language && { language: filters.language }),
        ...(filters.gender && { gender: filters.gender }),
        ...(filters.verification && { verification: filters.verification }),
      };
      const res = await client.get("/search/nearby", { params });
      setNearbyWorkers(res.data.data?.workers || []);
      setNearbyNote(res.data.data?.expansionNote || null);
    } catch (err) {
      const status = err?.response?.status;
      setNearbyError(status === 500 ? "backend_error" : "unknown");
      setNearbyWorkers([]);
    } finally {
      setLocating(false);
      setNearbyLoading(false);
    }
  }

  const activeFiltersCount = useMemo(
    () =>
      Object.entries(filters).filter(
        ([k, v]) =>
          v &&
          !(k === "available" && v === "true") &&
          !["lat", "lng"].includes(k),
      ).length,
    [filters],
  );

  // ═════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════

  if (initialLoading) {
    return (
      <AppScreen scroll={false}>
        <PageSkeleton variant="list" rows={6} />
      </AppScreen>
    );
  }

  return (
    <AppScreen contentContainerStyle={{ paddingBottom: 40 }}>
      {/* ═══════ SEARCH BAR ═══════ */}
      <View style={{ marginBottom: 16 }}>
        <View
          style={[
            styles.searchBar,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <FaSearch size={15} color={c.textDim} />
          <TextInput
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSearch}
            placeholder="Search plumbers, electricians, cleaners..."
            placeholderTextColor={c.textMuted}
            returnKeyType="search"
            style={[styles.searchInput, { color: c.text }]}
          />
          {input ? (
            <Pressable onPress={() => setInput("")} hitSlop={8}>
              <FaXmark size={16} color={c.textMuted} />
            </Pressable>
          ) : null}
          {voiceAvailable ? (
            <Pressable
              onPress={listening ? stopVoice : startVoice}
              hitSlop={6}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: listening ? c.redDim : c.bgCard,
                  borderColor: listening ? c.red : c.border,
                },
              ]}
            >
              {listening ? (
                <FaStop size={13} color={c.red} />
              ) : (
                <FaMicrophone
                  size={13}
                  color={micPermission === "denied" ? c.textMuted : c.textDim}
                />
              )}
            </Pressable>
          ) : null}
          <Pressable
            onPress={findNearby}
            hitSlop={6}
            style={[
              styles.iconBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            {locating ? (
              <ActivityIndicator size="small" color={c.orange} />
            ) : (
              <FaMapMarkerAlt size={13} color={c.textDim} />
            )}
          </Pressable>
          <Pressable
            onPress={handleSearch}
            style={({ pressed }) => [
              styles.searchSubmit,
              { backgroundColor: c.orange, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
              Search
            </AppText>
          </Pressable>
        </View>

        {/* Suggestions */}
        {suggestions ? (
          <View
            style={[
              styles.suggestions,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            {suggestions.categories?.length > 0 ? (
              <SugGroup title="Categories" c={c}>
                {suggestions.categories.map((cat) => (
                  <Pressable
                    key={cat.slug}
                    onPress={() => {
                      setInput(cat.name);
                      applyFilter("category", cat.slug);
                      setSuggestions(null);
                      handleSearch();
                    }}
                    style={styles.sugItem}
                  >
                    <FaTool size={13} color={c.textDim} />
                    <AppText
                      style={{
                        fontSize: 13,
                        color: c.textDim,
                        marginLeft: 8,
                        flex: 1,
                      }}
                    >
                      {cat.icon ? `${cat.icon} ` : ""}
                      {cat.name}
                    </AppText>
                  </Pressable>
                ))}
              </SugGroup>
            ) : null}
            {suggestions.workers?.length > 0 ? (
              <SugGroup title="Workers" c={c}>
                {suggestions.workers.map((w) => (
                  <Pressable
                    key={w.id}
                    onPress={() => {
                      setSuggestions(null);
                      navigation.navigate("WorkerProfile", { userId: w.id });
                    }}
                    style={styles.sugItem}
                  >
                    <View
                      style={[
                        styles.sugAvatar,
                        {
                          backgroundColor: c.orangeDim,
                          borderColor: c.orangeGlow,
                        },
                      ]}
                    >
                      {w.avatar ? (
                        <Image
                          source={{ uri: w.avatar }}
                          style={{ width: "100%", height: "100%" }}
                        />
                      ) : (
                        <AppText style={{ fontSize: 10, color: c.orange }}>
                          {w.firstName?.[0]}
                          {w.lastName?.[0]}
                        </AppText>
                      )}
                    </View>
                    <AppText
                      style={{
                        fontSize: 13,
                        color: c.textDim,
                        marginLeft: 8,
                        flex: 1,
                      }}
                      numberOfLines={1}
                    >
                      {w.firstName} {w.lastName}
                    </AppText>
                    {w.workerProfile?.title ? (
                      <AppText
                        style={{ fontSize: 10, color: c.textMuted }}
                        numberOfLines={1}
                      >
                        {w.workerProfile.title}
                      </AppText>
                    ) : null}
                  </Pressable>
                ))}
              </SugGroup>
            ) : null}
            {suggestions.cities?.length > 0 ? (
              <SugGroup title="Cities" c={c}>
                {suggestions.cities.map((city, i) => (
                  <Pressable
                    key={i}
                    onPress={() => {
                      setInput(city.city);
                      applyFilter("city", city.city);
                      setSuggestions(null);
                    }}
                    style={styles.sugItem}
                  >
                    <FaMapMarkerAlt size={12} color={c.textDim} />
                    <AppText
                      style={{ fontSize: 13, color: c.textDim, marginLeft: 8 }}
                    >
                      {city.city}, {city.country}
                    </AppText>
                  </Pressable>
                ))}
              </SugGroup>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* ═══════ TAB BAR ═══════ */}
      <View style={styles.tabBar}>
        <View style={styles.tabs}>
          {[
            { key: "trending", label: "Trending" },
            {
              key: "results",
              label: `Results${total > 0 ? ` (${total})` : ""}`,
            },
            { key: "nearby", label: "Nearby" },
          ].map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                onPress={() => setTab(t.key)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? c.orangeDim : "transparent",
                    borderColor: active ? c.orange : c.border,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                  }}
                  numberOfLines={1}
                >
                  {t.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={openFilters}
          style={[
            styles.mobileFilterBtn,
            {
              backgroundColor: c.bgPanel,
              borderColor: activeFiltersCount > 0 ? c.orange : c.border,
            },
          ]}
        >
          <FaSlidersH
            size={11}
            color={activeFiltersCount > 0 ? c.orange : c.textDim}
          />
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: activeFiltersCount > 0 ? c.orange : c.textDim,
              marginLeft: 4,
            }}
          >
            Filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ""}
          </AppText>
        </Pressable>
      </View>

      {/* ═══════ TRENDING ═══════ */}
      {tab === "trending" ? (
        <View style={{ gap: 24 }}>
          {trending.categories?.length > 0 ? (
            <View>
              <AppText style={styles.trendTitle(c)}>Popular Categories</AppText>
              <View style={styles.catGrid}>
                {trending.categories.map((cat) => (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      applyFilter("category", cat.slug);
                      setTab("results");
                    }}
                    style={({ pressed }) => [
                      styles.catCard,
                      {
                        backgroundColor: c.bgPanel,
                        borderColor: c.border,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText style={{ fontSize: 22 }}>
                      {cat.icon || "🛠️"}
                    </AppText>
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: c.text,
                        textAlign: "center",
                        marginTop: 4,
                      }}
                      numberOfLines={2}
                    >
                      {cat.name}
                    </AppText>
                    <AppText
                      style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}
                    >
                      {cat._count?.workers || 0} workers
                    </AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
          {trending.topWorkers?.length > 0 ? (
            <View>
              <AppText style={styles.trendTitle(c)}>Top Rated Workers</AppText>
              <View style={styles.workerGrid}>
                {trending.topWorkers.map((w, i) => (
                  <WorkerCard
                    key={w.user?.id || i}
                    worker={w}
                    c={c}
                    navigation={navigation}
                    currentUser={user}
                  />
                ))}
              </View>
            </View>
          ) : null}
          {trending.recentlyJoined?.length > 0 ? (
            <View>
              <AppText style={styles.trendTitle(c)}>New on SkilledProz</AppText>
              <View style={styles.workerGrid}>
                {trending.recentlyJoined.map((w, i) => (
                  <WorkerCard
                    key={w.user?.id || i}
                    worker={w}
                    isNew
                    c={c}
                    navigation={navigation}
                    currentUser={user}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ═══════ RESULTS ═══════ */}
      {tab === "results" ? (
        <>
          {!query ? (
            <PromptBlock c={c} />
          ) : loading ? (
            <View style={styles.workerGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <WorkerSkeleton key={i} c={c} />
              ))}
            </View>
          ) : workers.length === 0 ? (
            <EmptyBlock
              icon={<FaFrown size={36} color={c.textMuted} />}
              title={`No workers found for "${query}"`}
              text="Try different keywords or adjust your filters."
              ctaLabel="Clear Filters"
              onCta={clearFilters}
              c={c}
            />
          ) : (
            <>
              <AppText style={styles.resultsMeta(c)}>
                {total} worker{total !== 1 ? "s" : ""} found for "{query}"
              </AppText>
              <View style={styles.workerGrid}>
                {workers.map((w, i) => (
                  <WorkerCard
                    key={w.user?.id || i}
                    worker={w}
                    showDistance={!!w._distanceKm}
                    c={c}
                    navigation={navigation}
                    currentUser={user}
                  />
                ))}
              </View>
              {pages > 1 ? (
                <View style={styles.pager}>
                  <Pressable
                    disabled={page === 1}
                    onPress={() => changePage(page - 1)}
                    style={[
                      styles.pageBtn,
                      {
                        backgroundColor: c.bgPanel,
                        borderColor: c.border,
                        opacity: page === 1 ? 0.35 : 1,
                      },
                    ]}
                  >
                    <FaArrowLeft size={10} color={c.textDim} />
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textDim,
                        marginLeft: 4,
                      }}
                    >
                      Prev
                    </AppText>
                  </Pressable>
                  <AppText style={{ fontSize: 11, color: c.textDim }}>
                    {page} / {pages}
                  </AppText>
                  <Pressable
                    disabled={page === pages}
                    onPress={() => changePage(page + 1)}
                    style={[
                      styles.pageBtn,
                      {
                        backgroundColor: c.bgPanel,
                        borderColor: c.border,
                        opacity: page === pages ? 0.35 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.textDim,
                        marginRight: 4,
                      }}
                    >
                      Next
                    </AppText>
                    <FaArrowRight size={10} color={c.textDim} />
                  </Pressable>
                </View>
              ) : null}
            </>
          )}
        </>
      ) : null}

      {/* ═══════ NEARBY ═══════ */}
      {tab === "nearby" ? (
        nearbyLoading ? (
          <View style={styles.workerGrid}>
            {[0, 1, 2, 3].map((i) => (
              <WorkerSkeleton key={i} c={c} />
            ))}
          </View>
        ) : nearbyError === "backend_error" ? (
          <EmptyBlock
            icon={<FaInfoCircle size={36} color={c.orange} />}
            title="Nearby search unavailable"
            text="The server isn't responding to nearby searches right now. Please try again in a moment."
            ctaLabel="Try Again"
            onCta={findNearby}
            c={c}
          />
        ) : nearbyError === "permission_denied" ? (
          <EmptyBlock
            icon={<FaMapMarkerAlt size={36} color={c.textMuted} />}
            title="Location permission needed"
            text="Enable location access in your device settings to find nearby workers."
            ctaLabel="Retry"
            onCta={findNearby}
            c={c}
          />
        ) : nearbyWorkers.length === 0 ? (
          <EmptyBlock
            icon={<FaMapMarkerAlt size={36} color={c.textMuted} />}
            title="No nearby workers found"
            text="Tap the location button in the search bar to find workers near you."
            ctaLabel="Try Again"
            onCta={findNearby}
            c={c}
          />
        ) : (
          <>
            {nearbyNote ? (
              <View
                style={[
                  styles.expansionNote,
                  {
                    backgroundColor: "rgba(59,130,246,0.08)",
                    borderColor: "rgba(59,130,246,0.2)",
                  },
                ]}
              >
                <FaInfoCircle size={12} color="#60a5fa" />
                <AppText
                  style={{
                    fontSize: 12,
                    color: "#60a5fa",
                    flex: 1,
                    marginLeft: 6,
                  }}
                >
                  {nearbyNote}
                </AppText>
              </View>
            ) : null}
            <AppText style={styles.resultsMeta(c)}>
              {nearbyWorkers.length} worker
              {nearbyWorkers.length !== 1 ? "s" : ""} within{" "}
              {filters.radius || 25} km
            </AppText>
            <View style={styles.workerGrid}>
              {nearbyWorkers.map((w, i) => (
                <WorkerCard
                  key={w.user?.id || i}
                  worker={w}
                  showDistance
                  c={c}
                  navigation={navigation}
                  currentUser={user}
                />
              ))}
            </View>
          </>
        )
      ) : null}

      {/* ═══════ FILTER DRAWER — SLIDES FROM LEFT ═══════ */}
      <Modal
        visible={showFilters}
        animationType="none"
        transparent
        onRequestClose={closeFilters}
      >
        <View style={styles.filterOverlay}>
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: "rgba(0,0,0,0.6)",
                opacity: drawerAnim,
              },
            ]}
          >
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={closeFilters}
            />
          </Animated.View>

          <Animated.View
            style={[
              styles.filterDrawer,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                width: DRAWER_WIDTH,
                transform: [
                  {
                    translateX: drawerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-DRAWER_WIDTH, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* ═══ Filter Header — pushed down for status bar ═══ */}
            <View style={[styles.filterHeader, { paddingTop: 56 }]}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <AppText
                  style={{
                    fontFamily: "Syne_700Bold",
                    fontSize: 14,
                    fontWeight: "700",
                    color: c.text,
                  }}
                >
                  Filters
                </AppText>
                {activeFiltersCount > 0 ? (
                  <View
                    style={[styles.filterCount, { backgroundColor: c.orange }]}
                  >
                    <AppText
                      style={{
                        fontSize: 10,
                        fontWeight: "800",
                        color: c.bg,
                      }}
                    >
                      {activeFiltersCount}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <View
                style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
              >
                {activeFiltersCount > 0 ? (
                  <Pressable onPress={clearFilters} hitSlop={6}>
                    <AppText
                      style={{
                        fontSize: 11,
                        color: c.orange,
                        fontWeight: "600",
                      }}
                    >
                      Clear all
                    </AppText>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={closeFilters}
                  hitSlop={6}
                  style={[
                    styles.filterCloseBtn,
                    { backgroundColor: c.bgCard, borderColor: c.border },
                  ]}
                >
                  <FaXmark size={13} color={c.textDim} />
                </Pressable>
              </View>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              {/* Availability */}
              <FilterSection title="Availability" c={c}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <AppText style={{ fontSize: 12, color: c.textDim }}>
                    Available only
                  </AppText>
                  <Switch
                    value={filters.available === "true"}
                    onValueChange={(v) =>
                      applyFilter("available", v ? "true" : "false")
                    }
                    trackColor={{ false: c.border, true: c.orangeGlow }}
                    thumbColor={
                      filters.available === "true" ? c.orange : c.textMuted
                    }
                  />
                </View>
              </FilterSection>

              {/* Category */}
              <FilterSection title="Category" c={c}>
                <Pressable
                  onPress={() => setCatPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.selectBtn,
                    {
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      color: filters.category ? c.text : c.textMuted,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {filters.category
                      ? filterMeta.categories?.find(
                          (cat) => cat.slug === filters.category,
                        )?.name || filters.category
                      : "All categories"}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: c.textMuted }}>
                    ▾
                  </AppText>
                </Pressable>
              </FilterSection>

              {/* City */}
              <FilterSection title="City" c={c}>
                <TextInput
                  value={filters.city}
                  onChangeText={(v) => applyFilter("city", v)}
                  placeholder="e.g. Lagos"
                  placeholderTextColor={c.textMuted}
                  style={[
                    styles.filterInput,
                    {
                      color: c.text,
                      borderColor: c.border,
                      backgroundColor: c.bgInput,
                    },
                  ]}
                />
              </FilterSection>

              {/* Rate */}
              <FilterSection title="Hourly Rate" c={c}>
                <View
                  style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
                >
                  <TextInput
                    value={filters.minRate}
                    onChangeText={(v) =>
                      applyFilter("minRate", v.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="Min"
                    placeholderTextColor={c.textMuted}
                    keyboardType="decimal-pad"
                    style={[
                      styles.filterInput,
                      {
                        flex: 1,
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: c.bgInput,
                      },
                    ]}
                  />
                  <AppText style={{ color: c.textMuted }}>–</AppText>
                  <TextInput
                    value={filters.maxRate}
                    onChangeText={(v) =>
                      applyFilter("maxRate", v.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="Max"
                    placeholderTextColor={c.textMuted}
                    keyboardType="decimal-pad"
                    style={[
                      styles.filterInput,
                      {
                        flex: 1,
                        color: c.text,
                        borderColor: c.border,
                        backgroundColor: c.bgInput,
                      },
                    ]}
                  />
                </View>
              </FilterSection>

              {/* Rating */}
              <FilterSection title="Minimum Rating" c={c}>
                <View style={{ gap: 6 }}>
                  {RATINGS.map((r) => (
                    <Pressable
                      key={String(r.value)}
                      onPress={() => applyFilter("rating", String(r.value))}
                      style={[
                        styles.ratingOpt,
                        {
                          backgroundColor:
                            filters.rating === String(r.value)
                              ? c.orangeDim
                              : c.bgCard,
                          borderColor:
                            filters.rating === String(r.value)
                              ? c.orange
                              : c.border,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            filters.rating === String(r.value)
                              ? c.orange
                              : c.textDim,
                        }}
                      >
                        {r.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </FilterSection>

              {/* Distance */}
              <FilterSection title="Max Distance" c={c}>
                <Pressable
                  onPress={() => setDistPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.selectBtn,
                    {
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      color: filters.radius ? c.text : c.textMuted,
                      flex: 1,
                    }}
                  >
                    {filters.radius ? `${filters.radius} km` : "Any distance"}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: c.textMuted }}>
                    ▾
                  </AppText>
                </Pressable>
                {filters.radius && !filters.lat ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 6,
                    }}
                  >
                    <FaMapMarkerAlt size={10} color={c.textMuted} />
                    <AppText style={{ fontSize: 10, color: c.textMuted }}>
                      Allow location for distance filter
                    </AppText>
                  </View>
                ) : null}
              </FilterSection>

              {/* Language */}
              <FilterSection title="Language" c={c}>
                <Pressable
                  onPress={() => setLangPickerOpen(true)}
                  style={({ pressed }) => [
                    styles.selectBtn,
                    {
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <AppText
                    style={{
                      fontSize: 12,
                      color: filters.language ? c.text : c.textMuted,
                      flex: 1,
                    }}
                    numberOfLines={1}
                  >
                    {filters.language || "Any language"}
                  </AppText>
                  <AppText style={{ fontSize: 10, color: c.textMuted }}>
                    ▾
                  </AppText>
                </Pressable>
              </FilterSection>

              {/* Gender */}
              <FilterSection title="Gender Preference" c={c}>
                <View style={{ gap: 6 }}>
                  {GENDERS.map((g) => (
                    <Pressable
                      key={g.value}
                      onPress={() => applyFilter("gender", g.value)}
                      style={[
                        styles.ratingOpt,
                        {
                          backgroundColor:
                            filters.gender === g.value ? c.orangeDim : c.bgCard,
                          borderColor:
                            filters.gender === g.value ? c.orange : c.border,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            filters.gender === g.value ? c.orange : c.textDim,
                        }}
                      >
                        {g.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </FilterSection>

              {/* Verification */}
              <FilterSection title="Verification" c={c}>
                <View style={{ gap: 6 }}>
                  {VERIFICATIONS.map((v) => (
                    <Pressable
                      key={v.value}
                      onPress={() => applyFilter("verification", v.value)}
                      style={[
                        styles.ratingOpt,
                        {
                          backgroundColor:
                            filters.verification === v.value
                              ? c.orangeDim
                              : c.bgCard,
                          borderColor:
                            filters.verification === v.value
                              ? c.orange
                              : c.border,
                        },
                      ]}
                    >
                      <AppText
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color:
                            filters.verification === v.value
                              ? c.orange
                              : c.textDim,
                        }}
                      >
                        {v.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </FilterSection>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══════ PICKERS ═══════ */}
      <PickerSheet
        visible={catPickerOpen}
        onClose={() => setCatPickerOpen(false)}
        title="Category"
        c={c}
        options={[
          { label: "All categories", value: "" },
          ...(filterMeta.categories || []).map((cat) => ({
            label: `${cat.icon ? `${cat.icon} ` : ""}${cat.name}`,
            value: cat.slug,
          })),
        ]}
        selected={filters.category}
        onSelect={(v) => {
          applyFilter("category", v);
          setCatPickerOpen(false);
        }}
      />
      <PickerSheet
        visible={distPickerOpen}
        onClose={() => setDistPickerOpen(false)}
        title="Max Distance"
        c={c}
        options={[
          { label: "Any distance", value: "" },
          ...DISTANCES.map((d) => ({ label: `${d} km`, value: String(d) })),
        ]}
        selected={filters.radius}
        onSelect={(v) => {
          applyFilter("radius", v);
          if (v && !filters.lat) findNearby();
          setDistPickerOpen(false);
        }}
      />
      <PickerSheet
        visible={langPickerOpen}
        onClose={() => setLangPickerOpen(false)}
        title="Language"
        c={c}
        options={[
          { label: "Any language", value: "" },
          ...(filterMeta.languages?.length
            ? filterMeta.languages
            : [
                "English",
                "French",
                "Arabic",
                "Yoruba",
                "Hausa",
                "Igbo",
                "Swahili",
                "Portuguese",
              ]
          ).map((l) => ({ label: l, value: l })),
        ]}
        selected={filters.language}
        onSelect={(v) => {
          applyFilter("language", v);
          setLangPickerOpen(false);
        }}
      />
    </AppScreen>
  );
}

// ═══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════
function SugGroup({ title, c, children }) {
  return (
    <View style={{ paddingVertical: 6 }}>
      <AppText
        style={{
          fontSize: 9,
          fontWeight: "700",
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          paddingHorizontal: 14,
          paddingBottom: 4,
        }}
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

function FilterSection({ title, c, children }) {
  return (
    <View
      style={{
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      }}
    >
      <AppText
        style={{
          fontSize: 10,
          fontWeight: "700",
          color: c.textDim,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 8,
        }}
      >
        {title}
      </AppText>
      {children}
    </View>
  );
}

function PickerSheet({
  visible,
  onClose,
  title,
  options,
  selected,
  onSelect,
  c,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <Pressable style={styles.sheetBackdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.bgPanel, borderColor: c.border },
          ]}
        >
          <View style={styles.sheetHeader}>
            <AppText
              style={{
                fontFamily: "Syne_700Bold",
                fontSize: 15,
                fontWeight: "700",
                color: c.text,
              }}
            >
              {title}
            </AppText>
            <Pressable onPress={onClose} hitSlop={6}>
              <FaXmark size={16} color={c.textDim} />
            </Pressable>
          </View>
          <ScrollView>
            {options.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => onSelect(opt.value)}
                style={[
                  styles.sheetItem,
                  {
                    backgroundColor:
                      selected === opt.value ? c.orangeDim : "transparent",
                    borderBottomColor: c.border,
                  },
                ]}
              >
                <AppText
                  style={{
                    fontSize: 13,
                    fontWeight: selected === opt.value ? "700" : "500",
                    color: selected === opt.value ? c.orange : c.text,
                  }}
                >
                  {opt.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function PromptBlock({ c }) {
  return (
    <View style={styles.promptBlock}>
      <FaSearch size={36} color={c.textMuted} />
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 18,
          fontWeight: "800",
          color: c.text,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        Search for a skilled worker
      </AppText>
      <AppText
        style={{
          fontSize: 13,
          color: c.textDim,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        Try "plumber Lagos", "electrician", or "house cleaning"
      </AppText>
    </View>
  );
}

function EmptyBlock({ icon, title, text, ctaLabel, onCta, c }) {
  return (
    <View style={styles.emptyBlock}>
      {icon}
      <AppText
        style={{
          fontFamily: "Syne_800ExtraBold",
          fontSize: 16,
          fontWeight: "800",
          color: c.text,
          marginTop: 12,
          textAlign: "center",
        }}
      >
        {title}
      </AppText>
      <AppText
        style={{
          fontSize: 12,
          color: c.textDim,
          marginTop: 8,
          textAlign: "center",
          lineHeight: 18,
        }}
      >
        {text}
      </AppText>
      {ctaLabel ? (
        <Pressable
          onPress={onCta}
          style={[styles.emptyCta, { backgroundColor: c.orange }]}
        >
          <AppText style={{ fontSize: 12, fontWeight: "700", color: c.bg }}>
            {ctaLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function WorkerSkeleton({ c }) {
  return (
    <View
      style={[
        styles.workerSkeleton,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    />
  );
}

function WorkerCard({
  worker,
  showDistance,
  isNew,
  c,
  navigation,
  currentUser,
}) {
  const {
    user,
    categories,
    hourlyRate,
    currency,
    avgRating,
    totalReviews,
    completedJobs,
    isAvailable,
    distanceKm,
    _distanceKm,
    verificationStatus,
  } = worker;

  const dist = _distanceKm ?? distanceKm;
  const primaryCat =
    categories?.find((cat) => cat.isPrimary) || categories?.[0];
  const isHirer = currentUser?.role === "HIRER";
  const saved = useSavedWorker(user?.id, { enabled: isHirer && !!user?.id });

  return (
    <Pressable
      onPress={() => navigation.navigate("WorkerProfile", { userId: user?.id })}
      style={({ pressed }) => [
        styles.workerCard,
        {
          backgroundColor: c.bgPanel,
          borderColor: c.border,
          opacity: pressed ? 0.92 : 1,
        },
      ]}
    >
      <View style={styles.wcTop}>
        <View
          style={[
            styles.wcAvatar,
            { backgroundColor: c.orangeDim, borderColor: c.orangeGlow },
          ]}
        >
          {user?.avatar ? (
            <Image
              source={{ uri: user.avatar }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <AppText
              style={{ fontSize: 14, fontWeight: "700", color: c.orange }}
            >
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </AppText>
          )}
          {isAvailable ? (
            <View
              style={[
                styles.wcOnline,
                { backgroundColor: c.green, borderColor: c.bgPanel },
              ]}
            />
          ) : null}
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: 5,
            alignItems: "center",
            flexShrink: 1,
          }}
        >
          {isNew ? (
            <View
              style={[
                styles.newBadge,
                { backgroundColor: "rgba(129,140,248,0.15)" },
              ]}
            >
              <AppText
                style={{ fontSize: 8, fontWeight: "700", color: "#818cf8" }}
              >
                New
              </AppText>
            </View>
          ) : null}
          {verificationStatus === "VERIFIED" ? (
            <FaShieldAlt size={13} color={c.green} />
          ) : null}
          {showDistance && dist != null ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 2 }}
            >
              <FaMapMarkerAlt size={9} color={c.textDim} />
              <AppText style={{ fontSize: 9, color: c.textDim }}>
                {dist} km
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <AppText
        style={{ fontSize: 13, fontWeight: "700", color: c.text }}
        numberOfLines={1}
      >
        {user?.firstName} {user?.lastName}
      </AppText>
      {worker.title ? (
        <AppText style={{ fontSize: 11, color: c.textDim }} numberOfLines={1}>
          {worker.title}
        </AppText>
      ) : null}
      {primaryCat ? (
        <AppText
          style={{ fontSize: 10, fontWeight: "600", color: c.orange }}
          numberOfLines={1}
        >
          {primaryCat.category?.icon} {primaryCat.category?.name}
        </AppText>
      ) : null}

      {user?.city || user?.country ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <FaMapMarkerAlt size={9} color={c.textMuted} />
          <AppText
            style={{ fontSize: 10, color: c.textMuted }}
            numberOfLines={1}
          >
            {[user.city, user.country].filter(Boolean).join(", ")}
          </AppText>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <FaStar size={10} color="#fbbf24" />
          <AppText
            style={{ fontSize: 11, fontWeight: "700", color: "#fbbf24" }}
          >
            {avgRating > 0 ? avgRating.toFixed(1) : "New"}
          </AppText>
          <AppText style={{ fontSize: 9, color: c.textMuted }}>
            ({totalReviews})
          </AppText>
        </View>
        <AppText style={{ fontSize: 10, color: c.textDim }}>
          {completedJobs} jobs
        </AppText>
      </View>

      <View style={styles.wcFooter}>
        <View style={{ flexDirection: "row", alignItems: "baseline", flex: 1 }}>
          <AppText
            style={{ fontSize: 13, fontWeight: "800", color: c.text }}
            numberOfLines={1}
          >
            {currency} {hourlyRate?.toLocaleString()}
          </AppText>
          <AppText style={{ fontSize: 9, color: c.textDim, marginLeft: 1 }}>
            /hr
          </AppText>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View
            style={[
              styles.wcAvail,
              { backgroundColor: isAvailable ? c.greenDim : c.bgCard },
            ]}
          >
            <AppText
              style={{
                fontSize: 8,
                fontWeight: "700",
                color: isAvailable ? c.green : c.textMuted,
                textTransform: "uppercase",
              }}
            >
              {isAvailable ? "Available" : "Busy"}
            </AppText>
          </View>
          {isHirer ? (
            <Pressable
              onPress={(e) => {
                e.stopPropagation?.();
                saved.toggle();
              }}
              disabled={saved.checking || saved.toggling}
              style={[
                styles.wcSaveBtn,
                {
                  backgroundColor: saved.isSaved ? c.orangeDim : c.bgCard,
                  borderColor: saved.isSaved ? c.orangeGlow : c.border,
                },
              ]}
            >
              <FaBookmark
                size={10}
                color={saved.isSaved ? c.orange : c.textDim}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 6,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 6,
    minWidth: 0,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  searchSubmit: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  suggestions: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 6,
  },
  sugItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  sugAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  tabs: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
    flex: 1,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  mobileFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    flexShrink: 0,
  },
  trendTitle: (c) => ({
    fontFamily: "Syne_800ExtraBold",
    fontSize: 15,
    fontWeight: "800",
    color: c.text,
    marginBottom: 10,
  }),
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catCard: {
    width: "31%",
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 0,
  },
  // ── WORKER GRID — 2 per row, no gap issues ──
  workerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  resultsMeta: (c) => ({
    fontSize: 12,
    color: c.textDim,
    marginBottom: 10,
  }),
  workerCard: {
    width: "48%", // safely fits 2 per row
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  wcTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  wcAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    flexShrink: 0,
  },
  wcOnline: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  newBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  wcFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 4,
  },
  wcAvail: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
  },
  wcSaveBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  workerSkeleton: {
    width: "48%",
    height: 170,
    borderRadius: 14,
    borderWidth: 1,
  },
  pager: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 16,
  },
  pageBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  promptBlock: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyBlock: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyCta: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  expansionNote: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  // ── Filter drawer — slides from LEFT via Animated.View ──
  filterOverlay: {
    flex: 1,
    flexDirection: "row",
  },
  filterDrawer: {
    borderRightWidth: 1,
    height: "100%",
  },
  filterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
    // Note: paddingTop is overridden inline in the component to 56
  },
  filterCount: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCloseBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterInput: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 12,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  ratingOpt: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  // ── Picker sheet ──
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    maxHeight: "70%",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    paddingBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  sheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
