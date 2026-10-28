// src/screens/main/MessagesScreen.js

import { useCallback, useEffect, useMemo, useState } from "react";
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
import AppScreen from "../../components/AppScreen";
import AppText from "../../components/AppText";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../contexts/ThemeContext";
import client from "../../api/client";
import { FaSearch, FaComments } from "../../icons/fa";

const CONVO_POLL_MS = 12000;

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function Avatar({ user, size = 46 }) {
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

// ── Skeleton row ────────────────────────────────────────────────────────
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

export default function MessagesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuthStore();
  const { theme } = useTheme();
  const c = theme.colors;

  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const loadConversations = useCallback(async () => {
    try {
      const res = await client.get("/messages/conversations", {
        params: { page: 1, limit: 50, _t: Date.now() },
      });
      setConversations(res.data.data.conversations || []);
    } catch {}
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
    const id = setInterval(() => {
      loadConversations();
    }, CONVO_POLL_MS);
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

  const getOtherUser = (convo) =>
    convo.users?.find((u) => u.userId !== user?.id)?.user;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const o = getOtherUser(c);
      return `${o?.firstName || ""} ${o?.lastName || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [conversations, search, user?.id]);

  const totalUnread = conversations.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

  return (
    <AppScreen scroll={false} contentContainerStyle={{ flex: 1 }}>
      {/* Header */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppText
            style={{
              fontFamily: "Syne_800ExtraBold",
              fontSize: 24,
              fontWeight: "800",
              color: c.text,
            }}
          >
            Messages
          </AppText>
          {totalUnread > 0 && (
            <View
              style={{
                minWidth: 22,
                height: 22,
                paddingHorizontal: 6,
                borderRadius: 11,
                backgroundColor: c.orange,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AppText style={{ fontSize: 11, fontWeight: "800", color: c.bg }}>
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
          placeholder="Search conversations..."
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
          keyExtractor={(item) => String(item.id)}
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
                No conversations yet
              </AppText>
              <AppText
                style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}
              >
                Start a booking to begin messaging
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const other = getOtherUser(item);
            const lastMsg = item.messages?.[0];
            const unread = item.unreadCount || 0;
            const preview = lastMsg
              ? lastMsg.senderId === user?.id
                ? `You: ${lastMsg.content}`
                : lastMsg.content
              : "No messages yet";

            return (
              <Pressable
                onPress={() =>
                  navigation.navigate("Chat", { conversationId: item.id })
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? c.bgCard : "transparent",
                    borderBottomColor: c.border,
                  },
                ]}
              >
                <Avatar user={other} />
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
                      {other?.firstName} {other?.lastName}
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
