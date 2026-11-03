// src/screens/main/SupportTicketThreadScreen.js
// ─────────────────────────────────────────────────────────────────────────────
// Ticket thread — mobile port of the website's src/pages/support/TicketThread.jsx.
// ─────────────────────────────────────────────────────────────────────────────

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
  ScrollView,
  Modal,
  Animated,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppText from "../../components/AppText";
import AttachmentPreview from "../../components/support/AttachmentPreview";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import {
  getTicket,
  replyToTicket,
  closeTicket,
  reopenTicket,
  submitChatCsat,
} from "../../api/support";
import { linkify } from "../../utils/linkify";

// ─── Constants ─────────────────────────────────────────────────────────────
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per file
const MAX_FILES = 5;

const STATUS_META = {
  OPEN: { label: "Open", fg: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  IN_PROGRESS: {
    label: "In Progress",
    fg: "#eab308",
    bg: "rgba(234,179,8,0.15)",
  },
  WAITING_USER: {
    label: "Action Needed",
    fg: "#f97316",
    bg: "rgba(249,115,22,0.15)",
  },
  RESOLVED: { label: "Resolved", fg: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  CLOSED: { label: "Closed", fg: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

// ─── useKeyboardHeight (footer lift only) ─────────────────────────────────
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const subShow = Keyboard.addListener(showEvent, (e) =>
      setHeight(e?.endCoordinates?.height ?? 0),
    );
    const subHide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);
  return height;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────
function ThreadSkeleton({ c }) {
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

  const Block = ({ w, h, mb = 10, alignSelf = "stretch", radius = 12 }) => (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: radius,
        backgroundColor: c.bgPanel,
        borderWidth: 1,
        borderColor: c.border,
        opacity: shimmer,
        alignSelf,
        marginBottom: mb,
      }}
    />
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Block w="100%" h={20} mb={12} radius={6} />
      <Block w="70%" h={28} mb={8} radius={6} />
      <Block w="45%" h={14} mb={24} radius={6} />

      <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
        <Block w="60%" h={64} alignSelf="flex-start" />
      </View>
      <View style={{ alignItems: "flex-end", marginBottom: 12 }}>
        <Block w="55%" h={52} alignSelf="flex-end" />
      </View>
      <View style={{ alignItems: "flex-start", marginBottom: 12 }}>
        <Block w="65%" h={72} alignSelf="flex-start" />
      </View>

      <Animated.View
        style={{
          marginTop: "auto",
          height: 60,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: c.border,
          backgroundColor: c.bgPanel,
          opacity: shimmer,
        }}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SupportTicketThreadScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useTheme();
  const { toast } = useToast();
  const insets = useSafeAreaInsets();
  const c = theme.colors;
  const keyboardHeight = useKeyboardHeight();

  const ticketId = route.params?.id;

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [replyBody, setReplyBody] = useState("");
  const [files, setFiles] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const lastTapRef = useRef(0);

  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: null,
  });

  const [showAttachSheet, setShowAttachSheet] = useState(false);

  const [showCsat, setShowCsat] = useState(false);
  const [csatRating, setCsatRating] = useState(5);
  const [csatComment, setCsatComment] = useState("");
  const [submittingCsat, setSubmittingCsat] = useState(false);

  const scrollRef = useRef(null);

  // ── Fetch ticket ─────────────────────────────────────────────────────────
  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    try {
      const data = await getTicket(ticketId);
      setTicket(data?.ticket ?? data ?? null);
      setError("");
    } catch (err) {
      setError("Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  useEffect(() => {
    if (!ticket?.messages?.length) return;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [ticket?.messages?.length]);

  // ── Double-tap reply ─────────────────────────────────────────────────────
  const handleBubblePress = useCallback((msg) => {
    if (msg.authorType === "SYSTEM") return;
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      setReplyTo(msg);
      setHighlightedMsgId(msg.id);
      setTimeout(() => setHighlightedMsgId(null), 1000);
    }
    lastTapRef.current = now;
  }, []);

  // ── File picking logic ───────────────────────────────────────────────────
  const pushFiles = (incoming) => {
    if (!incoming?.length) return;
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        toast.error(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (f.size && f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} exceeds the 25 MB limit.`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  };

  const pickLibrary = async () => {
    setShowAttachSheet(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted)
        return toast.error("Photo library permission is required.");
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images", "videos"],
        allowsMultipleSelection: true,
        selectionLimit: MAX_FILES - files.length,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.length) return;
      pushFiles(
        res.assets.map((a, idx) => {
          const isVideo =
            a.type === "video" ||
            (a.mimeType && a.mimeType.startsWith("video/"));
          // Always produce a clean filename with a proper extension
          const ext = isVideo ? "mp4" : "jpg";
          return {
            uri: a.uri,
            name: a.fileName || `media_${Date.now()}_${idx}.${ext}`,
            mimeType: a.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
            size: a.fileSize,
          };
        }),
      );
    } catch {
      toast.error("Could not open library.");
    }
  };

  const takePhoto = async () => {
    setShowAttachSheet(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return toast.error("Camera permission is required.");
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images", "videos"],
        quality: 0.85,
        videoMaxDuration: 60,
      });
      if (res.canceled || !res.assets?.length) return;
      const a = res.assets[0];
      const isVideo =
        a.type === "video" || (a.mimeType && a.mimeType.startsWith("video/"));
      const ext = isVideo ? "mp4" : "jpg";
      pushFiles([
        {
          uri: a.uri,
          name: a.fileName || `camera_${Date.now()}.${ext}`,
          mimeType: a.mimeType || (isVideo ? "video/mp4" : "image/jpeg"),
          size: a.fileSize,
        },
      ]);
    } catch {
      toast.error("Could not open camera.");
    }
  };

  const pickDocument = async () => {
    setShowAttachSheet(false);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.length) return;
      pushFiles(
        res.assets.map((a, idx) => {
          const extMatch = /\.[a-zA-Z0-9]+$/.exec(a.name || "");
          const ext = extMatch ? extMatch[0] : ".pdf";
          return {
            uri: a.uri,
            name: `document_${Date.now()}_${idx}${ext}`,
            mimeType: a.mimeType || "application/octet-stream",
            size: a.size,
          };
        }),
      );
    } catch {
      toast.error("Could not open file picker.");
    }
  };

  const removeFile = (idx) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Send reply ───────────────────────────────────────────────────────────
  const handleReply = async () => {
    if (!replyBody.trim() && files.length === 0) return;
    setIsSending(true);
    try {
      const form = new FormData();

      // Always append body — some backends reject requests without a `body`
      // field even when only attachments are sent.
      form.append("body", replyBody.trim() || " ");

      if (replyTo?.id) form.append("replyToId", replyTo.id);

      files.forEach((f, i) => {
        // ── FIX 1: sanitize filename (remove spaces, quotes, parens) ──
        // RN's fetch crashes on filenames with spaces/unicode.
        // The web browser auto-sanitizes; RN does not.
        const extMatch = /\.[a-zA-Z0-9]+$/.exec(f.name);
        const ext = extMatch ? extMatch[0] : ".bin";
        const safeName = `attachment_${Date.now()}_${i}${ext}`;

        // ── FIX 2: force file:// on Android content:// URIs ──
        // Some Android ROMs return content:// from ImagePicker,
        // which the server's multipart parser can't read.
        let uri = f.uri;
        if (uri.startsWith("content://")) {
          // Keep content:// — RN fetch supports it natively on Android.
          // Do NOT prepend file:// — that breaks Android.
        } else if (!uri.startsWith("file://") && !uri.startsWith("http")) {
          uri = `file://${uri}`;
        }

        form.append("attachments", {
          uri,
          name: safeName,
          type: f.mimeType || "application/octet-stream",
        });
      });

      const res = await replyToTicket(ticketId, form);

      const newMessage = res?.message;
      const newStatus = res?.ticketStatus;

      setTicket((prev) => ({
        ...prev,
        status: newStatus || prev.status,
        messages: newMessage
          ? [...(prev.messages || []), newMessage]
          : prev.messages || [],
      }));

      setReplyBody("");
      setFiles([]);
      setReplyTo(null);
      toast.success("Reply sent");
      Keyboard.dismiss();

      setTimeout(() => {
        scrollRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    } catch (err) {
      // ── FIX 3: log the exact 400 body so you see the real error ──
      if (err?.response?.status === 400) {
        console.log("━━━━ REPLY 400 ━━━━");
        console.log("BODY:", JSON.stringify(err.response.data, null, 2));
        console.log("━━━━━━━━━━━━━━━━━━");
      }

      const msg = err?.response?.data?.message;
      if (err?.response?.status === 400 && msg?.includes("closed")) {
        toast.warning("This ticket is closed. Reopen it to reply.");
      } else {
        toast.error(msg || "Failed to send reply.");
      }
    } finally {
      setIsSending(false);
    }
  };
  // ── Close / Reopen ───────────────────────────────────────────────────────
  const executeClose = async () => {
    setConfirmModal({ open: false, type: null });
    try {
      await closeTicket(ticketId);
      toast.success("Ticket closed");
      fetchTicket();
    } catch {
      toast.error("Failed to close ticket");
    }
  };

  const executeReopen = async () => {
    setConfirmModal({ open: false, type: null });
    try {
      await reopenTicket(ticketId);
      toast.success("Ticket reopened");
      fetchTicket();
    } catch {
      toast.error("Failed to reopen ticket");
    }
  };

  // ── CSAT submit ──────────────────────────────────────────────────────────
  const handleSubmitCsat = async () => {
    setSubmittingCsat(true);
    try {
      await submitChatCsat(ticketId, {
        rating: csatRating,
        comment: csatComment,
      });
      setShowCsat(false);
      toast.success("Thank you for your feedback!");
      fetchTicket();
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setSubmittingCsat(false);
    }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const isClosed = useMemo(
    () => ["RESOLVED", "CLOSED"].includes(ticket?.status),
    [ticket?.status],
  );

  const canSend = useMemo(
    () =>
      (replyBody.trim().length > 0 || files.length > 0) &&
      !isSending &&
      !isClosed,
    [replyBody, files.length, isSending, isClosed],
  );

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <ThreadSkeleton c={c} />
      </View>
    );
  }

  if (error || !ticket) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          gap: 12,
        }}
      >
        <Ionicons name="alert-circle-outline" size={40} color={c.red} />
        <AppText
          weight="semibold"
          style={{ color: c.text, textAlign: "center" }}
        >
          {error || "Ticket not found"}
        </AppText>
        <Pressable
          onPress={() => navigation.navigate("SupportHub")}
          style={{
            marginTop: 8,
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: c.orange,
          }}
        >
          <AppText weight="semibold" style={{ color: "#fff" }}>
            Back to Hub
          </AppText>
        </Pressable>
      </View>
    );
  }

  const statusMeta = STATUS_META[ticket.status] ?? {
    label: ticket.status,
    fg: c.textMuted,
    bg: c.bgCard,
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: c.bgPanel, borderBottomColor: c.border },
        ]}
      >
        <Pressable
          onPress={() => navigation.navigate("SupportHub")}
          hitSlop={10}
          style={{ alignSelf: "flex-start", marginBottom: 10 }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="arrow-back" size={16} color={c.textMuted} />
            <AppText
              style={{ fontSize: 13, fontWeight: "600", color: c.textMuted }}
            >
              Back to Hub
            </AppText>
          </View>
        </Pressable>

        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <AppText
                weight="displayBlack"
                style={{ fontSize: 20, color: c.text }}
                numberOfLines={2}
              >
                {ticket.subject}
              </AppText>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  backgroundColor: statusMeta.bg,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: statusMeta.fg,
                    textTransform: "uppercase",
                  }}
                >
                  {statusMeta.label}
                </AppText>
              </View>
            </View>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 6,
                marginTop: 6,
              }}
            >
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                Ticket {ticket.ticketNumber}
              </AppText>
              <AppText style={{ fontSize: 11, color: c.border }}>•</AppText>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                {String(ticket.category || "").replace(/_/g, " ")}
              </AppText>
              <AppText style={{ fontSize: 11, color: c.border }}>•</AppText>
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                Opened{" "}
                {new Date(ticket.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
          </View>

          {!isClosed ? (
            <Pressable
              onPress={() => setConfirmModal({ open: true, type: "close" })}
              style={[styles.headerActionBtn, { borderColor: c.border }]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: c.textMuted,
                }}
              >
                Close Ticket
              </AppText>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => setConfirmModal({ open: true, type: "reopen" })}
              style={[styles.headerActionBtn, { borderColor: c.green }]}
            >
              <AppText
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: c.green,
                }}
              >
                Reopen
              </AppText>
            </Pressable>
          )}
        </View>
      </View>

      {/* ── THREAD (scrollable) ── */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          gap: 14,
          paddingBottom: 24 + keyboardHeight,
        }}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollRef.current?.scrollToEnd?.({ animated: false })
        }
      >
        {ticket.messages?.map((msg) => {
          const isMe = msg.authorType === "USER";
          const isSystem = msg.authorType === "SYSTEM";

          if (isSystem) {
            return (
              <View
                key={msg.id}
                style={{
                  alignSelf: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: c.bgPanel,
                  borderRadius: 8,
                  maxWidth: "90%",
                }}
              >
                <AppText
                  style={{
                    fontSize: 12,
                    color: c.textMuted,
                    textAlign: "center",
                  }}
                >
                  {msg.body}
                </AppText>
              </View>
            );
          }

          return (
            <View
              key={msg.id}
              style={{
                flexDirection: isMe ? "row-reverse" : "row",
                alignItems: "flex-end",
                gap: 10,
                maxWidth: "88%",
                alignSelf: isMe ? "flex-end" : "flex-start",
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isMe ? c.orangeDim : c.bgInput,
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AppText
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: isMe ? c.orange : c.textMuted,
                  }}
                >
                  {isMe ? "You" : "Support"}
                </AppText>
              </View>

              {/* Content */}
              <View style={{ flex: 1, minWidth: 0 }}>
                <Pressable
                  onPress={() => handleBubblePress(msg)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    borderRadius: 16,
                    backgroundColor: isMe ? c.orange : c.bgPanel,
                    borderWidth: isMe ? 0 : 1,
                    borderColor: isMe ? "transparent" : c.border,
                    borderBottomRightRadius: isMe ? 4 : 16,
                    borderBottomLeftRadius: isMe ? 16 : 4,
                    opacity: highlightedMsgId === msg.id ? 0.55 : 1,
                  }}
                >
                  {msg.replyTo && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 4,
                        marginBottom: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: isMe
                          ? "rgba(255,255,255,0.5)"
                          : c.orange,
                        backgroundColor: isMe
                          ? "rgba(255,255,255,0.15)"
                          : c.bgInput,
                      }}
                    >
                      <Ionicons
                        name="return-up-back"
                        size={12}
                        color={isMe ? "rgba(255,255,255,0.9)" : c.orange}
                      />
                      <AppText
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          color: isMe ? "rgba(255,255,255,0.9)" : c.textDim,
                          flex: 1,
                        }}
                      >
                        {msg.replyTo.body || "Attachment"}
                      </AppText>
                    </View>
                  )}

                  {msg.body ? (
                    <AppText
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
                    </AppText>
                  ) : null}

                  {msg.attachments?.length > 0 && (
                    <AttachmentPreview
                      attachments={msg.attachments}
                      isMe={isMe}
                      onReply={() => handleBubblePress(msg)}
                    />
                  )}
                </Pressable>

                <AppText
                  style={{
                    fontSize: 10,
                    color: c.textMuted,
                    marginTop: 4,
                    textAlign: isMe ? "right" : "left",
                  }}
                >
                  {new Date(msg.createdAt).toLocaleString([], {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </AppText>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* ── FOOTER: CSAT / CLOSED / REPLY ── */}
      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: c.border,
          backgroundColor: c.bgPanel,
          marginBottom: keyboardHeight,
          paddingBottom: keyboardHeight > 0 ? 0 : Math.max(insets.bottom, 8),
        }}
      >
        {ticket.status === "RESOLVED" && !ticket.csatRating && !showCsat && (
          <View style={styles.csatBanner}>
            <AppText
              style={{
                fontSize: 13,
                color: c.text,
                textAlign: "center",
                fontWeight: "500",
              }}
            >
              This ticket was marked as resolved. How did we do?
            </AppText>
            <Pressable
              onPress={() => setShowCsat(true)}
              style={[styles.csatBannerBtn, { backgroundColor: c.orange }]}
            >
              <AppText
                style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}
              >
                Rate Support
              </AppText>
            </Pressable>
          </View>
        )}

        {showCsat ? (
          <View style={{ padding: 16, gap: 12 }}>
            <AppText weight="semibold" style={{ fontSize: 14, color: c.text }}>
              Rate your support experience
            </AppText>

            <View style={{ flexDirection: "row", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setCsatRating(s)}>
                  <Ionicons
                    name={csatRating >= s ? "star" : "star-outline"}
                    size={26}
                    color={csatRating >= s ? c.orange : c.textMuted}
                  />
                </Pressable>
              ))}
            </View>

            <TextInput
              value={csatComment}
              onChangeText={setCsatComment}
              placeholder="Any additional comments? (Optional)"
              placeholderTextColor={c.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={[
                styles.csatTextarea,
                {
                  color: c.text,
                  backgroundColor: c.bgInput,
                  borderColor: c.border,
                },
              ]}
            />

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <Pressable
                onPress={() => setShowCsat(false)}
                style={[styles.csatCancelBtn, { borderColor: c.border }]}
              >
                <AppText style={{ color: c.text, fontWeight: "600" }}>
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={handleSubmitCsat}
                disabled={submittingCsat}
                style={[
                  styles.csatSubmitBtn,
                  {
                    backgroundColor: c.orange,
                    opacity: submittingCsat ? 0.6 : 1,
                  },
                ]}
              >
                {submittingCsat ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <AppText style={{ color: "#fff", fontWeight: "600" }}>
                    Submit Rating
                  </AppText>
                )}
              </Pressable>
            </View>
          </View>
        ) : isClosed ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 18,
              paddingHorizontal: 16,
            }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={c.textMuted}
            />
            <AppText
              style={{
                fontSize: 13,
                color: c.textMuted,
                fontWeight: "500",
              }}
            >
              This ticket is {ticket.status.toLowerCase()}. Reopen it to reply.
            </AppText>
          </View>
        ) : (
          <View style={{ padding: 12, gap: 10 }}>
            {/* Hint */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <Ionicons name="return-up-back" size={12} color={c.textMuted} />
              <AppText style={{ fontSize: 11, color: c.textMuted }}>
                Double-tap a message to reply
              </AppText>
            </View>

            {/* Reply preview */}
            {replyTo && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: c.bgInput,
                  borderLeftWidth: 3,
                  borderLeftColor: c.orange,
                  borderRadius: 6,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{
                      fontSize: 10,
                      fontWeight: "700",
                      color: c.orange,
                      marginBottom: 2,
                    }}
                  >
                    Replying to{" "}
                    {replyTo.authorType === "USER" ? "yourself" : "Support"}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={{ fontSize: 12, color: c.textMuted }}
                  >
                    {replyTo.body || "Attachment"}
                  </AppText>
                </View>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Ionicons name="close" size={16} color={c.textMuted} />
                </Pressable>
              </View>
            )}

            {/* File chips */}
            {files.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {files.map((f, i) => (
                  <View
                    key={`${f.uri}-${i}`}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 6,
                      backgroundColor: c.bgInput,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <AppText
                      numberOfLines={1}
                      style={{ fontSize: 12, color: c.text, maxWidth: 140 }}
                    >
                      {f.name}
                    </AppText>
                    <Pressable onPress={() => removeFile(i)} hitSlop={6}>
                      <Ionicons name="close" size={12} color={c.textMuted} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* Input row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                paddingHorizontal: 8,
                paddingVertical: 6,
                backgroundColor: c.bgInput,
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: 10,
              }}
            >
              <Pressable
                onPress={() => setShowAttachSheet(true)}
                hitSlop={6}
                style={{ padding: 6 }}
              >
                <Ionicons name="attach" size={20} color={c.textMuted} />
              </Pressable>

              <TextInput
                value={replyBody}
                onChangeText={setReplyBody}
                placeholder="Type a reply..."
                placeholderTextColor={c.textMuted}
                editable={!isSending && !isClosed}
                multiline
                style={{
                  flex: 1,
                  color: c.text,
                  fontSize: 14,
                  maxHeight: 100,
                  paddingVertical: 4,
                }}
              />

              <Pressable
                onPress={handleReply}
                disabled={!canSend}
                style={{
                  backgroundColor: canSend ? c.orange : c.bgCard,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                }}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons
                    name="send"
                    size={16}
                    color={canSend ? "#fff" : c.textMuted}
                  />
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* ── ATTACH OPTIONS SHEET ── */}
      <Modal
        visible={showAttachSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttachSheet(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.6)",
            justifyContent: "flex-end",
          }}
          onPress={() => setShowAttachSheet(false)}
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
              Attach
            </AppText>

            <AttachOption
              icon="images-outline"
              label="Photo Library"
              onPress={pickLibrary}
              c={c}
            />
            <AttachOption
              icon="camera-outline"
              label="Take Live Photo / Video"
              onPress={takePhoto}
              c={c}
            />
            <AttachOption
              icon="document-outline"
              label="Choose PDF / Files"
              onPress={pickDocument}
              c={c}
            />

            <Pressable
              onPress={() => setShowAttachSheet(false)}
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
                Cancel
              </AppText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── CONFIRMATION MODAL ── */}
      <Modal
        visible={confirmModal.open}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({ open: false, type: null })}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setConfirmModal({ open: false, type: null })}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              styles.modalCard,
              { backgroundColor: c.bgPanel, borderColor: c.border },
            ]}
          >
            <AppText
              weight="displayBlack"
              style={{ fontSize: 18, color: c.text, marginBottom: 8 }}
            >
              {confirmModal.type === "close"
                ? "Close Ticket?"
                : "Reopen Ticket?"}
            </AppText>
            <AppText
              style={{
                fontSize: 14,
                color: c.textDim,
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              {confirmModal.type === "close"
                ? "Are you sure you want to close this ticket? You won't be able to reply until it's reopened."
                : "Are you sure you want to reopen this ticket? This will notify support."}
            </AppText>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => setConfirmModal({ open: false, type: null })}
                style={[styles.cancelBtn, { borderColor: c.border }]}
              >
                <AppText style={{ color: c.textDim, fontWeight: "600" }}>
                  Cancel
                </AppText>
              </Pressable>
              <Pressable
                onPress={
                  confirmModal.type === "close" ? executeClose : executeReopen
                }
                style={[styles.confirmBtn, { backgroundColor: c.orange }]}
              >
                <AppText style={{ color: "#fff", fontWeight: "600" }}>
                  {confirmModal.type === "close"
                    ? "Close Ticket"
                    : "Reopen Ticket"}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  csatBanner: {
    padding: 14,
    alignItems: "center",
    gap: 10,
  },
  csatBannerBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
  },
  csatTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 72,
    fontSize: 13,
  },
  csatCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  csatSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 110,
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
});
