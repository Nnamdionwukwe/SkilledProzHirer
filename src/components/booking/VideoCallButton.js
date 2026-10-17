// src/components/booking/VideoCallButton.js
//
// Mirrors the website's VideoCallButton.jsx — polls for call state,
// accepts/declines/ends calls, and routes to the in-app VideoCallScreen
// when the call goes ACTIVE.
//
// Uses react-native-webview for the actual call room (MiroTalk iframe).

import React, { useEffect, useRef, useState } from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  FaVideo,
  FaCheckCircle,
  FaTimesCircle,
  FaPhoneSlash,
  FaSpinner,
  FaExclamationTriangle,
} from "../../icons/fa";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

const POLL_MS = 5000;

export default function VideoCallButton({
  bookingId,
  bookingStatus,
  userId,
  hirerId,
  workerId,
}) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const c = th.colors;

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigatedRef = useRef(false);
  const isInvolved = userId === hirerId || userId === workerId;
  const canCall =
    isInvolved &&
    ["PENDING", "ACCEPTED", "IN_PROGRESS"].includes(bookingStatus);

  // ── Initial fetch ────────────────────────────────────────────────────
  useEffect(() => {
    if (!canCall) return;
    client
      .get(`/video-calls/${bookingId}`)
      .then((r) => {
        if (r.data?.data?.call) setCall(r.data.data.call);
      })
      .catch(() => {});
  }, [bookingId, canCall]);

  // ── Navigate to VideoCallScreen when status becomes ACTIVE ───────────
  useEffect(() => {
    if (call?.status === "ACTIVE" && !navigatedRef.current) {
      navigatedRef.current = true;
      try {
        navigation.navigate("VideoCall", { bookingId });
      } catch {
        navigation.getParent()?.navigate("VideoCall", { bookingId });
      }
    }
  }, [call?.status, bookingId, navigation]);

  // ── Poll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!canCall) return;
    if (navigatedRef.current) return;
    if (call?.status === "ENDED" || call?.status === "DECLINED") return;

    const id = setInterval(async () => {
      try {
        const r = await client.get(`/video-calls/${bookingId}`);
        const updated = r.data?.data?.call;
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

  // ── Actions ──────────────────────────────────────────────────────────
  const handleInitiate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await client.post(`/video-calls/${bookingId}/initiate`);
      setCall(res.data?.data?.call);
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
      setCall(res.data?.data?.call);
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
    } finally {
      setLoading(false);
    }
  };

  if (!canCall) return null;

  // ── Incoming call ────────────────────────────────────────────────────
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
          <FaVideo size={22} color="#818cf8" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <AppText weight="bold" style={{ color: "#818cf8" }}>
              {t("booking.videoCall.incoming", {
                defaultValue: "Incoming Video Call",
              })}
            </AppText>
            <AppText variant="small" tone="dim">
              {t("booking.videoCall.incomingHint", {
                defaultValue: "Pre-job consultation",
              })}
            </AppText>
          </View>
        </View>
        <View style={styles.incomingBtns}>
          <Pressable
            onPress={handleAccept}
            disabled={loading}
            style={[
              styles.acceptBtn,
              { backgroundColor: "#16a34a", opacity: loading ? 0.6 : 1 },
            ]}
          >
            {loading ? (
              <FaSpinner size={12} color="#fff" />
            ) : (
              <>
                <FaCheckCircle size={12} color="#fff" />
                <AppText
                  variant="small"
                  weight="bold"
                  style={{ color: "#fff", marginLeft: 4 }}
                >
                  {t("booking.videoCall.accept", { defaultValue: "Accept" })}
                </AppText>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleDecline}
            disabled={loading}
            style={[
              styles.declineBtn,
              {
                backgroundColor: "rgba(220,38,38,0.1)",
                borderColor: "rgba(220,38,38,0.3)",
              },
            ]}
          >
            <FaTimesCircle size={12} color="#dc2626" />
            <AppText
              variant="small"
              weight="bold"
              style={{ color: "#dc2626", marginLeft: 4 }}
            >
              {t("booking.videoCall.decline", { defaultValue: "Decline" })}
            </AppText>
          </Pressable>
        </View>
        {error ? (
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FaExclamationTriangle size={11} color="#dc2626" />
            <AppText
              variant="small"
              style={{ color: "#dc2626", marginLeft: 4 }}
            >
              {error}
            </AppText>
          </View>
        ) : null}
      </View>
    );
  }

  // ── Waiting for answer ───────────────────────────────────────────────
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
        <FaSpinner size={14} color="#818cf8" />
        <AppText
          variant="small"
          weight="semibold"
          style={{ color: "#818cf8", flex: 1, marginLeft: 8 }}
        >
          {t("booking.videoCall.calling", {
            defaultValue: "Calling… waiting for answer",
          })}
        </AppText>
        <Pressable
          onPress={handleCancel}
          disabled={loading}
          style={[styles.cancelCallBtn, { borderColor: "rgba(220,38,38,0.3)" }]}
        >
          <FaTimesCircle size={10} color="#dc2626" />
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: "#dc2626", marginLeft: 4 }}
          >
            {t("booking.videoCall.cancel", { defaultValue: "Cancel" })}
          </AppText>
        </Pressable>
      </View>
    );
  }

  // ── Ended / declined ─────────────────────────────────────────────────
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
        <AppText variant="small" tone="dim" style={{ flex: 1, marginLeft: 8 }}>
          {call.status === "DECLINED"
            ? t("booking.videoCall.declined", { defaultValue: "Call declined" })
            : t("booking.videoCall.ended", { defaultValue: "Call ended" })}
        </AppText>
        <Pressable
          onPress={handleInitiate}
          disabled={loading}
          style={[
            styles.callBtn,
            { backgroundColor: "rgba(129,140,248,0.15)" },
          ]}
        >
          {loading ? (
            <FaSpinner size={12} color="#818cf8" />
          ) : (
            <>
              <FaVideo size={12} color="#818cf8" />
              <AppText
                variant="small"
                weight="bold"
                style={{ color: "#818cf8", marginLeft: 4 }}
              >
                {t("booking.videoCall.callAgain", {
                  defaultValue: "Call Again",
                })}
              </AppText>
            </>
          )}
        </Pressable>
      </View>
    );
  }

  // ── Idle ─────────────────────────────────────────────────────────────
  return (
    <View style={{ gap: 6 }}>
      <Pressable
        onPress={handleInitiate}
        disabled={loading}
        style={[
          styles.callBtn,
          {
            backgroundColor: "rgba(129,140,248,0.15)",
            borderColor: "rgba(129,140,248,0.3)",
            opacity: loading ? 0.5 : 1,
          },
        ]}
      >
        {loading ? (
          <FaSpinner size={13} color="#818cf8" />
        ) : (
          <>
            <FaVideo size={13} color="#818cf8" />
            <AppText
              variant="small"
              weight="bold"
              style={{ color: "#818cf8", marginLeft: 6 }}
            >
              {t("booking.videoCall.start")}
            </AppText>
          </>
        )}
      </Pressable>
      <AppText
        variant="small"
        tone="dim"
        style={{ fontSize: 11, textAlign: "center" }}
      >
        {t("booking.videoCall.hint", {
          defaultValue: "Start a video call before or during the job",
        })}
      </AppText>
      {error ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <FaExclamationTriangle size={11} color="#dc2626" />
          <AppText variant="small" style={{ color: "#dc2626", marginLeft: 4 }}>
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
  },
  incomingWrap: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
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
    paddingVertical: 9,
    borderRadius: 8,
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  waitingWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  endedWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    flexWrap: "wrap",
    gap: 8,
  },
});
