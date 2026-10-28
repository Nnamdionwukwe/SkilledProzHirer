// src/components/video/VoiceCallFullScreen.js
//
// Full-screen voice-call UI.
//   PENDING + caller   → "Calling…", cancel
//   PENDING + receiver → accept / decline
//   ACTIVE             → duration, mute, end
//
// Ported from web src/components/video/VoiceCallFullScreen.jsx.

import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../AppText";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaPhone,
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaCompress,
  FaSpinner,
} from "../../icons/fa";

function formatDuration(startedAt) {
  if (!startedAt) return "00:00";
  const elapsed = Math.floor(
    (Date.now() - new Date(startedAt).getTime()) / 1000,
  );
  const m = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const s = String(elapsed % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function VoiceCallFullScreen({ rtc }) {
  const { user } = useAuthStore();
  const { call, updateCall, endCall, minimize } = useVoiceCall();
  const { theme } = useTheme();
  const c = theme.colors;

  const [duration, setDuration] = useState("00:00");
  const [busy, setBusy] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const fetchedForRef = useRef(null);

  const isActive = call?.status === "ACTIVE";
  const isPending = call?.status === "PENDING";
  const isInitiator = call?.initiatorId === user?.id;
  const isReceiver = call?.receiverId === user?.id;

  useEffect(() => {
    const convoId = call?.conversationId;
    if (!convoId) return;
    if (fetchedForRef.current === convoId) return;
    fetchedForRef.current = convoId;

    let cancelled = false;
    (async () => {
      try {
        const res = await client.get("/messages/conversations", {
          params: { page: 1, limit: 100, _t: Date.now() },
        });
        const list = res.data.data?.conversations || [];
        const convo = list.find((x) => x.id === convoId);
        const other = convo?.users?.find((u) => u.userId !== user?.id);
        if (!cancelled) setOtherUser(other?.user || null);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [call?.conversationId, user?.id]);

  useEffect(() => {
    if (!isActive) {
      setDuration("00:00");
      return;
    }
    setDuration(formatDuration(call.startedAt));
    const id = setInterval(
      () => setDuration(formatDuration(call.startedAt)),
      1000,
    );
    return () => clearInterval(id);
  }, [isActive, call?.startedAt]);

  async function handleAccept() {
    if (!call) return;
    setBusy(true);
    try {
      const res = await client.patch(
        `/voice-calls/${call.conversationId}/accept`,
      );
      updateCall(res.data.data.call);
    } catch {
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    if (!call) return;
    setBusy(true);
    try {
      await client.patch(`/voice-calls/${call.conversationId}/decline`);
    } catch {
    } finally {
      setBusy(false);
      endCall();
    }
  }

  async function handleEnd() {
    if (!call) return;
    try {
      await client.patch(`/voice-calls/${call.conversationId}/end`);
    } catch {}
    endCall();
  }

  if (!call) return null;

  const otherName =
    `${otherUser?.firstName || ""} ${otherUser?.lastName || ""}`.trim() ||
    "the other party";
  const initials =
    `${otherUser?.firstName?.[0] || ""}${otherUser?.lastName?.[0] || ""}`.toUpperCase();

  return (
    <SafeAreaView style={[styles.overlay, { backgroundColor: "#0a0a0a" }]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <AppText style={styles.brand}>SkilledProz Voice Call</AppText>
        {isActive ? (
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <AppText style={styles.liveText}>LIVE</AppText>
          </View>
        ) : null}
        <Pressable onPress={minimize} style={styles.minimizeBtn} hitSlop={8}>
          <FaCompress size={14} color="#fff" />
        </Pressable>
      </View>

      {/* Center */}
      <View style={styles.center}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            {otherUser?.avatar ? (
              <Image
                source={{ uri: otherUser.avatar }}
                style={styles.avatarImg}
              />
            ) : (
              <AppText style={styles.avatarText}>{initials || "?"}</AppText>
            )}
          </View>
        </View>
        <AppText style={styles.name}>{otherName}</AppText>
        <AppText style={styles.status}>
          {isActive
            ? duration
            : isPending && isInitiator
              ? "Calling…"
              : isPending && isReceiver
                ? "Incoming voice call"
                : ""}
        </AppText>
        {rtc?.error ? (
          <AppText style={styles.error}>{rtc.error}</AppText>
        ) : null}
        {isActive ? (
          <AppText style={styles.hint}>
            You can minimize this call and keep browsing — the audio stays on.
          </AppText>
        ) : null}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {isActive ? (
          <>
            <Pressable
              onPress={rtc?.toggleMute}
              style={[
                styles.circleBtn,
                rtc?.isMuted ? styles.circleBtnOn : null,
              ]}
              hitSlop={8}
            >
              {rtc?.isMuted ? (
                <FaMicrophoneSlash size={20} color="#0a0a0a" />
              ) : (
                <FaMicrophone size={20} color="#fff" />
              )}
            </Pressable>
            <Pressable onPress={handleEnd} style={styles.endBtn} hitSlop={8}>
              <FaPhoneSlash size={22} color="#fff" />
            </Pressable>
          </>
        ) : null}

        {isPending && isReceiver ? (
          <>
            <Pressable
              onPress={handleDecline}
              disabled={busy}
              style={styles.declineBtn}
              hitSlop={8}
            >
              {busy ? (
                <FaSpinner size={22} color="#fff" />
              ) : (
                <FaPhoneSlash size={22} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={handleAccept}
              disabled={busy}
              style={styles.acceptBtn}
              hitSlop={8}
            >
              {busy ? (
                <FaSpinner size={22} color="#fff" />
              ) : (
                <FaPhone size={22} color="#fff" />
              )}
            </Pressable>
          </>
        ) : null}

        {isPending && isInitiator ? (
          <Pressable onPress={handleEnd} style={styles.endBtn} hitSlop={8}>
            <FaPhoneSlash size={22} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    flexDirection: "column",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  brand: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
  },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  liveText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#4ade80",
  },
  minimizeBtn: {
    marginLeft: "auto",
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  avatarWrap: { width: 160, height: 160 },
  avatar: {
    width: 160,
    height: 160,
    borderRadius: 80,
    overflow: "hidden",
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 52, fontWeight: "800", color: "#fff" },
  name: { fontSize: 26, fontWeight: "700", color: "#fff" },
  status: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    fontVariant: ["tabular-nums"],
  },
  error: { fontSize: 13, color: "#f87171", maxWidth: 320, textAlign: "center" },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 18,
    marginTop: 8,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
  },
  circleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  circleBtnOn: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  endBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  declineBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
});
