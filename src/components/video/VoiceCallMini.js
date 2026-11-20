// src/components/video/VoiceCallMini.js
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import AppText from "../AppText";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaPhoneSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaExpand,
  FaGripVertical,
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

const DEBUG = true;
function dlog(...args) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCM ${ts}]`, ...args);
}

export default function VoiceCallMini({ rtc }) {
  const { user } = useAuthStore();
  const { call, updateCall, endCall, expand } = useVoiceCall();
  const { width: winW, height: winH } = useWindowDimensions();

  const [duration, setDuration] = useState("00:00");
  const [busy, setBusy] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const fetchedForRef = useRef(null);

  const isActive = call?.status === "ACTIVE";
  const isPending = call?.status === "PENDING";
  const isReceiver = call?.receiverId === user?.id;

  dlog("render", {
    callId: call?.id ?? null,
    status: call?.status,
    isReceiver,
    hasRtc: !!rtc,
    busy,
  });

  // ── Drag position ──
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // ✅ FIX: don't claim on touch-start (lets Pressables receive taps)
        onStartShouldSetPanResponder: () => false,
        // ✅ FIX: only claim once the finger has moved a bit (a real drag)
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderGrant: () => {
          dragStartRef.current = { ...offsetRef.current };
        },
        onPanResponderMove: (_, g) => {
          let nx = dragStartRef.current.x + g.dx;
          let ny = dragStartRef.current.y + g.dy;
          const w = 130;
          const h = 60;
          const margin = 8;
          if (nx < -(winW - w - margin)) nx = -(winW - w - margin);
          if (nx > 0) nx = 0;
          if (ny < -(winH - h - margin)) ny = -(winH - h - margin);
          if (ny > 0) ny = 0;
          pan.setValue({ x: nx, y: ny });
        },
        onPanResponderRelease: () => {
          offsetRef.current = { x: pan.x._value, y: pan.y._value };
        },
        onPanResponderTerminate: () => {
          offsetRef.current = { x: pan.x._value, y: pan.y._value };
        },
      }),
    [pan, winW, winH],
  );

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
    dlog("ACCEPT tapped", { conversationId: call.conversationId });
    setBusy(true);
    try {
      const res = await client.patch(
        `/voice-calls/${call.conversationId}/accept`,
      );
      const updated = res.data?.data?.call;
      dlog("accept OK", { status: updated?.status });
      if (updated) updateCall(updated);
      // Open full-screen voice UI — user tapped Accept, expect to see the call
      try {
        expand?.();
      } catch {}
    } catch (err) {
      dlog("accept FAILED", {
        status: err?.response?.status,
        msg: err?.message,
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    if (!call) return;
    dlog("END tapped", {
      conversationId: call.conversationId,
      status: call.status,
    });
    setBusy(true);
    try {
      await client.patch(`/voice-calls/${call.conversationId}/end`);
      dlog("end OK");
    } catch (err) {
      // ✅ FIX: still clear local state even if the API call fails —
      // otherwise the widget gets stuck if the server already ended it.
      dlog("end FAILED (clearing local state anyway)", {
        status: err?.response?.status,
        msg: err?.message,
      });
    } finally {
      try {
        endCall?.();
      } catch {}
      setBusy(false);
    }
  }

  function handleMute() {
    dlog("MUTE tapped", { hasRtc: !!rtc, isMuted: rtc?.isMuted });
    try {
      rtc?.toggleMute?.();
    } catch (err) {
      dlog("toggleMute failed", err?.message);
    }
  }

  function handleExpand() {
    dlog("EXPAND tapped");
    try {
      expand?.();
    } catch (err) {
      dlog("expand failed", err?.message);
    }
  }

  if (!call) return null;

  const otherName =
    `${otherUser?.firstName || ""} ${otherUser?.lastName || ""}`.trim() ||
    "the other party";
  const initials =
    `${otherUser?.firstName?.[0] || ""}${otherUser?.lastName?.[0] || ""}`.toUpperCase();

  const showHeader = !isActive;

  return (
    <Animated.View
      style={[
        styles.widget,
        isActive ? styles.widgetCompact : null,
        { transform: pan.getTranslateTransform() },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.grip}>
        <FaGripVertical size={12} color="rgba(255,255,255,0.35)" />
      </View>

      {showHeader ? (
        <View style={styles.header}>
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
          <View style={styles.meta}>
            <AppText style={styles.name} numberOfLines={1}>
              {otherName}
            </AppText>
            <AppText style={styles.status}>
              {isPending && isReceiver ? "Incoming…" : "Calling…"}
            </AppText>
          </View>
        </View>
      ) : (
        <View style={styles.compactMeta}>
          <View style={styles.compactDot} />
          <AppText style={styles.compactTime}>{duration}</AppText>
        </View>
      )}

      <View style={styles.actions}>
        {isActive ? (
          <>
            <Pressable
              onPress={handleMute}
              style={[styles.iconBtn, rtc?.isMuted ? styles.iconBtnOn : null]}
              hitSlop={8}
            >
              {rtc?.isMuted ? (
                <FaMicrophoneSlash
                  size={12}
                  color={rtc?.isMuted ? "#0a0a0a" : "#fff"}
                />
              ) : (
                <FaMicrophone size={12} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={handleEnd}
              disabled={busy}
              style={styles.endBtn}
              hitSlop={8}
            >
              {busy ? (
                <FaSpinner size={12} color="#fff" />
              ) : (
                <FaPhoneSlash size={12} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={handleExpand}
              style={styles.iconBtn}
              hitSlop={8}
            >
              <FaExpand size={12} color="#fff" />
            </Pressable>
          </>
        ) : isReceiver ? (
          <>
            <Pressable
              onPress={handleEnd}
              disabled={busy}
              style={styles.endBtn}
              hitSlop={8}
            >
              {busy ? (
                <FaSpinner size={12} color="#fff" />
              ) : (
                <FaPhoneSlash size={12} color="#fff" />
              )}
            </Pressable>
            <Pressable
              onPress={handleAccept}
              disabled={busy}
              style={styles.acceptBtn}
              hitSlop={8}
            >
              {busy ? (
                <FaSpinner size={12} color="#fff" />
              ) : (
                <AppText style={styles.acceptText}>Accept</AppText>
              )}
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={handleEnd}
            disabled={busy}
            style={styles.endBtn}
            hitSlop={8}
          >
            {busy ? (
              <FaSpinner size={12} color="#fff" />
            ) : (
              <FaPhoneSlash size={12} color="#fff" />
            )}
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  widget: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 9999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingLeft: 4,
    paddingRight: 10,
    backgroundColor: "#1a1a1a",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.35)",
  },
  widgetCompact: {
    paddingVertical: 6,
    paddingRight: 8,
    borderRadius: 999,
    backgroundColor: "rgba(15,15,15,0.92)",
    gap: 6,
  },
  grip: {
    width: 20,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 4,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  meta: { maxWidth: 110 },
  name: { fontSize: 12, fontWeight: "700", color: "#fff" },
  status: { fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  compactMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  compactTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconBtn: {
    height: 30,
    minWidth: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnOn: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  endBtn: {
    height: 30,
    minWidth: 30,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptText: { fontSize: 11, fontWeight: "700", color: "#fff" },
});
