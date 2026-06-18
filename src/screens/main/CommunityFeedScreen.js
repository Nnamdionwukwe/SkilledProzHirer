// src/screens/main/CommunityFeedScreen.js
// Mirrors the website's Community Feed page.
// Compact create bar at top + type filter tabs + infinite scroll feed.
// Endpoints: GET /posts/feed?type=X&page=N, POST /posts, DELETE /posts/:id

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import ConfirmModal from "../../components/ConfirmModal";
import PostCard, { POST_TYPES } from "../../components/PostCard";
import { getFeed, createPost, deletePost } from "../../api/posts";

// ── Filter tab config ──────────────────────────────────────────────────────────
const FEED_TABS = [
  { key: "ALL", label: "All" },
  { key: "GENERAL", label: "General" },
  { key: "HIRING", label: "Hiring 📢" },
  { key: "ACHIEVEMENT", label: "Achievements 🏆" },
  { key: "PORTFOLIO", label: "Portfolio 🎨" },
  { key: "JOB_UPDATE", label: "Job Update 💼" },
  { key: "ANNOUNCEMENT", label: "Announcements 📣" },
];

const POST_TYPE_LIST = [
  { type: "GENERAL", emoji: "💬" },
  { type: "ACHIEVEMENT", emoji: "🏆" },
  { type: "PORTFOLIO", emoji: "🎨" },
  { type: "HIRING", emoji: "📢" },
  { type: "JOB_UPDATE", emoji: "💼" },
  { type: "ANNOUNCEMENT", emoji: "📣" },
];

