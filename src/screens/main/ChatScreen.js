// src/screens/main/ChatScreen.js
//
// Chat pane. Tick states:
//   • msg.pending             → one grey tick (uploading to server)
//   • msg.delivered === true  → two grey ticks (receiver's app fetched it)
//   • msg.isRead === true     → two blue ticks (receiver opened the chat)
//
// If the backend doesn't send `delivered`, two grey never renders — the
// message goes straight from one grey to two blue when the receiver reads.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Video } from "expo-av";
import AppText from "../../components/AppText";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import { useVoiceCall } from "../../contexts/VoiceCallContext";
import client from "../../api/client";
import {
  FaArrowLeft,
  FaPaperclip,
  FaSend,
  FaSmile,
  FaGlobe,
  FaX,
  FaCheck,
  FaPhone,
  FaVideo,
  FaChevronDown,
} from "../../icons/fa";

const MSG_POLL_MS = 3000;

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "es", label: "Spanish" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "hi", label: "Hindi" },
  { code: "bn", label: "Bengali" },
  { code: "ur", label: "Urdu" },
  { code: "tr", label: "Turkish" },
  { code: "ko", label: "Korean" },
  { code: "ja", label: "Japanese" },
  { code: "ru", label: "Russian" },
  { code: "id", label: "Indonesian" },
  { code: "vi", label: "Vietnamese" },
];

const URL_REGEX =
  /((?:https?:\/\/|www\.)[^\s<>()"']+[^\s<>()"'.,;:!?]|\b(?:call|api|app)\.skilledproz\.com\/[^\s<>()"',;!?]+)/gi;

function linkify(text) {
  if (!text || typeof text !== "string") return [{ text }];
  if (!/https?:\/\/|www\.|\.skilledproz\.com/i.test(text)) {
    return [{ text }];
  }
  const parts = [];
  let lastIndex = 0;
  let match;
  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const start = match.index;
    const end = URL_REGEX.lastIndex;
    if (start > lastIndex) parts.push({ text: text.slice(lastIndex, start) });
    const url = match[0];
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    parts.push({ text: url, url: href });
    lastIndex = end;
  }
  if (lastIndex < text.length) parts.push({ text: text.slice(lastIndex) });
  return parts;
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ── Tick states ────────────────────────────────────────────────────────
// pending      → one grey check
// !pending
//   !read & delivered  → two grey checks
//   read               → two blue checks
//   !pending & !read & !delivered → one grey check (delivered unknown)
function Ticks({ pending, delivered, read, color }) {
  const grey = "rgba(255,255,255,0.55)";
  const baseColor = color || grey;
  const blue = "#3b82f6";

  if (pending) {
    // One check — message queued/sending
    return (
      <View style={{ flexDirection: "row", marginLeft: 4 }}>
        <FaCheck size={10} color={baseColor} style={{ opacity: 0.85 }} />
      </View>
    );
  }

  if (read) {
    // Two blue checks — message read by receiver
    return (
      <View style={{ flexDirection: "row", marginLeft: 4 }}>
        <FaCheck size={10} color={blue} style={{ opacity: 0.95 }} />
        <FaCheck
          size={10}
          color={blue}
          style={{ opacity: 0.95, marginLeft: -3 }}
        />
      </View>
    );
  }

  if (delivered) {
    // Two grey checks — receiver's client has fetched the message
    return (
      <View style={{ flexDirection: "row", marginLeft: 4 }}>
        <FaCheck size={10} color={baseColor} style={{ opacity: 0.85 }} />
        <FaCheck
          size={10}
          color={baseColor}
          style={{ opacity: 0.85, marginLeft: -3 }}
        />
      </View>
    );
  }

  // Sent, delivered unknown — one grey check
  return (
    <View style={{ flexDirection: "row", marginLeft: 4 }}>
      <FaCheck size={10} color={baseColor} style={{ opacity: 0.85 }} />
    </View>
  );
}

