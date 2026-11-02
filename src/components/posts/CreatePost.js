// src/components/posts/CreatePost.js
//
// Ported from CreatePost.jsx + CreatePost.module.css.
//
// Image upload specifics (RN-specific — differs from web):
//   • expo-image-picker returns { uri, fileName?, mimeType? } for each asset
//   • FormData.append("files", { uri, name, type }) — NOT a File object
//   • We send the field name "files" (matches backend multer config)
//     If your backend expects a different field name, change FILES_FIELD below.

import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

const FILES_FIELD = "images"; // ← matches src/api/posts.js and backend multer

const POST_TYPES = [
  { value: "GENERAL", key: "posts.typeGeneral", icon: "chatbubble-outline" },
  {
    value: "ACHIEVEMENT",
    key: "posts.typeAchievement",
    icon: "trophy-outline",
  },
  { value: "PORTFOLIO", key: "posts.typePortfolio", icon: "image-outline" },
  { value: "HIRING", key: "posts.typeHiring", icon: "megaphone-outline" },
  {
    value: "JOB_UPDATE",
    key: "posts.typeJobUpdate",
    icon: "briefcase-outline",
  },
  {
    value: "ANNOUNCEMENT",
    key: "posts.typeAnnouncement",
    icon: "volume-high-outline",
  },
];

