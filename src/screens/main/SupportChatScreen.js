// src/screens/main/SupportChatScreen.js
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Platform,
  StyleSheet,
  Modal,
  Text,
  Keyboard,
  Animated,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import {
  useSafeAreaInsets,
  SafeAreaView,
} from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";

import AppText from "../../components/AppText";
import AttachmentPreview from "../../components/support/AttachmentPreview";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useSupportStore } from "../../store/supportStore";
import { useSupportChat } from "../../hooks/useSupportChat";
import { startChat, uploadChatAttachments } from "../../api/support";
import { linkify } from "../../utils/linkify";

// ── Constraints ─────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 5;
const MAX_VIDEO_SECONDS = 60;

// Canonical MIME normaliser — maps anything the picker might return to
// the exact value the web upload sends (which the backend's ALLOWED_MIMES
// set accepts). Runs before the file is handed to FormData.
function canonicalMime(mime, filename, isVideo) {
  // 1. strip parameters — "image/jpeg; charset=binary" → "image/jpeg"
  let m = String(mime || "")
    .split(";")[0]
    .trim()
    .toLowerCase();

  // 2. alias normalisation
  if (m === "image/jpg" || m === "image/pjpeg") m = "image/jpeg";
  if (m === "video/quicktime") m = "video/quicktime"; // keep as-is; server accepts
  if (m === "application/x-pdf") m = "application/pdf";

  // 3. fall back to extension-based detection when the picker returned
  //    octet-stream or an empty/unknown value
  if (!m || m === "application/octet-stream" || m === "application/unknown") {
    const ext = (
      /\.[a-zA-Z0-9]+$/.exec(filename || "")?.[0] || ""
    ).toLowerCase();
    const extMap = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".heic": "image/heic",
      ".heif": "image/heif",
      ".mp4": "video/mp4",
      ".mov": "video/quicktime",
      ".webm": "video/webm",
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".txt": "text/plain",
      ".zip": "application/zip",
    };
    m = extMap[ext] || (isVideo ? "video/mp4" : "image/jpeg");
  }

  return m;
}

