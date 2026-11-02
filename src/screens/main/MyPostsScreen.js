// src/screens/main/MyPostsScreen.js
//
// Verbatim port of src/pages/MyPostsPage.jsx + MyPostsPage.module.css.
//
// Mapping reference:
//   .myPostsPage { margin: -1.25rem; padding: 0.75rem 0.75rem 4rem } @≤640px
//     → AppScreen with 0 base padding; listContent uses 0.75rem × 16 × fontScale
//       padding (≈10.8px on mobile, matching the website's visible padding).
//   .myPostsPage { padding: 1.5rem } @≥900px
//     → 1.5rem × 16 × fontScale (≈24px) on wide screens.
//   .myPostsHeader / .myPostsTitle / .myPostsSub → identical text scale + weight.
//   .myPostsSpacer 0.875rem → <View style={{ height: rem(0.875) }} />
//   <CreatePost onPostCreated /> (expanded, not compact)
//     → <CreatePost onPostCreated={...} /> — existing component.
//   <PostCard post onDelete />  → identical.
//   styles.feedList { gap: 0.75rem } → <View style={{ gap: rem(0.75) }}>
//   .empty block with FiEdit3 → Ionicons "create-outline"

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import CreatePost from "../../components/posts/CreatePost";
import PostCard from "../../components/posts/PostCard";
import PostSkeleton from "../../components/posts/PostSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { getMyPosts } from "../../api/posts";

export default function MyPostsScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { width } = useWindowDimensions();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  // Breakpoints — mirror CSS:
  //   Default → padding 1.5rem  (≥ 900 / wide tablets)
  //   ≤ 640   → padding 0.75rem (mobile, which is the primary target)
  const isCompact = width <= 640;
  const isWide = width >= 900;

  // Visible padding from screen edge:
  //   ≤ 640  → 0.75rem × 16 × fontScale  (~10.8px on 360w)
  //   641-899 → 1rem × 16 × fontScale    (interpolated)
  //   ≥ 900  → 1.5rem × 16 × fontScale   (~24px on tablet)
  const padH = isCompact
    ? 0.75 * 16 * fontScale
    : isWide
      ? 1.5 * 16 * fontScale
      : 1 * 16 * fontScale;

  const padBottom = isCompact ? 4 * 16 * fontScale : 1.5 * 16 * fontScale;

  // Header text sizes — rem × 16 × fontScale
  const titleFs = 1.5 * 16 * fontScale;
  const subFs = 0.85 * 16 * fontScale;

  const fetchPosts = useCallback(
    async (opts = {}) => {
      if (!opts.silent) setLoading(true);
      try {
        const data = await getMyPosts();
        setPosts(data?.posts || []);
      } catch (err) {
        toast.error(err?.response?.data?.message || t("posts.loadFailed"));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast, t],
  );

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts({ silent: true });
  };

  const handlePostCreated = (newPost) => {
    if (!newPost) return;
    setPosts((prev) => [newPost, ...prev]);
  };

  const handlePostDeleted = (postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  return (
    <AppScreen
      scroll={false}
      contentContainerStyle={{ flex: 1, backgroundColor: c.bg }}
    >
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{
          paddingHorizontal: padH,
          paddingTop: padH,
          paddingBottom: padBottom,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
            colors={[c.orange]}
          />
        }
      >
        {/* ─── Header ──────────────────────────────────── */}
        <View style={{ marginBottom: rem(0.5) }}>
          <AppText
            style={{
              fontFamily: theme.fonts?.displayBlack || "Syne_800ExtraBold",
              fontSize: titleFs,
              lineHeight: titleFs * 1.2,
              fontWeight: "800",
              color: c.text,
              letterSpacing: -0.02 * titleFs,
              marginBottom: rem(0.25),
            }}
          >
            {t("posts.myTitle")}
          </AppText>
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: subFs,
              lineHeight: subFs * 1.45,
              color: c.textDim,
            }}
          >
            {t("posts.mySubtitle")}
          </AppText>
        </View>

        {/* ─── CreatePost (expanded, full editor) ──────── */}
        <CreatePost onPostCreated={handlePostCreated} />

        {/* ─── Spacer 0.875rem ─────────────────────────── */}
        <View style={{ height: rem(0.875) }} />

        {/* ─── Loading / Empty / Feed ──────────────────── */}
        {loading ? (
          <View style={{ gap: rem(0.75) }}>
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </View>
        ) : posts.length === 0 ? (
          <View
            style={[
              styles.empty,
              {
                backgroundColor: c.bgPanel,
                borderColor: c.border,
                paddingVertical: rem(2.5),
                paddingHorizontal: rem(1.5),
                gap: rem(0.5),
              },
            ]}
          >
            <Ionicons name="create-outline" size={rem(2)} color={c.textDim} />
            <AppText
              style={{
                fontFamily: theme.fonts?.display || "Syne_700Bold",
                fontSize: rem(1),
                lineHeight: rem(1) * 1.3,
                fontWeight: "700",
                color: c.text,
                marginTop: rem(0.5),
                textAlign: "center",
              }}
            >
              {t("posts.noMyPosts")}
            </AppText>
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.82),
                lineHeight: rem(0.82) * 1.4,
                color: c.textDim,
                textAlign: "center",
              }}
            >
              {t("posts.noMyPostsSub")}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: rem(0.75) }}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDelete={handlePostDeleted}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  empty: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 14,
  },
});
