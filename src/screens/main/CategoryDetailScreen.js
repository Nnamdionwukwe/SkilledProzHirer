// src/screens/main/CategoryDetailScreen.js
// Mirrors website CategoryDetail page exactly.
// Endpoint: GET /categories/:slug
//           GET /search?q=:slug&type=workers&category=:slug&available=false
// Fallback: GET /workers?category=:slug&limit=20

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import AppText from "../../components/AppText";
import { categoriesApi } from "../../api/categories";
import client from "../../api/client";

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ── Worker Card ───────────────────────────────────────────────────────────────
function WorkerCard({ worker, onPress, c }) {
  // /search returns workerProfile shape (has nested .user)
  // /workers returns user shape (workerProfile nested)
  const isSearchShape = !!worker.user;

  const userId = isSearchShape ? worker.user?.id : worker.id;
  const firstName = isSearchShape ? worker.user?.firstName : worker.firstName;
  const lastName = isSearchShape ? worker.user?.lastName : worker.lastName;
  const avatar = isSearchShape ? worker.user?.avatar : worker.avatar;
  const city = isSearchShape ? worker.user?.city : worker.city;
  const wp = isSearchShape ? worker : worker.workerProfile;

  return (
    <Pressable
      onPress={() => onPress(userId)}
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Avatar */}
      <View
        style={[
          styles.avatar,
          { backgroundColor: c.orangeDim, borderColor: c.orange },
        ]}
      >
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImg} />
        ) : (
          <AppText style={{ color: c.orange, fontWeight: "700", fontSize: 18 }}>
            {initials(firstName, lastName)}
          </AppText>
        )}
      </View>

      {/* Name */}
      <AppText
        variant="body"
        weight="semibold"
        style={[styles.name, { color: c.text }]}
      >
        {firstName} {lastName}
      </AppText>

      {/* Title */}
      {!!wp?.title && (
        <AppText
          variant="small"
          style={[styles.workerTitle, { color: c.textMuted }]}
        >
          {wp.title}
        </AppText>
      )}

      {/* Rating */}
      <View style={styles.ratingRow}>
        <AppText style={{ color: c.orange, fontSize: 14 }}>★</AppText>
        <AppText
          variant="body"
          weight="semibold"
          style={{ color: c.orange, marginLeft: 4 }}
        >
          {wp?.avgRating ? Number(wp.avgRating).toFixed(1) : "New"}
        </AppText>
        <AppText variant="small" style={{ color: c.textMuted, marginLeft: 4 }}>
          ({wp?.totalReviews ?? 0} reviews)
        </AppText>
      </View>

      {/* Location */}
      {!!city && (
        <AppText variant="small" style={{ color: c.textMuted, marginTop: 4 }}>
          📍 {city}
        </AppText>
      )}

      {/* Rate */}
      {!!wp?.hourlyRate && (
        <AppText style={[styles.rate, { color: c.orange }]}>
          {wp.currency ?? "USD"} {Number(wp.hourlyRate).toLocaleString()}/hr
        </AppText>
      )}

      {/* Available badge */}
      {wp?.isAvailable && (
        <View
          style={[
            styles.availBadge,
            { backgroundColor: "rgba(34,197,94,0.12)" },
          ]}
        >
          <AppText style={{ fontSize: 11, color: "#22c55e" }}>
            🟢 Available
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={styles.grid}>
      {[1, 2, 3, 4].map((i) => (
        <View
          key={i}
          style={[
            styles.card,
            styles.skCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
      ))}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CategoryDetailScreen({ navigation, route }) {
  const slug = route?.params?.slug;
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();

  const [category, setCategory] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    if (!slug) return;
    try {
      // Fetch category info
      const cat = await categoriesApi.getBySlug(slug);
      if (!cat) {
        setError(true);
        setLoading(false);
        return;
      }
      setCategory(cat);

      // Fetch workers — mirror website exactly:
      // Primary: /search?q=:slug&type=workers&category=:slug&available=false
      try {
        const res = await client.get("/search", {
          params: {
            q: slug,
            type: "workers",
            category: slug,
            limit: 20,
            available: "false",
          },
        });
        const data =
          res.data?.data?.workers?.data ?? res.data?.data?.workers ?? [];
        setWorkers(Array.isArray(data) ? data : []);
      } catch {
        // Fallback: /workers?category=:slug
        try {
          const res = await client.get("/workers", {
            params: { category: slug, limit: 20 },
          });
          setWorkers(res.data?.data?.workers ?? []);
        } catch {
          setWorkers([]);
        }
      }
    } catch {
      setError(true);
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [slug]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const goToWorker = (userId) =>
    navigation.navigate("WorkerProfile", { userId });
  const goBack = () => navigation.goBack();

  // ── Error state ─────────────────────────────────────────────────────────────
  if (!loading && (error || !category)) {
    return (
      <View style={[styles.screen, { backgroundColor: c.bg }]}>
        <View style={styles.errorWrap}>
          <AppText style={{ fontSize: 44 }}>🗂️</AppText>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, marginTop: 12 }}
          >
            Category not found
          </AppText>
          <Pressable
            onPress={goBack}
            style={[styles.backBtn, { borderColor: c.orange }]}
          >
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange }}
            >
              ← Back to Categories
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={workers}
        keyExtractor={(item, i) => item.user?.id ?? item.id ?? String(i)}
        numColumns={2}
        columnWrapperStyle={styles.row}
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
            {/* Back button */}
            <Pressable
              onPress={() => navigation.navigate("BrowseByCategories")}
              style={[styles.backBtn, { borderColor: c.orange }]}
            >
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.orange }}
              >
                ← Back
              </AppText>
            </Pressable>

            {/* Hero */}
            <View style={styles.hero}>
              {!!category?.icon && (
                <AppText style={styles.heroIcon}>{category.icon}</AppText>
              )}
              <AppText style={[styles.heroTitle, { color: c.text }]}>
                {category?.name ?? ""}
              </AppText>
              {!loading && (
                <AppText style={[styles.heroSub, { color: c.textMuted }]}>
                  {workers.length} worker{workers.length !== 1 ? "s" : ""}{" "}
                  available
                </AppText>
              )}
            </View>

            {loading && <Skeleton c={c} />}
          </View>
        }
        renderItem={({ item }) => (
          <WorkerCard worker={item} onPress={goToWorker} c={c} />
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <AppText style={{ fontSize: 44, lineHeight: 54 }}>👷</AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12, textAlign: "center" }}
              >
                No workers found in this category
              </AppText>
              <Pressable
                onPress={() => navigation.navigate("BrowseByCategories")}
                style={[
                  styles.backBtn,
                  { borderColor: c.orange, marginTop: 16 },
                ]}
              >
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  Browse other categories
                </AppText>
              </Pressable>
            </View>
          ) : null
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Back button
  backBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
  },

  // Hero
  hero: { alignItems: "center", marginBottom: 32 },
  heroIcon: { fontSize: 56, marginBottom: 12, lineHeight: 65 },
  heroTitle: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 44,
  },
  heroSub: { fontSize: 15, marginTop: 8 },

  // Grid
  row: { gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: "center",
  },

  // Avatar
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
  },
  avatarImg: { width: 72, height: 72 },

  // Card content
  name: { textAlign: "center", marginBottom: 2 },
  workerTitle: { textAlign: "center", marginBottom: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  rate: { fontSize: 15, fontWeight: "700", marginTop: 8 },
  availBadge: {
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },

  // Skeleton
  skCard: { minHeight: 200, opacity: 0.4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },

  // Empty / error
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
  errorWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
});
