// src/components/video/VideoCallBanner.js
//
// Incoming banner for BOOKING + INTERVIEW video calls.
//
// Distinct from VoiceCallBanner (which handles conversation-scoped
// voice/video calls from the Messages tab). This banner only handles
// the `/video-calls/*` endpoints used by:
//   • BookingDetailScreen  →  VideoCallButton  →  POST /video-calls/:bookingId/initiate
//   • JobApplications      →  InterviewCallButton → POST /jobs/applications/:id/call
//
// Polls /video-calls/incoming every 5s. On accept, navigates to the
// correct screen based on callType:
//   • BOOKING       → VideoCall screen (booking WebView)
//   • JOB_INTERVIEW → InterviewCallRoom screen (interview WebView)

import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Vibration, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InCallManager from "react-native-incall-manager";
import AppText from "../AppText";
import client from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import { navigationRef } from "../../navigation/navigationRef";
import { FaPhoneSlash, FaSpinner, FaVideo } from "../../icons/fa";

const DEBUG = true;
function dlog(...args) {
  if (!DEBUG) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[VCB2 ${ts}]`, ...args);
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
  "VoiceCall",
  "InterviewCallRoom", // suppress on the interview room itself
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

function stopRing() {
  try {
    InCallManager.stopRingtone();
  } catch {}
  try {
    Vibration.cancel();
  } catch {}
}

export default function VideoCallBanner() {
  const { user, isHydrated } = useAuthStore();

  const [incoming, setIncoming] = useState(null);
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  // Ring + vibrate
  useEffect(() => {
    if (!incoming) {
      stopRing();
      return;
    }
    try {
      InCallManager.startRingtone("_DEFAULT_", [0, 500, 500], "playback", 30);
    } catch {}
    try {
      Vibration.vibrate(RING_VIBRATE_PATTERN, true);
    } catch {}
    return () => stopRing();
  }, [incoming]);

  // Poll
  useEffect(() => {
    if (!isHydrated || !user) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      if (isSuppressedRoute()) {
        setIncoming(null);
        return;
      }
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      try {
        const res = await client.get("/video-calls/incoming");
        const data = res.data?.data || {};
        const call = data.call;

        if (cancelled) return;

        if (
          call &&
          ["PENDING", "RINGING"].includes(call.status) &&
          call.receiverId === user.id
        ) {
          dlog("✅ incoming video call", {
            id: call.id,
            type: call.callType,
            bookingId: call.bookingId,
            jobApplicationId: call.jobApplicationId,
          });
          setIncoming((prev) => (prev?.id === call.id ? prev : call));
        } else {
          setIncoming(null);
        }
      } catch (err) {
        dlog("poll error:", err?.message);
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
  }, [isHydrated, user]);

  // Accept
  async function handleAccept() {
    if (!incoming) return;
    stopRing();
    setLoading(true);
    try {
      await client.patch(`/video-calls/${incoming.id}/accept`);

      const callType = incoming.callType;
      const bookingId = incoming.bookingId;
      const jobApplicationId = incoming.jobApplicationId;

      setIncoming(null);

      // Small delay so the PATCH propagates before the next screen fetches.
      setTimeout(() => {
        if (!navigationRef.isReady()) return;
        if (callType === "JOB_INTERVIEW" && jobApplicationId) {
          navigationRef.navigate("InterviewCallRoom", {
            applicationId: jobApplicationId,
          });
        } else if (bookingId) {
          // The booking video call flow needs a conversation only for
          // the WebView's room URL. If VideoCallScreen requires a
          // conversationId, create one now (same logic as
          // BookingDetailScreen.handleStartVideoCall).
          (async () => {
            try {
              let conversationId = null;
              try {
                const res = await client.get("/messages/conversations", {
                  params: { page: 1, limit: 100, _t: Date.now() },
                });
                const list = res.data?.data?.conversations || [];
                const otherUserId =
                  incoming.booking?.hirerId === user.id
                    ? incoming.booking?.workerId
                    : incoming.booking?.hirerId;
                const peerIdStr = String(otherUserId);
                const found = list.find((convo) =>
                  (convo.users || []).some((u) => {
                    const uid = String(u.userId || u.user?.id || u.id);
                    return uid === peerIdStr;
                  }),
                );
                if (found?.id) conversationId = found.id;
              } catch {}

              if (!conversationId) {
                const res = await client.post("/messages", {
                  receiverId:
                    incoming.booking?.hirerId === user.id
                      ? incoming.booking?.workerId
                      : incoming.booking?.hirerId,
                  content: "📞 Starting video call…",
                });
                conversationId = res.data?.data?.conversationId;
              }

              if (!conversationId) throw new Error("No conversation");

              navigationRef.navigate("VideoCall", {
                conversationId,
                returnTo: "BookingDetail",
                returnParams: { bookingId },
                sessionId: Date.now(),
              });
            } catch {
              // Fallback: still try to open VideoCall with the booking
              navigationRef.navigate("VideoCall", {
                conversationId: null,
                bookingId,
                returnTo: "BookingDetail",
                returnParams: { bookingId },
                sessionId: Date.now(),
              });
            }
          })();
        }
      }, 150);
    } catch (err) {
      dlog("accept failed:", err?.message);
    } finally {
      setLoading(false);
    }
  }

  // Decline
  async function handleDecline() {
    if (!incoming) return;
    stopRing();
    setLoading(true);
    try {
      await client.patch(`/video-calls/${incoming.id}/decline`);
      setIncoming(null);
    } catch (err) {
      dlog("decline failed:", err?.message);
    } finally {
      setLoading(false);
    }
  }

  if (!incoming) return null;
  if (isSuppressedRoute()) return null;

  const subtitle =
    incoming.callType === "JOB_INTERVIEW"
      ? "Job Interview Call"
      : incoming.booking?.title
        ? `Regarding: ${incoming.booking.title}`
        : "SkilledProz video call";

  return (
    <SafeAreaView style={styles.overlay} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <FaVideo size={22} color="#fff" />
        </View>

        <View style={styles.body}>
          <AppText style={styles.title} numberOfLines={1}>
            Incoming Video Call
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
          >
            {loading ? (
              <FaSpinner size={18} color="#fff" />
            ) : (
              <FaVideo size={18} color="#fff" />
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
    zIndex: 9999,
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
