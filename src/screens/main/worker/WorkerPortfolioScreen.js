// src/screens/main/worker/WorkerPortfolioScreen.js
// Verbatim port of pages/worker/portfolio/PortfolioPage.jsx.
//
// Endpoints:
//   GET    /workers/:id                → worker + portfolio + videoIntroUrl
//   POST   /workers/video-intro        → { videoUrl }
//   DELETE /workers/video-intro
//   POST   /workers/portfolio          → { portfolio: [...] }
//   DELETE /workers/portfolio/:id

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRMATION MODAL — RN port of components/ui/ConfirmationModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmVariant = "danger",
  c,
}) {
  if (!isOpen) return null;
  const confirmColor =
    confirmVariant === "primary"
      ? c.orange
      : confirmVariant === "warning"
        ? "#fbbf24"
        : c.red;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        onPress={onClose}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.72)",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 400,
            padding: 22,
            borderRadius: 16,
            borderWidth: 1,
            backgroundColor: c.bgPanel,
            borderColor: c.border,
          }}
        >
          <AppText
            weight="displayBlack"
            style={{ fontSize: 16, color: c.text, marginBottom: 8 }}
          >
            {title}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            {message}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: "transparent",
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
              >
                {cancelLabel}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: confirmColor,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: "#fff" }}
              >
                {confirmLabel}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON — mirrors the full page
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioSkeleton({ c }) {
  return (
    <View style={{ gap: 14 }}>
      <Skeleton width="100%" height={280} radius={14} />
      <Skeleton width="100%" height={220} radius={14} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={180} radius={12} />
        </View>
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={180} radius={12} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO INTRO SECTION
// ─────────────────────────────────────────────────────────────────────────────
function VideoIntro({ currentUrl, onUpdate, c, t, toast }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentUrl || null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setPreview(currentUrl || null);
  }, [currentUrl]);

  async function pickAndUpload() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t("workerPortfolio.permissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const sizeMb = (asset.fileSize || 0) / (1024 * 1024);
    if (sizeMb > 100) {
      toast.error(t("workerPortfolio.videoTooLarge"));
      return;
    }

    setPreview(asset.uri);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", {
        uri: asset.uri,
        name: asset.fileName || `video-${Date.now()}.mp4`,
        type: asset.mimeType || "video/mp4",
      });
      const res = await client.post("/workers/video-intro", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success(t("workerPortfolio.video.uploadSuccess"));
      onUpdate?.(res.data.data.videoUrl);
    } catch {
      toast.error(t("workerPortfolio.video.uploadFailed"));
      setPreview(currentUrl || null);
    } finally {
      setUploading(false);
    }
  }

  async function confirmDelete() {
    setConfirmOpen(false);
    try {
      await client.delete("/workers/video-intro");
      setPreview(null);
      toast.success(t("workerPortfolio.video.removeSuccess"));
      onUpdate?.(null);
    } catch {
      toast.error(t("workerPortfolio.video.removeFailed"));
    }
  }

  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 14,
        padding: 18,
      }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          marginBottom: 4,
        }}
      >
        <Ionicons name="videocam-outline" size={16} color={c.orange} />
        <AppText weight="displayBlack" style={{ fontSize: 13, color: c.text }}>
          {t("workerPortfolio.video.title")}
        </AppText>
      </View>
      <AppText style={{ fontSize: 13, color: c.textDim, marginBottom: 14 }}>
        {t("workerPortfolio.video.subtitle")}
      </AppText>

      {preview ? (
        <View>
          <View
            style={{
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: "#000",
              marginBottom: 12,
            }}
          >
            <Video
              source={{ uri: preview }}
              useNativeControls
              style={{ width: "100%", height: 200 }}
              resizeMode="contain"
            />
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={pickAndUpload}
              disabled={uploading}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.orange + "88",
                backgroundColor: c.orangeDim,
                opacity: uploading ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={c.orange} />
              ) : (
                <>
                  <Ionicons name="refresh" size={14} color={c.orange} />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: c.orange,
                    }}
                  >
                    {t("workerPortfolio.video.replace")}
                  </AppText>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={() => setConfirmOpen(true)}
              disabled={uploading}
              style={({ pressed }) => ({
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 10,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: c.red + "88",
                backgroundColor: c.redDim,
                opacity: uploading ? 0.5 : pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="trash-outline" size={13} color={c.red} />
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.red }}
              >
                {t("workerPortfolio.video.remove")}
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={() => !uploading && pickAndUpload()}
          disabled={uploading}
          style={({ pressed }) => ({
            borderWidth: 2,
            borderStyle: "dashed",
            borderColor: c.border,
            borderRadius: 12,
            paddingVertical: 36,
            paddingHorizontal: 20,
            alignItems: "center",
            gap: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Ionicons
            name="cloud-upload-outline"
            size={42}
            color={c.orange}
            style={{ opacity: 0.75 }}
          />
          <AppText style={{ fontSize: 14, fontWeight: "600", color: c.text }}>
            {uploading
              ? t("workerPortfolio.video.uploading")
              : t("workerPortfolio.video.upload")}
          </AppText>
          <AppText
            style={{
              fontSize: 12,
              color: c.textMuted,
              textAlign: "center",
              maxWidth: 280,
            }}
          >
            {t("workerPortfolio.video.requirements")}
          </AppText>
          {uploading && (
            <ActivityIndicator
              size="small"
              color={c.orange}
              style={{ marginTop: 6 }}
            />
          )}
        </Pressable>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmDelete}
        title={t("workerPortfolio.video.removeTitle")}
        message={t("workerPortfolio.video.removeMessage")}
        confirmLabel={t("workerPortfolio.video.remove")}
        cancelLabel={t("workerPortfolio.video.keep")}
        confirmVariant="danger"
        c={c}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerPortfolioScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = theme.colors;

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageAsset, setImageAsset] = useState(null);
  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [lightboxItem, setLightboxItem] = useState(null);

  const fetchWorker = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      const res = await client.get(`/workers/${user.id}`);
      setWorker(res.data.data?.worker ?? null);
    } catch {
      setWorker(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWorker();
  }, [fetchWorker]);

  useFocusEffect(
    useCallback(() => {
      fetchWorker();
    }, [fetchWorker]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWorker();
  };

  const portfolio = worker?.portfolio ?? [];
  const videoUrl = worker?.videoIntroUrl ?? null;

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t("workerPortfolio.permissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setImageAsset(result.assets[0]);
  }

  async function handleUpload() {
    if (!title.trim()) {
      toast.error(t("workerPortfolio.error.titleRequired"));
      return;
    }
    if (!imageAsset) {
      toast.error(t("workerPortfolio.error.imageRequired"));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("image", {
        uri: imageAsset.uri,
        name: imageAsset.fileName || `portfolio-${Date.now()}.jpg`,
        type: imageAsset.mimeType || "image/jpeg",
      });
      fd.append("title", title.trim());
      if (description.trim()) fd.append("description", description.trim());

      await client.post("/workers/portfolio", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setTitle("");
      setDescription("");
      setImageAsset(null);
      toast.success(t("workerPortfolio.add.success"));
      fetchWorker();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || t("workerPortfolio.add.failed"),
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;
    setDeletingId(id);
    try {
      await client.delete(`/workers/portfolio/${id}`);
      fetchWorker();
    } catch {
      toast.error(t("workerPortfolio.remove.failed"));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={c.orange}
        />
      }
    >
      {/* Header */}
      <View style={{ marginBottom: 6, marginTop: 4 }}>
        <AppText
          weight="displayBlack"
          style={{
            fontSize: 15,
            color: c.text,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          {t("workerPortfolio.list.title")}
        </AppText>
        <AppText style={{ fontSize: 13, color: c.textDim }}>
          {t("workerPortfolio.list.subtitle")}
        </AppText>
      </View>

      {loading ? (
        <PortfolioSkeleton c={c} />
      ) : (
        <>
          {/* Video intro */}
          <VideoIntro
            currentUrl={videoUrl}
            onUpdate={(url) =>
              setWorker((w) => (w ? { ...w, videoIntroUrl: url } : w))
            }
            c={c}
            t={t}
            toast={toast}
          />

          {/* Upload form */}
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 18,
            }}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 13, color: c.text, marginBottom: 12 }}
            >
              {t("workerPortfolio.add.title")}
            </AppText>

            {/* Title */}
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginBottom: 4,
              }}
            >
              {t("workerPortfolio.add.titleLabel")}
            </AppText>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("workerPortfolio.add.titlePlaceholder")}
              placeholderTextColor={c.textMuted}
              style={{
                backgroundColor: c.bgInput,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: c.text,
                fontSize: 13,
                marginBottom: 12,
              }}
            />

            {/* Description */}
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginBottom: 4,
              }}
            >
              {t("workerPortfolio.add.description")}
            </AppText>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("workerPortfolio.add.descriptionPlaceholder")}
              placeholderTextColor={c.textMuted}
              multiline
              style={{
                backgroundColor: c.bgInput,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                color: c.text,
                fontSize: 13,
                minHeight: 64,
                textAlignVertical: "top",
                marginBottom: 12,
              }}
            />

            {/* Image picker */}
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: c.textDim,
                marginBottom: 6,
              }}
            >
              {t("workerPortfolio.add.photo")}
            </AppText>
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: c.border,
                borderStyle: "dashed",
                backgroundColor: c.bgInput,
                opacity: pressed ? 0.85 : 1,
                marginBottom: 14,
              })}
            >
              {imageAsset ? (
                <Image
                  source={{ uri: imageAsset.uri }}
                  style={{ width: 40, height: 40, borderRadius: 6 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="image-outline" size={22} color={c.orange} />
              )}
              <AppText
                style={{ flex: 1, fontSize: 13, color: c.text }}
                numberOfLines={1}
              >
                {imageAsset
                  ? imageAsset.fileName || t("workerPortfolio.add.changePhoto")
                  : t("workerPortfolio.add.selectPhoto")}
              </AppText>
              <Ionicons
                name={imageAsset ? "refresh" : "add"}
                size={16}
                color={c.textMuted}
              />
            </Pressable>

            {/* Submit */}
            <Pressable
              onPress={handleUpload}
              disabled={saving}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                paddingVertical: 12,
                borderRadius: 10,
                backgroundColor: c.orange,
                opacity: saving ? 0.5 : pressed ? 0.9 : 1,
              })}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add" size={16} color="#fff" />
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    {t("workerPortfolio.add.button")}
                  </AppText>
                </>
              )}
            </Pressable>
          </View>

          {/* Portfolio grid */}
          <View
            style={{
              backgroundColor: c.bgPanel,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              padding: 18,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
                gap: 6,
              }}
            >
              <AppText
                weight="displayBlack"
                style={{ fontSize: 13, color: c.text }}
              >
                {t("workerPortfolio.list.title")}
              </AppText>
              <AppText style={{ fontSize: 13, color: c.textDim }}>
                ({portfolio.length})
              </AppText>
            </View>

            {portfolio.length === 0 ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: 40,
                  gap: 8,
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={42}
                  color={c.textDim}
                  style={{ opacity: 0.5 }}
                />
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: c.textDim,
                    textAlign: "center",
                  }}
                >
                  {t("workerPortfolio.list.emptyTitle")}
                </AppText>
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    textAlign: "center",
                    maxWidth: 280,
                  }}
                >
                  {t("workerPortfolio.list.emptySub")}
                </AppText>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                {portfolio.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      width: "48%",
                      backgroundColor: c.bgCard,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <Pressable
                      onPress={() => setLightboxItem(item)}
                      style={{ position: "relative", height: 140 }}
                    >
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 28,
                          height: 28,
                          borderRadius: 6,
                          backgroundColor: "rgba(0,0,0,0.55)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="expand-outline"
                          size={14}
                          color="#fff"
                        />
                      </View>
                    </Pressable>
                    <View style={{ padding: 10, gap: 4 }}>
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: c.text,
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </AppText>
                      {item.description ? (
                        <AppText
                          style={{ fontSize: 11, color: c.textDim }}
                          numberOfLines={2}
                        >
                          {item.description}
                        </AppText>
                      ) : null}
                      <Pressable
                        onPress={() => setPendingDelete(item.id)}
                        disabled={deletingId === item.id}
                        style={({ pressed }) => ({
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                          alignSelf: "flex-start",
                          marginTop: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: c.red + "88",
                          backgroundColor: c.redDim,
                          opacity:
                            deletingId === item.id ? 0.5 : pressed ? 0.85 : 1,
                        })}
                      >
                        {deletingId === item.id ? (
                          <ActivityIndicator size="small" color={c.red} />
                        ) : (
                          <>
                            <Ionicons
                              name="trash-outline"
                              size={11}
                              color={c.red}
                            />
                            <AppText
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: c.red,
                              }}
                            >
                              {t("workerPortfolio.list.remove")}
                            </AppText>
                          </>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {/* Lightbox */}
      <Modal
        visible={!!lightboxItem}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxItem(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.94)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <Pressable
            onPress={() => setLightboxItem(null)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              zIndex: 2,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
          {lightboxItem && (
            <>
              <Image
                source={{ uri: lightboxItem.imageUrl }}
                style={{ width: "100%", height: "70%" }}
                resizeMode="contain"
              />
              {lightboxItem.title || lightboxItem.description ? (
                <View
                  style={{
                    marginTop: 16,
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {lightboxItem.title ? (
                    <AppText
                      weight="displayBlack"
                      style={{ fontSize: 16, color: "#fff" }}
                    >
                      {lightboxItem.title}
                    </AppText>
                  ) : null}
                  {lightboxItem.description ? (
                    <AppText
                      style={{
                        fontSize: 13,
                        color: "rgba(255,255,255,0.75)",
                        textAlign: "center",
                      }}
                    >
                      {lightboxItem.description}
                    </AppText>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </View>
      </Modal>

      {/* Delete confirmation */}
      <ConfirmationModal
        isOpen={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={t("workerPortfolio.remove.title")}
        message={t("workerPortfolio.remove.message")}
        confirmLabel={t("workerPortfolio.remove.confirm")}
        cancelLabel={t("workerPortfolio.remove.cancel")}
        confirmVariant="danger"
        c={c}
      />
    </ScrollView>
  );
}
