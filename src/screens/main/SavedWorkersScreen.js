// src/screens/main/SavedWorkersScreen.js
// Endpoint: GET /hirers/me/saved-workers
// All user-facing strings go through t() so locales can be added
// without touching this file.

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
import { getSavedWorkers } from "../../api/hirer";

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtRating(rating) {
  if (!rating || rating === 0) return null;
  return Number(rating).toFixed(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Worker Card
// ─────────────────────────────────────────────────────────────────────────────
function WorkerCard({ worker, onViewProfile, c, t }) {
  const wp = worker.workerProfile ?? {};
  const rating = fmtRating(wp.avgRating);
  const isAvailable = wp.isAvailable ?? false;
  const location = [worker.city, worker.country].filter(Boolean).join(", ");
  const lastCat = worker.lastCategory?.name;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Top row — avatar + name + rating */}
      <View style={styles.cardTop}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {worker.avatar ? (
            <Image source={{ uri: worker.avatar }} style={styles.avatarImg} />
          ) : (
            <AppText
              style={{ color: c.orange, fontWeight: "700", fontSize: 18 }}
            >
              {initials(worker.firstName, worker.lastName)}
            </AppText>
          )}
        </View>

        <View style={styles.nameBlock}>
          <AppText variant="title" weight="semibold">
            {worker.firstName} {worker.lastName}
          </AppText>
          {!!wp.title && (
            <AppText variant="body" tone="dim" numberOfLines={1}>
              {wp.title}
            </AppText>
          )}
        </View>

        {rating !== null && (
          <View style={styles.ratingBlock}>
            <AppText style={[styles.ratingStar, { color: c.orange }]}>
              ★
            </AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.orange, marginLeft: 4 }}
            >
              {rating}
            </AppText>
          </View>
        )}
      </View>

      {/* Location + availability row */}
      <View style={styles.metaRow}>
        {!!location && (
          <AppText
            variant="body"
            tone="dim"
            style={{ flex: 1 }}
            numberOfLines={1}
          >
            {location}
          </AppText>
        )}
        <View style={styles.availabilityChip}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isAvailable ? "#22c55e" : "#6b7280" },
            ]}
          />
          <AppText
            variant="small"
            weight="semibold"
            style={{
              color: isAvailable ? "#22c55e" : "#6b7280",
              marginLeft: 5,
            }}
          >
            {isAvailable
              ? t("savedWorkers.available")
              : t("savedWorkers.unavailable")}
          </AppText>
        </View>
      </View>

      {/* Last hired for */}
      {!!lastCat && (
        <AppText variant="small" tone="dim" style={styles.lastHiredText}>
          {t("savedWorkers.lastHiredFor", { category: lastCat })}
        </AppText>
      )}

      {/* Rate chip */}
      {!!wp.hourlyRate && (
        <View
          style={[
            styles.rateChip,
            { backgroundColor: c.orangeDim, borderColor: c.orange },
          ]}
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {wp.currency} {Number(wp.hourlyRate).toLocaleString()}
            {t("savedWorkers.perHour")}
          </AppText>
        </View>
      )}

      {/* View Profile button */}
      <Pressable
        style={[
          styles.viewBtn,
          { backgroundColor: c.orangeDim, borderColor: c.orange },
        ]}
        onPress={() => onViewProfile(worker.id)}
      >
        <AppText variant="body" weight="semibold" style={{ color: c.orange }}>
          {t("savedWorkers.viewProfile")} →
        </AppText>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 12, padding: 16 }}>
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

// ─────────────────────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ c, t }) {
  return (
    <View style={styles.empty}>
      <AppText style={{ fontSize: 52, textAlign: "center" }}>👷</AppText>
      <AppText
        variant="title"
        weight="semibold"
        style={{ textAlign: "center", marginTop: 16 }}
      >
        {t("savedWorkers.emptyTitle")}
      </AppText>
      <AppText
        variant="body"
        tone="dim"
        style={{ textAlign: "center", marginTop: 8, lineHeight: 22 }}
      >
        {t("savedWorkers.emptySub")}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function SavedWorkersScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();

  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkers = useCallback(async () => {
    try {
      const data = await getSavedWorkers();
      setWorkers(data ?? []);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWorkers();
  };

  const handleViewProfile = (workerId) => {
    navigation.navigate("WorkerProfile", { userId: workerId });
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={workers}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          !loading && workers.length > 0 ? (
            <AppText variant="body" tone="dim" style={styles.subtitle}>
              {t("savedWorkers.subtitle")}
            </AppText>
          ) : null
        }
        renderItem={({ item }) => (
          <WorkerCard
            worker={item}
            onViewProfile={handleViewProfile}
            c={c}
            t={t}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? <Skeleton c={c} /> : <EmptyState c={c} t={t} />
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  subtitle: { marginBottom: 16, lineHeight: 22 },

  // Worker card
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },

  // Top row
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 60, height: 60 },
  nameBlock: { flex: 1, gap: 2 },
  ratingBlock: { flexDirection: "row", alignItems: "center" },
  ratingStar: { fontSize: 18 },

  // Meta row
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availabilityChip: { flexDirection: "row", alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Last hired + rate
  lastHiredText: { marginTop: -4 },
  rateChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },

  // View profile button
  viewBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },

  // Skeleton
  skCard: {
    height: 200,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },

  // Empty
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});
