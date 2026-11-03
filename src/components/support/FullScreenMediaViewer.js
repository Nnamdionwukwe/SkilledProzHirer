// src/components/support/FullScreenMediaViewer.js
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Image,
  Pressable,
  StyleSheet,
  Platform,
  Linking,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../AppText";

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO (expo-video — SDK 54, Expo Go compatible)
// ─────────────────────────────────────────────────────────────────────────────
function VideoMedia({ uri }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.play();
  });
  return (
    <View style={StyleSheet.absoluteFill}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        contentFit="contain"
        nativeControls
        allowsFullscreen
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF SKELETON — shimmering "page" with fake text lines. No spinner.
// ─────────────────────────────────────────────────────────────────────────────
function PdfSkeleton() {
  const shimmer = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.6,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.25,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  // A row of fake text lines with varying widths
  const Line = ({ width }) => (
    <Animated.View
      style={{
        height: 10,
        borderRadius: 5,
        backgroundColor: "rgba(255,255,255,0.18)",
        marginBottom: 10,
        width,
        opacity: shimmer,
      }}
    />
  );

  return (
    <View style={styles.skeletonWrap}>
      {/* "Page" container */}
      <View style={styles.skeletonPage}>
        {/* Title bar */}
        <Animated.View
          style={{
            height: 22,
            borderRadius: 6,
            backgroundColor: "rgba(255,255,255,0.22)",
            marginBottom: 22,
            width: "60%",
            opacity: shimmer,
          }}
        />

        {/* Paragraph 1 */}
        <Line width="100%" />
        <Line width="94%" />
        <Line width="88%" />
        <Line width="96%" />
        <Line width="72%" />

        <View style={{ height: 18 }} />

        {/* Paragraph 2 */}
        <Line width="98%" />
        <Line width="90%" />
        <Line width="84%" />
        <Line width="92%" />
        <Line width="60%" />
      </View>

      <AppText
        style={{
          color: "rgba(255,255,255,0.5)",
          marginTop: 20,
          fontSize: 13,
        }}
      >
        Loading PDF…
      </AppText>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF (WebView + Google Docs viewer → in-app on iOS AND Android)
// ─────────────────────────────────────────────────────────────────────────────
function PdfMedia({ uri, onExternalOpen }) {
  const [phase, setPhase] = useState("loading"); // loading | ready | failed
  const timeoutRef = useRef(null);

  // Google Docs viewer proxies the PDF server-side and returns a
  // mobile-friendly viewer. Works in the Android system WebView.
  const viewerUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
    uri,
  )}`;

  useEffect(() => {
    // If WebView doesn't fire onLoadEnd within 8s, it silently failed
    // (usually auth-protected URL or network). Show the fallback.
    timeoutRef.current = setTimeout(() => {
      setPhase((p) => (p === "loading" ? "failed" : p));
    }, 8000);
    return () => clearTimeout(timeoutRef.current);
  }, [uri]);

  const handleLoadEnd = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setPhase("ready");
  }, []);

  const handleError = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setPhase("failed");
  }, []);

  if (phase === "failed") {
    return (
      <View style={styles.centered}>
        <Ionicons name="document-text" size={64} color="#fff" />
        <AppText style={{ color: "#fff", marginTop: 12, fontSize: 14 }}>
          Could not preview this PDF
        </AppText>
        <AppText
          style={{
            color: "rgba(255,255,255,0.6)",
            marginTop: 4,
            fontSize: 12,
            textAlign: "center",
            paddingHorizontal: 32,
          }}
        >
          The file may require a sign-in or the network is unavailable.
        </AppText>
        <Pressable
          onPress={onExternalOpen}
          style={{
            marginTop: 16,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: "#f97316",
          }}
        >
          <AppText weight="semibold" style={{ color: "#fff" }}>
            Open PDF externally
          </AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        source={{ uri: viewerUrl }}
        style={{ flex: 1, backgroundColor: "#000" }}
        startInLoadingState={false}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        onHttpError={handleError}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit
        setBuiltInZoomControls
        mixedContentMode="always"
        originWhitelist={["*"]}
      />

      {/* Skeleton overlay — replaces the previous ActivityIndicator spinner */}
      {phase === "loading" && (
        <View style={styles.skeletonOverlay} pointerEvents="none">
          <PdfSkeleton />
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
export default function FullScreenMediaViewer({ media, onClose }) {
  const insets = useSafeAreaInsets();

  if (!media) return null;

  const isPdf = media.renderType === "pdf";
  const isVideo = media.renderType === "video";
  const isImage = media.renderType === "image";

  const openExternally = () =>
    media?.url && Linking.openURL(media.url).catch(() => {});

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <AppText
            weight="semibold"
            numberOfLines={1}
            style={{ color: "#fff", flex: 1, marginRight: 12 }}
          >
            {media.name || media.url?.split("/").pop() || "Attachment"}
          </AppText>
          <Pressable
            onPress={openExternally}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable onPress={onClose} style={styles.iconBtn} hitSlop={8}>
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Body */}
        <View style={styles.body}>
          {isImage && (
            <Image
              source={{ uri: media.url }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
            />
          )}
          {isVideo && <VideoMedia uri={media.url} />}
          {isPdf && (
            <PdfMedia uri={media.url} onExternalOpen={openExternally} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  body: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000",
  },

  // ── PDF skeleton ──────────────────────────────────────────────────────────
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  skeletonWrap: {
    width: "82%",
    maxWidth: 480,
    alignItems: "center",
  },
  skeletonPage: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 24,
    aspectRatio: 0.75, // ~A4-ish page shape
    justifyContent: "flex-start",
  },
});
