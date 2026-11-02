// src/screens/main/CommunityFeedScreen.js
//
// Ported verbatim from src/pages/FeedPage.jsx + FeedPage.module.css.
//
// Sidebar hidden on mobile (matches @media max-width: 899px).
// Polling uses AppState instead of document.hidden.
// window.scrollTo → ScrollView ref.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import CreatePost from "../../components/posts/CreatePost";
import PostCard from "../../components/posts/PostCard";
import PostSkeleton from "../../components/posts/PostSkeleton";
import useFeedPolling from "../../hooks/useFeedPolling";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import tracker from "../../lib/tracker";

const FILTERS = [
  { value: "ALL", labelKey: "posts.filterAll" },
  { value: "GENERAL", labelKey: "posts.filterGeneral" },
  {
    value: "HIRING",
    labelKey: "posts.filterHiring",
    icon: "megaphone-outline",
  },
  {
    value: "ACHIEVEMENT",
    labelKey: "posts.filterAchievements",
    icon: "trophy-outline",
  },
  {
    value: "PORTFOLIO",
    labelKey: "posts.filterPortfolio",
    icon: "image-outline",
  },
  { value: "ANNOUNCEMENT", labelKey: "posts.filterAnnouncements" },
];

export default function CommunityFeedScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  const scrollRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [total, setTotal] = useState(0);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  useEffect(() => {
    tracker.track("page.feed.view", { role: user?.role || "GUEST" });
  }, []);

  const fetchPosts = useCallback(
    async (p = 1, f = filter, reset = false) => {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await client.get("/posts/feed", {
          params: {
            page: p,
            limit: 15,
            ...(f !== "ALL" && { type: f }),
          },
        });
        const newPosts = res.data?.data?.posts || [];
        const pages = res.data?.data?.pages || 1;
        setTotal(res.data?.data?.total || 0);

        if (reset || p === 1) setPosts(newPosts);
        else setPosts((prev) => [...prev, ...newPosts]);

        setHasMore(p < pages);
        tracker.track("feed.loaded", {
          page: p,
          filter: f,
          count: newPosts.length,
          total: res.data?.data?.total || 0,
          isLoadMore: p > 1,
        });
      } catch (err) {
        tracker.track("feed.load.failed", {
          page: p,
          filter: f,
          reason: err?.response?.data?.message || "unknown",
        });
        toast.error(err?.response?.data?.message || t("posts.loadFailed"));
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [filter, toast, t],
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1, filter, true);
  }, [filter]);

  const { pendingPosts, dismissPending } = useFeedPolling({
    filter,
    currentPosts: posts,
    intervalMs: 25000,
  });

  const showPending = () => {
    if (!pendingPosts.length) return;
    setPosts((prev) => [...pendingPosts, ...prev]);
    setTotal((prev) => prev + pendingPosts.length);
    dismissPending();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    tracker.action("feed.newPostsBanner.clicked", {
      pendingCount: pendingPosts.length,
      filter,
    });
  };

  const handleFilterChange = (f) => {
    const prev = filter;
    setFilter(f);
    setPage(1);
    dismissPending();
    tracker.track("feed.filter.changed", { from: prev, to: f });
  };

  const handleLoadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
    tracker.track("feed.loadMore.clicked", {
      fromPage: page,
      toPage: next,
      filter,
    });
  };

  const handlePostCreated = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setTotal((prev) => prev + 1);
    tracker.action("feed.post.created", {
      postId: newPost?.id || null,
      postType: newPost?.type || null,
      hasImages: (newPost?.images?.length || 0) > 0,
      contentLength: newPost?.content?.length || 0,
    });
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setTotal((prev) => prev - 1);
    tracker.action("feed.post.deleted", { postId });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts(1, filter, true);
  };

  return (
    <AppScreen
      scroll={false}
      contentContainerStyle={{
        paddingHorizontal: 8,
        paddingVertical: 10,
        gap: 8,
      }}
      refreshControl={null}
    >
      <ScrollView
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: width <= 640 ? 12 : 16,
          paddingVertical: 14,
          gap: 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* New posts banner */}
        {pendingPosts.length > 0 ? (
          <Pressable
            onPress={showPending}
            style={({ pressed }) => ({
              alignSelf: "center",
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: c.orange,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 999,
              opacity: pressed ? 0.9 : 1,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: 8,
            })}
          >
            <Ionicons name="arrow-up" size={14} color={c.bg} />
            <AppText
              style={{
                fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                fontSize: rem(0.78),
                fontWeight: "700",
                color: c.bg,
                marginLeft: 6,
              }}
            >
              {t("posts.newPostsBanner", {
                count: pendingPosts.length,
              })}
            </AppText>
          </Pressable>
        ) : null}

        <CreatePost onPostCreated={handlePostCreated} compact />

        {/* Filter bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingBottom: 2 }}
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <Pressable
                key={f.value}
                onPress={() => handleFilterChange(f.value)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: active ? c.orangeDim : c.bgCard,
                  borderColor: active ? c.orangeGlow : c.border,
                  borderWidth: 1,
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                {f.icon ? (
                  <Ionicons
                    name={f.icon}
                    size={12}
                    color={active ? c.orange : c.textDim}
                    style={{ marginRight: 4 }}
                  />
                ) : null}
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.75),
                    fontWeight: "600",
                    color: active ? c.orange : c.textDim,
                  }}
                >
                  {t(f.labelKey)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Total count */}
        {!loading ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.72),
                color: c.textMuted,
              }}
            >
              {t("posts.postCount", { count: total })}
            </AppText>
            {pendingPosts.length > 0 ? (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#22c55e",
                  marginLeft: 6,
                }}
              />
            ) : null}
          </View>
        ) : null}

        {/* Feed */}
        {loading ? (
          <View style={{ gap: 12 }}>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </View>
        ) : posts.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              padding: 40,
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
            }}
          >
            <Ionicons name="file-tray-outline" size={32} color={c.textDim} />
            <AppText
              style={{
                fontFamily: theme.fonts?.display || "Syne_700Bold",
                fontSize: rem(1),
                fontWeight: "700",
                color: c.text,
                marginTop: 12,
              }}
            >
              {t("posts.noPostsYet")}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.85),
                color: c.textDim,
                textAlign: "center",
                marginTop: 6,
              }}
            >
              {t("posts.noPostsSub")}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handlePostDeleted}
              />
            ))}

            {hasMore ? (
              <Pressable
                onPress={handleLoadMore}
                disabled={loadingMore}
                style={({ pressed }) => ({
                  backgroundColor: c.bgPanel,
                  borderColor: pressed ? c.orange : c.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: loadingMore ? 0.5 : 1,
                })}
              >
                {loadingMore ? (
                  <ActivityIndicator color={c.orange} />
                ) : (
                  <AppText
                    style={{
                      fontFamily:
                        theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                      fontSize: rem(0.875),
                      fontWeight: "600",
                      color: c.textDim,
                    }}
                  >
                    {t("posts.loadMorePosts")}
                  </AppText>
                )}
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}
