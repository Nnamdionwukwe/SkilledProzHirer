// src/screens/main/MessagesScreen.js
//
// Mirrors pages/Messages/Messages.jsx (sidebar list):
//   - Deduplicates conversations by peer user (fixes "same user every time")
//   - Extracts the true `other` user from users[] AND lastMsg sender/receiver
//   - Navigates to Chat with the peer's user ID for a fresh convo if needed
//   - Shows `You: <preview>` when the last message came from the current user
//   - Layout matches the website: name / time on top, preview / unread on bottom
//   - Every visible string goes through t() using the `messages.*` namespace.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { useTranslation } from "react-i18next";

import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import { FaSearch, FaComments } from "../../icons/fa";
import { rem } from "../../constants/theme";

const CONVO_POLL_MS = 12000;

// ── Helpers ────────────────────────────────────────────────────────────
function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// Extract the OTHER user from a conversation object. Handles every shape
// the API might return:
//   - convo.users = [{ userId, user: {...} }, { userId, user: {...} }]
//   - convo.users = [{ id, firstName, lastName, avatar }, ...]
//   - convo.lastMsg.sender / convo.lastMsg.receiver as fallback
function getPeerUser(convo, currentUserId) {
  if (!convo) return null;

  // 1) Preferred: users[] with nested user
  const usersArr = convo.users || [];
  const otherEntry = usersArr.find(
    (u) => (u.userId || u.user?.id || u.id) !== currentUserId,
  );
  if (otherEntry) {
    return otherEntry.user || otherEntry;
  }

  // 2) Fallback: last message's other party
  const lastMsg = convo.messages?.[0] ?? convo.lastMessage;
  if (lastMsg) {
    if (lastMsg.senderId === currentUserId && lastMsg.receiver) {
      return lastMsg.receiver;
    }
    if (lastMsg.receiverId === currentUserId && lastMsg.sender) {
      return lastMsg.sender;
    }
  }

  // 3) Fallback: top-level convo.user / convo.peer
  if (convo.user && convo.user.id !== currentUserId) return convo.user;
  if (convo.peer && convo.peer.id !== currentUserId) return convo.peer;

  return null;
}

// Same peer = same user. Two conversations with the same peer should collapse
// into one entry (most recent wins).
function dedupeByPeer(convos, currentUserId) {
  const byPeer = new Map();
  for (const convo of convos) {
    const peer = getPeerUser(convo, currentUserId);
    if (!peer?.id) continue;

    const existing = byPeer.get(peer.id);
    if (!existing) {
      byPeer.set(peer.id, convo);
      continue;
    }

    const existingTime = new Date(
      existing.messages?.[0]?.createdAt || existing.updatedAt || 0,
    ).getTime();
    const newTime = new Date(
      convo.messages?.[0]?.createdAt || convo.updatedAt || 0,
    ).getTime();

    if (newTime >= existingTime) {
      byPeer.set(peer.id, convo);
    }
  }
  return Array.from(byPeer.values());
}

function Avatar({ user, size = 46, c }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.orangeDim,
        borderWidth: 1,
        borderColor: c.orangeGlow,
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
          style={{
            fontSize: size * 0.36,
            fontWeight: "700",
            color: c.orange,
          }}
        >
          {initials || "?"}
        </AppText>
      )}
    </View>
  );
}

