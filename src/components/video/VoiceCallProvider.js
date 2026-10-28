// src/components/video/VoiceCallProvider.js
//
// Persistent voice-call widget. Runs the WebRTC session, polls the call
// status, and renders the fullscreen/mini UI.
//
// THE OFFER-RACE FIX: the receiver's PC is created asynchronously (after
// getUserMedia resolves). The caller's offer can arrive in that window and
// be silently dropped — leaving both peers stuck at "connecting" forever.
// This version buffers the offer if it arrives before the PC is ready.

import { useEffect, useRef, useState, useCallback } from "react";
import InCallManager from "react-native-incall-manager";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import useVoiceCallWebRTC from "../../hooks/useVoiceCallWebRTC";
import VoiceCallFullScreen from "./VoiceCallFullScreen";
import VoiceCallMini from "./VoiceCallMini";

const POLL_MS = 3000;

export default function VoiceCallProvider() {
  const { user, accessToken, isHydrated } = useAuthStore();
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

  // Audio routing — required for the mobile speaker/earpiece to actually
  // produce sound. Must run while the call is ACTIVE.
  useEffect(() => {
    if (isActive) {
      InCallManager.start({ media: "audio" });
      InCallManager.setForceSpeakerphoneOn(false);
      InCallManager.setKeepScreenOn(true);
    } else {
      InCallManager.stop();
      InCallManager.setKeepScreenOn(false);
    }
    return () => {
      InCallManager.stop();
    };
  }, [isActive]);

  // Poll for status
  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
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
  }, [isHydrated, accessToken, user?.id, call?.conversationId]);

  if (!call || mode === "hidden") return null;

  return (
    <>
      {mode === "fullscreen" && <VoiceCallFullScreen rtc={rtc} />}
      {mode === "mini" && <VoiceCallMini rtc={rtc} />}
    </>
  );
}
