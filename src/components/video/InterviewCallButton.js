// src/components/video/InterviewCallButton.js
//
// Mobile equivalent of the web's InterviewCallButton.jsx.
//
// On "Start Interview":
//   1. POST /jobs/applications/:applicationId/call
//   2. Navigate to InterviewCallRoom with { applicationId, jobPostId }
//
// On "Message link":
//   Opens (or creates) a chat with the worker, prefilled with a friendly
//   invitation. No room URL is included — the room only exists once the
//   call is actually started.
//
// Both buttons are disabled while a request is in flight so double-tap
// can't fire two calls.

import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import client from "../../api/client";
import { FaVideo, FaCommentDots } from "../../icons/fa";

export default function InterviewCallButton({
  applicationId,
  jobPostId,
  workerId,
  workerName = "",
  jobTitle = "",
  // Optional override — when rendered outside a screen that has a
  // navigation prop, the caller can pass it explicitly.
  navigation: navigationProp,
}) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const navigationHook = useNavigation();
  const navigation = navigationProp || navigationHook;
  const c = theme.colors;

  const [creating, setCreating] = useState(false);
  const [messageing, setMessageing] = useState(false);
  const [error, setError] = useState("");

  // ── Start Interview ────────────────────────────────────────────────
  async function handleStartInterview() {
    if (!applicationId) {
      setError(
        t(
          "jobApplications.interview.missingApplication",
          "Missing application ID",
        ),
      );
      return;
    }
    setCreating(true);
    setError("");
    try {
      // 1. Create/reuse the interview VideoCall row on the backend.
      //    Same endpoint the web uses. It emits video-call:incoming to
      //    the worker, so their mobile VideoCallBanner picks it up.
      await client.post(`/jobs/applications/${applicationId}/call`);

      // 2. Navigate into the interview room.
      navigation.navigate("InterviewCallRoom", {
        applicationId,
        jobPostId,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t(
            "jobApplications.interview.startFailed",
            "Failed to start interview.",
          ),
      );
    } finally {
      setCreating(false);
    }
  }

  // ── Message link ───────────────────────────────────────────────────
  async function handleMessageLink() {
    if (!workerId) return;
    setMessageing(true);
    setError("");
    try {
      // Find or create a conversation with the worker.
      let conversationId = null;
      try {
        const res = await client.get("/messages/conversations", {
          params: { page: 1, limit: 100, _t: Date.now() },
        });
        const list = res.data?.data?.conversations || [];
        const peerIdStr = String(workerId);
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
          receiverId: workerId,
          content: t("jobApplications.interview.chatSeed", {
            jobTitle: jobTitle || t("jobApplications.interview.theRole"),
            defaultValue: `Hi! I'd like to schedule a quick video interview for "${jobTitle}".`,
          }),
        });
        conversationId = res.data?.data?.conversationId;
      }

      const prefill = t("jobApplications.interview.messageBodyNoUrl", {
        workerName: workerName || t("jobApplications.interview.there"),
        jobTitle: jobTitle || t("jobApplications.interview.theRole"),
        defaultValue: `Hi ${workerName || "there"},\n\nI'd like to do a quick video interview for "${jobTitle}".\n\n— sent from SkilledProz`,
      });

      navigation.navigate("Chat", {
        conversationId,
        withUserId: workerId,
        prefillMessage: prefill,
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          t("jobApplications.interview.chatFailed", "Could not open chat."),
      );
      toast.error(
        t("jobApplications.interview.chatFailed", "Could not open chat."),
      );
    } finally {
      setMessageing(false);
    }
  }

  const busy = creating || messageing;

  return (
    <View style={styles.wrap}>
      <View style={styles.buttonRow}>
        {/* Start Interview */}
        <Pressable
          onPress={handleStartInterview}
          disabled={busy}
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: c.orange,
              opacity: creating ? 0.6 : pressed ? 0.9 : 1,
            },
          ]}
        >
          {creating ? (
            <ActivityIndicator size="small" color={c.bg} />
          ) : (
            <View style={styles.btnInner}>
              <FaVideo size={12} color={c.bg} />
              <AppText style={[styles.primaryLabel, { color: c.bg }]}>
                {t("jobApplications.interview.startCta", "Start Interview")}
              </AppText>
            </View>
          )}
        </Pressable>

        {/* Message link */}
        <Pressable
          onPress={handleMessageLink}
          disabled={busy}
          style={({ pressed }) => [
            styles.secondaryBtn,
            {
              borderColor: c.orangeGlow || c.orange,
              backgroundColor: c.orangeDim || "rgba(249,115,22,0.12)",
              opacity: messageing ? 0.6 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {messageing ? (
            <ActivityIndicator size="small" color={c.orange} />
          ) : (
            <View style={styles.btnInner}>
              <FaCommentDots size={11} color={c.orange} />
              <AppText style={[styles.secondaryLabel, { color: c.orange }]}>
                {t("jobApplications.interview.messageLinkCta", "Message link")}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {error ? (
        <AppText
          style={{
            fontSize: 10,
            color: c.red,
            marginTop: 4,
          }}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  btnInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    minWidth: 120,
    minHeight: 36,
  },
  primaryLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 5,
  },
});
