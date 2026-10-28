// src/components/video/InterviewCallButton.js
//
// Interview video call — 3-button widget:
//   • Start Interview Call  → opens the room in the system browser
//   • Message link          → opens chat with worker, pre-fills composer
//   • Copy link             → copies the room URL to clipboard
//
// Room id is deterministic from (jobPostId, workerId) so both parties
// always land in the same room.
//
// Ported from web src/components/video/InterviewCallButton.jsx.

import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useNavigation } from "@react-navigation/native";
import AppText from "../AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { FaVideo, FaCheck, FaLink, FaCommentDots } from "../../icons/fa";

const CALL_BASE_URL = "https://call.skilledproz.com";

function buildRoomId(jobPostId, workerId) {
  const safeJob = String(jobPostId || "").replace(/[^a-zA-Z0-9-]/g, "");
  const safeWorker = String(workerId || "").replace(/[^a-zA-Z0-9-]/g, "");
  return `interview-${safeJob}-${safeWorker}`.slice(0, 60);
}

export default function InterviewCallButton({
  jobPostId,
  workerId,
  workerName = "",
  jobTitle = "",
}) {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const c = theme.colors;
  const [copied, setCopied] = useState(false);

  if (!jobPostId || !workerId) return null;

  const roomId = buildRoomId(jobPostId, workerId);
  const roomUrl = `${CALL_BASE_URL}/${roomId}`;

  async function handleStart() {
    try {
      await Linking.openURL(roomUrl);
    } catch {}
  }

  async function handleCopy() {
    try {
      await Clipboard.setStringAsync(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleMessage() {
    const draft = [
      `Hi ${workerName || "there"},`,
      "",
      jobTitle
        ? `I'd like to do a quick video interview for "${jobTitle}".`
        : "I'd like to do a quick video interview.",
      "",
      `Join here when you're free: ${roomUrl}`,
      "",
      "— sent from SkilledProz",
    ].join("\n");

    navigation.navigate("Messages", {
      withUserId: workerId,
      draft,
    });
  }

  return (
    <View style={styles.wrap}>
      <Pressable onPress={handleStart} style={styles.startBtn} hitSlop={4}>
        <FaVideo size={13} color="#fff" />
        <AppText style={styles.startText}>Start Interview</AppText>
      </Pressable>

      <Pressable onPress={handleMessage} style={styles.messageBtn} hitSlop={4}>
        <FaCommentDots size={13} color="#f97316" />
        <AppText style={styles.messageText}>Message link</AppText>
      </Pressable>

      <Pressable onPress={handleCopy} style={styles.copyBtn} hitSlop={4}>
        {copied ? (
          <>
            <FaCheck size={13} color={c.text} />
            <AppText style={styles.copyText}>Copied</AppText>
          </>
        ) : (
          <>
            <FaLink size={13} color={c.text} />
            <AppText style={styles.copyText}>Copy link</AppText>
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexWrap: "wrap",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#f97316",
  },
  startText: { fontSize: 12, fontWeight: "700", color: "#fff" },
  messageBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(249,115,22,0.1)",
    borderWidth: 1,
    borderColor: "rgba(249,115,22,0.35)",
  },
  messageText: { fontSize: 12, fontWeight: "700", color: "#f97316" },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  copyText: { fontSize: 12, fontWeight: "700" },
});
