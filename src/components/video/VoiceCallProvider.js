// src/components/video/VoiceCallProvider.js
//
// Persistent voice-call widget. Runs the WebRTC session, polls call status,
// renders fullscreen/mini UI.
//
// AUDIO ROUTING FIX: InCallManager.start() must run when rtc.status ===
// "connected", not just when the DB says ACTIVE. Otherwise the audio
// session opens before the peer connection exists, and Android/iOS never
// re-route the remote track once it starts flowing.
//
// Additionally, toggling setForceSpeakerphoneOn(true) → false after a
// short delay forces the Android audio system to re-evaluate the route —
// a known workaround for "WebRTC connected but no audio" on some devices.

import { useEffect, useRef, useState, useCallback } from "react";
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
  const effectiveActive = isActive || everActive;

  const rtc = useVoiceCallWebRTC({
    conversationId: hookConversationId,
    getIsInitiator,
  });

  // ── Audio routing ───────────────────────────────────────────────────
  // Runs when the peer connection is CONNECTED — not just when the DB row
  // flips to ACTIVE. This is what makes the mobile speaker produce sound.
  useEffect(() => {
    if (!isActive) {
      log("audio: not active — stopping");
      try {
        InCallManager.stop();
        InCallManager.setKeepScreenOn(false);
      } catch {}
      return;
    }

    if (rtc.status !== "connected") {
      log("audio: active but peer not connected — waiting", {
        rtcStatus: rtc.status,
      });
      return;
    }

    log("audio: peer connected — starting InCallManager");
    try {
      // 1. Start the audio session (acquires the audio route)
      InCallManager.start({ media: "audio" });

      // 2. Force speaker on, then off after a short delay — this forces
      //    the Android AudioManager to re-evaluate the routing and pick
      //    up the WebRTC audio stream. Skip the second step to keep
      //    speaker on; call setForceSpeakerphoneOn(false) to use earpiece.
      InCallManager.setForceSpeakerphoneOn(true);
      const t = setTimeout(() => {
        try {
          InCallManager.setForceSpeakerphoneOn(false);
        } catch {}
      }, 250);
      InCallManager.setKeepScreenOn(true);

      return () => {
        clearTimeout(t);
        try {
          InCallManager.stop();
          InCallManager.setKeepScreenOn(false);
        } catch {}
      };
    } catch (err) {
      log("audio: InCallManager failed", err?.message);
    }
  }, [isActive, rtc.status]);

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

        if (!data?.call) {
          endCall();
          return;
        }
        if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
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
      {mode === "fullscreen" && <VoiceCallFullScreen rtc={rtc} />}
      {mode === "mini" && <VoiceCallMini rtc={rtc} />}
    </>
  );
}
