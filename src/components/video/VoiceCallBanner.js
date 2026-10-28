// src/components/video/VoiceCallBanner.js
//
// Incoming banner for CONVERSATION voice calls.
// Polls /voice-calls/incoming every 5s, shows a banner when
// callType === "voice". Accept → PATCH /accept → openCall() → navigate
// to Messages with conversationId.
//
// Ported from web src/components/video/VoiceCallBanner.jsx.

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../AppText";
import client from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import {
  FaPhone,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
} from "../../icons/fa";

const POLL_MS = 5000;

const SUPPRESSED_ROUTES = [
  "Login",
  "Signup",
  "Register",
  "ForgotPassword",
  "ResetPassword",
  "VerifyEmail",
  "VideoCall",
];

const DEBUG_VOICE_CALL = true;
function log(...args) {
  if (!DEBUG_VOICE_CALL) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCB ${ts}]`, ...args);
}

export default function VoiceCallBanner() {
  const navigation = useNavigation();
  const route = useRoute();
  const { accessToken, user, isHydrated } = useAuthStore();
  const { openCall, call: activeCall } = useVoiceCall();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const suppressed = SUPPRESSED_ROUTES.includes(route?.name);

  useEffect(() => {
    if (!isHydrated || !accessToken || !user) return;
    if (suppressed) {
      setIncoming(null);
      return;
    }
    if (activeCall) {
      setIncoming(null);
      return;
    }

    let cancelled = false;

    async function poll() {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const res = await client.get("/voice-calls/incoming");
        const data = res.data.data || {};
        const call = data.call;
        if (cancelled) return;

        if (call && call.callType === "voice") {
          log("incoming voice call", {
            callId: call.id,
            conversationId: call.conversationId,
            initiatorId: call.initiatorId,
          });
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          setIncoming(null);
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
  }, [isHydrated, accessToken, user, suppressed, activeCall]);

  async function handleAccept() {
    if (!incoming) return;
    log("ACCEPT tapped", { conversationId: incoming.conversationId });
    setLoading(true);

    try {
      const res = await client.patch(
        `/voice-calls/${incoming.conversationId}/accept`,
      );
      log("accept response", res.data);

      const updatedCall = res.data?.data?.call;
      if (!updatedCall) {
        log("accept response missing call object — using fallback");
        openCall({ ...incoming, status: "ACTIVE" });
      } else {
        openCall(updatedCall);
      }

      setIncoming(null);
      navigation.navigate("Messages", {
        conversationId: incoming.conversationId,
      });
    } catch (err) {
      log("accept failed:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecline() {
    if (!incoming) return;
    log("DECLINE tapped", { conversationId: incoming.conversationId });
    setLoading(true);
    try {
      await client.patch(`/voice-calls/${incoming.conversationId}/decline`);
      setIncoming(null);
    } catch (err) {
      log("decline failed:", err?.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!incoming || suppressed) return null;

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
          <FaPhone size={24} color="#fff" />
        </View>
        <View style={styles.body}>
          <AppText style={styles.title}>Incoming Voice Call</AppText>
          <AppText style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </AppText>
        </View>
        <View style={styles.actions}>
          <Pressable
            onPress={handleAccept}
            disabled={loading}
            style={styles.acceptBtn}
            hitSlop={6}
          >
            {loading ? (
              <FaSpinner size={14} color="#fff" />
            ) : (
              <>
                <FaCheckCircle size={14} color="#fff" />
                <AppText style={styles.acceptText}>Accept</AppText>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleDecline}
            disabled={loading}
            style={styles.declineBtn}
            hitSlop={6}
          >
            <FaTimesCircle size={14} color="#ef4444" />
            <AppText style={styles.declineText}>Decline</AppText>
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
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,0.4)",
    maxWidth: 460,
    width: "100%",
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 14, fontWeight: "700", color: "#fff" },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#22c55e",
  },
  acceptText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  declineBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  declineText: { fontSize: 12, fontWeight: "700", color: "#ef4444" },
});