function TranslateButton({ text }) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  async function translate(langCode) {
    setShowPicker(false);
    setLoading(true);
    try {
      const res = await client.post("/translate", {
        text,
        targetLang: langCode,
      });
      setTranslated(res.data.data.translated);
    } catch {
      setTranslated("Translation failed.");
    } finally {
      setLoading(false);
    }
  }

  if (translated) {
    return (
      <View
        style={{
          marginTop: 6,
          paddingHorizontal: 10,
          paddingVertical: 6,
          backgroundColor: "rgba(59,130,246,0.08)",
          borderWidth: 1,
          borderColor: "rgba(59,130,246,0.2)",
          borderRadius: 8,
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        <AppText
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: "#60a5fa",
            marginTop: 1,
          }}
        >
          Translated:
        </AppText>
        <AppText style={{ flex: 1, fontSize: 12, color: "#93c5fd" }}>
          {translated}
        </AppText>
        <Pressable onPress={() => setTranslated(null)} hitSlop={4}>
          <FaX size={11} color="#60a5fa" />
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 4 }}>
      <Pressable onPress={() => setShowPicker(true)} disabled={loading}>
        <AppText style={{ fontSize: 11, color: c.textDim, opacity: 0.7 }}>
          {loading ? "…" : <FaGlobe size={12} color={c.textDim} />}
        </AppText>
      </Pressable>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "center",
          }}
          onPress={() => setShowPicker(false)}
        >
          <View
            style={{
              margin: 24,
              backgroundColor: c.bgPanel,
              borderRadius: 14,
              padding: 8,
              borderWidth: 1,
              borderColor: c.border,
              maxHeight: "70%",
            }}
          >
            <FlatList
              data={LANGUAGES}
              keyExtractor={(l) => l.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => translate(item.code)}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: pressed ? c.bgCard : "transparent",
                  })}
                >
                  <AppText style={{ fontSize: 13, color: c.text }}>
                    {item.label}
                  </AppText>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function Avatar({ user, size = 28 }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "rgba(249,115,22,0.15)",
        borderWidth: 1,
        borderColor: "rgba(249,115,22,0.3)",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {user?.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <AppText
          style={{ fontSize: size * 0.36, fontWeight: "700", color: "#f97316" }}
        >
          {initials || "?"}
        </AppText>
      )}
    </View>
  );
}

