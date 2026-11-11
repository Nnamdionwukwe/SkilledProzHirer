// src/screens/main/worker/WorkerReviewsScreen.js
// Verbatim port of pages/worker/reviews/ReviewsPage.jsx.
//
// Endpoints:
//   GET /reviews/worker/:id?page=&limit=          — received
//   GET /workers/dashboard/reviews/given?page=&limit= — given (lazy)

import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

const PAGE_SIZE = 10;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(u) {
  if (!u) return "?";
  return `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`.toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ rating, size = "md", c }) {
  const rounded = Math.round(rating || 0);
  const starSize = size === "lg" ? 16 : 14;
  return (
    <View style={{ flexDirection: "row", gap: 2, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= rounded ? "star" : "star-outline"}
          size={starSize}
          color={s <= rounded ? c.orange : c.border}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETONS
// ─────────────────────────────────────────────────────────────────────────────
function ReviewSkeleton({ c }) {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            padding: 16,
            gap: 12,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Skeleton width={40} height={40} radius={20} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="40%" height={12} radius={4} />
              <Skeleton width="60%" height={10} radius={4} />
            </View>
            <Skeleton width={90} height={14} radius={4} />
          </View>
          <Skeleton width="100%" height={40} radius={8} />
        </View>
      ))}
    </View>
  );
}

