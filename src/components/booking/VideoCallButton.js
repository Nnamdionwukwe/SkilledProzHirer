// src/components/booking/VideoCallButton.js
//
// Verbatim port of components/booking/VideoCallButton.jsx.
//
// Renders only when:
//   · user is the hirer OR the worker
//   · bookingStatus ∈ ["PENDING", "ACCEPTED", "IN_PROGRESS"]
//
// Polls GET /video-calls/:id every 5s for call state changes:
//   PENDING + receiverId === userId  → incoming call UI (Accept / Decline)
//   PENDING + initiatorId === userId → waiting UI (Cancel)
//   ENDED / DECLINED                 → "Call again" UI
//   no call                          → idle "Video Call" button
//
// Endpoints:
//   GET   /video-calls/:bookingId
//   POST  /video-calls/:bookingId/initiate
//   PATCH /video-calls/:bookingId/accept
//   PATCH /video-calls/:bookingId/decline
//   PATCH /video-calls/:bookingId/end
//
// Port note:
//   · The web navigates to /call/:id when the call becomes ACTIVE. That page
//     renders an <iframe> to a Jitsi room.
//   · RN cannot render iframes reliably. This port instead opens the Jitsi
//     room URL in the device's default browser (or an in-app WebView if you
//     add react-native-webview). The room URL is built from the call's
//     `roomCode` / `roomUrl` field returned by the backend.
//   · If the backend doesn't expose a room URL, the ACTIVE state shows a
//     "Join Call" button that opens your video provider's join URL —
//     configure it via the ROOM_URL_TEMPLATE constant below.

