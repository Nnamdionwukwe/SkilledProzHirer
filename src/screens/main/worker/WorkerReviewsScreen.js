// src/screens/main/worker/WorkerReviewsScreen.js
// Worker's "Reviews Received" screen.
// Mirrors: existing hirer ReviewsReceivedScreen.js exactly.
// API: GET /reviews/my/received  →  { reviews, avgRating, totalReviews, distribution, pages }

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
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useTranslation } from "react-i18next";
import AppText from "../../../components/AppText";
import Avatar from "../../../components/Avatar";
import { getMyReceivedReviews } from "../../../api/reviews";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 16, color }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <AppText
          key={i}
          style={{
            fontSize: size,
            color: i <= Math.round(rating) ? color : "#4b5563",
          }}
        >
          ★
        </AppText>
      ))}
    </View>
  );
}

// ─── Rating summary card ──────────────────────────────────────────────────────
function RatingSummaryCard({ avgRating, totalReviews, distribution, c }) {
  const maxCount = Math.max(
    ...[5, 4, 3, 2, 1].map((s) => distribution[s] ?? 0),
    1,
  );

  return (
    <View
      style={[
        s.summaryCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Big number + stars */}
      <View style={s.summaryTop}>
        <AppText
          weight="displayBlack"
          style={{ fontSize: 64, lineHeight: 72, color: c.orange }}
        >
          {Number(avgRating).toFixed(1)}
        </AppText>
        <View style={{ marginLeft: 16 }}>
          <StarRow rating={avgRating} size={22} color={c.orange} />
          <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
            {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </AppText>
        </View>
      </View>

      {/* Distribution bars */}
      <View style={[s.distBlock, { borderTopColor: c.border }]}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] ?? 0;
          const pct = maxCount > 0 ? count / maxCount : 0;
          return (
            <View key={star} style={s.distRow}>
              <AppText variant="small" tone="dim" style={s.distLabel}>
                {star} ★
              </AppText>
              <View style={[s.barTrack, { backgroundColor: c.bgInput }]}>
                <View
                  style={[
                    s.barFill,
                    { backgroundColor: c.orange, width: `${pct * 100}%` },
                  ]}
                />
              </View>
              <AppText variant="small" tone="dim" style={s.distCount}>
                {count}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Review card ──────────────────────────────────────────────────────────────
function ReviewCard({ review, c }) {
  const giver = review.giver ?? {};
  const booking = review.booking ?? null;
  const location = [giver.city, giver.country].filter(Boolean).join(", ");

  return (
    <View
      style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Author row */}
      <View style={s.authorRow}>
        <Avatar
          uri={giver.avatar}
          firstName={giver.firstName}
          lastName={giver.lastName}
          size={50}
        />
        <View style={s.authorInfo}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {giver.firstName} {giver.lastName}
          </AppText>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {giver.role === "WORKER" ? "Worker" : "Hirer"}
          </AppText>
          {!!location && (
            <AppText variant="small" style={{ color: c.textMuted }}>
              {location}
            </AppText>
          )}
          <AppText variant="small" style={{ color: c.textMuted }}>
            {fmtDate(review.createdAt)}
          </AppText>
        </View>
        <View style={s.ratingCol}>
          <StarRow rating={review.rating} size={14} color={c.orange} />
          <AppText
            variant="small"
            style={{ color: c.textMuted, textAlign: "right", marginTop: 2 }}
          >
            {review.rating}/5
          </AppText>
        </View>
      </View>

      {/* Comment */}
      {!!review.comment && (
        <View style={[s.quoteRow, { borderLeftColor: c.orange }]}>
          <AppText
            variant="body"
            style={{ color: c.text, fontStyle: "italic" }}
          >
            "{review.comment}"
          </AppText>
        </View>
      )}

      {/* Booking chip */}
      {booking && (
        <View
          style={[
            s.bookingChip,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          {!!booking.category?.icon && (
            <AppText style={{ fontSize: 14, marginRight: 6 }}>
              {booking.category.icon}
            </AppText>
          )}
          <AppText variant="small" weight="semibold" style={{ color: c.text }}>
            {booking.title}
          </AppText>
          {booking.category?.name && (
            <AppText
              variant="small"
              style={{ color: c.textMuted, marginLeft: 6 }}
            >
              {booking.category.name}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ c }) {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            s.skCard,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        />
      ))}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerReviewsScreen({ navigation }) {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { t } = useTranslation();
  const c = th.colors;

  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async (pg = 1, replace = true) => {
    try {
      const d = await getMyReceivedReviews({ page: pg, limit: 15 });
      setData(d);
      setReviews(
        replace ? (d.reviews ?? []) : (prev) => [...prev, ...(d.reviews ?? [])],
      );
      setTotalPages(d.pages ?? 1);
    } catch {
      toast.error(t("workerReviews.loadFail"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    load(1, true);
  };
  const loadMore = () => {
    if (page < totalPages && !loading) {
      const next = page + 1;
      setPage(next);
      load(next, false);
    }
  };

  return (
    <View style={[screen.wrap, { backgroundColor: c.bg }]}>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={screen.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Page header */}
            <View style={{ marginBottom: 20 }}>
              <AppText
                weight="displayBlack"
                style={{ fontSize: 34, color: c.text, marginBottom: 4 }}
              >
                {t("workerReviews.title")}
              </AppText>
              <AppText variant="body" tone="dim" style={{ lineHeight: 22 }}>
                {t("workerReviews.subtitle")}
              </AppText>
            </View>

            {/* Rating summary */}
            {data && data.totalReviews > 0 && (
              <View style={{ marginBottom: 16 }}>
                <RatingSummaryCard
                  avgRating={data.avgRating ?? 0}
                  totalReviews={data.totalReviews ?? 0}
                  distribution={data.distribution ?? {}}
                  c={c}
                />
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => <ReviewCard review={item} c={c} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={screen.empty}>
              <AppText style={{ fontSize: 44 }}>⭐</AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12 }}
              >
                {t("workerReviews.noReviews")}
              </AppText>
              <AppText
                variant="small"
                tone="dim"
                style={{ marginTop: 6, textAlign: "center" }}
              >
                {t("workerReviews.noReviewsSub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          page < totalPages ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator color={c.orange} />
            </View>
          ) : reviews.length > 0 ? (
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", paddingVertical: 16 }}
            >
              {t("reviews.reviewsCount", {
                count: data?.totalReviews ?? reviews.length,
              })}{" "}
              loaded
            </AppText>
          ) : (
            <View style={{ height: 40 }} />
          )
        }
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const screen = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});

const s = StyleSheet.create({
  // Summary
  summaryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 0,
  },
  summaryTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  distBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    gap: 10,
  },
  distRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  distLabel: { width: 28, textAlign: "right" },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4 },
  distCount: { width: 16, textAlign: "right" },

  // Review card
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  authorRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  authorInfo: { flex: 1, gap: 2 },
  ratingCol: { alignItems: "flex-end" },
  quoteRow: { borderLeftWidth: 3, paddingLeft: 12 },
  bookingChip: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  skCard: {
    height: 160,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
});
