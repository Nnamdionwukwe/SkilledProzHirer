// src/components/video/VoiceCallProvider.js
import { useEffect, useRef, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { RTCView } from "react-native-webrtc"; // <-- ADD THIS
import InCallManager from "react-native-incall-manager";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import useVoiceCallWebRTC from "../../hooks/useVoiceCallWebRTC";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";

const POLL_MS = 3000;
const DEBUG = true;
function log(...args) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCP ${ts}]`, ...args);
}

export default function VoiceCallProvider() {
  const { user, isHydrated } = useAuthStore();
  const { call, mode, updateCall, endCall } = useVoiceCall();

  const inFlightRef = useRef(false);
  const isActive = call?.status === "ACTIVE";

  const [everActive, setEverActive] = useState(false);
  useEffect(() => {
    if (isActive) setEverActive(true);
  }, [isActive]);
  useEffect(() => {
    if (!call) setEverActive(false);
  }, [call]);

  const callRef = useRef(call);
  const userRef = useRef(user);
  useEffect(() => {
    callRef.current = call;
  }, [call]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const getIsInitiator = useCallback(() => {
    const c = callRef.current;
    const u = userRef.current;
    return !!(c && u && c.initiatorId === u.id);
  }, []);

  const hookConversationId = call?.conversationId || null;

  const rtc = useVoiceCallWebRTC({
    conversationId: hookConversationId,
    getIsInitiator,
  });

  // ── Audio routing ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isActive) {
      try {
        InCallManager.stop();
        InCallManager.setKeepScreenOn(false);
      } catch {}
      return;
    }

    try {
      InCallManager.start({ media: "audio" });
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(true);
      InCallManager.setKeepScreenOn(true);

      return () => {
        try {
          InCallManager.stop();
          InCallManager.setKeepScreenOn(false);
        } catch {}
      };
    } catch (err) {
      log("audio: InCallManager failed", err?.message);
    }
  }, [isActive]);

  // ── Poll for status ────────────────────────────────────────────────
  useEffect(() => {
    if (!isHydrated || !user) return;
    if (!call?.conversationId) return;

    let cancelled = false;
    const conversationId = call.conversationId;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await client.get(`/voice-calls/${conversationId}`);
        const data = res.data.data;
        if (cancelled) return;

        if (
          !data?.call ||
          data.call.status === "ENDED" ||
          data.call.status === "DECLINED"
        ) {
          endCall();
          return;
        }

        const current = callRef.current;
        const changed =
          !current ||
          current.status !== data.call.status ||
          current.initiatorId !== data.call.initiatorId ||
          current.receiverId !== data.call.receiverId;

        if (changed) {
          log("poll: status changed →", data.call.status);
          updateCall(data.call);
        }
      } catch {
      } finally {
        inFlightRef.current = false;
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHydrated, user?.id, call?.conversationId]);

  if (!call || mode === "hidden") return null;

  return (
    <>
      {/* 
        CRITICAL FIX: Native WebRTC requires the stream to be bound to 
        an RTCView component to route the audio to the speaker. 
        We make it 1x1 pixel and invisible so it doesn't affect the UI.
      */}
      {rtc.remoteStream && (
        <View style={styles.hiddenAudioContainer} pointerEvents="none">
          <RTCView
            streamURL={rtc.remoteStream.toURL()}
            style={styles.hiddenAudio}
            objectFit="cover"
            zOrder={0}
          />
        </View>
      )}

      {mode === "fullscreen" && <VoiceCallFullScreen rtc={rtc} />}
      {mode === "mini" && <VoiceCallMini rtc={rtc} />}
    </>
  );
}

const styles = StyleSheet.create({
  hiddenAudioContainer: {
    position: "absolute",
    top: -100,
    left: -100,
    width: 1,
    height: 1,
    opacity: 0.01,
  },
  hiddenAudio: {
    width: 1,
    height: 1,
  },
});
