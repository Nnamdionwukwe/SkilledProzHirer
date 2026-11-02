// src/components/posts/PostCard.js
//
// Verbatim port of src/components/posts/PostCard.jsx + PostCard.module.css.
//
// Updates in this version:
//   • resolveUrl() — prefixes relative /uploads/... paths with the API base
//   • <Image> renders author / comment / reply avatars whenever avatar exists
//     (letter fallback retained when missing)
//   • Tapping any avatar navigates to that user's public profile
//     (Worker → WorkerProfile, Hirer → HirerPublicProfile)
//   • Post images render via resolveUrl
//   • Lightbox is fullscreen, swipeable via prev/next buttons, and
//     dismisses on backdrop tap — mirrors the website modal exactly
//   • Modal uses presentationStyle="overFullScreen" + statusBarTranslucent
//     so it renders above the Android nav bar (matches web z-index behavior)

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  StyleSheet,
  Modal,
  useWindowDimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
Image;
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import ReportButton from "../ReportButton";
import ReactionsModal from "./ReactionsModal";

// ─── URL resolver ───────────────────────────────────────
// Mirrors what the browser does automatically — any relative path
// (/uploads/..., /media/...) is prefixed with the API base URL.
const API_BASE = client?.defaults?.baseURL || "https://api.skilledproz.com";

function resolveUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `${API_BASE}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

const REACTIONS = [
  { type: "LIKE", icon: "thumbs-up-outline", labelKey: "posts.reactionLike" },
  { type: "LOVE", icon: "heart-outline", labelKey: "posts.reactionLove" },
  {
    type: "INSIGHTFUL",
    icon: "flash-outline",
    labelKey: "posts.reactionInsightful",
  },
  {
    type: "CELEBRATE",
    icon: "star-outline",
    labelKey: "posts.reactionCelebrate",
  },
  {
    type: "SUPPORT",
    icon: "people-outline",
    labelKey: "posts.reactionSupport",
  },
];

const TYPE_BADGES = {
  HIRING: {
    labelKey: "posts.typeHiring",
    color: "#22c55e",
    icon: "briefcase-outline",
  },
  ACHIEVEMENT: {
    labelKey: "posts.typeAchievement",
    color: "#f97316",
    icon: "trophy-outline",
  },
  PORTFOLIO: {
    labelKey: "posts.typePortfolio",
    color: "#818cf8",
    icon: "information-circle-outline",
  },
  ANNOUNCEMENT: {
    labelKey: "posts.typeAnnouncement",
    color: "#fbbf24",
    icon: "volume-high-outline",
  },
  JOB_UPDATE: {
    labelKey: "posts.typeJobUpdate",
    color: "#38bdf8",
    icon: "briefcase-outline",
  },
  GENERAL: null,
};

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d`;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function recalcSummary(prev, oldType, newType) {
  const s = { ...prev };
  if (oldType) s[oldType] = Math.max(0, (s[oldType] || 0) - 1);
  if (newType) s[newType] = (s[newType] || 0) + 1;
  return s;
}

