// src/hooks/useSupportChat.js
// Socket-driven support chat. Reads the access token from SecureStore
// (matches web, where useAuthStore().accessToken is a zustand field — RN
// stores it in SecureStore so we fetch it async before connecting).

import { useState, useEffect, useRef, useCallback } from "react";
import Constants from "expo-constants";
import { io } from "socket.io-client";
import { useAuthStore } from "../store/authStore";
import { tokenStore } from "../api/client";

function getSocketUrl() {
  const raw =
    Constants.expoConfig?.extra?.API_URL ||
    Constants.expoConfig?.extra?.SOCKET_URL ||
    "https://skilledpro-backend-production.up.railway.app/api";
  try {
    const parsed = new URL(raw);
    parsed.pathname = parsed.pathname.replace(/\/api\/?$/, "") || "/";
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "https://skilledpro-backend-production.up.railway.app";
  }
}

const SOCKET_URL = getSocketUrl();

function createSupportSocket(token) {
  return io(`${SOCKET_URL}/support`, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 15000,
  });
}

export function useSupportChat(initialConversation = null) {
  const { user } = useAuthStore();
  const [conversation, setConversation] = useState(initialConversation);
  const [messages, setMessages] = useState(initialConversation?.messages || []);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // 1. Merge embedded messages whenever conversation updates
  useEffect(() => {
    if (conversation?.messages) {
      setMessages((prevMessages) => {
        if (prevMessages.length === 0) return conversation.messages;
        const merged = [...conversation.messages];
        prevMessages.forEach((liveMsg) => {
          if (
            !merged.some(
              (m) =>
                m.id === liveMsg.id ||
                (m.tempId && m.tempId === liveMsg.tempId),
            )
          ) {
            merged.push(liveMsg);
          }
        });
        return merged.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
        );
      });
    }
  }, [conversation]);

  // 2. Socket connect — fetch token from SecureStore first
  useEffect(() => {
    if (!user?.id) return; // wait for auth hydration
    let cancelled = false;
    let socket = null;

    (async () => {
      const token = await tokenStore.getAccess();
      if (!token) {
        console.warn("[useSupportChat] no access token in SecureStore");
        return;
      }
      if (cancelled) return;

      console.log("[useSupportChat] connecting socket…");
      socket = createSupportSocket(token);
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[useSupportChat] socket connected", socket.id);
        setIsConnected(true);
        if (conversation?.id) {
          socket.emit("support:join", { conversationId: conversation.id });
        }
      });

      socket.on("connect_error", (err) => {
        console.warn("[useSupportChat] connect_error:", err?.message);
        setIsConnected(false);
      });

      socket.on("disconnect", (reason) => {
        console.log("[useSupportChat] disconnected:", reason);
        setIsConnected(false);
      });

      socket.on("support:message", (msg) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const idx = prev.findIndex(
            (m) => m.tempId && m.tempId === msg.tempId,
          );
          if (idx !== -1) {
            const next = [...prev];
            next[idx] = msg;
            return next;
          }
          if (msg.senderId !== user?.id) {
            socket.emit("support:read", {
              conversationId: msg.conversationId,
            });
          }
          return [...prev, msg];
        });
      });

      socket.on("support:typing", ({ isTyping: typing, userId }) => {
        if (userId !== user?.id) setIsTyping(typing);
      });

      socket.on("support:read", ({ byUserId, at }) => {
        if (byUserId !== user?.id) {
          setMessages((prev) =>
            prev.map((m) =>
              m.senderId === user?.id ? { ...m, readAt: at } : m,
            ),
          );
        }
      });

      socket.on("support:ended", ({ systemMessage }) => {
        setConversation((prev) => (prev ? { ...prev, status: "ENDED" } : prev));
        setMessages((prev) => [...prev, systemMessage]);
      });
    })();

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [conversation?.id, user?.id]);

  // 3. Send message — with REST fallback
  // src/hooks/useSupportChat.js

  // Replace the entire sendMessage useCallback with this:

  const sendMessage = useCallback(
    (messageOrBody, attachmentsArg = [], replyToArg = null) => {
      if (!conversation?.id) return;

      // ── Accept BOTH calling styles ─────────────────────────────────────────
      // Old/positional: sendMessage(body, attachments, replyTo)
      // New/object:     sendMessage({ body, attachments, replyToId })
      let body;
      let attachments;
      let replyTo;

      if (
        messageOrBody &&
        typeof messageOrBody === "object" &&
        !Array.isArray(messageOrBody) &&
        ("body" in messageOrBody || "attachments" in messageOrBody)
      ) {
        const m = messageOrBody;
        body =
          typeof m.body === "string"
            ? m.body
            : typeof m.body?.text === "string"
              ? m.body.text
              : "";
        attachments = Array.isArray(m.attachments) ? m.attachments : [];
        replyTo =
          m.replyTo ?? (m.replyToId ? { id: m.replyToId } : null) ?? null;
      } else {
        body = typeof messageOrBody === "string" ? messageOrBody : "";
        attachments = Array.isArray(attachmentsArg) ? attachmentsArg : [];
        replyTo = replyToArg ?? null;
      }

      // Bail if there's literally nothing to send
      if (!body.trim() && attachments.length === 0) return;

      const tempId = `temp-${Date.now()}`;

      // ── Optimistic append ─────────────────────────────────────────────────
      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          tempId,
          conversationId: conversation.id,
          body, // ← string, always
          attachments, // ← array, always
          replyTo: replyTo
            ? {
                id: replyTo.id,
                body: typeof replyTo.body === "string" ? replyTo.body : "",
                senderType: replyTo.senderType ?? "AGENT",
              }
            : null,
          senderType: "USER",
          senderId: user?.id,
          createdAt: new Date().toISOString(),
          isSending: true,
        },
      ]);

      // ── Emit over socket ──────────────────────────────────────────────────
      const payload = {
        conversationId: conversation.id,
        body,
        attachments,
        replyToId: replyTo?.id ?? null,
        tempId,
      };

      if (socketRef.current?.connected) {
        socketRef.current.emit("support:message", payload, (ack) => {
          if (ack?.ok && ack?.message) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId || m.tempId === tempId
                  ? { ...ack.message, isSending: false, isFailed: false }
                  : m,
              ),
            );
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? { ...m, isFailed: true, isSending: false }
                  : m,
              ),
            );
          }
        });
      } else {
        console.warn(
          "[useSupportChat] socket not connected — message not sent:",
          body,
        );
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, isFailed: true, isSending: false } : m,
          ),
        );
      }
    },
    [conversation?.id, user?.id],
  );

  // 4. Typing
  const setTyping = useCallback(
    (typing) => {
      if (!socketRef.current?.connected || !conversation?.id) return;
      if (typing) {
        clearTimeout(typingTimeoutRef.current);
        socketRef.current.emit("support:typing", {
          conversationId: conversation.id,
          isTyping: true,
        });
        typingTimeoutRef.current = setTimeout(() => {
          socketRef.current?.emit("support:typing", {
            conversationId: conversation.id,
            isTyping: false,
          });
        }, 2000);
      } else {
        socketRef.current.emit("support:typing", {
          conversationId: conversation.id,
          isTyping: false,
        });
      }
    },
    [conversation?.id],
  );

  return {
    conversation,
    setConversation,
    messages,
    setMessages,
    isConnected,
    isTyping,
    sendMessage,
    setTyping,
  };
}
