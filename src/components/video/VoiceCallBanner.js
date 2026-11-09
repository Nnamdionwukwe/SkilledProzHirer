// src/components/video/VoiceCallBanner.js
//
// Incoming banner for conversation- and booking-scoped voice/video calls.
// Rings via InCallManager.startRingtone (respects silent/vibrate mode)
// and vibrates repeatedly via React Native Vibration API for a native
// phone-ring feel.
//
// Accept / Decline are icon-only circular buttons so the caller name
// and title have room to breathe.
//
// Diagnostic logs prefixed [VCB]. Set DEBUG = false to silence.

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InCallManager from "react-native-incall-manager";
import AppText from "../AppText";
import client from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import { navigationRef } from "../../navigation/navigationRef";
import { FaPhone, FaPhoneSlash, FaSpinner, FaVideo } from "../../icons/fa";

const DEBUG = true;
function dlog(...args) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCB ${ts}]`, ...args);
}

const POLL_MS = 5000;

const RING_VIBRATE_PATTERN = [0, 1000, 1000];

const SUPPRESSED_ROUTES = [
  "Login",
  "Signup",
  "Register",
  "ForgotPassword",
  "ResetPassword",
  "VerifyEmail",
  "VideoCall",
  "VoiceCall", // ✅ CHANGED: also suppress on voice-call full screen
];

function isSuppressedRoute() {
  if (!navigationRef.isReady()) return false;
  try {
    const name = navigationRef.getCurrentRoute()?.name;
    return SUPPRESSED_ROUTES.includes(name);
  } catch {
    return false;
  }
}

function goToMessages(conversationId, role) {
  if (!navigationRef.isReady()) {
    dlog("goToMessages: navigationRef not ready");
    return;
  }
  try {
    if (role === "WORKER") {
      dlog("goToMessages via WorkerHome", { conversationId });
      navigationRef.navigate("WorkerHome", {
        screen: "Messages",
        params: { conversationId },
      });
    } else {
      dlog("goToMessages direct", { conversationId });
      navigationRef.navigate("Messages", { conversationId });
    }
  } catch (err) {
    dlog("goToMessages failed:", err.message);
  }
}

// ✅ CHANGED: unified navigation helper for video calls. Reads the
// backend-provided `returnTo` / `returnParams` if present, otherwise
// falls back to opening the chat.
function goToVideoCall(call) {
  if (!navigationRef.isReady()) {
    dlog("goToVideoCall: navigationRef not ready");
    return;
  }
  try {
    const conversationId = call?.conversationId;
    if (!conversationId) {
      dlog("goToVideoCall: missing conversationId");
      return;
    }
    // If the backend includes returnTo/returnParams on the call row, use them.
    const returnTo = call?.returnTo || "Chat";
    const returnParams = call?.returnParams || { conversationId };

    dlog("goToVideoCall", { conversationId, returnTo, returnParams });
    navigationRef.navigate("VideoCall", {
      conversationId,
      returnTo,
      returnParams,
      sessionId: Date.now(),
    });
  } catch (err) {
    dlog("goToVideoCall failed:", err.message);
  }
}

function stopRing() {
  try {
    InCallManager.stopRingtone();
  } catch {}
  try {
    Vibration.cancel();
  } catch {}
}

export default function VoiceCallBanner() {
  const { user, isHydrated } = useAuthStore();
  const { openCall, call: activeCall } = useVoiceCall();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  dlog("render", {
    isHydrated,
    hasUser: !!user,
    userRole: user?.role,
    activeCallId: activeCall?.id,
    hasIncoming: !!incoming,
    suppressed: isSuppressedRoute(),
    incomingId: incoming?.id,
  });

  // ── Ring + vibrate while incoming is set ─────────────────────────────
  useEffect(() => {
    if (!incoming) {
      stopRing();
      return;
    }

    dlog("START ring + vibrate", { conversationId: incoming.conversationId });

    try {
      InCallManager.startRingtone("_DEFAULT_", [0, 500, 500], "playback", 30);
    } catch (err) {
      dlog("startRingtone failed:", err.message);
    }

    try {
      Vibration.vibrate(RING_VIBRATE_PATTERN, true);
    } catch (err) {
      dlog("Vibration.vibrate failed:", err.message);
    }

    return () => {
      dlog("STOP ring + vibrate");
      stopRing();
    };
  }, [incoming]);

  useEffect(() => {
    dlog("poll effect fired", {
      isHydrated,
      hasUser: !!user,
      activeCallId: activeCall?.id,
    });

    if (!isHydrated || !user) {
      dlog("poll effect bailed — auth not ready");
      return;
    }

    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      dlog("─── POLL TICK ───", {
        activeCall: activeCall?.id ?? null,
        suppressedRoute: isSuppressedRoute(),
        inFlight: inFlightRef.current,
        currentRoute: navigationRef.isReady()
          ? navigationRef.getCurrentRoute()?.name
          : "not-ready",
        myId: user?.id,
        myRole: user?.role,
      });

      if (activeCall) {
        dlog("SKIP: activeCall present", activeCall.id);
        setIncoming(null);
        return;
      }
      if (isSuppressedRoute()) {
        dlog("SKIP: suppressed route");
        setIncoming(null);
        return;
      }
      if (inFlightRef.current) {
        dlog("SKIP: poll already in flight");
        return;
      }

      inFlightRef.current = true;
      try {
        const res = await client.get("/voice-calls/incoming");
        dlog("RAW RESPONSE STATUS:", res.status);
        dlog("RAW RESPONSE BODY:", JSON.stringify(res.data, null, 2));

        const data = res.data?.data || {};
        const call = data.call;

        dlog(
          "PARSED call:",
          call
            ? {
                id: call.id,
                status: call.status,
                callType: call.callType,
                receiverId: call.receiverId,
                initiatorId: call.initiatorId,
                conversationId: call.conversationId,
                returnTo: call.returnTo,
              }
            : null,
        );

        if (cancelled) return;

        if (
          call &&
          call.status === "PENDING" &&
          call.receiverId === user.id &&
          (call.callType === "voice" || call.callType === "video")
        ) {
          dlog("✅ WILL SHOW BANNER:", call.id, call.callType);
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          dlog("❌ WILL NOT SHOW:", {
            hasCall: !!call,
            status: call?.status,
            receiverMatch: call?.receiverId === user.id,
            callType: call?.callType,
          });
          setIncoming(null);
        }
      } catch (err) {
        dlog("POLL ERROR:", {
          status: err?.response?.status,
          data: err?.response?.data,
          msg: err?.message,
        });
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
  }, [isHydrated, user, activeCall]);

  async function handleAccept() {
    if (!incoming) return;
    dlog("ACCEPT tapped", {
      conversationId: incoming.conversationId,
      callType: incoming.callType,
    });
    stopRing();
    setLoading(true);
    try {
      const res = await client.patch(
        `/voice-calls/${incoming.conversationId}/accept`,
      );
      const updatedCall = res.data?.data?.call;
      dlog("accept OK", { callStatus: updatedCall?.status });

      // ✅ CHANGED: branch on callType. Voice → open full-screen voice UI
      // via the context; video → navigate to the VideoCall screen so the
      // receiver lands inside the WebView room.
      if (incoming.callType === "video") {
        setIncoming(null);
        // Give the accept PATCH a beat to propagate on the backend before
        // the VideoCall screen fetches the call row.
        setTimeout(() => {
          goToVideoCall(updatedCall || incoming);
        }, 150);
      } else {
        openCall(updatedCall || { ...incoming, status: "ACTIVE" });
        setIncoming(null);
        goToMessages(incoming.conversationId, user?.role);
      }
    } catch (err) {
      dlog("accept FAILED", {
        status: err?.response?.status,
        data: err?.response?.data,
        msg: err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!incoming) return;
    dlog("DECLINE tapped", { conversationId: incoming.conversationId });
    stopRing();
    setLoading(true);
    try {
      await client.patch(`/voice-calls/${incoming.conversationId}/decline`);
      dlog("decline OK");
      setIncoming(null);
    } catch (err) {
      dlog("decline FAILED", {
        status: err?.response?.status,
        msg: err?.message,
      });
    } finally {
      setLoading(false);
    }
  }

  if (!incoming) return null;
  if (isSuppressedRoute()) {
    dlog("suppressed render — returning null");
    return null;
  }

  const callerName = incoming.initiator
    ? `${incoming.initiator.firstName || ""} ${incoming.initiator.lastName || ""}`.trim()
    : "";

  const subtitle = callerName
    ? `${callerName} is calling you`
    : "SkilledProz call";

  // ✅ CHANGED: icon swaps based on callType so the user knows whether
  // it's a voice or a video call before they even answer.
  const CallIcon = incoming.callType === "video" ? FaVideo : FaPhone;

  return (
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <CallIcon size={22} color="#fff" />
        </View>

        <View style={styles.body}>
          <AppText style={styles.title} numberOfLines={1}>
            {incoming.callType === "video"
              ? "Incoming Video Call"
              : "Incoming Voice Call"}
          </AppText>
          <AppText style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleDecline}
            disabled={loading}
            style={styles.declineBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Decline call"
          >
            {loading ? (
              <FaSpinner size={18} color="#fff" />
            ) : (
              <FaPhoneSlash size={18} color="#fff" />
            )}
          </Pressable>
          <Pressable
            onPress={handleAccept}
            disabled={loading}
            style={styles.acceptBtn}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Accept call"
          >
            {loading ? (
              <FaSpinner size={18} color="#fff" />
            ) : (
              <CallIcon size={18} color="#fff" />
            )}
          </Pressable>
        </View>
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
    zIndex: 10000,
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    maxWidth: 460,
    width: "100%",
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "700", color: "#fff" },
  subtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
  },
  declineBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
});