const LIMIT = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Full Create Post Sheet (opens from compact bar)
// ─────────────────────────────────────────────────────────────────────────────
function CreatePostSheet({ user, visible, onClose, onPosted, c }) {
  const toast = useToast();
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState([]);
  const [posting, setPosting] = useState(false);

  const reset = () => {
    setContent("");
    setType("GENERAL");
    setImages([]);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required.");
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
          type: a.type ?? "image/jpeg",
        })),
      );
    }
  };

  const handlePost = async () => {
    if (!content.trim()) {
      toast.error("Write something first.");
      return;
    }
    setPosting(true);
    try {
      const post = await createPost({ content, type, isPublic, images });
      reset();
      onPosted?.(post);
      onClose();
      toast.success("Post published!");
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Failed to post.");
    } finally {
      setPosting(false);
    }
  };

  if (!visible) return null;

  const name = user?.firstName
    ? `${user.firstName} ${user.lastName ?? ""}`.trim()
    : (user?.hirerProfile?.companyName ?? "You");

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={sh.backdrop} onPress={handleClose}>
        <Pressable
          style={[
            sh.sheet,
            { backgroundColor: c.bgCard, borderTopColor: c.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={[sh.handle, { backgroundColor: c.border }]} />

          {/* Header */}
          <View style={sh.sheetHeader}>
            <View
              style={[
                sh.avatar,
                { backgroundColor: c.orangeDim, borderColor: c.border },
              ]}
            >
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={sh.avatarImg} />
              ) : (
                <AppText style={{ color: c.orange, fontWeight: "700" }}>
                  {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
                </AppText>
              )}
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <AppText variant="body" weight="semibold">
                {name}
              </AppText>
              <Pressable
                onPress={() => setIsPublic((v) => !v)}
                style={[sh.publicBtn, { borderColor: c.border }]}
              >
                <AppText style={{ fontSize: 13 }}>
                  {isPublic ? "🌍" : "🔒"}
                </AppText>
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ marginLeft: 5 }}
                >
                  {isPublic ? "Public" : "Private"}
                </AppText>
              </Pressable>
            </View>
            <Pressable
              onPress={handleClose}
              style={[
                sh.closeBtn,
                { backgroundColor: c.bgInput, borderColor: c.border },
              ]}
            >
              <AppText tone="dim">✕</AppText>
            </Pressable>
          </View>

          {/* Text input */}
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder="What's on your mind? Share a job update, achievement, or anything work-related..."
            placeholderTextColor={c.textMuted}
            multiline
            autoFocus
            style={[sh.textInput, { color: c.text }]}
            maxLength={2000}
          />

          {/* Image previews */}
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ paddingHorizontal: 16, marginBottom: 10 }}
            >
              {images.map((img, i) => (
                <View key={i} style={sh.previewWrap}>
                  <Image source={{ uri: img.uri }} style={sh.previewImg} />
                  <Pressable
                    onPress={() =>
                      setImages((prev) => prev.filter((_, j) => j !== i))
                    }
                    style={sh.removeImg}
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
            style={sh.typeScroll}
            contentContainerStyle={sh.typeContent}
          >
            {POST_TYPE_LIST.map(({ type: t, emoji }) => {
              const active = type === t;
              const meta = POST_TYPES[t];
              return (
                <Pressable
                  key={t}
                  onPress={() => setType(t)}
                  style={[
                    sh.typePill,
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
          <View style={[sh.bottomRow, { borderTopColor: c.border }]}>
            <Pressable
              onPress={pickImages}
              style={[sh.iconBtn, { borderColor: c.border }]}
            >
              <AppText style={{ fontSize: 20 }}>📷</AppText>
            </Pressable>
            <Pressable
              onPress={() => {
                /* announce — sets type */ setType("ANNOUNCEMENT");
              }}
              style={[sh.iconBtn, { borderColor: c.border }]}
            >
              <AppText style={{ fontSize: 20 }}>📢</AppText>
            </Pressable>
            <Pressable
              onPress={handlePost}
              disabled={posting || !content.trim()}
              style={[
                sh.postBtn,
                {
                  backgroundColor: content.trim() ? c.orange : c.bgInput,
                  opacity: content.trim() ? 1 : 0.5,
                  marginLeft: "auto",
                },
              ]}
            >
              {posting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: "#fff" }}
                >
                  Post
                </AppText>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function CommunityFeedScreen({ navigation }) {
  const { theme: th } = useTheme();
  const c = th.colors;
  const toast = useToast();
  const { user } = useAuthStore();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [modal, setModal] = useState(null);

  const fetchFeed = useCallback(
    async (pg = 1, tab = activeTab, replace = true) => {
      if (replace) setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (tab !== "ALL") params.type = tab;
        const data = await getFeed(params);
        setPosts(replace ? data.posts : (prev) => [...prev, ...data.posts]);
        setTotal(data.total ?? 0);
        setTotalPages(data.pages ?? 1);
      } catch {
        toast.error("Failed to load feed.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    setPage(1);
    fetchFeed(1, activeTab, true);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchFeed(1, activeTab, true);
  };

  const handlePosted = (newPost) => {
    setPosts((prev) => [newPost, ...prev]);
    setTotal((t) => t + 1);
  };

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
          setTotal((t) => t - 1);
          toast.success("Post deleted.");
        } catch {
          toast.error("Failed to delete post.");
        }
      },
    });
  };

  const loadMore = () => {
    if (page < totalPages && !loading) {
      const next = page + 1;
      setPage(next);
      fetchFeed(next, activeTab, false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        contentContainerStyle={styles.listContent}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View>
            {/* Compact create bar */}
            <Pressable
              onPress={() => setSheetVisible(true)}
              style={[
                styles.createBar,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <View
                style={[
                  styles.barAvatar,
                  { backgroundColor: c.orangeDim, borderColor: c.border },
                ]}
              >
                {user?.avatar ? (
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.barAvatarImg}
                  />
                ) : (
                  <AppText
                    style={{ color: c.orange, fontWeight: "700", fontSize: 12 }}
                  >
                    {(user?.firstName?.[0] ?? "") + (user?.lastName?.[0] ?? "")}
                  </AppText>
                )}
              </View>
              <View
                style={[
                  styles.barInput,
                  { backgroundColor: c.bgInput, borderColor: c.border },
                ]}
              >
                <AppText variant="body" tone="dim">
                  Start a post, share an update…
                </AppText>
              </View>
              <Pressable
                onPress={() => {
                  setSheetVisible(true);
                }}
                style={styles.barIcon}
              >
                <AppText style={{ fontSize: 22 }}>📷</AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSheetVisible(true);
                }}
                style={styles.barIcon}
              >
                <AppText style={{ fontSize: 22 }}>📢</AppText>
              </Pressable>
            </Pressable>

            {/* Filter tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tabsScroll}
              contentContainerStyle={styles.tabsContent}
            >
              {FEED_TABS.map(({ key, label }) => {
                const active = activeTab === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setActiveTab(key)}
                    style={[
                      styles.tab,
                      {
                        backgroundColor: active ? c.orange : c.bgCard,
                        borderColor: active ? c.orange : c.border,
                      },
                    ]}
                  >
                    <AppText
                      variant="small"
                      weight="semibold"
                      style={{ color: active ? "#fff" : c.text }}
                    >
                      {label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Post count */}
            {!loading && (
              <AppText variant="small" tone="dim" style={styles.postCount}>
                {total} post{total !== 1 ? "s" : ""}
              </AppText>
            )}
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
            <Skeleton c={c} />
          ) : (
            <View style={styles.empty}>
              <AppText style={{ fontSize: 40, textAlign: "center" }}>
                🌐
              </AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ textAlign: "center", marginTop: 12 }}
              >
                No posts yet
              </AppText>
              <AppText
                variant="small"
                tone="dim"
                style={{ textAlign: "center", marginTop: 6 }}
              >
                Be the first to share something with the community!
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

      {/* Create post sheet */}
      <CreatePostSheet
        user={user}
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onPosted={handlePosted}
        c={c}
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

function Skeleton({ c }) {
  return (
    <View style={{ gap: 12 }}>
      {[1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            {
              height: 160,
              borderRadius: 16,
              borderWidth: StyleSheet.hairlineWidth,
              backgroundColor: c.bgCard,
              borderColor: c.border,
              opacity: 0.5,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Sheet styles ──────────────────────────────────────────────────────────────
const sh = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "90%",
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: 44, height: 44 },
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 16,
    lineHeight: 24,
    minHeight: 100,
    textAlignVertical: "top",
  },
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
  typeContent: { flexDirection: "row", gap: 8 },
  typePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  postBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12 },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },

  // Compact create bar
  createBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 14,
  },
  barAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  barAvatarImg: { width: 40, height: 40 },
  barInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  barIcon: { padding: 4 },

  // Filter tabs
  tabsScroll: { flexGrow: 0, marginBottom: 10 },
  tabsContent: { flexDirection: "row", gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },

  postCount: { marginBottom: 12 },
  empty: { alignItems: "center", paddingTop: 40, paddingHorizontal: 32 },
});
