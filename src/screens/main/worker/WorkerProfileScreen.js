// src/screens/main/worker/WorkerUserProfileScreen.js
// Verbatim port of pages/worker/profile/UserProfile.jsx (shared by
// worker + hirer profiles — the same route is used for viewing another
// user's profile, editing your own, and public-profile deep links).
//
// Endpoints:
//   GET  /users/:id                       → profile
//   GET  /reviews/worker/:id | hirer/:id  → reviews (lazy on tab)
//   PUT  /users/me/avatar  (multipart)    → avatar upload
//
// Wraps the same modern card styling used by the retained-staff /
// disputes / portfolio / subscription screens.

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  StyleSheet,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { SafeAreaView } from "react-native-safe-area-context";
import { Video } from "expo-av";
import { WebView } from "react-native-webview";
import * as ImagePicker from "expo-image-picker";

import AppText from "../../../components/AppText";
import Skeleton from "../../../components/Skeleton";
import { useTheme } from "../../../contexts/ThemeContext";
import { useToast } from "../../../contexts/ToastContext";
import { useAuthStore } from "../../../store/authStore";
import { useSubscription } from "../../../contexts/SubscriptionContext";
import client from "../../../api/client";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function initials(u) {
  if (!u) return "??";
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase();
}

function timeAgo(date, t) {
  if (!date) return t("workerUserProfile.timeNever");
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return t("workerUserProfile.timeJustNow");
  if (m < 60) return t("workerUserProfile.timeMinutesAgo", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("workerUserProfile.timeHoursAgo", { h });
  const d = Math.floor(h / 24);
  if (d < 30) return t("workerUserProfile.timeDaysAgo", { d });
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtShortDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

function fmtLongDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function classifyFile(url) {
  if (!url) return "other";
  const u = url.split("?")[0].toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg|avif|heic|heif)$/.test(u))
    return "image";
  if (/\.(mp4|webm|mov|m4v|ogg|ogv|avi|mkv)$/.test(u)) return "video";
  if (/\.pdf$/.test(u)) return "pdf";
  if (u.includes("/image/upload/")) return "image";
  if (u.includes("/video/upload/")) return "video";
  return "other";
}