function SummarySkeleton({ c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 16,
        padding: 20,
        flexDirection: "row",
        gap: 20,
        flexWrap: "wrap",
      }}
    >
      <Skeleton width={110} height={56} radius={10} />
      <View style={{ flex: 1, minWidth: 200, gap: 8 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} width="100%" height={8} radius={4} />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVED CARD
// ─────────────────────────────────────────────────────────────────────────────
function ReceivedCard({ review, c, t }) {
  const giver = review.giver;
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.orangeDim,
            borderWidth: 1,
            borderColor: c.orange + "55",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {giver?.avatar ? (
            <Image
              source={{ uri: giver.avatar }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <AppText
              style={{ fontSize: 13, fontWeight: "700", color: c.orange }}
            >
              {initials(giver)}
            </AppText>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            weight="displayBlack"
            style={{ fontSize: 10, color: c.text, marginBottom: 4 }}
            numberOfLines={1}
          >
            {giver?.firstName} {giver?.lastName}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {review.booking?.title ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={11}
                  color={c.textMuted}
                />
                <AppText
                  style={{ fontSize: 11, color: c.textMuted }}
                  numberOfLines={1}
                >
                  {review.booking.title}
                </AppText>
              </View>
            ) : null}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="calendar-outline" size={11} color={c.textMuted} />
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {fmtDate(review.createdAt)}
              </AppText>
            </View>
          </View>
        </View>
        <Stars rating={review.rating} c={c} />
      </View>

      {review.comment ? (
        <View
          style={{
            paddingLeft: 12,
            borderLeftWidth: 2,
            borderLeftColor: c.orange + "55",
          }}
        >
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              lineHeight: 20,
              fontStyle: "italic",
            }}
          >
            "{review.comment}"
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GIVEN CARD
// ─────────────────────────────────────────────────────────────────────────────
function GivenCard({ review, c, t }) {
  const receiver = review.receiver;
  const roleLabel = receiver?.role
    ? receiver.role.charAt(0) + receiver.role.slice(1).toLowerCase()
    : null;

  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 16,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.orangeDim,
            borderWidth: 1,
            borderColor: c.orange + "55",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {receiver?.avatar ? (
            <Image
              source={{ uri: receiver.avatar }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="cover"
            />
          ) : (
            <AppText
              style={{ fontSize: 13, fontWeight: "700", color: c.orange }}
            >
              {initials(receiver)}
            </AppText>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <AppText
            weight="displayBlack"
            style={{ fontSize: 10, color: c.text, marginBottom: 4 }}
            numberOfLines={1}
          >
            {receiver?.firstName} {receiver?.lastName}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {review.booking?.title ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons
                  name="briefcase-outline"
                  size={11}
                  color={c.textMuted}
                />
                <AppText
                  style={{ fontSize: 11, color: c.textMuted }}
                  numberOfLines={1}
                >
                  {review.booking.title}
                </AppText>
              </View>
            ) : null}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
            >
              <Ionicons name="calendar-outline" size={11} color={c.textMuted} />
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {fmtDate(review.createdAt)}
              </AppText>
            </View>
            {roleLabel ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons name="person-outline" size={11} color={c.textMuted} />
                <AppText style={{ fontSize: 11, color: c.textMuted }}>
                  {roleLabel}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
        <Stars rating={review.rating} c={c} />
      </View>

      {review.comment ? (
        <View
          style={{
            paddingLeft: 12,
            borderLeftWidth: 2,
            borderLeftColor: c.orange + "55",
            marginBottom: 10,
          }}
        >
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              lineHeight: 20,
              fontStyle: "italic",
            }}
          >
            "{review.comment}"
          </AppText>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 5,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: c.orangeDim,
        }}
      >
        <Ionicons name="paper-plane-outline" size={11} color={c.orange} />
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "800",
            color: c.orange,
            letterSpacing: 0.5,
            textTransform: "uppercase",
          }}
        >
          {t("workerReviews.givenBadge")}
        </AppText>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerReviewsScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const c = theme.colors;

  const [tab, setTab] = useState("received"); // "received" | "given"

  // Received
  const [received, setReceived] = useState([]);
  const [receivedTotal, setReceivedTotal] = useState(0);
  const [receivedPage, setReceivedPage] = useState(1);
  const [receivedLoading, setReceivedLoading] = useState(true);
  const [receivedError, setReceivedError] = useState("");
  const [avgRating, setAvgRating] = useState(0);
  const [distribution, setDistribution] = useState({});

  // Given
  const [given, setGiven] = useState([]);
  const [givenTotal, setGivenTotal] = useState(0);
  const [givenPage, setGivenPage] = useState(1);
  const [givenLoading, setGivenLoading] = useState(false);
  const [givenError, setGivenError] = useState("");
  const [givenLoaded, setGivenLoaded] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const receivedPages = Math.max(1, Math.ceil(receivedTotal / PAGE_SIZE));
  const givenPages = Math.max(1, Math.ceil(givenTotal / PAGE_SIZE));

  // ── Fetch received ──
  const fetchReceived = useCallback(
    async (page = 1, silent = false) => {
      if (!user?.id) {
        setReceivedLoading(false);
        return;
      }
      if (!silent) setReceivedLoading(true);
      setReceivedError("");
      try {
        const res = await client.get(`/reviews/worker/${user.id}`, {
          params: { page, limit: PAGE_SIZE },
        });
        const d = res.data?.data || {};
        setReceived(d.reviews || []);
        setReceivedTotal(d.total || 0);
        setAvgRating(d.avgRating || 0);
        setDistribution(d.distribution || {});
        setReceivedPage(page);
      } catch (err) {
        setReceived([]);
        setReceivedTotal(0);
        setReceivedError(
          err?.response?.data?.message || t("workerReviews.loadFailed"),
        );
      } finally {
        setReceivedLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, t],
  );

  // ── Fetch given (lazy first load) ──
  const fetchGiven = useCallback(
    async (page = 1) => {
      if (!user?.id) return;
      setGivenLoading(true);
      setGivenError("");
      try {
        const res = await client.get("/workers/dashboard/reviews/given", {
          params: { page, limit: PAGE_SIZE },
        });
        const d = res.data?.data || {};
        setGiven(d.reviews || []);
        setGivenTotal(d.total || 0);
        setGivenPage(page);
        setGivenLoaded(true);
      } catch (err) {
        setGivenError(
          err?.response?.data?.message || t("workerReviews.givenLoadFailed"),
        );
      } finally {
        setGivenLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id, t],
  );

  useEffect(() => {
    fetchReceived(1);
  }, [fetchReceived]);

  useEffect(() => {
    if (tab === "given" && !givenLoaded) {
      fetchGiven(1);
    }
  }, [tab, givenLoaded, fetchGiven]);

  useFocusEffect(
    useCallback(() => {
      fetchReceived(receivedPage, true);
      if (givenLoaded) fetchGiven(givenPage);
    }, [fetchReceived, fetchGiven, receivedPage, givenPage, givenLoaded]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    if (tab === "received") fetchReceived(receivedPage, true);
    else if (givenLoaded) fetchGiven(givenPage);
    else setRefreshing(false);
  };

  const ratingCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = distribution[star] || 0;
    return {
      star,
      count,
      pct: receivedTotal ? (count / receivedTotal) * 100 : 0,
    };
  });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Header */}
      <View style={{ marginTop: 4, marginBottom: 4 }}>
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 15,
            color: c.text,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t("workerReviews.title")}
        </AppText>
        <AppText style={{ fontSize: 13, color: c.textDim, lineHeight: 19 }}>
          {tab === "received"
            ? t("workerReviews.subtitleReceived")
            : t("workerReviews.subtitleGiven")}
        </AppText>
      </View>

      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          gap: 4,
          padding: 4,
          alignSelf: "flex-start",
          borderRadius: 999,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
        }}
      >
        <TabPill
          active={tab === "received"}
          icon="mail-outline"
          label={t("workerReviews.tabs.received")}
          count={receivedTotal}
          onPress={() => setTab("received")}
          c={c}
        />
        <TabPill
          active={tab === "given"}
          icon="paper-plane-outline"
          label={t("workerReviews.tabs.given")}
          count={givenTotal}
          onPress={() => setTab("given")}
          c={c}
        />
      </View>

      {/* Content */}
      {tab === "received" ? (
        <ReceivedTab
          loading={receivedLoading}
          error={receivedError}
          reviews={received}
          total={receivedTotal}
          avgRating={avgRating}
          ratingCounts={ratingCounts}
          page={receivedPage}
          pages={receivedPages}
          setPage={fetchReceived}
          c={c}
          t={t}
        />
      ) : (
        <GivenTab
          loading={givenLoading}
          error={givenError}
          reviews={given}
          total={givenTotal}
          page={givenPage}
          pages={givenPages}
          setPage={fetchGiven}
          c={c}
          t={t}
        />
      )}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB PILL
// ─────────────────────────────────────────────────────────────────────────────
function TabPill({ active, icon, label, count, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: active ? c.orangeDim : "transparent",
        borderWidth: 1,
        borderColor: active ? c.orange + "88" : "transparent",
      }}
    >
      <Ionicons name={icon} size={14} color={active ? c.orange : c.textDim} />
      <AppText
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: active ? c.orange : c.textDim,
        }}
      >
        {label}
      </AppText>
      {count > 0 ? (
        <View
          style={{
            minWidth: 20,
            height: 20,
            paddingHorizontal: 5,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? c.orange + "33" : c.bgCard,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "800",
              color: active ? c.orange : c.textMuted,
            }}
          >
            {count}
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RECEIVED TAB
// ─────────────────────────────────────────────────────────────────────────────
function ReceivedTab({
  loading,
  error,
  reviews,
  total,
  avgRating,
  ratingCounts,
  page,
  pages,
  setPage,
  c,
  t,
}) {
  return (
    <>
      {/* Summary block */}
      {loading ? (
        <SummarySkeleton c={c} />
      ) : total > 0 ? (
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 16,
            padding: 20,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 20,
              flexShrink: 0,
            }}
          >
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 46,
                color: c.orange,
                letterSpacing: -2,
                lineHeight: 46,
              }}
            >
              {avgRating > 0 ? avgRating.toFixed(1) : "—"}
            </AppText>
            <View>
              <Stars rating={avgRating} size="lg" c={c} />
              <AppText
                style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}
              >
                {t("workerReviews.reviewCount", { count: total })}
              </AppText>
            </View>
          </View>

          <View style={{ flex: 1, minWidth: 200, gap: 8 }}>
            {ratingCounts.map(({ star, count, pct }) => (
              <View
                key={star}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: "600",
                    color: c.textDim,
                    width: 26,
                    textAlign: "right",
                  }}
                >
                  {star} ★
                </AppText>
                <View
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 999,
                    overflow: "hidden",
                    backgroundColor: c.bgCard,
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: c.orange,
                      borderRadius: 999,
                    }}
                  />
                </View>
                <AppText
                  style={{
                    fontSize: 11,
                    color: c.textMuted,
                    width: 22,
                    textAlign: "right",
                  }}
                >
                  {count}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* List */}
      {loading ? (
        <ReviewSkeleton c={c} />
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t("workerReviews.errorTitle")}
          body={error}
          c={c}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="star-outline"
          title={t("workerReviews.emptyReceivedTitle")}
          body={t("workerReviews.emptyReceivedBody")}
          c={c}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {reviews.map((r) => (
            <ReceivedCard key={r.id} review={r} c={c} t={t} />
          ))}
        </View>
      )}

      {!loading && !error && pages > 1 ? (
        <Pagination
          page={page}
          pages={pages}
          onPrev={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(Math.min(pages, page + 1))}
          c={c}
          t={t}
        />
      ) : null}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GIVEN TAB