function normaliseFile(raw, fallbackExt = "jpg") {
  if (!raw?.uri) return null;

  let uri = String(raw.uri);
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return null;
  }
  if (
    !uri.startsWith("file://") &&
    !uri.startsWith("content://") &&
    !uri.startsWith("assets-library://")
  ) {
    uri = `file://${uri}`;
  }

  const extMatch = /\.[a-zA-Z0-9]+$/.exec(raw.name || "");
  const ext = extMatch ? extMatch[0] : `.${fallbackExt}`;
  const base = (raw.name || `upload_${Date.now()}`).replace(/[^\w.\-]/g, "_");
  const safeName = /\.[a-zA-Z0-9]+$/.test(base) ? base : `${base}${ext}`;

  const isVideo =
    raw.type === "video" || (raw.mimeType && raw.mimeType.startsWith("video/"));

  const mimeType = canonicalMime(raw.mimeType, safeName, isVideo);

  return {
    uri,
    name: safeName,
    mimeType,
    size: raw.size,
  };
}
// ─────────────────────────────────────────────────────────────────────────────
// useKeyboardHeight — tracks the on-screen keyboard height.
// Only the footer uses this, so the chat list is never pushed up.
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CHAT SKELETON — shimmer bubbles + mock input bar. No spinner.
// ─────────────────────────────────────────────────────────────────────────────
function ChatSkeleton({ c, insets }) {
  const shimmer = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const Bubble = ({ align, width, height = 44 }) => (
    <View style={{ alignItems: align, marginBottom: 10 }}>
      <Animated.View
        style={{
          width,
          height,
          borderRadius: 12,
          backgroundColor: c.bgPanel,
          borderWidth: 1,
          borderColor: c.border,
          opacity: shimmer,
        }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 16 }}>
        <Bubble align="flex-start" width="55%" />
        <Bubble align="flex-end" width="70%" />
        <Bubble align="flex-start" width="45%" height={64} />
        <Bubble align="flex-end" width="60%" />
        <Bubble align="flex-start" width="50%" />
        <Bubble align="flex-end" width="40%" height={36} />
      </View>
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          backgroundColor: c.bgPanel,
          paddingBottom: Math.max(insets.bottom, 8),
        }}
      >
        <Animated.View
          style={{
            marginHorizontal: 12,
            marginVertical: 12,
            height: 40,
            borderRadius: 20,
            backgroundColor: c.bgInput,
            borderWidth: 1,
            borderColor: c.border,
            opacity: shimmer,
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SupportChatScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { toast } = useToast();
  const clearUnread = useSupportStore((s) => s.clearUnread);
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  // Keyboard height — drives footer lift only, not the chat list.
  const keyboardHeight = useKeyboardHeight();

  const {
    conversation,
    setConversation,
    messages,
    isTyping,
    sendMessage,
    setTyping,
    isConnected,
  } = useSupportChat();

  const [inputText, setInputText] = useState("");
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const [attachSheet, setAttachSheet] = useState(false);

  const scrollRef = useRef(null);
  const lastTapRef = useRef(0);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearUnread?.();
  }, [clearUnread]);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages.length, isTyping]);

  useEffect(() => {
    if (conversation) return;
    let cancelled = false;
    (async () => {
      setIsStarting(true);
      setStartError(null);
      try {
        const conv = await startChat({});
        if (!conv || !conv.id) throw new Error("No conversation id");
        if (!cancelled) setConversation(conv);
      } catch (err) {
        if (!cancelled) {
          const msg =
            err?.response?.data?.message ||
            err?.message ||
            t("support.chat.startFailed");
          setStartError(msg);
          toast.error(msg);
        }
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?.id]);

  const handleBubblePress = useCallback((msg) => {
    if (msg.senderType === "SYSTEM") return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setReplyTo(msg);
      setHighlightedMsgId(msg.id);
      setTimeout(() => setHighlightedMsgId(null), 1000);
    }
    lastTapRef.current = now;
  }, []);

  // ── Pickers ───────────────────────────────────────────────────────────────
  const pushFiles = (incoming) => {
    if (!incoming?.length) return;
    setFiles((prev) => {
      const next = [...prev];
      for (const raw of incoming) {
        if (next.length >= MAX_FILES) {
          toast.error(t("support.chat.maxFiles", { count: MAX_FILES }));
          break;
        }
        if (raw.size && raw.size > MAX_FILE_BYTES) {
          toast.error(
            t("support.chat.fileTooLarge", {
              name: raw.name,
              size: Math.round(MAX_FILE_BYTES / 1024 / 1024),
            }),
          );
          continue;
        }
        const normalised = normaliseFile(raw);
        if (normalised) next.push(normalised);
      }
      return next;
    });
  };

  const takePhoto = async () => {
    setAttachSheet(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        return toast.error(t("support.chat.cameraPermission"));
      }
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch {}

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsEditing: false,
        videoMaxDuration: MAX_VIDEO_SECONDS,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
        presentationStyle:
          ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
      });

      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];

      const isVideo =
        a.type === "video" || (a.mimeType && a.mimeType.startsWith("video/"));

      if (isVideo && a.duration && a.duration > MAX_VIDEO_SECONDS * 1000) {
        toast.error(
          t("support.chat.videoTooLong", { seconds: MAX_VIDEO_SECONDS }),
        );
        return;
      }

      pushFiles([
        {
          uri: a.uri,
          name: a.fileName || `camera_${Date.now()}.${isVideo ? "mp4" : "jpg"}`,
          mimeType: a.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          size: a.fileSize,
          type: a.type,
        },
      ]);
    } catch (err) {
      console.warn("[SupportChat] takePhoto error:", err);
      toast.error(t("support.chat.cameraFailed"));
    }
  };

  const pickLibrary = async () => {
    setAttachSheet(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        return toast.error(t("support.chat.libraryPermission"));
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        allowsMultipleSelection: true,
        selectionLimit: MAX_FILES - files.length,
      });
      if (res.canceled || !res.assets?.length) return;
      pushFiles(
        res.assets.map((a, idx) => {
          const isVideo =
            a.type === "video" ||
            (a.mimeType && a.mimeType.startsWith("video/"));
          return {
            uri: a.uri,
            name:
              a.fileName ||
              `media_${Date.now()}_${idx}.${isVideo ? "mp4" : "jpg"}`,
            mimeType: a.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
            size: a.fileSize,
            type: a.type,
          };
        }),
      );
    } catch {
      toast.error(t("support.chat.libraryFailed"));
    }
  };

  const pickDocument = async () => {
    setAttachSheet(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
          "application/zip",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      pushFiles(
        res.assets.map((a) => ({
          uri: a.uri,
          name: a.name || `file_${Date.now()}`,
          mimeType: a.mimeType || "application/octet-stream",
          size: a.size,
        })),
      );
    } catch {
      toast.error(t("support.chat.fileFailed"));
    }
  };

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!canSend) return;
    const textSnapshot = inputText.trim();
    const filesSnapshot = files.slice();
    const replySnapshot = replyTo;

    setInputText("");
    setFiles([]);
    setReplyTo(null);
    setHighlightedMsgId(null);
    Keyboard.dismiss();

    try {
      let attachments = [];
      if (filesSnapshot.length > 0) {
        setIsUploading(true);
        try {
          // Build a proper FormData — axios/RN cannot serialise a plain
          // array of files as multipart. The previous code passed
          // `filesSnapshot` directly, which axios saw as a non-FormData
          // body with a `Content-Type: multipart/form-data` header and
          // threw "Network Error" before the request left the device.
          const form = new FormData();
          filesSnapshot.forEach((f, i) => {
            // Re-normalise defensively — if a file got into state through
            // any path that skipped pushFiles, sanitise it here too.
            const n = normaliseFile(f) || f;

            // Force file:// on bare paths; keep content:// as-is
            // (RN's Android bridge supports content:// natively).
            let uri = n.uri;
            if (uri.startsWith("content://")) {
              // keep as-is
            } else if (
              !uri.startsWith("file://") &&
              !uri.startsWith("assets-library://") &&
              !uri.startsWith("http")
            ) {
              uri = `file://${uri}`;
            }

            form.append("attachments", {
              uri,
              name: n.name,
              type: n.mimeType || "image/jpeg",
            });
          });

          attachments = await uploadChatAttachments(form);
        } finally {
          setIsUploading(false);
        }
      }

      await sendMessage({
        body: textSnapshot,
        attachments,
        replyToId: replySnapshot?.id ?? null,
      });

      setTimeout(() => {
        scrollRef.current?.scrollToEnd?.({ animated: true });
      }, 80);
    } catch (err) {
      setInputText(textSnapshot);
      setFiles(filesSnapshot);
      setReplyTo(replySnapshot);
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          t("support.chat.sendFailed"),
      );
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const canSend = useMemo(
    () =>
      (inputText.trim().length > 0 || files.length > 0) &&
      conversation?.status !== "ENDED" &&
      !isUploading,
    [inputText, files.length, conversation?.status, isUploading],
  );

  const showSkeleton = !conversation && (isStarting || !startError);

  // ── Renderers ─────────────────────────────────────────────────────────────
  const renderMessage = (msg) => {
    const isMe = msg.senderType === "USER";
    const isSystem = msg.senderType === "SYSTEM";

    if (isSystem) {
      return (
        <View key={msg.id} style={styles.systemRow}>
          <View style={[styles.systemDivider, { backgroundColor: c.border }]} />
          <AppText
            style={{
              fontSize: 11,
              color: c.textMuted,
              paddingHorizontal: 10,
              textAlign: "center",
            }}
          >
            {msg.body}
          </AppText>
          <View style={[styles.systemDivider, { backgroundColor: c.border }]} />
        </View>
      );
    }

    const isHighlighted = highlightedMsgId === msg.id;
    const bubbleBg = isMe ? c.orange : c.bgPanel;
    const bubbleBorder = isMe ? "transparent" : c.border;

    return (
      <View
        key={msg.id}
        style={[
          styles.msgRow,
          { justifyContent: isMe ? "flex-end" : "flex-start" },
        ]}
      >
        <View style={styles.msgCol}>
          <Pressable
            onPress={() => handleBubblePress(msg)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: bubbleBg,
              borderWidth: isMe ? 0 : 1,
              borderColor: bubbleBorder,
              borderBottomRightRadius: isMe ? 3 : 12,
              borderBottomLeftRadius: isMe ? 12 : 3,
              opacity: isHighlighted ? 0.6 : 1,
            }}
          >
            {msg.replyTo && (
              <View
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: isMe ? "rgba(255,255,255,0.6)" : c.orange,
                  paddingLeft: 8,
                  paddingVertical: 4,
                  marginBottom: 6,
                  backgroundColor: isMe ? "rgba(255,255,255,0.15)" : c.bgCard,
                  borderRadius: 4,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: isMe ? "rgba(255,255,255,0.9)" : c.orange,
                  }}
                >
                  {msg.replyTo.senderType === "USER"
                    ? t("support.chat.replySelf")
                    : t("support.chat.replyAgent")}
                </AppText>
                <AppText
                  numberOfLines={1}
                  style={{
                    fontSize: 11,
                    color: isMe ? "rgba(255,255,255,0.85)" : c.textDim,
                  }}
                >
                  {msg.replyTo.body || t("support.chat.attachment")}
                </AppText>
              </View>
            )}

            {msg.body ? (
              <Text
                style={{
                  color: isMe ? "#fff" : c.text,
                  fontSize: 14,
                  lineHeight: 20,
                }}
              >
                {linkify(
                  msg.body,
                  isMe ? { color: "#fff" } : { color: c.text },
                )}
              </Text>
            ) : null}

            {msg.attachments?.length > 0 && (
              <AttachmentPreview
                attachments={msg.attachments}
                isMe={isMe}
                onReply={() => {
                  setReplyTo(msg);
                  setHighlightedMsgId(msg.id);
                  setTimeout(() => setHighlightedMsgId(null), 1000);
                }}
              />
            )}
          </Pressable>

          <View
            style={[
              styles.metaRow,
              { justifyContent: isMe ? "flex-end" : "flex-start" },
            ]}
          >
            <AppText style={{ fontSize: 10, color: c.textMuted }}>
              {new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </AppText>
            {isMe && (
              <AppText style={{ fontSize: 10, color: c.textMuted }}>
                {msg.isSending
                  ? "⏳"
                  : msg.isFailed
                    ? "⚠️"
                    : msg.readAt
                      ? "✓✓"
                      : "✓"}
              </AppText>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderFileChip = (f, i) => {
    const isImg = f.mimeType?.startsWith("image/");
    const isVid = f.mimeType?.startsWith("video/");
    const icon = isImg
      ? "image-outline"
      : isVid
        ? "videocam-outline"
        : "document-outline";
    return (
      <View
        key={`${f.uri}-${i}`}
        style={[
          styles.fileChip,
          { backgroundColor: c.bgPanel, borderColor: c.border },
        ]}
      >
        <Ionicons
          name={icon}
          size={14}
          color={c.orange}
          style={{ marginRight: 6 }}
        />
        <AppText
          numberOfLines={1}
          style={{ fontSize: 12, color: c.text, maxWidth: 140 }}
        >
          {f.name}
        </AppText>
        <Pressable
          onPress={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
          hitSlop={6}
          style={{ marginLeft: 6 }}
        >
          <Ionicons name="close-circle" size={16} color={c.textMuted} />
        </Pressable>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: c.bgPanel, borderBottomColor: c.border },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={10}
          style={{ marginRight: 12 }}
        >
          <Ionicons name="arrow-back" size={22} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <AppText weight="semibold" style={{ color: c.text, fontSize: 15 }}>
            {t("support.chat.title")}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: isConnected
                  ? "#22c55e"
                  : isStarting
                    ? "#f59e0b"
                    : "#ef4444",
              }}
            />
            <AppText style={{ fontSize: 11, color: c.textMuted }}>
              {isConnected
                ? t("support.chat.online")
                : isStarting
                  ? t("support.chat.connecting")
                  : t("support.chat.offline")}
            </AppText>
          </View>
        </View>
      </View>

      {/* Body — takes remaining space; NOT pushed up by keyboard */}
      <View style={{ flex: 1 }}>
        {showSkeleton ? (
          <ChatSkeleton c={c} insets={insets} />
        ) : startError ? (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={40} color={c.red} />
            <AppText
              weight="semibold"
              style={{ color: c.text, textAlign: "center" }}
            >
              {t("support.chat.startFailed")}
            </AppText>
            <AppText
              variant="small"
              tone="dim"
              style={{ textAlign: "center", lineHeight: 18 }}
            >
              {startError}
            </AppText>
            <Pressable
              onPress={() => {
                setStartError(null);
                setConversation(null);
              }}
              style={{
                marginTop: 8,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
                backgroundColor: c.orange,
              }}
            >
              <AppText weight="semibold" style={{ color: "#000" }}>
                {t("common.retry") || "Retry"}
              </AppText>
            </Pressable>
          </View>
        ) : (
          <KeyboardAwareScrollView
            ref={scrollRef}
            style={{ flex: 1, backgroundColor: c.bg }}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 16,
              // Add bottom padding equal to the footer height + keyboard
              // so the last message is visible above the footer even
              // while the keyboard is up.
              paddingBottom: 16 + keyboardHeight,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled"
            bottomOffset={0}
            onContentSizeChange={() =>
              scrollRef.current?.scrollToEnd?.({ animated: false })
            }
          >
            {messages.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={44}
                  color={c.textMuted}
                />
                <AppText
                  weight="semibold"
                  style={{
                    color: c.text,
                    marginTop: 12,
                    textAlign: "center",
                  }}
                >
                  {t("support.chat.emptyTitle")}
                </AppText>
                <AppText
                  variant="small"
                  tone="dim"
                  style={{ textAlign: "center", marginTop: 6, lineHeight: 18 }}
                >
                  {t("support.chat.emptySub")}
                </AppText>
              </View>
            ) : (
              messages.map(renderMessage)
            )}

            {isTyping && (
              <AppText
                style={{
                  fontSize: 11,
                  color: c.textMuted,
                  fontStyle: "italic",
                  paddingLeft: 6,
                }}
              >
                {t("support.chat.agentTyping")}
              </AppText>
            )}
          </KeyboardAwareScrollView>
        )}
      </View>

      {/* Footer — lifted above the keyboard by `marginBottom: keyboardHeight`.
          Nothing above it moves. This is the only element affected by the keyboard. */}
      {!showSkeleton && (
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: c.border,
            backgroundColor: c.bgPanel,
            marginBottom: keyboardHeight,
            paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 8),
          }}
        >
          <AppText
            style={{
              fontSize: 10,
              color: c.textMuted,
              textAlign: "center",
              paddingVertical: 6,
            }}
          >
            {t("support.chat.doubleTapHint")}
          </AppText>

          {replyTo && (
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: c.bgCard,
                borderLeftWidth: 3,
                borderLeftColor: c.orange,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
              }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <AppText
                  style={{ fontSize: 10, fontWeight: "700", color: c.orange }}
                >
                  {replyTo.senderType === "USER"
                    ? t("support.chat.replySelf")
                    : t("support.chat.replyAgent")}
                </AppText>
                <AppText
                  numberOfLines={1}
                  style={{ fontSize: 12, color: c.textDim }}
                >
                  {replyTo.body || t("support.chat.attachment")}
                </AppText>
              </View>
              <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                <Ionicons name="close" size={18} color={c.textMuted} />
              </Pressable>
            </View>
          )}

          {files.length > 0 && (
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: c.border,
                backgroundColor: c.bgInput,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              {files.map(renderFileChip)}
            </View>
          )}

          <View style={styles.inputRow}>
            <Pressable
              onPress={() => setAttachSheet(true)}
              disabled={conversation?.status === "ENDED"}
              hitSlop={6}
              style={{ padding: 8 }}
            >
              <Ionicons name="attach" size={22} color={c.textMuted} />
            </Pressable>

            <TextInput
              value={inputText}
              onChangeText={(v) => {
                setInputText(v);
                if (v.length > 0) setTyping(true);
              }}
              placeholder={
                conversation?.status === "ENDED"
                  ? t("support.chat.ended")
                  : isUploading
                    ? t("support.chat.uploading")
                    : t("support.chat.placeholder")
              }
              placeholderTextColor={c.textMuted}
              editable={conversation?.status !== "ENDED" && !isUploading}
              multiline
              style={[
                styles.input,
                {
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                  color: c.text,
                },
              ]}
            />

            <Pressable
              onPress={handleSend}
              disabled={!canSend}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: canSend ? c.orange : c.bgCard,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons
                  name="send"
                  size={18}
                  color={canSend ? "#fff" : c.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Attach sheet */}
      <Modal
        visible={attachSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachSheet(false)}
        statusBarTranslucent
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
          onPress={() => setAttachSheet(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: c.bgPanel,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 10,
              paddingBottom: Math.max(insets.bottom, 16),
              paddingHorizontal: 16,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                alignSelf: "center",
                backgroundColor: c.border,
                marginBottom: 18,
              }}
            />
            <AppText
              weight="semibold"
              style={{
                fontSize: 13,
                color: c.textMuted,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                marginBottom: 10,
                paddingHorizontal: 8,
              }}
            >
              {t("support.chat.attachTitle")}
            </AppText>

            <AttachOption
              icon="camera-outline"
              label={t("support.chat.takePhotoOrVideo")}
              onPress={takePhoto}
              c={c}
            />
            <AttachOption
              icon="images-outline"
              label={t("support.chat.chooseLibrary")}
              onPress={pickLibrary}
              c={c}
            />
            <AttachOption
              icon="document-outline"
              label={t("support.chat.chooseFile")}
              onPress={pickDocument}
              c={c}
            />

            <Pressable
              onPress={() => setAttachSheet(false)}
              style={{
                marginTop: 8,
                paddingVertical: 14,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.bgCard,
                alignItems: "center",
              }}
            >
              <AppText weight="semibold" style={{ color: c.textDim }}>
                {t("common.cancel")}
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function AttachOption({ icon, label, onPress, c }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: pressed ? c.bgCard : "transparent",
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: c.orangeDim,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ionicons name={icon} size={20} color={c.orange} />
      </View>
      <AppText weight="semibold" style={{ color: c.text, fontSize: 15 }}>
        {label}
      </AppText>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  msgRow: { flexDirection: "row", marginBottom: 8 },
  msgCol: { maxWidth: "82%" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4, gap: 4 },
  systemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
    paddingHorizontal: 24,
  },
  systemDivider: { flex: 1, height: StyleSheet.hairlineWidth },
  fileChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
  },
  errorWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
});
