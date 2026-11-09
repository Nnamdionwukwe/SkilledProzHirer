// src/components/booking/VideoCallButton.js
//
// Booking-scoped video call. Uses /voice-calls/:conversationId/initiate
// (the working endpoint) and passes `returnTo` so the call screen knows
// where to navigate back when it ends.

import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";

export default function VideoCallButton({
  bookingId,
  bookingStatus,
  userId,
  hirerId,
  workerId,
  otherUserId,
  // ✅ NEW: where to return when the call ends
  returnTo = "BookingDetail",
  returnParams,
}) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  const startCall = async () => {
    if (!canCall || loading) return;
    setLoading(true);
    setError("");

    try {
      if (!otherUserId) throw new Error("Missing call recipient");

      // 1. Find or create conversation
      let conversationId = null;
      try {
        const res = await client.get("/messages/conversations", {
          params: { page: 1, limit: 100, _t: Date.now() },
        });
        const list = res.data?.data?.conversations || [];
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
          receiverId: otherUserId,
          content: "📞 Starting video call…",
        });
        conversationId = res.data?.data?.conversationId;
      }

      if (!conversationId) throw new Error("Could not establish conversation");

      // 2. Initiate call
      const callRes = await client.post(
        `/voice-calls/${conversationId}/initiate`,
        { callType: "video" },
      );

      if (!callRes?.data?.data?.call) {
        throw new Error("Call could not be initiated");
      }

      // 3. Navigate — pass returnTo so the screen knows where to go back
      navigation.navigate("VideoCall", {
        conversationId,
        returnTo,
        returnParams: returnParams || { bookingId },
      });
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Failed to start call",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!canCall) return null;

  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={startCall}
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
        {loading ? (
          <ActivityIndicator size="small" color="#818cf8" />
        ) : (
          <>
            <Ionicons name="videocam" size={13} color="#818cf8" />
            <AppText style={styles.callBtnText}>Video Call</AppText>
          </>
        )}
      </Pressable>
      <AppText style={[styles.hint, { color: c.textMuted }]}>
        Start a video call before or during the job
      </AppText>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="warning" size={10} color="#dc2626" />
          <AppText style={[styles.errorText, { flex: 1 }]}>{error}</AppText>
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
    gap: 6,
  },
  callBtnText: { fontSize: 13, fontWeight: "700", color: "#818cf8" },
  hint: { fontSize: 10, textAlign: "center" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  errorText: { fontSize: 11, color: "#dc2626" },
});
