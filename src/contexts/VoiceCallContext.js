// src/contexts/VoiceCallContext.js
//
// Global voice-call state. Single source of truth for:
//   • which call is in progress (call)
//   • which UI mode we're in (mode: "hidden" | "fullscreen" | "mini")
//
// NAVIGATION ON END:
//   When the receiver's call ends, we drop them into the chat with the
//   caller so they can see the message history / follow up. The caller is
//   NOT navigated (they're presumably where they want to be).

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuthStore } from "../store/authStore";
import { navigationRef } from "../navigation/navigationRef";

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCC ${ts}]`, ...args);
}

const VoiceCallContext = createContext(null);

export function VoiceCallProvider({ children }) {
  const [call, setCallState] = useState(null);
  const [mode, setModeState] = useState("hidden");
  const callRef = useRef(null);

  const setCall = useCallback((next) => {
    if (next) {
      log("setCall →", {
        id: next.id,
        status: next.status,
        initiatorId: next.initiatorId,
        receiverId: next.receiverId,
        conversationId: next.conversationId,
        callType: next.callType,
      });
    } else {
      log("setCall → null");
    }
    callRef.current = next;
    setCallState(next);
  }, []);

  const startCall = useCallback(
    (nextCall) => {
      log("startCall()", {
        id: nextCall?.id,
        status: nextCall?.status,
        initiatorId: nextCall?.initiatorId,
      });
      setCall(nextCall);
      setModeState("fullscreen");
    },
    [setCall],
  );

  const openCall = useCallback(
    (nextCall) => {
      log("openCall()", {
        id: nextCall?.id,
        status: nextCall?.status,
        initiatorId: nextCall?.initiatorId,
      });
      setCall(nextCall);
      setModeState("fullscreen");
    },
    [setCall],
  );

  const updateCall = useCallback((patch) => {
    setCallState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      if (prev.status !== next.status) {
        log(`status ${prev.status} → ${next.status}`, {
          id: next.id,
          initiatorId: next.initiatorId,
          receiverId: next.receiverId,
        });
      }
      callRef.current = next;
      return next;
    });
  }, []);

  const minimize = useCallback(() => {
    log("minimize()");
    setModeState("mini");
  }, []);

  const expand = useCallback(() => {
    log("expand()");
    setModeState("fullscreen");
  }, []);

  // ── End call ─────────────────────────────────────────────────────────
  // Snapshot the call before clearing so we know where to send the
  // receiver after the widget disappears.
  const endCall = useCallback(() => {
    const endedCall = callRef.current;
    log("endCall()", {
      conversationId: endedCall?.conversationId,
      initiatorId: endedCall?.initiatorId,
      receiverId: endedCall?.receiverId,
    });

    // Clear state immediately so the call UI (mini/fullscreen) unmounts
    callRef.current = null;
    setCallState(null);
    setModeState("hidden");

    // Navigate the RECEIVER back into the chat with the caller.
    // The caller is intentionally not navigated — they initiated the call
    // from wherever they were and should stay there.
    const me = useAuthStore.getState?.()?.user;
    const isReceiver =
      endedCall &&
      me?.id &&
      endedCall.receiverId === me.id &&
      endedCall.conversationId;

    if (!isReceiver) {
      log("endCall: not receiver — no navigation");
      return;
    }

    if (!navigationRef.isReady()) {
      log("endCall: navigationRef not ready — no navigation");
      return;
    }

    // Delay slightly so the unmount of the call UI finishes before we
    // push a new screen. Prevents a flicker of the underlying screen.
    setTimeout(() => {
      if (!navigationRef.isReady()) return;
      try {
        log("endCall: navigating receiver → Chat", {
          conversationId: endedCall.conversationId,
          withUserId: endedCall.initiatorId,
        });
        navigationRef.navigate("Chat", {
          conversationId: endedCall.conversationId,
          withUserId: endedCall.initiatorId,
        });
      } catch (err) {
        log("endCall: navigation failed", err?.message);
      }
    }, 800);
  }, []);

  const value = useMemo(
    () => ({
      call,
      mode,
      startCall,
      openCall,
      updateCall,
      minimize,
      expand,
      endCall,
    }),
    [call, mode, startCall, openCall, updateCall, minimize, expand, endCall],
  );

  return (
    <VoiceCallContext.Provider value={value}>
      {children}
    </VoiceCallContext.Provider>
  );
}

export function useVoiceCall() {
  const ctx = useContext(VoiceCallContext);
  if (!ctx) {
    throw new Error("useVoiceCall must be used inside <VoiceCallProvider>");
  }
  return ctx;
}
