// src/components/video/VoiceCallBanner.js
//
// Incoming banner for CONVERSATION voice calls.
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
import { FaPhone, FaPhoneSlash, FaSpinner } from "../../icons/fa";

const DEBUG = true;
function dlog(...args) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCB ${ts}]`, ...args);
}

const POLL_MS = 5000;

// Repeating ring vibration: wait 0ms, vibrate 1s, pause 1s, repeat.
// On iOS, the vibration duration is fixed ~400ms — the pattern numbers
// control the pauses instead. On Android, they map to actual vibrate/pause
// durations. Either way, this feels like a phone ring.
const RING_VIBRATE_PATTERN = [0, 1000, 1000];

const SUPPRESSED_ROUTES = [
  "Login",
  "Signup",
  "Register",
  "ForgotPassword",
  "ResetPassword",
  "VerifyEmail",
  "VideoCall",
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
  // Ringtone goes through InCallManager so it respects the device's
  // ringer mode (silent/vibrate/loud) automatically. Vibration runs
  // separately with repeat: true so it continues while the call rings.
  useEffect(() => {
    if (!incoming) {
      stopRing();
      return;
    }

    dlog("START ring + vibrate", { conversationId: incoming.conversationId });

    // Ringtone — system default. On silent mode, InCallManager will
    // not play audio, but our Vibration loop below still fires.
    try {
      InCallManager.startRingtone("_DEFAULT_", [0, 500, 500], "playback", 30);
    } catch (err) {
      dlog("startRingtone failed:", err.message);
    }

    // Repeating vibration — fires even on silent mode.
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
      if (activeCall) {
        setIncoming(null);
        return;
      }
      if (isSuppressedRoute()) {
        setIncoming(null);
        return;
      }
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      dlog("polling /voice-calls/incoming");
      try {
        const res = await client.get("/voice-calls/incoming");
        const data = res.data.data || {};
        const call = data.call;
        dlog("incoming response", {
          callId: call?.id,
          callType: call?.callType,
          receiverId: call?.receiverId,
          status: call?.status,
        });
        if (cancelled) return;

        if (call && call.callType === "voice") {
          dlog("setting incoming voice call", { callId: call.id });
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          setIncoming(null);
        }
      } catch (err) {
        dlog("poll error", {
          status: err?.response?.status,
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
    dlog("ACCEPT tapped", { conversationId: incoming.conversationId });
    stopRing(); // stop immediately so ringtone doesn't overlap call audio
    setLoading(true);
    try {
      const res = await client.patch(
        `/voice-calls/${incoming.conversationId}/accept`,
      );
      const updatedCall = res.data?.data?.call;
      dlog("accept OK", { callStatus: updatedCall?.status });
      openCall(updatedCall || { ...incoming, status: "ACTIVE" });
      setIncoming(null);
      goToMessages(incoming.conversationId, user?.role);
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
    stopRing(); // stop immediately
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
    : "SkilledProz voice call";

  return (
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <FaPhone size={22} color="#fff" />
        </View>

        <View style={styles.body}>
          <AppText style={styles.title} numberOfLines={1}>
            Incoming Voice Call
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
            accessibilityLabel="Decline voice call"
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
            accessibilityLabel="Accept voice call"
          >
            {loading ? (
              <FaSpinner size={18} color="#fff" />
            ) : (
              <FaPhone size={18} color="#fff" />
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
