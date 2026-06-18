// src/screens/main/worker/WorkerPortfolioScreen.js
// Mirrors: website /worker/portfolio
// APIs:
//   GET  /workers/:userId       — load portfolio + videoIntroUrl
//   POST /workers/portfolio     — FormData: image, title, description
//   DELETE /workers/portfolio/:id
//   POST /workers/video-intro   — FormData: file
//   DELETE /workers/video-intro

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import AppScreen from "../../../components/AppScreen";
import AppText from "../../../components/AppText";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import client from "../../../api/client";

const SCREEN_W = Dimensions.get("window").width;
const CARD_W = (SCREEN_W - 48 - 10) / 2; // 2-col grid, 16px padding, 10px gap

// ─── Full-screen image viewer ──────────────────────────────────────────────────
function ImageViewer({ uri, onClose }) {
  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={iv.bg}>
        <Pressable style={iv.closeBtn} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
        {uri && <Image source={{ uri }} style={iv.img} resizeMode="contain" />}
      </View>
    </Modal>
  );
}

const iv = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 52,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 20,
    padding: 8,
  },
  img: { width: SCREEN_W, height: SCREEN_W * 1.2, maxHeight: "85%" },
});

// ─── Video Intro card ─────────────────────────────────────────────────────────
function VideoIntroCard({ videoUrl, onReload, c, toast }) {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Permission required");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    });
    if (r.canceled || !r.assets?.[0]) return;
    const a = r.assets[0];
    if (a.fileSize && a.fileSize > 100 * 1024 * 1024) {
      toast.error("Video must be under 100MB");
      return;
    }
    const formData = new FormData();
    formData.append("file", {
      uri: a.uri,
      name: a.fileName ?? "intro.mp4",
      type: a.mimeType ?? "video/mp4",
    });
    setUploading(true);
    try {
      await client.post("/workers/video-intro", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Video intro uploaded!");
      onReload();
    } catch {
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Remove Video", "Remove your video introduction?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete("/workers/video-intro");
            toast.success("Video intro removed");
            onReload();
          } catch {
            toast.error("Failed to remove");
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[p.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
    >
      <AppText
        variant="title"
        weight="semibold"
        style={{ color: c.text, marginBottom: 4 }}
      >
        🎬 Video Introduction
      </AppText>
      <AppText variant="small" tone="dim" style={{ marginBottom: 16 }}>
        Record a 60-second intro to stand out. Hirers love it.
      </AppText>

      {videoUrl ? (
        <View>
          {/* Video preview — tap to open in device player */}
          <Pressable
            onPress={() => Linking.openURL(videoUrl)}
            style={[
              p.videoPreview,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <View style={p.playOverlay}>
              <View style={p.playCircle}>
                <Ionicons
                  name="play"
                  size={32}
                  color="#fff"
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>
            <AppText variant="small" tone="dim" style={{ marginTop: 12 }}>
              Tap to play · 0:05
            </AppText>
          </Pressable>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <Pressable
              onPress={pickAndUpload}
              disabled={uploading}
              style={[
                p.actionBtn,
                { borderColor: c.orange, opacity: uploading ? 0.7 : 1 },
              ]}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={c.orange} />
              ) : (
                <AppText
                  variant="small"
                  weight="semibold"
                  style={{ color: c.orange }}
                >
                  Replace Video
                </AppText>
              )}
            </Pressable>
            <Pressable
              onPress={handleDelete}
              style={[p.actionBtn, { borderColor: "#ef4444" }]}
            >
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: "#ef4444" }}
              >
                Remove
              </AppText>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable
          onPress={pickAndUpload}
          disabled={uploading}
          style={[
            p.dropzone,
            { borderColor: c.border, backgroundColor: c.bgPanel },
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="large" color={c.orange} />
          ) : (
            <>
              <AppText style={{ fontSize: 40, marginBottom: 10 }}>🎥</AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginBottom: 4 }}
              >
                Upload your intro video
              </AppText>
              <AppText variant="small" tone="dim">
                MP4, MOV, WebM · Max 100MB · Under 60s
              </AppText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function WorkerPortfolioScreen() {
  const { theme: th } = useTheme();
  const { toast } = useToast();
  const { user } = useAuthStore();
  const c = th.colors;

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [fullImg, setFullImg] = useState(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null); // { uri, name, type }

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await client.get(`/workers/${user.id}`);
      setWorker(res.data.data?.worker ?? null);
    } catch {
      toast.error("Could not load portfolio");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const portfolio = worker?.portfolio ?? [];
  const videoUrl = worker?.videoIntroUrl ?? null;

  // ── Pick image ──────────────────────────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      toast.error("Permission required");
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!r.canceled && r.assets?.[0]) {
      const a = r.assets[0];
      setImageFile({
        uri: a.uri,
        name: a.fileName ?? "photo.jpg",
        type: a.mimeType ?? "image/jpeg",
      });
    }
  };

  // ── Upload portfolio item ───────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!imageFile) {
      toast.error("Please select an image");
      return;
    }
    const formData = new FormData();
    formData.append("image", imageFile);
    formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());
    setSaving(true);
    try {
      await client.post("/workers/portfolio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTitle("");
      setDescription("");
      setImageFile(null);
      toast.success("Portfolio item added!");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete portfolio item ───────────────────────────────────────────────────
  const handleDelete = (id) => {
    Alert.alert("Remove Item", "Delete this portfolio item?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          try {
            await client.delete(`/workers/portfolio/${id}`);
            load();
          } catch {
            toast.error("Delete failed");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={c.orange} />
      </View>
    );
  }

  return (
    <AppScreen
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={c.orange}
        />
      }
      contentContainerStyle={{ paddingBottom: 40, gap: 16 }}
    >
      {/* ── Video Intro ── */}
      <VideoIntroCard videoUrl={videoUrl} onReload={load} c={c} toast={toast} />

      {/* ── Add Portfolio Item ── */}
      <View
        style={[p.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 16 }}
        >
          Add Portfolio Item
        </AppText>

        <AppText variant="small" weight="semibold" style={p.label}>
          Title *
        </AppText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Kitchen rewiring job"
          placeholderTextColor={c.textMuted}
          style={[
            p.input,
            {
              color: c.text,
              backgroundColor: c.bgInput,
              borderColor: c.border,
            },
          ]}
        />

        <AppText
          variant="small"
          weight="semibold"
          style={[p.label, { marginTop: 14 }]}
        >
          Photo *
        </AppText>
        <Pressable
          onPress={pickImage}
          style={[
            p.imagePicker,
            {
              borderColor: imageFile ? c.orange : c.border,
              backgroundColor: imageFile ? `${c.orange}08` : c.bgInput,
            },
          ]}
        >
          {imageFile ? (
            <View style={{ alignItems: "center", gap: 6 }}>
              <Image source={{ uri: imageFile.uri }} style={p.imagePreview} />
              <AppText
                variant="small"
                weight="semibold"
                style={{ color: c.orange }}
              >
                Tap to change
              </AppText>
            </View>
          ) : (
            <View style={{ alignItems: "center", gap: 8 }}>
              <Ionicons name="image-outline" size={36} color={c.textMuted} />
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text }}
              >
                Tap to select photo
              </AppText>
              <AppText variant="small" tone="dim">
                JPG, PNG · max 10MB
              </AppText>
            </View>
          )}
        </Pressable>

        <AppText
          variant="small"
          weight="semibold"
          style={[p.label, { marginTop: 14 }]}
        >
          Description (optional)
        </AppText>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Describe the work done..."
          placeholderTextColor={c.textMuted}
          style={[
            p.input,
            {
              color: c.text,
              backgroundColor: c.bgInput,
              borderColor: c.border,
            },
          ]}
        />

        <Pressable
          onPress={handleUpload}
          disabled={saving}
          style={[
            p.addBtn,
            {
              backgroundColor: c.orange,
              opacity: saving ? 0.75 : 1,
              marginTop: 16,
            },
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <AppText variant="body" weight="semibold" style={{ color: "#fff" }}>
              + Add to Portfolio
            </AppText>
          )}
        </Pressable>
      </View>

      {/* ── Portfolio Grid ── */}
      <View
        style={[p.card, { backgroundColor: c.bgCard, borderColor: c.border }]}
      >
        <AppText
          variant="title"
          weight="semibold"
          style={{ color: c.text, marginBottom: 16 }}
        >
          My Portfolio{" "}
          <AppText variant="body" tone="dim">
            ({portfolio.length})
          </AppText>
        </AppText>

        {portfolio.length === 0 ? (
          <View style={p.empty}>
            <AppText style={{ fontSize: 48, marginBottom: 10 }}>🖼️</AppText>
            <AppText
              variant="body"
              weight="semibold"
              style={{ color: c.text, marginBottom: 4 }}
            >
              No portfolio items yet
            </AppText>
            <AppText variant="small" tone="dim" style={{ textAlign: "center" }}>
              Upload photos of your completed work to attract more clients
            </AppText>
          </View>
        ) : (
          <View style={p.grid}>
            {portfolio.map((item) => (
              <View
                key={item.id}
                style={[
                  p.gridCard,
                  { backgroundColor: c.bgPanel, borderColor: c.border },
                ]}
              >
                {/* Tap image → fullscreen */}
                <Pressable onPress={() => setFullImg(item.imageUrl)}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={p.gridImg}
                    resizeMode="cover"
                  />
                </Pressable>
                <View style={p.gridBody}>
                  <AppText
                    variant="body"
                    weight="semibold"
                    style={{ color: c.text }}
                    numberOfLines={1}
                  >
                    {item.title}
                  </AppText>
                  {item.description ? (
                    <AppText
                      variant="small"
                      tone="dim"
                      numberOfLines={2}
                      style={{ marginTop: 2 }}
                    >
                      {item.description}
                    </AppText>
                  ) : null}
                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                    style={[p.removeBtn, { borderColor: "#ef4444" }]}
                  >
                    {deletingId === item.id ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="#ef4444"
                          style={{ marginRight: 4 }}
                        />
                        <AppText
                          variant="small"
                          weight="semibold"
                          style={{ color: "#ef4444" }}
                        >
                          Remove
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

      {/* ── Full-screen image viewer ── */}
      <ImageViewer uri={fullImg} onClose={() => setFullImg(null)} />
    </AppScreen>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const p = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },

  label: {
    color: "#6b7280",
    letterSpacing: 0.6,
    fontSize: 11,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },

  imagePicker: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 130,
  },
  imagePreview: { width: 120, height: 80, borderRadius: 8 },
  addBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },

  videoPreview: {
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  playOverlay: { alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 40,
    alignItems: "center",
  },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  gridCard: {
    width: CARD_W,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  gridImg: { width: "100%", height: CARD_W * 0.75 },
  gridBody: { padding: 10 },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 8,
  },

  empty: { paddingVertical: 36, alignItems: "center" },
});