function SkeletonRow({ c }) {
  return (
    <View style={styles.skeletonRow}>
      <View
        style={[
          styles.skeletonAvatar,
          { backgroundColor: c.bgCard, borderColor: c.border },
        ]}
      />
      <View style={{ flex: 1, gap: 8 }}>
        <View
          style={[
            styles.skeletonLine,
            {
              width: "55%",
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            {
              width: "85%",
              height: 10,
              backgroundColor: c.bgCard,
              borderColor: c.border,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const c = theme.colors;

  const [rawConversations, setRawConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadConversations = useCallback(async () => {
    try {
      const res = await client.get("/messages/conversations", {
        params: { page: 1, limit: 50, _t: Date.now() },
      });
      const list = res.data?.data?.conversations || [];
      setRawConversations(list);
    } catch (err) {
      console.log("⚠️ conversations fetch failed:", err?.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        await loadConversations();
        if (!cancelled) setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }, [loadConversations]),
  );

  useEffect(() => {
    const id = setInterval(loadConversations, CONVO_POLL_MS);
    return () => clearInterval(id);
  }, [loadConversations]);

  // Deep-link: conversationId or withUserId passed via route
  useEffect(() => {
    const convoId = route.params?.conversationId;
    const withUserId = route.params?.withUserId;
    const draft = route.params?.draft;

    if (!convoId && !withUserId) return;

    navigation.setParams({
      conversationId: undefined,
      withUserId: undefined,
      draft: undefined,
    });

    navigation.navigate("Chat", {
      conversationId: convoId,
      withUserId,
      draft,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Deduplicate by peer user, then attach peer for rendering
  const conversations = useMemo(() => {
    const deduped = dedupeByPeer(rawConversations, user?.id);
    return deduped
      .map((convo) => ({
        ...convo,
        _peer: getPeerUser(convo, user?.id),
      }))
      .filter((convo) => convo._peer?.id) // must have a real peer
      .sort((a, b) => {
        const aTime = new Date(
          a.messages?.[0]?.createdAt || a.updatedAt || 0,
        ).getTime();
        const bTime = new Date(
          b.messages?.[0]?.createdAt || b.updatedAt || 0,
        ).getTime();
        return bTime - aTime;
      });
  }, [rawConversations, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((convo) => {
      const p = convo._peer;
      return `${p?.firstName || ""} ${p?.lastName || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [conversations, search]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  // ── Navigation: open Chat with the peer's user ID ───────────────────
  const openChat = (convo) => {
    const peer = convo._peer;
    if (!peer?.id) return;

    // If we already have a conversationId, use it.
    // Otherwise pass withUserId so Chat creates/finds the conversation.
    if (convo.id) {
      navigation.navigate("Chat", {
        conversationId: convo.id,
        withUserId: peer.id,
      });
    } else {
      navigation.navigate("Chat", { withUserId: peer.id });
    }
  };

  return (
    <AppScreen scroll={false} contentContainerStyle={{ flex: 1 }}>
      {/* Header */}
      <View style={{ marginBottom: rem(0.75) }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText
            weight="displayBlack"
            style={{
              fontSize: 15,
              color: c.text,
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            {t("messages.title", "Messages")}
          </AppText>
          {totalUnread > 0 && (
            <View
              style={{
                minWidth: rem(1.5),
                height: rem(1.5),
                paddingHorizontal: rem(0.4),
                borderRadius: rem(1.5) / 2,
                backgroundColor: c.orange,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText
                style={{
                  fontSize: rem(0.6875),
                  fontWeight: "800",
                  color: c.bg,
                }}
              >
                {totalUnread > 99 ? "99+" : totalUnread}
              </AppText>
            </View>
          )}
        </View>
      </View>

      {/* Search */}
      <View
        style={[
          styles.searchWrap,
          { backgroundColor: c.bgInput, borderColor: c.border },
        ]}
      >
        <FaSearch size={14} color={c.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t(
            "messages.searchPlaceholder",
            "Search conversations...",
          )}
          placeholderTextColor={c.textMuted}
          style={[styles.searchInput, { color: c.text }]}
          returnKeyType="search"
        />
      </View>

      {/* Skeleton while loading */}
      {loading ? (
        <View style={{ flex: 1 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonRow key={i} c={c} />
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id || item._peer.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await loadConversations();
                setRefreshing(false);
              }}
              tintColor={c.orange}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FaComments size={36} color={c.textMuted} />
              <AppText
                style={{
                  fontSize: 14,
                  color: c.textDim,
                  fontWeight: "600",
                  marginTop: 10,
                }}
              >
                {t("messages.noConversations", "No conversations yet")}
              </AppText>
              <AppText
                style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}
              >
                {t(
                  "messages.noConversationsSub",
                  "Start a conversation by visiting a worker's profile.",
                )}
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const peer = item._peer;
            const lastMsg = item.messages?.[0];
            const unread = item.unreadCount || 0;
            const preview = lastMsg
              ? lastMsg.senderId === user?.id
                ? `${t("messages.you", "You")}: ${lastMsg.content}`
                : lastMsg.content
              : t("messages.noMessages", "No messages yet");

            return (
              <Pressable
                onPress={() => openChat(item)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? c.bgCard : "transparent",
                    borderBottomColor: c.border,
                  },
                ]}
              >
                <Avatar user={peer} size={46} c={c} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <AppText
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: unread > 0 ? "700" : "600",
                        color: c.text,
                      }}
                    >
                      {peer?.firstName} {peer?.lastName}
                    </AppText>
                    <AppText style={{ fontSize: 10, color: c.textMuted }}>
                      {lastMsg ? formatTime(lastMsg.createdAt) : ""}
                    </AppText>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 3,
                    }}
                  >
                    <AppText
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 12,
                        color: unread > 0 ? c.text : c.textDim,
                        fontWeight: unread > 0 ? "600" : "400",
                      }}
                    >
                      {preview}
                    </AppText>
                    {unread > 0 && (
                      <View
                        style={{
                          minWidth: 18,
                          height: 18,
                          paddingHorizontal: 4,
                          borderRadius: 9,
                          backgroundColor: c.orange,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <AppText
                          style={{
                            fontSize: 10,
                            fontWeight: "800",
                            color: c.bg,
                          }}
                        >
                          {unread > 9 ? "9+" : unread}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, padding: 0 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { alignItems: "center", paddingVertical: 80 },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
  },
  skeletonAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
});
