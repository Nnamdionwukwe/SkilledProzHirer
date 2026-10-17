// src/screens/main/VideoCallScreen.js
//
// React Native port of VideoCallPage.jsx.
// Uses react-native-webview to embed the MiroTalk room in an in-app screen.

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Pressable,
  StyleSheet,
  SafeAreaView,
  StatusBar as RNStatusBar,
  Platform,
  Linking,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  FaPhoneSlash,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaSpinner,
} from "../../icons/fa";

import AppText from "../../components/AppText";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

function buildRoomUrl(baseUrl, displayName) {
  if (!baseUrl) return baseUrl;
  const sep = baseUrl.includes("?") ? "&" : "?";
  const nameParam = displayName
    ? `${sep}name=${encodeURIComponent(displayName)}`
    : "";
  const extra = `${baseUrl.includes("?") ? "&" : sep.replace("?", "?")}noti=0`;
  return `${baseUrl}${nameParam}&noti=0`;
}

export default function VideoCallScreen() {
  const { t } = useTranslation();
  const { theme: th } = useTheme();
  const { user } = useAuthStore();
  const navigation = useNavigation();
  const route = useRoute();
  const c = th.colors;

  const bookingId = route.params?.bookingId;

  const [call, setCall] = useState(null);
  const [callUrl, setCallUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endedByRemote, setEndedByRemote] = useState(false);

  const pollRef = useRef(null);
  const inCallRef = useRef(false);

  const displayName = useMemo(() => {
    if (!user) return "";
    const first = user.firstName || user.first_name || "";
    const last = user.lastName || user.last_name || "";
    if (first || last) return `${first} ${last}`.trim();
    return (
      user.name ||
      user.fullName ||
      user.username ||
      (user.email ? user.email.split("@")[0] : "") ||
      ""
    );
  }, [user]);

  const loadCall = useCallback(async () => {
    try {
      const res = await client.get(`/video-calls/${bookingId}`);
      const data = res.data?.data;
      if (!data?.call) {
        navigation.goBack();
        return;
      }
      setCall(data.call);
      setCallUrl(data.callUrl);
      inCallRef.current = data.call.status === "ACTIVE";
      if (data.call.status === "ENDED" || data.call.status === "DECLINED") {
        navigation.goBack();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load call");
    } finally {
      setLoading(false);
    }
  }, [bookingId, navigation]);

  useEffect(() => {
    loadCall();
  }, [loadCall]);

  useEffect(() => {
    if (!inCallRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(`/video-calls/${bookingId}`);
        const updated = res.data?.data?.call;
        if (!updated) return;
        if (updated.status === "ENDED" || updated.status === "DECLINED") {
          setEndedByRemote(true);
          clearInterval(pollRef.current);
          setTimeout(() => navigation.goBack(), 2000);
        }
      } catch {}
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bookingId, navigation]);

  const handleEnd = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    try {
      await client.patch(`/video-calls/${bookingId}/end`);
    } catch {}
    inCallRef.current = false;
    navigation.goBack();
  };

  const handleOpenNewTab = () => {
    if (callUrl) {
      const branded = buildRoomUrl(callUrl, displayName);
      Linking.openURL(branded);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.page, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.orange} />
        <AppText variant="body" tone="dim" style={{ marginTop: 16 }}>
          {t("booking.videoCall.connecting", {
            defaultValue: "Connecting your call…",
          })}
        </AppText>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────
  if (error || !call || !callUrl) {
    return (
      <View style={[styles.page, { backgroundColor: c.bg }]}>
        <FaExclamationTriangle size={32} color="#ef4444" />
        <AppText variant="body" tone="dim" style={{ marginTop: 16 }}>
          {error || "Call unavailable"}
        </AppText>
        <Pressable
          onPress={() => navigation.goBack()}
          style={[styles.primaryBtn, { backgroundColor: c.orange }]}
        >
          <AppText variant="small" weight="bold" style={{ color: c.bg }}>
            Back to Booking
          </AppText>
        </Pressable>
      </View>
    );
  }

  // ── Ended by remote ──────────────────────────────────────────────────
  if (endedByRemote) {
    return (
      <View style={[styles.page, { backgroundColor: c.bg }]}>
        <FaPhoneSlash size={32} color="#ef4444" />
        <AppText variant="body" tone="dim" style={{ marginTop: 16 }}>
          {t("booking.videoCall.endedByOther", {
            defaultValue: "The other party ended the call",
          })}
        </AppText>
        <AppText variant="small" tone="dim" style={{ marginTop: 4 }}>
          {t("booking.videoCall.returning", {
            defaultValue: "Returning to booking…",
          })}
        </AppText>
      </View>
    );
  }

  // ── Main call view ───────────────────────────────────────────────────
  const roomUrl = buildRoomUrl(callUrl, displayName);

  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: "#0a0a0a" }]}
      edges={["top", "bottom"]}
    >
      <RNStatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.topMeta}>
            <AppText
              weight="bold"
              style={{ color: "#fff", fontSize: 14, letterSpacing: 0.2 }}
            >
              SkilledProz Call
            </AppText>
            {displayName ? (
              <AppText
                numberOfLines={1}
                style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}
              >
                Signed in as {displayName}
              </AppText>
            ) : null}
          </View>
          <View style={styles.liveTag}>
            <View style={styles.liveDot} />
            <AppText
              style={{
                color: "#ef4444",
                fontSize: 10,
                fontWeight: "800",
                letterSpacing: 1,
              }}
            >
              LIVE
            </AppText>
          </View>
        </View>
        <View style={styles.topRight}>
          <Pressable onPress={handleOpenNewTab} style={styles.iconBtn}>
            <FaExternalLinkAlt size={12} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* WebView stage */}
      <View style={styles.stage}>
        <WebView
          source={{ uri: roomUrl }}
          style={styles.iframe}
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          onShouldStartLoadWithRequest={(req) => {
            // Keep everything inside the WebView except mailto:/tel:
            if (req.url.startsWith("mailto:") || req.url.startsWith("tel:")) {
              Linking.openURL(req.url);
              return false;
            }
            return true;
          }}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.centerBox}>
              <FaSpinner size={24} color="#f97316" />
              <AppText
                style={{ color: "rgba(255,255,255,0.85)", marginTop: 12 }}
              >
                Joining call…
              </AppText>
            </View>
          )}
        />
      </View>

      {/* Bottom control bar */}
      <View style={styles.controlBar}>
        <View style={{ flex: 1 }}>
          <AppText
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              fontWeight: "700",
            }}
          >
            SkilledProz
          </AppText>
        </View>

        <Pressable onPress={handleEnd} style={styles.endBtn}>
          <FaPhoneSlash size={16} color="#fff" />
          <AppText
            weight="bold"
            style={{ color: "#fff", fontSize: 14, marginLeft: 8 }}
          >
            End Call
          </AppText>
        </Pressable>

        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <AppText
            numberOfLines={1}
            style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
          >
            Secure peer-to-peer
          </AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#111",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  topMeta: { flexShrink: 1 },
  liveTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(239,68,68,0.15)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  topRight: { flexDirection: "row", gap: 8 },
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
  stage: { flex: 1, backgroundColor: "#000" },
  iframe: { flex: 1, backgroundColor: "#000" },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a0a0a",
  },
  controlBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#111",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)",
    gap: 12,
  },
  endBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 999,
    backgroundColor: "#ef4444",
  },
  primaryBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 8,
  },
});
