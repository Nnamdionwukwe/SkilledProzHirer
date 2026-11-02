// src/components/posts/ReactionsModal.js
//
// Ported from PostCard.jsx (function ReactionsModal).
// Adds:
//   • resolveUrl() — prefixes relative /uploads/... avatar paths
//   • Real <Image> avatars when present, letter fallback otherwise
//   • Over-fullscreen modal on Android (no nav-bar clipping)
//   • Avatar tap → navigate to public profile

import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Pressable,
  ScrollView,
  Image,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

// ─── URL resolver (matches PostCard) ────────────────────
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
  { type: "LIKE", icon: "thumbs-up-outline", colorKey: "text" },
  { type: "LOVE", icon: "heart-outline", colorKey: "red" },
  { type: "INSIGHTFUL", icon: "flash-outline", colorKey: "orange" },
  { type: "CELEBRATE", icon: "star-outline", colorKey: "#fbbf24" },
  { type: "SUPPORT", icon: "people-outline", colorKey: "green" },
];

export default function ReactionsModal({ postId, onClose, user }) {
  const { t } = useTranslation();
  const { theme, fontScale } = useTheme();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const isWide = width >= 480;

  const [reactions, setReactions] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const rem = (n) => n * 16 * fontScale;
  const c = theme.colors;

  useEffect(() => {
    let cancelled = false;
    client
      .get(`/posts/${postId}/reactions`)
      .then((res) => {
        if (cancelled) return;
        setReactions(res.data?.data?.reactions || []);
        setSummary(res.data?.data?.summary || {});
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [postId]);

  const filtered =
    filter === "ALL" ? reactions : reactions.filter((r) => r.type === filter);
  const total = reactions.length;

  const colorFor = (key) => {
    if (key === "red") return c.red;
    if (key === "orange") return c.orange;
    if (key === "green") return c.green;
    if (key === "text") return c.text;
    return key;
  };

  const goToProfile = (target) => {
    if (!target) return;
    onClose?.();
    if (target.role === "WORKER") {
      navigation.navigate("WorkerProfile", { userId: target.id });
    } else {
      navigation.navigate("HirerPublicProfile", { userId: target.id });
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.bgPanel,
              borderColor: c.border,
              maxHeight: "80%",
            },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: c.border }]}>
            <AppText
              style={{
                fontFamily: theme.fonts?.display || "Syne_700Bold",
                fontSize: rem(1),
                fontWeight: "700",
                color: c.text,
              }}
            >
              {t("posts.reactionsTitle")}
            </AppText>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={({ pressed }) => ({
                padding: 4,
                borderRadius: 6,
                backgroundColor: pressed ? c.bgCard : "transparent",
              })}
            >
              <Ionicons name="close" size={18} color={c.textDim} />
            </Pressable>
          </View>

          {/* Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ borderBottomColor: c.border, borderBottomWidth: 1 }}
            contentContainerStyle={{ flexDirection: "row" }}
          >
            <Pressable
              onPress={() => setFilter("ALL")}
              style={[
                styles.tab,
                filter === "ALL" && {
                  borderBottomColor: c.orange,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <AppText
                style={{
                  fontSize: rem(0.85),
                  fontWeight: "600",
                  color: filter === "ALL" ? c.orange : c.textDim,
                }}
              >
                {t("posts.reactionsAll")} {total}
              </AppText>
            </Pressable>
            {REACTIONS.filter((r) => summary[r.type]).map((r) => {
              const color = colorFor(r.colorKey);
              return (
                <Pressable
                  key={r.type}
                  onPress={() => setFilter(r.type)}
                  style={[
                    styles.tab,
                    filter === r.type && {
                      borderBottomColor: c.orange,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <Ionicons name={r.icon} size={12} color={color} />
                  <AppText
                    style={{
                      fontSize: rem(0.85),
                      fontWeight: "600",
                      color: filter === r.type ? c.orange : c.textDim,
                      marginLeft: 4,
                    }}
                  >
                    {summary[r.type]}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* List */}
          <ScrollView
            contentContainerStyle={{ padding: 6 }}
            style={{ flexGrow: 0 }}
          >
            {loading ? (
              <View style={{ padding: 32, alignItems: "center" }}>
                <ActivityIndicator color={c.orange} />
              </View>
            ) : (
              filtered.map((r) => {
                const reaction = REACTIONS.find((rx) => rx.type === r.type);
                const avatarUri = resolveUrl(r.user?.avatar);
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => goToProfile(r.user)}
                    style={({ pressed }) => [
                      styles.item,
                      {
                        backgroundColor: pressed ? c.bgCard : "transparent",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: c.orangeDim,
                          overflow: "hidden",
                        },
                      ]}
                    >
                      {avatarUri ? (
                        <Image
                          source={{ uri: avatarUri }}
                          style={{ width: "100%", height: "100%" }}
                          resizeMode="cover"
                        />
                      ) : (
                        <AppText
                          style={{
                            fontFamily:
                              theme.fonts?.bodyBold || "DMSans_700Bold",
                            fontSize: rem(0.9),
                            fontWeight: "700",
                            color: c.orange,
                          }}
                        >
                          {r.user?.firstName?.[0] || "?"}
                        </AppText>
                      )}
                      {reaction ? (
                        <View
                          style={[
                            styles.reactionBadge,
                            { backgroundColor: c.bgPanel },
                          ]}
                        >
                          <Ionicons
                            name={reaction.icon}
                            size={9}
                            color={colorFor(reaction.colorKey)}
                          />
                        </View>
                      ) : null}
                    </View>
                    <AppText
                      style={{
                        fontFamily:
                          theme.fonts?.bodySemiBold || "DMSans_600SemiBold",
                        fontSize: rem(0.85),
                        fontWeight: "600",
                        color: c.text,
                        marginLeft: 8,
                      }}
                    >
                      {r.user?.firstName} {r.user?.lastName}
                    </AppText>
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flexShrink: 0,
  },
  reactionBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 15,
    height: 15,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
});
