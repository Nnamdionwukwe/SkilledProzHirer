// src/screens/main/VideoCallScreen.js
//
// Full-screen conversation-scoped video call.

import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import AppText from "../../components/AppText";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";
import {
  FaPhoneSlash,
  FaExclamationTriangle,
  FaExpand,
  FaCompress,
  FaExternalLinkAlt,
} from "../../icons/fa";

const CALL_BASE_URL = "https://call.skilledproz.com";
const POLL_MS = 1500;

function buildConversationVideoUrl(conversationId, displayName) {
  if (!conversationId) return null;
  const roomId = `skp-conv-${conversationId}`;
  const params = new URLSearchParams();
  params.set("audio", "1");
  params.set("video", "1");
  params.set("notify", "0");
  params.set("chat", "0");
  params.set("screen", "0");
  if (displayName) params.set("name", displayName);
  return `${CALL_BASE_URL}/${roomId}?${params.toString()}`;
}

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuthStore();

  const conversationId = route.params?.conversationId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endedByRemote, setEndedByRemote] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  const webViewRef = useRef(null);
  const pollRef = useRef(null);
  const inCallRef = useRef(false);

  const displayName = (() => {
    if (!user) return "";
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    if (first || last) return `${first} ${last}`.trim();
    return user.name || user.fullName || user.username || "";
  })();

  const roomUrl = conversationId
    ? buildConversationVideoUrl(conversationId, displayName)
    : null;

  const goBackToChat = () => {
    if (conversationId) {
      navigation.navigate("Chat", { conversationId });
    } else {
      navigation.goBack();
    }
  };

  const killWebView = () => {
    try {
      webViewRef.current?.injectJavaScript?.(
        "window.location.replace('about:blank'); true;"
      );
    } catch {}
    setTimeout(() => setWebViewKey((k) => k + 1), 0);
  };

  const patchEnd = async () => {
    if (!conversationId) return;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await client.patch(`/voice-calls/${conversationId}/end`);
        return;
      } catch (err) {
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    }
  };

  useEffect(() => {
    if (!conversationId) {
      setError("Missing conversation");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await client.get(`/voice-calls/${conversationId}`);
        const data = res.data.data;
        const call = data?.call;
        if (!call) {
          if (!cancelled) {
            setError("Call not found");
            setTimeout(goBackToChat, 1200);
          }
          return;
        }
        inCallRef.current = true;
        if (call.status === "ENDED" || call.status === "DECLINED") {
          setEndedByRemote(true);
          setTimeout(goBackToChat, 1500);
        }
      } catch (err) {
        if (!cancelled)
          setError(err.response?.data?.message || "Failed to load call");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!inCallRef.current || !conversationId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(`/voice-calls/${conversationId}`);
        const call = res.data.data?.call;
        if (!call) return;
        if (call.status === "ENDED" || call.status === "DECLINED") {
          try {
            webViewRef.current?.injectJavaScript?.(
              "window.location.replace('about:blank'); true;"
            );
          } catch {}
          setWebViewKey((k) => k + 1);
          setEndedByRemote(true);
          clearInterval(pollRef.current);
          setTimeout(goBackToChat, 1000);
        }
      } catch {}
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [conversationId]);

  function handleEnd() {
    if (pollRef.current) clearInterval(pollRef.current);
    killWebView();
    patchEnd();
    inCallRef.current = false;
    setTimeout(goBackToChat, 80);
  }

  function handleOpenExternal() {
    if (roomUrl) Linking.openURL(roomUrl).catch(() => {});
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: "#0a0a0a" }]}>
        <View style={styles.center}>
          <ActivityIndicator color="#f97316" size="large" />
          <AppText style={styles.centerText}>
            Connecting your video call…
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (error || endedByRemote || !roomUrl) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: "#0a0a0a" }]}>
        <View style={styles.center}>
          <FaExclamationTriangle size={32} color="#ef4444" />
          <AppText style={styles.centerText}>
            {endedByRemote
              ? "The other party ended the call"
              : error || "Call unavailable"}
          </AppText>
          {endedByRemote ? (
            <AppText style={styles.centerSub}>Returning to chat…</AppText>
          ) : null}
          <Pressable onPress={goBackToChat} style={styles.primaryBtn}>
            <AppText style={{ fontSize: 13, fontWeight: "700", color: "#000" }}>
              Back to Chat
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: "#0a0a0a" }]}
      edges={fullscreen ? [] : ["top", "bottom"]}
    >
      {!fullscreen ? (
        <View style={styles.topBar}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flex: 1,
              minWidth: 0,
            }}
          >
            <AppText style={styles.topTitle}>SkilledProz Call</AppText>
            {displayName ? (
              <AppText style={styles.topUser} numberOfLines={1}>
                {displayName}
              </AppText>
            ) : null}
            <View style={styles.liveTag}>
              <View style={styles.liveDot} />
              <AppText style={styles.liveText}>LIVE</AppText>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Pressable
              onPress={() => setFullscreen(true)}
              style={styles.iconBtn}
              hitSlop={6}
            >
              <FaExpand size={12} color="#fff" />
            </Pressable>
            <Pressable
              onPress={handleOpenExternal}
              style={styles.iconBtn}
              hitSlop={6}
            >
              <FaExternalLinkAlt size={12} color="#fff" />
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={{ flex: 1, backgroundColor: "#000", position: "relative" }}>
        <WebView
          key={webViewKey}
          ref={webViewRef}
          source={{ uri: roomUrl }}
          style={{ flex: 1 }}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          allowsFullscreenVideo
          originWhitelist={["*"]}
          onError={() => setError("Could not load call")}
          cacheEnabled={false}
          incognito={true}
        />
        {fullscreen ? (
          <Pressable
            onPress={() => setFullscreen(false)}
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "rgba(0,0,0,0.6)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.2)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaCompress size={16} color="#fff" />
          </Pressable>
        ) : null}
      </View>

      {!fullscreen ? (
        <View style={styles.controlBar}>
          <View style={{ flex: 1 }}>
            <AppText style={styles.controlBrand}>SkilledProz</AppText>
          </View>
          <Pressable onPress={handleEnd} style={styles.endBtn} hitSlop={6}>
            <FaPhoneSlash size={16} color="#fff" />
            <AppText style={styles.endText}>End Call</AppText>
          </Pressable>
          <View style={{ flex: 1 }} />
        </View>
      ) : (
        <Pressable
          onPress={handleEnd}
          style={styles.floatingEndBtn}
          hitSlop={6}
        >
          <FaPhoneSlash size={18} color="#fff" />
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  centerText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
  },
  centerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
  },
  primaryBtn: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f97316",
    marginTop: 8,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  topTitle: { fontSize: 13, fontWeight: "700", color: "#fff" },
  topUser: { fontSize: 11, color: "rgba(255,255,255,0.5)", flexShrink: 1 },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ef4444",
    letterSpacing: 1,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#111",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  controlBrand: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
  endText: { fontSize: 13, fontWeight: "700", color: "#fff" },
  floatingEndBtn: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 10,
  },
});
