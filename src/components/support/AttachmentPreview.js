// src/components/support/AttachmentPreview.js
import React, { useState } from "react";
import { View, Image, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import FullScreenMediaViewer from "./FullScreenMediaViewer";

export default function AttachmentPreview({ attachments, isMe, onReply }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [activeMedia, setActiveMedia] = useState(null);

  if (!attachments || attachments.length === 0) return null;

  const openMedia = (att, renderType) => {
    if (!att?.url) return;
    setActiveMedia({
      ...att,
      renderType,
      // Fallback name for the viewer header
      name:
        att.name ||
        att.url.split("/").pop()?.split("?")[0] ||
        renderType.toUpperCase(),
    });
  };

  return (
    <>
      <View style={styles.grid}>
        {attachments.map((att, i) => {
          if (att.type === "IMAGE") {
            return (
              <Pressable
                key={i}
                onPress={() => openMedia(att, "image")}
                onLongPress={onReply}
                style={[styles.thumb, { borderColor: c.border }]}
              >
                <Image
                  source={{ uri: att.url }}
                  style={styles.img}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }

          if (att.type === "VIDEO") {
            return (
              <Pressable
                key={i}
                onPress={() => openMedia(att, "video")}
                onLongPress={onReply}
                style={[styles.thumb, { borderColor: c.border }]}
              >
                {att.thumbnailUrl ? (
                  <Image
                    source={{ uri: att.thumbnailUrl }}
                    style={styles.img}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.iconPlaceholder,
                      { backgroundColor: c.bgCard },
                    ]}
                  >
                    <Ionicons name="videocam" size={24} color={c.textMuted} />
                  </View>
                )}
                <View style={styles.playBadge}>
                  <Ionicons name="play" size={14} color="#fff" />
                </View>
              </Pressable>
            );
          }

          // PDF / Document
          return (
            <Pressable
              key={i}
              onPress={() => openMedia(att, "pdf")}
              onLongPress={onReply}
              style={[
                styles.docCard,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <View style={[styles.docIcon, { backgroundColor: "#ef444420" }]}>
                <Ionicons name="document-text" size={24} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText
                  variant="body"
                  weight="semibold"
                  numberOfLines={1}
                  style={{ color: c.text }}
                >
                  {att.name || "Document.pdf"}
                </AppText>
                <AppText variant="small" style={{ color: c.textMuted }}>
                  {att.size
                    ? `${(att.size / 1024 / 1024).toFixed(2)} MB`
                    : "PDF"}
                </AppText>
              </View>
              <Ionicons
                name="download-outline"
                size={20}
                color={c.textMuted}
                style={{ marginLeft: 8 }}
              />
            </Pressable>
          );
        })}
      </View>

      <FullScreenMediaViewer
        media={activeMedia}
        onClose={() => setActiveMedia(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  thumb: {
    width: 120,
    height: 120,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    position: "relative",
  },
  img: { width: "100%", height: "100%" },
  iconPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  playBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  docCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 240,
    marginTop: 4,
  },
  docIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
