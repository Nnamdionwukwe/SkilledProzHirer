// src/screens/main/MyPostsScreen.js
// Role-aware: works for both WORKER and HIRER.
// Workers see their title + verified badge in the create form.
// Endpoints: GET /posts/my, POST /posts, DELETE /posts/:id

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import ConfirmModal from "../../components/ConfirmModal";
import PostCard, { POST_TYPES } from "../../components/PostCard";
import { getMyPosts, createPost, deletePost } from "../../api/posts";

const POST_TYPE_LIST = [
  { type: "GENERAL", emoji: "💬" },
  { type: "ACHIEVEMENT", emoji: "🏆" },
  { type: "PORTFOLIO", emoji: "🎨" },
  { type: "HIRING", emoji: "📢" },
  { type: "JOB_UPDATE", emoji: "💼" },
  { type: "ANNOUNCEMENT", emoji: "📣" },
];

const LIMIT = 15;

// ─── Create Post Form ─────────────────────────────────────────────────────────
function CreatePostForm({ user, c, onPosted }) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);

  const isWorker = user?.role === "WORKER";
  const isVerified = user?.workerProfile?.verificationStatus === "VERIFIED";
  const subtitle = isWorker
    ? user?.workerProfile?.title
    : user?.hirerProfile?.companyName;

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Camera roll permission required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setImages(
        result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName ?? `photo_${Date.now()}.jpg`,
          type: a.mimeType ?? "image/jpeg",
        })),
      );
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Write something before posting.");
      return;
    }
    setPosting(true);
    try {
      const post = await createPost({ content, type, isPublic, images });
      setContent("");
      setImages([]);
      setType("GENERAL");
      onPosted?.(post);
      toast.success("Post published!");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <View
      style={[f.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* Author row */}
      <View style={f.authorRow}>
        {/* Avatar with verified badge */}
        <View style={{ position: "relative" }}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={f.avatar} />
          ) : (
            <View
              style={[
                f.avatarFallback,
                { backgroundColor: c.orangeDim, borderColor: c.border },
              ]}
            >
              <AppText
                style={{ color: c.orange, fontWeight: "700", fontSize: 16 }}
              >
                {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
              </AppText>
            </View>
          )}
          {isVerified && (
            <View style={[f.verifiedBadge, { backgroundColor: c.orange }]}>
              <Ionicons name="checkmark" size={8} color="#fff" />
            </View>
          )}
        </View>

        <View style={{ marginLeft: 12 }}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {user?.firstName} {user?.lastName}
          </AppText>
          {subtitle && (
            <AppText variant="small" tone="dim" numberOfLines={1}>
              {subtitle}
            </AppText>
          )}
          {/* Public/Private toggle */}
          <Pressable
            onPress={() => setIsPublic((v) => !v)}
            style={[f.publicBtn, { borderColor: c.border }]}
          >
            <AppText style={{ fontSize: 13 }}>{isPublic ? "🌍" : "🔒"}</AppText>
            <AppText
              variant="small"
              weight="semibold"
              style={{ marginLeft: 5, color: c.text }}
            >
              {isPublic ? "Public" : "Private"}
            </AppText>
            <AppText variant="small" tone="dim" style={{ marginLeft: 4 }}>
              ▾
            </AppText>
          </Pressable>
        </View>
      </View>

      {/* Content input */}
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="What's on your mind? Share a job update, achievement, or anything work-related..."
        placeholderTextColor={c.textMuted}
        multiline
        style={[f.textInput, { color: c.text }]}
        maxLength={2000}
      />

      {/* Image previews */}
      {images.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={f.imageScroll}
        >
          {images.map((img, i) => (
            <View key={i} style={f.previewWrap}>
              <Image source={{ uri: img.uri }} style={f.previewImg} />
              <Pressable
                onPress={() =>
                  setImages((prev) => prev.filter((_, j) => j !== i))
                }
                style={f.removeImg}
              >
                <AppText
                  style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}
                >
                  ✕
                </AppText>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Type pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={f.typeScroll}
        contentContainerStyle={{ flexDirection: "row", gap: 8 }}
      >
        {POST_TYPE_LIST.map(({ type: t, emoji }) => {
          const active = type === t;
          const meta = POST_TYPES[t];
          return (
            <Pressable
              key={t}
              onPress={() => setType(t)}
              style={[
                f.typePill,
                {
                  borderColor: active ? meta.color : c.border,
                  backgroundColor: active ? meta.bg : c.bgInput,
                },
              ]}
            >
              <AppText style={{ fontSize: 14 }}>{emoji}</AppText>
              <AppText
                variant="small"
                weight="semibold"
                style={{
                  color: active ? meta.color : c.textMuted,
                  marginLeft: 5,
                }}
              >
                {meta.label}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Bottom row */}
      <View style={[f.bottomRow, { borderTopColor: c.border }]}>
        <Pressable
          onPress={pickImages}
          style={[f.photoBtn, { borderColor: c.border }]}
        >
          <AppText style={{ fontSize: 16 }}>📷</AppText>
          <AppText
            variant="small"
            weight="semibold"
            style={{ marginLeft: 6, color: c.text }}
          >
            Photo
          </AppText>
        </Pressable>
        <Pressable
          onPress={handlePost}
          disabled={posting || !content.trim()}
          style={[
            f.postBtn,
            {
              backgroundColor: content.trim() ? c.orange : c.bgPanel,
              opacity: content.trim() ? 1 : 0.5,
            },
          ]}
        >
          {posting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
              Post
            </AppText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MyPostsScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState(null);

  const fetchPosts = useCallback(async (pg = 1, replace = true) => {
    if (replace) setLoading(true);
    try {
      const data = await getMyPosts({ page: pg, limit: LIMIT });
      setPosts(replace ? data.posts : (prev) => [...prev, ...data.posts]);
      setTotalPages(data.pages ?? 1);
    } catch {
      toast.error("Failed to load posts.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(1, true);
  }, [fetchPosts]);

  const handlePosted = (newPost) => setPosts((prev) => [newPost, ...prev]);

  const handleDelete = (postId) => {
    setModal({
      title: "Delete Post",
      message: "Delete this post permanently?",
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: async () => {
        try {
          await deletePost(postId);
          setPosts((prev) => prev.filter((p) => p.id !== postId));
          toast.success("Post deleted.");
        } catch {
          toast.error("Failed to delete.");
        }
      },
    });
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      const next = page + 1;
      setPage(next);
      fetchPosts(next, false);
    }
  };

  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setPage(1);
              fetchPosts(1, true);
            }}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={s.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            <AppText
              variant="body"
              tone="dim"
              style={{ marginBottom: 16, lineHeight: 22 }}
            >
              Share updates, achievements, and opportunities with the
              SkilledProz community.
            </AppText>
            <CreatePostForm user={user} c={c} onPosted={handlePosted} />
            <View style={{ height: 16 }} />
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            userId={user?.id}
            c={c}
            showDelete={item.author?.id === user?.id}
            onDelete={
              item.author?.id === user?.id
                ? () => handleDelete(item.id)
                : undefined
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          loading ? (
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
          ) : (
            <View style={s.empty}>
              <AppText style={{ fontSize: 40, textAlign: "center" }}>
                📝
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ textAlign: "center", marginTop: 12, color: c.text }}
              >
                No posts yet
              </AppText>
              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 6 }}
              >
                Share your first update with the community above.
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

      <ConfirmModal
        visible={!!modal}
        title={modal?.title}
        message={modal?.message}
        confirmLabel={modal?.confirmLabel}
        destructive={modal?.destructive}
        onConfirm={() => {
          modal?.onConfirm?.();
          setModal(null);
        }}
        onCancel={() => setModal(null)}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const f = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  authorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    paddingBottom: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  publicBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  textInput: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: "top",
  },
  imageScroll: { paddingHorizontal: 16, marginBottom: 10 },
  previewWrap: { marginRight: 8, position: "relative" },
  previewImg: { width: 80, height: 80, borderRadius: 10 },
  removeImg: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  typeScroll: { paddingHorizontal: 16, marginBottom: 12 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  photoBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  postBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
});

const s = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 32, lineHeight: 38, marginBottom: 4 },
  skCard: {
    height: 140,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    opacity: 0.5,
  },
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
});