export default function CreatePost({ onPostCreated, compact = false }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const { width } = useWindowDimensions();

  const [expanded, setExpanded] = useState(!compact);
  const [content, setContent] = useState("");
  const [type, setType] = useState("GENERAL");
  const [isPublic, setIsPublic] = useState(true);
  const [images, setImages] = useState([]); // { uri, name, type }
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const textareaRef = useRef(null);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  if (!user) return null;

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t("posts.permissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.85,
    });
    if (result.canceled) return;

    const mapped = result.assets.map((a, idx) => ({
      uri: a.uri,
      name: a.fileName || `photo-${Date.now()}-${idx}.jpg`,
      type: a.mimeType || "image/jpeg",
    }));

    if (images.length + mapped.length > 4) {
      setError(t("posts.maxImagesError"));
      return;
    }

    setImages((prev) => [...prev, ...mapped]);
    setError("");
  };

  const openPhotoShortcut = () => {
    setExpanded(true);
    setTimeout(pickImages, 100);
  };

  const openJobShortcut = () => {
    setType("HIRING");
    setExpanded(true);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const removeImage = (idx) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      setError(t("posts.pleaseWriteSomething"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const form = new FormData();
      form.append("content", content);
      form.append("type", type);
      form.append("isPublic", isPublic ? "true" : "false");

      images.forEach((img) => {
        form.append(FILES_FIELD, {
          uri: img.uri,
          name: img.name,
          type: img.type,
        });
      });

      // TEMP diagnostic — remove once images work
      console.log(
        "[CreatePost] submitting",
        JSON.stringify({
          contentLength: content.length,
          type,
          isPublic,
          imagesCount: images.length,
          imageNames: images.map((i) => i.name),
        }),
      );

      const res = await client.post("/posts", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log(
        "[CreatePost] response post:",
        JSON.stringify(res.data?.data?.post)?.slice(0, 600),
      );

      onPostCreated?.(res.data?.data?.post);
      toast.success(t("posts.postedSuccess"));
      setContent("");
      setImages([]);
      setType("GENERAL");
      if (compact) setExpanded(false);
    } catch (err) {
      console.log(
        "[CreatePost] error:",
        err?.message,
        err?.response?.status,
        err?.response?.data,
      );
      const msg = err?.response?.data?.message || t("posts.postFailed");
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const charLimit = 3000;
  const charLeft = charLimit - content.length;

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: c.bgPanel, borderColor: c.border },
      ]}
    >
      {/* ── Compact trigger ─────────────────────────── */}
      {compact && !expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          style={[styles.compactTrigger, { padding: width <= 640 ? 14 : 16 }]}
        >
          <View
            style={[
              styles.triggerAvatar,
              {
                backgroundColor: c.orangeDim,
                width: width <= 380 ? 32 : width <= 640 ? 36 : 40,
                height: width <= 380 ? 32 : width <= 640 ? 36 : 40,
              },
            ]}
          >
            {user.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
            ) : (
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: c.orange,
                }}
              >
                {user.firstName?.[0] || "?"}
              </AppText>
            )}
          </View>
          <View
            style={[
              styles.triggerInput,
              { backgroundColor: c.bgInput, borderColor: c.border },
            ]}
          >
            <AppText
              numberOfLines={1}
              style={{
                fontFamily: theme.fonts?.body || "DMSans_400Regular",
                fontSize: rem(width <= 380 ? 0.78 : width <= 640 ? 0.82 : 0.85),
                color: c.textMuted,
              }}
            >
              {t("posts.compactPlaceholder")}
            </AppText>
          </View>
          <View style={styles.triggerActions}>
            <Pressable
              onPress={openPhotoShortcut}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Ionicons name="camera-outline" size={16} color={c.textDim} />
            </Pressable>
            <Pressable
              onPress={openJobShortcut}
              hitSlop={8}
              style={{ padding: 4 }}
            >
              <Ionicons name="briefcase-outline" size={16} color={c.textDim} />
            </Pressable>
          </View>
        </Pressable>
      ) : null}

      {/* ── Full editor ─────────────────────────────── */}
      {expanded ? (
        <View style={styles.editor}>
          <View style={styles.editorHeader}>
            <View
              style={[
                styles.editorAvatar,
                { backgroundColor: c.orangeDim, overflow: "hidden" },
              ]}
            >
              {user.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ width: "100%", height: "100%" }}
                  resizeMode="cover"
                />
              ) : (
                <AppText
                  style={{
                    fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                    fontSize: rem(1),
                    fontWeight: "700",
                    color: c.orange,
                  }}
                >
                  {user.firstName?.[0] || "?"}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{
                  fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                  fontSize: rem(0.9),
                  fontWeight: "700",
                  color: c.text,
                }}
              >
                {user.firstName} {user.lastName}
              </AppText>
              <Pressable
                onPress={() => setIsPublic((v) => !v)}
                style={[
                  styles.visibilitySelect,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ]}
              >
                <AppText
                  style={{
                    fontFamily:
                      theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                    fontSize: rem(0.72),
                    fontWeight: "600",
                    color: c.textDim,
                  }}
                >
                  {isPublic ? t("posts.public") : t("posts.onlyMe")}
                </AppText>
              </Pressable>
            </View>
          </View>

          <TextInput
            ref={textareaRef}
            value={content}
            onChangeText={(v) => setContent(v.slice(0, charLimit))}
            placeholder={t("posts.editorPlaceholder")}
            placeholderTextColor={c.textMuted}
            multiline
            autoFocus={!compact}
            style={{
              color: c.text,
              fontFamily: theme.fonts?.body || "DMSans_400Regular",
              fontSize: rem(0.925),
              lineHeight: rem(0.925) * 1.7,
              minHeight: 120,
              textAlignVertical: "top",
            }}
          />

          {content.length > charLimit * 0.8 ? (
            <AppText
              style={{
                fontSize: rem(0.72),
                color: charLeft < 100 ? c.red : c.textMuted,
                textAlign: "right",
              }}
            >
              {t("posts.charactersRemaining", { count: charLeft })}
            </AppText>
          ) : null}

          {images.length > 0 ? (
            <View style={styles.previews}>
              {images.map((img, i) => (
                <View key={i} style={styles.previewItem}>
                  <Image source={{ uri: img.uri }} style={styles.previewImg} />
                  <Pressable
                    onPress={() => removeImage(i)}
                    style={styles.previewRemove}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={11} color="#fff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          {error ? (
            <View
              style={[
                styles.errorBanner,
                {
                  backgroundColor: c.redDim,
                  borderColor: "rgba(239,68,68,0.25)",
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={15} color={c.red} />
              <AppText
                style={{
                  flex: 1,
                  fontSize: rem(0.82),
                  fontWeight: "600",
                  color: c.red,
                  marginLeft: 6,
                }}
              >
                {error}
              </AppText>
              <Pressable onPress={() => setError("")} hitSlop={6}>
                <Ionicons name="close" size={14} color={c.red} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.typeRow}>
            {POST_TYPES.map((pt) => {
              const active = type === pt.value;
              return (
                <Pressable
                  key={pt.value}
                  onPress={() => setType(pt.value)}
                  style={[
                    styles.typeBtn,
                    {
                      backgroundColor: active ? c.orangeDim : c.bgCard,
                      borderColor: active ? c.orangeGlow : c.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={pt.icon}
                    size={12}
                    color={active ? c.orange : c.textMuted}
                  />
                  <AppText
                    style={{
                      fontSize: rem(0.72),
                      fontWeight: "600",
                      color: active ? c.orange : c.textMuted,
                      marginLeft: 4,
                    }}
                  >
                    {t(pt.key)}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.footer, { borderTopColor: c.border }]}>
            <Pressable
              onPress={pickImages}
              style={[styles.attachBtn, { borderColor: c.border }]}
            >
              <Ionicons name="camera-outline" size={14} color={c.textDim} />
              <AppText
                style={{
                  fontSize: rem(0.8),
                  fontWeight: "600",
                  color: c.textDim,
                  marginLeft: 5,
                }}
              >
                {t("posts.photoBtn")}
              </AppText>
            </Pressable>
            <View style={styles.footerRight}>
              {compact ? (
                <Pressable
                  onPress={() => {
                    setExpanded(false);
                    setContent("");
                    setImages([]);
                  }}
                  style={[styles.cancelBtn, { borderColor: c.border }]}
                >
                  <AppText
                    style={{
                      fontSize: rem(0.83),
                      fontWeight: "600",
                      color: c.textDim,
                    }}
                  >
                    {t("common.cancel")}
                  </AppText>
                </Pressable>
              ) : null}
              <Pressable
                onPress={handleSubmit}
                disabled={!content.trim() || submitting}
                style={({ pressed }) => [
                  styles.postBtn,
                  {
                    backgroundColor:
                      pressed && content.trim() && !submitting
                        ? c.orangeHover
                        : c.orange,
                    opacity: !content.trim() || submitting ? 0.5 : 1,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={c.bg} />
                ) : null}
                <AppText
                  style={{
                    fontFamily: theme.fonts?.bodyBold || "DMSans_700Bold",
                    fontSize: rem(0.875),
                    fontWeight: "700",
                    color: c.bg,
                    marginLeft: submitting ? 6 : 0,
                  }}
                >
                  {submitting ? t("posts.posting") : t("posts.postBtn")}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  compactTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  triggerAvatar: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
  },
  triggerInput: {
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  triggerActions: { flexDirection: "row", gap: 4, flexShrink: 0 },
  editor: { padding: 20, gap: 14 },
  editorHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  editorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  visibilitySelect: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    marginTop: 6,
  },
  previews: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  previewItem: { position: "relative" },
  previewImg: { width: 80, height: 80, borderRadius: 8 },
  previewRemove: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  typeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  footerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  postBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
});
