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

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ── Star row ──────────────────────────────────────────────────────────────────
function StarRow({ rating, size = 16, color }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
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

// ── Rating summary card ────────────────────────────────────────────────────────
function RatingSummaryCard({ avgRating, totalReviews, distribution, c, t }) {
  const filledStars = Math.round(avgRating);
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
      {/* Top row: big number + star row */}
      <View style={s.summaryTop}>
        <AppText
          weight="displayBlack"
          style={[s.bigRating, { color: c.orange }]}
        >
          {Number(avgRating).toFixed(1)}
        </AppText>
        <View style={{ marginLeft: 16 }}>
          <StarRow rating={filledStars} size={22} color={c.orange} />
          <AppText variant="small" tone="dim" style={{ marginTop: 6 }}>
            {totalReviews} {t("reviews.reviewsCount", { count: totalReviews })}
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

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ review, navigation, c, t }) {
  const giver = review.giver ?? {};
  const booking = review.booking;
  const location = [giver.city, giver.country].filter(Boolean).join(", ");

  return (
    <View
      style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Author row */}
      <View style={s.authorRow}>
        <Pressable onPress={() => navigation.navigate("WorkerProfile")}>
          <View
            style={[
              s.avatar,
              { backgroundColor: c.orangeDim, borderColor: c.border },
            ]}
          >
            {giver.avatar ? (
              <Image source={{ uri: giver.avatar }} style={s.avatarImg} />
            ) : (
              <AppText style={{ color: c.orange, fontWeight: "700" }}>
                {initials(giver.firstName, giver.lastName)}
              </AppText>
            )}
          </View>
        </Pressable>
        <View style={s.authorInfo}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {giver.firstName} {giver.lastName}
          </AppText>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {giver.role === "WORKER" ? t("reviews.worker") : t("reviews.hirer")}
          </AppText>
          {!!location && (
            <AppText variant="small" style={{ color: c.textMuted }}>
              {location}
            </AppText>
          )}
          <AppText variant="small" style={{ color: c.textMuted }}>
            {fmtDateTime(review.createdAt)}
          </AppText>
        </View>
        <View style={s.ratingCol}>
          <StarRow rating={review.rating} size={15} color={c.orange} />
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

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

  const fetch = useCallback(async (pg = 1, replace = true) => {
    try {
      const d = await getReviewsReceived({ page: pg, limit: 15 });
      setData(d);
      setReviews(replace ? d.reviews : (prev) => [...prev, ...d.reviews]);
      setTotalPages(d.pages ?? 1);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch(1, true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetch(1, true);
  };

  const loadMore = () => {
    if (page < totalPages) {
      const next = page + 1;
      setPage(next);
      fetch(next, false);
    }
  };

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
            {/* Page hero */}
            <View style={[styles.heroWrap, { borderColor: c.border }]}>
              <View style={[styles.eyebrow, { backgroundColor: c.orange }]}>
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#fff", letterSpacing: 1.2 }}
                >
                  {t("reviews.reputationEyebrow")}
                </AppText>
              </View>
              <AppText
                variant="body"
                style={{ color: c.textMuted, marginTop: 6, lineHeight: 22 }}
              >
                {t("reviews.receivedSubtitle")}
              </AppText>
              {/* See Reviews Given link */}
              <Pressable
                onPress={() => navigation.navigate("ReviewsGiven")}
                style={[
                  styles.switchBtn,
                  { borderColor: c.border, backgroundColor: c.bgCard },
                ]}
              >
                <AppText variant="body" style={{ color: c.text }}>
                  {t("reviews.seeGiven")} →
                </AppText>
              </Pressable>
            </View>

            {/* Rating summary */}
            {data && (
              <RatingSummaryCard
                avgRating={data.avgRating ?? 0}
                totalReviews={data.totalReviews ?? 0}
                distribution={data.distribution ?? {}}
                c={c}
                t={t}
              />
            )}
            <View style={{ height: 16 }} />
          </View>
        }
        renderItem={({ item }) => <ReviewCard review={item} c={c} t={t} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <AppText style={{ fontSize: 44 }}>⭐</AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12 }}
              >
                {t("reviews.noReviewsYet")}
              </AppText>
              <AppText
                variant="small"
                style={{ color: c.textMuted, marginTop: 6 }}
              >
                {t("reviews.noReceivedSub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={
          page < totalPages ? (
            <View style={{ alignItems: "center", padding: 20 }}>
              <ActivityIndicator color={c.orange} />
            </View>
          ) : (
            <View style={{ height: 40 }} />
          )
        }
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  heroWrap: { marginBottom: 20 },
  eyebrow: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  switchBtn: {
    alignSelf: "flex-start",
    marginTop: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});

const s = StyleSheet.create({
  // Summary card
  summaryCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    marginBottom: 0,
  },
  summaryTop: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  bigRating: { fontSize: 64, fontWeight: "900", lineHeight: 72 },
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 52, height: 52 },
  authorInfo: { flex: 1, gap: 1 },
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