function SkeletonBubble({ c, mine }) {
  return (
    <View
      style={{
        flexDirection: mine ? "row-reverse" : "row",
        alignItems: "flex-end",
        gap: 6,
        marginBottom: 10,
      }}
    >
      <View
        style={{
          width: mine ? 0 : 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: mine ? "transparent" : c.bgCard,
          marginRight: mine ? 0 : 6,
        }}
      />
      <View
        style={{
          width: mine ? "55%" : "65%",
          height: 36,
          borderRadius: 16,
          backgroundColor: c.bgCard,
          borderWidth: 1,
          borderColor: c.border,
          opacity: 0.6,
        }}
      />
    </View>
  );
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const c = theme.colors;
  const { startCall, call: activeCall } = useVoiceCall();
  const isOnCall = !!activeCall;

  const initialConvoId = route.params?.conversationId || null;
  const initialWithId = route.params?.withUserId || null;
  const initialDraft = route.params?.draft || "";

  const [activeConvoId, setActiveConvoId] = useState(initialConvoId);
  const [withUserId, setWithUserId] = useState(initialWithId);
  const [withUser, setWithUser] = useState(null);
  const [convoMeta, setConvoMeta] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState(initialDraft);
  const [sending, setSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [pendingCallType, setPendingCallType] = useState(null);
  const [startingCall, setStartingCall] = useState(false);
  const [showJump, setShowJump] = useState(false);

  const listRef = useRef(null);
  const pollRef = useRef(null);
  const initiatingRef = useRef(false);
  const lastIdRef = useRef(null);
  const markingReadRef = useRef(false);

  const activeOther = useMemo(() => {
    if (convoMeta) {
      return convoMeta.users?.find((u) => u.userId !== user?.id)?.user || null;
    }
    return withUser || null;
  }, [convoMeta, withUser, user?.id]);

  useEffect(() => {
    if (!activeConvoId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get("/messages/conversations", {
          params: { page: 1, limit: 100, _t: Date.now() },
        });
        const list = res.data.data.conversations || [];
        const convo = list.find((x) => x.id === activeConvoId);
        if (!cancelled) setConvoMeta(convo || null);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [activeConvoId]);

  useEffect(() => {
    if (!withUserId) {
      setWithUser(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get(`/users/${withUserId}`);
        const data = res.data.data;
        const u = data?.user || data?.profile?.user || data?.profile || data;
        if (!cancelled && u?.id) setWithUser(u);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [withUserId]);

  const markRead = useCallback((convoId) => {
    if (!convoId || markingReadRef.current) return;
    markingReadRef.current = true;
    client
      .patch(`/messages/${convoId}/read`)
      .catch(() => {})
      .finally(() => {
        markingReadRef.current = false;
      });
  }, []);

  const loadMessages = useCallback(
    async (convoId, silent = false) => {
      if (!convoId) return;
      if (!silent) setLoadingMessages(true);
      try {
        const res = await client.get(`/messages/${convoId}`, {
          params: { page: 1, limit: 100, _t: Date.now() },
        });
        const msgs = res.data.data.messages || [];

        // Auto-mark unread from other as read on every poll
        const hasUnreadFromOther = msgs.some(
          (m) => m.senderId !== user?.id && !m.isRead,
        );
        if (hasUnreadFromOther) markRead(convoId);

        setMessages(msgs);
      } catch {
        if (!silent) setMessages([]);
      }
      if (!silent) setLoadingMessages(false);
    },
    [user?.id, markRead],
  );

  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    loadMessages(activeConvoId);
    markRead(activeConvoId);

    clearInterval(pollRef.current);
    pollRef.current = setInterval(
      () => loadMessages(activeConvoId, true),
      MSG_POLL_MS,
    );
    return () => clearInterval(pollRef.current);
  }, [activeConvoId, loadMessages, markRead]);

  useEffect(() => {
    if (messages.length === 0) {
      lastIdRef.current = null;
      return;
    }
    const newestId = messages[messages.length - 1]?.id;
    if (newestId && newestId !== lastIdRef.current) {
      lastIdRef.current = newestId;
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages]);

  useEffect(() => {
    if (sendingMessage) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [sendingMessage]);

  const resolveReceiver = () => {
    if (activeOther?.id) return activeOther.id;
    if (withUserId) return withUserId;
    return null;
  };

  const handleSend = async () => {
    const content = newMessage.trim();
    if (!content || sending) return;
    const receiverId = resolveReceiver();
    if (!receiverId) return;

    const tempId = `temp-${Date.now()}`;
    setSendingMessage({
      id: tempId,
      senderId: user?.id,
      receiverId,
      content,
      createdAt: new Date().toISOString(),
      pending: true,
    });
    setNewMessage("");
    setSending(true);

    try {
      const res = await client.post("/messages", {
        receiverId,
        content,
        conversationId: activeConvoId || undefined,
      });
      const { message, conversationId } = res.data.data;
      setSendingMessage(null);
      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        setWithUserId(null);
        setWithUser(null);
        loadMessages(conversationId);
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    } catch {
      setSendingMessage(null);
    } finally {
      setSending(false);
    }
  };

  const uploadAsset = async (asset) => {
    const receiverId = resolveReceiver();
    if (!receiverId || !asset?.uri) return;

    setUploadingFile(true);
    try {
      const fd = new FormData();
      fd.append("file", {
        uri: asset.uri,
        name: asset.fileName || `upload-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });
      fd.append("receiverId", receiverId);
      fd.append("content", asset.fileName || "Attachment");
      if (activeConvoId) fd.append("conversationId", activeConvoId);

      const res = await client.post("/messages", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { message, conversationId } = res.data.data;
      if (!activeConvoId || conversationId !== activeConvoId) {
        setActiveConvoId(conversationId);
        setWithUserId(null);
        setWithUser(null);
        loadMessages(conversationId);
      } else {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    } catch {
    } finally {
      setUploadingFile(false);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await uploadAsset(result.assets[0]);
  };

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Camera permission",
        "SkilledProz needs camera access to take live photos.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await uploadAsset(result.assets[0]);
  };

  const handlePickFile = () => {
    Alert.alert("Send attachment", "Choose a source", [
      { text: "Take Photo", onPress: pickFromCamera },
      { text: "Choose from Library", onPress: pickFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const confirmStartCall = async () => {
    const callType = pendingCallType;
    setPendingCallType(null);
    if (!callType || !activeConvoId) return;
    if (isOnCall) return;
    if (initiatingRef.current) return;

    initiatingRef.current = true;
    setStartingCall(true);
    try {
      const res = await client.post(`/voice-calls/${activeConvoId}/initiate`, {
        callType,
      });
      if (callType === "voice") {
        startCall(res.data.data.call);
      } else {
        navigation.navigate("VideoCall", { conversationId: activeConvoId });
      }
    } catch (err) {
      Alert.alert(
        "Call failed",
        err.response?.data?.message || "Could not start call.",
      );
    } finally {
      setStartingCall(false);
      setTimeout(() => {
        initiatingRef.current = false;
      }, 3000);
    }
  };

  const handleScroll = (e) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    setShowJump(distanceFromBottom > 200);
  };

  const grouped = useMemo(() => {
    const out = [];
    let lastDate = null;
    for (const m of messages) {
      const dateKey = new Date(m.createdAt).toDateString();
      if (dateKey !== lastDate) {
        out.push({ type: "divider", date: m.createdAt, key: `d-${dateKey}` });
        lastDate = dateKey;
      }
      out.push({ type: "msg", msg: m, key: `m-${m.id}` });
    }
    if (sendingMessage) {
      out.push({
        type: "msg",
        msg: sendingMessage,
        key: `m-${sendingMessage.id}`,
      });
    }
    return out;
  }, [messages, sendingMessage]);

  const otherProfileUrl = activeOther
    ? activeOther.role === "WORKER"
      ? `WorkerProfile:${activeOther.id}`
      : `HirerProfile:${activeOther.id}`
    : null;

  const renderItem = ({ item }) => {
    if (item.type === "divider") {
      return (
        <View style={{ alignItems: "center", marginVertical: 12 }}>
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              textTransform: "uppercase",
              letterSpacing: 0.6,
            }}
          >
            {formatDateDivider(item.date)}
          </AppText>
        </View>
      );
    }

    const msg = item.msg;
    const isMine = msg.senderId === user?.id;
    const isImage =
      msg.fileUrl &&
      (msg.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
        msg.fileUrl.includes("image"));
    const isVideo =
      msg.fileUrl &&
      (msg.fileUrl.match(/\.(mp4|mov|webm)$/i) ||
        msg.fileUrl.includes("video"));

    return (
      <View
        style={{
          flexDirection: isMine ? "row-reverse" : "row",
          alignItems: "flex-end",
          gap: 6,
          marginBottom: 4,
        }}
      >
        {!isMine && (
          <View style={{ width: 28, alignItems: "center" }}>
            <Avatar user={msg.sender} size={28} />
          </View>
        )}
        <View
          style={{
            maxWidth: "72%",
            paddingVertical: 8,
            paddingHorizontal: 12,
            borderRadius: 16,
            backgroundColor: isMine ? c.orange : c.bgPanel,
            borderWidth: isMine ? 0 : 1,
            borderColor: c.border,
            opacity: msg.pending ? 0.6 : 1,
          }}
        >
          {!isMine && msg.sender && (
            <AppText
              style={{
                fontSize: 10,
                fontWeight: "700",
                color: c.orange,
                marginBottom: 3,
              }}
            >
              {msg.sender.firstName} {msg.sender.lastName}
            </AppText>
          )}

          {isImage && (
            <Pressable onPress={() => setLightboxSrc(msg.fileUrl)}>
              <Image
                source={{ uri: msg.fileUrl }}
                style={{
                  width: 220,
                  height: 220,
                  borderRadius: 10,
                  marginBottom: 4,
                }}
                resizeMode="cover"
              />
            </Pressable>
          )}

          {isVideo && (
            <Video
              source={{ uri: msg.fileUrl }}
              useNativeControls
              style={{
                width: 240,
                height: 160,
                borderRadius: 10,
                marginBottom: 4,
              }}
              resizeMode="contain"
            />
          )}

          {msg.fileUrl && !isImage && !isVideo && (
            <Pressable
              onPress={() => Linking.openURL(msg.fileUrl)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                padding: 8,
                backgroundColor: "rgba(0,0,0,0.15)",
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <FaPaperclip size={13} color={isMine ? c.bg : c.text} />
              <AppText
                style={{ fontSize: 12, color: isMine ? c.bg : c.text }}
                numberOfLines={1}
              >
                {msg.content || "Attachment"}
              </AppText>
            </Pressable>
          )}

          {(!msg.fileUrl || (!isImage && !isVideo)) && (
            <AppText
              style={{
                fontSize: 14,
                lineHeight: 20,
                color: isMine ? c.bg : c.text,
              }}
            >
              {linkify(msg.content).map((part, idx) =>
                part.url ? (
                  <AppText
                    key={idx}
                    onPress={() => Linking.openURL(part.url)}
                    style={{
                      color: isMine ? "#fff" : c.orange,
                      textDecorationLine: "underline",
                      fontWeight: "500",
                    }}
                  >
                    {part.text}
                  </AppText>
                ) : (
                  <AppText key={idx}>{part.text}</AppText>
                ),
              )}
            </AppText>
          )}

          {!isMine && msg.content && !isImage && !isVideo && (
            <TranslateButton text={msg.content} />
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
              marginTop: 2,
            }}
          >
            <AppText
              style={{
                fontSize: 10,
                color: isMine ? "rgba(8,8,16,0.6)" : c.textMuted,
                fontStyle: msg.pending ? "italic" : "normal",
              }}
            >
              {msg.pending ? "sending…" : formatTime(msg.createdAt)}
            </AppText>
            {isMine && (
              <Ticks
                pending={!!msg.pending}
                delivered={!!msg.delivered}
                read={!!msg.isRead}
                color={
                  msg.pending
                    ? "rgba(8,8,16,0.5)"
                    : msg.isRead
                      ? "#3b82f6"
                      : "rgba(8,8,16,0.6)"
                }
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.bg }}
      edges={["top", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: c.border,
            backgroundColor: c.bgPanel,
          }}
        >
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <FaArrowLeft size={18} color={c.textDim} />
          </Pressable>
          {activeOther && <Avatar user={activeOther} size={34} />}
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              numberOfLines={1}
              style={{ fontSize: 14, fontWeight: "600", color: c.text }}
            >
              {activeOther?.firstName} {activeOther?.lastName}
            </AppText>
            <AppText
              numberOfLines={1}
              style={{ fontSize: 11, color: c.textDim }}
            >
              {convoMeta?.booking?.title || "Direct message"}
            </AppText>
          </View>
          {otherProfileUrl && (
            <Pressable
              onPress={() => {
                const [screen, id] = otherProfileUrl.split(":");
                navigation.navigate(screen, { userId: id });
              }}
              hitSlop={8}
            >
              <AppText
                style={{ fontSize: 11, fontWeight: "600", color: c.orange }}
              >
                Profile →
              </AppText>
            </Pressable>
          )}
        </View>

        <View style={{ flex: 1, position: "relative" }}>
          {loadingMessages ? (
            <View style={{ flex: 1, padding: 16 }}>
              {[
                { mine: false },
                { mine: false },
                { mine: true },
                { mine: false },
                { mine: true },
                { mine: true },
                { mine: false },
              ].map((b, i) => (
                <SkeletonBubble key={i} c={c} mine={b.mine} />
              ))}
            </View>
          ) : messages.length === 0 && !sendingMessage ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}
            >
              <FaSmile size={36} color={c.textMuted} />
              <AppText
                style={{
                  fontSize: 14,
                  color: c.textDim,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                Start the conversation
              </AppText>
              <AppText
                style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}
              >
                Say hello to get things started
              </AppText>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={grouped}
              keyExtractor={(it) => it.key}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
              onScroll={handleScroll}
              scrollEventThrottle={100}
              onContentSizeChange={() => {
                if (messages.length > 0) {
                  listRef.current?.scrollToEnd({ animated: false });
                }
              }}
            />
          )}

          {showJump && (
            <Pressable
              onPress={() => {
                listRef.current?.scrollToEnd({ animated: true });
                setShowJump(false);
              }}
              style={{
                position: "absolute",
                bottom: 16,
                right: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: c.bgPanel,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FaChevronDown size={18} color={c.text} />
            </Pressable>
          )}
        </View>

        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
            backgroundColor: c.bgPanel,
            paddingHorizontal: 12,
            paddingTop: 8,
            paddingBottom: 8,
          }}
        >
          <View style={{ flexDirection: "row", gap: 4, paddingBottom: 6 }}>
            <Pressable
              onPress={handlePickFile}
              disabled={uploadingFile}
              style={[
                styles.toolBtn,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
              hitSlop={4}
            >
              {uploadingFile ? (
                <ActivityIndicator size="small" color={c.textDim} />
              ) : (
                <FaPaperclip size={14} color={c.textDim} />
              )}
            </Pressable>
            <Pressable
              onPress={() => !isOnCall && setPendingCallType("voice")}
              disabled={!activeConvoId || startingCall || isOnCall}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  opacity: !activeConvoId || isOnCall ? 0.4 : 1,
                },
              ]}
              hitSlop={4}
            >
              <FaPhone size={14} color={c.textDim} />
            </Pressable>
            <Pressable
              onPress={() => !isOnCall && setPendingCallType("video")}
              disabled={!activeConvoId || startingCall || isOnCall}
              style={[
                styles.toolBtn,
                {
                  backgroundColor: c.bgCard,
                  borderColor: c.border,
                  opacity: !activeConvoId || isOnCall ? 0.4 : 1,
                },
              ]}
              hitSlop={4}
            >
              <FaVideo size={14} color={c.textDim} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: 8,
              backgroundColor: c.bgInput,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 14,
              paddingHorizontal: 12,
              paddingVertical: 6,
            }}
          >
            <TextInput
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              placeholderTextColor={c.textMuted}
              multiline
              style={{
                flex: 1,
                color: c.text,
                fontSize: 14,
                maxHeight: 120,
                paddingVertical: 8,
              }}
            />
            <Pressable
              onPress={handleSend}
              disabled={!newMessage.trim() || sending}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: newMessage.trim() ? c.orange : c.border,
              }}
              hitSlop={4}
            >
              {sending ? (
                <ActivityIndicator size="small" color={c.bg} />
              ) : (
                <FaSend
                  size={14}
                  color={newMessage.trim() ? c.bg : c.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={!!pendingCallType && !isOnCall}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingCallType(null)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setPendingCallType(null)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: c.bgPanel,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.border,
              padding: 20,
              maxWidth: 340,
              width: "100%",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: c.orangeDim,
                borderWidth: 1,
                borderColor: c.orangeGlow,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              {pendingCallType === "video" ? (
                <FaVideo size={22} color={c.orange} />
              ) : (
                <FaPhone size={22} color={c.orange} />
              )}
            </View>
            <AppText
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: c.text,
                marginBottom: 6,
              }}
            >
              Start {pendingCallType === "video" ? "video" : "voice"} call?
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {activeOther
                ? `${activeOther.firstName || ""} ${activeOther.lastName || ""}`.trim()
                : "This user"}{" "}
              will be notified and asked to accept.
            </AppText>
            <View style={{ flexDirection: "row", gap: 8, width: "100%" }}>
              <Pressable
                onPress={() => setPendingCallType(null)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                  alignItems: "center",
                }}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
                >
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={confirmStartCall}
                disabled={startingCall}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: c.orange,
                  alignItems: "center",
                }}
              >
                {startingCall ? (
                  <ActivityIndicator size="small" color={c.bg} />
                ) : (
                  <AppText
                    style={{ fontSize: 13, fontWeight: "700", color: c.bg }}
                  >
                    Call
                  </AppText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!lightboxSrc}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxSrc(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.92)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Pressable
            onPress={() => setLightboxSrc(null)}
            style={{
              position: "absolute",
              top: 60,
              right: 20,
              zIndex: 2,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "rgba(255,255,255,0.12)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaX size={22} color="#fff" />
          </Pressable>
          {lightboxSrc && (
            <Image
              source={{ uri: lightboxSrc }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toolBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