export default function PostCard({ post: initialPost, onDelete }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWide = width >= 480;

  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [repostContent, setRepostContent] = useState("");
  const [showRepostInput, setShowRepostInput] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [allComments, setAllComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [showReactionsModal, setShowReactionsModal] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageIdx, setImageIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  useEffect(() => {
    if (!openMenu) return;
    const timer = setTimeout(() => setOpenMenu(null), 15000);
    return () => clearTimeout(timer);
  }, [openMenu]);

  if (deleted) return null;

  const author = post.author;
  const isOwn = user?.id === post.authorId;
  const myReaction = post.myReaction;
  const totalReactions = post._count?.reactions || 0;
  const totalComments = post._count?.comments || 0;
  const totalReposts = post._count?.reposts || 0;
  const typeBadge = TYPE_BADGES[post.type];
  const shouldTruncate = post.content.length > 300 && !expanded;

  const authorTitle =
    author?.role === "WORKER"
      ? author.workerProfile?.title
      : author?.hirerProfile?.companyName;

  // ─── Normalize post images across every backend shape ─────
  const postImages = useMemo(() => {
    const candidates = [
      post.images,
      post.media,
      post.imageUrls,
      post.attachments,
      post.postImages,
      post.files,
    ];
    for (const c of candidates) {
      if (Array.isArray(c) && c.length > 0) {
        return c
          .map((item) =>
            typeof item === "string"
              ? item
              : item?.url ||
                item?.uri ||
                item?.src ||
                item?.path ||
                item?.secure_url ||
                null,
          )
          .filter(Boolean);
      }
    }
    return [];
  }, [post]);

  // ─── Profile navigation (matches website profileUrlFor) ─────
  const profileNavigate = (target) => {
    if (!target?.id) return;
    if (target.role === "WORKER") {
      navigation.navigate("WorkerProfile", { userId: target.id });
    } else {
      navigation.navigate("HirerDetail", { userId: target.id });
    }
  };

  const toggleMenu = (name) => {
    setOpenMenu((cur) => (cur === name ? null : name));
  };

  const handleReact = async (type) => {
    if (!user) return;
    setOpenMenu(null);
    try {
      const res = await client.post(`/posts/${post.id}/react`, { type });
      const newReaction = res.data?.data?.reaction;
      setPost((prev) => ({
        ...prev,
        myReaction: newReaction ? type : null,
        reactionSummary: recalcSummary(
          prev.reactionSummary,
          prev.myReaction,
          newReaction ? type : null,
        ),
        _count: {
          ...prev._count,
          reactions: newReaction
            ? prev.myReaction
              ? prev._count.reactions
              : prev._count.reactions + 1
            : prev._count.reactions - 1,
        },
      }));
    } catch (err) {
      toast.error(err?.response?.data?.message || t("posts.reactionFailed"));
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await client.post(`/posts/${post.id}/comments`, {
        content: newComment,
      });
      const comment = res.data?.data?.comment;
      setPost((prev) => ({
        ...prev,
        comments: [comment, ...prev.comments],
        _count: { ...prev._count, comments: prev._count.comments + 1 },
      }));
      setNewComment("");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("posts.commentFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (commentId) => {
    if (!replyContent.trim() || !user) return;
    setSubmitting(true);
    try {
      const res = await client.post(`/posts/${post.id}/comments`, {
        content: replyContent,
        parentId: commentId,
      });
      const reply = res.data?.data?.comment;
      setPost((prev) => ({
        ...prev,
        comments: prev.comments.map((cm) =>
          cm.id === commentId
            ? { ...cm, replies: [...(cm.replies || []), reply] }
            : cm,
        ),
      }));
      setReplyTo(null);
      setReplyContent("");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("posts.replyFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoadMoreComments = async () => {
    setLoadingComments(true);
    try {
      const res = await client.get(`/posts/${post.id}/comments`);
      setAllComments(res.data?.data?.comments || []);
      setShowAllComments(true);
    } catch {}
    setLoadingComments(false);
  };

  const handleRepost = async (withThoughts) => {
    if (!user) return;
    if (withThoughts && !repostContent.trim()) return;
    try {
      await client.post(`/posts/${post.id}/repost`, { content: repostContent });
      setPost((prev) => ({
        ...prev,
        _count: { ...prev._count, reposts: prev._count.reposts + 1 },
      }));
      toast.success(t("posts.reposted"));
      setOpenMenu(null);
      setShowRepostInput(false);
      setRepostContent("");
    } catch (err) {
      toast.error(err?.response?.data?.message || t("posts.repostFailed"));
    }
  };

  const confirmDeletePost = async () => {
    try {
      await client.delete(`/posts/${post.id}`);
      setDeleted(true);
      toast.success(t("posts.postDeleted"));
      onDelete?.(post.id);
    } catch (err) {
      toast.error(err?.response?.data?.message || t("posts.deleteFailed"));
      setConfirmDelete(false);
    }
  };

  const postUrl = `https://skilledproz.com/posts/${post.id}`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(postUrl);
    setCopied(true);
    toast.success(t("posts.linkCopied"));
    setTimeout(() => setCopied(false), 2000);
    setOpenMenu(null);
  };

  const openExternalShare = (platform) => {
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(
      (post.content?.slice(0, 200) || "Check this post on SkilledProz") + " — ",
    );
    const shareMap = {
      whatsapp: `https://wa.me/?text=${encodedText}${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      email: `mailto:?subject=Check out this post on SkilledProz&body=${encodedText}${encodedUrl}`,
    };
    const url = shareMap[platform];
    if (url) {
      Linking.openURL(url).catch(() => toast.error(t("posts.shareFailed")));
      setOpenMenu(null);
    }
  };

  const handleSendInApp = () => {
    setOpenMenu(null);
    navigation.navigate("Messages", {
      share: "post",
      postId: post.id,
      postUrl,
      postAuthor: `${author?.firstName || ""} ${author?.lastName || ""}`.trim(),
    });
  };

  const currentReaction = myReaction
    ? REACTIONS.find((r) => r.type === myReaction)
    : null;

  const displayComments = showAllComments ? allComments : post.comments;

  // ─── Reusable avatar renderer ─────────────────────────────────
  // Uses the real image via resolveUrl when available;
  // falls back to the first letter when no image exists.
  const renderAvatar = (target, size, fontSize) => {
    const uri = resolveUrl(target?.avatar);
    const initial = (target?.firstName || "?")[0]?.toUpperCase() || "?";
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          backgroundColor: c.orangeDim,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <AppText
            style={{
              fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
              fontSize: fontSize,
              fontWeight: "700",
              color: c.orange,
            }}
          >
            {initial}
          </AppText>
        )}
      </View>
    );
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* ─── Header ─────────────────────────────────────── */}
      <View
        style={[styles.header, { padding: isWide ? 20 : 14, paddingBottom: 0 }]}
      >
        <Pressable
          onPress={() => profileNavigate(author)}
          style={styles.avatarWrap}
        >
          {renderAvatar(author, isWide ? 44 : 40, rem(isWide ? 1 : 0.9))}
          {author?.workerProfile?.verificationStatus === "VERIFIED" ? (
            <View style={styles.verifiedDot}>
              <Ionicons name="shield-checkmark" size={10} color="#22c55e" />
            </View>
          ) : null}
        </Pressable>

        <View style={styles.authorInfo}>
          <View style={styles.authorRow}>
            <Pressable onPress={() => profileNavigate(author)}>
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(isWide ? 0.9 : 0.85),
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                {author?.firstName} {author?.lastName}
              </AppText>
            </Pressable>
            {typeBadge ? (
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: `${typeBadge.color}22` },
                ]}
              >
                <Ionicons
                  name={typeBadge.icon}
                  size={11}
                  color={typeBadge.color}
                />
                <AppText
                  style={{
                    fontSize: rem(isWide ? 0.62 : 0.58),
                    fontWeight: "700",
                    color: typeBadge.color,
                    marginLeft: 3,
                  }}
                >
                  {t(typeBadge.labelKey)}
                </AppText>
              </View>
            ) : null}
          </View>
          {authorTitle ? (
            <AppText
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(isWide ? 0.75 : 0.7),
                color: c.textDim,
                marginTop: 2,
              }}
            >
              {authorTitle}
            </AppText>
          ) : null}
          <AppText
            style={{
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(isWide ? 0.7 : 0.66),
              color: c.textMuted,
              marginTop: 2,
            }}
          >
            {author?.city ? `${author.city} · ` : ""}
            {timeAgo(post.createdAt)}
            {post.updatedAt !== post.createdAt ? " · Edited" : ""}
          </AppText>
        </View>

        {isOwn && !confirmDelete ? (
          <Pressable
            onPress={() => setConfirmDelete(true)}
            style={[styles.moreBtn, { borderColor: c.border }]}
          >
            <Ionicons name="trash-outline" size={12} color={c.red} />
            <AppText
              style={{
                fontSize: rem(isWide ? 0.72 : 0.66),
                fontWeight: "600",
                color: c.red,
                marginLeft: 4,
              }}
            >
              {t("common.delete")}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {/* ─── Inline delete confirm ──────────────────────── */}
      {isOwn && confirmDelete ? (
        <View
          style={[
            styles.deleteConfirm,
            {
              backgroundColor: c.redDim,
              borderColor: "rgba(239,68,68,0.25)",
              marginHorizontal: isWide ? 20 : 14,
            },
          ]}
        >
          <View style={styles.deleteConfirmIcon}>
            <Ionicons name="alert-circle" size={16} color={c.red} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              style={{
                fontSize: rem(0.85),
                fontWeight: "700",
                color: c.text,
              }}
            >
              {t("posts.confirmDeleteTitle")}
            </AppText>
            <AppText
              style={{ fontSize: rem(0.72), color: c.textDim, marginTop: 2 }}
            >
              {t("posts.confirmDeleteSub")}
            </AppText>
          </View>
          <View style={styles.deleteConfirmActions}>
            <Pressable
              onPress={() => setConfirmDelete(false)}
              style={[styles.cancelMini, { borderColor: c.border }]}
            >
              <AppText
                style={{
                  fontSize: rem(0.72),
                  fontWeight: "600",
                  color: c.textDim,
                }}
              >
                {t("common.cancel")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={confirmDeletePost}
              style={[styles.confirmMini, { backgroundColor: c.red }]}
            >
              <AppText
                style={{
                  fontSize: rem(0.72),
                  fontWeight: "700",
                  color: "#fff",
                }}
              >
                {t("common.delete")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ─── Repost banner ─────────────────────────────── */}
      {post.repostOf ? (
        <View style={styles.repostBanner}>
          <Ionicons name="repeat-outline" size={12} color={c.orange} />
          <AppText
            style={{
              fontSize: rem(0.7),
              color: c.textMuted,
              marginLeft: 5,
            }}
          >
            {t("posts.repostedBanner")}
          </AppText>
        </View>
      ) : null}

      {/* ─── Content ───────────────────────────────────── */}
      <View style={{ padding: isWide ? 20 : 14 }}>
        <AppText
          style={{
            fontFamily: theme.fonts?.body || "DMSans_400Regular",
            fontSize: rem(isWide ? 0.9 : 0.85),
            lineHeight: rem(isWide ? 0.9 : 0.85) * 1.6,
            color: c.textDim,
          }}
        >
          {shouldTruncate ? post.content.slice(0, 300) : post.content}
          {shouldTruncate ? (
            <AppText
              onPress={() => setExpanded(true)}
              style={{ color: c.orange, fontWeight: "600" }}
            >
              {` … ${t("posts.seeMore")}`}
            </AppText>
          ) : null}
        </AppText>

        {/* ─── Post images — tap to open fullscreen ──── */}
        {postImages.length > 0 ? (
          <View style={styles.imageGrid}>
            <Pressable
              onPress={() => setLightboxIdx(imageIdx)}
              style={styles.imagePressable}
            >
              <Image
                source={{ uri: resolveUrl(postImages[imageIdx]) }}
                style={[styles.mainImage, { maxHeight: isWide ? 400 : 280 }]}
                resizeMode="cover"
              />
            </Pressable>
            {postImages.length > 1 ? (
              <View style={[styles.imageDots, { backgroundColor: c.bgCard }]}>
                {postImages.map((_, i) => (
                  <Pressable
                    key={i}
                    onPress={() => setImageIdx(i)}
                    style={[
                      styles.imageDot,
                      i === imageIdx && { backgroundColor: c.orange },
                      i !== imageIdx && { backgroundColor: c.border },
                    ]}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ─── Repost origin card ─────────────────────── */}
        {post.repostOf ? (
          <View
            style={[
              styles.repostCard,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <View style={styles.repostCardHeader}>
              <Pressable
                onPress={() => profileNavigate(post.repostOf.author)}
                style={{ marginRight: 8 }}
              >
                {renderAvatar(post.repostOf.author, 26, rem(0.7))}
              </Pressable>
              <View>
                <Pressable
                  onPress={() => profileNavigate(post.repostOf.author)}
                >
                  <AppText
                    style={{
                      fontSize: rem(0.8),
                      fontWeight: "600",
                      color: c.text,
                    }}
                  >
                    {post.repostOf.author?.firstName}{" "}
                    {post.repostOf.author?.lastName}
                  </AppText>
                </Pressable>
                <AppText style={{ fontSize: rem(0.68), color: c.textMuted }}>
                  {timeAgo(post.repostOf.createdAt)}
                </AppText>
              </View>
            </View>
            <AppText
              style={{
                fontSize: rem(0.82),
                lineHeight: rem(0.82) * 1.5,
                color: c.textDim,
              }}
            >
              {post.repostOf.content.slice(0, 200)}
              {post.repostOf.content.length > 200 ? "…" : ""}
            </AppText>
          </View>
        ) : null}
      </View>

      {/* ─── Count row ─────────────────────────────────── */}
      {totalReactions > 0 || totalComments > 0 || totalReposts > 0 ? (
        <View
          style={[
            styles.countRow,
            {
              borderTopColor: c.border,
              paddingHorizontal: isWide ? 20 : 14,
            },
          ]}
        >
          {totalReactions > 0 ? (
            <Pressable
              onPress={() => setShowReactionsModal(true)}
              style={styles.countBtn}
            >
              <View style={styles.countIcons}>
                {Object.entries(post.reactionSummary || {})
                  .slice(0, 3)
                  .map(([type]) => {
                    const r = REACTIONS.find((x) => x.type === type);
                    if (!r) return null;
                    return (
                      <View
                        key={type}
                        style={[
                          styles.iconCircle,
                          { backgroundColor: c.bgPanel, borderColor: c.border },
                        ]}
                      >
                        <Ionicons name={r.icon} size={10} color={c.orange} />
                      </View>
                    );
                  })}
              </View>
              <AppText
                style={{
                  fontSize: rem(isWide ? 0.78 : 0.72),
                  color: c.textMuted,
                  marginLeft: 4,
                }}
              >
                {totalReactions}
              </AppText>
            </Pressable>
          ) : (
            <View />
          )}
          <View style={styles.countRight}>
            {totalComments > 0 ? (
              <Pressable
                onPress={() => setShowComments((v) => !v)}
                style={styles.countBtn}
              >
                <AppText
                  style={{
                    fontSize: rem(isWide ? 0.78 : 0.72),
                    color: c.textMuted,
                  }}
                >
                  {t("posts.commentCount", { count: totalComments })}
                </AppText>
              </Pressable>
            ) : null}
            {totalReposts > 0 ? (
              <AppText
                style={{
                  fontSize: rem(isWide ? 0.78 : 0.72),
                  color: c.textMuted,
                  marginLeft: 8,
                }}
              >
                {t("posts.repostCount", { count: totalReposts })}
              </AppText>
            ) : null}
            <View style={{ marginLeft: 8 }}>
              <ReportButton
                targetType="POST"
                targetId={post.id}
                targetName={post.title}
                variant="link"
              />
            </View>
          </View>
        </View>
      ) : null}

      {/* ─── Action bar ────────────────────────────────── */}
      <View
        style={[
          styles.actionBar,
          {
            borderTopColor: c.border,
            paddingHorizontal: isWide ? 8 : 4,
          },
        ]}
      >
        {/* React */}
        <View style={styles.reactWrap}>
          <Pressable
            onPress={() => toggleMenu("reactions")}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: pressed ? c.bgCard : "transparent" },
            ]}
          >
            {currentReaction ? (
              <Ionicons
                name={currentReaction.icon}
                size={isWide ? 16 : 15}
                color={c.orange}
              />
            ) : (
              <Ionicons
                name="thumbs-up-outline"
                size={isWide ? 16 : 15}
                color={myReaction ? c.orange : c.textDim}
              />
            )}
            <AppText
              numberOfLines={1}
              style={{
                fontSize: rem(isWide ? 0.82 : 0.72),
                fontWeight: "600",
                color: myReaction ? c.orange : c.textDim,
                marginLeft: 6,
              }}
            >
              {currentReaction
                ? t(currentReaction.labelKey)
                : t("posts.reactionLike")}
            </AppText>
          </Pressable>
          {openMenu === "reactions" ? (
            <View
              style={[
                styles.reactionPicker,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              {REACTIONS.map((r) => (
                <Pressable
                  key={r.type}
                  onPress={() => handleReact(r.type)}
                  style={[
                    styles.reactionPickerBtn,
                    myReaction === r.type && { backgroundColor: c.orangeDim },
                  ]}
                >
                  <Ionicons
                    name={r.icon}
                    size={18}
                    color={myReaction === r.type ? c.orange : c.textDim}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* Comment */}
        <Pressable
          onPress={() => setShowComments((v) => !v)}
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: pressed ? c.bgCard : "transparent" },
          ]}
        >
          <Ionicons
            name="chatbubble-outline"
            size={isWide ? 16 : 15}
            color={c.textDim}
          />
          <AppText
            numberOfLines={1}
            style={{
              fontSize: rem(isWide ? 0.82 : 0.72),
              fontWeight: "600",
              color: c.textDim,
              marginLeft: 6,
            }}
          >
            {t("posts.comment")}
          </AppText>
        </Pressable>

        {/* Repost */}
        <View style={styles.reactWrap}>
          <Pressable
            onPress={() => toggleMenu("repost")}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: pressed ? c.bgCard : "transparent" },
            ]}
          >
            <Ionicons
              name="repeat-outline"
              size={isWide ? 16 : 15}
              color={c.textDim}
            />
            <AppText
              numberOfLines={1}
              style={{
                fontSize: rem(isWide ? 0.82 : 0.72),
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 6,
              }}
            >
              {t("posts.repost")}
            </AppText>
          </Pressable>
          {openMenu === "repost" ? (
            <View
              style={[
                styles.repostMenu,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <Pressable
                onPress={() => {
                  setShowRepostInput(true);
                  setOpenMenu(null);
                }}
                style={styles.menuBtn}
              >
                <Ionicons name="create-outline" size={16} color={c.orange} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText
                    style={{
                      fontSize: rem(0.82),
                      fontWeight: "600",
                      color: c.text,
                    }}
                  >
                    {t("posts.repostWithThoughts")}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: rem(0.7),
                      color: c.textDim,
                      marginTop: 2,
                    }}
                  >
                    {t("posts.repostWithThoughtsSub")}
                  </AppText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => {
                  handleRepost(false);
                  setOpenMenu(null);
                }}
                style={styles.menuBtn}
              >
                <Ionicons name="repeat-outline" size={16} color={c.orange} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText
                    style={{
                      fontSize: rem(0.82),
                      fontWeight: "600",
                      color: c.text,
                    }}
                  >
                    {t("posts.repost")}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: rem(0.7),
                      color: c.textDim,
                      marginTop: 2,
                    }}
                  >
                    {t("posts.repostInstantSub")}
                  </AppText>
                </View>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Send */}
        <View style={styles.reactWrap}>
          <Pressable
            onPress={() => toggleMenu("share")}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: pressed ? c.bgCard : "transparent" },
            ]}
          >
            <Ionicons
              name="send-outline"
              size={isWide ? 16 : 15}
              color={c.textDim}
            />
            <AppText
              numberOfLines={1}
              style={{
                fontSize: rem(isWide ? 0.82 : 0.72),
                fontWeight: "600",
                color: c.textDim,
                marginLeft: 6,
              }}
            >
              {t("posts.send")}
            </AppText>
          </Pressable>
          {openMenu === "share" ? (
            <View
              style={[
                styles.shareMenu,
                { backgroundColor: c.bgPanel, borderColor: c.border },
              ]}
            >
              <AppText
                style={{
                  fontSize: rem(0.7),
                  fontWeight: "700",
                  color: c.textMuted,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  paddingHorizontal: 10,
                  paddingTop: 4,
                  paddingBottom: 6,
                }}
              >
                {t("posts.shareThisPost")}
              </AppText>
              <Pressable onPress={handleSendInApp} style={styles.menuBtn}>
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color={c.orange}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText
                    style={{
                      fontSize: rem(0.82),
                      fontWeight: "600",
                      color: c.text,
                    }}
                  >
                    {t("posts.sendInApp")}
                  </AppText>
                  <AppText
                    style={{
                      fontSize: rem(0.7),
                      color: c.textDim,
                      marginTop: 2,
                    }}
                  >
                    {t("posts.sendInAppSub")}
                  </AppText>
                </View>
              </Pressable>
              <View
                style={{
                  height: 1,
                  backgroundColor: c.border,
                  marginVertical: 4,
                }}
              />
              {[
                { key: "whatsapp", label: "WhatsApp", icon: "logo-whatsapp" },
                { key: "twitter", label: "X (Twitter)", icon: "logo-twitter" },
                { key: "facebook", label: "Facebook", icon: "logo-facebook" },
                { key: "linkedin", label: "LinkedIn", icon: "logo-linkedin" },
                {
                  key: "telegram",
                  label: "Telegram",
                  icon: "paper-plane-outline",
                },
                { key: "email", label: "Email", icon: "mail-outline" },
              ].map((p) => (
                <Pressable
                  key={p.key}
                  onPress={() => openExternalShare(p.key)}
                  style={styles.menuBtn}
                >
                  <Ionicons name={p.icon} size={16} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: rem(0.82),
                      fontWeight: "600",
                      color: c.textDim,
                      marginLeft: 10,
                    }}
                  >
                    {p.label}
                  </AppText>
                </Pressable>
              ))}
              <View
                style={{
                  height: 1,
                  backgroundColor: c.border,
                  marginVertical: 4,
                }}
              />
              <Pressable onPress={handleCopyLink} style={styles.menuBtn}>
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={16}
                  color={c.orange}
                />
                <AppText
                  style={{
                    fontSize: rem(0.82),
                    fontWeight: "600",
                    color: c.textDim,
                    marginLeft: 10,
                  }}
                >
                  {copied ? t("posts.copied") : t("posts.copyLink")}
                </AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* ─── Repost input ──────────────────────────────── */}
      {showRepostInput ? (
        <View
          style={[
            styles.repostInputWrap,
            {
              borderTopColor: c.border,
              paddingHorizontal: isWide ? 20 : 14,
            },
          ]}
        >
          <TextInput
            value={repostContent}
            onChangeText={setRepostContent}
            placeholder={t("posts.repostPlaceholder")}
            placeholderTextColor={c.textMuted}
            multiline
            style={[
              styles.repostInput,
              {
                backgroundColor: c.bgInput,
                borderColor: c.border,
                color: c.text,
                fontSize: rem(0.85),
              },
            ]}
          />
          <View style={styles.repostInputActions}>
            <Pressable
              onPress={() => setShowRepostInput(false)}
              style={[styles.cancelMini, { borderColor: c.border }]}
            >
              <AppText style={{ fontSize: rem(0.78), color: c.textDim }}>
                {t("common.cancel")}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => handleRepost(true)}
              style={[styles.confirmMini, { backgroundColor: c.orange }]}
            >
              <AppText
                style={{
                  fontSize: rem(0.78),
                  fontWeight: "700",
                  color: c.bg,
                }}
              >
                {t("posts.postBtn")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ─── Comments ──────────────────────────────────── */}
      {showComments ? (
        <View
          style={[
            styles.commentsSection,
            {
              borderTopColor: c.border,
              paddingHorizontal: isWide ? 20 : 14,
            },
          ]}
        >
          {/* New comment input (uses current user's avatar) */}
          {user ? (
            <View style={styles.commentInputWrap}>
              <View style={{ marginRight: 8 }}>
                {renderAvatar(user, 30, rem(0.75))}
              </View>
              <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
                <TextInput
                  value={newComment}
                  onChangeText={setNewComment}
                  placeholder={t("posts.addComment")}
                  placeholderTextColor={c.textMuted}
                  style={[
                    styles.commentInput,
                    {
                      backgroundColor: c.bgInput,
                      borderColor: c.border,
                      color: c.text,
                      fontSize: rem(0.82),
                    },
                  ]}
                />
                {newComment ? (
                  <Pressable
                    onPress={handleComment}
                    disabled={submitting}
                    style={[
                      styles.commentSubmitBtn,
                      {
                        backgroundColor: c.orange,
                        opacity: submitting ? 0.5 : 1,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: rem(0.72),
                        fontWeight: "700",
                        color: c.bg,
                      }}
                    >
                      {submitting ? "…" : t("posts.commentBtn")}
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* Comments list */}
          <View style={{ gap: 10 }}>
            {displayComments.map((cm) => (
              <View key={cm.id} style={styles.commentItem}>
                <Pressable
                  onPress={() => profileNavigate(cm.author)}
                  style={{ marginRight: 8 }}
                >
                  {renderAvatar(cm.author, 30, rem(0.75))}
                </Pressable>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={[
                      styles.commentBubble,
                      { backgroundColor: c.bgCard },
                    ]}
                  >
                    <Pressable onPress={() => profileNavigate(cm.author)}>
                      <AppText
                        style={{
                          fontSize: rem(0.8),
                          fontWeight: "700",
                          color: c.text,
                          marginBottom: 2,
                        }}
                      >
                        {cm.author?.firstName} {cm.author?.lastName}
                        <AppText
                          style={{
                            fontSize: rem(0.7),
                            fontWeight: "400",
                            color: c.textMuted,
                          }}
                        >
                          {" · "}
                          {cm.author?.role === "HIRER"
                            ? t("common.hirer")
                            : t("common.worker")}
                        </AppText>
                      </AppText>
                    </Pressable>
                    <AppText
                      style={{
                        fontSize: rem(0.85),
                        lineHeight: rem(0.85) * 1.5,
                        color: c.textDim,
                      }}
                    >
                      {cm.content}
                    </AppText>
                  </View>
                  <View style={styles.commentMeta}>
                    <AppText
                      style={{ fontSize: rem(0.65), color: c.textMuted }}
                    >
                      {timeAgo(cm.createdAt)}
                    </AppText>
                    {user ? (
                      <Pressable
                        onPress={() =>
                          setReplyTo(replyTo === cm.id ? null : cm.id)
                        }
                        style={{ marginLeft: 10 }}
                      >
                        <AppText
                          style={{
                            fontSize: rem(0.68),
                            fontWeight: "600",
                            color: c.textDim,
                          }}
                        >
                          {t("posts.replyBtn")}
                        </AppText>
                      </Pressable>
                    ) : null}
                  </View>

                  {/* Replies */}
                  {cm.replies?.length > 0 ? (
                    <View style={styles.replies}>
                      {cm.replies.map((rp) => (
                        <View key={rp.id} style={styles.replyItem}>
                          <Pressable
                            onPress={() => profileNavigate(rp.author)}
                            style={{ marginRight: 6 }}
                          >
                            {renderAvatar(rp.author, 28, rem(0.65))}
                          </Pressable>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <View
                              style={[
                                styles.commentBubble,
                                { backgroundColor: c.bgCard },
                              ]}
                            >
                              <Pressable
                                onPress={() => profileNavigate(rp.author)}
                              >
                                <AppText
                                  style={{
                                    fontSize: rem(0.75),
                                    fontWeight: "700",
                                    color: c.text,
                                    marginBottom: 2,
                                  }}
                                >
                                  {rp.author?.firstName} {rp.author?.lastName}
                                </AppText>
                              </Pressable>
                              <AppText
                                style={{
                                  fontSize: rem(0.8),
                                  lineHeight: rem(0.8) * 1.5,
                                  color: c.textDim,
                                }}
                              >
                                {rp.content}
                              </AppText>
                            </View>
                            <AppText
                              style={{
                                fontSize: rem(0.65),
                                color: c.textMuted,
                                marginTop: 3,
                              }}
                            >
                              {timeAgo(rp.createdAt)}
                            </AppText>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {/* Reply input */}
                  {replyTo === cm.id && user ? (
                    <View style={styles.replyInputWrap}>
                      <TextInput
                        value={replyContent}
                        onChangeText={setReplyContent}
                        placeholder={t("posts.replyTo", {
                          name: cm.author?.firstName || "",
                        })}
                        placeholderTextColor={c.textMuted}
                        style={[
                          styles.commentInput,
                          {
                            backgroundColor: c.bgInput,
                            borderColor: c.border,
                            color: c.text,
                            fontSize: rem(0.82),
                          },
                        ]}
                      />
                      <Pressable
                        onPress={() => handleReply(cm.id)}
                        disabled={submitting}
                        style={[
                          styles.commentSubmitBtn,
                          {
                            backgroundColor: c.orange,
                            opacity: submitting ? 0.5 : 1,
                          },
                        ]}
                      >
                        <AppText
                          style={{
                            fontSize: rem(0.72),
                            fontWeight: "700",
                            color: c.bg,
                          }}
                        >
                          {t("posts.replyBtn")}
                        </AppText>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          {totalComments > displayComments.length && !showAllComments ? (
            <Pressable
              onPress={handleLoadMoreComments}
              disabled={loadingComments}
              style={{
                paddingVertical: 10,
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <AppText
                style={{
                  fontSize: rem(0.78),
                  fontWeight: "600",
                  color: c.orange,
                  textDecorationLine: "underline",
                }}
              >
                {loadingComments
                  ? t("common.loading")
                  : t("posts.viewAllComments", { count: totalComments })}
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* ─── Reactions modal ───────────────────────────── */}
      {showReactionsModal ? (
        <ReactionsModal
          postId={post.id}
          onClose={() => setShowReactionsModal(false)}
          user={user}
        />
      ) : null}

      {/* ─── Fullscreen image lightbox ─────────────────── */}
      {lightboxIdx !== null && postImages.length > 0 ? (
        <Modal
          visible
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent={true}
          onRequestClose={() => setLightboxIdx(null)}
        >
          <View style={styles.lightboxOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setLightboxIdx(null)}
            />
            <Pressable
              onPress={() => setLightboxIdx(null)}
              style={styles.lightboxClose}
              hitSlop={8}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
            {postImages.length > 1 ? (
              <>
                <Pressable
                  onPress={() =>
                    setLightboxIdx(
                      (i) => (i - 1 + post.images.length) % post.images.length,
                    )
                  }
                  style={[styles.lightboxNav, { left: 12 }]}
                >
                  <Ionicons name="chevron-back" size={28} color="#fff" />
                </Pressable>
                <Pressable
                  onPress={() =>
                    setLightboxIdx((i) => (i + 1) % post.images.length)
                  }
                  style={[styles.lightboxNav, { right: 12 }]}
                >
                  <Ionicons name="chevron-forward" size={28} color="#fff" />
                </Pressable>
              </>
            ) : null}
            <Image
              source={{ uri: resolveUrl(postImages[lightboxIdx]) }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
            {postImages.length > 1 ? (
              <View style={styles.lightboxCounter}>
                <AppText
                  style={{
                    fontSize: rem(0.78),
                    fontWeight: "600",
                    color: "#fff",
                  }}
                >
                  {lightboxIdx + 1} / {postImages.length}
                </AppText>
              </View>
            ) : null}
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "visible",
    position: "relative",
    maxWidth: "100%",
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatarWrap: { position: "relative", flexShrink: 0 },
  avatarImg: { width: "100%", height: "100%" },
  verifiedDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 999,
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  authorInfo: { flex: 1, minWidth: 0 },
  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  moreBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: "auto",
  },
  deleteConfirm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    flexWrap: "wrap",
  },
  deleteConfirmIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(239,68,68,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteConfirmActions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  repostBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  imageGrid: { marginTop: 12, borderRadius: 10, overflow: "hidden" },
  imagePressable: { width: "100%" },
  mainImage: { width: "100%", backgroundColor: "#0f0f1a" },
  imageDots: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 4,
  },
  imageDot: { width: 7, height: 7, borderRadius: 4 },
  repostCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  repostCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    flexWrap: "wrap",
    gap: 4,
  },
  countBtn: { flexDirection: "row", alignItems: "center" },
  countIcons: { flexDirection: "row", marginRight: 2 },
  iconCircle: {
    width: 18,
    height: 18,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginRight: -6,
  },
  countRight: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 0,
    borderRadius: 8,
  },
  reactWrap: { flex: 1, position: "relative", minWidth: 0 },
  reactionPicker: {
    position: "absolute",
    bottom: "100%",
    left: 0,
    marginBottom: 8,
    borderRadius: 999,
    padding: 6,
    flexDirection: "row",
    gap: 2,
    borderWidth: 1,
    zIndex: 50,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  reactionPickerBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  repostMenu: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 8,
    borderRadius: 12,
    padding: 6,
    width: 260,
    borderWidth: 1,
    zIndex: 50,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  shareMenu: {
    position: "absolute",
    bottom: "100%",
    right: 0,
    marginBottom: 8,
    borderRadius: 12,
    padding: 6,
    width: 240,
    borderWidth: 1,
    zIndex: 50,
    elevation: 10,
    maxHeight: 500,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  menuBtn: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  repostInputWrap: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    marginTop: 4,
  },
  repostInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 70,
    textAlignVertical: "top",
  },
  repostInputActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  cancelMini: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmMini: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  commentsSection: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  commentInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  commentAvatar: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  commentInput: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    minWidth: 0,
  },
  commentSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    justifyContent: "center",
  },
  commentItem: { flexDirection: "row", alignItems: "flex-start" },
  commentBubble: {
    borderRadius: 12,
    padding: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  commentMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingLeft: 6,
  },
  replies: {
    marginTop: 6,
    marginLeft: 12,
    gap: 6,
  },
  replyItem: { flexDirection: "row", alignItems: "flex-start" },
  replyInputWrap: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  lightboxImage: {
    width: "100%",
    height: "100%",
  },
  lightboxClose: {
    position: "absolute",
    top: 40,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  lightboxNav: {
    position: "absolute",
    top: "50%",
    marginTop: -26,
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  lightboxCounter: {
    position: "absolute",
    bottom: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    zIndex: 2,
  },
});
