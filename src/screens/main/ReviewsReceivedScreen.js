// src/screens/main/ReviewsReceivedScreen.js
// Endpoint: GET /hirers/me/reviews/received
// Shows avg rating, distribution bars, and review cards.
// All strings via t() for i18n. Full dark/light mode support.

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
import { getReviewsReceived } from "../../api/reviews";
import { FaStar, FaExclamationTriangle } from "../../icons/fa";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ── Star row ──────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 14, gap = 2 }) {
  return (
    <View style={{ flexDirection: "row", gap }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <AppText
          key={s}
          style={{
            fontSize: size,
            color: s <= rating ? "#f97316" : "#4b5563",
          }}
        >
          ★
        </AppText>
      ))}
    </View>
  );
}

// ── Rating summary card ────────────────────────────────────────────────────────
function RatingSummaryCard({ avgRating, totalReviews, distribution, c, t }) {
  const filledStars = Math.round(avgRating);

  return (
    <View
      style={[
        styles.summaryCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Top row: big number + star row */}
      <View style={styles.summaryTop}>
        <View style={styles.ratingHero}>
          <AppText
            weight="displayBlack"
            style={[styles.bigRating, { color: c.orange }]}
          >
            {avgRating > 0 ? avgRating.toFixed(1) : "—"}
          </AppText>
          <View style={{ marginLeft: 12 }}>
            <StarRow rating={filledStars} size={18} />
            <AppText style={{ fontSize: 11, color: c.textDim, marginTop: 4 }}>
              {totalReviews} review{totalReviews !== 1 ? "s" : ""}
            </AppText>
          </View>
        </View>
      </View>

      {/* Distribution bars */}
      <View style={styles.distBlock}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star] || 0;
          const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
          return (
            <View key={star} style={styles.distRow}>
              <AppText style={[styles.distLabel, { color: c.textDim }]}>
                {star} ★
              </AppText>
              <View style={[styles.barTrack, { backgroundColor: c.border }]}>
                <View
                  style={[
                    styles.barFill,
                    { backgroundColor: c.orange, width: `${pct}%` },
                  ]}
                />
              </View>
              <AppText style={[styles.distCount, { color: c.textMuted }]}>
                {count}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ review, c, t }) {
  const giver = review.giver ?? {};
  const booking = review.booking;
  const location = [giver.city, giver.country].filter(Boolean).join(", ");

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Author row */}
      <View style={styles.authorRow}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {giver.avatar ? (
            <Image source={{ uri: giver.avatar }} style={styles.avatarImg} />
          ) : (
            <AppText style={{ color: c.orange, fontWeight: "700" }}>
              {initials(giver.firstName, giver.lastName)}
            </AppText>
          )}
        </View>

        <View style={styles.authorInfo}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, fontSize: 14 }}
          >
            {giver.firstName} {giver.lastName}
            <AppText style={{ color: c.textDim, fontWeight: "400" }}>
              {giver.role === "WORKER" ? " · Worker" : " · Hirer"}
            </AppText>
          </AppText>
          {!!location && (
            <AppText style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
              {location}
            </AppText>
          )}
          <AppText style={{ color: c.textMuted, fontSize: 11, marginTop: 2 }}>
            {fmtDate(review.createdAt)} at {fmtTime(review.createdAt)}
          </AppText>
        </View>

        <View style={styles.ratingRight}>
          <StarRow rating={review.rating} size={14} />
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              marginTop: 2,
              textAlign: "right",
            }}
          >
            {review.rating}/5
          </AppText>
        </View>
      </View>

      {/* Comment */}
      {review.comment && (
        <View style={[styles.quoteRow, { borderLeftColor: c.orange }]}>
          <AppText
            variant="body"
            style={{
              color: c.textDim,
              fontStyle: "italic",
              lineHeight: 18,
              fontSize: 13,
            }}
          >
            "{review.comment}"
          </AppText>
        </View>
      )}

      {/* Booking chip */}
      {booking && (
        <View
          style={[
            styles.bookingChip,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          {!!booking.category?.icon && (
            <AppText style={{ fontSize: 14, marginRight: 6 }}>
              {booking.category.icon}
            </AppText>
          )}
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.text, fontSize: 12 }}
          >
            {booking.title}
          </AppText>
          {booking.category?.name && (
            <AppText
              variant="small"
              style={{ color: c.textMuted, marginLeft: 6, fontSize: 11 }}
            >
              {booking.category.name}
            </AppText>
          )}
        </View>
      )}
    </View>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ReviewsReceivedScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();

  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState("");

  const limit = 10;

  const fetchReviews = useCallback(async (pg = 1, replace = true) => {
    setLoading(true);
    setError("");
    try {
      const d = await getReviewsReceived({ page: pg, limit });
      setData(d);
      setReviews(
        replace ? d.reviews || [] : (prev) => [...prev, ...(d.reviews || [])],
      );
      // FIXED: mixed ?? and || — wrapped in parens / replaced with safe chain
      const computedPages = d.pages || Math.ceil((d.total || 0) / limit) || 1;
      setTotalPages(computedPages);
    } catch {
      setError(t("toast.unknownError"));
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews(1, true);
  }, [fetchReviews]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchReviews(1, true);
  };

  const loadMore = () => {
    if (!loading && page < totalPages) {
      const next = page + 1;
      setPage(next);
      fetchReviews(next, false);
    }
  };

  const total = data?.total || reviews.length;
  const avgRating = data?.avgRating || 0;
  const distribution = data?.distribution || {};

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
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
        contentContainerStyle={styles.content}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {/* Hero */}
            <View style={styles.pageHeader}>
              <View>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor: c.orangeDim,
                      borderColor: c.orangeGlow,
                    },
                  ]}
                >
                  <AppText
                    variant="small"
                    weight="semibold"
                    style={{
                      color: c.orange,
                      letterSpacing: 1.2,
                      fontSize: 10,
                    }}
                  >
                    YOUR REPUTATION
                  </AppText>
                </View>
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 22, color: c.text, marginBottom: 4 }}
                >
                  Reviews Received
                </AppText>
                <AppText
                  variant="body"
                  style={{ color: c.textDim, fontSize: 13 }}
                >
                  Feedback workers have left about you as a hirer
                </AppText>
              </View>

              <Pressable
                onPress={() => navigation.navigate("ReviewsGiven")}
                style={[
                  styles.switchBtn,
                  { borderColor: c.border, backgroundColor: c.bgCard },
                ]}
              >
                <AppText variant="body" style={{ color: c.text, fontSize: 13 }}>
                  See Reviews Given →
                </AppText>
              </Pressable>
            </View>

            {/* Summary */}
            {!loading && total > 0 && (
              <RatingSummaryCard
                avgRating={avgRating}
                totalReviews={total}
                distribution={distribution}
                c={c}
                t={t}
              />
            )}
            <View style={{ height: 16 }} />

            {/* Error */}
            {!loading && error ? (
              <View style={styles.empty}>
                <FaExclamationTriangle size={28} color={c.textMuted} />
                <AppText
                  weight="semibold"
                  style={{ color: c.text, marginTop: 12, fontSize: 14 }}
                >
                  {error}
                </AppText>
              </View>
            ) : !loading && reviews.length === 0 ? (
              <View style={styles.empty}>
                <FaStar size={28} color={c.textMuted} />
                <AppText
                  weight="semibold"
                  style={{ color: c.text, marginTop: 12, fontSize: 14 }}
                >
                  No reviews yet
                </AppText>
                <AppText
                  style={{
                    color: c.textDim,
                    marginTop: 4,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  Complete jobs to start receiving reviews from workers.
                </AppText>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => <ReviewCard review={item} c={c} t={t} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading && reviews.length === 0 ? <Skeleton c={c} /> : null
        }
        ListFooterComponent={
          <View>
            {/* Pagination */}
            {totalPages > 1 && reviews.length > 0 && (
              <View style={[styles.pagination, { borderTopColor: c.border }]}>
                <Pressable
                  disabled={page === 1 || loading}
                  onPress={() => {
                    const prev = page - 1;
                    setPage(prev);
                    fetchReviews(prev, true);
                  }}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.border,
                      opacity: page === 1 ? 0.3 : 1,
                    },
                  ]}
                >
                  <AppText style={{ color: c.textDim, fontSize: 12 }}>
                    ← Prev
                  </AppText>
                </Pressable>

                <AppText style={{ color: c.textMuted, fontSize: 12 }}>
                  {page} of {totalPages}
                </AppText>

                <Pressable
                  disabled={page === totalPages || loading}
                  onPress={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchReviews(next, true);
                  }}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.border,
                      opacity: page === totalPages ? 0.3 : 1,
                    },
                  ]}
                >
                  <AppText style={{ color: c.textDim, fontSize: 12 }}>
                    Next →
                  </AppText>
                </Pressable>
              </View>
            )}
            <View style={{ height: 40 }} />
          </View>
        }
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  pageHeader: {
    flexDirection: "column",
    gap: 12,
    marginBottom: 20,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 8,
  },
  switchBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  summaryTop: {
    marginBottom: 16,
  },
  ratingHero: {
    flexDirection: "row",
    alignItems: "center",
  },
  bigRating: {
    fontSize: 48,
    lineHeight: 54,
  },
  distBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "transparent",
    paddingTop: 12,
    gap: 8,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  distLabel: {
    width: 28,
    textAlign: "right",
    fontSize: 11,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  distCount: {
    width: 20,
    textAlign: "right",
    fontSize: 11,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  authorRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%", resizeMode: "cover" },
  authorInfo: { flex: 1 },
  ratingRight: { alignItems: "flex-end" },
  quoteRow: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    marginBottom: 12,
  },
  bookingChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flexWrap: "wrap",
    gap: 6,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  pageBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  skCard: {
    height: 120,
    width: "100%",
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.5,
  },
});
