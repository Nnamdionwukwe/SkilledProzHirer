// src/screens/main/PostDetailScreen.js
//
// Verbatim port of src/pages/PostDetail.jsx + PostDetail.module.css.
//
// Mapping reference:
//   useParams()                 → route.params?.id ?? route.params?.postId
//   useNavigate()               → navigation
//   useLocation()               → route
//   location.key === "default"  → !navigation.canGoBack()
//   navigate(-1)                → navigation.goBack()
//   navigate("/feed")           → navigation.navigate("CommunityFeed")
//   navigate("/login", state)   → navigation.navigate("Login", { from })
//   api.get(`/posts/${id}`)     → getPost(id) from src/api/posts.js
//   <PostCardSkeleton />        → <PostSkeleton /> (existing RN port)
//   <PostCard post onDelete />  → <PostCard post onDelete /> (identical)
//   showBack = isHydrated       → identical
//   .page maxWidth 640          → style capped at 640
//   .page padding 1rem / 480 → 0.75rem → responsive booleans

import React, { useEffect, useState } from "react";
import {
  View,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useNavigation, useRoute } from "@react-navigation/native";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import PostCard from "../../components/posts/PostCard";
import PostSkeleton from "../../components/posts/PostSkeleton";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import { getPost } from "../../api/posts";

export default function PostDetailScreen() {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { user, isHydrated } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();

  // Route param — the website uses :id; we accept both names
  const postId = route.params?.id ?? route.params?.postId;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  // Compact paddings — mirror @media (max-width: 480px) { .page { padding: 0.75rem } }
  const isCompact = width <= 480;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getPost(postId)
      .then((fetched) => {
        if (cancelled) return;
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

  // ─── Smart back handler — verbatim from website ────────────
  const handleBack = () => {
    // 1. Not logged in → login page, remember where they came from
    if (!user) {
      navigation.navigate("Login", {
        from: route.name,
        params: route.params,
      });
      return;
    }

    // 2. Logged in but arrived via direct load (deep link / cold start).
    //    RN equivalent of `location.key === "default"` = "no previous screen".
    if (!navigation.canGoBack()) {
      navigation.navigate("CommunityFeed");
      return;
    }

    // 3. Logged in and arrived from within the app → normal back
    navigation.goBack();
  };

  // Wait until auth state has been restored — matches `const showBack = isHydrated`
  const showBack = isHydrated;

  return (
    <AppScreen
      scroll={false}
      contentContainerStyle={{
        // .page { max-width: 640; margin: 0 auto; padding: 1rem } — mirrored via wrapper
        flex: 1,
        alignItems: "center",
      }}
    >
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{
          maxWidth: 640,
          width: "100%",
          alignSelf: "center",
          padding: isCompact ? 0.75 * 16 * fontScale : 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Back button (mirrors {showBack && <button className={styles.backBtn}>…} */}
        {showBack ? (
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              {
                marginBottom: 0.75 * 16 * fontScale,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <AppText
              style={{
                fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                fontSize: rem(0.85),
                fontWeight: "600",
                color: c.textDim,
              }}
            >
              ← {t("common.back")}
            </AppText>
          </Pressable>
        ) : null}

        {/* ─── Loading — mirrors `{loading && <><PostCardSkeleton /><PostCardSkeleton /></>}` */}
        {loading ? (
          <View style={{ gap: rem(0.75) }}>
            <PostSkeleton />
            <PostSkeleton />
          </View>
        ) : null}

        {/* ─── Error state ──────────────────────────────────────
            Mirrors:
              <div className={styles.state}>
                <p className={styles.stateTitle}>{error}</p>
                <p className={styles.stateSub}>The post may have been deleted or made private.</p>
                <Link to="/feed" className={styles.stateLink}>Go to feed</Link>
              </div>
        */}
        {!loading && error ? (
          <View style={styles.state}>
            <AppText
              style={{
                fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
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
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(0.82),
                color: c.textDim,
                textAlign: "center",
              }}
            >
              {t("posts.postMayBeDeleted")}
            </AppText>
            <Pressable
              onPress={() => navigation.navigate("CommunityFeed")}
              hitSlop={8}
              style={({ pressed }) => [
                styles.stateLink,
                {
                  marginTop: rem(0.5),
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
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

        {/* ─── PostCard — mirrors `{!loading && post && <PostCard post={post} onDelete={() => navigate("/feed")} />}` */}
        {!loading && post ? (
          <PostCard
            post={post}
            onDelete={() => navigation.navigate("CommunityFeed")}
          />
        ) : null}
      </ScrollView>
    </AppScreen>
  );
}

// ─── Styles (verbatim from PostDetail.module.css) ─────────────
const styles = StyleSheet.create({
  // .backBtn — background none, border none, text-dim, 0.85rem, 600, padding 0.4rem 0
  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 0.4 * 16,
  },

  // .state — center, 3rem 1rem padding, gap 0.5rem, column
  state: {
    paddingVertical: 3 * 16,
    paddingHorizontal: 1 * 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: 0.5 * 16,
  },

  // .stateLink — color orange, 600, 0.85rem
  stateLink: {
    alignItems: "center",
  },
});
