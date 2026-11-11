// src/screens/main/MyPostsScreen.js
//
// Verbatim port of src/pages/MyPostsPage.jsx + MyPostsPage.module.css.
// Outer horizontal + top padding set to 0 so content hugs the screen
// edges — mirrors the campaign screen's `padding: 0` change.
// Title uses <AppText weight="displayBlack"> like every other screen
// (no manual fontFamily — weight drives the Syne display font).

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

  const isCompact = width <= 640;
  const padBottom = isCompact ? 4 * 16 * fontScale : 1.5 * 16 * fontScale;

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
          paddingHorizontal: 0,
          paddingTop: 4,
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
        <View style={{ marginBottom: 12, paddingHorizontal: 1 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              lineHeight: 30,
              color: c.text,
              letterSpacing: -0.4,
              marginBottom: 4,
            }}
          >
            {t("posts.myTitle")}
          </AppText>
          <AppText
            variant="body"
            tone="dim"
            style={{ lineHeight: 18, fontSize: 13 }}
          >
            {t("posts.mySubtitle")}
          </AppText>
        </View>

        {/* ─── CreatePost (expanded, full editor) ──────── */}
        <View style={{ paddingHorizontal: 1 }}>
          <CreatePost onPostCreated={handlePostCreated} />
        </View>

        {/* ─── Spacer ──────────────────────────────────── */}
        <View style={{ height: rem(0.875) }} />

        {/* ─── Loading / Empty / Feed ──────────────────── */}
        {loading ? (
          <View style={{ gap: rem(0.75), paddingHorizontal: 4 }}>
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
                marginHorizontal: 4,
              },
            ]}
          >
            <Ionicons name="create-outline" size={rem(2)} color={c.textDim} />
            <AppText
              weight="semibold"
              style={{
                fontSize: rem(1),
                lineHeight: rem(1) * 1.3,
                color: c.text,
                marginTop: rem(0.5),
                textAlign: "center",
              }}
            >
              {t("posts.noMyPosts")}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{
                fontSize: rem(0.82),
                lineHeight: rem(0.82) * 1.4,
                textAlign: "center",
              }}
            >
              {t("posts.noMyPostsSub")}
            </AppText>
          </View>
        ) : (
          <View style={{ gap: rem(0.75), paddingHorizontal: 4 }}>
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