// ─────────────────────────────────────────────────────────────────────────────
function GivenTab({
  loading,
  error,
  reviews,
  total,
  page,
  pages,
  setPage,
  c,
  t,
}) {
  return (
    <>
      {loading ? (
        <ReviewSkeleton c={c} />
      ) : error ? (
        <EmptyState
          icon="alert-circle-outline"
          title={t("workerReviews.errorTitle")}
          body={error}
          c={c}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="paper-plane-outline"
          title={t("workerReviews.emptyGivenTitle")}
          body={t("workerReviews.emptyGivenBody")}
          c={c}
        />
      ) : (
        <View style={{ gap: 12 }}>
          {reviews.map((r) => (
            <GivenCard key={r.id} review={r} c={c} t={t} />
          ))}
        </View>
      )}

      {!loading && !error && pages > 1 ? (
        <Pagination
          page={page}
          pages={pages}
          onPrev={() => setPage(Math.max(1, page - 1))}
          onNext={() => setPage(Math.min(pages, page + 1))}
          c={c}
          t={t}
        />
      ) : null}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, body, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 16,
        paddingVertical: 48,
        paddingHorizontal: 24,
        alignItems: "center",
        gap: 8,
      }}
    >
      <Ionicons
        name={icon}
        size={40}
        color={c.orange}
        style={{ opacity: 0.5 }}
      />
      <AppText
        weight="displayBlack"
        style={{ fontSize: 16, color: c.text, marginTop: 4 }}
      >
        {title}
      </AppText>
      <AppText
        style={{
          fontSize: 13,
          color: c.textDim,
          textAlign: "center",
          maxWidth: 320,
          lineHeight: 19,
        }}
      >
        {body}
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────
function Pagination({ page, pages, onPrev, onNext, c, t }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        marginTop: 8,
      }}
    >
      <Pressable
        disabled={page === 1}
        onPress={onPrev}
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: page === 1 ? c.border : c.orange,
          backgroundColor: c.bgPanel,
          opacity: page === 1 ? 0.35 : pressed ? 0.85 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        })}
      >
        <Ionicons
          name="chevron-back"
          size={14}
          color={page === 1 ? c.textMuted : c.orange}
        />
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: page === 1 ? c.textMuted : c.orange,
          }}
        >
          {t("workerReviews.pagination.prev")}
        </AppText>
      </Pressable>
      <AppText style={{ fontSize: 12, color: c.textMuted }}>
        {t("workerReviews.pagination.pageOf", { page, pages })}
      </AppText>
      <Pressable
        disabled={page === pages}
        onPress={onNext}
        style={({ pressed }) => ({
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: page === pages ? c.border : c.orange,
          backgroundColor: c.bgPanel,
          opacity: page === pages ? 0.35 : pressed ? 0.85 : 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        })}
      >
        <AppText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: page === pages ? c.textMuted : c.orange,
          }}
        >
          {t("workerReviews.pagination.next")}
        </AppText>
        <Ionicons
          name="chevron-forward"
          size={14}
          color={page === pages ? c.textMuted : c.orange}
        />
      </Pressable>
    </View>
  );
}
