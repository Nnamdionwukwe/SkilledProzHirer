// src/components/PostCard.js
// Shared between MyPostsScreen and CommunityFeedScreen.
// Mirrors the website's post card exactly.

import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import AppText from "./AppText";
import {
  reactToPost,
  repost,
  addComment,
  getComments,
  deleteComment,
} from "../api/posts";

// ── Post type config ──────────────────────────────────────────────────────────
export const POST_TYPES = {
  GENERAL: {
    label: "General",
    emoji: "💬",
    color: "#6b7280",
    bg: "rgba(107,114,128,0.15)",
  },
  ACHIEVEMENT: {
    label: "Achievement",
    emoji: "🏆",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.15)",
  },
  PORTFOLIO: {
    label: "Portfolio",
    emoji: "🎨",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.15)",
  },
  HIRING: {
    label: "Hiring",
    emoji: "📢",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.15)",
  },
  JOB_UPDATE: {
    label: "Job Update",
    emoji: "💼",
    color: "#f97316",
    bg: "rgba(249,115,22,0.15)",
  },
  ANNOUNCEMENT: {
    label: "Announcement",
    emoji: "📣",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.15)",
  },
};

const REACTIONS = [
  { type: "LIKE", emoji: "👍" },
  { type: "LOVE", emoji: "❤️" },
  { type: "INSIGHTFUL", emoji: "💡" },
  { type: "CELEBRATE", emoji: "🎉" },
  { type: "SUPPORT", emoji: "🤝" },
];