// ─────────────────────────────────────────────────────────────────────────────
// STARS
// ─────────────────────────────────────────────────────────────────────────────
function Stars({ rating = 0, max = 5, c }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }, (_, i) => (
        <Ionicons
          key={i}
          name={i < Math.round(rating) ? "star" : "star-outline"}
          size={13}
          color={i < Math.round(rating) ? "#f97316" : c.textMuted}
        />
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRO / ENTERPRISE BADGE
// ─────────────────────────────────────────────────────────────────────────────
function ProBadge({ isOwn, t, c }) {
  const { isEnterprise, isProTier } = useSubscription();
  if (!isOwn) return null;

  if (isEnterprise) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: "rgba(167,139,250,0.15)",
          borderWidth: 1,
          borderColor: "rgba(167,139,250,0.4)",
        }}
      >
        <Ionicons name="sparkles" size={10} color="#a78bfa" />
        <AppText
          style={{
            fontSize: 9,
            fontWeight: "800",
            color: "#a78bfa",
            letterSpacing: 0.5,
          }}
        >
          {t("workerUserProfile.enterpriseBadge")}
        </AppText>
      </View>
    );
  }
  if (isProTier) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 999,
          backgroundColor: c.orangeDim,
          borderWidth: 1,
          borderColor: c.orange + "55",
        }}
      >
        <Ionicons name="sparkles" size={10} color={c.orange} />
        <AppText
          style={{
            fontSize: 9,
            fontWeight: "800",
            color: c.orange,
            letterSpacing: 0.5,
          }}
        >
          {t("workerUserProfile.proBadge")}
        </AppText>
      </View>
    );
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON
// ─────────────────────────────────────────────────────────────────────────────
function ProfileSkeleton({ c }) {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, gap: 14 }}
    >
      <Skeleton width="100%" height={280} radius={18} />
      <Skeleton width="100%" height={140} radius={14} />
      <Skeleton width="100%" height={100} radius={14} />
      <Skeleton width="100%" height={80} radius={14} />
      <Skeleton width="100%" height={60} radius={14} />
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIRM MODAL (local — for deactivate inside EditProfileScreen only)
// ─────────────────────────────────────────────────────────────────────────────
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  c,
}) {
  if (!visible) return null;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        onPress={onCancel}
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.75)",
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
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 18,
            padding: 22,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: c.redDim,
              borderWidth: 1,
              borderColor: c.red + "55",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 14,
            }}
          >
            <Ionicons name="warning" size={24} color={c.red} />
          </View>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 17,
              color: c.text,
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            {title}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: c.textDim,
              textAlign: "center",
              lineHeight: 20,
              marginBottom: 20,
            }}
          >
            {message}
          </AppText>
          <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
            <Pressable
              onPress={onCancel}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                borderColor: c.border,
              }}
            >
              <AppText
                style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
              >
                {confirmLabel ? "Cancel" : "Cancel"}
              </AppText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: c.red,
              }}
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
// AVATAR BLOCK
// ─────────────────────────────────────────────────────────────────────────────
function AvatarBlock({ user, onAvatarChange, c, t, onOpenViewer, isOwn }) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t("workerUserProfile.permissionRequired"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("avatar", {
        uri: asset.uri,
        name: asset.fileName || `avatar-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      const res = await client.put("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onAvatarChange?.(res.data.data.user.avatar);
    } catch {
      toast.error(t("workerUserProfile.avatarFailed"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <View
      style={{
        width: 88,
        height: 88,
        alignSelf: "center",
        marginBottom: 14,
      }}
    >
      <Pressable
        onPress={() => {
          if (user?.avatar) onOpenViewer?.();
        }}
        disabled={!user?.avatar}
        style={{
          width: 88,
          height: 88,
          borderRadius: 44,
          overflow: "hidden",
          backgroundColor: c.orangeDim,
          borderWidth: 3,
          borderColor: c.border,
        }}
      >
        {user?.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
          />
        ) : (
          <View
            style={{
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 26, color: c.orange }}
            >
              {initials(user)}
            </AppText>
          </View>
        )}
      </Pressable>

      {isOwn && (
        <Pressable
          onPress={handleFile}
          disabled={uploading}
          style={{
            position: "absolute",
            bottom: -2,
            right: -2,
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: c.orange,
            borderWidth: 2,
            borderColor: c.bgPanel,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={c.bg} />
          ) : (
            <Ionicons name="camera" size={14} color={c.bg} />
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FULL-SCREEN MEDIA VIEWER (cert / avatar / portfolio)
// ─────────────────────────────────────────────────────────────────────────────
function MediaViewer({ media, onClose, c }) {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    setZoom(1);
  }, [media?.uri]);

  if (!media) return null;

  const { uri, title, kind } = media;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.94)" }}
        edges={["top", "bottom"]}
      >
        {/* Top bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: "rgba(255,255,255,0.08)",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Ionicons name="document-text-outline" size={14} color={c.orange} />
            <AppText
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: "600",
                flexShrink: 1,
              }}
              numberOfLines={1}
            >
              {title}
            </AppText>
          </View>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {kind === "image" ? (
              <>
                <Pressable
                  onPress={() => setZoom((z) => Math.max(0.25, z - 0.25))}
                  style={mv.btn}
                >
                  <Ionicons name="remove" size={14} color="#fff" />
                </Pressable>
                <AppText
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 11,
                    minWidth: 40,
                    textAlign: "center",
                    alignSelf: "center",
                  }}
                >
                  {Math.round(zoom * 100)}%
                </AppText>
                <Pressable
                  onPress={() => setZoom((z) => Math.min(4, z + 0.25))}
                  style={mv.btn}
                >
                  <Ionicons name="add" size={14} color="#fff" />
                </Pressable>
              </>
            ) : null}
            <Pressable onPress={onClose} style={[mv.btn, mv.closeBtn]}>
              <Ionicons name="close" size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Stage */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          {kind === "image" ? (
            <Image
              source={{ uri }}
              style={{
                width: "100%",
                height: "100%",
                transform: [{ scale: zoom }],
              }}
              resizeMode="contain"
            />
          ) : null}

          {kind === "video" ? (
            <Video
              source={{ uri }}
              useNativeControls
              resizeMode="contain"
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}

          {kind === "pdf" ? (
            <WebView
              source={{
                uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(uri)}`,
              }}
              style={{ flex: 1, width: "100%", backgroundColor: "#fff" }}
              originWhitelist={["*"]}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ActivityIndicator size="large" color={c.orange} />
                </View>
              )}
            />
          ) : null}

          {kind === "other" ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <Ionicons
                name="document-text-outline"
                size={48}
                color="rgba(255,255,255,0.5)"
              />
              <AppText
                style={{
                  color: "rgba(255,255,255,0.7)",
                  fontSize: 13,
                  textAlign: "center",
                }}
              >
                {t("workerUserProfile.previewNotAvailable")}
              </AppText>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const mv = StyleSheet.create({
  btn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  closeBtn: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.4)",
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerUserProfileScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const c = theme.colors;
  const { user: me, updateUser } = useAuthStore();

  const id = route.params?.id;
  const profileId = id || me?.id;

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("About");

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsTotal, setReviewsTotal] = useState(0);

  const [lightbox, setLightbox] = useState(null); // { type: 'portfolio'|'cert', item }
  const [media, setMedia] = useState(null); // { uri, title, kind }
  const [avatarViewer, setAvatarViewer] = useState(null);

  const isOwn = me?.id === id || (!id && !!me);

  const fetchProfile = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    setError("");
    try {
      const res = await client.get(`/users/${profileId}`);
      setUser(res.data.data.user);
    } catch {
      setError(t("workerUserProfile.notFound"));
    } finally {
      setLoading(false);
    }
  }, [profileId, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  // Load reviews lazily when Reviews tab opens
  useEffect(() => {
    if (tab !== "Reviews" || !profileId || !user?.role) return;
    let cancelled = false;
    setReviewsLoading(true);
    const endpoint =
      user.role === "WORKER"
        ? `/reviews/worker/${profileId}`
        : `/reviews/hirer/${profileId}`;
    client
      .get(endpoint, { params: { limit: 20 } })
      .then((res) => {
        if (cancelled) return;
        setReviews(res.data.data.reviews || []);
        setReviewsTotal(res.data.data.total || 0);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      })
      .finally(() => {
        if (!cancelled) setReviewsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, profileId, user?.role]);

  const handleAvatarChange = (url) => {
    setUser((u) => ({ ...u, avatar: url }));
    updateUser?.({ avatar: url });
  };

  const handleProfileSaved = (updated) => {
    setUser((u) => ({ ...u, ...updated }));
    updateUser?.(updated);
    setEditing(false);
  };

  function openCertMedia(src, title) {
    if (!src) return;
    setMedia({ uri: src, title, kind: classifyFile(src) });
  }

  // ── Loading ──
  if (loading) return <ProfileSkeleton c={c} />;

  // ── Error ──
  if (error || !user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
          gap: 14,
        }}
      >
        <Ionicons name="warning" size={40} color={c.red} />
        <AppText
          style={{ fontSize: 15, color: c.textDim, textAlign: "center" }}
        >
          {error || t("workerUserProfile.notFound")}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Ionicons name="arrow-back" size={15} color={c.textDim} />
          <AppText
            style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
          >
            {t("workerUserProfile.goBack")}
          </AppText>
        </Pressable>
      </View>
    );
  }

  const wp = user.workerProfile;
  const hp = user.hirerProfile;
  const tabs =
    user.role === "WORKER"
      ? ["About", "Portfolio", "Certifications", "Reviews"]
      : ["About", "Reviews"];

  const isVerified =
    (wp?.verificationStatus ?? hp?.verificationStatus) === "VERIFIED";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 14 }}
    >
      {/* Back button */}
      {!isOwn ? (
        <Pressable
          onPress={() => navigation.goBack()}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            alignSelf: "flex-start",
            marginBottom: 4,
          }}
        >
          <Ionicons name="arrow-back" size={15} color={c.textDim} />
          <AppText
            style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
          >
            {t("workerUserProfile.back")}
          </AppText>
        </Pressable>
      ) : null}

      {/* ══════════ HERO CARD ══════════ */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 18,
          padding: 22,
          overflow: "hidden",
        }}
      >
        {/* Top orange gradient bar */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 80,
            backgroundColor: c.orange,
            opacity: 0.08,
          }}
        />

        <AvatarBlock
          user={user}
          onAvatarChange={handleAvatarChange}
          c={c}
          t={t}
          isOwn={isOwn}
          onOpenViewer={() =>
            setAvatarViewer({
              uri: user.avatar,
              title: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
            })
          }
        />

        <View style={{ alignItems: "center", gap: 6 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 7,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <AppText
              weight="displayBlack"
              style={{
                fontSize: 13,
                color: c.text,
                letterSpacing: -0.5,
              }}
              numberOfLines={2}
            >
              {user.firstName} {user.lastName}
            </AppText>
            {isVerified ? (
              <Ionicons name="shield-checkmark" size={16} color={c.orange} />
            ) : null}
          </View>

          {(isOwn && (isVerified || true)) || isVerified ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <ProBadge isOwn={isOwn} t={t} c={c} />

              {isVerified ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 999,
                    backgroundColor: c.greenDim,
                    borderWidth: 1,
                    borderColor: c.green + "33",
                  }}
                >
                  <Ionicons name="shield-checkmark" size={10} color={c.green} />
                  <AppText
                    style={{ fontSize: 10, fontWeight: "700", color: c.green }}
                  >
                    {user.role === "WORKER"
                      ? t("workerUserProfile.verifiedWorker")
                      : t("workerUserProfile.verifiedHirer")}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          {!isVerified ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 20,
                backgroundColor: c.orangeDim,
                borderWidth: 1,
                borderColor: c.orange + "33",
              }}
            >
              <Ionicons
                name={user.role === "WORKER" ? "construct" : "briefcase"}
                size={11}
                color={c.orange}
              />
              <AppText
                style={{
                  fontSize: 10,
                  fontWeight: "700",
                  color: c.orange,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {user.role === "WORKER"
                  ? t("workerUserProfile.roleWorker")
                  : t("workerUserProfile.roleHirer")}
              </AppText>
            </View>
          ) : null}

          {wp?.title ? (
            <AppText
              style={{
                fontSize: 13,
                color: c.textDim,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {wp.title}
            </AppText>
          ) : null}

          {wp?.avgRating > 0 ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <Stars rating={wp.avgRating} c={c} />
              <AppText
                weight="displayBlack"
                style={{ fontSize: 14, color: c.text }}
              >
                {Number(wp.avgRating).toFixed(1)}
              </AppText>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                ({wp.totalReviews ?? 0} {t("workerUserProfile.reviews")})
              </AppText>
            </View>
          ) : null}
        </View>

        {isOwn ? (
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={{
              marginTop: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 10,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: c.border,
              backgroundColor: c.bgInput,
            }}
          >
            <Ionicons name="settings-outline" size={13} color={c.textDim} />
            <AppText
              style={{ fontSize: 13, fontWeight: "600", color: c.textDim }}
            >
              {t("workerUserProfile.settings")}
            </AppText>
          </Pressable>
        ) : null}
      </View>

      {/* ══════════ STATS CARD — horizontal scroll strip ══════════ */}
      <View style={{ marginHorizontal: -16 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row",
            paddingHorizontal: 16,
            gap: 0,
          }}
          style={{
            backgroundColor: c.bgPanel,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: c.border,
          }}
        >
          {wp ? (
            <>
              <StatPill
                icon="cash-outline"
                value={`${wp.currency ?? user.currency ?? "USD"} ${Number(wp.hourlyRate ?? 0).toLocaleString()}`}
                label={t("workerUserProfile.perHour")}
                c={c}
              />
              <StatPill
                icon="checkmark-circle-outline"
                value={String(wp.completedJobs ?? wp.totalJobs ?? 0)}
                label={t("workerUserProfile.jobsDone")}
                c={c}
              />
              <StatPill
                icon="flash-outline"
                value={`${wp.responseRate ?? 0}%`}
                label={t("workerUserProfile.responseRate")}
                c={c}
              />
              {wp.serviceRadius ? (
                <StatPill
                  icon="location-outline"
                  value={`${wp.serviceRadius} km`}
                  label={t("workerUserProfile.radius")}
                  c={c}
                />
              ) : null}
            </>
          ) : null}

          {user.role === "HIRER" && user.hirerStats ? (
            <>
              <StatPill
                icon="briefcase-outline"
                value={String(user.hirerStats.totalHires)}
                label={t("workerUserProfile.totalHires")}
                c={c}
              />
              <StatPill
                icon="cash-outline"
                value={`${user.currency ?? "USD"} ${Number(user.hirerStats.totalSpent).toLocaleString()}`}
                label={t("workerUserProfile.totalSpent")}
                c={c}
              />
              {user.hirerStats.avgRating > 0 ? (
                <StatPill
                  icon="star-outline"
                  value={Number(user.hirerStats.avgRating).toFixed(1)}
                  label={`${t("workerUserProfile.rating")} (${user.hirerStats.totalReviews})`}
                  c={c}
                />
              ) : null}
            </>
          ) : null}

          <StatPill
            icon="time-outline"
            value={timeAgo(user.lastSeen, t)}
            label={t("workerUserProfile.lastSeen")}
            c={c}
          />
          <StatPill
            icon="calendar-outline"
            value={fmtShortDate(user.createdAt)}
            label={t("workerUserProfile.joined")}
            c={c}
          />
        </ScrollView>
      </View>

      {/* ══════════ INFO CARD ══════════ */}
      <View
        style={{
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          borderRadius: 14,
          padding: 14,
          gap: 10,
        }}
      >
        {hp?.companyName ? (
          <InfoRow icon="business-outline" text={hp.companyName} c={c} />
        ) : null}
        {hp?.companySize ? (
          <InfoRow icon="people-outline" text={hp.companySize} c={c} />
        ) : null}
        {user.city || user.country ? (
          <InfoRow
            icon="location-outline"
            text={[user.city, user.country].filter(Boolean).join(", ")}
            c={c}
          />
        ) : null}
        {user.phone ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${user.phone}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Ionicons name="call-outline" size={14} color={c.orange} />
            <AppText
              style={{
                fontSize: 13,
                color: c.orange,
                flex: 1,
                fontWeight: "600",
              }}
              numberOfLines={2}
            >
              {user.phone}
            </AppText>
          </Pressable>
        ) : null}
        {user.email && isOwn ? (
          <Pressable
            onPress={() => Linking.openURL(`mailto:${user.email}`)}
            style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
          >
            <Ionicons name="mail-outline" size={14} color={c.orange} />
            <AppText
              style={{
                fontSize: 13,
                color: c.orange,
                flex: 1,
                fontWeight: "600",
              }}
              numberOfLines={2}
            >
              {user.email}
            </AppText>
          </Pressable>
        ) : null}

        {user.currency ? (
          <InfoRow icon="globe-outline" text={user.currency} c={c} />
        ) : null}
        {hp?.website ? (
          <InfoRow
            icon="globe-outline"
            text={hp.website.replace(/^https?:\/\//, "")}
            c={c}
          />
        ) : null}
      </View>

      {/* ══════════ CATEGORIES ══════════ */}
      {wp?.categories?.length > 0 ? (
        <View
          style={{
            backgroundColor: c.bgPanel,
            borderWidth: 1,
            borderColor: c.border,
            borderRadius: 14,
            padding: 16,
            gap: 12,
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "700",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: c.textMuted,
            }}
          >
            {t("workerUserProfile.specialities")}
          </AppText>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
            {wp.categories.map((cat) => (
              <View
                key={cat.id}
                style={{
                  paddingHorizontal: 11,
                  paddingVertical: 4,
                  borderRadius: 20,
                  backgroundColor: c.bgCard,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <AppText style={{ fontSize: 12, color: c.textDim }}>
                  {cat.category?.name ?? cat.name}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* ══════════ BOOK CTA (non-owner) ══════════ */}
      {!isOwn && user.role === "WORKER" ? (
        <Pressable
          onPress={() =>
            navigation.navigate("CreateBooking", { workerId: user.id })
          }
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: c.orange,
          }}
        >
          <AppText weight="displayBlack" style={{ fontSize: 15, color: c.bg }}>
            {t("workerUserProfile.bookUser", { name: user.firstName })}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={c.bg} />
        </Pressable>
      ) : null}

      {/* ══════════ TABS ══════════ */}
      <View
        style={{
          borderBottomWidth: 1,
          borderBottomColor: c.border,
          marginTop: 6,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 4 }}
        >
          {tabs.map((tabKey) => {
            const active = tab === tabKey;
            return (
              <Pressable
                key={tabKey}
                onPress={() => setTab(tabKey)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 11,
                  marginBottom: -1,
                  borderBottomWidth: 2,
                  borderBottomColor: active ? c.orange : "transparent",
                }}
              >
                <AppText
                  style={{
                    fontSize: 14,
                    fontWeight: active ? "700" : "500",
                    color: active ? c.orange : c.textMuted,
                  }}
                >
                  {t(`workerUserProfile.tabs.${tabKey.toLowerCase()}`)}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ══════════ TAB CONTENT ══════════ */}
      <View style={{ gap: 14 }}>
        {/* ABOUT */}
        {tab === "About" ? (
          <View style={{ gap: 14 }}>
            {user.bio ? (
              <View
                style={{
                  backgroundColor: c.bgPanel,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 14,
                  padding: 20,
                  gap: 12,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: c.textMuted,
                  }}
                >
                  {t("workerUserProfile.about")}
                </AppText>
                <AppText
                  style={{
                    fontSize: 14,
                    color: c.textDim,
                    lineHeight: 24,
                  }}
                >
                  {user.bio}
                </AppText>
              </View>
            ) : (
              <EmptyCard
                icon="document-text-outline"
                title={
                  isOwn
                    ? t("workerUserProfile.emptyBioOwn")
                    : t("workerUserProfile.emptyBioOther")
                }
                actionLabel={isOwn ? t("workerUserProfile.addBio") : null}
                onAction={isOwn ? () => navigation.navigate("Settings") : null}
                c={c}
              />
            )}

            {wp?.availability ? (
              <View
                style={{
                  backgroundColor: c.bgPanel,
                  borderWidth: 1,
                  borderColor: c.border,
                  borderRadius: 14,
                  padding: 20,
                  gap: 14,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: c.textMuted,
                  }}
                >
                  {t("workerUserProfile.availability")}
                </AppText>
                <View
                  style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                >
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                    (day) => {
                      const active = wp.availability?.includes(day);
                      return (
                        <View
                          key={day}
                          style={{
                            width: 44,
                            height: 36,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 8,
                            backgroundColor: active ? c.orangeDim : c.bgInput,
                            borderWidth: 1,
                            borderColor: active ? c.orange + "55" : c.border,
                          }}
                        >
                          <AppText
                            style={{
                              fontSize: 11,
                              fontWeight: "600",
                              color: active ? c.orange : c.textMuted,
                            }}
                          >
                            {day}
                          </AppText>
                        </View>
                      );
                    },
                  )}
                </View>
              </View>
            ) : null}

            {/* Badges row */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingRight: 4,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 5,
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  borderRadius: 20,
                  backgroundColor: user.isEmailVerified
                    ? c.greenDim
                    : c.bgInput,
                  borderWidth: 1,
                  borderColor: user.isEmailVerified ? c.green + "33" : c.border,
                }}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={13}
                  color={user.isEmailVerified ? c.green : c.textMuted}
                />
                <AppText
                  style={{
                    fontSize: 9,
                    fontWeight: "600",
                    color: user.isEmailVerified ? c.green : c.textMuted,
                  }}
                >
                  {user.isEmailVerified
                    ? t("workerUserProfile.emailVerified")
                    : t("workerUserProfile.emailUnverified")}
                </AppText>
              </View>

              {isVerified ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    borderRadius: 20,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: c.orange + "33",
                  }}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={13}
                    color={c.orange}
                  />
                  <AppText
                    style={{
                      fontSize: 9,
                      fontWeight: "600",
                      color: c.orange,
                    }}
                  >
                    {t("workerUserProfile.idVerified")}
                  </AppText>
                </View>
              ) : null}

              {wp?.backgroundCheck === true ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    borderRadius: 20,
                    backgroundColor: "rgba(59,130,246,0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(59,130,246,0.2)",
                  }}
                >
                  <Ionicons name="ribbon-outline" size={13} color="#60a5fa" />
                  <AppText
                    style={{
                      fontSize: 9,
                      fontWeight: "600",
                      color: "#60a5fa",
                    }}
                  >
                    {t("workerUserProfile.backgroundChecked")}
                  </AppText>
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}

        {/* PORTFOLIO */}
        {tab === "Portfolio" ? (
          <View>
            {wp?.portfolio?.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {wp.portfolio.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setLightbox({ type: "portfolio", item })}
                    style={{
                      width: "48%",
                      backgroundColor: c.bgPanel,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    {item.imageUrl ? (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: "100%", height: 140 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={{
                          width: "100%",
                          height: 140,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: c.bgInput,
                        }}
                      >
                        <Ionicons
                          name="image-outline"
                          size={24}
                          color={c.textMuted}
                        />
                      </View>
                    )}
                    <View style={{ padding: 10, gap: 3 }}>
                      <AppText
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: c.text,
                        }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </AppText>
                      {item.description ? (
                        <AppText
                          style={{ fontSize: 11, color: c.textMuted }}
                          numberOfLines={2}
                        >
                          {item.description}
                        </AppText>
                      ) : null}
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <EmptyCard
                icon="image-outline"
                title={
                  isOwn
                    ? t("workerUserProfile.emptyPortfolioOwn")
                    : t("workerUserProfile.emptyPortfolioOther")
                }
                actionLabel={isOwn ? t("workerUserProfile.addPortfolio") : null}
                onAction={
                  isOwn ? () => navigation.navigate("WorkerPortfolio") : null
                }
                c={c}
              />
            )}
          </View>
        ) : null}

        {/* CERTIFICATIONS */}
        {tab === "Certifications" ? (
          <View style={{ gap: 10 }}>
            {wp?.certifications?.length > 0 ? (
              wp.certifications.map((cert) => {
                const hasDoc = !!cert.documentUrl;
                const status = cert.verified
                  ? "verified"
                  : cert.rejectionReason
                    ? "rejected"
                    : "pending";
                return (
                  <Pressable
                    key={cert.id}
                    onPress={() => {
                      if (hasDoc) {
                        openCertMedia(
                          cert.documentUrl,
                          cert.name || "Certification",
                        );
                      } else {
                        setLightbox({ type: "cert", item: cert });
                      }
                    }}
                    style={{
                      backgroundColor: c.bgPanel,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 9,
                        backgroundColor: c.orangeDim,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons
                        name="ribbon-outline"
                        size={18}
                        color={c.orange}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText
                        weight="displayBlack"
                        style={{ fontSize: 14, color: c.text, marginBottom: 3 }}
                        numberOfLines={2}
                      >
                        {cert.name}
                      </AppText>
                      {cert.issuer ? (
                        <AppText
                          style={{ fontSize: 12, color: c.textDim }}
                          numberOfLines={1}
                        >
                          {t("workerUserProfile.issuedBy", {
                            issuer: cert.issuer,
                          })}
                        </AppText>
                      ) : null}
                      {cert.issuedAt ? (
                        <AppText
                          style={{
                            fontSize: 11,
                            color: c.textMuted,
                            marginTop: 2,
                          }}
                        >
                          {fmtShortDate(cert.issuedAt)}
                          {cert.expiryDate
                            ? ` – ${fmtShortDate(cert.expiryDate)}`
                            : ""}
                        </AppText>
                      ) : null}
                    </View>
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      <BadgeForStatus status={status} c={c} t={t} />
                      <AppText
                        style={{
                          fontSize: 11,
                          color: c.orange,
                          fontWeight: "600",
                        }}
                      >
                        {hasDoc
                          ? t("workerUserProfile.viewDoc")
                          : t("workerUserProfile.view")}
                      </AppText>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <EmptyCard
                icon="ribbon-outline"
                title={
                  isOwn
                    ? t("workerUserProfile.emptyCertOwn")
                    : t("workerUserProfile.emptyCertOther")
                }
                c={c}
              />
            )}
          </View>
        ) : null}

        {/* REVIEWS */}
        {tab === "Reviews" ? (
          <View style={{ gap: 14 }}>
            {reviewsLoading ? (
              <View style={{ gap: 10 }}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} width="100%" height={100} radius={12} />
                ))}
              </View>
            ) : reviews.length === 0 ? (
              <EmptyCard
                icon="star-outline"
                title={t("workerUserProfile.emptyReviews")}
                c={c}
              />
            ) : (
              <>
                {reviewsTotal > 0 ? (
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingHorizontal: 18,
                      paddingVertical: 14,
                      backgroundColor: c.bgPanel,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <AppText
                        weight="displayBlack"
                        style={{ fontSize: 26, color: c.orange }}
                      >
                        {reviews.length > 0
                          ? (
                              reviews.reduce((a, r) => a + r.rating, 0) /
                              reviews.length
                            ).toFixed(1)
                          : "—"}
                      </AppText>
                      <Stars
                        rating={
                          reviews.length > 0
                            ? reviews.reduce((a, r) => a + r.rating, 0) /
                              reviews.length
                            : 0
                        }
                        c={c}
                      />
                    </View>
                    <AppText
                      style={{
                        fontSize: 12,
                        color: c.textMuted,
                        fontWeight: "500",
                      }}
                    >
                      {t("workerUserProfile.reviewCount", {
                        count: reviewsTotal,
                      })}
                    </AppText>
                  </View>
                ) : null}

                <View style={{ gap: 10 }}>
                  {reviews.map((r) => (
                    <View
                      key={r.id}
                      style={{
                        backgroundColor: c.bgPanel,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 12,
                        padding: 14,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "flex-start",
                          gap: 12,
                          marginBottom: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 19,
                            backgroundColor: c.orangeDim,
                            borderWidth: 1,
                            borderColor: c.orange + "55",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}
                        >
                          {r.giver?.avatar ? (
                            <Image
                              source={{ uri: r.giver.avatar }}
                              style={{ width: "100%", height: "100%" }}
                              resizeMode="cover"
                            />
                          ) : (
                            <AppText
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: c.orange,
                              }}
                            >
                              {initials(r.giver)}
                            </AppText>
                          )}
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText
                            style={{
                              fontSize: 13,
                              fontWeight: "700",
                              color: c.text,
                              marginBottom: 2,
                            }}
                            numberOfLines={1}
                          >
                            {r.giver?.firstName} {r.giver?.lastName}
                            <AppText
                              style={{
                                fontSize: 11,
                                color: c.textMuted,
                                fontWeight: "400",
                              }}
                            >
                              {"  ·  "}
                              {r.giver?.role === "HIRER"
                                ? t("workerUserProfile.roleHirer")
                                : t("workerUserProfile.roleWorker")}
                            </AppText>
                          </AppText>
                          {r.booking?.title ? (
                            <AppText
                              style={{
                                fontSize: 11,
                                color: c.textDim,
                                marginBottom: 2,
                              }}
                              numberOfLines={1}
                            >
                              {r.booking.category?.icon} {r.booking.title}
                            </AppText>
                          ) : null}
                          <AppText style={{ fontSize: 11, color: c.textMuted }}>
                            {fmtLongDate(r.createdAt)}
                          </AppText>
                        </View>
                        <View style={{ alignItems: "flex-end", gap: 2 }}>
                          <Stars rating={r.rating} c={c} />
                          <AppText style={{ fontSize: 11, color: c.textMuted }}>
                            {r.rating}/5
                          </AppText>
                        </View>
                      </View>
                      {r.comment ? (
                        <AppText
                          style={{
                            fontSize: 13,
                            color: c.textDim,
                            fontStyle: "italic",
                            lineHeight: 22,
                            borderLeftWidth: 2,
                            borderLeftColor: c.orange + "55",
                            paddingLeft: 12,
                          }}
                        >
                          "{r.comment}"
                        </AppText>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}
      </View>

      {/* ══════════ LIGHTBOX ══════════ */}
      <Modal
        visible={!!lightbox}
        transparent
        animationType="fade"
        onRequestClose={() => setLightbox(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.85)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <Pressable
            onPress={() => setLightbox(null)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              zIndex: 2,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>

          {lightbox?.type === "portfolio" ? (
            <View
              style={{
                width: "100%",
                backgroundColor: c.bgPanel,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <Image
                source={{ uri: lightbox.item.imageUrl }}
                style={{ width: "100%", height: 320 }}
                resizeMode="contain"
              />
              <View style={{ padding: 20, gap: 6 }}>
                <AppText
                  weight="displayBlack"
                  style={{ fontSize: 17, color: c.text }}
                >
                  {lightbox.item.title}
                </AppText>
                {lightbox.item.description ? (
                  <AppText
                    style={{ fontSize: 13, color: c.textDim, lineHeight: 20 }}
                  >
                    {lightbox.item.description}
                  </AppText>
                ) : null}
              </View>
            </View>
          ) : null}

          {lightbox?.type === "cert" ? (
            <View
              style={{
                width: "100%",
                backgroundColor: c.bgPanel,
                borderRadius: 16,
                padding: 24,
                alignItems: "center",
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 18,
                  backgroundColor: c.orangeDim,
                  borderWidth: 2,
                  borderColor: c.orange + "55",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="ribbon-outline" size={40} color={c.orange} />
              </View>
              <AppText
                weight="displayBlack"
                style={{ fontSize: 18, color: c.text, textAlign: "center" }}
              >
                {lightbox.item.name}
              </AppText>
              {lightbox.item.issuer ? (
                <AppText
                  style={{
                    fontSize: 13,
                    color: c.textDim,
                    textAlign: "center",
                  }}
                >
                  {t("workerUserProfile.issuedByLong", {
                    issuer: lightbox.item.issuer,
                  })}
                </AppText>
              ) : null}
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {lightbox.item.issueDate || lightbox.item.issuedAt ? (
                  <DatePill
                    label={t("workerUserProfile.issueDate")}
                    value={fmtLongDate(
                      lightbox.item.issueDate || lightbox.item.issuedAt,
                    )}
                    c={c}
                  />
                ) : null}
                {lightbox.item.expiryDate ? (
                  <DatePill
                    label={t("workerUserProfile.expiryDate")}
                    value={fmtLongDate(lightbox.item.expiryDate)}
                    c={c}
                  />
                ) : null}
              </View>
              {lightbox.item.documentUrl ? (
                <Pressable
                  onPress={() =>
                    openCertMedia(lightbox.item.documentUrl, lightbox.item.name)
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    paddingHorizontal: 18,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: c.orange + "55",
                    marginTop: 6,
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={13}
                    color={c.orange}
                  />
                  <AppText
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: c.orange,
                    }}
                  >
                    {t("workerUserProfile.viewCertDoc")}
                  </AppText>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ══════════ FULL-SCREEN MEDIA ══════════ */}
      {media ? (
        <MediaViewer media={media} onClose={() => setMedia(null)} c={c} />
      ) : null}

      {/* ══════════ FULL-SCREEN AVATAR ══════════ */}
      {avatarViewer ? (
        <MediaViewer
          media={{
            uri: avatarViewer.uri,
            title: avatarViewer.title,
            kind: "image",
          }}
          onClose={() => setAvatarViewer(null)}
          c={c}
        />
      ) : null}
    </ScrollView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function StatRow({ icon, value, label, c }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: c.border,
      }}
    >
      <Ionicons name={icon} size={15} color={c.orange} />
      <View
        style={{
          flexDirection: "row",
          alignItems: "baseline",
          flex: 1,
          gap: 4,
        }}
      >
        <AppText weight="displayBlack" style={{ fontSize: 14, color: c.text }}>
          {value}
        </AppText>
        <AppText style={{ fontSize: 11, color: c.textMuted }}>{label}</AppText>
      </View>
    </View>
  );
}

function StatPill({ icon, value, label, c }) {
  return (
    <View
      style={{
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        minWidth: 88,
        gap: 4,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: c.border,
      }}
    >
      <Ionicons name={icon} size={16} color={c.orange} />
      <AppText
        weight="displayBlack"
        style={{ fontSize: 10, color: c.text, textAlign: "center" }}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </AppText>
      <AppText
        style={{
          fontSize: 10,
          color: c.textMuted,
          textAlign: "center",
        }}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </View>
  );
}

function InfoRow({ icon, text, c }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Ionicons name={icon} size={14} color={c.textMuted} />
      <AppText
        style={{ fontSize: 13, color: c.textDim, flex: 1 }}
        numberOfLines={2}
      >
        {text}
      </AppText>
    </View>
  );
}

function BadgeForStatus({ status, c, t }) {
  const map = {
    verified: {
      label: t("workerUserProfile.badgeVerified"),
      color: c.green,
      bg: c.greenDim,
      icon: "checkmark-circle-outline",
    },
    pending: {
      label: t("workerUserProfile.badgePending"),
      color: "#eab308",
      bg: "rgba(234,179,8,0.12)",
      icon: "time-outline",
    },
    rejected: {
      label: t("workerUserProfile.badgeRejected"),
      color: c.red,
      bg: c.redDim,
      icon: "alert-circle-outline",
    },
  };
  const meta = map[status] || map.pending;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 20,
        backgroundColor: meta.bg,
      }}
    >
      <Ionicons name={meta.icon} size={11} color={meta.color} />
      <AppText style={{ fontSize: 10, fontWeight: "700", color: meta.color }}>
        {meta.label}
      </AppText>
    </View>
  );
}

function DatePill({ label, value, c }) {
  return (
    <View
      style={{
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: c.bgCard,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: "center",
        minWidth: 110,
      }}
    >
      <AppText
        style={{
          fontSize: 9,
          color: c.textMuted,
          textTransform: "uppercase",
          letterSpacing: 0.7,
          marginBottom: 3,
        }}
      >
        {label}
      </AppText>
      <AppText style={{ fontSize: 12, fontWeight: "700", color: c.text }}>
        {value}
      </AppText>
    </View>
  );
}

function EmptyCard({ icon, title, actionLabel, onAction, c }) {
  return (
    <View
      style={{
        backgroundColor: c.bgPanel,
        borderWidth: 1.5,
        borderStyle: "dashed",
        borderColor: c.border,
        borderRadius: 14,
        paddingVertical: 40,
        paddingHorizontal: 24,
        alignItems: "center",
        gap: 12,
      }}
    >
      <Ionicons name={icon} size={28} color={c.textMuted} />
      <AppText
        style={{ fontSize: 14, color: c.textMuted, textAlign: "center" }}
      >
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            backgroundColor: c.orangeDim,
            borderWidth: 1,
            borderColor: c.orange + "55",
          }}
        >
          <Ionicons name="add" size={13} color={c.orange} />
          <AppText style={{ fontSize: 13, fontWeight: "600", color: c.orange }}>
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
