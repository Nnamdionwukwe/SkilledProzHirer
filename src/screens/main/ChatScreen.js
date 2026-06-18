// src/screens/main/ChatScreen.js
// Endpoint: GET /messages/:conversationId
//           POST /messages
//           PATCH /messages/:conversationId/read
// Individual chat screen — mirrors website messaging UI exactly.

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import {
  getMessages,
  sendMessage,
  markConversationRead,
} from "../../api/messages";

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name = "") {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    : (parts[0]?.[0] ?? "?").toUpperCase();
}

function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateLabel(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== lastDate) {
      groups.push({
        type: "date",
        id: `date_${msg.id}`,
        label: fmtDateLabel(msg.createdAt),
      });
      lastDate = date;
    }
    groups.push({ type: "message", ...msg });
  }
  return groups;
}

// ── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ item, myId, receiverName, receiverAvatar, c }) {
  const isMine = item.senderId === myId;

  if (item.type === "date") {
    return (
      <View style={b.dateRow}>
        <View
          style={[
            b.datePill,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <AppText variant="small" style={{ color: c.textMuted }}>
            {item.label}
          </AppText>
        </View>
      </View>
    );
  }

  const isImage =
    item.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(item.fileUrl);

  return (
    <View style={[b.row, isMine ? b.rowMine : b.rowTheirs]}>
      {/* Other's avatar */}
      {!isMine && (
        <View
          style={[
            b.avatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {receiverAvatar ? (
            <Image source={{ uri: receiverAvatar }} style={b.avatarImg} />
          ) : (
            <AppText
              style={{ color: c.orange, fontWeight: "700", fontSize: 12 }}
            >
              {initials(receiverName)}
            </AppText>
          )}
        </View>
      )}

      <View
        style={[b.bubbleWrap, isMine ? b.bubbleWrapMine : b.bubbleWrapTheirs]}
      >
        {/* Sender name (theirs only) */}
        {!isMine && (
          <AppText
            style={{
              color: c.orange,
              fontWeight: "700",
              fontSize: 13,
              marginBottom: 4,
            }}
          >
            {receiverName}
          </AppText>
        )}

        {/* Bubble */}
        <View
          style={[
            b.bubble,
            isMine
              ? [b.bubbleMine, { backgroundColor: c.orange }]
              : [
                  b.bubbleTheirs,
                  { backgroundColor: c.bgCard, borderColor: c.border },
                ],
          ]}
        >
          {/* File / image */}
          {item.fileUrl && isImage && (
            <Image
              source={{ uri: item.fileUrl }}
              style={b.msgImage}
              resizeMode="cover"
            />
          )}
          {item.fileUrl && !isImage && (
            <Pressable
              onPress={() => Linking.openURL(item.fileUrl)}
              style={b.fileChip}
            >
              <AppText style={{ fontSize: 18 }}>📎</AppText>
              <AppText
                variant="small"
                style={{ color: isMine ? "#fff" : c.text, marginLeft: 6 }}
              >
                View attachment
              </AppText>
            </Pressable>
          )}

          {/* Text */}
          {!!item.content &&
            item.content !== "[Image]" &&
            item.content !== "[Video]" && (
              <AppText
                style={{
                  color: isMine ? "#fff" : c.text,
                  fontSize: 16,
                  lineHeight: 22,
                }}
              >
                {item.content}
              </AppText>
            )}

          {/* Time + ticks */}
          <View style={b.meta}>
            <AppText
              style={[
                b.time,
                { color: isMine ? "rgba(255,255,255,0.65)" : c.textMuted },
              ]}
            >
              {fmtTime(item.createdAt)}
            </AppText>
            {isMine && (
              <AppText
                style={{
                  color: "rgba(255,255,255,0.65)",
                  fontSize: 11,
                  marginLeft: 4,
                }}
              >
                {item.isRead ? "✓✓" : "✓✓"}
              </AppText>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function ChatScreen({ navigation, route }) {
  const { conversationId, receiverId, receiverName, receiverAvatar } =
    route?.params ?? {};
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const [convoId, setConvoId] = useState(conversationId ?? null);
  const flatRef = useRef(null);

  const load = useCallback(async () => {
    if (!convoId) {
      setLoading(false);
      return;
    }
    try {
      const msgs = await getMessages(convoId, { limit: 50 });
      setMessages(msgs);
      // Mark as read
      markConversationRead(convoId).catch(() => {});
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
    }
  }, [convoId]);

  useEffect(() => {
    load();
  }, [convoId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const result = await sendMessage({
        receiverId,
        content,
        conversationId: convoId,
      });
      if (!convoId && result?.conversationId) setConvoId(result.conversationId);
      // Optimistically add
      setMessages((prev) => [
        ...prev,
        {
          id: result?.message?.id ?? `tmp_${Date.now()}`,
          senderId: user?.id,
          receiverId,
          content,
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      ]);
    } catch {
      toast.error(t("toast.unknownError"));
      setText(content); // restore on failure
    } finally {
      setSending(false);
    }
  };

  const pickAttachment = async () => {
    Alert.alert("Attach", "Choose type", [
      {
        text: "Photo Library",
        onPress: async () => {
          const { status } =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== "granted") {
            toast.error("Permission denied");
            return;
          }
          const r = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
          if (!r.canceled && r.assets[0]) {
            const a = r.assets[0];
            sendFile({
              uri: a.uri,
              name: a.fileName ?? "photo.jpg",
              mimeType: "image/jpeg",
            });
          }
        },
      },
      {
        text: "Camera",
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== "granted") {
            toast.error("Permission denied");
            return;
          }
          const r = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!r.canceled && r.assets[0]) {
            const a = r.assets[0];
            sendFile({
              uri: a.uri,
              name: "camera.jpg",
              mimeType: "image/jpeg",
            });
          }
        },
      },
      {
        text: "File",
        onPress: async () => {
          const r = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
          });
          if (!r.canceled && r.assets[0]) sendFile(r.assets[0]);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const sendFile = async (file) => {
    setSending(true);
    try {
      const result = await sendMessage({
        receiverId,
        file,
        conversationId: convoId,
      });
      if (!convoId && result?.conversationId) setConvoId(result.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: result?.message?.id ?? `tmp_${Date.now()}`,
          senderId: user?.id,
          receiverId,
          content: result?.message?.content ?? "[File]",
          fileUrl: result?.message?.fileUrl ?? null,
          createdAt: new Date().toISOString(),
          isRead: false,
        },
      ]);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setSending(false);
    }
  };

  const grouped = groupByDate(messages);

  return (
    <KeyboardAvoidingView
      style={[s.screen, { backgroundColor: c.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* ── Chat header ── */}
      <View
        style={[
          s.chatHeader,
          { backgroundColor: c.bg, borderBottomColor: c.border },
        ]}
      >
        <Pressable
          onPress={() => navigation.navigate("Messages")}
          style={s.backBtn}
          hitSlop={10}
        >
          <AppText style={{ color: c.text, fontSize: 22 }}>←</AppText>
        </Pressable>
        <View
          style={[
            s.headerAvatar,
            { backgroundColor: c.orangeDim, borderColor: c.border },
          ]}
        >
          {receiverAvatar ? (
            <Image source={{ uri: receiverAvatar }} style={s.headerAvatarImg} />
          ) : (
            <AppText
              style={{ color: c.orange, fontWeight: "700", fontSize: 14 }}
            >
              {initials(receiverName ?? "")}
            </AppText>
          )}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <AppText variant="body" weight="semibold" style={{ color: c.text }}>
            {receiverName}
          </AppText>
          <AppText variant="small" style={{ color: c.textMuted }}>
            {t("messages.directMessage")}
          </AppText>
        </View>
        <Pressable
          onPress={() =>
            navigation.navigate("WorkerProfile", { userId: receiverId })
          }
        >
          <AppText
            variant="small"
            weight="semibold"
            style={{ color: c.orange }}
          >
            {t("messages.viewProfile")}
          </AppText>
        </Pressable>
      </View>

      {/* ── Messages ── */}
      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={s.loadWrap}>
            <ActivityIndicator size="large" color={c.orange} />
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={grouped}
            keyExtractor={(item) => item.id ?? item.type + item.createdAt}
            contentContainerStyle={s.msgList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatRef.current?.scrollToEnd({ animated: false })
            }
            renderItem={({ item }) => (
              <MessageBubble
                item={item}
                myId={user?.id}
                receiverName={receiverName ?? ""}
                receiverAvatar={receiverAvatar}
                c={c}
              />
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <AppText style={{ fontSize: 44 }}>💬</AppText>
                <AppText
                  variant="body"
                  weight="semibold"
                  style={{ color: c.text, marginTop: 12 }}
                >
                  {t("messages.noMessages")}
                </AppText>
                <AppText
                  variant="small"
                  style={{
                    color: c.textMuted,
                    marginTop: 6,
                    textAlign: "center",
                  }}
                >
                  {t("messages.noMessagesSub")}
                </AppText>
              </View>
            }
          />
        )}
      </View>

      {/* ── Divider ── */}
      <View style={[s.inputDivider, { backgroundColor: c.border }]} />

      {/* ── Attachment buttons ── */}
      <View style={[s.attachRow, { backgroundColor: c.bg }]}>
        {[{ emoji: "📎", onPress: pickAttachment }].map((btn, i) => (
          <Pressable
            key={i}
            onPress={btn.onPress}
            style={[
              s.attachBtn,
              { backgroundColor: c.bgCard, borderColor: c.border },
            ]}
          >
            <AppText style={{ fontSize: 20 }}>{btn.emoji}</AppText>
          </Pressable>
        ))}
      </View>

      {/* ── Input row ── */}
      <View
        style={[
          s.inputRow,
          { backgroundColor: c.bg, borderTopColor: c.border },
        ]}
      >
        <View
          style={[
            s.inputWrap,
            { backgroundColor: c.bgCard, borderColor: c.border },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t("messages.typeMessage")}
            placeholderTextColor={c.textMuted}
            style={[s.input, { color: c.text }]}
            multiline
            maxLength={2000}
            returnKeyType="default"
          />
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || sending}
            style={[
              s.sendBtn,
              {
                backgroundColor: text.trim() ? c.orange : c.bgInput,
                opacity: sending ? 0.7 : 1,
              },
            ]}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <AppText
                style={{
                  color: text.trim() ? "#fff" : c.textMuted,
                  fontSize: 18,
                  lineHeight: 24,
                }}
              >
                ▶
              </AppText>
            )}
          </Pressable>
        </View>
      </View>

      {/* Hint */}
      <View style={[s.hintRow, { backgroundColor: c.bg }]}>
        <AppText
          variant="small"
          style={{ color: c.textMuted, textAlign: "center" }}
        >
          Enter to send · Shift+Enter for new line
        </AppText>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen: { flex: 1 },

  // Header
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { marginRight: 10 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  headerAvatarImg: { width: 40, height: 40 },

  // Messages
  loadWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  msgList: { padding: 16, paddingBottom: 8, gap: 4 },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },

  // Input
  inputDivider: { height: StyleSheet.hairlineWidth },
  attachRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  input: { flex: 1, fontSize: 16, maxHeight: 120, lineHeight: 22 },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  hintRow: { paddingBottom: 8, paddingTop: 2 },
});

// Bubble styles
const b = StyleSheet.create({
  row: { flexDirection: "row", marginVertical: 3, alignItems: "flex-end" },
  rowMine: { justifyContent: "flex-end" },
  rowTheirs: { justifyContent: "flex-start" },

  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 8,
    marginBottom: 2,
  },
  avatarImg: { width: 34, height: 34 },

  bubbleWrap: { maxWidth: "75%" },
  bubbleWrapMine: { alignItems: "flex-end" },
  bubbleWrapTheirs: { alignItems: "flex-start" },

  bubble: { borderRadius: 18, padding: 12, paddingBottom: 8 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: {
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: 4,
  },

  msgImage: { width: 200, height: 150, borderRadius: 10, marginBottom: 4 },
  fileChip: { flexDirection: "row", alignItems: "center", marginBottom: 4 },

  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  time: { fontSize: 11 },

  dateRow: { alignItems: "center", marginVertical: 12 },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
});
