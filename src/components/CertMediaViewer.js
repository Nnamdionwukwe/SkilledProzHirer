// src/components/CertMediaViewer.js
//
// Full-screen zoomable viewer for images, PDFs, videos (web: CertMediaViewer).
// Uses react-native-webview for PDFs (in-app), Image for pictures,
// expo-video for video previews.

import React, { useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { WebView } from "react-native-webview";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import {
  FaTimes,
  FaZoomIn,
  FaZoomOut,
  FaRotateCw,
  FaRefreshCw,
  FaFileText,
  FaExternalLink,
  FaImage as FaImageIcon,
} from "../icons/fa";

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

export default function CertMediaViewer({ src, title, kind, onClose }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width, height } = useWindowDimensions();
  const fileKind = kind || classifyFile(src);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const reset = () => {
    setZoom(1);
    setRotation(0);
  };

  const zoomIn = () => setZoom((z) => Math.min(4, z + 0.25));
  const zoomOut = () => setZoom((z) => Math.max(0.25, z - 0.25));
  const rotate = () => setRotation((r) => (r + 90) % 360);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.title}>
            <FaFileText size={14} color={c.orange} />
            <AppText
              style={{
                color: "#fff",
                fontSize: 13,
                fontWeight: "600",
                marginLeft: 8,
              }}
              numberOfLines={1}
            >
              {title || "Document"}
            </AppText>
          </View>

          <View style={styles.controls}>
            {fileKind === "image" ? (
              <>
                <Pressable onPress={zoomOut} style={styles.ctrlBtn}>
                  <FaZoomOut size={14} color="#fff" />
                </Pressable>
                <AppText style={styles.zoomLabel}>
                  {Math.round(zoom * 100)}%
                </AppText>
                <Pressable onPress={zoomIn} style={styles.ctrlBtn}>
                  <FaZoomIn size={14} color="#fff" />
                </Pressable>
                <Pressable onPress={rotate} style={styles.ctrlBtn}>
                  <FaRotateCw size={14} color="#fff" />
                </Pressable>
                <Pressable onPress={reset} style={styles.ctrlBtn}>
                  <FaRefreshCw size={14} color="#fff" />
                </Pressable>
              </>
            ) : null}
            <Pressable
              onPress={onClose}
              style={[styles.ctrlBtn, styles.closeBtn]}
            >
              <FaTimes size={16} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Stage */}
        <View style={styles.stage}>
          {fileKind === "image" ? (
            <Image
              source={{ uri: src }}
              style={{
                width,
                height: height - 80,
                transform: [{ scale: zoom }, { rotate: `${rotation}deg` }],
              }}
              resizeMode="contain"
            />
          ) : fileKind === "pdf" ? (
            <View
              style={{
                width: width - 24,
                height: height - 100,
                backgroundColor: "#fff",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <WebView source={{ uri: src }} startInLoadingState />
            </View>
          ) : fileKind === "video" ? (
            <Pressable
              style={{
                width: width - 24,
                height: height - 100,
                backgroundColor: "#000",
                borderRadius: 8,
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                // Open video in-app — reuse your existing VideoPlayerModal
                // by passing the URL through the parent. For simplicity,
                // show placeholder here.
              }}
            >
              <AppText style={{ color: "#fff", fontSize: 14 }}>
                Tap to open video preview
              </AppText>
            </Pressable>
          ) : (
            <View style={styles.otherFile}>
              <FaFileText size={48} color="#666" />
              <AppText style={{ color: "#fff", marginTop: 14 }}>
                Preview not available for this file type.
              </AppText>
              <AppText style={{ color: c.orange, marginTop: 8, fontSize: 12 }}>
                {src}
              </AppText>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.96)",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.12)",
    paddingTop: 48,
  },
  title: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ctrlBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    backgroundColor: "rgba(239,68,68,0.25)",
    borderColor: "rgba(239,68,68,0.5)",
  },
  zoomLabel: {
    fontSize: 11,
    color: "#fff",
    opacity: 0.7,
    minWidth: 42,
    textAlign: "center",
  },
  stage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  otherFile: {
    alignItems: "center",
    padding: 30,
  },
});