function fmtDate(d) {
  if (!d) return "";
  const now = new Date();
  const date = new Date(d);
  const diff = (now - date) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

// ── Nested original post (for reposts) ────────────────────────────────────────
function OriginalPostPreview({ original, c }) {
  const a = original?.author;
  if (!original) return null;
  return (
    <View
      style={[
        s.originalCard,
        { backgroundColor: c.bgInput, borderColor: c.border },
      ]}
    >
      <View style={s.originalAuthorRow}>
        <View style={[s.miniAvatar, { backgroundColor: c.orange }]}>
          {a?.avatar ? (
            <Image source={{ uri: a.avatar }} style={s.miniAvatarImg} />
          ) : (
            <AppText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {initials(a?.firstName, a?.lastName)}
            </AppText>
          )}
        </View>
        <View style={{ marginLeft: 8 }}>
          <AppText variant="small" weight="semibold">
            {a?.firstName} {a?.lastName}
          </AppText>
          <AppText variant="small" tone="dim">
            {fmtDate(original.createdAt)}
          </AppText>
        </View>
      </View>
      <AppText
        variant="body"
        numberOfLines={4}
        style={{ marginTop: 8, lineHeight: 22 }}
      >
        {original.content}
      </AppText>
    </View>
  );
}

// ── Comments sheet (inline expandable) ────────────────────────────────────────
function CommentsSection({
  postId,
  initialComments = [],
  commentCount = 0,
  userId,
  c,
}) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadedAll, setLoadedAll] = useState(false);

  const loadMore = async () => {
    if (loadedAll || loading) return;
    setLoading(true);
    try {
      const data = await getComments(postId, { page: 1, limit: 20 });
      setComments(data.comments ?? []);
      setLoadedAll(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const comment = await addComment(postId, text.trim());
      setComments((prev) => [comment, ...prev]);
      setText("");
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {}
  };

  return (
    <View style={[s.commentsSection, { borderTopColor: c.border }]}>
      {/* Input row */}
      <View style={[s.commentInputRow, { borderColor: c.border }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Write a comment…"
          placeholderTextColor={c.textMuted}
          style={[
            s.commentInput,
            { color: c.text, backgroundColor: c.bgInput },
          ]}
          multiline
          maxLength={500}
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!text.trim() || submitting}
          style={[
            s.commentSendBtn,
            {
              backgroundColor: text.trim() ? c.orange : c.bgCard,
              opacity: text.trim() ? 1 : 0.5,
            },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <AppText style={{ color: "#fff", fontSize: 16 }}>➤</AppText>
          )}
        </Pressable>
      </View>

      {/* Load all button */}
      {!loadedAll && commentCount > initialComments.length && (
        <Pressable onPress={loadMore} style={s.loadMoreBtn}>
          {loading ? (
            <ActivityIndicator size="small" color={c.orange} />
          ) : (
            <AppText variant="small" style={{ color: c.orange }}>
              View all {commentCount} comments
            </AppText>
          )}
        </Pressable>
      )}

      {/* Comment list */}
      {comments.map((comment) => {
        const ca = comment.author;
        const isOwn = ca?.id === userId;
        return (
          <View
            key={comment.id}
            style={[s.commentItem, { borderBottomColor: c.border }]}
          >
            <View style={[s.commentAvatar, { backgroundColor: c.orangeDim }]}>
              {ca?.avatar ? (
                <Image source={{ uri: ca.avatar }} style={s.commentAvatarImg} />
              ) : (
                <AppText
                  style={{ color: c.orange, fontSize: 11, fontWeight: "700" }}
                >
                  {initials(ca?.firstName, ca?.lastName)}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={s.commentAuthorRow}>
                <AppText variant="small" weight="semibold">
                  {ca?.firstName} {ca?.lastName}
                </AppText>
                <AppText variant="small" tone="dim">
                  {" "}
                  · {fmtDate(comment.createdAt)}
                </AppText>
                {isOwn && (
                  <Pressable
                    onPress={() => handleDelete(comment.id)}
                    style={{ marginLeft: "auto" }}
                  >
                    <AppText style={{ color: "#ef4444", fontSize: 12 }}>
                      ✕
                    </AppText>
                  </Pressable>
                )}
              </View>
              <AppText variant="body" style={{ lineHeight: 20, marginTop: 2 }}>
                {comment.content}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main PostCard component
// ─────────────────────────────────────────────────────────────────────────────
export default function PostCard({
  post,
  userId, // current user id (to show delete/own-post behaviour)
  c, // theme colors
  onDelete, // () => void
  onPostUpdated, // (updatedPost) => void
  showDelete = true,
}) {
  const [myReaction, setMyReaction] = useState(post.myReaction ?? null);
  const [reactionSum, setReactionSum] = useState(post.reactionSummary ?? {});
  const [showReacts, setShowReacts] = useState(false); // emoji picker
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [reacting, setReacting] = useState(false);

  const isOwn = post.author?.id === userId;
  const typeMeta = POST_TYPES[post.type] ?? POST_TYPES.GENERAL;
  const author = post.author;
  const totalReactions = Object.values(reactionSum).reduce((a, b) => a + b, 0);
  const commentCount = post._count?.comments ?? 0;
  const contentLong = post.content?.length > 180;

  const doReact = async (type) => {
    if (reacting) return;
    setReacting(true);
    setShowReacts(false);
    try {
      await reactToPost(post.id, type);
      if (myReaction === type) {
        // toggle off
        setMyReaction(null);
        setReactionSum((prev) => {
          const n = { ...prev };
          n[type] = Math.max(0, (n[type] ?? 1) - 1);
          if (n[type] === 0) delete n[type];
          return n;
        });
      } else {
        // change or add
        setReactionSum((prev) => {
          const n = { ...prev };
          if (myReaction) {
            n[myReaction] = Math.max(0, (n[myReaction] ?? 1) - 1);
            if (n[myReaction] === 0) delete n[myReaction];
          }
          n[type] = (n[type] ?? 0) + 1;
          return n;
        });
        setMyReaction(type);
      }
    } catch {
    } finally {
      setReacting(false);
    }
  };

  const doRepost = async () => {
    try {
      await repost(post.id);
    } catch {}
  };

  const doShare = async () => {
    try {
      await Share.share({
        message: `${post.content ?? ""}\n\nShared from SkilledPro`,
      });
    } catch {}
  };

  return (
    <View
      style={[s.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      {/* ── Author row ── */}
      <View style={s.authorRow}>
        {/* Avatar */}
        <View
          style={[
            s.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {author?.avatar ? (
            <Image source={{ uri: author.avatar }} style={s.avatarImg} />
          ) : (
            <AppText style={{ color: c.orange, fontWeight: "700" }}>
              {initials(author?.firstName, author?.lastName)}
            </AppText>
          )}
        </View>

        {/* Name + meta */}
        <View style={s.authorInfo}>
          <View style={s.nameRow}>
            <AppText variant="body" weight="semibold">
              {author?.firstName} {author?.lastName}
            </AppText>
            {post.type !== "GENERAL" && (
              <View style={[s.typeBadge, { backgroundColor: typeMeta.bg }]}>
                <AppText
                  style={{
                    color: typeMeta.color,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {typeMeta.label}
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="small" tone="dim">
            {author?.hirerProfile?.companyName ||
              author?.workerProfile?.title ||
              ""}
          </AppText>
          <AppText variant="small" tone="dim">
            {[author?.city, author?.country].filter(Boolean).join(", ")}
            {author?.city || author?.country ? " · " : ""}
            {fmtDate(post.createdAt)}
          </AppText>
        </View>

        {/* Delete button (own posts) */}
        {isOwn && showDelete && onDelete && (
          <Pressable
            onPress={onDelete}
            style={[
              s.deleteBtn,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <AppText style={{ color: "#ef4444", fontSize: 13 }}>🗑️</AppText>
            <AppText
              variant="small"
              weight="semibold"
              style={{ color: "#ef4444", marginLeft: 4 }}
            >
              Delete
            </AppText>
          </Pressable>
        )}
      </View>

      {/* ── Reposted indicator ── */}
      {post.repostOf && (
        <View style={s.repostedRow}>
          <AppText style={{ fontSize: 16 }}>🔄</AppText>
          <AppText variant="small" tone="dim" style={{ marginLeft: 6 }}>
            Reposted
          </AppText>
        </View>
      )}

      {/* ── Original post (nested) ── */}
      {post.repostOf && <OriginalPostPreview original={post.repostOf} c={c} />}

      {/* ── Content ── */}
      {!!post.content && (
        <View style={s.contentWrap}>
          <AppText
            variant="body"
            style={{ lineHeight: 24 }}
            numberOfLines={expanded || !contentLong ? undefined : 4}
          >
            {post.content}
          </AppText>
          {contentLong && (
            <Pressable onPress={() => setExpanded((v) => !v)}>
              <AppText
                variant="small"
                style={{ color: c.orange, marginTop: 4 }}
              >
                {expanded ? "Show less" : "…see more"}
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Images ── */}
      {post.images?.length > 0 && (
        <View style={s.imagesWrap}>
          {post.images.length === 1 ? (
            <Image
              source={{ uri: post.images[0] }}
              style={s.singleImage}
              resizeMode="cover"
            />
          ) : (
            <FlatList
              data={post.images}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_, i) => String(i)}
              contentContainerStyle={{ gap: 6 }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item }}
                  style={s.multiImage}
                  resizeMode="cover"
                />
              )}
            />
          )}
        </View>
      )}

      {/* ── Reaction + comment count row ── */}
      {(totalReactions > 0 || commentCount > 0) && (
        <View style={[s.countRow, { borderBottomColor: c.border }]}>
          {totalReactions > 0 && (
            <View style={s.reactionCountGroup}>
              {Object.entries(reactionSum)
                .filter(([, v]) => v > 0)
                .slice(0, 3)
                .map(([type]) => (
                  <AppText key={type} style={s.reactionEmoji}>
                    {REACTIONS.find((r) => r.type === type)?.emoji ?? "👍"}
                  </AppText>
                ))}
              <AppText variant="small" tone="dim" style={{ marginLeft: 4 }}>
                {totalReactions}
              </AppText>
            </View>
          )}
          {commentCount > 0 && (
            <Pressable
              onPress={() => setShowComments((v) => !v)}
              style={{ marginLeft: "auto" }}
            >
              <AppText variant="small" tone="dim">
                {commentCount} comment{commentCount !== 1 ? "s" : ""}
              </AppText>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Action bar ── */}
      <View style={[s.actionBar, { borderTopColor: c.border }]}>
        {/* Like — long press shows picker, tap toggles */}
        <Pressable
          style={s.actionBtn}
          onPress={() => doReact("LIKE")}
          onLongPress={() => setShowReacts((v) => !v)}
          delayLongPress={400}
        >
          <AppText style={s.actionIcon}>
            {myReaction
              ? (REACTIONS.find((r) => r.type === myReaction)?.emoji ?? "👍")
              : "👍"}
          </AppText>
          <AppText
            variant="small"
            weight="semibold"
            style={{
              color: myReaction ? c.orange : c.textMuted,
              marginLeft: 4,
            }}
          >
            Like
          </AppText>
        </Pressable>

        {/* Comment */}
        <Pressable
          style={s.actionBtn}
          onPress={() => setShowComments((v) => !v)}
        >
          <AppText style={s.actionIcon}>💬</AppText>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.textMuted, marginLeft: 4 }}
          >
            Comment
          </AppText>
        </Pressable>

        {/* Repost */}
        <Pressable style={s.actionBtn} onPress={doRepost}>
          <AppText style={s.actionIcon}>🔄</AppText>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.textMuted, marginLeft: 4 }}
          >
            Repost
          </AppText>
        </Pressable>

        {/* Send */}
        <Pressable style={s.actionBtn} onPress={doShare}>
          <AppText style={s.actionIcon}>✈️</AppText>
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.textMuted, marginLeft: 4 }}
          >
            Send
          </AppText>
        </Pressable>
      </View>

      {/* ── Reaction picker (long-press) ── */}
      {showReacts && (
        <View
          style={[
            s.reactPicker,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          {REACTIONS.map((r) => (
            <Pressable
              key={r.type}
              onPress={() => doReact(r.type)}
              style={s.reactPickerItem}
            >
              <AppText style={{ fontSize: 26 }}>{r.emoji}</AppText>
            </Pressable>
          ))}
        </View>
      )}

      {/* ── Comments section ── */}
      {showComments && (
        <CommentsSection
          postId={post.id}
          initialComments={post.comments ?? []}
          commentCount={post._count?.comments ?? 0}
          userId={userId}
          c={c}
        />
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 0,
  },

  // Author
  authorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    paddingBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: 48, height: 48 },
  authorInfo: { flex: 1, marginLeft: 12 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },

  // Repost
  repostedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  originalCard: {
    marginHorizontal: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  originalAuthorRow: { flexDirection: "row", alignItems: "center" },
  miniAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  miniAvatarImg: { width: 28, height: 28 },

  // Content
  contentWrap: { paddingHorizontal: 14, paddingBottom: 12 },

  // Images
  imagesWrap: { paddingHorizontal: 14, paddingBottom: 12 },
  singleImage: { width: "100%", height: 260, borderRadius: 12 },
  multiImage: { width: 200, height: 180, borderRadius: 10 },

  // Count row
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reactionCountGroup: { flexDirection: "row", alignItems: "center" },
  reactionEmoji: { fontSize: 14 },

  // Action bar
  actionBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  actionIcon: { fontSize: 18, lineHeight: 25 },

  // Reaction picker
  reactPicker: {
    position: "absolute",
    bottom: 52,
    left: 14,
    flexDirection: "row",
    gap: 4,
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    elevation: 8,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    zIndex: 100,
  },
  reactPickerItem: { padding: 4 },

  // Comments
  commentsSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  commentInputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 12,
  },
  commentInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
  },
  commentSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadMoreBtn: { alignItems: "center", paddingVertical: 8, marginBottom: 8 },
  commentItem: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  commentAvatarImg: { width: 30, height: 30 },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
});
