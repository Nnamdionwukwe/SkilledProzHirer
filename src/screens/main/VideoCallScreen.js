// src/screens/main/VideoCallScreen.js
import { useEffect, useRef, useState, useCallback } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import AppText from "../../components/AppText";
import { useAuthStore } from "../../store/authStore";
import client from "../../api/client";

const CALL_BASE_URL = "https://call.skilledproz.com";
const POLL_MS = 1500;
const INITIATE_RETRIES = 6;
const INITIATE_DELAY_MS = 500;

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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function VideoCallScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useAuthStore();

  const conversationId = route.params?.conversationId;
  const returnTo = route.params?.returnTo;
  const returnParams = route.params?.returnParams || {};

  const [call, setCall] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [endedByRemote, setEndedByRemote] = useState(false);
  const [ended, setEnded] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [webViewKey, setWebViewKey] = useState(0);

  // Track whether the call was ACTIVE at any point this session.
  // The "ended" modal MUST only show if this is true.
  const wasActiveRef = useRef(false);
  const endedRef = useRef(false);
  const mountedRef = useRef(true);

  const webViewRef = useRef(null);
  const pollRef = useRef(null);
  const inCallRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const goBack = useCallback(() => {
    if (returnTo) {
      try {
        navigation.navigate(returnTo, returnParams);
        return;
      } catch (err) {
        console.warn("[VideoCallScreen] returnTo failed:", err);
      }
    }
    if (conversationId) {
      navigation.navigate("Chat", { conversationId });
    } else {
      navigation.goBack();
    }
  }, [returnTo, returnParams, conversationId, navigation]);

  const killWebView = () => {
    try {
      webViewRef.current?.injectJavaScript?.(
        "window.location.replace('about:blank'); true;",
      );
    } catch {}
    setTimeout(() => {
      if (mountedRef.current) setWebViewKey((k) => k + 1);
    }, 0);
  };

  const patchEnd = async () => {
    if (!conversationId) return;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await client.patch(`/voice-calls/${conversationId}/end`);
        return;
      } catch {
        if (attempt < 3) await sleep(400);
      }
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // HARD RESET — clears EVERYTHING for a fresh start.
  // Called before every initiate so there's zero chance of a stale "ended"
  // modal leaking from the previous call.
  // ──────────────────────────────────────────────────────────────────────
  const hardReset = () => {
    // Stop polling first — no stale reads
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    // Kill webview so it doesn't render the old room
    killWebView();
    // Reset all internal refs
    wasActiveRef.current = false;
    endedRef.current = false;
    inCallRef.current = false;
    // Reset all UI state
    if (mountedRef.current) {
      setEnded(false);
      setEndedByRemote(false);
      setError("");
      setCall(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────
  // initiateWithRetry — retries until backend returns PENDING or ACTIVE
  // ──────────────────────────────────────────────────────────────────────
  const initiateWithRetry = useCallback(
    async ({
      maxAttempts = INITIATE_RETRIES,
      delayMs = INITIATE_DELAY_MS,
    } = {}) => {
      if (!conversationId) throw new Error("Missing conversation");

      let lastError = null;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const res = await client.post(
            `/voice-calls/${conversationId}/initiate`,
            {
              callType: "video",
              returnTo,
              returnParams,
            },
          );

          // ✅ DEBUG: log what the backend returned
          console.log("[VCS INITIATE] attempt", attempt, {
            status: res.status,
            body: JSON.stringify(res.data, null, 2),
            newCallStatus: res.data?.data?.call?.status,
            newCallReceiverId: res.data?.data?.call?.receiverId,
            newCallCallType: res.data?.data?.call?.callType,
          });

          const newCall = res.data?.data?.call;

          if (!newCall) {
            lastError = new Error("Backend returned empty call");
          } else if (
            newCall.status === "PENDING" ||
            newCall.status === "ACTIVE"
          ) {
            return newCall;
          } else {
            lastError = new Error(
              `Backend returned ${newCall.status} on attempt ${attempt}`,
            );
          }
        } catch (err) {
          lastError = err;
        }

        if (attempt < maxAttempts) {
          await sleep(delayMs * attempt);
        }
      }

      throw lastError || new Error("Could not start call after retries");
    },
    [conversationId, returnTo, returnParams],
  );

  // ──────────────────────────────────────────────────────────────────────
  // startPolling — only flags "ended" if wasActiveRef is TRUE
  // ──────────────────────────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    if (!conversationId) return;
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      try {
        const res = await client.get(`/voice-calls/${conversationId}`);
        const c0 = res.data.data?.call;
        if (!c0) return;

        if (c0.status === "ACTIVE") {
          wasActiveRef.current = true;
          return;
        }

        const isTerminal = c0.status === "ENDED" || c0.status === "DECLINED";

        if (isTerminal && !endedRef.current) {
          const isReceiverDecline =
            c0.status === "DECLINED" && c0.receiverId === user?.id;

          // ── HARD GUARD ──
          // Only show "ended" if:
          //   1. This call was ACTIVE during this session (wasActiveRef), OR
          //   2. This user is the receiver and explicitly declined
          //
          // If the call never went ACTIVE and this isn't a decline, the
          // ENDED status is from a stale/prior call — IGNORE IT.
          if (!wasActiveRef.current && !isReceiverDecline) {
            return;
          }

          endedRef.current = true;
          killWebView();
          if (mountedRef.current) {
            setEndedByRemote(true);
            setEnded(true);
          }
          inCallRef.current = false;
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {}
    }, POLL_MS);
  }, [conversationId, user?.id]);

  // ══════════════════════════════════════════════════════════════════════
  // Initial load
  // ══════════════════════════════════════════════════════════════════════
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
        const c0 = data?.call;

        // No call exists OR stale call exists → initiate a fresh one
        const isTerminal =
          !c0 || c0.status === "ENDED" || c0.status === "DECLINED";

        if (isTerminal) {
          try {
            const fresh = await initiateWithRetry();
            if (cancelled || !mountedRef.current) return;

            setCall(fresh);
            inCallRef.current = true;
            wasActiveRef.current = fresh.status === "ACTIVE";
            endedRef.current = false;
            setEnded(false);
            setEndedByRemote(false);
            setWebViewKey((k) => k + 1);
            startPolling();
          } catch (err) {
            if (!cancelled && mountedRef.current) {
              setError(
                err.response?.data?.message ||
                  "Could not start the call. Please try again.",
              );
            }
          }
          return;
        }

        // Live call (PENDING or ACTIVE) → render it
        setCall(c0);
        inCallRef.current = true;
        if (c0.status === "ACTIVE") {
          wasActiveRef.current = true;
        }
        endedRef.current = false;
        setEnded(false);
        setEndedByRemote(false);
        startPolling();
      } catch (err) {
        if (!cancelled && mountedRef.current) {
          setError(err.response?.data?.message || "Failed to load call");
        }
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [conversationId, initiateWithRetry, startPolling, goBack]);

  // ── End call (user pressed End Call) ──────────────────────────────────
  async function handleEnd() {
    // Set wasActiveRef so the ended modal SHOWS for our own end
    if (inCallRef.current) {
      // If we were actually in the call screen, we consider it active
      wasActiveRef.current = true;
    }
    if (pollRef.current) clearInterval(pollRef.current);
    killWebView();
    await patchEnd();
    inCallRef.current = false;
    endedRef.current = true;
    if (mountedRef.current) {
      setEnded(true);
      setEndedByRemote(false);
    }
  }

  // ── Remake (Call Again button) ────────────────────────────────────────
  async function handleRemake() {
    if (restarting) return;
    setRestarting(true);

    // ── HARD RESET FIRST ──
    // This guarantees the "ended" modal disappears before we initiate.
    // No stale state can leak into the new call.
    hardReset();

    try {
      const fresh = await initiateWithRetry();
      if (!mountedRef.current) return;

      // Now set the fresh call state
      setCall(fresh);
      setEnded(false);
      setEndedByRemote(false);
      inCallRef.current = true;
      wasActiveRef.current = fresh.status === "ACTIVE";
      endedRef.current = false;
      setWebViewKey((k) => k + 1);
      startPolling();
    } catch (err) {
      if (mountedRef.current) {
        setError(
          err.response?.data?.message ||
            err.message ||
            "Could not restart the call. Please try again in a moment.",
        );
      }
    } finally {
      if (mountedRef.current) setRestarting(false);
    }
  }

  function handleOpenExternal() {
    if (roomUrl) Linking.openURL(roomUrl).catch(() => {});
  }

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: "#0a0a0a" }]}>
        <View style={styles.center}>
          <ActivityIndicator color="#f97316" size="large" />
          <AppText style={styles.centerText}>Connecting your call…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error || !roomUrl) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: "#0a0a0a" }]}>
        <View style={styles.center}>
          <Ionicons name="warning" size={32} color="#ef4444" />
          <AppText style={styles.centerText}>
            {error || "Call unavailable"}
          </AppText>
          <Pressable onPress={goBack} style={styles.primaryBtn}>
            <AppText style={{ fontSize: 13, fontWeight: "700", color: "#000" }}>
              Back
            </AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ── Ended (HARD GUARD: only show if wasActiveRef OR explicit decline) ─
  if (ended) {
    return (
      <SafeAreaView style={[styles.page, { backgroundColor: "#0a0a0a" }]}>
        <View style={styles.center}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "rgba(239,68,68,0.12)",
              borderWidth: 2,
              borderColor: "rgba(239,68,68,0.3)",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name={endedByRemote ? "call-outline" : "call"}
              size={36}
              color="#ef4444"
            />
          </View>
          <AppText
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: "#fff",
              marginTop: 8,
            }}
          >
            {endedByRemote ? "Call ended by other party" : "Call ended"}
          </AppText>
          <AppText
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,0.55)",
              marginTop: 6,
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            You can start a new call or go back
          </AppText>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={handleRemake}
              disabled={restarting}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 10,
                  backgroundColor: "#16a34a",
                  opacity: restarting ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              {restarting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="videocam" size={16} color="#fff" />
                  <AppText
                    style={{
                      fontSize: 14,
                      fontWeight: "700",
                      color: "#fff",
                    }}
                  >
                    Call Again
                  </AppText>
                </>
              )}
            </Pressable>
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.15)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="arrow-back" size={16} color="#fff" />
              <AppText
                style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}
              >
                Back
              </AppText>
            </Pressable>
          </View>

          {error ? (
            <AppText
              style={{
                fontSize: 12,
                color: "#f87171",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              {error}
            </AppText>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  // ── Active call ───────────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.page, { backgroundColor: "#0a0a0a" }]}
      edges={["top", "bottom"]}
    >
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
        <Pressable
          onPress={handleOpenExternal}
          style={styles.iconBtn}
          hitSlop={6}
        >
          <Ionicons name="open-outline" size={14} color="#fff" />
        </Pressable>
      </View>

      <View style={{ flex: 1, backgroundColor: "#000" }}>
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
      </View>

      <View style={styles.controlBar}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.controlBrand}>SkilledProz</AppText>
        </View>
        <Pressable onPress={handleEnd} style={styles.endBtn} hitSlop={6}>
          <Ionicons name="call" size={16} color="#fff" />
          <AppText style={styles.endText}>End Call</AppText>
        </Pressable>
        <View style={{ flex: 1 }} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  centerText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
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
});
