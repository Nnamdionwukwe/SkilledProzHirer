// src/components/VideoPlayerModal.js
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

import AppText from "./AppText";
import { useTheme } from "../contexts/ThemeContext";
import { FaTimes, FaPlay } from "../icons/fa";

export default function VideoPlayerModal({
  visible,
  videoUrl,
  title,
  onClose,
}) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { width, height } = useWindowDimensions();

  // Initialize paused
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = false;
    p.pause();
  });
  const [playing, setPlaying] = useState(false);

  // Reset to paused every time the modal is opened
  useEffect(() => {
    if (visible) {
      try {
        player.currentTime = 0;
        player.pause();
      } catch {}
      setPlaying(false);
    } else {
      try {
        player.pause();
      } catch {}
      setPlaying(false);
    }
  }, [visible, player]);

  const togglePlay = () => {
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  if (!videoUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
          <FaTimes size={22} color="#fff" />
        </Pressable>

        {/* Full screen video tap area */}
        <Pressable style={StyleSheet.absoluteFill} onPress={togglePlay}>
          <VideoView
            player={player}
            style={{ width, height }}
            nativeControls={false}
            contentFit="contain" // fits the whole video without cropping
          />

          {/* Big play button overlay when paused */}
          {!playing ? (
            <View style={styles.playOverlay}>
              <View style={[styles.playCircle, { backgroundColor: c.orange }]}>
                <FaPlay size={32} color={c.bg} style={{ marginLeft: 4 }} />
              </View>
            </View>
          ) : null}
        </Pressable>

        {/* Title at bottom */}
        {title ? (
          <View style={styles.titleBar} pointerEvents="none">
            <AppText style={styles.titleText}>{title}</AppText>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#000", // Solid black background
    justifyContent: "center",
  },
  closeBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  playCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBar: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  titleText: {
    fontFamily: "Syne_700Bold",
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
