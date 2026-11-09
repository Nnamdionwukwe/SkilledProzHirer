// src/screens/main/ChatScreen.js
//
// Chat pane. Tick states:
//   • msg.pending             → one grey tick
//   • msg.delivered === true  → two grey ticks
//   • msg.isRead === true     → two blue ticks
//
// Keyboard handling — matches SupportChatScreen.
//
// Back button always lands on Messages, never Home.
//
// PDFs render in-app inside a full-screen WebView modal.
//
// Video calls: ChatScreen does NOT initiate — it only navigates to
// VideoCallScreen, which owns the entire video call lifecycle. Voice calls
// stay in ChatScreen because they use VoiceCallContext's in-app banner.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Linking,
  LogBox,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Video } from "expo-av";
import { WebView } from "react-native-webview";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";

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
  FaCamera,
  FaImage,
  FaFilePdf,
} from "../../icons/fa";

// ✅ Silence the "VirtualizedLists nested in ScrollView" warning that fires
// because background screens in the nav stack still have their FlatLists
// mounted while ChatScreen is on top. This is a dev-only warning; the app
// functions correctly. We just hide the noise.
LogBox.ignoreLogs(["VirtualizedLists should never be nested"]);

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

function formatDateDivider(dateStr, t) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString())
    return t("messages.today", "Today");
  if (d.toDateString() === yesterday.toDateString())
    return t("messages.yesterday", "Yesterday");
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setHeight(e?.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

function Ticks({ pending, delivered, read, color }) {
  const grey = "rgba(255,255,255,0.55)";
  const baseColor = color || grey;
  const blue = "#3b82f6";

  if (pending) {
    return (
      <View style={{ flexDirection: "row", marginLeft: 4 }}>
        <FaCheck size={10} color={baseColor} style={{ opacity: 0.85 }} />
      </View>
    );
  }
  if (read) {
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
  return (
    <View style={{ flexDirection: "row", marginLeft: 4 }}>
      <FaCheck size={10} color={baseColor} style={{ opacity: 0.85 }} />
    </View>
  );
}

function TranslateButton({ text }) {
  const { t } = useTranslation();
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
      setTranslated(t("messages.translateFailed", "Translation failed."));
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
          {t("messages.translated", "Translated:")}
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
      <Pressable
        onPress={() => setShowPicker(true)}
        disabled={loading}
        accessibilityLabel={t("messages.translate", "Translate message")}
      >
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
            <AppText
              style={{
                fontSize: 14,
                fontWeight: "700",
                color: c.text,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              {t("messages.selectLanguage", "Select language")}
            </AppText>
            <KeyboardAwareScrollView>
              {LANGUAGES.map((l) => (
                <Pressable
                  key={l.code}
                  onPress={() => translate(l.code)}
                  style={({ pressed }) => ({
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    borderRadius: 8,
                    backgroundColor: pressed ? c.bgCard : "transparent",
                  })}
                >
                  <AppText style={{ fontSize: 13, color: c.text }}>
                    {l.label}
                  </AppText>
                </Pressable>
              ))}
            </KeyboardAwareScrollView>
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
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const c = theme.colors;
  const { startCall, call: activeCall } = useVoiceCall();
  const isOnCall = !!activeCall;
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const routeConvoId = route.params?.conversationId || null;
  const routeWithId = route.params?.withUserId || null;
  const routeDraft = route.params?.draft || "";

  const [activeConvoId, setActiveConvoId] = useState(routeConvoId);
  const [withUserId, setWithUserId] = useState(routeWithId);
  const [withUser, setWithUser] = useState(null);
  const [convoMeta, setConvoMeta] = useState(null);

  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [newMessage, setNewMessage] = useState(routeDraft);
  const [sending, setSending] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [pdfViewerSrc, setPdfViewerSrc] = useState(null);
  const [pendingCallType, setPendingCallType] = useState(null);
  const [startingCall, setStartingCall] = useState(false);
  const [showJump, setShowJump] = useState(false);
  const [showAttachModal, setShowAttachModal] = useState(false);

  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const initiatingRef = useRef(false);
  const lastIdRef = useRef(null);
  const markingReadRef = useRef(false);
  const { toast } = useToast();

  useEffect(() => {
    setMessages([]);
    setSendingMessage(null);
    setConvoMeta(null);
    setWithUser(null);
    lastIdRef.current = null;
    setNewMessage(routeDraft || "");

    if (routeConvoId) {
      setActiveConvoId(routeConvoId);
      setWithUserId(null);
    } else if (routeWithId) {
      setActiveConvoId(null);
      setWithUserId(routeWithId);
    } else {
      setActiveConvoId(null);
      setWithUserId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeConvoId, routeWithId, routeDraft]);

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

  const activeOther = useMemo(() => {
    if (convoMeta) {
      return convoMeta.users?.find((u) => u.userId !== user?.id)?.user || null;
    }
    return withUser || null;
  }, [convoMeta, withUser, user?.id]);

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
        scrollRef.current?.scrollToEnd?.({ animated: true });
      });
    }
  }, [messages]);

  useEffect(() => {
    if (sendingMessage) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd?.({ animated: true });
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
        name: asset.fileName || asset.name || `upload-${Date.now()}`,
        type: asset.mimeType || asset.type || "application/octet-stream",
      });
      fd.append("receiverId", receiverId);
      fd.append("content", asset.fileName || asset.name || "Attachment");
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
    setShowAttachModal(false);
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
    setShowAttachModal(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    await uploadAsset(result.assets[0]);
  };

  const pickFromFiles = async () => {
    setShowAttachModal(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/zip",
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const file = result.assets[0];
      await uploadAsset({
        uri: file.uri,
        fileName: file.name,
        mimeType: file.mimeType,
      });
    } catch {}
  };

  const handlePickFile = () => {
    setShowAttachModal(true);
  };

  // ✅ FIXED: For video calls, do NOT initiate here. VideoCallScreen owns
  // the entire video call lifecycle. Double-initiating creates two PENDING
  // calls, and the second one never gets ended — causing "redial by itself".
  const confirmStartCall = async () => {
    const callType = pendingCallType;
    setPendingCallType(null);
    if (!callType || !activeConvoId) return;
    if (isOnCall) return;
    if (initiatingRef.current) return;

    initiatingRef.current = true;
    setStartingCall(true);
    try {
      if (callType === "voice") {
        const res = await client.post(
          `/voice-calls/${activeConvoId}/initiate`,
          { callType: "voice" },
        );
        startCall(res.data.data.call);
      } else {
        // ✅ Force a FRESH VideoCallScreen instance every time.
        // Use replace instead of navigate so the old instance is unmounted
        // and any stale polling or ended state cannot leak into the new call.
        navigation.replace("VideoCall", {
          conversationId: activeConvoId,
          returnTo: "Chat",
          returnParams: { conversationId: activeConvoId },
          sessionId: Date.now(), // forces fresh mount
        });
      }
    } catch (err) {
      // ✅ FIX: Use platform toast instead of Alert.alert
      toast.error(
        err?.response?.data?.message ||
          t("messages.callFailedBody", "Could not start call."),
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

  const handleBack = () => {
    const state = navigation.getState?.();
    const routes = state?.routes || [];
    const prevRoute = routes[routes.length - 2]?.name;

    if (prevRoute === "Messages") {
      navigation.goBack();
    } else {
      navigation.navigate("Messages");
    }
  };

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
            {formatDateDivider(item.date, t)}
          </AppText>
        </View>
      );
    }

    const msg = item.msg;
    const isMine = msg.senderId === user?.id;

    const isPdf = !!msg.fileUrl && /\.pdf(\?|#|$)/i.test(msg.fileUrl);

    const isImage =
      !isPdf &&
      msg.fileUrl &&
      (msg.fileUrl.match(/\.(jpg|jpeg|png|webp|gif)(\?|#|$)/i) ||
        msg.fileUrl.includes("image"));

    const isVideo =
      !isPdf &&
      msg.fileUrl &&
      (msg.fileUrl.match(/\.(mp4|mov|webm)(\?|#|$)/i) ||
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
              onPress={() => {
                const absoluteUrl = /^https?:\/\//i.test(msg.fileUrl)
                  ? msg.fileUrl
                  : `${client.defaults.baseURL.replace(/\/api\/?$/, "")}${msg.fileUrl.startsWith("/") ? "" : "/"}${msg.fileUrl}`;
                if (isPdf) {
                  setPdfViewerSrc(absoluteUrl);
                } else {
                  Linking.openURL(absoluteUrl);
                }
              }}
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
                {msg.content || t("messages.attachment", "Attachment")}
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
              {msg.pending
                ? t("messages.sending", "sending…")
                : formatTime(msg.createdAt)}
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
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 12,
          paddingBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: c.border,
          backgroundColor: c.bgPanel,
        }}
      >
        <Pressable
          onPress={handleBack}
          hitSlop={8}
          accessibilityLabel={t("messages.back", "Back")}
        >
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
          <AppText numberOfLines={1} style={{ fontSize: 11, color: c.textDim }}>
            {convoMeta?.booking?.title ||
              t("messages.directMessage", "Direct message")}
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
              {t("messages.viewProfile", "Profile →")}
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
              {t("messages.startConversation", "Start the conversation")}
            </AppText>
            <AppText style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>
              {t(
                "messages.startConversationSub",
                "Say hello to get things started",
              )}
            </AppText>
          </View>
        ) : (
          <KeyboardAwareScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: 16 + keyboardHeight,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={0}
            onScroll={handleScroll}
            scrollEventThrottle={100}
            onContentSizeChange={() => {
              if (messages.length > 0) {
                requestAnimationFrame(() => {
                  scrollRef.current?.scrollToEnd?.({ animated: false });
                });
              }
            }}
          >
            {grouped.map((item) => (
              <View key={item.key}>{renderItem({ item })}</View>
            ))}
          </KeyboardAwareScrollView>
        )}

        {showJump && (
          <Pressable
            onPress={() => {
              scrollRef.current?.scrollToEnd?.({ animated: true });
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
          marginBottom: keyboardHeight,
          paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 8),
          paddingHorizontal: 12,
          paddingTop: 8,
        }}
      >
        <View style={{ flexDirection: "row", gap: 4, paddingBottom: 6 }}>
          <Pressable
            onPress={handlePickFile}
            disabled={uploadingFile}
            accessibilityLabel={t("messages.attachFile", "Attach file")}
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
            placeholder={t("messages.typeMessage", "Type a message...")}
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
            accessibilityLabel={t("messages.sendMessage", "Send message")}
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

      <Modal
        visible={showAttachModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachModal(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.7)",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onPress={() => setShowAttachModal(false)}
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
            }}
          >
            <AppText
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: c.text,
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              {t("messages.attachTitle", "Send attachment")}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t("messages.attachBody", "Choose a source")}
            </AppText>

            <View style={{ gap: 8 }}>
              <Pressable
                onPress={pickFromCamera}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: pressed ? c.bgCard : "transparent",
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: c.orangeGlow,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaCamera size={15} color={c.orange} />
                </View>
                <AppText
                  style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                >
                  {t("messages.takePhoto", "Take Photo")}
                </AppText>
              </Pressable>

              <Pressable
                onPress={pickFromLibrary}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: pressed ? c.bgCard : "transparent",
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: c.orangeGlow,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaImage size={15} color={c.orange} />
                </View>
                <AppText
                  style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                >
                  {t("messages.chooseLibrary", "Choose from Library")}
                </AppText>
              </Pressable>

              <Pressable
                onPress={pickFromFiles}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: pressed ? c.bgCard : "transparent",
                })}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: c.orangeDim,
                    borderWidth: 1,
                    borderColor: c.orangeGlow,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <FaFilePdf size={15} color={c.orange} />
                </View>
                <AppText
                  style={{ fontSize: 13, fontWeight: "600", color: c.text }}
                >
                  {t("messages.chooseFile", "Choose from File")}
                </AppText>
              </Pressable>

              <Pressable
                onPress={() => setShowAttachModal(false)}
                style={{
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.bgCard,
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <AppText
                  style={{ fontSize: 13, fontWeight: "700", color: c.textDim }}
                >
                  {t("common.cancel", "Cancel")}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
              {pendingCallType === "video"
                ? t("messages.startVideoCall", "Start video call?")
                : t("messages.startVoiceCall", "Start voice call?")}
            </AppText>
            <AppText
              style={{
                fontSize: 12,
                color: c.textDim,
                textAlign: "center",
                marginBottom: 16,
              }}
            >
              {t(
                "messages.callConfirmBody",
                "{{name}} will be notified and asked to accept.",
                {
                  name: activeOther
                    ? `${activeOther.firstName || ""} ${activeOther.lastName || ""}`.trim()
                    : t("messages.thisUser", "This user"),
                },
              )}
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
                  {t("common.cancel", "Cancel")}
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
                    {t("messages.call", "Call")}
                  </AppText>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!pdfViewerSrc}
        animationType="slide"
        onRequestClose={() => setPdfViewerSrc(null)}
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.bg }}
          edges={["top", "bottom"]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: c.border,
              backgroundColor: c.bgPanel,
            }}
          >
            <Pressable
              onPress={() => setPdfViewerSrc(null)}
              hitSlop={8}
              accessibilityLabel={t("common.close", "Close")}
            >
              <FaX size={20} color={c.text} />
            </Pressable>
            <AppText
              style={{ fontSize: 14, fontWeight: "600", color: c.text }}
              numberOfLines={1}
            >
              {t("messages.pdfViewerTitle", "PDF")}
            </AppText>
            <View style={{ width: 20 }} />
          </View>
          {pdfViewerSrc ? (
            <WebView
              source={{
                uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfViewerSrc)}`,
              }}
              style={{ flex: 1 }}
              originWhitelist={["*"]}
              startInLoadingState
              renderLoading={() => (
                <View
                  style={{
                    flex: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: c.bg,
                  }}
                >
                  <ActivityIndicator size="large" color={c.orange} />
                </View>
              )}
            />
          ) : null}
        </SafeAreaView>
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