import React, { useEffect, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import {
  FaVideo,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneSlash,
  FaExclamationTriangle,
} from "../../icons/fa";

const POLL_MS = 5000;

// Default room template — override if your backend returns a different URL.
// Common Jitsi pattern: https://meet.jit.si/skilledproz-<roomCode>
const ROOM_URL_TEMPLATE = "https://meet.jit.si/skilledproz-";

export default function VideoCallButton({
  bookingId,
  bookingStatus,
  userId,
  hirerId,
  workerId,
}) {
  const { theme } = useTheme();
  const c = theme.colors;

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openedRef = useRef(false);
  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  // ── Initial fetch ───────────────────────────────────────────────────
  useEffect(() => {
    if (!canCall) return;
    client
      .get(`/video-calls/${bookingId}`)
      .then((r) => {
        const c0 = r?.data?.data?.call;
        if (c0) setCall(c0);
      })
      .catch(() => {});
  }, [bookingId, canCall]);

  // ── Open the room when the call becomes ACTIVE ──────────────────────
  useEffect(() => {
    if (call?.status !== "ACTIVE" || openedRef.current) return;
    openedRef.current = true;
    openRoom(call);
  }, [call?.status]);

  // ── Poll for state changes ──────────────────────────────────────────
  useEffect(() => {
    if (!canCall) return;
    if (openedRef.current) return;
    if (call?.status === "ENDED" || call?.status === "DECLINED") return;

    const id = setInterval(async () => {
      try {
        const r = await client.get(`/video-calls/${bookingId}`);
        const updated = r?.data?.data?.call;
        if (!updated) return;
        setCall((prev) => {
          if (!prev) return updated;
          if (prev.status === updated.status) return prev;
          return updated;
        });
      } catch {}
    }, POLL_MS);

    return () => clearInterval(id);
  }, [canCall, bookingId, call?.status]);

  // ── Open room in browser ────────────────────────────────────────────
  function openRoom(callData) {
    const url =
      callData?.roomUrl ||
      (callData?.roomCode ? `${ROOM_URL_TEMPLATE}${callData.roomCode}` : null);
    if (!url) {
      setError("No room URL available for this call.");
      return;
    }
    Linking.openURL(url).catch(() => {
      setError("Could not open the call room.");
    });
  }

  // ── Actions ─────────────────────────────────────────────────────────
  const handleInitiate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.post(`/video-calls/${bookingId}/initiate`);
      setCall(res?.data?.data?.call || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to start call");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setLoading(true);
    try {
      const res = await client.patch(`/video-calls/${bookingId}/accept`);
      setCall(res?.data?.data?.call || null);
    } catch {
      setError("Failed to accept call");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await client.patch(`/video-calls/${bookingId}/decline`);
      setCall((prev) => ({ ...prev, status: "DECLINED" }));
    } catch {
      setError("Failed to decline call");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      await client.patch(`/video-calls/${bookingId}/end`);
      setCall((prev) => ({ ...prev, status: "ENDED" }));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // ── Guard ───────────────────────────────────────────────────────────
  if (!canCall) return null;

  // ═════════════════════════════════════════════════════════════════════
  // INCOMING CALL
  // ═════════════════════════════════════════════════════════════════════
  if (call?.status === "PENDING" && call?.receiverId === userId) {
    return (
      <View
        style={[
          styles.incomingWrap,
          {
            backgroundColor: "rgba(129,140,248,0.08)",
            borderColor: "#818cf8",
          },
        ]}
      >
        <View style={styles.incomingContent}>
          <FaVideo size={20} color="#818cf8" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText
              style={{ fontSize: 13, fontWeight: "800", color: "#818cf8" }}
            >
              Incoming Video Call
            </AppText>
            <AppText style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
              Pre-job consultation
            </AppText>
          </View>
        </View>

        <View style={styles.incomingBtns}>
          <Pressable
            onPress={handleAccept}
            disabled={loading}
            style={({ pressed }) => [
              styles.acceptBtn,
              {
                backgroundColor: "#16a34a",
                opacity: loading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaCheckCircle size={13} color="#fff" />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#fff",
                marginLeft: 5,
              }}
            >
              Accept
            </AppText>
          </Pressable>
          <Pressable
            onPress={handleDecline}
            disabled={loading}
            style={({ pressed }) => [
              styles.declineBtn,
              {
                backgroundColor: "rgba(220,38,38,0.1)",
                borderColor: "rgba(220,38,38,0.3)",
                opacity: loading ? 0.6 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaTimesCircle size={13} color="#dc2626" />
            <AppText
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: "#dc2626",
                marginLeft: 5,
              }}
            >
              Decline
            </AppText>
          </Pressable>
        </View>

        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <FaExclamationTriangle size={10} color="#dc2626" />
            <AppText style={{ fontSize: 11, color: "#dc2626" }}>
              {error}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // WAITING FOR ANSWER (outgoing)
  // ═════════════════════════════════════════════════════════════════════
  if (call?.status === "PENDING" && call?.initiatorId === userId) {
    return (
      <View
        style={[
          styles.waitingWrap,
          {
            backgroundColor: "rgba(129,140,248,0.06)",
            borderColor: "rgba(129,140,248,0.2)",
          },
        ]}
      >
        <View
          style={[
            styles.spinnerDot,
            { borderColor: "rgba(129,140,248,0.2)", borderTopColor: "#818cf8" },
          ]}
        />
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "600",
            color: "#818cf8",
            flex: 1,
            marginLeft: 8,
          }}
        >
          Calling… waiting for answer
        </AppText>
        <Pressable
          onPress={handleCancel}
          disabled={loading}
          style={({ pressed }) => [
            styles.cancelCallBtn,
            {
              borderColor: "rgba(220,38,38,0.3)",
              opacity: loading ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <FaTimesCircle size={11} color="#dc2626" />
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: "#dc2626",
              marginLeft: 4,
            }}
          >
            Cancel
          </AppText>
        </Pressable>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // ACTIVE CALL — join via browser
  // ═════════════════════════════════════════════════════════════════════
  if (call?.status === "ACTIVE") {
    return (
      <View
        style={[
          styles.activeWrap,
          {
            backgroundColor: "rgba(129,140,248,0.08)",
            borderColor: "#818cf8",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#ef4444",
            }}
          />
          <AppText
            style={{
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1,
              color: "#ef4444",
              textTransform: "uppercase",
            }}
          >
            Live
          </AppText>
        </View>
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#818cf8",
            marginTop: 4,
          }}
        >
          Video call in progress
        </AppText>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Pressable
            onPress={() => openRoom(call)}
            style={({ pressed }) => [
              styles.callBtn,
              {
                flex: 1,
                backgroundColor: "rgba(129,140,248,0.15)",
                borderColor: "rgba(129,140,248,0.3)",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaVideo size={12} color="#818cf8" />
            <AppText
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: "#818cf8",
                marginLeft: 6,
              }}
            >
              Rejoin Call
            </AppText>
          </Pressable>
          <Pressable
            onPress={handleCancel}
            disabled={loading}
            style={({ pressed }) => [
              styles.cancelCallBtn,
              {
                borderColor: "rgba(220,38,38,0.3)",
                opacity: loading ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            <FaPhoneSlash size={11} color="#dc2626" />
            <AppText
              style={{
                fontSize: 11,
                fontWeight: "600",
                color: "#dc2626",
                marginLeft: 4,
              }}
            >
              End
            </AppText>
          </Pressable>
        </View>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // ENDED / DECLINED
  // ═════════════════════════════════════════════════════════════════════
  if (call?.status === "ENDED" || call?.status === "DECLINED") {
    return (
      <View
        style={[
          styles.endedWrap,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      >
        {call.status === "DECLINED" ? (
          <FaTimesCircle size={16} color="#ef4444" />
        ) : (
          <FaPhoneSlash size={16} color={c.textDim} />
        )}
        <AppText
          style={{
            fontSize: 12,
            color: c.textMuted,
            flex: 1,
            marginLeft: 8,
          }}
        >
          {call.status === "DECLINED" ? "Call declined" : "Call ended"}
        </AppText>
        <Pressable
          onPress={handleInitiate}
          disabled={loading}
          style={({ pressed }) => [
            styles.callAgainBtn,
            {
              backgroundColor: "rgba(129,140,248,0.15)",
              borderColor: "rgba(129,140,248,0.3)",
              opacity: loading ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <FaVideo size={10} color="#818cf8" />
          <AppText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: "#818cf8",
              marginLeft: 4,
            }}
          >
            Call Again
          </AppText>
        </Pressable>
      </View>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // IDLE
  // ═════════════════════════════════════════════════════════════════════
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={handleInitiate}
        disabled={loading}
        style={({ pressed }) => [
          styles.callBtn,
          {
            backgroundColor: "rgba(129,140,248,0.15)",
            borderColor: "rgba(129,140,248,0.3)",
            opacity: loading ? 0.5 : pressed ? 0.85 : 1,
          },
        ]}
      >
        <FaVideo size={13} color="#818cf8" />
        <AppText
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: "#818cf8",
            marginLeft: 6,
          }}
        >
          Video Call
        </AppText>
      </Pressable>
      <AppText
        style={{
          fontSize: 10,
          color: c.textMuted,
          textAlign: "center",
        }}
      >
        Start a video call before or during the job
      </AppText>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <FaExclamationTriangle size={10} color="#dc2626" />
          <AppText style={{ fontSize: 11, color: "#dc2626", flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 42,
  },
  incomingWrap: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
    gap: 10,
  },
  incomingContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  incomingBtns: {
    flexDirection: "row",
    gap: 8,
  },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 38,
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 38,
  },
  waitingWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  spinnerDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  cancelCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeWrap: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 14,
  },
  endedWrap: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  callAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
});
