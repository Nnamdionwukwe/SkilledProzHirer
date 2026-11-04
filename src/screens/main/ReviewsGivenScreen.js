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
import {
  FaClipboardList,
  FaFlag,
  FaPenNib,
  FaExclamationTriangle,
} from "../../icons/fa";

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

// ─── Stars ───────────────────────────────────────────────────────────────────
function Stars({ rating, size = 12, gap = 2 }) {
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

// ─── Review Card ─────────────────────────────────────────────────────────────
function ReviewCard({ r, c, t, onViewProfile }) {
  const receiver = r.receiver || {};
  const isWorker = receiver.role === "WORKER";

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: c.border },
      ]}
    >
      {/* Top: Avatar + Info + Rating */}
      <View style={styles.cardTop}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {receiver.avatar ? (
            <Image source={{ uri: receiver.avatar }} style={styles.avatarImg} />
          ) : (
            <AppText style={{ color: c.orange, fontWeight: "700" }}>
              {initials(receiver.firstName, receiver.lastName)}
            </AppText>
          )}
        </View>

        <View style={styles.reviewerInfo}>
          <AppText
            variant="body"
            weight="semibold"
            style={{ color: c.text, fontSize: 14 }}
          >
            {receiver.firstName} {receiver.lastName}
            <AppText style={{ color: c.textDim, fontWeight: "400" }}>
              {isWorker ? " · Worker" : " · Hirer"}
            </AppText>
          </AppText>
          <AppText
            variant="small"
            style={{ color: c.textMuted, marginTop: 2, fontSize: 11 }}
          >
            {fmtDate(r.createdAt)} at {fmtTime(r.createdAt)}
          </AppText>
        </View>

        <View style={styles.ratingRight}>
          <Stars rating={r.rating} size={12} />
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              marginTop: 2,
              textAlign: "right",
            }}
          >
            {r.rating}/5
          </AppText>
        </View>
      </View>

      {/* Comment */}
      {r.comment && (
        <View style={[styles.commentWrap, { borderLeftColor: c.orange }]}>
          <AppText
            variant="body"
            style={{
              color: c.textDim,
              fontStyle: "italic",
              lineHeight: 18,
              fontSize: 13,
            }}
          >
            "{r.comment}"
          </AppText>
        </View>
      )}

      {/* Booking Chip */}
      {r.booking && (
        <View
          style={[
            styles.bookingChip,
            { backgroundColor: c.bgInput, borderColor: c.border },
          ]}
        >
          <View style={styles.chipLeft}>
            <View style={{ marginRight: 6 }}>
              {r.booking.category?.icon ? (
                <AppText style={{ color: c.orange, fontSize: 12 }}>
                  {r.booking.category.icon}
                </AppText>
              ) : (
                <FaClipboardList size={12} color={c.orange} />
              )}
            </View>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.text, fontSize: 12 }}
            >
              {r.booking.title}
            </AppText>
            {r.booking.category?.name && (
              <AppText
                variant="small"
                style={{ color: c.textMuted, marginLeft: 6, fontSize: 11 }}
              >
                {r.booking.category.name}
              </AppText>
            )}
          </View>

          <Pressable
            onPress={() => onViewProfile(receiver.id)}
            style={styles.viewProfileBtn}
          >
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: c.orange, fontSize: 12 }}
            >
              View Profile →
            </AppText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Skeleton({ c }) {
  return (
    <View style={styles.skCard}>
      <View
        style={[
          styles.skInner,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      />
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function ReviewsGivenScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const limit = 10;
  const pages = Math.ceil(total / limit) || 1;

  const doFetch = useCallback(async (pg = 1, replace = true) => {
    setLoading(true);
    setError("");
    try {
      const d = await getReviewsGiven({ page: pg, limit });
      const list = d.reviews || [];

      setReviews((prev) => (replace ? list : [...prev, ...list]));
      setTotal(d.total || 0);
    } catch {
      setError("Failed to load reviews");
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    doFetch(1, true);
  }, [doFetch]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    doFetch(1, true);
  };

  const loadMore = () => {
    if (!loading && page < pages) {
      const next = page + 1;
      setPage(next);
      doFetch(next, false);
    }
  };

  const avgRating =
    reviews.length > 0
      ? (
          reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        ).toFixed(1)
      : "—";

  return (
    <View style={[styles.page, { backgroundColor: c.bg }]}>
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
            {/* Header */}
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
                    YOUR FEEDBACK
                  </AppText>
                </View>
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 22, color: c.text, marginBottom: 4 }}
                >
                  Reviews Given
                </AppText>
                <AppText
                  variant="body"
                  style={{ color: c.textDim, fontSize: 13 }}
                >
                  Reviews you have submitted for workers after completed jobs
                </AppText>
              </View>

              <Pressable
                onPress={() => navigation.navigate("ReviewsReceived")}
                style={[
                  styles.switchBtn,
                  { borderColor: c.border, backgroundColor: c.bgCard },
                ]}
              >
                <AppText variant="body" style={{ color: c.text, fontSize: 13 }}>
                  See Reviews Received →
                </AppText>
              </Pressable>
            </View>

            {/* Report Button (icon) */}
            <Pressable style={styles.reportBtn}>
              <FaFlag size={14} color={c.textMuted} />
            </Pressable>

            {/* Stats Bar */}
            {!loading && total > 0 && (
              <View
                style={[
                  styles.givenStats,
                  { backgroundColor: c.bgPanel, borderColor: c.border },
                ]}
              >
                <View style={styles.givenStatItem}>
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 24, lineHeight: 30, color: c.orange }}
                  >
                    {total}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: c.textDim }}>
                    Review{total !== 1 ? "s" : ""} submitted
                  </AppText>
                </View>
                <View style={styles.givenStatItem}>
                  <AppText
                    weight="displayBlack"
                    style={{ fontSize: 24, lineHeight: 30, color: c.orange }}
                  >
                    {avgRating}
                  </AppText>
                  <AppText style={{ fontSize: 11, color: c.textDim }}>
                    Avg rating given
                  </AppText>
                </View>
              </View>
            )}

            {/* List Error / Empty */}
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
                <FaPenNib size={28} color={c.textMuted} />
                <AppText
                  weight="semibold"
                  style={{ color: c.text, marginTop: 12, fontSize: 14 }}
                >
                  No reviews given yet
                </AppText>
                <AppText
                  style={{
                    color: c.textDim,
                    marginTop: 4,
                    textAlign: "center",
                    fontSize: 12,
                  }}
                >
                  After a job is completed, leave a review for your worker.
                </AppText>
                <Pressable
                  onPress={() => navigation.navigate("Bookings")}
                  style={[
                    styles.emptyBtn,
                    {
                      backgroundColor: c.orangeDim,
                      borderColor: c.orangeGlow,
                    },
                  ]}
                >
                  <AppText
                    weight="semibold"
                    style={{ color: c.orange, fontSize: 12 }}
                  >
                    View Bookings →
                  </AppText>
                </Pressable>
              </View>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <ReviewCard
            r={item}
            c={c}
            t={t}
            onViewProfile={(userId) =>
              navigation.navigate("WorkerProfile", { userId })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading && reviews.length === 0 ? (
            <View style={{ gap: 12 }}>
              <Skeleton c={c} />
              <Skeleton c={c} />
              <Skeleton c={c} />
            </View>
          ) : null
        }
        ListFooterComponent={
          <View>
            {/* Pagination */}
            {pages > 1 && reviews.length > 0 && (
              <View style={[styles.pagination, { borderTopColor: c.border }]}>
                <Pressable
                  disabled={page === 1 || loading}
                  onPress={() => {
                    const prev = page - 1;
                    setPage(prev);
                    doFetch(prev, true);
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
                  {page} of {pages}
                </AppText>

                <Pressable
                  disabled={page === pages || loading}
                  onPress={() => {
                    const next = page + 1;
                    setPage(next);
                    doFetch(next, true);
                  }}
                  style={[
                    styles.pageBtn,
                    {
                      backgroundColor: c.bgCard,
                      borderColor: c.border,
                      opacity: page === pages ? 0.3 : 1,
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

// ─── Styles matching the Web UI ─────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1 },
  // Moved content tighter to edges
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
  reportBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    padding: 8,
  },
  givenStats: {
    flexDirection: "row",
    gap: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  givenStatItem: {
    flexDirection: "column",
    gap: 2,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
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
  avatarImg: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  reviewerInfo: {
    flex: 1,
  },
  ratingRight: {
    alignItems: "flex-end",
  },
  commentWrap: {
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
  chipLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    flex: 1,
  },
  viewProfileBtn: {
    marginLeft: "auto",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyBtn: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
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
  },
  skInner: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    opacity: 0.5,
  },
});
