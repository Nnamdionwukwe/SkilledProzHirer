// src/screens/main/PostDetailScreen.js
//
// Ported verbatim from src/pages/PostDetail.jsx + PostDetail.module.css.
// "Back" smart logic preserved via navigation.canGoBack().

import React, { useEffect, useState } from "react";
import { View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PostCard from "../../components/posts/PostCard";
import PostSkeleton from "../../components/posts/PostSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user, isHydrated } = useAuthStore();

  const postId = route.params?.postId || route.params?.id;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    client
      .get(`/posts/${postId}`)
      .then((res) => {
        if (cancelled) return;
        const payload = res?.data?.data ?? res?.data;
        const fetched = payload?.post ?? payload;
        setPost(fetched ?? null);
        if (!fetched) setError(t("posts.postNoLongerExists"));
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err?.response?.status === 404
            ? t("posts.postNoLongerExists")
            : t("posts.postLoadFailed"),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [postId, t]);

  const handleBack = () => {
    if (!user) {
      navigation.navigate("Login");
      return;
    }
    if (!navigation.canGoBack()) {
      navigation.navigate("CommunityFeed");
      return;
    }
    navigation.goBack();
  };

  const showBack = isHydrated;

  return (
    <AppScreen
      contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 14 }}
    >
      {showBack ? (
        <Pressable
          onPress={handleBack}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <AppText
            style={{
              fontSize: rem(0.85),
              fontWeight: "600",
              color: c.textDim,
            }}
          >
            ← {t("common.back")}
          </AppText>
        </Pressable>
      ) : null}

      {loading ? (
        <>
          <PostSkeleton />
          <PostSkeleton />
        </>
      ) : null}

      {!loading && error ? (
        <View
          style={{
            alignItems: "center",
            paddingVertical: 48,
            paddingHorizontal: 16,
          }}
        >
          <AppText
            style={{
              fontSize: rem(0.95),
              fontWeight: "700",
              color: c.text,
              textAlign: "center",
            }}
          >
            {error}
          </AppText>
          <AppText
            style={{
              fontSize: rem(0.82),
              color: c.textDim,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            {t("posts.postMayBeDeleted")}
          </AppText>
          <Pressable
            onPress={() => navigation.navigate("CommunityFeed")}
            style={{ marginTop: 16 }}
          >
            <AppText
              style={{
                fontSize: rem(0.85),
                fontWeight: "600",
                color: c.orange,
              }}
            >
              {t("posts.goToFeed")}
            </AppText>
          </Pressable>
        </View>
      ) : null}

      {!loading && post ? (
        <PostCard
          post={post}
          onDelete={() => navigation.navigate("CommunityFeed")}
        />
      ) : null}
    </AppScreen>
  );
}
