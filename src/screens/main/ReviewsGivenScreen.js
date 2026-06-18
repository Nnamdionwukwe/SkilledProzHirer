// src/screens/main/ReviewsGivenScreen.js
// Endpoint: GET /hirers/me/reviews/given
// Shows stats card + reviews given with "View Profile →" button.
// All strings via t(). Full dark/light mode support.

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
import { getReviewsGiven } from "../../api/reviews";

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

// ── Stats card ─────────────────────────────────────────────────────────────────
function StatsCard({ totalReviews, avgRating, c, t }) {
  return (
    <View
      style={[
        s.statsCard,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      <View style={s.statItem}>
        <AppText weight="displayBlack" style={[s.statNum, { color: c.orange }]}>
          {totalReviews}
        </AppText>
        <AppText variant="body" style={{ color: c.textMuted, marginTop: 4 }}>
          {t("reviews.submitted")}
        </AppText>
      </View>
      <View style={[s.statDivider, { backgroundColor: c.border }]} />
      <View style={s.statItem}>
        <AppText weight="displayBlack" style={[s.statNum, { color: c.orange }]}>
          {Number(avgRating).toFixed(1)}
        </AppText>
        <AppText variant="body" style={{ color: c.textMuted, marginTop: 4 }}>
          {t("reviews.avgGiven")}
        </AppText>
      </View>
    </View>
  );
}

// ── Review card ────────────────────────────────────────────────────────────────
function ReviewGivenCard({ review, c, t, onViewProfile }) {
  const receiver = review.receiver ?? review.giver ?? {};
  const booking = review.booking;
  const location = [receiver.city, receiver.country].filter(Boolean).join(", ");

  return (
    <View
      style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Author row */}
      <View style={s.authorRow}>
        <View
          style={[
            s.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {receiver.avatar ? (
            <Image source={{ uri: receiver.avatar }} style={s.avatarImg} />
          ) : (
            <AppText style={{ color: c.orange, fontWeight: "700" }}>
              {initials(receiver.firstName, receiver.lastName)}
            </AppText>
          )}
        </View>

        <View style={s.authorInfo}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {receiver.firstName} {receiver.lastName}
          </AppText>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {receiver.role === "WORKER"
              ? t("reviews.worker")
              : t("reviews.hirer")}
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

      {/* Booking chip + View Profile */}
      {booking && (
        <View
          style={[
            s.bookingChip,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          <View style={s.chipLeft}>
            {!!booking.category?.icon && (
              <AppText style={{ fontSize: 14, marginRight: 6 }}>
                {booking.category.icon}
              </AppText>
            )}
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text }}
            >
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
          {/* View Profile — only on Reviews Given */}
          <Pressable
            onPress={() => onViewProfile(receiver.id)}
            style={s.viewProfileBtn}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange }}
            >
              {t("reviews.viewProfile")} →
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

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

export default function ReviewsGivenScreen({ navigation }) {
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

  const doFetch = useCallback(async (pg = 1, replace = true) => {
    try {
      const d = await getReviewsGiven({ page: pg, limit: 15 });
      setData(d);
      setReviews(
        replace ? (d.reviews ?? []) : (prev) => [...prev, ...(d.reviews ?? [])],
      );
      setTotalPages(d.pages ?? 1);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    doFetch(1, true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    doFetch(1, true);
  };
  const loadMore = () => {
    if (page < totalPages) {
      const next = page + 1;
      setPage(next);
      doFetch(next, false);
    }
  };

  // Derive stats from response
  const totalReviews = data?.total ?? reviews.length;
  const avgRating =
    data?.avgRating ??
    (reviews.length
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0);

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
            <View style={styles.heroWrap}>
              <View style={[styles.eyebrow, { backgroundColor: c.orange }]}>
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: "#fff", letterSpacing: 1.2 }}
                >
                  {t("reviews.feedbackEyebrow")}
                </AppText>
              </View>
              <AppText
                variant="body"
                style={{ color: c.textMuted, marginTop: 6, lineHeight: 22 }}
              >
                {t("reviews.givenSubtitle")}
              </AppText>
              <Pressable
                onPress={() => navigation.navigate("ReviewsReceived")}
                style={[
                  styles.switchBtn,
                  { borderColor: c.border, backgroundColor: c.bgCard },
                ]}
              >
                <AppText variant="body" style={{ color: c.text }}>
                  {t("reviews.seeReceived")} →
                </AppText>
              </Pressable>
            </View>

            {/* Stats */}
            {!loading && (
              <StatsCard
                totalReviews={totalReviews}
                avgRating={avgRating}
                c={c}
                t={t}
              />
            )}
            <View style={{ height: 16 }} />
          </View>
        }
        renderItem={({ item }) => (
          <ReviewGivenCard
            review={item}
            c={c}
            t={t}
            onViewProfile={(userId) =>
              navigation.navigate("WorkerProfile", { userId })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <AppText style={{ fontSize: 44 }}>✍️</AppText>
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
                {t("reviews.noGivenSub")}
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
  // Stats card
  statsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 24,
    flexDirection: "row",
    marginBottom: 0,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontSize: 48, fontWeight: "900", lineHeight: 54 },
  statDivider: { width: StyleSheet.hairlineWidth, marginVertical: 8 },

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
  bookingChip: { padding: 12, borderRadius: 10, borderWidth: 1, gap: 8 },
  chipLeft: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  viewProfileBtn: { alignSelf: "flex-end" },
  skCard: {
    height: 160,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
});
