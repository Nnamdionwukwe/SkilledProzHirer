// src/screens/main/MessagesScreen.js
// Endpoint: GET /messages/conversations
// Shows conversation list with search, avatars, last message, unread count.

import React, { useState, useEffect, useCallback } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../contexts/ThemeContext";
import { useToast } from "../../contexts/ToastContext";
import { useAuthStore } from "../../store/authStore";
import AppText from "../../components/AppText";
import { getConversations } from "../../api/messages";

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(first, last) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
}

function fmtTime(d) {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ── Conversation Row ──────────────────────────────────────────────────────────
function ConvoRow({ convo, myId, onPress, c }) {
  const other = convo.users?.find((u) => u.userId !== myId)?.user ?? {};
  const lastMsg = convo.messages?.[0];
  const unread = convo.unreadCount ?? 0;

  return (
    <Pressable
      onPress={() => onPress(convo, other)}
      style={[s.row, { borderBottomColor: c.border }]}
    >
      {/* Avatar */}
      <View
        style={[
          s.avatar,
          { backgroundColor: c.orangeDim, borderColor: c.border },
        ]}
      >
        {other.avatar ? (
          <Image source={{ uri: other.avatar }} style={s.avatarImg} />
        ) : (
          <AppText style={{ color: c.orange, fontWeight: "700", fontSize: 16 }}>
            {initials(other.firstName, other.lastName)}
          </AppText>
        )}
        {unread > 0 && (
          <View style={[s.unreadDot, { backgroundColor: c.orange }]}>
            <AppText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {unread > 9 ? "9+" : unread}
            </AppText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={s.rowContent}>
        <View style={s.rowTop}>
          <AppText
            variant="body"
            weight={unread > 0 ? "semibold" : "regular"}
            style={{ color: c.text, flex: 1 }}
            numberOfLines={1}
          >
            {other.firstName} {other.lastName}
          </AppText>
          <AppText
            variant="small"
            style={{ color: c.textMuted, marginLeft: 8 }}
          >
            {fmtTime(convo.updatedAt ?? lastMsg?.createdAt)}
          </AppText>
        </View>
        <AppText
          variant="small"
          style={{ color: unread > 0 ? c.text : c.textMuted, marginTop: 2 }}
          numberOfLines={1}
        >
          {lastMsg?.content ?? ""}
        </AppText>
      </View>
    </Pressable>
  );
}

function Skeleton({ c }) {
  return (
    <View>
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={[s.row, { borderBottomColor: c.border }]}>
          <View
            style={[s.avatar, { backgroundColor: c.bgCard, opacity: 0.4 }]}
          />
          <View style={{ flex: 1, gap: 8, marginLeft: 12 }}>
            <View
              style={{
                height: 14,
                borderRadius: 7,
                backgroundColor: c.bgCard,
                width: "60%",
                opacity: 0.4,
              }}
            />
            <View
              style={{
                height: 12,
                borderRadius: 6,
                backgroundColor: c.bgCard,
                width: "80%",
                opacity: 0.3,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function MessagesScreen({ navigation }) {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const c = th.colors;
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [conversations, setConversations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(data);
      setFiltered(data);
    } catch {
      toast.error(t("toast.unknownError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(conversations);
      return;
    }
    setFiltered(
      conversations.filter((convo) => {
        const other =
          convo.users?.find((u) => u.userId !== user?.id)?.user ?? {};
        const name =
          `${other.firstName ?? ""} ${other.lastName ?? ""}`.toLowerCase();
        const lastMsg = convo.messages?.[0]?.content?.toLowerCase() ?? "";
        return name.includes(q) || lastMsg.includes(q);
      }),
    );
  }, [search, conversations]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePress = (convo, other) => {
    navigation.navigate("Chat", {
      conversationId: convo.id,
      receiverId: other.id,
      receiverName: `${other.firstName ?? ""} ${other.lastName ?? ""}`.trim(),
      receiverAvatar: other.avatar ?? null,
    });
  };

  return (
    <View style={[s.screen, { backgroundColor: c.bg }]}>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.orange}
          />
        }
        ListHeaderComponent={
          <View style={s.header}>
            {/* Search */}
            <View
              style={[
                s.searchBar,
                { backgroundColor: c.bgCard, borderColor: c.border },
              ]}
            >
              <AppText style={{ color: c.textMuted, marginRight: 8 }}>
                🔍
              </AppText>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder={t("messages.searchPlaceholder")}
                placeholderTextColor={c.textMuted}
                style={[s.searchInput, { color: c.text }]}
                clearButtonMode="while-editing"
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <ConvoRow convo={item} myId={user?.id} onPress={handlePress} c={c} />
        )}
        ListEmptyComponent={
          loading ? (
            <Skeleton c={c} />
          ) : (
            <View style={s.empty}>
              <AppText style={{ fontSize: 44 }}>💬</AppText>
              <AppText
                variant="body"
                weight="semibold"
                style={{ color: c.text, marginTop: 12 }}
              >
                {t("messages.noConversations")}
              </AppText>
              <AppText
                variant="small"
                style={{
                  color: c.textMuted,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                {t("messages.noConversationsSub")}
              </AppText>
            </View>
          )
        }
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  header: { padding: 16, paddingBottom: 0 },
  title: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  avatarImg: { width: 52, height: 52, borderRadius: 26 },
  unreadDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1, marginLeft: 12 },
  rowTop: { flexDirection: "row", alignItems: "center" },
  empty: { alignItems: "center", paddingTop: 60, paddingHorizontal: 32 },
});
